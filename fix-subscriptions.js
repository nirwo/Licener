/**
 * Comprehensive Subscription Loading Fix
 * 
 * This script resolves issues with loading subscriptions by:
 * 1. Fixing circular dependencies between models
 * 2. Ensuring the database file structure is correct
 * 3. Creating a demo subscription if needed
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('=== Licener Subscription Fix Utility ===');

/**
 * Fix circular dependencies in model files
 */
function fixCircularDependencies() {
  console.log('\n🔄 Fixing circular dependencies in model files...');
  
  // Fix Subscription.js
  const subscriptionPath = path.join(__dirname, 'models', 'Subscription.js');
  if (fs.existsSync(subscriptionPath)) {
    console.log('  - Updating models/Subscription.js...');
    let content = fs.readFileSync(subscriptionPath, 'utf8');
    
    // Fix the circular dependency by removing direct require of file-db
    // and instead using dynamic require within each method
    const fixedContent = content.replace(
      // Match the problematic import
      /const fileDb = require\('\.\.\/utils\/file-db'\);[\s\S]*?FileDBSubscription = fileDb\.FileDBSubscription;/,
      `// Dynamic import of FileDBSubscription to avoid circular dependencies
let FileDBSubscription = null;
function getFileDBSubscription() {
  if (!FileDBSubscription) {
    try {
      const fileDb = require('../utils/file-db');
      FileDBSubscription = fileDb.FileDBSubscription;
    } catch (err) {
      console.error('Error importing FileDBSubscription:', err);
    }
  }
  return FileDBSubscription;
}`
    );
    
    // Fix the Subscription methods to use dynamic import
    const methodsToFix = ['find', 'findById', 'findOne', 'countDocuments', 'count'];
    let updatedContent = fixedContent;
    
    methodsToFix.forEach(method => {
      const regex = new RegExp(`(async\\s+${method}\\s*\\([^)]*\\)\\s*{[\\s\\S]*?)FileDBSubscription\\.${method}`, 'g');
      updatedContent = updatedContent.replace(regex, `$1getFileDBSubscription().${method}`);
    });
    
    // Write the fixed content back to the file
    fs.writeFileSync(subscriptionPath, updatedContent);
    console.log('  ✅ Updated models/Subscription.js');
  } else {
    console.log('  ⚠️ Could not find models/Subscription.js');
  }
  
  // Fix file-db.js
  const fileDbPath = path.join(__dirname, 'utils', 'file-db.js');
  if (fs.existsSync(fileDbPath)) {
    console.log('  - Updating utils/file-db.js...');
    let content = fs.readFileSync(fileDbPath, 'utf8');
    
    // Fix the circular dependency in file-db.js
    const fixedContent = content.replace(
      // Match the problematic require
      /SubscriptionModel = require\('\.\.\/models\/Subscription'\);/,
      `// Dynamically load SubscriptionModel when needed to avoid circular dependencies
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
}`
    );
    
    // Write the fixed content back to the file
    fs.writeFileSync(fileDbPath, fixedContent);
    console.log('  ✅ Updated utils/file-db.js');
  } else {
    console.log('  ⚠️ Could not find utils/file-db.js');
  }
  
  console.log('✅ Fixed circular dependencies');
}

/**
 * Ensure the database file exists with proper structure
 */
function ensureDatabaseFile() {
  console.log('\n🔄 Checking database file...');
  const dbJsonPath = path.join(__dirname, 'data', 'db.json');
  const dataDir = path.join(__dirname, 'data');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    console.log('  - Creating data directory...');
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  let data;
  
  // Check if db.json exists
  if (!fs.existsSync(dbJsonPath)) {
    console.log('  - Creating new db.json file...');
    data = {
      subscriptions: [],
      users: [],
      systems: [],
      vendors: []
    };
  } else {
    console.log('  - Reading existing db.json file...');
    try {
      data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
      
      // Ensure all required collections exist
      const requiredCollections = ['subscriptions', 'users', 'systems', 'vendors'];
      let modified = false;
      
      requiredCollections.forEach(collection => {
        if (!data[collection]) {
          console.log(`  - Adding missing ${collection} collection`);
          data[collection] = [];
          modified = true;
        }
      });
      
      // If no modifications needed, return early
      if (!modified) {
        console.log('  ✅ Database file has correct structure');
      }
    } catch (err) {
      console.error('  ⚠️ Error reading db.json:', err.message);
      console.log('  - Creating new db.json file...');
      data = {
        subscriptions: [],
        users: [],
        systems: [],
        vendors: []
      };
    }
  }
  
  // Write updated data back to file
  fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2));
  console.log('✅ Database file check complete');
  
  return data;
}

/**
 * Add a demo subscription to the database
 */
function addDemoSubscription(data) {
  console.log('\n🔄 Checking for demo subscription...');
  
  // If subscriptions already exist, don't add demo
  if (data.subscriptions.length > 0) {
    console.log(`  ✅ Found ${data.subscriptions.length} existing subscriptions`);
    return;
  }
  
  console.log('  - Adding demo subscription...');
  
  // Create a demo subscription
  const demoSubscription = {
    _id: 'demo1',
    name: 'Demo Subscription',
    product: 'Demo Product',
    vendor: 'Demo Vendor',
    type: 'Subscription',
    seats: 10,
    cost: 999.99,
    renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    purchaseDate: new Date().toISOString(),
    notes: 'This is a demo subscription created by the fix utility.',
    user: 'demo-user',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  data.subscriptions.push(demoSubscription);
  
  // Write the updated data back to db.json
  const dbJsonPath = path.join(__dirname, 'data', 'db.json');
  fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2));
  
  console.log('  ✅ Demo subscription added');
}

/**
 * Test loading subscriptions
 */
async function testSubscriptionLoading() {
  console.log('\n🔄 Testing subscription loading...');
  
  try {
    // Try to load the Subscription model
    console.log('  - Loading Subscription model...');
    const Subscription = require('./models/Subscription');
    
    // Try to find subscriptions
    console.log('  - Testing Subscription.find()...');
    const subscriptions = await Subscription.find({});
    console.log(`  ✅ Successfully loaded ${subscriptions.length} subscriptions`);
    
    return true;
  } catch (err) {
    console.error('  ❌ Error loading subscriptions:', err.message);
    return false;
  }
}

// Run all fixes
async function run() {
  // Fix circular dependencies
  fixCircularDependencies();
  
  // Ensure database file exists with proper structure
  const data = ensureDatabaseFile();
  
  // Add demo subscription if needed
  addDemoSubscription(data);
  
  // Test subscription loading
  const success = await testSubscriptionLoading();
  
  console.log('\n=== Fix Summary ===');
  if (success) {
    console.log('✅ All fixes successfully applied!');
    console.log('✅ Subscription loading should now work properly.');
  } else {
    console.log('⚠️ Some issues remain with subscription loading.');
    console.log('Please check the application logs for more details.');
  }
  
  console.log('\nPlease restart your application for the changes to take effect.');
}

// Run the script
run().catch(err => {
  console.error('Error running fix script:', err);
}); 