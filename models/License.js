/**
 * License Model
 * File-based implementation using LowDB
 */
const { License: FileDBLicense } = require('../utils/file-db');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const FileDBSubscription = require('../utils/file-db').FileDBSubscription;

// Define path to data directory
const dataDir = path.join(__dirname, '..', 'data');

// Define database utilities
const db = {
  findByIdAndUpdate: async (collection, id, updates) => {
    try {
      console.log(`UPDATE BY ID: Looking to update _id=${id} in ${collection}`);
      const collectionPath = path.join(dataDir, `${collection}.json`);

      // Make sure the file exists
      if (!fs.existsSync(collectionPath)) {
        console.log(`UPDATE BY ID: Collection file not found for ${collection}`);
        return null;
      }

      // Read the collection data
      const data = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

      // Find the item by ID
      const index = data.data.findIndex(item => item._id === id);

      // If item not found, return null
      if (index === -1) {
        console.log(`UPDATE BY ID: No matching item with _id=${id} in ${collection}`);
        return null;
      }

      console.log(`UPDATE BY ID: Found matching item with _id=${id}`);

      // Get the existing item
      const existingItem = data.data[index];

      // Create updated item by merging existing with updates
      const updatedItem = {
        ...existingItem,
        ...updates,
        updatedAt: new Date(),
      };

      // Replace the old item with the updated one
      data.data[index] = updatedItem;

      // Write the updated data back to the file
      fs.writeFileSync(collectionPath, JSON.stringify(data, null, 2), 'utf8');

      console.log(`UPDATE BY ID: Successfully updated item with _id=${id} in ${collection}`);

      // Return the updated item
      return updatedItem;
    } catch (err) {
      console.error(`Error in findByIdAndUpdate for ${collection}:`, err);
      throw err;
    }
  },
};

// This is a wrapper around the file DB to maintain API compatibility
const License = {
  ...FileDBLicense,

  // Mongoose-like populate functionality
  populate: async (docs, path) => {
    const { System } = require('./System');
    const User = require('./User');

    if (!docs) return null;

    // Handle single document
    if (!Array.isArray(docs)) {
      // Use await to ensure proper async resolution
      return (await License.populate([docs], path))[0];
    }

    // Clone the documents to avoid modifying originals
    const clonedDocs = JSON.parse(JSON.stringify(docs));

    // Process each document
    for (const doc of clonedDocs) {
      if (path === 'assignedSystems') {
        // Populate systems with better error handling
        if (doc.assignedSystems && doc.assignedSystems.length > 0) {
          console.log(
            `License Populate - Populating ${doc.assignedSystems.length} systems for license ${doc._id}`
          );

          // Map to array of promises then await all
          const systemPromises = doc.assignedSystems.map(async systemId => {
            if (!systemId) {
              console.log('License Populate - Skipping null/undefined system ID');
              return null;
            }

            // Ensure we're working with a string ID
            const sysId = systemId.toString();
            console.log(`License Populate - Attempting to find System with ID: ${sysId}`);

            try {
              const system = await System.findById(sysId);
              if (system) {
                return system;
              } else {
                console.log(`License Populate - No system found with ID: ${sysId}`);
                return systemId; // Return original ID if system not found
              }
            } catch (err) {
              console.error(`Error populating system with ID ${sysId}:`, err);
              return systemId; // Return original ID on error
            }
          });

          // Filter out null values after populating
          const populatedSystems = await Promise.all(systemPromises);
          doc.assignedSystems = populatedSystems.filter(system => system !== null);
        } else {
          console.log(`License Populate - No systems to populate for license ${doc._id}`);
          // Initialize as empty array if undefined
          if (!doc.assignedSystems) {
            doc.assignedSystems = [];
          }
        }
      } else if (path === 'owner') {
        // Populate owner with better error handling
        if (doc.owner) {
          // Ensure we're working with a string ID
          const ownerId = doc.owner.toString();
          console.log(`License Populate - Attempting to find User with ID: ${ownerId}`);

          try {
            const owner = await User.findById(ownerId);
            console.log(`License Populate - User.findById result: ${JSON.stringify(owner)}`);

            if (owner) {
              doc.owner = owner;
              // Ensure _id is available as a string
              if (owner._id) {
                // Add id property for backwards compatibility
                doc.owner.id = owner._id.toString();
              }
            } else {
              console.log(`License Populate - No owner found with ID: ${ownerId}`);
            }
          } catch (err) {
            console.error(`Error populating owner with ID ${ownerId}:`, err);
          }
        } else {
          console.log('License Populate - No owner ID to populate');
        }
      }
    }

    return clonedDocs;
  },

  // Update a license by ID with better error handling
  findByIdAndUpdate: async (id, updateData) => {
    console.log(`Updating license with ID: ${id}`);
    console.log('Update data:', JSON.stringify(updateData, null, 2));

    try {
      // Use the fixed db function to update the license
      const result = await db.findByIdAndUpdate('licenses', id, updateData);
      if (!result) {
        console.log(`License with ID ${id} not found for update`);
        return null;
      }
      return result;
    } catch (err) {
      console.error('Error updating license:', err);
      throw new Error(`Failed to update license: ${err.message}`);
    }
  },
};

