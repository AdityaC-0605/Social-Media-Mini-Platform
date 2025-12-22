const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

// Create comment
router.post('/', authenticate, async (req, res) => {
  try {
    const { postId, content } = req.body;

    if (!postId || !content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post ID and content are required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = new Comment({
      post: postId,
      author: req.user._id,
      content: content.trim()
    });

    await comment.save();

    // Add comment to post
    post.comments.push(comment._id);
    await post.save();

    await comment.populate('author', 'name username profilePicture');

    // Create notifications (including self-comment, as requested)
    if (post.author.equals(req.user._id)) {
      await Notification.create({
        user: req.user._id,
        type: 'comment',
        from: req.user._id,
        targetUser: post.author,
        post: post._id
      });
    } else {
      await Notification.create({
        user: post.author,
        type: 'comment',
        from: req.user._id,
        targetUser: post.author,
        post: post._id
      });

      // Also notify the actor so they see their own action in Notifications
      await Notification.create({
        user: req.user._id,
        type: 'comment',
        from: req.user._id,
        targetUser: post.author,
        post: post._id
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a post
router.get('/post/:postId', authenticate, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: -1 })
      .populate('author', 'name username profilePicture');

    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete comment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (!comment.author.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove comment from post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id }
    });

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

