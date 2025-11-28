const axios = require('axios');
const User = require('../models/User');
require('dotenv').config();

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role === 'admin') return;

  const code = generateVerificationCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  user.verification_code = code;
  user.verification_expires = expires;
  user.verification_status = 'pending';
  await user.save();

  await axios.post(`${process.env.EMAIL_SERVICE_URL}/send-verification`, {
    email: user.email,
    name: user.real_name,
    code
  });
}

async function sendThankYouEmail(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  await axios.post(`${process.env.EMAIL_SERVICE_URL}/send-welcome`, {
    email: user.email,
    name: user.real_name
  });
}

async function verifyCode(userId, submittedCode) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const now = new Date();

  if (!user.verification_code || !user.verification_expires) {
    return { success: false, message: 'No verification code set' };
  }

  if (user.verification_expires < now) {
    return { success: false, message: 'Verification code expired' };
  }

  if (user.verification_code !== submittedCode) {
    return { success: false, message: 'Invalid verification code' };
  }

  user.verification_status = 'approved';
  user.verification_code = null;
  user.verification_expires = null;
  await user.save();

  await sendThankYouEmail(user._id);

  return { success: true, message: 'Verification successful' };
}

module.exports = {
  sendVerificationEmail,
  verifyCode
};
