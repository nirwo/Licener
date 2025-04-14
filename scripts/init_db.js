/**
 * MongoDB initialization script for Licener
 * This script creates an admin user and sample data for testing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const System = require('../models/System');
const License = require('../models/License');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// DB Config
const db = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/licener';

// Connect to MongoDB
mongoose
  .connect(db, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  })
  .then(async () => {
    console.log('MongoDB Connected');

    try {
      // Clear existing data
      await User.deleteMany({});
      await System.deleteMany({});
      await License.deleteMany({});

      // Create admin user
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'admin',
        company: 'Licener',
        department: 'IT',
        createdAt: new Date(),
        lastLogin: null,
      });

      await adminUser.save();

      // Create regular user
      const regularUser = new User({
        name: 'Regular User',
        email: 'user@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'user',
        company: 'Test Company',
        department: 'Sales',
        createdAt: new Date(),
        lastLogin: null,
      });

      await regularUser.save();

      // Create sample systems
      const systems = [
        {
          name: 'Production Server A',
          type: 'physical',
          os: 'Linux',
          osVersion: 'Ubuntu 20.04 LTS',
          location: 'Data Center A',
          ip: '192.168.1.10',
          department: 'Operations',
          managedBy: adminUser._id,
          installedSoftware: [
            {
              name: 'MySQL',
              version: '8.0.27',
              installDate: new Date('2023-01-15'),
            },
            {
              name: 'Node.js',
              version: '16.13.0',
              installDate: new Date('2023-01-15'),
            },
            {
              name: 'Nginx',
              version: '1.18.0',
              installDate: new Date('2023-01-15'),
            },
          ],
          notes: 'Critical system, requires immediate attention for any issues',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Development VM 1',
          type: 'virtual',
          os: 'Windows',
          osVersion: 'Windows Server 2019',
          location: 'Cloud',
          ip: '192.168.2.15',
          department: 'Development',
          managedBy: regularUser._id,
          installedSoftware: [
            {
              name: 'Visual Studio Code',
              version: '1.63.2',
              installDate: new Date('2023-02-10'),
            },
            {
              name: 'Node.js',
              version: '16.13.0',
              installDate: new Date('2023-02-10'),
            },
            {
              name: 'Git',
              version: '2.34.1',
              installDate: new Date('2023-02-10'),
            },
          ],
          notes: 'Used for development purposes only',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Test Environment',
          type: 'cloud',
          os: 'Linux',
          osVersion: 'CentOS 8',
          location: 'AWS',
          ip: '10.0.1.5',
          department: 'QA',
          managedBy: regularUser._id,
          notes: 'Testing environment for QA team',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await System.insertMany(systems);

      // Create sample licenses
      const licenses = [
        {
          name: 'Microsoft 365 Business',
          product: 'Microsoft 365',
          licenseKey: 'XXXX-XXXX-XXXX-XXXX-1234',
          purchaseDate: new Date('2023-01-01'),
          expiryDate: new Date('2024-01-01'),
          totalSeats: 10,
          usedSeats: 8,
          cost: 1200,
          currency: 'USD',
          vendor: 'Microsoft',
          owner: adminUser._id,
          notes: 'Annual subscription, auto-renewal enabled',
          attachments: [],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Adobe Creative Cloud',
          product: 'Creative Cloud',
          licenseKey: 'ADBE-XXXX-XXXX-XXXX-5678',
          purchaseDate: new Date('2023-02-15'),
          expiryDate: new Date('2024-02-15'),
          totalSeats: 5,
          usedSeats: 5,
          cost: 3000,
          currency: 'USD',
          vendor: 'Adobe',
          owner: regularUser._id,
          notes: 'Design team licenses',
          attachments: [],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'SQL Server Enterprise',
          product: 'SQL Server',
          licenseKey: 'MSSQL-XXXX-XXXX-XXXX-9012',
          purchaseDate: new Date('2023-03-10'),
          expiryDate: new Date('2024-03-10'),
          totalSeats: 2,
          usedSeats: 1,
          cost: 7000,
          currency: 'USD',
          vendor: 'Microsoft',
          owner: adminUser._id,
          notes: 'Database server license',
          attachments: [],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Antivirus Enterprise',
          product: 'Security Suite Pro',
          licenseKey: 'AVPRO-XXXX-XXXX-XXXX-5432',
          purchaseDate: new Date('2022-09-15'),
          expiryDate: new Date('2023-01-01'), // Expired
          totalSeats: 100,
          usedSeats: 95,
          cost: 3599.99,
          currency: 'USD',
          vendor: 'Symantec',
          owner: regularUser._id,
          notes: 'Company-wide antivirus solution - EXPIRED',
          attachments: [],
          status: 'expired',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Development IDE License',
          product: 'IntelliJ IDEA',
          licenseKey: 'IDEA-XXXX-XXXX-XXXX-7890',
          purchaseDate: new Date('2023-01-15'),
          expiryDate: new Date('2024-01-15'),
          totalSeats: 10,
          usedSeats: 8,
          cost: 499.99,
          currency: 'USD',
          vendor: 'JetBrains',
          owner: regularUser._id,
          notes: 'Enterprise subscription for development team',
          attachments: [],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await License.insertMany(licenses);

      console.log('Database initialization completed successfully!');
      console.log('You can now log in with the following credentials:');
      console.log('Admin User: admin@example.com / password123');
      console.log('Regular User: user@example.com / password123');

      process.exit(0);
    } catch (err) {
      console.error('Error initializing database:', err);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
