const express = require('express');
const multer = require('multer');
const os = require('os');
const { authMiddleware } = require('../middleware/auth');
const { validate, validateParams, schemas } = require('../middleware/validation');
const { uploadToCloudinary } = require('../utils/cloudinary');
const User = require('../models/User');

const router = express.Router();

const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/:username', validateParams(schemas.userParams), async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/upd', authMiddleware, upload.single('profile_image'), validate(schemas.updateUser), async (req, res) => {
  try {
    const { real_name, username, email } = req.body;
    const updateData = {};
    
    if (real_name) updateData.real_name = real_name;
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    
    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.path);
      updateData.profile_image = imageUrl;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/del', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;