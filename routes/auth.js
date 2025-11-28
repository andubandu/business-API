require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport.js');
const { validate, schemas } = require('../middleware/validation.js');
const User = require('../models/User.js');
const { authMiddleware, verifiedOnly } = require('../middleware/auth.js');
const router = express.Router();
const { sendVerificationEmail, verifyCode } = require('../utils/sendEmail.js');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User signup, login, and OAuth
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSignup'
 *           example:
 *             real_name: "John Doe"
 *             username: "johndoe"
 *             email: "johndoe@example.com"
 *             password: "StrongPassword123"
 *             user_type: "user"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *             example:
 *               message: "User created successfully"
 *               token: "JWT_TOKEN_HERE"
 *               user:
 *                 _id: "650b8e1f6c8e123456789abc"
 *                 real_name: "John Doe"
 *                 username: "johndoe"
 *                 email: "johndoe@example.com"
 *                 user_type: "user"
 *                 github_id: null
 *                 google_id: null
 *                 verification_status: "none"
 *                 paypal_account:
 *                   email: null
 *                   merchant_id: null
 *                   connected: false
 *                 createdAt: "2025-10-11T07:49:51.159Z"
 *                 updatedAt: "2025-10-11T07:49:51.159Z"
 *       400:
 *         description: Invalid input or user already exists
 *       500:
 *         description: Server error
 */
router.post('/signup', validate(schemas.signup), async (req, res) => {
  try {
    const { real_name, username, email, password, user_type } = req.body;
    if (!user_type) return res.status(400).json({ error: 'User type is required' });

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ real_name, username, email, password: hashedPassword, user_type });
    await user.save();

    await sendVerificationEmail(user._id);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'User created successfully. Verification code sent to email.',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify user's email with code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - code
 *             properties:
 *               userId:
 *                 type: string
 *               code:
 *                 type: string
 *             example:
 *               userId: "650b8e1f6c8e123456789abc"
 *               code: "123456"
 *     responses:
 *       200:
 *         description: Verification successful
 *       400:
 *         description: Invalid or expired code
 */
router.post('/verify', async (req, res) => {
  try {
    const { userId, code } = req.body;
    const result = await verifyCode(userId, code);

    if (!result.success) return res.status(400).json({ error: result.message });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *           example:
 *             email: "johndoe@example.com"
 *             password: "StrongPassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *             example:
 *               message: "Login successful"
 *               token: "JWT_TOKEN_HERE"
 *               user:
 *                 _id: "650b8e1f6c8e123456789abc"
 *                 real_name: "John Doe"
 *                 username: "johndoe"
 *                 email: "johndoe@example.com"
 *                 user_type: "user"
 *                 github_id: null
 *                 google_id: null
 *                 verification_status: "none"
 *                 paypal_account:
 *                   email: null
 *                   merchant_id: null
 *                   connected: false
 *                 createdAt: "2025-10-11T07:49:51.159Z"
 *                 updatedAt: "2025-10-11T07:49:51.159Z"
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ message: 'Login successful', token, user: userResponse });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *             example:
 *               _id: "650b8e1f6c8e123456789abc"
 *               real_name: "John Doe"
 *               username: "johndoe"
 *               email: "johndoe@example.com"
 *               user_type: "user"
 *               github_id: null
 *               google_id: null
 *               verification_status: "none"
 *               paypal_account:
 *                 email: null
 *                 merchant_id: null
 *                 connected: false
 *               createdAt: "2025-10-11T07:49:51.159Z"
 *               updatedAt: "2025-10-11T07:49:51.159Z"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Login with GitHub
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: t
 *         schema:
 *           type: string
 *           enum: [developer]
 *         description: User type for first login (only developer supported)
 *     responses:
 *       302:
 *         description: Redirects to GitHub for authentication
 */
router.get('/github', (req, res, next) => {
  const userType = 'developer';
  req.session.oauthUserType = userType;
  passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);
});

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirects to client with JWT token
 */

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, async (err, user, info) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (!user) return res.status(400).json(JSON.parse(info.message));

    if (user.isNew || user.verification_status !== 'approved') {
      user.verification_status = 'pending';
      await user.save();
      await sendVerificationEmail(user._id);
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    return res.redirect(`${process.env.CLIENT_URL}/login?token=${token}`);
  })(req, res, next);
});

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Login with Google
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: t
 *         schema:
 *           type: string
 *           enum: [user, developer]
 *         description: User type for first login (defaults to user)
 *     responses:
 *       302:
 *         description: Redirects to Google for authentication
 */
router.get('/google', (req, res, next) => {
  const userType = req.query?.t === 'developer' ? 'developer' : 'user';
  req.session.oauthUserType = userType;
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirects to client with JWT token
 */
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (!user) return res.status(400).json(JSON.parse(info.message));

    if (user.isNew || user.verification_status !== 'approved') {
      user.verification_status = 'pending';
      await user.save();
      await sendVerificationEmail(user._id);
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    return res.redirect(`${process.env.CLIENT_URL}/login?token=${token}`);
  })(req, res, next);
});

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     UserSignup:
 *       type: object
 *       required:
 *         - real_name
 *         - username
 *         - email
 *         - password
 *         - user_type
 *       properties:
 *         real_name:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *         user_type:
 *           type: string
 *           enum: [user, developer]
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *         password:
 *           type: string
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         real_name:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         profile_image:
 *           type: string
 *           nullable: true
 *         user_type:
 *           type: string
 *           enum: [user, developer]
 *         github_id:
 *           type: string
 *           nullable: true
 *         google_id:
 *           type: string
 *           nullable: true
 *         verification_status:
 *           type: string
 *           enum: [none, pending, approved, rejected]
 *         paypal_account:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               nullable: true
 *             merchant_id:
 *               type: string
 *               nullable: true
 *             connected:
 *               type: boolean
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

module.exports = router;
