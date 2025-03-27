const chai = require('chai');
const expect = chai.expect;
const mongoose = require('mongoose');
const License = require('../models/License');
const System = require('../models/System');

describe('License Deletion Functionality', function() {
  let testLicenseId;
  
  before(async function() {
    this.timeout(10000); // Increase timeout for MongoDB connection
    
    // Connect to database
    await mongoose.connect('mongodb://127.0.0.1:27017/licener_test', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    
    console.log('Connected to test database');
    
    // Clear database
    await License.deleteMany({});
    await System.deleteMany({});
    
    // Create test data
    const testLicense = new License({
      name: 'Test License to Delete',
      product: 'Test Product',
      licenseKey: 'DELETE-TEST-KEY',
      purchaseDate: new Date('2023-01-01'),
      expiryDate: new Date('2024-01-01'),
      totalSeats: 10,
      usedSeats: 0,
      cost: 1000,
      currency: 'USD',
      vendor: 'Test Vendor',
      notes: 'This license will be deleted',
      status: 'active',
      owner: new mongoose.Types.ObjectId() // Generate a mock ObjectId
    });
    
    const savedLicense = await testLicense.save();
    testLicenseId = savedLicense._id;
    
    console.log(`Created test license with ID: ${testLicenseId}`);
  });
  
  after(async function() {
    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from test database');
  });
  
  it('should exist in database before deletion', async function() {
    const license = await License.findById(testLicenseId);
    expect(license).to.not.be.null;
    expect(license._id.toString()).to.equal(testLicenseId.toString());
  });
  
  it('should be successfully deleted from database', async function() {
    console.log(`Attempting to delete license with ID: ${testLicenseId}`);
    
    // Try to delete the license
    await License.findByIdAndDelete(testLicenseId);
    
    // Verify it's been deleted
    const deletedLicense = await License.findById(testLicenseId);
    expect(deletedLicense).to.be.null;
    
    console.log('License successfully deleted');
  });
});