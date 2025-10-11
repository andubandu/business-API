require('dotenv').config();
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
  scope: ['user:email'],
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const emails = profile.emails || [];
    const primaryEmailObj = emails.find(e => e.primary && e.verified) || emails[0];
    if (!primaryEmailObj?.value) return done(new Error('No email found on GitHub profile'), null);
    const email = primaryEmailObj.value;

    let user = await User.findOne({ github_id: profile.id });
    if (!user) {
      const userType = req.session?.oauthUserType || 'developer';
      user = new User({
        real_name: profile.displayName || profile.username,
        username: profile.username + '_gh',
        email,
        password: await bcrypt.hash('github_user', 10),
        github_id: profile.id,
        profile_image: profile.photos?.[0]?.value || '',
        user_type: userType
      });
      await user.save();
    }
    delete req.session.oauthUserType;
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email'],
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email found on Google profile'), null);

    let user = await User.findOne({ google_id: profile.id });
    if (!user) {
      const userType = req.session?.oauthUserType || 'user';
      user = new User({
        real_name: profile.displayName,
        username: profile.emails[0].value.split('@')[0] + '_google',
        email,
        password: await bcrypt.hash('google_user', 10),
        google_id: profile.id,
        profile_image: profile.photos?.[0]?.value || '',
        user_type: userType
      });
      await user.save();
    }
    delete req.session.oauthUserType;
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

module.exports = passport;
