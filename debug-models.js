/**
 * Debug script to analyze model loading issues
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

console.log('=== Starting Model Debugging ===');

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    return false;
  }
};

// Check for database files
const checkFileDB = () => {
  console.log('Checking file database...');
  const dataDir = path.join(__dirname, 'data');

  if (!fs.existsSync(dataDir)) {
    console.log('Data directory does not exist, creating it...');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbFile = path.join(dataDir, 'db.json');
  if (!fs.existsSync(dbFile)) {
    console.log('DB file does not exist, creating it...');
    const initialData = {
      users: [],
      subscriptions: [],
      systems: [],
      vendors: [],
    };
    fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2));
  } else {
    console.log('DB file exists:', dbFile);
    try {
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      console.log('DB data structure:', Object.keys(data));
      console.log('Subscription count:', (data.subscriptions || []).length);
    } catch (err) {
      console.error('Error reading DB file:', err.message);
    }
  }
};

// Load models and check functionality
const checkModels = async () => {
  try {
    console.log('Checking models...');

    // Load User model
    console.log('--- Loading User model ---');
    const User = require('./models/User');
    console.log('User model type:', typeof User);
    console.log('User model schema?', !!User.schema);

    // Load System model
    console.log('--- Loading System model ---');
    const SystemModule = require('./models/System');
    console.log('System module type:', typeof SystemModule);
    console.log('System property exists?', !!SystemModule.System);
    const System = SystemModule.System;
    console.log('System model type:', typeof System);
    console.log('System model schema?', !!System.schema);

    // Load Vendor model
    console.log('--- Loading Vendor model ---');
    const Vendor = require('./models/Vendor');
    console.log('Vendor model type:', typeof Vendor);
    console.log('Vendor model schema?', !!Vendor.schema);

    // Load Subscription model
    console.log('--- Loading Subscription model ---');
    const Subscription = require('./models/Subscription');
    console.log('Subscription model type:', typeof Subscription);
    console.log('Subscription methods:', Object.keys(Subscription));
    console.log('Subscription populate exists?', !!Subscription.populate);
    console.log('Subscription findByManager exists?', !!Subscription.findByManager);

    // Load FileDB models
    console.log('--- Loading FileDB models ---');
    const FileDB = require('./utils/file-db');
    console.log('FileDB type:', typeof FileDB);
    console.log('FileDB exports:', Object.keys(FileDB));
    console.log('FileDBSubscription exists?', !!FileDB.FileDBSubscription);

    // Check FileDBSubscription methods
    if (FileDB.FileDBSubscription) {
      console.log(
        'FileDBSubscription methods:',
        Object.getOwnPropertyNames(FileDB.FileDBSubscription)
      );
      console.log(
        'FileDBSubscription create method type:',
        typeof FileDB.FileDBSubscription.create
      );
    }

    return true;
  } catch (err) {
    console.error('Error checking models:', err);
    return false;
  }
};

// Test basic operations
const testOperations = async () => {
  try {
    console.log('Testing basic operations...');

    // Test Subscription.find
    console.log('--- Testing Subscription.find ---');
    const Subscription = require('./models/Subscription');
    const subscriptions = await Subscription.find({}).limit(5);
    console.log('Found subscriptions:', subscriptions.length);

    // Test System.find
    console.log('--- Testing System.find ---');
    const SystemModule = require('./models/System');
    const System = SystemModule.System;
    const systems = await System.find({}).limit(5);
    console.log('Found systems:', systems.length);

    return true;
  } catch (err) {
    console.error('Error testing operations:', err);
    return false;
  }
};

// Run diagnostic tasks
const runDiagnostics = async () => {
  // Check file database
  checkFileDB();

  // Connect to MongoDB
  const isConnected = await connectDB();

  // Check models
  const modelsOk = await checkModels();

  // If models are ok, test operations
  let operationsOk = false;
  if (modelsOk) {
    operationsOk = await testOperations();
  }

  console.log('=== Diagnostics Summary ===');
  console.log('MongoDB Connected:', isConnected);
  console.log('Models OK:', modelsOk);
  console.log('Operations OK:', operationsOk);

  // Disconnect from MongoDB
  if (isConnected) {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the diagnostics
runDiagnostics()
  .then(() => {
    console.log('=== Diagnostic Complete ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Diagnostic failed:', err);
    process.exit(1);
  });
