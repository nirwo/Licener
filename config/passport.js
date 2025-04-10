const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../utils/file-db');
const bcrypt = require('bcryptjs');

// Safe toString utility function
const safeToString = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch (error) {
    console.error("Error converting value to string:", error);
    return '';
  }
};

module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
      // Match user
      User.findOne({ email: email })
        .then(user => {
          if (!user) {
            return done(null, false, { message: 'That email is not registered' });
          }

          // Match password
          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
              return done(null, user);
            } else {
              return done(null, false, { message: 'Password incorrect' });
            }
          });
        })
        .catch(err => {
          console.error('Error in LocalStrategy:', err);
          return done(err);
        });
    })
  );

  passport.serializeUser((user, done) => {
    try {
      if (user && (user._id || user.id)) {
        const userId = user._id || user.id;
        console.log(`Serializing user: ${userId}`);
        return done(null, userId);
      }
      console.error("Cannot serialize user - missing ID:", user);
      return done(null, false);
    } catch (err) {
      console.error("Error serializing user:", err);
      return done(err, null);
    }
  });

  passport.deserializeUser((id, done) => {
    console.log(`Deserializing user with ID: ${id}`);
    
    try {
      User.findOne({ _id: id })
        .then(user => {
          if (!user) {
            console.log(`No user found with ID: ${id}`);
            return done(null, false);
          }
          
          // Log the entire user object for debugging
          console.log("Found user:", JSON.stringify(user, null, 2));
          
          // Return the user directly, avoiding any toString() operations
          return done(null, user);
        })
        .catch(err => {
          console.error('Error deserializing user:', err);
          return done(err, null);
        });
    } catch (err) {
      console.error('Error in deserializeUser:', err);
      return done(err, null);
    }
  });
};