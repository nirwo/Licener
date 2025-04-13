/**
 * System Model
 * File-based implementation using LowDB
 */
const mongoose = require('mongoose');

// Define System Schema
const SystemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  systemType: {
    type: String,
    enum: ['physical', 'virtual', 'cloud', 'other'],
    default: 'other'
  },
  environment: {
    type: String,
    enum: ['production', 'development', 'testing', 'staging'],
    default: 'production'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'decommissioned'],
    default: 'active'
  },
  os: {
    type: String
  },
  ip: {
    type: String
  },
  hostname: {
    type: String
  },
  location: {
    type: String
  },
  department: {
    type: String
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  licenseRequirements: [{
    licenseType: String,
    quantity: {
      type: Number,
      default: 1
    },
    licenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'License'
    }
  }],
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update 'updatedAt' on save
SystemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Find by manager method
SystemSchema.statics.findByManager = function(managerId) {
  return this.find({ manager: managerId });
};

// Create the System model
let MongoSystem;
try {
  // Try to get the existing model first to avoid redefining
  MongoSystem = mongoose.model('System');
} catch (e) {
  // If not found, define it
  MongoSystem = mongoose.model('System', SystemSchema);
}

// Create a comprehensive System object that extends the Mongoose model
const System = {
  // Include all properties from the Mongoose model
  ...MongoSystem,
  
  // Override the find method
  find: async function(query = {}) {
    try {
      return await MongoSystem.find(query);
    } catch (err) {
      console.error('Error in System.find:', err);
      return [];
    }
  },
  
  // Add a create method that wraps the Mongoose model's create
  create: async function(data) {
    try {
      console.log('Creating new system with data:', JSON.stringify({
        name: data.name,
        os: data.os
      }));
      
      // Use direct Mongoose model create method if available
      if (MongoSystem.create) {
        return await MongoSystem.create(data);
      }
      
      // Fallback to creating a new document manually
      const newSystem = new MongoSystem(data);
      return await newSystem.save();
    } catch (err) {
      console.error('Error creating system:', err);
      throw new Error(`Failed to create system: ${err.message}`);
    }
  },
  
  // Other methods
  findById: async function(id) {
    try {
      return await MongoSystem.findById(id);
    } catch (err) {
      console.error('Error in System.findById:', err);
      return null;
    }
  },
  
  findOne: async function(query = {}) {
    try {
      return await MongoSystem.findOne(query);
    } catch (err) {
      console.error('Error in System.findOne:', err);
      return null;
    }
  },
  
  findByManager: async function(managerId) {
    try {
      return await MongoSystem.find({ managedBy: managerId });
    } catch (err) {
      console.error('Error in System.findByManager:', err);
      return [];
    }
  },
  
  // Add populate method
  populate: async function(docs, path) {
    try {
      // If docs is a single document, convert to array
      const docsArray = Array.isArray(docs) ? docs : [docs];
      
      // If using MongoDB, use Mongoose's populate
      if (MongoSystem.populate) {
        return await MongoSystem.populate(docsArray, path);
      }
      
      // For file-db, implement basic population
      if (path === 'managedBy') {
        const User = require('./User');
        for (let doc of docsArray) {
          if (doc.managedBy) {
            doc.managedBy = await User.findById(doc.managedBy);
          }
        }
      } else if (path === 'licenseRequirements.licenseId') {
        const License = require('./License');
        for (let doc of docsArray) {
          if (doc.licenseRequirements) {
            for (let req of doc.licenseRequirements) {
              if (req.licenseId) {
                req.licenseId = await License.findById(req.licenseId);
              }
            }
          }
        }
      }
      
      return docs;
    } catch (err) {
      console.error('Error in System.populate:', err);
      return docs;
    }
  },
  
  // Add distinct method
  distinct: function(field, query = {}) {
    try {
      return MongoSystem.distinct(field, query);
    } catch (err) {
      console.error('Error in System.distinct:', err);
      return [];
    }
  }
};

module.exports = System;