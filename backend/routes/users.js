const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Notification = require('../models/Notification');

// Suggested users (for stories / discover)
router.get('/suggested', authenticate, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name username email profilePicture bio followers following')
      .limit(5);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users
router.get('/search/:query', authenticate, async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .select('name username email profilePicture bio followers following')
      .limit(10);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'name username profilePicture')
      .populate('following', 'name username profilePicture');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's posts
    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .populate('author', 'name username profilePicture')
      .populate('likes', 'username')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name username profilePicture'
        },
        options: { sort: { createdAt: -1 }, limit: 3 }
      });

    res.json({ user, posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get posts liked by a user
router.get('/:id/likes', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const posts = await Post.find({ likes: userId })
      .sort({ createdAt: -1 })
      .populate('author', 'name username profilePicture')
      .populate('likes', 'username')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name username profilePicture'
        },
        options: { sort: { createdAt: -1 }, limit: 3 }
      });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get posts a user has replied/commented on
router.get('/:id/replies', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const postIds = await Comment.find({ author: userId }).distinct('post');

    const posts = await Post.find({ _id: { $in: postIds } })
      .sort({ createdAt: -1 })
      .populate('author', 'name username profilePicture')
      .populate('likes', 'username')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name username profilePicture'
        },
        options: { sort: { createdAt: -1 }, limit: 3 }
      });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', authenticate, upload.single('profilePicture'), async (req, res) => {
  try {
    const { bio, name, username } = req.body;
    const updateData = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      updateData.name = trimmed;
    }

    if (username !== undefined) {
      const trimmed = String(username).trim();
      if (trimmed.length < 3 || trimmed.length > 30) {
        return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
      }

      const existing = await User.findOne({
        username: trimmed,
        _id: { $ne: req.user._id }
      });
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updateData.username = trimmed;
    }

    if (bio !== undefined) {
      updateData.bio = bio;
    }

    if (req.file) {
      updateData.profilePicture = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow/Unfollow user
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => !id.equals(targetUserId)
      );
      targetUser.followers = targetUser.followers.filter(
        id => !id.equals(currentUserId)
      );

      // Notify both parties about unfollow
      await Notification.create({
        user: targetUserId,
        type: 'unfollow',
        from: currentUserId,
        targetUser: targetUserId
      });
      await Notification.create({
        user: currentUserId,
        type: 'unfollow',
        from: currentUserId,
        targetUser: targetUserId
      });
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);

      // Create notification
      await Notification.create({
        user: targetUserId,
        type: 'follow',
        from: currentUserId,
        targetUser: targetUserId
      });

      // Also notify the actor so they see their own action in Notifications
      await Notification.create({
        user: currentUserId,
        type: 'follow',
        from: currentUserId,
        targetUser: targetUserId
      });
    }

    await currentUser.save();
    await targetUser.save();

    await currentUser.populate('following', 'username profilePicture');
    await targetUser.populate('followers', 'username profilePicture');

    res.json({
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      currentUser: {
        following: currentUser.following,
        followers: currentUser.followers
      },
      targetUser: {
        following: targetUser.following,
        followers: targetUser.followers
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

