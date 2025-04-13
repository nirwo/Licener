/**
 * File-based Database Adapter
 * This adapter provides backward compatibility with the file-based database
 * but all operations actually use MongoDB models
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { join } = require('path');
const mongoose = require('mongoose');

// Import Lowdb with the correct syntax for the newer version
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

// Define path to data directory
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Define path to database file
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Initialize empty database structure if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    users: [],
    subscriptions: [],
    systems: [],
    vendors: []
  };
  
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  console.log(`Created empty database file at ${DB_FILE}`);
}

// Initialize lowdb with JSONFile adapter
const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter);

// Read data from JSON file
(async () => {
  await db.read();
  
  // Initialize with empty data if db.data is null
  db.data ||= {
    users: [],
    subscriptions: [],
    systems: [],
    vendors: []
  };
  
  await db.write();
})().catch(err => console.error('Error initializing database:', err));

// Global flag to indicate if we've loaded MongoDB models
let hasLoadedModels = false;
// Variables to hold MongoDB models (loaded lazily to avoid circular references)
let UserModel, SubscriptionModel, SystemModel, VendorModel;

// Function to load MongoDB models when needed
const loadMongoDBModels = () => {
  if (hasLoadedModels) return;
  
  try {
    UserModel = require('../models/User');
    // Dynamically load SubscriptionModel when needed to avoid circular dependencies
    SubscriptionModel = getSubscriptionModel();
    SystemModel = require('../models/System');
    VendorModel = require('../models/Vendor');
    hasLoadedModels = true;
    console.log('[FileDB] Successfully loaded MongoDB models');
  } catch (err) {
    console.warn('[FileDB] Could not load MongoDB models:', err.message);
  }
};

function getSubscriptionModel() {
  try {
    return mongoose.model('Subscription');
  } catch (e) {
    // If not already defined, load it
    try {
      return require('../models/Subscription');
    } catch (err) {
      console.error('Error loading Subscription model:', err);
      return null;
    }
  }
}

/**
 * Base model class for file-based data operations
 * All operations forward to MongoDB models if available
 */
class BaseModel {
  constructor(collection) {
    this.collection = collection;
    this.mongoModel = null;
  }
  
  // Lazy load the appropriate MongoDB model when needed
  getMongoModel() {
    if (!hasLoadedModels) {
      loadMongoDBModels();
    }
    
    // Set MongoDB model based on collection name
    switch (this.collection) {
      case 'users':
        return UserModel;
      case 'subscriptions':
        return SubscriptionModel;
      case 'systems':
        return SystemModel;
      case 'vendors':
        return VendorModel;
      default:
        return null;
    }
  }
  
  // Create a new item
  async create(data) {
    try {
      console.log(`[FileDB] Creating ${this.collection} item:`, data);
      
      // If MongoDB model is available, use it
      const mongoModel = this.getMongoModel();
      if (mongoModel) {
        // Create document using MongoDB model
        const newDoc = new mongoModel(data);
        const result = await newDoc.save();
        console.log(`[FileDB] Created ${this.collection} item with MongoDB (ID: ${result._id})`);
        return result;
      }
      
      // Fallback to file-based DB with new lowdb API
      // Ensure the db is read first
      await db.read();
      
      // Ensure the collection exists
      if (!db.data[this.collection]) {
        db.data[this.collection] = [];
      }
      
      // Add ID if not present
      if (!data._id) {
        data._id = uuidv4();
      }
      
      // Add timestamps if not present
      if (!data.createdAt) {
        data.createdAt = new Date();
      }
      if (!data.updatedAt) {
        data.updatedAt = new Date();
      }
      
      // Add item to collection
      db.data[this.collection].push(data);
      
      // Write updated data back to file
      await db.write();
      
      console.log(`[FileDB] Created ${this.collection} item with file DB (ID: ${data._id})`);
      return data;
    } catch (err) {
      console.error(`[FileDB] Error creating ${this.collection} item:`, err);
      throw err;
    }
  }
  
  // Find items matching a query
  async find(query = {}) {
    try {
      // If MongoDB model is available, use it
      const mongoModel = this.getMongoModel();
      if (mongoModel) {
        // Directly call the mongoose method to avoid recursion
        // Check if it's a circular self-reference
        if (mongoModel.modelName === 'Subscription' && this.collection === 'subscriptions') {
          console.log('[FileDB] Detected potential circular reference in Subscription.find, using direct MongoDB query');
          // Use direct MongoDB query to avoid recursion
          return await mongoose.connection.db.collection('subscriptions').find(query).toArray();
        }
        
        const results = await mongoModel.find(query);
        return results;
      }
      
      // Fallback to file-based DB with new lowdb API
      // Ensure the db is read first
      await db.read();
      
      // Ensure the collection exists
      if (!db.data[this.collection]) {
        return [];
      }
      
      // Filter items based on query
      const results = db.data[this.collection].filter(item => {
        return Object.keys(query).every(key => {
          if (query[key] === undefined) return true;
          return item[key] === query[key];
        });
      });
      
      return results;
    } catch (err) {
      console.error(`[FileDB] Error finding ${this.collection} items:`, err);
      throw err;
    }
  }
  
