const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Get all notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Fetching notifications for user:', req.user._id);
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('from', 'username profilePicture')
      .populate('targetUser', 'username profilePicture name')
      .populate({
        path: 'post',
        populate: {
          path: 'author',
          select: 'username name'
        }
      });
    
    console.log('Found notifications:', notifications.length);
    console.log('Notifications data:', notifications);

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (!notification.user.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    notification.read = true;
    await notification.save();

    res.json({ notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to create a notification
router.post('/test', authenticate, async (req, res) => {
  try {
    console.log('Creating test notification for user:', req.user._id);
    
    // Find a different user to be the "from" user
    const otherUser = await User.findOne({ _id: { $ne: req.user._id } });
    
    if (!otherUser) {
      return res.status(404).json({ error: 'No other users found' });
    }
    
    const notification = new Notification({
      user: req.user._id,
      type: 'like',
      from: otherUser._id,
      post: null
    });
    
    await notification.save();
    console.log('Test notification created:', notification);
    
    res.json({ message: 'Test notification created', notification });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

