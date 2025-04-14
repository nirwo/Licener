const chai = require('chai');
const expect = chai.expect;
const mongoose = require('mongoose');
const System = require('../models/System');
const License = require('../models/License');

// Sample test data
const testSystem = {
  name: 'Test System',
  type: 'virtual',
  os: 'Linux',
  osVersion: 'Ubuntu 22.04',
  location: 'Test Location',
  department: 'IT',
  managedBy: '000000000000000000000001', // Mock ObjectId
  installedSoftware: [
    {
      name: 'Test Software',
      version: '1.0',
      installDate: new Date(),
    },
  ],
  licenseRequirements: [],
  notes: 'Test Notes',
  status: 'active',
};

const testLicense = {
  name: 'Test License',
  product: 'Test Product',
  licenseKey: 'TEST-XXXX-XXXX-XXXX',
  purchaseDate: new Date('2023-01-01'),
  expiryDate: new Date('2024-01-01'),
  totalSeats: 10,
  usedSeats: 0,
  cost: 1000,
  currency: 'USD',
  vendor: 'Test Vendor',
  notes: 'Test Notes',
  status: 'active',
  assignedSystems: [],
  owner: '000000000000000000000001', // Mock ObjectId
  attachments: [],
};

describe('System Model', function () {
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
    Promise.all([System.deleteMany({}), License.deleteMany({})])
      .then(() => {
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  // Test creating a system
  it('should create a new system', async function () {
    try {
      const system = new System(testSystem);
      const savedSystem = await system.save();

      expect(savedSystem).to.have.property('_id');
      expect(savedSystem.name).to.equal(testSystem.name);
      expect(savedSystem.type).to.equal(testSystem.type);
      expect(savedSystem.os).to.equal(testSystem.os);
      expect(savedSystem.status).to.equal('active');
      expect(savedSystem.installedSoftware).to.be.an('array');
      expect(savedSystem.installedSoftware.length).to.equal(1);
    } catch (err) {
      throw err;
    }
  });

  // Test retrieving systems
  it('should retrieve all systems', async function () {
    try {
      // Create multiple systems
      await Promise.all([
        new System({ ...testSystem, name: 'System 1' }).save(),
        new System({ ...testSystem, name: 'System 2' }).save(),
        new System({ ...testSystem, name: 'System 3' }).save(),
      ]);

      const systems = await System.find({});
      expect(systems).to.be.an('array');
      expect(systems.length).to.equal(3);
    } catch (err) {
      throw err;
    }
  });

  // Test updating a system
  it('should update a system', async function () {
    try {
      // Create a system
      const system = new System(testSystem);
      const savedSystem = await system.save();

      // Update the system
      savedSystem.name = 'Updated System Name';
      savedSystem.status = 'inactive';
      savedSystem.osVersion = 'Ubuntu 23.04';
      await savedSystem.save();

      // Retrieve the updated system
      const updatedSystem = await System.findById(savedSystem._id);
      expect(updatedSystem.name).to.equal('Updated System Name');
      expect(updatedSystem.status).to.equal('inactive');
      expect(updatedSystem.osVersion).to.equal('Ubuntu 23.04');
    } catch (err) {
      throw err;
    }
  });

  // Test deleting a system
  it('should delete a system', async function () {
    try {
      // Create a system
      const system = new System(testSystem);
      const savedSystem = await system.save();

      // Delete the system
      await System.findByIdAndDelete(savedSystem._id);

      // Try to retrieve the deleted system
      const deletedSystem = await System.findById(savedSystem._id);
      expect(deletedSystem).to.be.null;
    } catch (err) {
      throw err;
    }
  });

  // Test adding installed software
  it('should add installed software to a system', async function () {
    try {
      // Create a system
      const system = new System(testSystem);
      const savedSystem = await system.save();

      // Add more software
      savedSystem.installedSoftware.push({
        name: 'New Software',
        version: '2.0',
        installDate: new Date(),
      });
      await savedSystem.save();

      // Retrieve the updated system
      const updatedSystem = await System.findById(savedSystem._id);
      expect(updatedSystem.installedSoftware.length).to.equal(2);
      expect(updatedSystem.installedSoftware[1].name).to.equal('New Software');
    } catch (err) {
      throw err;
    }
  });

  // Test license assignment to system
  it('should assign licenses to a system', async function () {
    try {
      // Create a system and license
      const system = new System(testSystem);
      const savedSystem = await system.save();

      const license = new License(testLicense);
      const savedLicense = await license.save();

      // Assign the license to the system
      savedSystem.licenseRequirements.push({
        licenseType: savedLicense.product,
        quantity: 1,
        licenseId: savedLicense._id,
      });
      await savedSystem.save();

      // Update the license with the system assignment
      savedLicense.assignedSystems.push(savedSystem._id);
      savedLicense.usedSeats = 1;
      await savedLicense.save();

      // Retrieve the updated system with populated license
      const updatedSystem = await System.findById(savedSystem._id).populate(
        'licenseRequirements.licenseId'
      );
      expect(updatedSystem.licenseRequirements.length).to.equal(1);
      expect(updatedSystem.licenseRequirements[0].licenseId._id.toString()).to.equal(
        savedLicense._id.toString()

      // Retrieve the updated license
      const updatedLicense = await License.findById(savedLicense._id);
      expect(updatedLicense.assignedSystems.length).to.equal(1);
      expect(updatedLicense.assignedSystems[0].toString()).to.equal(savedSystem._id.toString());
      expect(updatedLicense.usedSeats).to.equal(1);
    } catch (err) {
      throw err;
    }
  });

  // Test system filtering by OS and type
  it('should filter systems by OS and type', async function () {
    try {
      // Create systems with different properties
      await Promise.all([
        new System({ ...testSystem, name: 'Linux Server', os: 'Linux', type: 'physical' }).save(),
        new System({
          ...testSystem,
          name: 'Windows Desktop',
          os: 'Windows',
          type: 'physical',
        }).save(),
        new System({ ...testSystem, name: 'Windows VM', os: 'Windows', type: 'virtual' }).save(),
        new System({ ...testSystem, name: 'MacOS Laptop', os: 'MacOS', type: 'physical' }).save(),
      ]);

      // Filter by OS
      const windowsSystems = await System.find({ os: 'Windows' });
      expect(windowsSystems.length).to.equal(2);

      // Filter by type
      const virtualSystems = await System.find({ type: 'virtual' });
      expect(virtualSystems.length).to.equal(1);
      expect(virtualSystems[0].name).to.equal('Windows VM');

      // Combined filter
      const physicalWindowsSystems = await System.find({ os: 'Windows', type: 'physical' });
      expect(physicalWindowsSystems.length).to.equal(1);
      expect(physicalWindowsSystems[0].name).to.equal('Windows Desktop');
    } catch (err) {
      throw err;
    }
  });
});
