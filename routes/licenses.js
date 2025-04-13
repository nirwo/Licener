const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const License = require('../models/License');
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

// Helper function to validate license data
function validateLicenseData(data) {
  const errors = [];
  
  if (!data.product) errors.push('Product name is required');
  if (!data.vendor) errors.push('Vendor is required');
  if (!data.licenseKey) errors.push('License key is required');
  
  if (data.totalSeats && isNaN(parseInt(data.totalSeats))) {
    errors.push('Total seats must be a number');
  }
  
  if (data.cost && isNaN(parseFloat(data.cost))) {
    errors.push('Cost must be a number');
  }
  
  if (data.purchaseDate && isNaN(Date.parse(data.purchaseDate))) {
    errors.push('Invalid purchase date format');
  }
  
  if (data.expiryDate && isNaN(Date.parse(data.expiryDate))) {
    errors.push('Invalid expiry date format');
  }
  
  return errors;
}

// Helper function to sanitize license data
function sanitizeLicenseData(data) {
  return {
    ...data,
    name: sanitizeHtml(data.name || ''),
    product: sanitizeHtml(data.product || ''),
    vendor: sanitizeHtml(data.vendor || ''),
    licenseKey: sanitizeHtml(data.licenseKey || ''),
    notes: sanitizeHtml(data.notes || ''),
    status: sanitizeHtml(data.status || 'active'),
    currency: sanitizeHtml(data.currency || 'USD')
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

// Get all licenses with improved filtering and pagination
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Create base query
    let baseQuery = { owner: req.user._id };
    
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
    const total = await License.countDocuments(baseQuery);
    
    // Find licenses with pagination
    let licenses = await License.find(baseQuery)
      .skip(skip)
      .limit(limit)
      .sort({ expiryDate: 1 });
    
    // Populate assigned systems
    licenses = await License.populate(licenses, 'assignedSystems');
    
    // Get unique products and vendors for filter dropdowns
    const allUserLicenses = await License.find({ owner: req.user._id });
    const products = [...new Set(allUserLicenses.map(lic => lic.product).filter(Boolean))].sort();
    const vendors = [...new Set(allUserLicenses.map(lic => lic.vendor).filter(Boolean))].sort();
    
    res.render('licenses/index', {
      title: 'Licenses',
      licenses,
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
    logObject('License List Error', err, 'error');
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

// View license details
router.get('/view/:id', ensureAuthenticated, async (req, res) => {
  try {
    console.log(`Viewing license with ID: ${req.params.id}`);
    let license = await License.findById(req.params.id);
    
    if (!license) {
      console.error(`License not found with ID: ${req.params.id}`);
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // Populate assigned systems
    console.log('Populating license data for ID:', license._id);
    license = await License.populate(license, 'assignedSystems');
    license = await License.populate(license, 'owner');
    
    res.render('licenses/view', {
      title: license.name || license.product,
      license
    });
  } catch (err) {
    console.error('Error viewing license:', err);
    req.flash('error_msg', 'Error loading license: ' + err.message);
    res.redirect('/licenses');
  }
});

// Update license
router.put('/:id', ensureAuthenticated, upload.array('attachments', 5), async (req, res) => {
  try {
    console.log('License update request received for ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Ensure License is properly defined
    if (!License || typeof License.findById !== 'function') {
      console.error('License model is not properly defined or imported');
      console.error('License:', License);
      req.flash('error_msg', 'System error: License model not available');
      return res.redirect('/licenses');
    }
    
    // Get original license first
    const license = await License.findById(req.params.id);
    
    if (!license) {
      console.error(`License not found with ID: ${req.params.id}`);
      
      // Debug: List all available licenses
      try {
        const allLicenses = await License.find({});
        console.log(`Found ${allLicenses.length} total licenses`);
        allLicenses.forEach((lic, i) => {
          console.log(`${i+1}. ID: ${lic._id}, Name: ${lic.name || lic.product}`);
        });
      } catch (err) {
        console.error('Error listing licenses:', err);
      }
      
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // ...existing code for updating license...
    
  } catch (err) {
    console.error('Error in license update route:', err);
    req.flash('error_msg', 'Error updating license: ' + err.message);
    res.redirect(`/licenses/edit/${req.params.id}`);
  }
});

// Import licenses from Excel
router.post('/import', ensureAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'No file uploaded');
      return res.redirect('/licenses');
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    let licenses = [];
    
    if (fileExt === '.xlsx') {
      licenses = await readExcelFile(filePath);
    } else if (fileExt === '.csv') {
      licenses = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    }

    // Process each license
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const licenseData of licenses) {
      try {
        // Map Excel/CSV columns to license fields
        const mappedData = {
          name: licenseData.name || licenseData.product,
          product: licenseData.product,
          vendor: licenseData.vendor,
          licenseKey: licenseData.licenseKey,
          purchaseDate: licenseData.purchaseDate,
          expiryDate: licenseData.expiryDate,
          totalSeats: parseInt(licenseData.totalSeats) || 1,
          cost: parseFloat(licenseData.cost),
          currency: licenseData.currency || 'USD',
          notes: licenseData.notes,
          status: licenseData.status || 'active',
          owner: req.user._id
        };

        // Create the license
        await License.create(mappedData);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          row: licenseData,
          error: err.message
        });
      }
    }

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    req.flash('success_msg', `Successfully imported ${results.success} licenses. ${results.failed} failed.`);
    if (results.failed > 0) {
      req.flash('error_msg', `Failed to import ${results.failed} licenses. Check the logs for details.`);
    }
    res.redirect('/licenses');
  } catch (err) {
    console.error('Error importing licenses:', err);
    req.flash('error_msg', 'Error importing licenses: ' + err.message);
    res.redirect('/licenses');
  }
});

// Export licenses to Excel with improved formatting
router.get('/export', ensureAuthenticated, async (req, res) => {
  try {
    const licenses = await License.find({ owner: req.user._id });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Licenses');
    
    // Define columns with improved formatting
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'Vendor', key: 'vendor', width: 20 },
      { header: 'License Key', key: 'licenseKey', width: 40 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 15 },
      { header: 'Expiry Date', key: 'expiryDate', width: 15 },
      { header: 'Total Seats', key: 'totalSeats', width: 12 },
      { header: 'Used Seats', key: 'usedSeats', width: 12 },
      { header: 'Utilization', key: 'utilization', width: 12 },
      { header: 'Cost', key: 'cost', width: 12 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];
    
    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Add data with conditional formatting
    licenses.forEach(license => {
      const row = worksheet.addRow({
        name: license.name,
        product: license.product,
        vendor: license.vendor,
        licenseKey: license.licenseKey,
        purchaseDate: license.purchaseDate ? new Date(license.purchaseDate).toISOString().split('T')[0] : '',
        expiryDate: license.expiryDate ? new Date(license.expiryDate).toISOString().split('T')[0] : '',
        totalSeats: license.totalSeats,
        usedSeats: license.usedSeats,
        utilization: license.utilization ? `${license.utilization}%` : '',
        cost: license.cost,
        currency: license.currency,
        status: license.status,
        notes: license.notes
      });
      
      // Add conditional formatting for expiry dates
      if (license.expiryDate) {
        const expiryDate = new Date(license.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 30) {
          row.getCell('expiryDate').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' }
          };
        } else if (daysUntilExpiry <= 90) {
          row.getCell('expiryDate').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' }
          };
        }
      }
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=licenses.xlsx');
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logObject('Export Error', err, 'error');
    req.flash('error_msg', 'Error exporting licenses: ' + err.message);
    res.redirect('/licenses');
  }
});

