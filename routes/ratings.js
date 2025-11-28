const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating.js');
const User = require('../models/User.js');
const Service = require('../models/Service.js');
const { schemas, validate, validateParams } = require('../middleware/validation.js');
const { authMiddleware, verifiedOnly } = require('../middleware/auth.js');

/**
 * @swagger
 * tags:
 *   - name: Ratings
 *     description: |
 *       Manage user and service ratings.
 *       **Note:** Users cannot rate themselves or their own services.
 */

/**
 * @swagger
 * /rating:
 *   post:
 *     summary: Submit a new rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               ratedUser:
 *                 type: string
 *                 description: ID of the user being rated (optional if rating a service)
 *               ratedService:
 *                 type: string
 *                 description: ID of the service being rated (optional if rating a user)
 *               score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *             example:
 *               ratedUser: "64f0a1b52a93f83b32b7e0d5"
 *               ratedService: "64f0a1b52a93f83b32b7e0d6"
 *               score: 4
 *     responses:
 *       201:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 rating:
 *                   $ref: '#/components/schemas/Rating'
 *               example:
 *                 message: "Rating submitted"
 *                 rating:
 *                   _id: "64f0a2c1d3c5a1b16f3d93e"
 *                   ratedUser: "64f0a1b52a93f83b32b7e0d5"
 *                   ratedService: "64f0a1b52a93f83b32b7e0d6"
 *                   score: 4
 *                   createdAt: "2025-10-10T12:34:56Z"
 *       400:
 *         description: Invalid rating (self-rating or other errors)
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authMiddleware, verifiedOnly,
  validate(schemas.createRating),
  async (req, res) => {
    try {
      const { ratedUser, ratedService, score } = req.body;

      if (ratedUser && ratedUser === req.user._id.toString()) {
        return res.status(400).json({ error: "You cannot rate yourself." });
      }

      if (ratedService) {
        const service = await Service.findById(ratedService);
        if (service && service.owner.toString() === req.user._id.toString()) {
          return res.status(400).json({ error: "You cannot rate your own service." });
        }
      }

      const rating = new Rating({ ratedUser, ratedService, score });
      await rating.save();
      res.status(201).json({ message: 'Rating submitted', rating });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /rating/user/{userId}:
 *   get:
 *     summary: Get ratings for a specific user
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: Returns the average rating and total score for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 averageRating:
 *                   type: number
 *                 totalScore:
 *                   type: number
 *               example:
 *                 averageRating: 4.2
 *                 totalScore: 21
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get(
  '/user/:userId',
  validateParams(schemas.ratingParams),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ averageRating: user.averageRating, totalScore: user.totalScore });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * @swagger
 * /rating/service/{serviceId}:
 *   get:
 *     summary: Get ratings for a specific service
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the service
 *     responses:
 *       200:
 *         description: Returns the average rating and total score for the service
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 averageRating:
 *                   type: number
 *                 totalScore:
 *                   type: number
 *               example:
 *                 averageRating: 4.5
 *                 totalScore: 45
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.get(
  '/service/:serviceId',
  validateParams(schemas.ratingParams),
  async (req, res) => {
    try {
      const service = await Service.findById(req.params.serviceId);
      if (!service) return res.status(404).json({ error: 'Service not found' });
      res.json({ averageRating: service.averageRating, totalScore: service.totalScore });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Rating:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         ratedUser:
 *           type: string
 *         ratedService:
 *           type: string
 *         score:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 */

module.exports = router;
