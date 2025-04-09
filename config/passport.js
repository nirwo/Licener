const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Load User model
const User = require('../models/User');

module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        console.log('Login attempt for:', email);
        
        // Match user using file DB with error handling
        if (!email) {
          console.error('Login attempt with empty email');
          return done(null, false, { message: 'Email is required' });
        }
        
        // Find user by email (case insensitive)
        const users = User.find({ email: email.toLowerCase() });
        const user = users.length > 0 ? users[0] : null;
        
        if (!user) {
          console.error('No user found with email:', email);
          return done(null, false, { message: 'That email is not registered' });
        }

        // Verify password is provided
        if (!password) {
          console.error('Login attempt with empty password for:', email);
          return done(null, false, { message: 'Password is required' });
        }

        // Match password with better error handling
        try {
          const isMatch = await bcrypt.compare(password, user.password);
          
          if (isMatch) {
            console.log('Successful login for:', email);
            
            // Update last login time
            user.lastLogin = Date.now();
            try {
              User.findByIdAndUpdate(user._id.toString(), { lastLogin: Date.now() });
            } catch (updateErr) {
              console.error('Failed to update last login time:', updateErr);
              // Continue with login even if last login update fails
            }
            
            return done(null, user);
          } else {
            console.log('Password mismatch for:', email);
            return done(null, false, { message: 'Password incorrect' });
          }
        } catch (bcryptErr) {
          console.error('Error comparing passwords:', bcryptErr);
          return done(null, false, { message: 'Authentication error' });
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
      // Add better error handling for ID
      if (!id) {
        console.error('Deserialize User: Invalid ID provided', id);
        return done(null, false);
      }
      
      // Make sure we're using a string ID
      const idStr = id.toString();
      console.log('Deserializing user with ID:', idStr);
      
      const user = User.findById(idStr);
      
      if (!user) {
        console.error('Deserialize User: No user found with ID', idStr);
        return done(null, false);
      }
      
      // Ensure user.id is set for backward compatibility
      user.id = user._id.toString();
      
      // Log successful deserialization
      console.log('Deserialized user:', user.name || user.email);
      
      done(null, user);
    } catch (err) {
      console.error('Error deserializing user:', err);
      done(err, null);
    }
  });
};