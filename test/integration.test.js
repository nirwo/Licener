const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const mongoose = require('mongoose');
const MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
const License = require('../models/License');
const System = require('../models/System');
const User = require('../models/User');

// Use chai-http plugin
chai.use(chaiHttp);

describe('Licener Integration Tests', function () {
  let mongoServer;
  let app;
  let testUser;
  let testLicense;
  let testSystem;
  let agent;

  before(async function () {
    this.timeout(30000); // Increase timeout for MongoDB setup

    // Create in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Set environment variable for MongoDB URI
    process.env.MONGO_URI = mongoUri;

    // Load the app
    app = require('../app');

    // Setup chai agent
    agent = chai.request.agent(app);

    // Create test user
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
    };

    const user = new User(userData);
    testUser = await user.save();

    // Mock authentication (since we're not testing auth in this suite)
    app._router.stack.forEach(layer => {
      if (layer.route) {
        layer.route.stack.forEach(layer => {
          if (layer.name === 'ensureAuthenticated') {
            layer.handle = function (req, res, next) {
              req.user = {
                id: testUser._id,
                _id: testUser._id,
                name: testUser.name,
                email: testUser.email,
                role: testUser.role,
              };
              req.isAuthenticated = () => true;
              return next();
            };
          }
        });
      } else if (layer.name === 'router') {
        layer.handle.stack.forEach(layer => {
          if (layer.route) {
            layer.route.stack.forEach(layer => {
              if (layer.name === 'ensureAuthenticated') {
                layer.handle = function (req, res, next) {
                  req.user = {
                    id: testUser._id,
                    _id: testUser._id,
                    name: testUser.name,
                    email: testUser.email,
                    role: testUser.role,
                  };
                  req.isAuthenticated = () => true;
                  return next();
                };
              }
            });
          }
        });
      }
    });
  });

  after(async function () {
    // Disconnect from database and stop MongoDB server
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async function () {
    // Clear database before each test
    await License.deleteMany({});
    await System.deleteMany({});

    // Create test license and system for each test
    const licenseData = {
      name: 'Test License',
      product: 'Test Product',
      licenseKey: 'TEST-1234-5678-9012',
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
      owner: testUser._id,
    };

    const systemData = {
      name: 'Test System',
      type: 'virtual',
      os: 'Linux',
      osVersion: 'Ubuntu 22.04',
      location: 'Test Location',
      department: 'IT',
      managedBy: testUser._id,
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

    testLicense = new License(licenseData);
    await testLicense.save();

    testSystem = new System(systemData);
    await testSystem.save();
  });

  // Test license listing endpoint
  it('should retrieve licenses', async function () {
    const res = await agent.get('/licenses');
    expect(res).to.have.status(200);
  });

  // Test creating a new license
  it('should create a new license', async function () {
    const newLicense = {
      name: 'New Test License',
      product: 'New Product',
      licenseKey: 'NEW-TEST-LICENSE-KEY',
      purchaseDate: '2023-03-01',
      expiryDate: '2025-03-01',
      totalSeats: 5,
      cost: 500,
      currency: 'USD',
      vendor: 'New Vendor',
      notes: 'New test license notes',
      status: 'active',
    };

    const res = await agent.post('/licenses').send(newLicense);

    expect(res).to.have.status(200);

    // Check that license was created in the database
    const licenses = await License.find({ name: 'New Test License' });
    expect(licenses).to.have.lengthOf(1);
    expect(licenses[0].licenseKey).to.equal('NEW-TEST-LICENSE-KEY');
  });

  // Test deleting a license
  it('should delete a license', async function () {
    const res = await agent.post(`/licenses/${testLicense._id}/delete`);

    expect(res).to.have.status(200);

    // Check that license was deleted from the database
    const license = await License.findById(testLicense._id);
    expect(license).to.be.null;
  });

  // Test updating a license
  it('should update a license', async function () {
    const updateData = {
      name: 'Updated License Name',
      status: 'renewed',
      notes: 'Updated test notes',
    };

    const res = await agent.post(`/licenses/${testLicense._id}?_method=PUT`).send(updateData);

    expect(res).to.have.status(200);

    // Check that license was updated in the database
    const license = await License.findById(testLicense._id);
    expect(license.name).to.equal('Updated License Name');
    expect(license.status).to.equal('renewed');
  });

  // Test assigning a system to a license
  it('should assign a system to a license', async function () {
    // Update license with assigned system
    const updateData = {
      assignedSystems: [testSystem._id],
    };

    const res = await agent.post(`/licenses/${testLicense._id}?_method=PUT`).send(updateData);

    expect(res).to.have.status(200);

    // Check that license was updated with system reference
    const license = await License.findById(testLicense._id);
    expect(license.assignedSystems).to.have.lengthOf(1);
    expect(license.assignedSystems[0].toString()).to.equal(testSystem._id.toString());

    // Check that system has license requirement
    const system = await System.findById(testSystem._id);
    expect(system.licenseRequirements).to.have.lengthOf(1);
    expect(system.licenseRequirements[0].licenseId.toString()).to.equal(testLicense._id.toString());
  });
});
