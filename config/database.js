const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory at ${dataDir}`);
}

// MongoDB connection with error logging
const connectDB = async () => {
  try {
    // Set the MongoDB connection string from environment variable with a fallback
    const db = process.env.MONGO_URI || 'mongodb://localhost:27017/licener';
    
    console.log('Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Ensure indexes are created properly
    await createIndexes();
    
    return conn;
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    
    // Check if MongoDB is running
    console.log('Could not connect to MongoDB. Make sure MongoDB is running or use file-based storage.');
    
    // Initialize file-based database as fallback
    initializeFileDB();
    
    // Return false to indicate connection failure
    return false;
  }
};

// Initialize file-based database with required collections
const initializeFileDB = () => {
  const collections = ['users', 'subscriptions', 'systems', 'vendors', 'licenses'];
  
  console.log('Initializing file-based database...');
  
  collections.forEach(collection => {
    const filePath = path.join(dataDir, `${collection}.json`);
    
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({ data: [] }, null, 2));
      console.log(`Created ${collection}.json file`);
    }
  });
  
  console.log('File-based database initialized successfully');
};

// Check database connection status
const checkConnection = () => {
  return {
    isConnected: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    stateDescription: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  };
};

// Create indexes for better performance
async function createIndexes() {
  try {
    // Get all models
    const models = mongoose.connection.models;
    
    // For User model, create indexes on email and role
    if (models.User) {
      await models.User.collection.createIndex({ email: 1 }, { unique: true });
      await models.User.collection.createIndex({ role: 1 });
    }
    
    // For License model, create indexes
    if (models.License) {
      await models.License.collection.createIndex({ owner: 1 });
      await models.License.collection.createIndex({ vendor: 1 });
      await models.License.collection.createIndex({ expiryDate: 1 });
      await models.License.collection.createIndex({ status: 1 });
    }
    
    // For System model, create indexes
    if (models.System) {
      await models.System.collection.createIndex({ managedBy: 1 });
      await models.System.collection.createIndex({ status: 1 });
    }
    
    // For Vendor model, create index on name
    if (models.Vendor) {
      await models.Vendor.collection.createIndex({ name: 1 }, { unique: true });
    }
    
    console.log('Database indexes created successfully');
  } catch (err) {
    console.error('Error creating database indexes:', err);
    // Don't exit process here, just log the error
  }
}

module.exports = { connectDB, checkConnection, initializeFileDB }; 