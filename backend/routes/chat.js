const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { authenticate } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const isMember = (conversation, userId) => {
  return conversation.members.some((m) => m.equals(userId));
};

// List conversations for current user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.find({ members: req.user._id })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .populate('members', 'username name profilePicture')
      .populate('admins', 'username name profilePicture');

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a DM or group conversation
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { type, memberIds, title } = req.body;

    if (!type || !['dm', 'group'].includes(type)) {
      return res.status(400).json({ error: 'Invalid conversation type' });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'memberIds is required' });
    }

    const currentUserId = req.user._id;
    const uniqueMemberIds = Array.from(new Set(memberIds.map(String)));

    if (!uniqueMemberIds.includes(String(currentUserId))) {
      uniqueMemberIds.push(String(currentUserId));
    }

    if (type === 'dm') {
      if (uniqueMemberIds.length !== 2) {
        return res.status(400).json({ error: 'DM must have exactly 2 members' });
      }

      const existing = await Conversation.findOne({
        type: 'dm',
        members: { $all: uniqueMemberIds.map((id) => new mongoose.Types.ObjectId(id)) },
        $expr: { $eq: [{ $size: '$members' }, 2] }
      })
        .populate('members', 'username name profilePicture')
        .populate('admins', 'username name profilePicture');

      if (existing) {
        return res.status(200).json({ conversation: existing, created: false });
      }
    }

    const conversation = await Conversation.create({
      type,
      members: uniqueMemberIds,
      admins: type === 'group' ? [currentUserId] : [],
      title: type === 'group' ? (title || '').trim() : ''
    });

    await conversation.populate('members', 'username name profilePicture');
    await conversation.populate('admins', 'username name profilePicture');

    res.status(201).json({ conversation, created: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch messages (cursor via before)
router.get('/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!isMember(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const before = req.query.before;

    const query = { conversation: conversation._id };
    if (before) {
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username name profilePicture');

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message (REST fallback)
router.post('/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || String(body).trim().length === 0) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!isMember(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      body: String(body).trim(),
      readBy: [{ user: req.user._id, readAt: new Date() }]
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    await message.populate('sender', 'username name profilePicture');

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark a message as read
router.put('/messages/:id/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!isMember(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const alreadyRead = message.readBy.some((r) => r.user.equals(req.user._id));
    if (!alreadyRead) {
      message.readBy.push({ user: req.user._id, readAt: new Date() });
      await message.save();
    }

    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
