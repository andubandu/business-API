require('dotenv').config();
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
callbackURL: process.env.GITHUB_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ github_id: profile.id });
    if (user) {
      return done(null, user);
    }
    user = new User({
      real_name: profile.displayName || profile.username,
      username: profile.username + '_gh',
      email: profile.emails ? profile.emails[0].value : `${profile.username}@github.com`,
      password: await bcrypt.hash('github_user', 10),
      github_id: profile.id,
      profile_image: profile.photos ? profile.photos[0].value : ''
    });
    await user.save();
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ google_id: profile.id });
    if (user) return done(null, user);

    user = new User({
      real_name: profile.displayName,
      username: profile.emails[0].value.split('@')[0] + '_google',
      email: profile.emails[0].value,
      password: await bcrypt.hash('google_user', 10),
      google_id: profile.id,
      profile_image: profile.photos[0]?.value || ''
    });

    await user.save();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));


module.exports = passport;