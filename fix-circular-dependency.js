/**
 * Script to fix circular dependencies in the Subscription model
 */
const fs = require('fs');
const path = require('path');

// Fix Subscription.js
const subscriptionPath = path.join(__dirname, 'models', 'Subscription.js');
if (fs.existsSync(subscriptionPath)) {
  console.log('Fixing models/Subscription.js...');
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
  console.log('Fixed models/Subscription.js');
}

// Fix file-db.js
const fileDbPath = path.join(__dirname, 'utils', 'file-db.js');
if (fs.existsSync(fileDbPath)) {
  console.log('Fixing utils/file-db.js...');
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
  console.log('Fixed utils/file-db.js');
}

// Create/fix data/db.json
const dbJsonPath = path.join(__dirname, 'data', 'db.json');
const dataDir = path.join(__dirname, 'data');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory');
}

// Create or update db.json
if (!fs.existsSync(dbJsonPath)) {
  console.log('Creating db.json with empty collections...');
  const initialData = {
    subscriptions: [],
    users: [],
    systems: [],
    vendors: []
  };
  fs.writeFileSync(dbJsonPath, JSON.stringify(initialData, null, 2));
  console.log('Created db.json with empty collections');
} else {
  // Update db.json to ensure subscriptions collection exists
  console.log('Updating db.json to ensure subscriptions collection exists...');
  try {
    const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
    if (!data.subscriptions) {
      data.subscriptions = [];
      fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2));
      console.log('Added subscriptions collection to db.json');
    } else {
      console.log('Subscriptions collection already exists in db.json');
    }
  } catch (err) {
    console.error('Error updating db.json:', err.message);
    // If db.json is corrupted, create a new one
    console.log('Creating new db.json with empty collections...');
    const initialData = {
      subscriptions: [],
      users: [],
      systems: [],
      vendors: []
    };
    fs.writeFileSync(dbJsonPath, JSON.stringify(initialData, null, 2));
    console.log('Created new db.json with empty collections');
  }
}

// Add a demo subscription
console.log('Adding demo subscription...');
try {
  const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
  
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
    notes: 'This is a demo subscription created by the fix script.',
    user: 'demo-user',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Check if demo subscription already exists
  const existingIndex = data.subscriptions.findIndex(s => s._id === 'demo1');
  if (existingIndex >= 0) {
    console.log('Demo subscription already exists, updating it...');
    data.subscriptions[existingIndex] = demoSubscription;
  } else {
    console.log('Adding new demo subscription...');
    data.subscriptions.push(demoSubscription);
  }
  
  fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2));
  console.log('Demo subscription added/updated in db.json');
} catch (err) {
  console.error('Error adding demo subscription:', err.message);
}

console.log('Fixes completed! Please restart your application.'); 