require('dotenv').config();
const express = require('express');
const { authMiddleware, verifiedOnly } = require('../middleware/auth.js');
const { validateParams, schemas, validate } = require('../middleware/validation.js');
const User = require('../models/User.js');
const Feedback = require('../models/Feedback.js');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: API endpoints for managing user feedback
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         profile_image:
 *           type: string
 *         real_name:
 *           type: string
 *         username:
 *           type: string
 *     Feedback:
 *       type: object
 *       required:
 *         - user
 *         - content
 *         - rating
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 *         content:
 *           type: string
 *         rating:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c85"
 *         user:
 *           _id: "60d21b4667d0d8992e610a55"
 *           profile_image: "https://example.com/avatar.jpg"
 *           real_name: "John Doe"
 *           username: "johndoe"
 *         content: "Excellent service and fast response!"
 *         rating: 5
 *         createdAt: "2025-10-10T12:34:56.000Z"
 */

/**
 * @swagger
 * /feedback:
 *   get:
 *     summary: Get all feedbacks
 *     tags: [Feedback]
 *     responses:
 *       200:
 *         description: List of all feedbacks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Feedback'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('user', 'profile_image real_name username')
      .sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /feedback/new:
 *   post:
 *     summary: Create a new feedback
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - rating
 *             properties:
 *               content:
 *                 type: string
 *               rating:
 *                 type: integer
 *             example:
 *               content: "Great experience overall"
 *               rating: 4
 *     responses:
 *       201:
 *         description: Feedback created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feedback'
 *       500:
 *         description: Failed to create feedback
 */
router.post('/new', authMiddleware, verifiedOnly, validate(schemas.feedback), async (req, res) => {
  try {
    const { content, rating } = req.body;
    const feedback = new Feedback({
      user: req.user._id,
      content,
      rating,
    });
    await feedback.save();
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

/**
 * @swagger
 * /feedback/{id}:
 *   get:
 *     summary: Get feedback by ID
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feedback ID
 *     responses:
 *       200:
 *         description: Feedback found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feedback'
 *       404:
 *         description: Feedback not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete feedback by ID
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feedback ID
 *     responses:
 *       200:
 *         description: Feedback deleted successfully
 *       404:
 *         description: Feedback not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authMiddleware, validateParams(schemas.serviceParams), async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'profile_image real_name username');
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, verifiedOnly, validateParams(schemas.serviceParams), async (req, res) => {
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

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

module.exports = router;
