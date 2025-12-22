const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Create story (image)
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const story = await Story.create({
      user: req.user._id,
      image: `/uploads/${req.file.filename}`,
    });

    await story.populate('user', 'name username profilePicture');

    res.status(201).json({ story });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active stories for current user + following (last 24h)
router.get('/', authenticate, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await Story.find({
      createdAt: { $gte: cutoff },
    })
      .sort({ createdAt: -1 })
      .populate('user', 'name username profilePicture');

    // Keep only the latest story per user
    const seen = new Set();
    const latestPerUser = [];
    for (const s of stories) {
      const id = String(s.user?._id || s.user);
      if (seen.has(id)) continue;
      seen.add(id);
      latestPerUser.push(s);
    }

    res.json({ stories: latestPerUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
