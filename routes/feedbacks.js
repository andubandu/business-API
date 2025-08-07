require('dotenv').config();
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validateParams, schemas, validate } = require('../middleware/validation');
const User = require('../models/User');
const Feedback = require('../models/Feedback');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('user', 'profile_image real_name username').sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/new', authMiddleware, validate(schemas.feedback), async (req, res) => {
  try {
    const { content, rating } = req.body;
    const feedback = new Feedback({
      user: req.user._id,
      content,
      rating
    });
    await feedback.save();
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});
router.get('/:id', authMiddleware, validateParams(schemas.serviceParams), async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id).populate('user', 'profile_image real_name username');
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
})

router.delete('/:id', authMiddleware, validateParams(schemas.serviceParams), async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;