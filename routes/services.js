const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validate, validateParams, schemas } = require('../middleware/validation');
const Service = require('../models/Service');
const User = require('../models/User');

const router = express.Router();

router.post('/new', authMiddleware, validate(schemas.createService), async (req, res) => {
  try {
    const { title, description, price, currency = 'USD', category, tags, type } = req.body;

    if (!type || !['request', 'offering'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "request" or "offering"' });
    }

    if (type === 'offering') {
      if (req.user.verification_status !== 'approved') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only users with approved verification status can create offerings. Please complete verification or contact support.'
        });
      }

      const user = await User.findById(req.user._id);
      if (!user.paypal_account.connected) {
        return res.status(403).json({
          error: 'PayPal account required',
          message: 'You must connect a PayPal account before creating offerings to receive payments.'
        });
      }
    }

    const service = new Service({
      title,
      description,
      price: parseFloat(price),
      currency: currency.toUpperCase(),
      owner: req.user._id,
      category,
      tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
      type
    });

    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { type, promoted } = req.query;
    const filter = {};

    if (type && ['request', 'offering'].includes(type)) {
      filter.type = type;
    }

    if (promoted === 'true') {
      filter.promoted = true;
    }

    const services = await Service.find(filter)
      .populate('owner', 'username real_name profile_image user_type')
      .sort({ promoted: -1, createdAt: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', validateParams(schemas.serviceParams), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('owner', 'username real_name profile_image');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/del/:id', authMiddleware, validateParams(schemas.serviceParams), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/upd/:id', authMiddleware, validateParams(schemas.serviceParams), validate(schemas.updateService), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, price, currency, category, tags, type } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (currency) updateData.currency = currency.toUpperCase();
    if (category) updateData.category = category;
    if (tags) updateData.tags = Array.isArray(tags) ? tags : [tags];
    if (type && ['request', 'offering'].includes(type)) updateData.type = type;

    const updatedService = await Service.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedService);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/promote/:id', authMiddleware, validateParams(schemas.serviceParams), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (service.promoted) {
      return res.status(400).json({ error: 'Service is already promoted' });
    }

    const { paymentID } = req.body;
    if (!paymentID) {
      return res.status(400).json({ error: 'Payment ID required' });
    }

    await Service.findByIdAndUpdate(req.params.id, {
      promoted: true,
      promoted_at: new Date()
    });

    res.json({ message: 'Service promoted successfully', promotion_cost: 15 });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;