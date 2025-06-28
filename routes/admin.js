const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateParams, schemas } = require('../middleware/validation');
const User = require('../models/User');

const router = express.Router();

router.get('/verifications', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ verification_status: 'pending' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/approve/:userID', authMiddleware, adminMiddleware, validateParams(schemas.adminParams), async (req, res) => {
  try {
    const user = await User.findById(req.params.userID);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndUpdate(req.params.userID, {
      role: user.requested_role,
      verification_status: 'approved'
    });

    res.json({ message: 'User approved' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reject/:userID', authMiddleware, adminMiddleware, validateParams(schemas.adminParams), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userID, {
      verification_status: 'rejected'
    });

    res.json({ message: 'User rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;