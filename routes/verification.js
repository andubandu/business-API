const express = require('express');
const multer = require('multer');
const os = require('os');
const { authMiddleware } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { analyzeGitHubProfile, validatePortfolioUrl } = require('../utils/github');
const User = require('../models/User');

const router = express.Router();

const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/verify', authMiddleware, upload.array('certifications', 5), validate(schemas.verification), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user && user.verification_status === 'approved') {
      return res.status(400).json({ error: 'Verification already approved' });
    }

    const { 
      requested_role, 
      github_profile, 
      portfolio_url, 
      experience_description,
      technical_answers
    } = req.body;
    
    if (['client', 'vibecoder'].includes(requested_role)) {
      return res.status(403).json({ error: 'Role forbidden' });
    }

    const validationFlags = [];
    let githubAnalysis = {};
    
    if (github_profile) {
      githubAnalysis = await analyzeGitHubProfile(github_profile);
      
      if (githubAnalysis.activity_score < 10) {
        validationFlags.push('Low GitHub activity');
      }
      if (githubAnalysis.total_repos < 3) {
        validationFlags.push('Few public repositories');
      }
    } else {
      validationFlags.push('No GitHub profile provided');
    }
    
    if (portfolio_url) {
      const portfolioValid = await validatePortfolioUrl(portfolio_url);
      if (!portfolioValid) {
        validationFlags.push('Portfolio URL not accessible');
      }
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

    const answersArray = Array.isArray(technical_answers) ? technical_answers : [technical_answers];

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
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;