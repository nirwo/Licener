// Script to find licenses missing _id in the Licener database
const mongoose = require('mongoose');
const License = require('../models/License');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/licener';

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // Find all licenses
  const licenses = await License.find({}).lean();

  // Find licenses missing _id or with empty/null _id
  const missingId = licenses.filter(l => !l._id || l._id === '' || l._id === null);

  if (missingId.length === 0) {
    console.log('All licenses have valid _id fields.');
  } else {
    console.log('Licenses missing _id:', missingId);
    console.log(`Total: ${missingId.length}`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
