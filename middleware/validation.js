const Joi = require('joi');

const allowedRoles = [
  "client",
  "backend", "frontend", "fullstack",
  "rust", "cpp", "cs", "systems-developer", "embedded-developer", "firmware-developer", "device-driver-developer", "kernel-developer",
  "web-developer", "frontend-developer", "backend-developer", "fullstack-developer",
  "mobile-developer", "ios-developer", "android-developer", "flutter-developer", "react-native-developer",
  "game-developer", "graphics-programmer", "unity-developer", "unreal-developer", "vr-developer", "ar-developer",
  "devops-engineer", "site-reliability-engineer", "cloud-engineer", "infrastructure-engineer", "platform-engineer", "release-engineer",
  "data-engineer", "data-scientist", "ml-engineer", "ai-engineer", "deep-learning-engineer", "nlp-engineer", "cv-engineer", "mleops-engineer", "big-data-developer", "data-visualization-developer",
  "security-engineer", "application-security-engineer", "penetration-tester", "red-teamer", "reverse-engineer",
  "blockchain-developer", "smart-contract-developer", "solidity-developer", "web3-developer", "dapp-developer",
  "qa-engineer", "test-automation-engineer", "manual-tester", "performance-tester",
  "ui-developer", "ux-developer", "graphic-designer", "ui-ux-designer", "product-designer",
  "simulation-developer", "bioinformatics-developer", "quant-developer", "hardware-software-integration-developer", "robotics-developer", "audio-software-developer", "financial-software-developer",
  "scripting-developer", "build-engineer", "ci-cd-engineer",
  "no-code-developer", "low-code-developer",
  "technical-writer", "project-manager", "product-manager", "scrum-master", "technical-support-engineer", "database-administrator", "network-engineer",
  "vibecoder"
];

const paypalSupportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

const schemas = {
  signup: Joi.object({
    real_name: Joi.string().min(2).max(50).required(),
    username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateUser: Joi.object({
    real_name: Joi.string().min(2).max(50).optional(),
    username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).optional(),
    email: Joi.string().email().optional()
  }),

  createService: Joi.object({
    title: Joi.string().min(5).max(100).required(),
    description: Joi.string().min(20).max(1000).required(),
    price: Joi.number().positive().required(),
    currency: Joi.string().valid(...paypalSupportedCurrencies).default('USD'),
    category: Joi.string().max(50).optional(),
    tags: Joi.alternatives().try(
      Joi.array().items(Joi.string().max(30)),
      Joi.string().max(30)
    ).optional()
  }),

  updateService: Joi.object({
    title: Joi.string().min(5).max(100).optional(),
    description: Joi.string().min(20).max(1000).optional(),
    price: Joi.number().positive().optional(),
    currency: Joi.string().valid(...paypalSupportedCurrencies).optional(),
    category: Joi.string().max(50).optional(),
    tags: Joi.alternatives().try(
      Joi.array().items(Joi.string().max(30)),
      Joi.string().max(30)
    ).optional()
  }),

  verification: Joi.object({
    requested_role: Joi.string().valid(...allowedRoles.filter(role => 
      role !== 'client' && role !== 'vibecoder'
    )).required(),
    github_profile: Joi.string().uri().pattern(/github\.com/).required(),
    portfolio_url: Joi.string().uri().optional(),
    experience_description: Joi.string().min(50).max(2000).required(),
    technical_answers: Joi.alternatives().try(
      Joi.array().items(Joi.string().min(20).max(500)),
      Joi.string().min(20).max(500)
    ).required()
  }),

  paymentSuccess: Joi.object({
    serviceID: Joi.string().hex().length(24).required(),
    paymentID: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid(...paypalSupportedCurrencies).default('USD'),
    paypal_order_id: Joi.string().optional()
  }),

  paypalConnect: Joi.object({
    paypal_email: Joi.string().email().required(),
    merchant_id: Joi.string().min(5).max(50).optional()
  }),

  serviceParams: Joi.object({
    id: Joi.string().hex().length(24).required()
  }),

  buyServiceParams: Joi.object({
    serviceID: Joi.string().hex().length(24).required()
  }),

  userParams: Joi.object({
    username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).required()
  }),

  adminParams: Joi.object({
    userID: Joi.string().hex().length(24).required()
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ 
        error: 'Parameter validation error', 
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

module.exports = {
  schemas,
  validate,
  validateParams,
  paypalSupportedCurrencies
};