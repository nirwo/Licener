/**
 * Final Subscription Fix Script
 * 
 * This script replaces the problematic Subscription.js file with a fixed version
 * that avoids circular dependencies and provides a more robust implementation.
 */
const fs = require('fs');
const path = require('path');

console.log('=== Final Subscription Fix ===');

// Paths
const sourceFile = path.join(__dirname, 'models', 'subscription-fixed.js');
const targetFile = path.join(__dirname, 'models', 'Subscription.js');
const backupFile = path.join(__dirname, 'models', 'Subscription.js.bak');
const dbFile = path.join(__dirname, 'data', 'db.json');
const dataDir = path.join(__dirname, 'data');

// Ensure the fixed model file exists
if (!fs.existsSync(sourceFile)) {
  console.error('❌ Fixed subscription model file not found!');
  console.log('Please ensure that models/subscription-fixed.js exists.');
  process.exit(1);
}

// Backup existing Subscription.js if it exists
if (fs.existsSync(targetFile)) {
  console.log('📦 Backing up existing Subscription.js...');
  fs.copyFileSync(targetFile, backupFile);
  console.log(`✅ Backup created at ${backupFile}`);
}

// Copy the fixed version to replace the original
console.log('🔄 Installing fixed Subscription model...');
fs.copyFileSync(sourceFile, targetFile);
console.log('✅ Fixed Subscription model installed');

// Ensure data directory and db.json exist
if (!fs.existsSync(dataDir)) {
  console.log('📂 Creating data directory...');
  fs.mkdirSync(dataDir, { recursive: true });
}

// Check if db.json exists and create it if needed
let dbData;
if (!fs.existsSync(dbFile)) {
  console.log('📄 Creating db.json file...');
  dbData = {
    subscriptions: [],
    users: [],
    systems: [],
    vendors: []
  };
  fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
  console.log('✅ Created db.json with empty collections');
} else {
  // Read existing db.json
  try {
    console.log('📄 Reading existing db.json...');
    dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    
    // Ensure all collections exist
    ['subscriptions', 'users', 'systems', 'vendors'].forEach(collection => {
      if (!dbData[collection]) {
        console.log(`📌 Adding missing ${collection} collection`);
        dbData[collection] = [];
      }
    });
    
    // Write updated data back if changes were made
    fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
    console.log('✅ Verified db.json structure');
  } catch (err) {
    console.error('❌ Error reading or updating db.json:', err.message);
    console.log('📄 Creating new db.json with proper structure...');
    dbData = {
      subscriptions: [],
      users: [],
      systems: [],
      vendors: []
    };
    fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
    console.log('✅ Created new db.json with empty collections');
  }
}

// Add a demo subscription if there are none
if (!dbData.subscriptions || dbData.subscriptions.length === 0) {
  console.log('🔄 Adding demo subscription...');
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
  
  dbData.subscriptions.push(demoSubscription);
  fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
  console.log('✅ Added demo subscription to db.json');
}

console.log('\n🎉 Subscription Fix Completed! 🎉');
console.log('Please restart your application for the changes to take effect.');
console.log('\nIf you still experience issues, please check the application logs');
console.log('and ensure that the db.json file in the data directory is properly structured.'); 