const express = require('express');
const { authMiddleware, verifiedOnly } = require('../middleware/auth.js');
const { validate, validateParams, schemas } = require('../middleware/validation.js');
const Service = require('../models/Service.js');
const User = require('../models/User.js');
const Proposal = require('../models/Proposal.js');
const router = express.Router();
const multer=require('multer')
const os = require('os')
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
const {uploadToCloudinary} = require('../utils/cloudinary.js')
/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Service management endpoints
 *   x-notes:
 *     - Offering: Requires user to be verified and have a connected PayPal account.
 *     - Request: Do not include price or currency fields.
 *     - Any type:
 *         - Title must be at least 5 characters long.
 *         - Description must be at least 20 characters long.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         owner:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *             real_name:
 *               type: string
 *             profile_image:
 *               type: string
 *             user_type:
 *               type: string
 *         category:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         type:
 *           type: string
 *           enum: [request, offering]
 *         price:
 *           type: number
 *           format: float
 *         currency:
 *           type: string
 *         promoted:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - _id
 *         - title
 *         - description
 */

/**
 * @swagger
 * /services/new:
 *   post:
 *     summary: Create a new service (offering or request)
 *     tags: [Services]
 *     security:
 *       - BearerAuth: []
 *     description: >
 *       Create a service.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - title
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [request, offering]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR]
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               image_url:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied or PayPal required
 *       500:
 *         description: Server error
 */

router.post('/new', authMiddleware, verifiedOnly, upload.single('image_url'), validate(schemas.createService), async (req, res) => {
  try {
    const { title, description, price, currency, category, tags, type } = req.body;

    if (!title || !description || !type) {
      return res.status(400).json({ error: 'Missing required fields: title, description, type' });
    }

    if (type === 'offering') {
      if (!price || !currency) {
        return res.status(400).json({ error: 'Price and currency are required for offerings' });
      }
    }

    const serviceData = {
      title,
      description,
      owner: req.user._id,
      category: category || 'General',
      tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
      type,
      price: type === 'offering' ? parseFloat(price) : 0,
      currency: type === 'offering' ? currency.toUpperCase() : 'USD'
    };
    if (req.file) {
      const uploadedUrl = await uploadToCloudinary(req.file.path);
      serviceData.image_url = uploadedUrl;
    }

    const service = new Service(serviceData);
    await service.save();

    res.status(201).json(service);

  } catch (error) {
    console.error('[Service Creation Error]:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * @swagger
 * /services/my:
 *  get:
 *    summary: Get services created by the logged-in user
 *   tags: [Services]
 *   security:
 *    - BearerAuth: []
 *   responses:
 *      200:
 *       description: List of user's services
 *     500:
 *      description: Server error
 * /
 */

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const services = await Service.find({
      $or: [{ owner: req.user._id }, { author: req.user._id }]
    });
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @swagger
 * /services/browse:
 *   get:
 *     summary: Browse services with filters
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [request, offering]
 *         description: Filter by service type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by service category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags to filter services
 *     responses:
 *       200:
 *         description: List of filtered services
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Service'
 *       500:
 *         description: Server error
 */

router.get('/browse', async (req, res) => {
  try {
    const { type, category, minPrice, maxPrice, tags } = req.query;
    const filter = { type };

    if (category) filter.category = category;
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    if (tags) filter.tags = { $all: tags.split(',') };

    const services = await Service.find(filter)
      .populate('owner', 'username real_name profile_image user_type')
      .sort({ promoted: -1, createdAt: -1 });

    res.json(services);
  } catch (err) {
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
router.delete('/del/:id', authMiddleware, verifiedOnly, validateParams(schemas.serviceParams), async (req, res) => {
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
router.post('/upd/:id', authMiddleware, verifiedOnly, validateParams(schemas.serviceParams), validate(schemas.updateService), async (req, res) => {
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
router.post('/promote/:id', authMiddleware, verifiedOnly,validateParams(schemas.serviceParams), async (req, res) => {
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


router.post('/:id/propose', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('owner');
    if (!service) return res.status(404).json({ error: 'Service not found' });

    if (service.owner._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot propose to your own service' });
    }

    const { message, price } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const proposal = new Proposal({
      service: service._id,
      buyer: req.user._id,
      seller: service.owner._id,
      message,
      price: price || service.price || 0,
    });

    await proposal.save();
    service.proposals.push(proposal._id);
    await service.save();

    res.status(201).json(proposal);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});
module.exports = router;
