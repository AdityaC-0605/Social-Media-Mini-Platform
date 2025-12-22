const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Create post
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '';

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = new Post({
      author: req.user._id,
      content: content.trim(),
      image
    });

    await post.save();
    await post.populate('author', 'name username profilePicture');

    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all posts (news feed)
router.get('/feed', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get posts from users that the current user follows, plus their own posts
    const posts = await Post.find({
      $or: [
        { author: { $in: req.user.following } },
        { author: req.user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('author', 'name username profilePicture')
      .populate('likes', 'username')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name username profilePicture'
        },
        options: { sort: { createdAt: -1 }, limit: 5 }
      });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all posts (for discovery)
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('author', 'name username profilePicture')
      .populate('likes', 'username')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name username profilePicture'
        },
        options: { sort: { createdAt: -1 }, limit: 5 }
      });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single post
router.get('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name username profilePicture')
      .populate('likes', 'name username profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name username profilePicture'
        },
        options: { sort: { createdAt: -1 } }
      });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like/Unlike post
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userId = req.user._id;
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes = post.likes.filter(id => !id.equals(userId));
    } else {
      post.likes.push(userId);
      
      // Create notifications (including self-like, as requested)
      if (post.author.equals(userId)) {
        await Notification.create({
          user: userId,
          type: 'like',
          from: userId,
          targetUser: post.author,
          post: post._id
        });
      } else {
        await Notification.create({
          user: post.author,
          type: 'like',
          from: userId,
          targetUser: post.author,
          post: post._id
        });

        // Also notify the actor so they see their own action in Notifications
        await Notification.create({
          user: userId,
          type: 'like',
          from: userId,
          targetUser: post.author,
          post: post._id
        });
      }
    }

    await post.save();
    await post.populate('likes', 'username');

    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete post
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.author.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete all comments
    await Comment.deleteMany({ post: post._id });
    
    // Delete post
    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

