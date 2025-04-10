const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { ensureAuthenticated, ensureManager } = require('../middleware/auth');
const License = require('../models/License');
const System = require('../models/System');
const Vendor = require('../models/Vendor'); // Add this line

// Set up storage for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = './data/uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const filetypes = /csv|xlsx|pdf|jpg|jpeg|png|doc|docx/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: File upload only supports the following filetypes - CSV, XLSX, PDF, JPG, JPEG, PNG, DOC, DOCX');
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

// Helper function to safely convert IDs to strings for comparison
function safeIdToString(id) {
  if (!id) return '';
  return typeof id === 'object' && id.toString ? id.toString() : String(id);
}

// Helper function for debugging
function logObject(label, obj) {
  console.log(`=== ${label} ===`);
  if (typeof obj === 'undefined') {
    console.log('UNDEFINED');
  } else if (obj === null) {
    console.log('NULL');
  } else {
    console.log(JSON.stringify(obj, (key, value) => 
      typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 20
        ? '[Object with many properties]'
        : value
    , 2));
  }
  console.log(`=== END ${label} ===`);
}

// Get all licenses
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    console.log('User ID for license query:', req.user._id);
    
    // Create base query
    let baseQuery = { owner: req.user._id }; // Query for all licenses owned by user
 
    // Filter by status if provided
    let displayQuery = { ...baseQuery }; // Query for licenses to display (with filters)
    if (req.query.status && req.query.status !== 'all') {
      displayQuery.status = req.query.status;
    }
    
    // Fetch all user licenses for distinct values first
    const allUserLicenses = await License.find(baseQuery);
    
    // Find matching licenses
    console.log('License display query:', displayQuery);
    let licenses = await License.find(displayQuery); // Added await
    console.log('Found licenses:', licenses.length);
    
    // Apply manual filtering for text search (product & vendor)
    if (req.query.product) {
      const productRegex = new RegExp(req.query.product, 'i');
      licenses = licenses.filter(license => productRegex.test(license.product));
    }
    
    if (req.query.vendor) {
      const vendorRegex = new RegExp(req.query.vendor, 'i');
      licenses = licenses.filter(license => vendorRegex.test(license.vendor));
    }
      
    // Sort by expiry date
    licenses.sort((a, b) => {
      const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date();
      const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date();
      return dateA - dateB;
    });
    
    // Populate assigned systems
    licenses = await License.populate(licenses, 'assignedSystems');
    
    // Get unique products and vendors for filter dropdowns
    const products = [...new Set(allUserLicenses.map(lic => lic.product).filter(Boolean))].sort();
    const vendors = [...new Set(allUserLicenses.map(lic => lic.vendor).filter(Boolean))].sort();
    
    res.render('licenses/index', {
      title: 'Licenses',
      licenses,
      products,
      vendors,
      filters: req.query
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading licenses');
    res.redirect('/dashboard');
  }
});

// Add license form
router.get('/add', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Loading systems for license form, user:', JSON.stringify({
      _id: req.user._id,
      id: req.user.id, 
      role: req.user.role,
      name: req.user.name
    }));
    
    // Use the new findByManager method for regular users or find all for admins
    let systems = [];
    if (req.user.role === 'admin') {
      systems = await System.find({});
    } else {
      systems = await System.findByManager(req.user._id);
    }
    
    // Get all vendors
    const vendors = await Vendor.find({});
    
    // Sort systems by name
    systems.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    
    console.log(`Found ${systems.length} systems for user ${req.user._id}`);
    console.log(`Found ${vendors.length} vendors`);
    
    res.render('licenses/add', {
      title: 'Add License',
      systems,
      vendors,
      selectedVendor: req.query.vendor || ''
    });
  } catch (err) {
    console.error('Error in /licenses/add route:', err);
    req.flash('error_msg', 'Error loading systems and vendors');
    res.redirect('/licenses');
  }
});

