require('dotenv').config();
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User.js');

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ['user:email'],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const emails = profile.emails || [];
        const primaryEmailObj =
          emails.find((e) => e.primary && e.verified) || emails[0];

        if (!primaryEmailObj?.value) {
          return done(new Error('No email found on GitHub profile'), null);
        }

        const email = primaryEmailObj.value.toLowerCase().trim();
        const githubId = profile.id;

        let user = await User.findOne({ email });

        if (user) {
          if (user.google_id && !user.github_id) {
            req.res.redirect(
              `${process.env.CLIENT_URL}/login?error=${encodeURIComponent('invalidprovidergoogle')}`
            );
            return;
          }

          return done(null, user);
        }

        const userType = req.session?.oauthUserType || 'developer';
        user = await User.create({
          real_name: profile.displayName || profile.username,
          username: `${profile.username}_gh`,
          email,
          password: await bcrypt.hash('github_user', 10),
          github_id: githubId,
          profile_image: profile.photos?.[0]?.value || '',
          user_type: userType,
        });

        delete req.session.oauthUserType;
        done(null, user);
      } catch (err) {
        console.error('GitHub OAuth error:', err);
        done(err, null);
      }
    }
  )
);


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase().trim();
        if (!email) {
          return done(new Error('No email found on Google profile'), null);
        }

        const googleId = profile.id;
        let user = await User.findOne({ email });

        if (user) {
          if (user.github_id && !user.google_id) {
            req.res.redirect(
              `${process.env.CLIENT_URL}/login?error=${encodeURIComponent('invalidprovidergithub')}`
            );
            return;
          }
          return done(null, user);
        }

        const userType = req.session?.oauthUserType || 'user';
        user = await User.create({
          real_name: profile.displayName,
          username: `${email.split('@')[0]}_google`,
          email,
          password: await bcrypt.hash('google_user', 10),
          google_id: googleId,
          profile_image: profile.photos?.[0]?.value || '',
          user_type: userType,
        });

        delete req.session.oauthUserType;
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);


module.exports = passport;
