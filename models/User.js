/**
 * User Model
 * File-based implementation using LowDB
 */
const { User: FileDBUser } = require('../utils/file-db');
const bcrypt = require('bcryptjs');

// This is a wrapper around the file DB to maintain API compatibility
const User = {
  ...FileDBUser,
  
  // Special method for user creation with password hashing
  register: async (userData) => {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // Create user with hashed password
    return FileDBUser.create({
      ...userData,
      password: hashedPassword
    });
  },
  
  // Method to check password
  authenticate: async (email, password) => {
    // Find user by email
    const user = FileDBUser.find({ email })[0];
    
    if (!user) {
      return null;
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    return isMatch ? user : null;
  }
};

module.exports = User;