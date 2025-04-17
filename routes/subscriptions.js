const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const System = require('../models/System');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const ExcelJS = require('exceljs');
const { ensureManager } = require('../middleware/auth');
const Vendor = require('../models/Vendor');
const { Parser } = require('@json2csv/node');
const sanitizeHtml = require('sanitize-html');
const { v4: uuidv4 } = require('uuid');

// Debug route to help identify subscription model issues
router.get('/debug', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Debug route triggered');
    // Test Subscription model functionality
    const result = {
      modelType: typeof Subscription,
      hasFind: typeof Subscription.find === 'function',
      findByManager: typeof Subscription.findByManager === 'function',
      mongoModel: Subscription.mongoModel ? true : false,
    };
    console.log('Subscription model info:', result);

    try {
      // Try to load 1 subscription to test functionality
      const subscription = await Subscription.find({ user: req.user._id }).limit(1);
      console.log('Find result successful:', subscription ? 'Data found' : 'No data found');
      result.findSuccess = true;
      result.subscription =
        subscription.length > 0 ? 'Found subscription' : 'No subscriptions found';
    } catch (findErr) {
      console.error('Error during find operation:', findErr);
      result.findSuccess = false;
      result.findError = findErr.message;
    }

    res.json(result);
  } catch (err) {
    console.error('Debug route error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Debug route to test route matching
router.get('/debug-routes', ensureAuthenticated, (req, res) => {
  console.log('Available routes:', router.stack.map(r => r.route?.path).filter(Boolean));
  res.json({ routes: router.stack.map(r => r.route?.path).filter(Boolean) });
});

// Set up storage for file uploads with better security
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './data/uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    const sanitizedFilename = sanitizeFilename(file.originalname);
    cb(null, `${uniqueId}-${sanitizedFilename}`);
  },
});

// Improved file filter with better security
const fileFilter = (req, file, cb) => {
  const allowedFiletypes = /csv|xlsx|pdf|jpg|jpeg|png|doc|docx/;
  const extname = allowedFiletypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFiletypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only CSV, XLSX, PDF, JPG, JPEG, PNG, DOC, DOCX files are allowed.'
      )
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5, // Maximum 5 files
  },
  fileFilter: fileFilter,
});

// Helper function to sanitize filenames
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

// Helper function to safely convert IDs to strings
function safeIdToString(id) {
  if (!id) return '';
  return typeof id === 'object' && id.toString ? id.toString() : String(id);
}

