const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { ensureAuthenticated, ensureAdmin, forwardAuthenticated } = require('../middleware/auth');
const User = require('../models/User');

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => {
  res.render('users/login', {
    title: 'Login'
  });
});

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => {
  res.render('users/register', {
    title: 'Register'
  });
});

// Register Handle
router.post('/register', async (req, res) => {
  const { name, email, password, password2, company, department } = req.body;
  let errors = [];

  // Check required fields
  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please fill in all required fields' });
  }

  // Check passwords match
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  // Check password length
  if (password.length < 8) {
    errors.push({ msg: 'Password should be at least 8 characters' });
  }

  if (errors.length > 0) {
    return res.render('users/register', {
      title: 'Register',
      errors,
      name,
      email,
      company,
      department
    });
  }

  try {
    // Check if user exists in file-based database
    const existingUsers = User.find({ email });
    
    if (existingUsers && existingUsers.length > 0) {
      errors.push({ msg: 'Email is already registered' });
      return res.render('users/register', {
        title: 'Register',
        errors,
        name,
        email,
        company,
        department
      });
    }
    
    // Create new user with file-based database
    await User.create({
      name,
      email,
      password: await bcrypt.hash(password, await bcrypt.genSalt(10)),
      company,
      department,
      role: 'user' // Explicitly set default role
    });
    
    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/users/login');
  } catch (err) {
    console.error('Registration error:', err);
    req.flash('error_msg', 'An error occurred during registration');
    res.render('users/register', {
      title: 'Register',
      errors: [{ msg: 'Registration failed. Please try again.' }],
      name,
      email,
      company,
      department
    });
  }
});

// Login Handle
router.post('/login', (req, res, next) => {
  // For debugging
  console.log('Login attempt with:', { email: req.body.email });
  
  // Validate request data
  if (!req.body.email || !req.body.password) {
    console.log('Login attempt with missing credentials');
    req.flash('error_msg', 'Please provide both email and password');
    return res.redirect('/users/login');
  }
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      req.flash('error_msg', 'An internal error occurred during login');
      return res.redirect('/users/login');
    }
    
    if (!user) {
      console.log('Authentication failed:', info?.message || 'Unknown reason');
      req.flash('error_msg', info?.message || 'Invalid email or password');
      return res.redirect('/users/login');
    }
    
    // Verify user object has required fields
    if (!user._id) {
      console.error('User object is missing required _id field:', user);
      req.flash('error_msg', 'Invalid user account. Please contact support.');
      return res.redirect('/users/login');
    }
    
    // Add id property if missing (for backward compatibility)
    if (!user.id && user._id) {
      user.id = user._id.toString();
    }
    
    req.logIn(user, (err) => {
      if (err) {
        console.error('Session error:', err);
        req.flash('error_msg', 'Failed to create login session');
        return res.redirect('/users/login');
      }
      
      // Add extra logging for successful login
      console.log('User logged in successfully:', {
        id: user.id || user._id, 
        email: user.email,
        name: user.name,
        role: user.role
      });
      
      req.flash('success_msg', 'Welcome! You have successfully logged in.');
      return res.redirect('/dashboard');
    });
  })(req, res, next);
});

// Logout Handle
router.get('/logout', ensureAuthenticated, (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
  });
});

// User Profile
router.get('/profile', ensureAuthenticated, (req, res) => {
  res.render('users/profile', {
    title: 'My Profile',
    user: req.user
  });
});

// Update Profile
router.put('/profile', ensureAuthenticated, async (req, res) => {
  const { name, company, department } = req.body;
  
  try {
    // Update user with file-based approach
    await User.findByIdAndUpdate(req.user.id, {
      name,
      company,
      department
    });
    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/users/profile');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating profile');
    res.redirect('/users/profile');
  }
});

// Change Password
router.put('/change-password', ensureAuthenticated, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  
  if (newPassword !== confirmPassword) {
    req.flash('error_msg', 'New passwords do not match');
    return res.redirect('/users/profile');
  }
  
  try {
    const user = User.findById(req.user.id);
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/users/profile');
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/users/profile');
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    
    // Update user with new password
    await User.findByIdAndUpdate(req.user.id, {
      password: hash
    });
    
    req.flash('success_msg', 'Password updated successfully');
    res.redirect('/users/profile');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating password');
    res.redirect('/users/profile');
  }
});

// Admin: User Management
router.get('/manage', ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    
    res.render('users/manage', {
      title: 'User Management',
      users
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading users');
    res.redirect('/dashboard');
  }
});

// Admin: Edit User
router.get('/edit/:id', ensureAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/users/manage');
    }
    
    res.render('users/edit', {
      title: 'Edit User',
      user
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading user');
    res.redirect('/users/manage');
  }
});

// Admin: Update User
router.put('/:id', ensureAdmin, async (req, res) => {
  try {
    const { name, email, role, company, department } = req.body;
    
    await User.findByIdAndUpdate(req.params.id, {
      name,
      email,
      role,
      company,
      department
    });
    
    req.flash('success_msg', 'User updated successfully');
    res.redirect('/users/manage');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating user');
    res.redirect('/users/manage');
  }
});

// Admin: Delete User
router.delete('/:id', ensureAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    
    req.flash('success_msg', 'User deleted successfully');
    res.redirect('/users/manage');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error deleting user');
    res.redirect('/users/manage');
  }
});

module.exports = router;