// Demo license route
router.get('/demo1', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Accessing demo license route for user:', req.user._id);
    
    // Ensure License model is properly loaded
    if (!License || typeof License.createDemo !== 'function') {
      console.error('License model is not properly configured or createDemo method is missing');
      console.log('License model properties:', Object.keys(License));
      req.flash('error_msg', 'System error: License model not properly configured');
      return res.redirect('/licenses');
    }
    
    // Convert user._id to string for consistent comparison
    const userId = req.user._id.toString();
    console.log(`Using user ID for demo license: ${userId}`);
    
    // Use the createDemo method to create or retrieve a demo license
    let demoLicense = null;
    try {
      demoLicense = await License.createDemo(userId);
      console.log('Demo license returned from createDemo:', demoLicense ? demoLicense._id : 'null');
    } catch (createErr) {
      console.error('Error calling License.createDemo:', createErr);
      throw new Error(`Failed to create demo license: ${createErr.message}`);
    }
    
    if (!demoLicense) {
      console.error('Demo license was not created/found');
      req.flash('error_msg', 'Unable to create or find demo license');
      return res.redirect('/licenses');
    }
    
    // Populate related data
    const populatedLicense = await License.populate(demoLicense, 'assignedSystems');
    
    console.log('Demo license created/retrieved successfully:', demoLicense._id);
    
    res.render('licenses/view', {
      title: 'Demo License 1',
      license: populatedLicense
    });
  } catch (err) {
    console.error('Error in demo license route:', err);
    req.flash('error_msg', 'Error loading demo license: ' + err.message);
    res.redirect('/licenses');
  }
});

module.exports = router;