const mongoose = require('mongoose');
const License = require('../models/License');
let User;

// Try to get the User model if available
try {
  User = require('../models/User');
} catch (err) {
  console.warn('Could not load User model:', err.message);
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/licener', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

async function getValidUserId() {
  try {
    // Try to get users from the database
    if (User) {
      console.log('Fetching users from database...');
      const users = await User.find({}).limit(1);

      if (users && users.length > 0) {
        console.log(`Found user: ${users[0].name || users[0].email || 'Unknown'}`);
        return users[0]._id;
      }
    }

    // If no users found or User model not available, return a dummy ID
    console.log('No users found or User model not available, using a dummy ID');
    return new mongoose.Types.ObjectId();
  } catch (err) {
    console.error('Error getting valid user ID:', err);
    return new mongoose.Types.ObjectId();
  }
}

async function testLicenseModel() {
  console.log('===== Testing License Model =====');

  // Get a valid user ID
  const testUserId = await getValidUserId();
  console.log('Using user ID for testing:', testUserId);

  try {
    // Check License model properties
    console.log('License model properties:', Object.keys(License));
    console.log('Is createDemo method available?', typeof License.createDemo === 'function');

    // Test creating a demo license
    console.log('\nTesting License.createDemo method...');
    if (typeof License.createDemo === 'function') {
      try {
        const demoLicense = await License.createDemo(testUserId);
        console.log('Demo license created/retrieved successfully:');
        console.log({
          id: demoLicense._id,
          name: demoLicense.name,
          product: demoLicense.product,
          vendor: demoLicense.vendor,
          owner: demoLicense.owner,
        });
      } catch (err) {
        console.error('Failed to create demo license:', err);
      }
    } else {
      console.log('createDemo method not available - testing manual creation');

      // Try creating a test license manually
      const licenseData = {
        name: 'Test License',
        product: 'Test Product',
        vendor: 'Test Vendor',
        licenseKey: 'TEST-XXXX-XXXX-XXXX',
        purchaseDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalSeats: 5,
        usedSeats: 1,
        utilization: 20,
        cost: 499.99,
        currency: 'USD',
        notes: 'This is a test license',
        status: 'active',
        owner: testUserId,
      };

      const testLicense = new License(licenseData);
      const savedLicense = await testLicense.save();
      console.log('Test license created manually:', {
        id: savedLicense._id,
        name: savedLicense.name,
        vendor: savedLicense.vendor,
      });
    }

    // Test fetching all licenses
    console.log('\nTesting License.find()...');
    const allLicenses = await License.find({});
    console.log(`Found ${allLicenses.length} licenses in the database`);

    if (allLicenses.length > 0) {
      console.log('First license details:', {
        id: allLicenses[0]._id,
        name: allLicenses[0].name,
        product: allLicenses[0].product,
        vendor: allLicenses[0].vendor,
      });

      // Test License.findById
      console.log('\nTesting License.findById...');
      const licenseId = allLicenses[0]._id;
      const foundLicense = await License.findById(licenseId);

      if (foundLicense) {
        console.log(`License found by ID ${licenseId}:`, {
          id: foundLicense._id,
          name: foundLicense.name,
        });
      } else {
        console.log(`No license found with ID ${licenseId}`);
      }
    }
  } catch (err) {
    console.error('Error testing License model:', err);
  } finally {
    // Disconnect from the database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
async function main() {
  await connectDB();
  await testLicenseModel();
}

main().catch(console.error);
