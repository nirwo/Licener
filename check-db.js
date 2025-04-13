/**
 * Simple script to check DB file contents
 */
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.json');

try {
  console.log('Checking db.json file...');
  const content = fs.readFileSync(dbPath, 'utf8');
  const data = JSON.parse(content);
  
  console.log('DB Collections:');
  for (const collection in data) {
    console.log(`- ${collection}: ${data[collection].length} items`);
  }
  
  if (data.subscriptions && data.subscriptions.length > 0) {
    console.log('\nSubscriptions:');
    data.subscriptions.forEach((sub, i) => {
      console.log(`${i+1}. ${sub.name} (${sub._id}) - ${sub.product} by ${sub.vendor}`);
    });
  } else {
    console.log('\nNo subscriptions found!');
  }
} catch (err) {
  console.error('Error reading db.json:', err.message);
  
  if (err.code === 'ENOENT') {
    console.log('\ndb.json does not exist. Creating it now...');
    const initialData = {
      subscriptions: [
        {
          _id: 'demo1',
          name: 'Demo Subscription',
          product: 'Demo Product',
          vendor: 'Demo Vendor',
          type: 'Subscription',
          seats: 10,
          cost: 999.99,
          renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          purchaseDate: new Date().toISOString(),
          notes: 'This is a demo subscription created by the check-db script.',
          user: 'demo-user',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      users: [],
      systems: [],
      vendors: []
    };
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(path.dirname(dbPath))) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
    console.log('Created db.json with a demo subscription');
  }
} 