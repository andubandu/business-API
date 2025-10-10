const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateParams, schemas } = require('../middleware/validation');
const { notifyVerificationApproved, notifyVerificationRejected } = require('../utils/notifications');
const User = require('../models/User');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative actions for user verifications
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
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   real_name:
 *                     type: string
 *                   requested_role:
 *                     type: string
 *                   verification_status:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/verifications', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ verification_status: 'pending' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

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
 *         description: ID of the user to approve
 *     responses:
 *       200:
 *         description: User approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User approved
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/approve/:userID', authMiddleware, adminMiddleware, validateParams(schemas.adminParams), async (req, res) => {
  try {
    const user = await User.findById(req.params.userID);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndUpdate(req.params.userID, {
      role: user.requested_role,
      verification_status: 'approved'
    });

    await notifyVerificationApproved(req.params.userID, user.requested_role);

    res.json({ message: 'User approved' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

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
 *         description: ID of the user to reject
 *     responses:
 *       200:
 *         description: User rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User rejected
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/reject/:userID', authMiddleware, adminMiddleware, validateParams(schemas.adminParams), async (req, res) => {
  try {
    const user = await User.findById(req.params.userID);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndUpdate(req.params.userID, {
      verification_status: 'rejected'
    });

    await notifyVerificationRejected(req.params.userID, user.requested_role);

    res.json({ message: 'User rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;