// Add license
router.post('/', ensureAuthenticated, upload.array('attachments', 5), async (req, res) => {
  console.log('============ LICENSE ADD - START ============');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Files:', req.files ? req.files.length : 'none');
  console.log('User:', req.user._id);
  
  try {
    console.log('License form submitted:', req.body);
    
    // Get form data
    const {
      name,
      licenseKey,
      product,
      vendor,
      purchaseDate,
      expiryDate,
      renewalDate,
      totalSeats,
      cost,
      currency,
      notes,
      assignedSystems,
      status
    } = req.body;
    
    console.log('Current user:', req.user);
    
    // Create attachments array if files were uploaded
    const attachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      path: file.path,
      uploadDate: Date.now()
    })) : [];
    
    // Define license data
    const licenseData = {
      name: name || product, // Use product name as fallback
      licenseKey,
      product,
      vendor,
      purchaseDate,
      expiryDate: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year from now
      totalSeats: totalSeats || 1,
      status: status || 'active',
      cost: cost || undefined,
      currency: currency || 'USD',
      notes,
      attachments,
      owner: req.user._id
    };
    
    // VERBOSE: Log assigned systems data
    console.log('Raw assignedSystems from form:', req.body.assignedSystems);
    
    // Handle assignedSystems properly - extract from form data
    let systemsToAssign = [];
    
    if (req.body.assignedSystems) {
      // Convert to array if needed
      if (Array.isArray(req.body.assignedSystems)) {
        systemsToAssign = [...req.body.assignedSystems];
      } else if (typeof req.body.assignedSystems === 'string') {
        systemsToAssign = [req.body.assignedSystems];
      } else if (typeof req.body.assignedSystems === 'object') {
        systemsToAssign = Object.values(req.body.assignedSystems);
      }
      
      // Filter out empty values
      systemsToAssign = systemsToAssign.filter(id => id && String(id).trim() !== '');
      
      console.log('Parsed systemsToAssign:', systemsToAssign);
    }
    
    // Calculate utilization metrics
    const usedSeats = systemsToAssign.length;
    const parsedTotalSeats = parseInt(totalSeats) || 1;
    const utilization = Math.min(100, (usedSeats / parsedTotalSeats) * 100);
    
    console.log(`License utilization: ${usedSeats}/${parsedTotalSeats} seats (${utilization.toFixed(2)}%)`);
    
    // Add utilization to license data
    licenseData.assignedSystems = systemsToAssign;
    licenseData.usedSeats = usedSeats;
    licenseData.totalSeats = parsedTotalSeats;
    licenseData.utilization = parseFloat(utilization.toFixed(2));
    
    // Create license
    console.log('Creating license with data:', {
      ...licenseData,
      attachments: licenseData.attachments ? `${licenseData.attachments.length} files` : 'None',
      assignedSystems: `${systemsToAssign.length} systems`
    });
    
    const newLicense = await License.create(licenseData);
    console.log('License created with ID:', newLicense._id);
    
    // Store license ID in session for debugging purposes
    req.session.lastCreatedLicenseId = newLicense._id;
    
    // Update systems with license requirements
    if (systemsToAssign.length > 0) {
      console.log(`Updating ${systemsToAssign.length} systems with license requirement`);
      
      for (const systemId of systemsToAssign) {
        try {
          console.log(`Processing system ID: ${systemId}`);
          const system = await System.findById(systemId);
          
          if (system) {
            console.log(`Found system: ${system.name || system._id}`);
            logObject('System Object Before Update', system);
            
            // Ensure licenseRequirements exists
            if (!system.licenseRequirements) {
              system.licenseRequirements = [];
              console.log('Initialized empty licenseRequirements array');
            }
            
            // Check if license already exists in requirements
            const licenseExists = system.licenseRequirements.some(req => {
              const reqLicenseId = req.licenseId ? req.licenseId.toString() : '';
              const newLicenseId = newLicense._id ? newLicense._id.toString() : '';
              const match = reqLicenseId === newLicenseId;
              console.log(`License comparison: ${reqLicenseId} vs ${newLicenseId}, match: ${match}`);
              return match;
            });
            
            if (!licenseExists) {
              console.log(`Adding license ${newLicense._id} to system ${system._id}`);
              
              // Create new requirement
              const newRequirement = {
                licenseType: product || 'Unknown Product',
                quantity: 1,
                licenseId: newLicense._id
              };
              console.log('New requirement:', newRequirement);
              
              // Push to array
              system.licenseRequirements.push(newRequirement);
              
              // Save updated system
              const updatedSystem = await System.findByIdAndUpdate(
                systemId, 
                { licenseRequirements: system.licenseRequirements },
                { new: true }
              );
              
              console.log(`System ${system._id} updated successfully`);
              logObject('System Object After Update', updatedSystem);
            } else {
              console.log(`License already exists in system ${system._id}, skipping`);
            }
          } else {
            console.log(`WARNING: System with ID ${systemId} not found`);
          }
        } catch (sysErr) {
          console.error(`ERROR updating system ${systemId}:`, sysErr);
          // Continue with other systems
        }
      }
    }
    
    console.log('============ LICENSE ADD - COMPLETE ============');
    req.flash('success_msg', `License added successfully with ID: ${newLicense._id}`);
    res.redirect('/licenses');
  } catch (err) {
    console.error('ERROR adding license:', err);
    req.flash('error_msg', 'Error adding license: ' + err.message);
    res.redirect('/licenses/add');
  }
});

// Edit license form
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    console.log(`Attempting to edit license with ID: ${req.params.id}`);
    
    const license = await License.findById(req.params.id);
    
    if (!license) {
      console.error(`License not found with ID: ${req.params.id}`);
      console.log('Last created license ID:', req.session.lastCreatedLicenseId);
      console.log('All available license IDs:');
      
      // Get all licenses to debug ID issue
      const allLicenses = await License.find({});
      allLicenses.forEach((lic, index) => {
        console.log(`${index+1}. License ID: ${lic._id}, Name: ${lic.name || lic.product}`);
      });
      
      req.flash('error_msg', `License not found with ID: ${req.params.id}`);
      return res.redirect('/licenses');
    }
    
    console.log(`Found license to edit: ${license.name || license.product} (ID: ${license._id})`);
    
    // Use the new findByManager method for regular users or find all for admins
    let systems = [];
    if (req.user.role === 'admin') {
      systems = await System.find({});
    } else {
      systems = await System.findByManager(req.user._id);
    }
    
    // Get all vendors
    const vendors = await Vendor.find({});
    
    // Sort systems by name
    systems.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    
    res.render('licenses/edit', {
      title: 'Edit License',
      license,
      systems,
      vendors
    });
  } catch (err) {
    console.error('Error in edit license route:', err);
    req.flash('error_msg', 'Error loading license: ' + err.message);
    res.redirect('/licenses');
  }
});

module.exports = router;