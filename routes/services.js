const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validate, validateQuery, validateParams, schemas } = require('../middleware/validation');
const { convertPrice } = require('../utils/currency');
const Service = require('../models/Service');
const User = require('../models/User');

const router = express.Router();

router.post('/new', authMiddleware, validate(schemas.createService), async (req, res) => {
  try {
    if (req.user.verification_status !== 'approved') {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Only users with approved verification status can create services. Please complete verification or contact support.' 
      });
    }

    const user = await User.findById(req.user._id);
    if (!user.paypal_account.connected) {
      return res.status(403).json({ 
        error: 'PayPal account required', 
        message: 'You must connect a PayPal account before creating services to receive payments.' 
      });
    }

    const { title, description, price, currency = 'USD', category, tags } = req.body;

    const service = new Service({
      title,
      description,
      price: parseFloat(price),
      currency: currency.toUpperCase(),
      owner: req.user._id,
      category,
      tags: Array.isArray(tags) ? tags : tags ? [tags] : []
    });

    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', validateQuery(schemas.currencyQuery), async (req, res) => {
  try {
    const { currency } = req.query;
    const services = await Service.find().populate('owner', 'username real_name profile_image');
    
    if (currency && currency.toUpperCase() !== 'USD') {
      for (let service of services) {
        service.price = await convertPrice(service.price, service.currency, currency.toUpperCase());
        service.currency = currency.toUpperCase();
      }
    }
    
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', validateParams(schemas.serviceParams), validateQuery(schemas.currencyQuery), async (req, res) => {
  try {
    const { currency } = req.query;
    const service = await Service.findById(req.params.id).populate('owner', 'username real_name profile_image');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    if (currency && currency.toUpperCase() !== service.currency) {
      service.price = await convertPrice(service.price, service.currency, currency.toUpperCase());
      service.currency = currency.toUpperCase();
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

    const { title, description, price, currency, category, tags } = req.body;
    const updateData = {};
    
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (currency) updateData.currency = currency.toUpperCase();
    if (category) updateData.category = category;
    if (tags) updateData.tags = Array.isArray(tags) ? tags : [tags];

    const updatedService = await Service.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedService);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;