const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const User = require('../models/User');
const Service = require('../models/Service');
const { schemas, validate, validateParams } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

router.post(
  '/',
  authMiddleware,
  validate(schemas.createRating),
  async (req, res) => {
    try {
      const { ratedUser, ratedService, score } = req.body;

      if (ratedUser && ratedUser === req.user._id.toString()) {
        return res.status(400).json({ error: "You cannot rate yourself." });
      }

      if (ratedService) {
        const Service = require('../models/Service');
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

module.exports = router;