// Improved logging function
function logObject(label, obj, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] === ${label} ===\n${
    typeof obj === 'undefined'
      ? 'UNDEFINED'
      : obj === null
        ? 'NULL'
        : JSON.stringify(obj, (key, value) =>
            typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 20
              ? '[Object with many properties]'
              : value,
          2)
  }\n=== END ${label} ===`;

  console.log(logMessage);

  // Write to log file
  const logDir = './logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
  }

  fs.appendFileSync(path.join(logDir, 'app.log'), logMessage + '\n', { encoding: 'utf8' });
}

// Helper function to validate subscription data
function validateSubscriptionData(data) {
  const errors = [];

  if (!data.product) errors.push('Product name is required');
  if (!data.vendor) errors.push('Vendor is required');

  if (data.seats && isNaN(parseInt(data.seats))) {
    errors.push('Seats must be a number');
  }

  if (data.cost && isNaN(parseFloat(data.cost))) {
    errors.push('Cost must be a number');
  }

  if (data.purchaseDate && isNaN(Date.parse(data.purchaseDate))) {
    errors.push('Invalid purchase date format');
  }

  if (data.renewalDate && isNaN(Date.parse(data.renewalDate))) {
    errors.push('Invalid renewal date format');
  }

  return errors;
}

// Helper function to sanitize subscription data
function sanitizeSubscriptionData(data) {
  return {
    ...data,
    name: sanitizeHtml(data.name || ''),
    product: sanitizeHtml(data.product || ''),
    vendor: sanitizeHtml(data.vendor || ''),
    notes: sanitizeHtml(data.notes || ''),
    status: sanitizeHtml(data.status || 'active'),
    type: sanitizeHtml(data.type || 'Subscription'),
  };
}

// Helper function to read Excel file with improved error handling
async function readExcelFile(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new Error('No worksheet found in the Excel file');
    }

    const data = [];
    const headers = [];

    // Get headers from first row
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });

    // Process data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = cell.value;
        }
      });

      if (Object.keys(rowData).length > 0) {
        data.push(rowData);
      }
    });

    return data;
  } catch (error) {
    logObject('Excel Read Error', error, 'error');
    throw new Error(`Error reading Excel file: ${error.message}`);
  }
}

// List all subscriptions
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Listing subscriptions for user:', req.user._id);
    const subscriptions = await Subscription.find({ user: req.user._id })
      .populate('vendor')
      .populate('system')
      .sort({ renewalDate: 1 })
      .lean(); // Convert Mongoose documents to plain objects

    res.render('subscriptions/index', {
      title: 'Subscriptions',
      subscriptions: subscriptions.map(sub => ({
        ...sub,
        _id: sub._id.toString(), // Ensure ID is a string
        vendor: sub.vendor ? sub.vendor.name : 'Unknown Vendor',
        system: sub.system ? sub.system.name : null,
      })),
      filters: req.query,
    });
  } catch (err) {
    console.error('Error listing subscriptions:', err);
    req.flash('error', 'Error loading subscriptions');
    res.redirect('/dashboard');
  }
});

// Add subscription form - must come before :id routes
router.get('/add', ensureAuthenticated, async (req, res) => {
  try {
    console.log(
      'Loading systems for subscription form, user:',
      JSON.stringify({
        _id: req.user._id,
        id: req.user.id,
        role: req.user.role,
        name: req.user.name,
      })
    );

    // Get systems for the current user
    let systems = [];
    if (req.user.role === 'admin') {
      systems = await System.find({});
    } else {
      systems = await System.find({ user: req.user._id });
    }

    // Get vendors and format them properly
    const rawVendors = await Vendor.find({});
    const vendors = rawVendors.map(vendor => ({
      _id: vendor._id.toString(),
      name: vendor.name || 'Unknown Vendor',
    }));

    res.render('subscriptions/add', {
      title: 'Add Subscription',
      systems,
      vendors,
    });
  } catch (err) {
    console.error('Error in /subscriptions/add route:', err);
    req.flash('error_msg', 'Error loading the subscription form');
    res.redirect('/subscriptions');
  }
});

// Add subscription POST route
router.post('/add', ensureAuthenticated, upload.array('attachments', 5), async (req, res) => {
  console.log('============ SUBSCRIPTION ADD - START ============');

  try {
    // Extract form data
    console.log('Subscription form submitted:', req.body);

    const {
      name,
      product,
      vendor,
      type,
      purchaseDate,
      renewalDate,
      seats,
      cost,
      notes,
      status,
      systems: selectedSystems,
    } = req.body;

    // Validate required fields
    const errors = validateSubscriptionData({
      name,
      product,
      vendor,
      purchaseDate,
      renewalDate,
      seats,
      cost,
    });

    if (errors.length > 0) {
      req.flash('error_msg', `Validation errors: ${errors.join(', ')}`);
      return res.redirect('/subscriptions/add');
    }

    // Prepare systems to assign
    let systemsToAssign = [];
    if (selectedSystems) {
      systemsToAssign = Array.isArray(selectedSystems) ? selectedSystems : [selectedSystems];
    }

    // Process uploaded attachments if any
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        uploadDate: new Date(),
      }));
    }

    // Calculate utilization
    const parsedSeats = parseInt(seats) || 0;
    const usedSeats = systemsToAssign.length;
    const utilization = parsedSeats > 0 ? (usedSeats / parsedSeats) * 100 : 0;

    console.log(
      `Subscription utilization: ${usedSeats}/${parsedSeats} seats (${utilization.toFixed(2)}%)`
    );

    // Define subscription data
    const subscriptionData = {
      name,
      product,
      vendor,
      type: type || 'Subscription',
      purchaseDate,
      renewalDate,
      seats: parsedSeats,
      cost: parseFloat(cost) || 0,
      notes,
      status: status || 'Active',
      user: req.user._id,
      assignedSystems: systemsToAssign,
      usedSeats,
      utilization: parseFloat(utilization.toFixed(2)),
      attachments,
    };

    // Create subscription
    console.log('Creating subscription with data:', {
      ...subscriptionData,
      attachments: subscriptionData.attachments
        ? `${subscriptionData.attachments.length} files`
        : 'None',
    });

    const newSubscription = await Subscription.create(subscriptionData);
    console.log('Subscription created with ID:', newSubscription._id);

    // Store subscription ID in session for debugging purposes
    req.session.lastCreatedSubscriptionId = newSubscription._id;

    // Update systems with subscription requirements
    if (systemsToAssign.length > 0) {
      console.log(`Updating ${systemsToAssign.length} systems with subscription requirement`);

      for (const systemId of systemsToAssign) {
        try {
          // Find the system
          const system = await System.findById(systemId);

          if (!system) {
            console.log(`System not found with ID: ${systemId}, skipping`);
            continue;
          }

          // Ensure licenseRequirements exists
          if (!system.licenseRequirements) {
            system.licenseRequirements = [];
            console.log('Initialized empty licenseRequirements array');
          }

          // Check if subscription already exists in requirements
          const licenseExists = system.licenseRequirements.some(req => {
            const reqLicenseId = req.licenseId ? req.licenseId.toString() : '';
            const newSubscriptionId = newSubscription._id ? newSubscription._id.toString() : '';
            const match = reqLicenseId === newSubscriptionId;
            console.log(
              `Subscription comparison: ${reqLicenseId} vs ${newSubscriptionId}, match: ${match}`
            );
            return match;
          });

          if (!licenseExists) {
            console.log(`Adding subscription ${newSubscription._id} to system ${system._id}`);

            // Create a new requirement object
            const newRequirement = {
              licenseType: product || 'Unknown Product',
              quantity: 1,
              licenseId: newSubscription._id,
            };

            // Add to requirements array
            system.licenseRequirements.push(newRequirement);

            // Save system
            await System.findByIdAndUpdate(
              system._id,
              { licenseRequirements: system.licenseRequirements },
              { new: true }
            );

            console.log(`Updated system ${system._id} with new subscription requirement`);
          } else {
            console.log(`Subscription already exists in system ${system._id}, skipping`);
          }
        } catch (err) {
          console.error(`Error updating system ${systemId}:`, err);
        }
      }
    } else {
      console.log('No systems selected for this subscription');
    }

    console.log('============ SUBSCRIPTION ADD - COMPLETE ============');
    req.flash('success_msg', `Subscription added successfully with ID: ${newSubscription._id}`);
    res.redirect('/subscriptions');
  } catch (err) {
    console.error('ERROR adding subscription:', err);
    req.flash('error_msg', 'Error adding subscription: ' + err.message);
    res.redirect('/subscriptions/add');
  }
});

// View single subscription - must come after /add
router.get('/:id/view', ensureAuthenticated, async (req, res) => {
  try {
    if (!req.params.id) {
      console.log('No subscription ID provided');
      req.flash('error', 'No subscription ID provided');
      return res.redirect('/subscriptions');
    }

    console.log('Viewing subscription:', req.params.id);
    const subscription = await Subscription.findById(req.params.id)
      .populate('vendor')
      .populate('system')
      .populate('user', 'name email')
      .lean(); // Convert to plain object

    if (!subscription) {
      console.log('Subscription not found:', req.params.id);
      req.flash('error', 'Subscription not found');
      return res.redirect('/subscriptions');
    }

    // Check if user has permission to view this subscription
    if (subscription.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      console.log('Unauthorized access attempt:', req.user._id);
      req.flash('error', 'You do not have permission to view this subscription');
      return res.redirect('/subscriptions');
    }

    res.render('subscriptions/view', {
      title: 'View Subscription',
      subscription: {
        ...subscription,
        _id: subscription._id.toString(),
        vendor: subscription.vendor
          ? {
              ...subscription.vendor,
              _id: subscription.vendor._id.toString(),
            }
          : null,
        system: subscription.system
          ? {
              ...subscription.system,
              _id: subscription.system._id.toString(),
            }
          : null,
        user: {
          ...subscription.user,
          _id: subscription.user._id.toString(),
        },
      },
      user: req.user,
    });
  } catch (err) {
    console.error('Error viewing subscription:', err);
    req.flash('error', 'Error viewing subscription');
    res.redirect('/subscriptions');
  }
});

// Edit subscription form
router.get('/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    if (!req.params.id) {
      console.log('No subscription ID provided for edit');
      req.flash('error', 'No subscription ID provided');
      return res.redirect('/subscriptions');
    }

    console.log('Loading edit form for subscription:', req.params.id);
    const subscription = await Subscription.findById(req.params.id)
      .populate('vendor')
      .populate('system')
      .lean();

    if (!subscription) {
      console.log('Subscription not found for edit:', req.params.id);
      req.flash('error', 'Subscription not found');
      return res.redirect('/subscriptions');
    }

    // Check if user has permission to edit this subscription
    if (
      subscription.user &&
      subscription.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      console.log('Unauthorized edit attempt:', req.user._id);
      req.flash('error', 'You do not have permission to edit this subscription');
      return res.redirect('/subscriptions');
    }

    // Get all vendors for the dropdown
    const vendors = await Vendor.find({}, 'name').lean();

    res.render('subscriptions/edit', {
      title: 'Edit Subscription',
      subscription,
      vendors,
    });
  } catch (err) {
    console.error('Error loading edit form:', err);
    req.flash('error', 'Error loading edit form');
    res.redirect('/subscriptions');
  }
});

// Update subscription
router.post('/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    if (!req.params.id) {
      console.log('No subscription ID provided for edit');
      req.flash('error', 'No subscription ID provided');
      return res.redirect('/subscriptions');
    }

    console.log('Updating subscription:', req.params.id);
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      console.log('Subscription not found for edit:', req.params.id);
      req.flash('error', 'Subscription not found');
      return res.redirect('/subscriptions');
    }

    // Check if user has permission to edit this subscription
    if (
      subscription.user &&
      subscription.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      console.log('Unauthorized edit attempt:', req.user._id);
      req.flash('error', 'You do not have permission to edit this subscription');
      return res.redirect('/subscriptions');
    }

    // Update subscription data
    let { product, vendor, type, seats, cost, renewalDate, purchaseDate, notes, status, system } = req.body;

    // Handle vendor: if vendor is not an ObjectId (likely a new vendor name), create/find Vendor
    if (vendor && vendor.length && vendor.length < 24) {
      // Vendor is a name, not an ObjectId
      let vendorDoc = await Vendor.findOne({ name: vendor });
      if (!vendorDoc) {
        vendorDoc = await Vendor.create({ name: vendor });
      }
      vendor = vendorDoc._id;
    }

    subscription.product = product;
    subscription.vendor = vendor;
    subscription.type = type;
    subscription.seats = seats;
    subscription.cost = cost;
    subscription.renewalDate = renewalDate;
    subscription.purchaseDate = purchaseDate;
    subscription.notes = notes;
    subscription.status = status;
    subscription.system = system;

    await subscription.save();

    req.flash('success', 'Subscription updated successfully');
    res.redirect(`/subscriptions/${subscription._id}/view`);
  } catch (err) {
    console.error('Error updating subscription:', err);
    req.flash('error', 'Error updating subscription');
    res.redirect(`/subscriptions/${req.params.id}/edit`);
  }
});

// Delete subscription
router.post('/:id/delete', ensureAuthenticated, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      req.flash('error_msg', 'Subscription not found');
      return res.redirect('/subscriptions');
    }

    // Check if user owns this subscription or is admin
    if (subscription.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized to delete this subscription');
      return res.redirect('/subscriptions');
    }

    // Remove subscription from systems
    const allSystems = await System.find({
      'licenseRequirements.licenseId': req.params.id,
    });

    for (const system of allSystems) {
      system.licenseRequirements = system.licenseRequirements.filter(
        req => req.licenseId.toString() !== req.params.id
      );

      await System.findByIdAndUpdate(
        system._id,
        { licenseRequirements: system.licenseRequirements },
        { new: true }
      );
    }

    // Delete the subscription
    await Subscription.findByIdAndDelete(req.params.id);

    req.flash('success_msg', 'Subscription deleted successfully');
    res.redirect('/subscriptions');
  } catch (err) {
    console.error('Error deleting subscription:', err);
    req.flash('error_msg', 'Error deleting subscription: ' + err.message);
    res.redirect('/subscriptions');
  }
});

// Demo subscription
router.get('/demo1', ensureAuthenticated, async (req, res) => {
  try {
    console.log(`Starting demo subscription creation for user ${req.user._id}`);

    // Check if the Subscription model has been properly initialized
    if (!Subscription.debug) {
      console.error('Subscription model missing debug method - model may not be fully initialized');
      req.flash('error_msg', 'Error: Subscription model not properly initialized');
      return res.redirect('/dashboard');
    }

    // Log debug info about the Subscription model
    const modelDebug = Subscription.debug();
    console.log('Subscription model debug info:', JSON.stringify(modelDebug, null, 2));

    // Create a demo subscription using the createDemo method
    console.log('Attempting to create demo subscription...');
    const demoSubscription = await Subscription.createDemo(req.user._id);

    if (!demoSubscription) {
      console.error('createDemo returned null or undefined');
      req.flash('error_msg', 'Failed to create demo subscription - null result returned');
      return res.redirect('/dashboard');
    }

    console.log(`Demo subscription created with ID: ${demoSubscription._id}`);
    req.flash('success_msg', 'Demo subscription created successfully!');
    res.redirect(`/subscriptions/view/${demoSubscription._id}`);
  } catch (err) {
    console.error('Error creating demo subscription:', err);
    req.flash('error_msg', 'Error creating demo subscription: ' + err.message);
    res.redirect('/dashboard');
  }
});

module.exports = router;
