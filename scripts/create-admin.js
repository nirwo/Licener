/**
 * Script to create default admin user
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const connectDB = require('../config/database');

// Load environment variables
dotenv.config();

// Import User model
const User = require('../models/User');

async function createAdmin() {
  console.log('Creating default admin user...');
  
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB successfully!');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@admin.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists, skipping creation.');
      process.exit(0);
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin', salt);
    
    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@admin.com',
      password: hashedPassword,
      role: 'admin'
    });
    
    await adminUser.save();
    
    console.log('Admin user created successfully!');
    console.log('Email: admin@admin.com');
    console.log('Password: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }
}

// Run the script
createAdmin(); 