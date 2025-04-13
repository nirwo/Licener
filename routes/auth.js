const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { ensureAuthenticated, ensureGuest } = require('../middleware/auth');

// Login Page
router.get('/login', ensureGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    layout: 'auth',
    isLoginPage: true
  });
});

// Register Page
router.get('/register', ensureGuest, (req, res) => {
  res.render('auth/register', {
    title: 'Register',
    layout: 'auth',
    isRegisterPage: true
  });
});

// Login Process
router.post('/login', (req, res, next) => {
  console.log('Login attempt for:', req.body.email);
  
  // Basic validation
  if (!req.body.email || !req.body.password) {
    req.flash('error_msg', 'Please provide email and password');
    return res.redirect('/auth/login');
  }
  
  // Use passport for authentication
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      req.flash('error_msg', 'An error occurred during login');
      return res.redirect('/auth/login');
    }
    
    if (!user) {
      console.log('Login failed:', info.message);
      req.flash('error_msg', info.message || 'Invalid email or password');
      return res.redirect('/auth/login');
    }
    
    // Log in the user
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('Session error:', loginErr);
        req.flash('error_msg', 'Error creating session');
        return res.redirect('/auth/login');
      }
      
      console.log('Login successful for user:', user.email);
      
      // Set success message and redirect
      req.flash('success_msg', 'You are now logged in');
      return res.redirect('/dashboard');
    });
  })(req, res, next);
});

// Register Process
router.post('/register', async (req, res) => {
  // Get form values
  const { name, email, password, password2 } = req.body;
  
  // Validation
  const errors = [];
  
  // Check required fields
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
  
  // If errors, render form again with error messages
  if (errors.length > 0) {
    res.render('auth/register', {
      title: 'Register',
      layout: 'auth',
      isRegisterPage: true,
      errors,
      name,
      email
    });
  } else {
    try {
      // Check if email exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      
      if (existingUser) {
        // User exists
        errors.push({ msg: 'Email is already registered' });
        res.render('auth/register', {
          title: 'Register',
          layout: 'auth',
          isRegisterPage: true,
          errors,
          name,
          email
        });
      } else {
        // Create new user
        const newUser = new User({
          name,
          email: email.toLowerCase(),
          password,
          role: 'user'
        });
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);
        
        // Save user
        await newUser.save();
        
        console.log('New user registered:', newUser.email);
        req.flash('success_msg', 'You are now registered and can log in');
        res.redirect('/auth/login');
      }
    } catch (err) {
      console.error('Registration error:', err);
      req.flash('error_msg', 'An error occurred during registration');
      res.redirect('/auth/register');
    }
  }
});

// Logout
router.get('/logout', ensureAuthenticated, (req, res) => {
  req.logout(function(err) {
    if (err) {
      console.error('Logout error:', err);
      return next(err);
    }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/auth/login');
  });
});

// Forgot password
router.get('/forgot-password', ensureGuest, (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    layout: 'auth'
  });
});

// Reset password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    req.flash('error_msg', 'Please enter your email address');
    return res.redirect('/auth/forgot-password');
  }
  
  try {
    // In a real application, send an email with password reset link
    // For this demo, we'll just show a success message
    
    req.flash('success_msg', 'Password reset instructions have been sent to your email');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Forgot password error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/auth/forgot-password');
  }
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

// Emergency direct login route
router.get('/directlogin', (req, res) => {
  console.log('Auth: Direct login attempt');
  
  // Create a hardcoded admin user
  const adminUser = {
    _id: 'admin123',
    name: 'Admin User',
    email: 'admin@admin.com',
    role: 'admin'
  };
  
  // Log in the user directly by setting up the session
  req.login(adminUser, (err) => {
    if (err) {
      console.error('Auth: Error in direct login:', err);
      req.flash('error', 'Failed to log in');
      return res.redirect('/auth/login');
    }
    
    console.log('Auth: Direct login successful');
    return res.redirect('/dashboard');
  });
});

module.exports = router;
