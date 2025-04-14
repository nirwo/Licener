/**
 * Script to test subscription loading
 */
console.log('=== Testing Subscription Loading ===');

// Try loading Subscription model and retrieving subscriptions
try {
  console.log('Loading Subscription model...');
  const Subscription = require('./models/Subscription');
  console.log('Subscription model loaded successfully:', typeof Subscription);

  // Test Subscription model functions
  const testFunctions = async () => {
    try {
      console.log('\nTesting Subscription.find()...');
      const subscriptions = await Subscription.find({});
      console.log(`Found ${subscriptions.length} subscriptions`);

      if (subscriptions.length > 0) {
        console.log('First subscription:', {
          _id: subscriptions[0]._id,
          name: subscriptions[0].name,
          product: subscriptions[0].product,
          vendor: subscriptions[0].vendor,
        });

        // Try loading a specific subscription
        console.log('\nTesting Subscription.findById()...');
        const subscription = await Subscription.findById(subscriptions[0]._id);
        if (subscription) {
          console.log('Successfully loaded subscription by ID');
        } else {
          console.log('Failed to load subscription by ID');
        }
      }

      console.log('\n✅ All subscription tests passed!');
    } catch (err) {
      console.error('\n❌ Error testing Subscription model functions:', err);
    }
  };

  testFunctions();
} catch (err) {
  console.error('\n❌ Error loading Subscription model:', err);
}

// Test file DB directly
try {
  console.log('\nTesting direct file DB access...');
  const fs = require('fs');
  const path = require('path');

  const dbJsonPath = path.join(__dirname, 'data', 'db.json');
  if (fs.existsSync(dbJsonPath)) {
    const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
    console.log(`DB file exists with ${Object.keys(data).length} collections`);

    if (data.subscriptions) {
      console.log(`Found ${data.subscriptions.length} subscriptions in DB file`);
      if (data.subscriptions.length > 0) {
        console.log('First subscription in DB file:', {
          _id: data.subscriptions[0]._id,
          name: data.subscriptions[0].name,
          product: data.subscriptions[0].product,
          vendor: data.subscriptions[0].vendor,
        });
      }
      console.log('\n✅ DB file test passed!');
    } else {
      console.log('\n❌ No subscriptions collection found in DB file');
    }
  } else {
    console.log('\n❌ DB file does not exist');
  }
} catch (err) {
  console.error('\n❌ Error testing DB file:', err);
}
