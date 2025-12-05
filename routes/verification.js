const express = require('express');
const multer = require('multer');
const os = require('os');
const { authMiddleware, verifiedOnly } = require('../middleware/auth.js');
const { validate, schemas } = require('../middleware/validation.js');
const { uploadToCloudinary } = require('../utils/cloudinary.js');
const { analyzeGitHubProfile, validatePortfolioUrl } = require('../utils/github.js');
const User = require('../models/User.js');

const router = express.Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * @swagger
 * tags:
 *   name: Verification
 *   description: User verification requests
 */

/**
 * @swagger
 * /verify:
 *   post:
 *     summary: Submit verification request
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               requested_role:
 *                 type: string
 *               github_profile:
 *                 type: string
 *               portfolio_url:
 *                 type: string
 *               experience_description:
 *                 type: string
 *               technical_answers:
 *                 type: array
 *                 items:
 *                   type: string
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Verification request submitted
 *       400:
 *         description: Verification already approved
 *       403:
 *         description: Role forbidden
 *       500:
 *         description: Server error
 */
router.post('/verify', authMiddleware, verifiedOnly, upload.array('certifications', 5), validate(schemas.verification), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.verification_status === 'approved') {
      return res.status(400).json({ error: 'Verification already approved' });
    }

    if (user.user_type != 'developer') {
      return res.status(403).json({ error: 'Only developers can request verification' });
    }

    const { requested_role, github_profile, portfolio_url, experience_description, technical_answers } = req.body;

    if (['client', 'vibecoder'].includes(requested_role)) {
      return res.status(403).json({ error: 'Role forbidden' });
    }

    const validationFlags = [];
    let githubAnalysis = {};

    if (github_profile) {
      githubAnalysis = await analyzeGitHubProfile(github_profile);
      if (githubAnalysis.activity_score < 10) validationFlags.push('Low GitHub activity');
      if (githubAnalysis.total_repos < 3) validationFlags.push('Few public repositories');
    } else {
      validationFlags.push('No GitHub profile provided');
    }

    if (portfolio_url) {
      const portfolioValid = await validatePortfolioUrl(portfolio_url);
      if (!portfolioValid) validationFlags.push('Portfolio URL not accessible');
    }

    if (experience_description && experience_description.length < 50) {
      validationFlags.push('Experience description too brief');
    }

    let certificationUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imageUrl = await uploadToCloudinary(file.path);
        certificationUrls.push(imageUrl);
      }
    }

    const answersArray = Array.isArray(technical_answers) ? technical_answers : technical_answers ? [technical_answers] : [];

    await User.findByIdAndUpdate(req.user._id, {
      requested_role,
      verification_status: 'pending',
      verification_data: {
        github_profile,
        portfolio_url,
        experience_description,
        technical_answers: answersArray,
        certifications: certificationUrls,
        github_analysis: githubAnalysis,
        validation_flags: validationFlags,
        submitted_at: new Date()
      }
    });

    res.json({
      message: 'Verification request submitted successfully',
      validation_flags: validationFlags
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
