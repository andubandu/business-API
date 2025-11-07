const express = require('express');
const Cart = require('../models/Cart.js');
const Service = require('../models/Service.js');
const { authMiddleware } = require('../middleware/auth.js');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Cart
 *     description: Shopping cart operations
 */

/**
 * @swagger
 * /cart/my:
 *   get:
 *     summary: Get current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User cart
 */
router.get('/my', authMiddleware, async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  const total = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  res.json({ ...cart.toObject(), total });
});

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Add a product to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated cart
 */
router.post('/add', authMiddleware, async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity || quantity < 1) return res.status(400).json({ msg: 'Invalid input' });

  const product = await Service.findById(productId);
  if (!product) return res.status(404).json({ msg: 'Product not found' });
  if (product.owner.toString() === req.user._id.toString()) return res.status(400).json({ msg: 'Cannot add your own product to cart' });
  if (product.type === "request") return res.status(400).json({ msg: 'Cannot add request-type products to cart' });

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  const existingItem = cart.items.find(i => i.product.toString() === productId);
  if (existingItem) existingItem.quantity += quantity;
  else cart.items.push({ product: productId, quantity });

  await cart.save();
  await cart.populate('items.product');
  const total = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  res.json({ ...cart.toObject(), total });
});

/**
 * @swagger
 * /cart/update:
 *   post:
 *     summary: Update quantity of a product in cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated cart
 */
router.post('/update', authMiddleware, async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || quantity < 0) return res.status(400).json({ msg: 'Invalid input' });

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ msg: 'Cart not found' });

  const itemIndex = cart.items.findIndex(i => i.product.toString() === productId);
  if (itemIndex === -1) return res.status(404).json({ msg: 'Item not in cart' });

  if (quantity === 0) cart.items.splice(itemIndex, 1);
  else cart.items[itemIndex].quantity = quantity;

  await cart.save();
  await cart.populate('items.product');
  const total = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  res.json({ ...cart.toObject(), total });
});

/**
 * @swagger
 * /cart/clear:
 *   delete:
 *     summary: Clear all items from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete('/clear', authMiddleware, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ msg: 'Cart not found' });

  cart.items = [];
  await cart.save();
  res.json({ msg: 'Cart cleared', cart });
});

module.exports = router;
