const express = require('express');
const { authMiddleware, verifiedOnly } = require('../middleware/auth.js');
const Proposal = require('../models/Proposal.js');
const Service = require('../models/Service.js');
const router = express.Router();
const Chat = require('../models/Chat.js');
/**
 * @swagger
 * tags:
 *   name: Proposals
 *   description: Buyer–seller proposals flow (like Upwork)
 */

/**
 * @swagger
 * /proposals/{serviceId}/new:
 *   post:
 *     summary: Send a proposal for a service
 *     tags: [Proposals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Proposal created successfully
 *       400:
 *         description: Validation or ownership error
 *       404:
 *         description: Service not found
 */
router.post('/:serviceId/new', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    if (process.env.NODE_ENV == 'production' && req.user.paypal_account.connected === false) {
      return res.status(400).json({ error: 'Connect your PayPal account before sending proposals' });
    }
    const { message, price } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const service = await Service.findById(req.params.serviceId).populate('owner');
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const buyerId = req.user._id.toString();
    const sellerId = service.owner._id.toString();

    if (buyerId === sellerId) {
      return res.status(400).json({ error: 'Cannot send a proposal to your own service' });
    }

    const existingProposal = await Proposal.findOne({ service: service._id, buyer: buyerId });
    if (existingProposal) {
      return res.status(400).json({ error: 'You already sent a proposal for this service' });
    }

    const proposal = new Proposal({
      service: service._id,
      buyer: buyerId,
      seller: sellerId,
      message,
      price: price ? parseFloat(price) : service.price || 0,
      status: 'pending'
    });

    await proposal.save();
    res.status(201).json(proposal);
  } catch (error) {
    console.error('[Proposal Creation Error]:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});


/**
 * @swagger
 * /proposals/sent:
 *   get:
 *     summary: Get proposals sent by the logged-in user
 *     tags: [Proposals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of sent proposals
 */
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const proposals = await Proposal.find({ buyer: req.user._id })
      .populate('service', 'title type')
      .populate('seller', 'username profile_image')
      .sort({ createdAt: -1 });

    const proposalsWithChat = await Promise.all(proposals.map(async p => {
      if (p.status === 'accepted') {
        const chat = await Chat.findOne({ proposal: p._id });
        return { ...p.toObject(), chat };
      }
      return p;
    }));

    res.json(proposalsWithChat);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @swagger
 * /proposals/received:
 *   get:
 *     summary: Get proposals received by the logged-in user
 *     tags: [Proposals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of received proposals
 */
router.get('/received', authMiddleware, async (req, res) => {
  try {
    const proposals = await Proposal.find({ seller: req.user._id })
      .populate('service', 'title type')
      .populate('buyer', 'username profile_image real_name')
      .sort({ createdAt: -1 });

    res.json(proposals);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /proposals/{id}:
 *   get:
 *     summary: Get details of a specific proposal
 *     tags: [Proposals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposal details
 *       404:
 *         description: Not found
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('service', 'title description type')
      .populate('buyer', 'username profile_image')
      .populate('seller', 'username profile_image');

    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    if (
      proposal.buyer.toString() !== req.user._id.toString() &&
      proposal.seller.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: 'Not authorized to view this proposal' });
    }

    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /proposals/{id}/accept:
 *   post:
 *     summary: Accept a proposal (seller only)
 *     tags: [Proposals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposal accepted
 */
router.post('/:id/accept', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    if (proposal.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the seller can accept this proposal' });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ error: 'Proposal is not pending' });
    }

    proposal.status = 'accepted';
    await proposal.save();

    let chat = await Chat.findOne({ proposal: proposal._id });

    if (!chat) {
      chat = await Chat.create({
        proposal: proposal._id,
        participants: [proposal.buyer, proposal.seller]
      });
    }

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', '-password -__v -email')
      .populate('lastMessage')
      .populate('proposal');

    res.json({
      message: 'Proposal accepted, chat ready',
      chat: populatedChat
    });

  } catch (error) {
    console.error('[Proposal Accept Error]:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * @swagger
 * /proposals/{id}/reject:
 *   post:
 *     summary: Reject a proposal (seller only)
 *     tags: [Proposals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposal rejected
 */
router.post('/:id/reject', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    if (proposal.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the seller can reject this proposal' });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ error: 'Proposal is not pending' });
    }

    proposal.status = 'rejected';
    await proposal.save();

    res.json({ message: 'Proposal rejected', proposal });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /proposals/{id}/delete:
 *   delete:
 *     summary: Delete a proposal (buyer or seller)
 *     tags: [Proposals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposal deleted
 */
router.delete('/:id/delete', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    if (
      proposal.buyer.toString() !== req.user._id.toString() &&
      proposal.seller.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: 'Not authorized to delete this proposal' });
    }

    await Proposal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Proposal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
