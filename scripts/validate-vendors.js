const mongoose = require('mongoose');
const License = require('../models/License');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/licener', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// Update licenses with missing or invalid vendors
async function validateAndFixVendors() {
  try {
    // Find all licenses
    const licenses = await License.find({});
    console.log(`Found ${licenses.length} licenses to check`);

    let fixedCount = 0;

    // Check each license
    for (const license of licenses) {
      const vendorValue = license.vendor;

      // Check if vendor is missing, not a string, or empty
      if (!vendorValue || typeof vendorValue !== 'string' || vendorValue.trim() === '') {
        console.log(`Fixing license: ${license.name} - Missing or invalid vendor`);

        // Update the license with a default vendor
        license.vendor = 'Unknown Vendor';
        await license.save();

        fixedCount++;
      }
    }

    console.log(`Fixed ${fixedCount} licenses with missing or invalid vendors`);
  } catch (error) {
    console.error('Error validating vendors:', error.message);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Main function
async function main() {
  await connectDB();
  await validateAndFixVendors();
}

// Run the script
main();
