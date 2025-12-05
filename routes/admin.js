const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.js');
const { validateParams, schemas } = require('../middleware/validation.js');
const { notifyVerificationApproved, notifyVerificationRejected } = require('../utils/notifications.js');
const User = require('../models/User.js');
const Transaction = require('../models/Transaction.js')
const Service = require('../models/Service.js');

const router = express.Router();

router.get('/verifications', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ verification_status: 'pending' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/transactions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/approve/:userID', authMiddleware, adminMiddleware, validateParams(schemas.adminParams), async (req, res) => {
  try {
    const user = await User.findById(req.params.userID);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await User.findByIdAndUpdate(req.params.userID, { role: user.requested_role, verification_status: 'approved' });
    await notifyVerificationApproved(req.params.userID, user.requested_role);

    res.json({ message: 'User approved' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reject/:userID', authMiddleware, adminMiddleware, validateParams(schemas.adminParams), async (req, res) => {
  try {
    const user = await User.findById(req.params.userID);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await User.findByIdAndUpdate(req.params.userID, { verification_status: 'rejected' });
    await notifyVerificationRejected(req.params.userID, user.requested_role);

    res.json({ message: 'User rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all-users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all-services', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/delservice/:ServiceID', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const service = await Service.findById(req.params.ServiceID);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    await Service.findByIdAndDelete(req.params.ServiceID);
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/deluser/:UserID', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.UserID);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await User.findByIdAndDelete(req.params.UserID);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/usertype/:userID', authMiddleware, adminMiddleware, validateParams(schemas.adminParams), async (req, res) => {
  try {
    const { newRole } = req.body;
    if (!newRole) {
      return res.status(400).json({ error: 'New type is required' });
    }
    const user = await User.findById(req.params.userID);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await User.findByIdAndUpdate(req.params.userID, { user_type: newRole });
    res.json({ message: 'User role updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
})

router.patch('/userrole/:userID', authMiddleware, adminMiddleware, validateParams(schemas.adminParams), async (req, res) => {
  try {
    const { newRole } = req.body;
    if (!newRole) {
      return res.status(400).json({ error: 'New role is required' });
    }
    const user = await User.findById(req.params.userID);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await User.findByIdAndUpdate(req.params.userID, { role: newRole });
    res.json({ message: 'User role updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }})

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative actions for user verifications and management
 */

/**
 * @swagger
 * /admin/verifications:
 *   get:
 *     summary: List all users with pending verification
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of pending users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /admin/approve/{userID}:
 *   post:
 *     summary: Approve a user's verification request
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User approved successfully
 */

/**
 * @swagger
 * /admin/reject/{userID}:
 *   post:
 *     summary: Reject a user's verification request
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User rejected successfully
 */

/**
 * @swagger
 * /admin/all-users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of all users
 */

/**
 * @swagger
 * /admin/all-services:
 *   get:
 *     summary: List all services
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of all services
 */

/**
 * @swagger
 * /admin/delservice/{ServiceID}:
 *   delete:
 *     summary: Delete a service by ID
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ServiceID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted successfully
 */

/**
 * @swagger
 * /admin/deluser/{UserID}:
 *   delete:
 *     summary: Delete a user by ID
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: UserID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */

module.exports = router;
