const mongoose = require('mongoose');
async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/licener');
    console.log('MongoDB connected');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(
      'Collections:',
      collections.map(c => c.name)
    );
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
main();
