const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Safe toString utility function
const safeToString = value => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch (error) {
    console.error('Error converting value to string:', error);
    return '';
  }
};

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          console.log(`Passport: Attempting to authenticate user ${email}`);

          // Use the User model's authenticate method
          const result = await User.authenticate(email, password);

          if (result.error) {
            console.log(`Passport: Authentication failed - ${result.error}`);
            return done(null, false, { message: result.error });
          }

          if (result.user) {
            console.log(
              `Passport: Authentication successful for user ${email} (ID: ${result.user._id})`
            );
            return done(null, result.user);
          }

          // Fallback error (should not reach here)
          console.log('Passport: Authentication failed - Unknown error');
          return done(null, false, { message: 'Invalid credentials' });
        } catch (err) {
          console.error('Passport error:', err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log(`Passport: Serializing user ID: ${user._id}`);
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      console.log(`Passport: Deserializing user ID: ${id}`);
      const user = await User.findById(id);

      if (!user) {
        console.log(`Passport: User with ID ${id} not found during deserialization`);
        return done(null, false);
      }

      console.log(`Passport: User ${user.email} deserialized successfully`);
      done(null, user);
    } catch (err) {
      console.error('Passport: Error deserializing user:', err);
      done(err);
    }
  });
};
