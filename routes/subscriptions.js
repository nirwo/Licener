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
      result.subscription = subscription.length > 0 ? 'Found subscription' : 'No subscriptions found';
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

// Set up storage for file uploads with better security
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = './data/uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueId = uuidv4();
    const sanitizedFilename = sanitizeFilename(file.originalname);
    cb(null, `${uniqueId}-${sanitizedFilename}`);
  }
});

// Improved file filter with better security
const fileFilter = (req, file, cb) => {
  const allowedFiletypes = /csv|xlsx|pdf|jpg|jpeg|png|doc|docx/;
  const extname = allowedFiletypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFiletypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV, XLSX, PDF, JPG, JPEG, PNG, DOC, DOCX files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
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
    typeof obj === 'undefined' ? 'UNDEFINED' :
    obj === null ? 'NULL' :
    JSON.stringify(obj, (key, value) => 
      typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 20
        ? '[Object with many properties]'
        : value
    , 2)
  }\n=== END ${label} ===`;
  
  console.log(logMessage);
  
  // Write to log file
  const logDir = './logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
  }
  
  fs.appendFileSync(
    path.join(logDir, 'app.log'),
    logMessage + '\n',
    { encoding: 'utf8' }
  );
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
    type: sanitizeHtml(data.type || 'Subscription')
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

// Get all subscriptions with improved filtering and pagination
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Create base query
    let baseQuery = { user: req.user._id };
    
    // Apply filters
    if (req.query.status && req.query.status !== 'all') {
      baseQuery.status = req.query.status;
    }
    
    if (req.query.product) {
      baseQuery.product = new RegExp(req.query.product, 'i');
    }
    
    if (req.query.vendor) {
      baseQuery.vendor = new RegExp(req.query.vendor, 'i');
    }
    
    // Get total count for pagination
    const total = await Subscription.countDocuments(baseQuery);
    
    // Find subscriptions with pagination
    let subscriptions = await Subscription.find(baseQuery)
      .skip(skip)
      .limit(limit)
      .sort({ renewalDate: 1 });
    
    // Populate assigned systems
    subscriptions = await Subscription.populate(subscriptions, 'assignedSystems');
    
    // Get unique products and vendors for filter dropdowns
    const allUserSubscriptions = await Subscription.find({ user: req.user._id });
    const products = [...new Set(allUserSubscriptions.map(sub => sub.product).filter(Boolean))].sort();
    const vendors = [...new Set(allUserSubscriptions.map(sub => sub.vendor).filter(Boolean))].sort();
    
    res.render('subscriptions/index', {
      title: 'Subscriptions',
      subscriptions,
      products,
      vendors,
      filters: req.query,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logObject('Subscription List Error', err, 'error');
    req.flash('error_msg', 'Error loading subscriptions');
    res.redirect('/dashboard');
  }
});

// Add subscription form
router.get('/add', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Loading systems for subscription form, user:', JSON.stringify({
      _id: req.user._id,
      id: req.user.id, 
      role: req.user.role,
      name: req.user.name
    }));
    
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
      name: vendor.name || 'Unknown Vendor'
    }));
    
    res.render('subscriptions/add', {
      title: 'Add Subscription',
      systems,
      vendors
    });
  } catch (err) {
    console.error('Error in /subscriptions/add route:', err);
    req.flash('error_msg', 'Error loading the subscription form');
    res.redirect('/subscriptions');
  }
});

// Add subscription
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
      systems: selectedSystems
    } = req.body;
    
    // Validate required fields
    const errors = validateSubscriptionData({
      name,
      product,
      vendor,
      purchaseDate,
      renewalDate,
      seats,
      cost
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
        uploadDate: new Date()
      }));
    }
    
    // Calculate utilization
    const parsedSeats = parseInt(seats) || 0;
    const usedSeats = systemsToAssign.length;
    const utilization = parsedSeats > 0 ? (usedSeats / parsedSeats) * 100 : 0;
    
    console.log(`Subscription utilization: ${usedSeats}/${parsedSeats} seats (${utilization.toFixed(2)}%)`);
    
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
      attachments
    };
    
    // Create subscription
    console.log('Creating subscription with data:', {
      ...subscriptionData,
      attachments: subscriptionData.attachments ? `${subscriptionData.attachments.length} files` : 'None',
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
            console.log(`Subscription comparison: ${reqLicenseId} vs ${newSubscriptionId}, match: ${match}`);
            return match;
          });
          
          if (!licenseExists) {
            console.log(`Adding subscription ${newSubscription._id} to system ${system._id}`);
            
            // Create a new requirement object
            const newRequirement = {
              licenseType: product || 'Unknown Product',
              quantity: 1,
              licenseId: newSubscription._id
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

// View subscription
router.get('/view/:id', ensureAuthenticated, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      req.flash('error_msg', 'Subscription not found');
      return res.redirect('/subscriptions');
    }
    
    // Check if user owns this subscription or is admin
    if (subscription.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized to view this subscription');
      return res.redirect('/subscriptions');
    }
    
    // Populate assigned systems
    const populatedSubscription = await Subscription.populate(subscription, 'assignedSystems');
    
    res.render('subscriptions/view', {
      title: 'View Subscription',
      subscription: populatedSubscription
    });
  } catch (err) {
    console.error('Error viewing subscription:', err);
    req.flash('error_msg', 'Error loading subscription details');
    res.redirect('/subscriptions');
  }
});

// Edit subscription form
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    console.log(`Attempting to edit subscription with ID: ${req.params.id}`);
    
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      req.flash('error_msg', 'Subscription not found');
      return res.redirect('/subscriptions');
    }
    
    // Check if user owns this subscription or is admin
    if (subscription.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized to edit this subscription');
      return res.redirect('/subscriptions');
    }
    
    // Get all systems and vendors for the form
    let systems = [];
    if (req.user.role === 'admin') {
      systems = await System.find({});
    } else {
      systems = await System.find({ user: req.user._id });
    }
    
    // Get vendors
    const vendors = await Vendor.find({});
    
    // Prepare the selected systems array for multi-select
    const assignedSystemIds = subscription.assignedSystems 
      ? subscription.assignedSystems.map(sys => typeof sys === 'object' ? sys._id.toString() : sys.toString())
      : [];
    
    res.render('subscriptions/edit', {
      title: 'Edit Subscription',
      subscription,
      systems,
      vendors,
      assignedSystemIds
    });
  } catch (err) {
    console.error('Error in edit subscription form:', err);
    req.flash('error_msg', 'Error loading subscription edit form');
    res.redirect('/subscriptions');
  }
});

// Update subscription
router.post('/edit/:id', ensureAuthenticated, upload.array('attachments', 5), async (req, res) => {
  try {
    console.log(`Updating subscription with ID: ${req.params.id}`);
    
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      req.flash('error_msg', 'Subscription not found');
      return res.redirect('/subscriptions');
    }
    
    // Check if user owns this subscription or is admin
    if (subscription.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized to edit this subscription');
      return res.redirect('/subscriptions');
    }
    
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
      systems: selectedSystems
    } = req.body;
    
    // Validate input
    const errors = validateSubscriptionData({
      name,
      product,
      vendor,
      purchaseDate,
      renewalDate,
      seats,
      cost
    });
    
    if (errors.length > 0) {
      req.flash('error_msg', `Validation errors: ${errors.join(', ')}`);
      return res.redirect(`/subscriptions/edit/${req.params.id}`);
    }
    
    // Process uploaded attachments if any
    let attachments = subscription.attachments || [];
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        uploadDate: new Date()
      }));
      
      attachments = [...attachments, ...newAttachments];
    }
    
    // Prepare systems to assign
    let systemsToAssign = [];
    if (selectedSystems) {
      systemsToAssign = Array.isArray(selectedSystems) ? selectedSystems : [selectedSystems];
    }
    
    // Calculate utilization
    const parsedSeats = parseInt(seats) || 0;
    const usedSeats = systemsToAssign.length;
    const utilization = parsedSeats > 0 ? (usedSeats / parsedSeats) * 100 : 0;
    
    // Update subscription data
    subscription.name = name;
    subscription.product = product;
    subscription.vendor = vendor;
    subscription.type = type || 'Subscription';
    subscription.purchaseDate = purchaseDate;
    subscription.renewalDate = renewalDate;
    subscription.seats = parsedSeats;
    subscription.cost = parseFloat(cost) || 0;
    subscription.notes = notes;
    subscription.status = status || 'Active';
    subscription.assignedSystems = systemsToAssign;
    subscription.usedSeats = usedSeats;
    subscription.utilization = parseFloat(utilization.toFixed(2));
    subscription.attachments = attachments;
    subscription.updatedAt = new Date();
    
    // Save updated subscription
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      subscription,
      { new: true }
    );
    
    console.log(`Subscription updated: ${updatedSubscription._id}`);
    
    // Update systems with subscription requirements
    // Remove this subscription from all systems first
    const allSystems = await System.find({
      'licenseRequirements.licenseId': req.params.id
    });
    
    for (const system of allSystems) {
      // Filter out this subscription from requirements
      system.licenseRequirements = system.licenseRequirements.filter(req => 
        req.licenseId.toString() !== req.params.id
      );
      
      await System.findByIdAndUpdate(
        system._id,
        { licenseRequirements: system.licenseRequirements },
        { new: true }
      );
    }
    
    // Now add the subscription back to selected systems
    if (systemsToAssign.length > 0) {
      for (const systemId of systemsToAssign) {
        try {
          const system = await System.findById(systemId);
          
          if (!system) {
            console.log(`System not found with ID: ${systemId}, skipping`);
            continue;
          }
          
          if (!system.licenseRequirements) {
            system.licenseRequirements = [];
          }
          
          // Add subscription to requirements if not already there
          const requirementExists = system.licenseRequirements.some(req => 
            req.licenseId && req.licenseId.toString() === req.params.id
          );
          
          if (!requirementExists) {
            system.licenseRequirements.push({
              licenseType: product || 'Unknown Product',
              quantity: 1,
              licenseId: req.params.id
            });
            
            await System.findByIdAndUpdate(
              system._id,
              { licenseRequirements: system.licenseRequirements },
              { new: true }
            );
          }
        } catch (err) {
          console.error(`Error updating system ${systemId}:`, err);
        }
      }
    }
    
    req.flash('success_msg', 'Subscription updated successfully');
    res.redirect(`/subscriptions/view/${req.params.id}`);
  } catch (err) {
    console.error('Error updating subscription:', err);
    req.flash('error_msg', 'Error updating subscription: ' + err.message);
    res.redirect(`/subscriptions/edit/${req.params.id}`);
  }
});

// Delete subscription
router.post('/delete/:id', ensureAuthenticated, async (req, res) => {
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
      'licenseRequirements.licenseId': req.params.id
    });
    
    for (const system of allSystems) {
      system.licenseRequirements = system.licenseRequirements.filter(req => 
        req.licenseId.toString() !== req.params.id
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