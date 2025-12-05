const express = require('express');
const multer = require('multer');
const os = require('os');
const { authMiddleware } = require('../middleware/auth.js');
const { validate, validateParams, schemas } = require('../middleware/validation.js');
const { uploadToCloudinary } = require('../utils/cloudinary.js');
const User = require('../models/User.js');

const router = express.Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 } 
});

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /users/{username}:
 *   get:
 *     summary: Get a user by username
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username to fetch
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/:username', validateParams(schemas.userParams), async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /users/upd:
 *   put:
 *     summary: Update the current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               real_name:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               profile_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated user profile
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /users/del:
 *   delete:
 *     summary: Delete the current user's account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       500:
 *         description: Server error
 */
router.delete('/del', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
