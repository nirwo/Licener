/**
 * Subscription Model (Fixed Version)
 * Resolves circular dependencies and ensures proper file-db compatibility
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const path = require('path');
const fs = require('fs');

// Define Subscription Schema
const SubscriptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  vendor: {
    type: String,
    required: true,
  },
  product: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'Subscription',
  },
  seats: {
    type: Number,
    default: 1,
  },
  cost: {
    type: Number,
  },
  renewalDate: {
    type: Date,
  },
  purchaseDate: {
    type: Date,
  },
  notes: {
    type: String,
  },
  contractUrl: {
    type: String,
  },
  attachments: [
    {
      filename: String,
      path: String,
      uploadDate: Date,
    },
  ],
  tags: [
    {
      type: String,
    },
  ],
  status: {
    type: String,
    enum: ['active', 'expired', 'pending', 'renewed'],
    default: 'active',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  system: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'System',
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

// Create or get MongoDB model
let MongoSubscription;
try {
  // Try to get the existing model first to avoid redefining
  MongoSubscription = mongoose.model('Subscription');
} catch (e) {
  // If not found, define it
  MongoSubscription = mongoose.model('Subscription', SubscriptionSchema);
}

// Dynamic import of FileDBSubscription to avoid circular dependencies
let FileDBSubscription = null;
function getFileDBSubscription() {
  if (!FileDBSubscription) {
    try {
      const fileDb = require('../utils/file-db');
      FileDBSubscription = fileDb.FileDBSubscription;
    } catch (err) {
      console.error('Error importing FileDBSubscription:', err);
      // If file-db can't be loaded, create a minimal implementation
      FileDBSubscription = createMinimalFileDB();
    }
  }
  return FileDBSubscription;
}

// Create a minimal file DB implementation as fallback
function createMinimalFileDB() {
  console.log('Creating minimal FileDB implementation for Subscriptions');

  // Path to data directory and db.json
  const dataDir = path.join(__dirname, '..', 'data');
  const dbPath = path.join(dataDir, 'db.json');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create db.json if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      JSON.stringify(
        {
          subscriptions: [],
          users: [],
          systems: [],
          vendors: [],
        },
        null,
        2
      )
    );
  }

  // Minimal implementation
  return {
    find: async (query = {}) => {
      try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (!data.subscriptions) return [];

        return data.subscriptions.filter(sub => {
          return Object.keys(query).every(key => {
            if (query[key] === undefined) return true;
            return sub[key] === query[key];
          });
        });
      } catch (err) {
        console.error('Error reading subscriptions from file:', err);
        return [];
      }
    },

    findById: async id => {
      try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (!data.subscriptions) return null;

        return data.subscriptions.find(sub => sub._id === id) || null;
      } catch (err) {
        console.error('Error reading subscription by id from file:', err);
        return null;
      }
    },

    findOne: async (query = {}) => {
      try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (!data.subscriptions) return null;

        return (
          data.subscriptions.find(sub => {
            return Object.keys(query).every(key => {
              if (query[key] === undefined) return true;
              return sub[key] === query[key];
            });
          }) || null
        );
      } catch (err) {
        console.error('Error reading subscription from file:', err);
        return null;
      }
    },

    count: async (query = {}) => {
      try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (!data.subscriptions) return 0;

        return data.subscriptions.filter(sub => {
          return Object.keys(query).every(key => {
            if (query[key] === undefined) return true;
            return sub[key] === query[key];
          });
        }).length;
      } catch (err) {
        console.error('Error counting subscriptions in file:', err);
        return 0;
      }
    },

    countDocuments: async (query = {}) => {
      try {
        return await this.count(query);
      } catch (err) {
        console.error('Error counting subscription documents:', err);
        return 0;
      }
    },
  };
}

// Wrapper that combines MongoDB and File-based model
const Subscription = {
  // Attach MongoDB model properties
  ...MongoSubscription,

  // Core MongoDB-compatible methods
  find: async function (query = {}) {
    try {
      return await getFileDBSubscription().find(query);
    } catch (err) {
      console.error('Error in Subscription.find:', err);
      return [];
    }
  },

  findById: async function (id) {
    try {
      return await getFileDBSubscription().findById(id);
    } catch (err) {
      console.error('Error in Subscription.findById:', err);
      return null;
    }
  },

  findOne: async function (query = {}) {
    try {
      return await getFileDBSubscription().findOne(query);
    } catch (err) {
      console.error('Error in Subscription.findOne:', err);
      return null;
    }
  },

  count: async function (query = {}) {
    try {
      return await getFileDBSubscription().count(query);
    } catch (err) {
      console.error('Error in Subscription.count:', err);
      return 0;
    }
  },

  countDocuments: async function (query = {}) {
    try {
      return await getFileDBSubscription().countDocuments(query);
    } catch (err) {
      console.error('Error in Subscription.countDocuments:', err);
      return 0;
    }
  },

  // MongoDB model methods (pass through)
  populate: async function (docs, path) {
    try {
      // Create dummy populate function if FileDBSubscription doesn't have it
      if (!getFileDBSubscription().populate) {
        console.log('Using fallback populate method');
        return docs;
      }

      return await getFileDBSubscription().populate(docs, path);
    } catch (err) {
      console.error('Error in Subscription.populate:', err);
      return docs;
    }
  },

  // Utility methods
  createDemo: async function (userId) {
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
        user: userId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Use FileDBSubscription if available, otherwise create directly in file
      if (getFileDBSubscription().create) {
        return await getFileDBSubscription().create(demoSubscription);
      } else {
        // Manual creation in db.json
        const dbPath = path.join(__dirname, '..', 'data', 'db.json');
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (!data.subscriptions) {
          data.subscriptions = [];
        }

        // Generate ID if not present
        demoSubscription._id = 'demo-' + Date.now();

        data.subscriptions.push(demoSubscription);
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

        return demoSubscription;
      }
    } catch (err) {
      console.error('Error creating demo subscription:', err);
      throw err;
    }
  },
};

module.exports = Subscription;
