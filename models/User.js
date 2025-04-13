/**
 * User Model
 * Mongoose implementation
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define User Schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user'
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update timestamps
UserSchema.pre('save', function(next) {
  // Update the updatedAt field
  this.updatedAt = Date.now();
  next();
});

// Static method to authenticate user
UserSchema.statics.authenticate = async function(email, password) {
  try {
    // Find user by email
    const user = await this.findOne({ email });
    
    // Check if user exists
    if (!user) {
      console.log(`User.authenticate: No user found with email ${email}`);
      return { error: 'Invalid email or password' };
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
      console.log(`User.authenticate: Password match successful for ${email}`);
      
      // Update last login time
      user.lastLogin = new Date();
      await user.save();
      
      return { user };
    } else {
      console.log(`User.authenticate: Password mismatch for ${email}`);
      return { error: 'Invalid email or password' };
    }
  } catch (err) {
    console.error('User.authenticate error:', err);
    return { error: 'Authentication error' };
  }
};

// Method to safely convert user object to JSON
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  
  // Ensure id is available (for backwards compatibility)
  if (!user.id && user._id) {
    user.id = user._id.toString();
  }
  
  return user;
};

// Method to check if user is admin
UserSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Create User model
const User = mongoose.model('User', UserSchema);

module.exports = User;