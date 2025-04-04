const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Load User model
const User = require('../models/User');

module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // Match user using file DB
        const users = User.find({ email });
        const user = users.length > 0 ? users[0] : null;
        
        if (!user) {
          return done(null, false, { message: 'That email is not registered' });
        }

        // Match password
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
          // Update last login time
          user.lastLogin = Date.now();
          User.findByIdAndUpdate(user._id, { lastLogin: Date.now() });
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      } catch (err) {
        console.error('Authentication error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    try {
      const user = User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};