  // Find a single item by ID
  async findById(id) {
    try {
      // If MongoDB model is available, use it
      const mongoModel = this.getMongoModel();
      if (mongoModel) {
        // Avoid circular references in Subscription model
        if (mongoModel.modelName === 'Subscription' && this.collection === 'subscriptions') {
          console.log('[FileDB] Detected potential circular reference in Subscription.findById, using direct MongoDB query');
          // Use direct MongoDB query to avoid recursion
          const result = await mongoose.connection.db.collection('subscriptions').findOne({ _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id });
          return result;
        }
        
        const result = await mongoModel.findById(id);
        return result;
      }
      
      // Fallback to file-based DB with new lowdb API
      // Ensure the db is read first
      await db.read();
      
      // Ensure the collection exists
      if (!db.data[this.collection]) {
        return null;
      }
      
      // Find item by ID
      const item = db.data[this.collection].find(item => item._id === id);
      
      return item || null;
    } catch (err) {
      console.error(`[FileDB] Error finding ${this.collection} item by ID:`, err);
      throw err;
    }
  }
  
  // Find a single item matching a query
  async findOne(query = {}) {
    try {
      // If MongoDB model is available, use it
      const mongoModel = this.getMongoModel();
      if (mongoModel) {
        // Avoid circular references in Subscription model
        if (mongoModel.modelName === 'Subscription' && this.collection === 'subscriptions') {
          console.log('[FileDB] Detected potential circular reference in Subscription.findOne, using direct MongoDB query');
          // Use direct MongoDB query to avoid recursion
          const result = await mongoose.connection.db.collection('subscriptions').findOne(query);
          return result;
        }
        
        const result = await mongoModel.findOne(query);
        return result;
      }
      
      // Fallback to file-based DB with new lowdb API
      // Ensure the db is read first
      await db.read();
      
      // Ensure the collection exists
      if (!db.data[this.collection]) {
        return null;
      }
      
      // Find first item matching query
      const item = db.data[this.collection].find(item => {
        return Object.keys(query).every(key => {
          if (query[key] === undefined) return true;
          return item[key] === query[key];
        });
      });
      
      return item || null;
    } catch (err) {
      console.error(`[FileDB] Error finding ${this.collection} item:`, err);
      throw err;
    }
  }
  
  // Count items matching a query
  async count(query = {}) {
    try {
      // If MongoDB model is available, use it
      const mongoModel = this.getMongoModel();
      if (mongoModel) {
        // Avoid circular references in Subscription model
        if (mongoModel.modelName === 'Subscription' && this.collection === 'subscriptions') {
          console.log('[FileDB] Detected potential circular reference in Subscription.count, using direct MongoDB query');
          // Use direct MongoDB query to avoid recursion
          return await mongoose.connection.db.collection('subscriptions').countDocuments(query);
        }
        
        const count = await mongoModel.countDocuments(query);
        return count;
      }
      
      // Fallback to file-based DB with new lowdb API
      // We need to implement this differently to avoid recursion
      await db.read();
      
      // Ensure the collection exists
      if (!db.data[this.collection]) {
        return 0;
      }
      
      // Filter items based on query
      const results = db.data[this.collection].filter(item => {
        return Object.keys(query).every(key => {
          if (query[key] === undefined) return true;
          return item[key] === query[key];
        });
      });
      
      return results.length;
    } catch (err) {
      console.error(`[FileDB] Error counting ${this.collection} items:`, err);
      throw err;
    }
  }
}

// Define Subscription class with extended functionality
class Subscription extends BaseModel {
  constructor() {
    super('subscriptions');
  }

  findByManager(managerId) {
    return this.find({ owner: managerId });
  }
  
  async createDemo(userId) {
    try {
      // Create demo subscription
      const demoSubscription = {
        name: 'Demo Subscription',
        product: 'Demo Product',
        vendor: 'Demo Vendor',
        type: 'Subscription',
        seats: 10,
        cost: 999.99,
        renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        purchaseDate: new Date(),
        notes: 'This is a demo subscription created automatically.',
        user: userId
      };
      
      return await this.create(demoSubscription);
    } catch (err) {
      console.error('[FileDB] Error creating demo subscription:', err);
      throw err;
    }
  }
  
  // Get all data for migration
  async getData() {
    try {
      // Ensure the db is read first with new lowdb API
      await db.read();
      
      // Return subscriptions data or empty array
      return db.data.subscriptions || [];
    } catch (err) {
      console.error('[FileDB] Error getting subscriptions data:', err);
      return [];
    }
  }
}

// Create instances
const FileDBUser = new BaseModel('users');
const FileDBSubscription = new Subscription();
const FileDBSystem = new BaseModel('systems');
const FileDBVendor = new BaseModel('vendors');

// Export instances
module.exports = {
  FileDBUser,
  FileDBSubscription,
  FileDBSystem,
  FileDBVendor
};