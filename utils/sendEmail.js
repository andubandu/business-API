require('dotenv').config();
const nodemailer = require('nodemailer');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GOOGLE_EMAIL,
    pass: process.env.GOOGLE_PASSPHRASE
  }
});

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification code email
 * @param {String} userId - MongoDB user _id
 */
async function sendVerificationEmail(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.role === 'admin') {
    console.log('Admin account - skipping verification email.');
    return;
  }

  const code = generateVerificationCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  user.verification_code = code;
  user.verification_expires = expires;
  user.verification_status = 'pending';
  await user.save();

  const htmlContent = `
  <div style="font-family: Arial, sans-serif; background-color: #FFFFFF; padding: 30px; border-radius: 10px;">
    <h2 style="color: #4B0082;">Verify Your Email</h2>
    <p style="color: #6F42C1;">Hello <b>${user.real_name}</b>,</p>
    <p style="color: #000000;">
      Please use the following verification code to complete your registration:
    </p>
    <div style="background-color: #FFC107; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 5px; color: #4B0082;">
      ${code}
    </div>
    <p style="color: #000000; margin-top: 20px;">
      This code expires in 15 minutes.
    </p>
    <p style="color: #6F42C1;">Thank you for joining our platform!</p>
  </div>
  `;

  const mailOptions = {
    from: `"KODERS4HIRE" <${process.env.GOOGLE_EMAIL}>`,
    to: user.email,
    subject: 'Your Verification Code',
    text: `Hello ${user.real_name}, your verification code is: ${code} (expires in 15 minutes)`,
    html: htmlContent
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Verification email sent:', info.messageId);
}

/**
 * Verify submitted code
 * @param {String} userId
 * @param {String} submittedCode
 */
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

  return { success: true, message: 'Verification successful' };
}

module.exports = {
  sendVerificationEmail,
  verifyCode
};