// Define License Schema
const LicenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  product: {
    type: String,
    required: true,
  },
  vendor: {
    type: String,
    required: true,
  },
  licenseKey: {
    type: String,
    required: true,
  },
  purchaseDate: {
    type: Date,
  },
  expiryDate: {
    type: Date,
  },
  renewalDate: {
    type: Date,
  },
  totalSeats: {
    type: Number,
    default: 1,
  },
  usedSeats: {
    type: Number,
    default: 0,
  },
  utilization: {
    type: Number,
    default: 0,
  },
  cost: {
    type: Number,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'pending', 'renewed'],
    default: 'active',
  },
  attachments: [
    {
      filename: String,
      path: String,
      uploadDate: Date,
    },
  ],
  assignedSystems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'System',
    },
  ],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update 'updatedAt' on save
LicenseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create demo license method
LicenseSchema.statics.createDemo = async function (userId) {
  try {
    console.log(`Starting to create demo license for user ${userId}`);
    // Check if userId is valid
    if (!userId) {
      console.error('Invalid userId provided to createDemo method:', userId);
      throw new Error('Invalid user ID');
    }

    console.log(`Checking for existing demo license for user ${userId}`);
    // Check if demo license already exists for this user
    const existingDemo = await this.findOne({
      name: 'Demo License 1',
      owner: userId,
    });

    if (existingDemo) {
      console.log(`Existing demo license found with ID: ${existingDemo._id}`);
      return existingDemo;
    }

    console.log(`No existing demo license found, creating new one for user ${userId}`);
    // Create new demo license
    const demoLicense = new this({
      name: 'Demo License 1',
      product: 'Demo Product',
      vendor: 'Demo Vendor',
      licenseKey: 'DEMO-XXXX-XXXX-XXXX',
      purchaseDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      totalSeats: 5,
      usedSeats: 2,
      utilization: 40,
      cost: 999.99,
      currency: 'USD',
      notes: 'This is a demo license for testing purposes',
      status: 'active',
      owner: userId,
    });

    console.log('Demo license created, about to save');
    const savedLicense = await demoLicense.save();
    console.log(`Demo license saved successfully with ID: ${savedLicense._id}`);
    return savedLicense;
  } catch (err) {
    console.error('Error creating demo license:', err);
    throw err;
  }
};

// Find by manager method
LicenseSchema.statics.findByManager = function (managerId) {
  return this.find({ owner: managerId });
};

// Create the License model
const LicenseModel = mongoose.model('License', LicenseSchema);

// Subscription Model
const SubscriptionSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  vendor: {
    type: String,
    required: true,
    trim: true,
  },
  product: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['Perpetual', 'Subscription', 'Trial', 'Open Source', 'Other'],
    default: 'Subscription',
  },
  seats: {
    type: Number,
    default: 1,
  },
  cost: {
    type: Number,
    required: true,
  },
  renewalDate: {
    type: Date,
    required: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    trim: true,
  },
  contractUrl: {
    type: String,
    trim: true,
  },
  attachments: [
    {
      name: String,
      url: String,
      uploadDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Pending Renewal', 'Cancelled'],
    default: 'Active',
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  system: {
    type: Schema.Types.ObjectId,
    ref: 'System',
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// Populate with demo data if in development mode
if (process.env.NODE_ENV === 'development') {
  console.log('Populating subscription data for development...');

  const populateSystems = async () => {
    const System = require('./System');
    try {
      const systems = await System.find();
      console.log(`Found ${systems.length} systems to attach to subscriptions`);
      return systems;
    } catch (err) {
      console.error('Error fetching systems:', err);
      return [];
    }
  };

  const populateUsers = async () => {
    const User = require('./User');
    try {
      const users = await User.find();
      console.log(`Found ${users.length} users to attach to subscriptions`);
      return users;
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  };

  const updateSubscriptions = async () => {
    try {
      const systems = await populateSystems();
      const users = await populateUsers();

      if (users.length === 0) {
        console.log('No users found, skipping subscription population');
        return;
      }

      // Get the first user as a default
      const defaultUser = users[0];

      // Create some demo subscriptions
      const demoSubscriptions = FileDBSubscription.getData();

      // Check if we already have subscriptions
      const existingCount = await Subscription.countDocuments();
      if (existingCount > 0) {
        console.log(`Found ${existingCount} existing subscriptions, skipping population`);
        return;
      }

      console.log(`Creating ${demoSubscriptions.length} demo subscriptions...`);

      // Create subscriptions
      for (const subscription of demoSubscriptions) {
        // Assign a random system if available
        let system = null;
        if (systems.length > 0) {
          system = systems[Math.floor(Math.random() * systems.length)]._id;
        }

        // Create the subscription
        await Subscription.create({
          ...subscription,
          user: defaultUser._id,
          system,
        });
      }

      console.log('Demo subscriptions created successfully');
    } catch (err) {
      console.error('Error creating demo subscriptions:', err);
    }
  };

  // Call the function to update subscriptions
  updateSubscriptions();
}

module.exports = Subscription;
