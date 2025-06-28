const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "/auth/github/callback"
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

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;