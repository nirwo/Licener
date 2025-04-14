const chai = require('chai');
const expect = chai.expect;
const mongoose = require('mongoose');
const License = require('../models/License');
const System = require('../models/System');
const fs = require('fs');
const path = require('path');

// Sample test data
const testLicense = {
  name: 'Test License',
  product: 'Test Product',
  licenseKey: 'TEST-XXXX-XXXX-XXXX',
  purchaseDate: new Date('2023-01-01'),
  expiryDate: new Date('2024-01-01'),
  totalSeats: 10,
  usedSeats: 5,
  cost: 1000,
  currency: 'USD',
  vendor: 'Test Vendor',
  notes: 'Test Notes',
  status: 'active',
  assignedSystems: [],
  owner: '000000000000000000000001', // Mock ObjectId
  attachments: [],
};

const testSystem = {
  name: 'Test System',
  type: 'virtual',
  os: 'Linux',
  osVersion: 'Ubuntu 22.04',
  location: 'Test Location',
  department: 'IT',
  managedBy: '000000000000000000000001', // Mock ObjectId
  installedSoftware: [],
  licenseRequirements: [],
  notes: 'Test Notes',
  status: 'active',
};

describe('License Model', function () {
  // This will run before all tests - connect to test database
  before(function (done) {
    // Use a test database
    mongoose
      .connect('mongodb://127.0.0.1:27017/licener_test', {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      })
      .then(() => {
        console.log('Connected to test database');
        // Clear test database
        return mongoose.connection.db.dropDatabase();
      })
      .then(() => {
        done();
      })
      .catch(err => {
        console.error('Error connecting to test database:', err);
        done(err);
      });
  });

  // After all tests, disconnect from database
  after(function (done) {
    mongoose
      .disconnect()
      .then(() => {
        console.log('Disconnected from test database');
        done();
      })
      .catch(err => {
        console.error('Error disconnecting from test database:', err);
        done(err);
      });
  });

  // Clear the database before each test
  beforeEach(function (done) {
    Promise.all([License.deleteMany({}), System.deleteMany({})])
      .then(() => {
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  // Test creating a license
  it('should create a new license', async function () {
    try {
      const license = new License(testLicense);
      const savedLicense = await license.save();

      expect(savedLicense).to.have.property('_id');
      expect(savedLicense.name).to.equal(testLicense.name);
      expect(savedLicense.product).to.equal(testLicense.product);
      expect(savedLicense.licenseKey).to.equal(testLicense.licenseKey);
      expect(savedLicense.status).to.equal('active');
    } catch (err) {
      throw err;
    }
  });

  // Test retrieving licenses
  it('should retrieve all licenses', async function () {
    try {
      // Create multiple licenses
      await Promise.all([
        new License({ ...testLicense, name: 'License 1' }).save(),
        new License({ ...testLicense, name: 'License 2' }).save(),
        new License({ ...testLicense, name: 'License 3' }).save(),
      ]);

      const licenses = await License.find({});
      expect(licenses).to.be.an('array');
      expect(licenses.length).to.equal(3);
    } catch (err) {
      throw err;
    }
  });

  // Test updating a license
  it('should update a license', async function () {
    try {
      // Create a license
      const license = new License(testLicense);
      const savedLicense = await license.save();

      // Update the license
      savedLicense.name = 'Updated License Name';
      savedLicense.status = 'renewed';
      await savedLicense.save();

      // Retrieve the updated license
      const updatedLicense = await License.findById(savedLicense._id);
      expect(updatedLicense.name).to.equal('Updated License Name');
      expect(updatedLicense.status).to.equal('renewed');
    } catch (err) {
      throw err;
    }
  });

  // Test deleting a license
  it('should delete a license', async function () {
    try {
      // Create a license
      const license = new License(testLicense);
      const savedLicense = await license.save();

      // Delete the license
      await License.findByIdAndDelete(savedLicense._id);

      // Try to retrieve the deleted license
      const deletedLicense = await License.findById(savedLicense._id);
      expect(deletedLicense).to.be.null;
    } catch (err) {
      throw err;
    }
  });

  // Test license-system relationship
  it('should manage license-system relationship', async function () {
    try {
      // Create a license and a system
      const license = new License(testLicense);
      const savedLicense = await license.save();

      const system = new System(testSystem);
      const savedSystem = await system.save();

      // Assign the system to the license
      savedLicense.assignedSystems.push(savedSystem._id);
      savedLicense.usedSeats = 1;
      await savedLicense.save();

      // Add the license to the system
      savedSystem.licenseRequirements.push({
        licenseType: savedLicense.product,
        quantity: 1,
        licenseId: savedLicense._id,
      });
      await savedSystem.save();

      // Retrieve the updated license with populated systems
      const updatedLicense = await License.findById(savedLicense._id).populate('assignedSystems');
      expect(updatedLicense.assignedSystems).to.be.an('array');
      expect(updatedLicense.assignedSystems.length).to.equal(1);
      expect(updatedLicense.assignedSystems[0]._id.toString()).to.equal(savedSystem._id.toString());

      // Retrieve the updated system with populated licenses
      const updatedSystem = await System.findById(savedSystem._id).populate(
        'licenseRequirements.licenseId'
      );
      expect(updatedSystem.licenseRequirements).to.be.an('array');
      expect(updatedSystem.licenseRequirements.length).to.equal(1);
      expect(updatedSystem.licenseRequirements[0].licenseId._id.toString()).to.equal(
        savedLicense._id.toString()
      );
    } catch (err) {
      throw err;
    }
  });

  // Test license expiry checking
  it('should identify expired and expiring licenses', async function () {
    try {
      // Create licenses with different expiry dates
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 1);

      await Promise.all([
        new License({
          ...testLicense,
          name: 'Expired License',
          expiryDate: pastDate,
          status: 'expired',
        }).save(),
        new License({
          ...testLicense,
          name: 'Expiring Soon License',
          expiryDate: futureDate,
        }).save(),
        new License({ ...testLicense, name: 'Valid License', expiryDate: farFutureDate }).save(),
      ]);

      // Find expired licenses
      const expiredLicenses = await License.find({ expiryDate: { $lt: new Date() } });
      expect(expiredLicenses.length).to.equal(1);
      expect(expiredLicenses[0].name).to.equal('Expired License');

      // Find licenses expiring in the next 60 days
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

      const expiringSoonLicenses = await License.find({
        expiryDate: {
          $gte: new Date(),
          $lte: sixtyDaysFromNow,
        },
      });

      expect(expiringSoonLicenses.length).to.equal(1);
      expect(expiringSoonLicenses[0].name).to.equal('Expiring Soon License');
    } catch (err) {
      throw err;
    }
  });
});
