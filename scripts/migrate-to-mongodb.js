/**
 * Migration script from file-based database to MongoDB
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/database');

// Load environment variables
dotenv.config();

// Import MongoDB models
const User = require('../models/User');
const License = require('../models/License');
const System = require('../models/System');
const Vendor = require('../models/Vendor');

// File paths
const DB_FILE_PATH = path.join(__dirname, '../data/db.json');

async function migrate() {
  console.log('Starting migration to MongoDB...');

  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB successfully!');

    // Check if file database exists
    if (!fs.existsSync(DB_FILE_PATH)) {
      console.error(`File database not found at: ${DB_FILE_PATH}`);
      process.exit(1);
    }

    // Read file database
    console.log('Reading file database...');
    const dbData = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf8'));

    // Migrate users
    if (dbData.users && dbData.users.length > 0) {
      console.log(`Migrating ${dbData.users.length} users...`);

      for (const user of dbData.users) {
        // Check if user already exists
        const existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          await User.create({
            name: user.name,
            email: user.email,
            password: user.password, // Password is already hashed
            role: user.role,
            createdAt: user.createdAt || new Date(),
            updatedAt: user.updatedAt || new Date(),
          });
          console.log(`Created user: ${user.email}`);
        } else {
          console.log(`User already exists: ${user.email}`);
        }
      }
    }

    // Get all migrated user IDs for reference mapping
    const userMap = {};
    const allUsers = await User.find({});
    for (const user of allUsers) {
      // Map file-db ID to MongoDB ID
      const fileDbUser = dbData.users.find(u => u.email === user.email);
      if (fileDbUser) {
        userMap[fileDbUser._id] = user._id;
      }
    }

    // Migrate vendors
    if (dbData.vendors && dbData.vendors.length > 0) {
      console.log(`Migrating ${dbData.vendors.length} vendors...`);

      for (const vendor of dbData.vendors) {
        // Check if vendor already exists
        const existingVendor = await Vendor.findOne({ name: vendor.name });

        if (!existingVendor) {
          await Vendor.create({
            name: vendor.name,
            description: vendor.description,
            website: vendor.website,
            contactName: vendor.contactName,
            contactEmail: vendor.contactEmail,
            contactPhone: vendor.contactPhone,
            address: vendor.address,
            notes: vendor.notes,
            createdAt: vendor.createdAt || new Date(),
            updatedAt: vendor.updatedAt || new Date(),
          });
          console.log(`Created vendor: ${vendor.name}`);
        } else {
          console.log(`Vendor already exists: ${vendor.name}`);
        }
      }
    }

    // Migrate systems
    const systemMap = {};

    if (dbData.systems && dbData.systems.length > 0) {
      console.log(`Migrating ${dbData.systems.length} systems...`);

      for (const system of dbData.systems) {
        // Check if system already exists
        const existingSystem = await System.findOne({ name: system.name });

        if (!existingSystem) {
          // Map the manager ID if it exists
          const managerId =
            system.manager && userMap[system.manager] ? userMap[system.manager] : null;

          const newSystem = await System.create({
            name: system.name,
            description: system.description,
            systemType: system.systemType || 'other',
            environment: system.environment || 'production',
            status: system.status || 'active',
            os: system.os,
            ip: system.ip,
            hostname: system.hostname,
            location: system.location,
            department: system.department,
            manager: managerId,
            notes: system.notes,
            licenseRequirements: [], // We'll update this after licenses are migrated
            createdAt: system.createdAt || new Date(),
            updatedAt: system.updatedAt || new Date(),
          });

          // Store the mapping for reference
          systemMap[system._id] = newSystem._id;
          console.log(`Created system: ${system.name}`);
        } else {
          systemMap[system._id] = existingSystem._id;
          console.log(`System already exists: ${system.name}`);
        }
      }
    }

    // Migrate licenses
    if (dbData.licenses && dbData.licenses.length > 0) {
      console.log(`Migrating ${dbData.licenses.length} licenses...`);

      for (const license of dbData.licenses) {
        // Check if license already exists
        const existingLicense = await License.findOne({
          name: license.name,
          licenseKey: license.licenseKey,
        });

        if (!existingLicense) {
          // Map the owner ID if it exists
          const ownerId =
            license.owner && userMap[license.owner]
              ? userMap[license.owner]
              : allUsers.length > 0
                ? allUsers[0]._id
                : null;

          // Map assigned systems
          const assignedSystemIds = [];
          if (license.assignedSystems && Array.isArray(license.assignedSystems)) {
            for (const sysId of license.assignedSystems) {
              if (systemMap[sysId]) {
                assignedSystemIds.push(systemMap[sysId]);
              }
            }
          }

          // Ensure vendor is never empty - provide default if missing
          let vendorValue = license.vendor;
          if (!vendorValue || typeof vendorValue !== 'string' || vendorValue.trim() === '') {
            console.log(
              `Empty or invalid vendor detected for license: ${license.name}, setting to "Unknown Vendor"`
            );
            vendorValue = 'Unknown Vendor';
          } else {
            vendorValue = vendorValue.trim();
          }

          try {
            const newLicense = await License.create({
              name: license.name,
              product: license.product || 'Unknown Product',
              vendor: vendorValue,
              licenseKey: license.licenseKey || `UNKNOWN-${Date.now()}`,
              purchaseDate: license.purchaseDate,
              expiryDate: license.expiryDate,
              renewalDate: license.renewalDate,
              totalSeats: license.totalSeats || 1,
              usedSeats: license.usedSeats || 0,
              utilization: license.utilization || 0,
              cost: license.cost,
              currency: license.currency || 'USD',
              notes: license.notes,
              status: license.status || 'active',
              attachments: license.attachments || [],
              assignedSystems: assignedSystemIds,
              owner: ownerId,
              createdAt: license.createdAt || new Date(),
              updatedAt: license.updatedAt || new Date(),
            });

            console.log(`Created license: ${license.name}`);

            // Update license requirements in systems
            if (license.assignedSystems && Array.isArray(license.assignedSystems)) {
              for (const sysId of license.assignedSystems) {
                if (systemMap[sysId]) {
                  await System.findByIdAndUpdate(systemMap[sysId], {
                    $push: {
                      licenseRequirements: {
                        licenseType: license.product || 'Unknown Product',
                        quantity: 1,
                        licenseId: newLicense._id,
                      },
                    },
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Failed to create license ${license.name}:`, error.message);
            // Continue with the next license instead of stopping the entire migration
          }
        } else {
          console.log(`License already exists: ${license.name}`);
        }
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrate();
