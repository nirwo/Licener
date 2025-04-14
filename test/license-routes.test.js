const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const mongoose = require('mongoose');
const License = require('../models/License');
const System = require('../models/System');
const User = require('../models/User');

// Mock Express app
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const passport = require('passport');

chai.use(chaiHttp);

describe('License Routes', function () {
  let app;
  let testUser;
  let agent;

  // Test data
  const testUserData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin',
  };

  const testLicenseData = {
    name: 'Test License',
    product: 'Test Product',
    licenseKey: 'TEST-XXXX-XXXX-XXXX',
    purchaseDate: '2023-01-01',
    expiryDate: '2024-01-01',
    totalSeats: 10,
    cost: 1000,
    currency: 'USD',
    vendor: 'Test Vendor',
    notes: 'Test Notes',
    status: 'active',
  };

  before(async function () {
    // Setup express app for testing
    app = express();

    // Connect to test database
    await mongoose.connect('mongodb://127.0.0.1:27017/licener_test', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    // Clear the database
    await mongoose.connection.db.dropDatabase();

    // Setup middleware
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(methodOverride('_method'));

    app.use(
      session({
        secret: 'test-secret',
        resave: true,
        saveUninitialized: true,
      })

    app.use(flash());
    app.use(passport.initialize());
    app.use(passport.session());

    // Setup flash messages
    app.use((req, res, next) => {
      res.locals.success_msg = req.flash('success_msg');
      res.locals.error_msg = req.flash('error_msg');
      res.locals.error = req.flash('error');
      res.locals.user = req.user || null;
      next();
    });

    // Create test views directory
    app.set('views', './templates');
    app.set('view engine', 'handlebars');

    // Create test user
    const user = new User(testUserData);
    testUser = await user.save();

    // Mock authentication middleware
    app.use((req, res, next) => {
      req.isAuthenticated = () => true;
      req.user = {
        id: testUser._id,
        _id: testUser._id,
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
      };
      next();
    });

    // Use license routes
    app.use('/licenses', require('../routes/licenses'));

    // Setup chai agent
    agent = chai.request.agent(app);
  });

  after(async function () {
    // Disconnect from database
    await mongoose.disconnect();
  });

  beforeEach(async function () {
    // Clear licenses and systems before each test
    await License.deleteMany({});
    await System.deleteMany({});
  });

  // Test creating a license
  it('should create a new license via POST /licenses', async function () {
    const res = await agent.post('/licenses').send(testLicenseData);

    expect(res).to.have.status(200);

    // Check database
    const licenses = await License.find({});
    expect(licenses.length).to.equal(1);
    expect(licenses[0].name).to.equal(testLicenseData.name);
    expect(licenses[0].licenseKey).to.equal(testLicenseData.licenseKey);
    expect(licenses[0].owner.toString()).to.equal(testUser._id.toString());
  });

  // Test deleting a license
  it('should delete a license via DELETE /licenses/:id', async function () {
    // Create a license first
    const license = new License({
      ...testLicenseData,
      owner: testUser._id,
    });
    const savedLicense = await license.save();

    // Delete the license
    const res = await agent.delete(`/licenses/${savedLicense._id}`);

    expect(res).to.have.status(200);

    // Check database
    const deletedLicense = await License.findById(savedLicense._id);
    expect(deletedLicense).to.be.null;
  });

  // Test alternative delete method
  it('should delete a license via POST /licenses/:id/delete', async function () {
    // Create a license first
    const license = new License({
      ...testLicenseData,
      owner: testUser._id,
    });
    const savedLicense = await license.save();

    // Delete the license using the alternative route
    const res = await agent.post(`/licenses/${savedLicense._id}/delete`);

    expect(res).to.have.status(200);

    // Check database
    const deletedLicense = await License.findById(savedLicense._id);
    expect(deletedLicense).to.be.null;
  });

  // Test updating a license
  it('should update a license via PUT /licenses/:id', async function () {
    // Create a license first
    const license = new License({
      ...testLicenseData,
      owner: testUser._id,
    });
    const savedLicense = await license.save();

    // Update data
    const updateData = {
      name: 'Updated License',
      status: 'renewed',
      notes: 'Updated notes',
    };

    // Update the license
    const res = await agent.put(`/licenses/${savedLicense._id}`).send(updateData);

    expect(res).to.have.status(200);

    // Check database
    const updatedLicense = await License.findById(savedLicense._id);
    expect(updatedLicense.name).to.equal(updateData.name);
    expect(updatedLicense.status).to.equal(updateData.status);
    expect(updatedLicense.notes).to.equal(updateData.notes);
  });
});
