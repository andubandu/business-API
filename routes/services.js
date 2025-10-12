const express = require('express');
const { authMiddleware } = require('../middleware/auth.js');
const { validate, validateParams, schemas } = require('../middleware/validation.js');
const Service = require('../models/Service.js');
const User = require('../models/User.js');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Service management endpoints
 */

/**
 * @swagger
 * /services/new:
 *   post:
 *     summary: Create a new service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Website Design"
 *               description:
 *                 type: string
 *                 example: "Professional website design service."
 *               type:
 *                 type: string
 *                 enum: [request, offering]
 *                 example: "offering"
 *               price:
 *                 type: number
 *                 example: 50
 *               currency:
 *                 type: string
 *                 example: USD
 *               category:
 *                 type: string
 *                 example: "Design"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["web", "ui", "ux"]
 *     responses:
 *       201:
 *         description: Service created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied (for offerings)
 *       500:
 *         description: Server error
 */
router.post('/new', authMiddleware, validate(schemas.createService), async (req, res) => {
  try {
    const { title, description, price, currency, category, tags, type } = req.body;

    if (type === 'offering') {
      if (req.user.verification_status !== 'approved') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only approved users can create offerings.'
        });
      }

      const user = await User.findById(req.user._id);
      if (!user || !user.paypal_account?.connected) {
        return res.status(403).json({
          error: 'PayPal account required',
          message: 'Connect PayPal to receive payments.'
        });
      }
    }

    const serviceData = {
      title,
      description,
      owner: req.user._id,
      category,
      tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
      type
    };

    if (type === 'offering') {
      serviceData.price = parseFloat(price);
      serviceData.currency = currency.toUpperCase();
    }

    const service = new Service(serviceData);
    await service.save();

    res.status(201).json(service);
  } catch (error) {
    console.error('[Service Creation Error]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /services/:
 *   get:
 *     summary: Get all services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [request, offering]
 *         description: Filter by type
 *       - in: query
 *         name: promoted
 *         schema:
 *           type: boolean
 *         description: Filter promoted services
 *     responses:
 *       200:
 *         description: List of services
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { type, promoted } = req.query;
    const filter = {};

    if (type && ['request', 'offering'].includes(type)) filter.type = type;
    if (promoted === 'true') filter.promoted = true;

    const services = await Service.find(filter)
      .populate('owner', 'username real_name profile_image user_type')
      .sort({ promoted: -1, createdAt: -1 });

    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Get a service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service details
 *       404:
 *         description: Not found
 */
router.get('/:id', validateParams(schemas.serviceParams), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('owner', 'username real_name profile_image');

    if (!service) return res.status(404).json({ error: 'Service not found' });

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /services/del/{id}:
 *   delete:
 *     summary: Delete a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Service not found
 */
router.delete('/del/:id', authMiddleware, validateParams(schemas.serviceParams), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /services/upd/{id}:
 *   post:
 *     summary: Update a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               type:
 *                 type: string
 *                 enum: [request, offering]
 *     responses:
 *       200:
 *         description: Updated service
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Service not found
 */
router.post('/upd/:id', authMiddleware, validateParams(schemas.serviceParams), validate(schemas.updateService), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, price, currency, category, tags, type } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (tags) updateData.tags = Array.isArray(tags) ? tags : [tags];
    if (type) updateData.type = type;

    if (type === 'offering' || service.type === 'offering') {
      if (price) updateData.price = parseFloat(price);
      if (currency) updateData.currency = currency.toUpperCase();
    }

    const updatedService = await Service.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedService);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /services/promote/{id}:
 *   post:
 *     summary: Promote a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentID:
 *                 type: string
 *     responses:
 *       200:
 *         description: Service promoted successfully
 *       400:
 *         description: Already promoted or missing paymentID
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Service not found
 */
router.post('/promote/:id', authMiddleware, validateParams(schemas.serviceParams), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.owner.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not authorized' });

    if (service.promoted) return res.status(400).json({ error: 'Service is already promoted' });

    const { paymentID } = req.body;
    if (!paymentID) return res.status(400).json({ error: 'Payment ID required' });

    await Service.findByIdAndUpdate(req.params.id, { promoted: true, promoted_at: new Date() });

    res.json({ message: 'Service promoted successfully', promotion_cost: 15 });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
