const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { ensureAuthenticated } = require('../middleware/auth');

// Define ensureGuest middleware since it's not imported
const ensureGuest = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  return next();
};

// Login Page
router.get('/login', ensureGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Login'
  });
});

// Register Page
router.get('/register', ensureGuest, (req, res) => {
  res.render('auth/register', {
    title: 'Register'
  });
});

// Register
router.post('/register', ensureGuest, async (req, res) => {
  try {
    const { name, email, password, password2 } = req.body;
    let errors = [];

    // Validate required fields
    if (!name || !email || !password || !password2) {
      errors.push({ msg: 'Please fill in all fields' });
    }

    // Check passwords match
    if (password !== password2) {
      errors.push({ msg: 'Passwords do not match' });
    }

    // Check password length
    if (password.length < 6) {
      errors.push({ msg: 'Password should be at least 6 characters' });
    }

    if (errors.length > 0) {
      return res.render('auth/register', {
        title: 'Register',
        errors,
        name,
        email
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      errors.push({ msg: 'Email is already registered' });
      return res.render('auth/register', {
        title: 'Register',
        errors,
        name,
        email
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = {
      _id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name,
      email,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await User.create(newUser);

    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Registration error:', err);
    req.flash('error_msg', 'An error occurred during registration');
    res.redirect('/auth/register');
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/auth/login',
    failureFlash: true
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { 
      console.error('Logout error:', err);
      return next(err); 
    }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/auth/login');
  });
});

// Profile Page
router.get('/profile', ensureAuthenticated, (req, res) => {
  res.render('auth/profile', {
    title: 'My Profile',
    user: req.user
  });
});

// Update Profile
router.put('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Update user profile
    await User.findByIdAndUpdate(req.user._id, {
      name,
      email,
      updatedAt: new Date()
    });
    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/auth/profile');
  } catch (err) {
    console.error('Profile update error:', err);
    req.flash('error_msg', 'Error updating profile');
    res.redirect('/auth/profile');
  }
});

// Change Password
router.put('/change-password', ensureAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id);
    
    // Check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/auth/profile');
    }
    
    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'New passwords do not match');
      return res.redirect('/auth/profile');
    }
    
    // Check new password length
    if (newPassword.length < 6) {
      req.flash('error_msg', 'New password should be at least 6 characters');
      return res.redirect('/auth/profile');
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user password
    await User.findByIdAndUpdate(req.user._id, {
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    req.flash('success_msg', 'Password changed successfully');
    res.redirect('/auth/profile');
  } catch (err) {
    console.error('Password change error:', err);
    req.flash('error_msg', 'Error changing password');
    res.redirect('/auth/profile');
  }
});

module.exports = router;
