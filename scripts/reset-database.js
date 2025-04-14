/**
 * Database Reset Script
 * This script will clear and initialize the MongoDB database with default data
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/User');
const License = require('../models/License');
const System = require('../models/System');
const Vendor = require('../models/Vendor');

// MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/licener');
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// Clear all collections
async function clearDatabase() {
  console.log('Clearing database collections...');

  try {
    await User.deleteMany({});
    console.log('Users collection cleared');

    await License.deleteMany({});
    console.log('Licenses collection cleared');

    await System.deleteMany({});
    console.log('Systems collection cleared');

    await Vendor.deleteMany({});
    console.log('Vendors collection cleared');

    console.log('All collections cleared successfully');
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exit(1);
  }
}

// Create default admin user
async function createAdminUser() {
  console.log('Creating default admin user...');

  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@admin.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await adminUser.save();
    console.log('Admin user created successfully:', adminUser._id);

    return adminUser;
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
}

// Create default vendors
async function createDefaultVendors() {
  console.log('Creating default vendors...');

  try {
    const vendors = [
      {
        name: 'Microsoft',
        description: 'Microsoft Corporation is an American multinational technology company.',
        website: 'https://www.microsoft.com',
        contactName: 'Microsoft Sales',
        contactEmail: 'sales@microsoft.com',
        contactPhone: '1-800-MICROSOFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Adobe',
        description: 'Adobe Inc. is an American multinational computer software company.',
        website: 'https://www.adobe.com',
        contactName: 'Adobe Sales',
        contactEmail: 'sales@adobe.com',
        contactPhone: '1-800-ADOBE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Oracle',
        description:
          'Oracle Corporation is an American multinational computer technology corporation.',
        website: 'https://www.oracle.com',
        contactName: 'Oracle Sales',
        contactEmail: 'sales@oracle.com',
        contactPhone: '1-800-ORACLE-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const createdVendors = await Vendor.insertMany(vendors);
    console.log(`${createdVendors.length} vendors created successfully`);

    return createdVendors;
  } catch (err) {
    console.error('Error creating vendors:', err);
    process.exit(1);
  }
}

// Create default systems
async function createDefaultSystems(adminId) {
  console.log('Creating default systems...');

  try {
    const systems = [
      {
        name: 'Development Server',
        description: 'Main development server for R&D team',
        systemType: 'server',
        environment: 'development',
        status: 'active',
        os: 'Linux',
        ip: '192.168.1.100',
        hostname: 'dev-server-01',
        location: 'On-premise',
        department: 'IT',
        managedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Production Web Server',
        description: 'Production web server hosting company website',
        systemType: 'server',
        environment: 'production',
        status: 'active',
        os: 'Linux',
        ip: '192.168.1.101',
        hostname: 'prod-web-01',
        location: 'On-premise',
        department: 'IT',
        managedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Design Department Workstation',
        description: 'Workstation for design department',
        systemType: 'workstation',
        environment: 'production',
        status: 'active',
        os: 'Windows 11',
        ip: '192.168.1.120',
        hostname: 'design-ws-01',
        location: 'Office',
        department: 'Design',
        managedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const createdSystems = await System.insertMany(systems);
    console.log(`${createdSystems.length} systems created successfully`);

    return createdSystems;
  } catch (err) {
    console.error('Error creating systems:', err);
    process.exit(1);
  }
}

// Create default licenses
async function createDefaultLicenses(adminId, systems, vendors) {
  console.log('Creating default licenses...');

  try {
    const now = new Date();

    const licenses = [
      {
        name: 'Microsoft Office 365',
        product: 'Office 365',
        vendor: vendors[0].name, // Microsoft
        licenseKey: 'MS-OFFICE-365-XXXX-XXXX',
        purchaseDate: new Date(now.getFullYear(), now.getMonth() - 2, 15),
        expiryDate: new Date(now.getFullYear() + 1, now.getMonth() - 2, 15),
        totalSeats: 10,
        usedSeats: 5,
        utilization: 50,
        cost: 999.99,
        currency: 'USD',
        notes: 'Enterprise agreement',
        status: 'active',
        assignedSystems: [systems[2]._id], // Design workstation
        owner: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Adobe Creative Cloud',
        product: 'Creative Cloud',
        vendor: vendors[1].name, // Adobe
        licenseKey: 'ADOBE-CC-XXXX-XXXX',
        purchaseDate: new Date(now.getFullYear(), now.getMonth() - 3, 10),
        expiryDate: new Date(now.getFullYear(), now.getMonth() + 1, 10), // About to expire
        totalSeats: 5,
        usedSeats: 3,
        utilization: 60,
        cost: 1299.99,
        currency: 'USD',
        notes: 'Design team license',
        status: 'active',
        assignedSystems: [systems[2]._id], // Design workstation
        owner: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Oracle Database Enterprise',
        product: 'Database Enterprise',
        vendor: vendors[2].name, // Oracle
        licenseKey: 'ORACLE-DB-XXXX-XXXX',
        purchaseDate: new Date(now.getFullYear(), now.getMonth() - 5, 20),
        expiryDate: new Date(now.getFullYear() + 2, now.getMonth() - 5, 20),
        totalSeats: 2,
        usedSeats: 2,
        utilization: 100,
        cost: 4999.99,
        currency: 'USD',
        notes: 'Production database',
        status: 'active',
        assignedSystems: [systems[0]._id, systems[1]._id], // Dev and Prod servers
        owner: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const createdLicenses = await License.insertMany(licenses);
    console.log(`${createdLicenses.length} licenses created successfully`);

    // Update systems with license requirements
    for (const license of createdLicenses) {
      if (license.assignedSystems && license.assignedSystems.length > 0) {
        for (const systemId of license.assignedSystems) {
          await System.findByIdAndUpdate(systemId, {
            $push: {
              licenseRequirements: {
                licenseType: license.product,
                quantity: 1,
                licenseId: license._id,
              },
            },
          });
        }
      }
    }

    return createdLicenses;
  } catch (err) {
    console.error('Error creating licenses:', err);
    process.exit(1);
  }
}

// Main function
async function resetDatabase() {
  console.log('Starting database reset...');

  try {
    // Connect to MongoDB
    await connectDB();

    // Clear database
    await clearDatabase();

    // Create default data
    const adminUser = await createAdminUser();
    const vendors = await createDefaultVendors();
    const systems = await createDefaultSystems(adminUser._id);
    const licenses = await createDefaultLicenses(adminUser._id, systems, vendors);

    console.log('Database reset completed successfully!');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Database reset failed:', err);
    process.exit(1);
  }
}

// Run the script
resetDatabase();
