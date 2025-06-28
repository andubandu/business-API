const mongoose = require('mongoose');
const {allowedRoles} = require('../arrays')
const userSchema = new mongoose.Schema({
  real_name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile_image: { type: String, default: '' },
  role: { type: String, enum: allowedRoles, default: 'client' },
  github_id: String,
  verification_status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
  requested_role: String,
  verification_data: {
    github_profile: String,
    portfolio_url: String,
    experience_description: String,
    technical_answers: [String],
    certifications: [String],
    github_analysis: {
      total_repos: Number,
      recent_commits: Number,
      languages: [String],
      activity_score: Number,
      profile_complete: Boolean
    },
    validation_flags: [String],
    submitted_at: { type: Date, default: Date.now }
  },
  paypal_account: {
    email: { type: String, default: '' },
    merchant_id: { type: String, default: '' },
    connected: { type: Boolean, default: false },
    connected_at: Date,
    last_verified: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);