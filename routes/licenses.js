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
    
    // Sort systems by name
    systems.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    
    console.log(`Found ${systems.length} systems for user ${req.user._id}`);
    
    res.render('licenses/add', {
      title: 'Add License',
      systems
    });
  } catch (err) {
    console.error('Error in /licenses/add route:', err);
    req.flash('error_msg', 'Error loading systems');
    res.redirect('/licenses');
  }
});

// Add license
router.post('/', ensureAuthenticated, upload.array('attachments', 5), async (req, res) => {
  console.log('License POST request received - START');
  console.log('Request body:', req.body);
  console.log('Files:', req.files);
  console.log('User:', req.user);
  
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
    
    // Handle assignedSystems (could be string or array depending on form submission)
    let systemsToAssign = [];
    if (assignedSystems) {
      // Convert to array if it's a single string value
      systemsToAssign = Array.isArray(assignedSystems) ? assignedSystems : [assignedSystems];
      // Filter out empty strings
      systemsToAssign = systemsToAssign.filter(id => id && id.trim() !== '');
    }
    
    licenseData.assignedSystems = systemsToAssign;
    licenseData.usedSeats = systemsToAssign.length;
    
    console.log('Creating license with data:', licenseData);
    console.log('Systems to assign:', systemsToAssign);
    
    // Use file-db create method
    const newLicense = await License.create(licenseData);
    
    // Update assigned systems with the license requirement
    if (systemsToAssign.length > 0) {
      console.log(`Updating ${systemsToAssign.length} systems with license requirement`);
      
      for (const systemId of systemsToAssign) {
        const system = await System.findById(systemId);
        if (system) {
          console.log(`Updating system ${system.name} with license requirement`);
          
          if (!system.licenseRequirements) {
            system.licenseRequirements = [];
          }
          
          // Check if this license is already in requirements
          const existingReq = system.licenseRequirements.find(
            req => req.licenseId && req.licenseId.toString() === newLicense._id.toString()
          );
          
          if (!existingReq) {
            system.licenseRequirements.push({
              licenseType: product,
              quantity: 1,
              licenseId: newLicense._id
            });
            
            await System.findByIdAndUpdate(systemId, {
              licenseRequirements: system.licenseRequirements
            });
            console.log(`Added license ${product} to system ${system.name}`);
          }
        }
      }
    }
    
    req.flash('success_msg', 'License added successfully');
    res.redirect('/licenses');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error adding license');
    res.redirect('/licenses/add');
  }
});

// View license details
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    let license = await License.findById(req.params.id);
    
    if (!license) {
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // Populate the necessary fields using the static method
    // Ensure License.populate can handle multiple fields if needed, or call separately
    // Assuming populate modifies the object in place or returns the populated object
    license = await License.populate(license, 'assignedSystems'); // Populate systems
    license = await License.populate(license, 'owner'); // Populate owner

    // Debugging: Log values before authorization check
    console.log('View License - License Object:', JSON.stringify(license, null, 2));
    console.log('View License - license?.owner?._id:', license?.owner?._id);
    console.log('View License - req.user.id:', req.user.id);
    console.log('View License - req.user.role:', req.user.role);

    // Check if user is owner or admin with better error handling
    // Note: Accessing populated owner ID might differ slightly depending on populate implementation
    const licenseOwnerId = license?.owner?._id ? license.owner._id.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    if (!license || !license.owner || (licenseOwnerId !== currentUserId && req.user.role !== 'admin')) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/licenses');
    }
    
    res.render('licenses/view', {
      title: license.name,
      license
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading license');
    res.redirect('/licenses');
  }
});

// Edit license form
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // Check if user is owner or admin with better error handling
    const licenseOwnerId = license.owner ? license.owner.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    if (licenseOwnerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/licenses');
    }
    
    // Use the new findByManager method for regular users or find all for admins
    let systems = [];
    if (req.user.role === 'admin') {
      systems = await System.find({});
    } else {
      systems = await System.findByManager(req.user._id);
    }
    
    // Sort systems by name
    systems.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    
    res.render('licenses/edit', {
      title: 'Edit License',
      license,
      systems
    });
  } catch (err) {
    console.error('Error in edit license route:', err);
    req.flash('error_msg', 'Error loading license');
    res.redirect('/licenses');
  }
});

// Update license
router.put('/:id', ensureAuthenticated, upload.array('attachments', 5), async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // Check if user is owner or admin with better error handling
    const licenseOwnerId = license.owner ? license.owner.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    if (licenseOwnerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/licenses');
    }
    
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
    
    // Add new attachments if files were uploaded
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        uploadDate: Date.now()
      }));
      
      license.attachments = [...license.attachments, ...newAttachments];
    }
    
    // Update license fields
    license.name = name;
    license.licenseKey = licenseKey;
    license.product = product;
    license.vendor = vendor;
    license.purchaseDate = purchaseDate;
    license.expiryDate = expiryDate;
    license.renewalDate = renewalDate || undefined;
    license.totalSeats = totalSeats;
    license.cost = cost || undefined;
    license.currency = currency || 'USD';
    license.notes = notes;
    
    if (status) {
      license.status = status;
    }
    
    // Handle assigned systems
    const oldAssignedSystems = license.assignedSystems.map(system => system.toString());
    const newAssignedSystems = assignedSystems || [];
    
    // Systems to remove
    const systemsToRemove = oldAssignedSystems.filter(system => !newAssignedSystems.includes(system));
    
    // Systems to add
    const systemsToAdd = newAssignedSystems.filter(system => !oldAssignedSystems.includes(system));
    
    // Update license with new assigned systems
    license.assignedSystems = newAssignedSystems;
    license.usedSeats = newAssignedSystems.length;
    
    await license.save();
    
    // Remove license from systems that are no longer assigned
    if (systemsToRemove.length > 0) {
      await System.updateMany(
        { _id: { $in: systemsToRemove } },
        { 
          $pull: { 
            licenseRequirements: {
              licenseId: license._id
            }
          }
        }
      );
    }
    
    // Add license to newly assigned systems
    if (systemsToAdd.length > 0) {
      await System.updateMany(
        { _id: { $in: systemsToAdd } },
        { 
          $push: { 
            licenseRequirements: {
              licenseType: product,
              quantity: 1,
              licenseId: license._id
            }
          }
        }
      );
    }
    
    req.flash('success_msg', 'License updated successfully');
    res.redirect(`/licenses/${license._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating license');
    res.redirect(`/licenses/edit/${req.params.id}`);
  }
});

// Delete license
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    console.log(`DELETE request received for license ID: ${req.params.id}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Original URL: ${req.originalUrl}`);
    console.log(`Request body:`, req.body);
    
    const license = await License.findById(req.params.id);
    
    if (!license) {
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // Check if user is owner or admin with better error handling
    const licenseOwnerId = license.owner ? license.owner.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    if (licenseOwnerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/licenses');
    }
    
    // Remove license references from systems
    await System.updateMany(
      { licenseRequirements: { $elemMatch: { licenseId: license._id } } },
      { $pull: { licenseRequirements: { licenseId: license._id } } }
    );
    
    // Delete attachments from filesystem
    if (license.attachments && license.attachments.length > 0) {
      license.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      });
    }
    
    await License.findByIdAndDelete(req.params.id);
    
    req.flash('success_msg', 'License deleted successfully');
    res.redirect('/licenses');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error deleting license');
    res.redirect('/licenses');
  }
});

// Explicit POST route for license deletion (as a fallback)
router.post('/:id/delete', ensureAuthenticated, async (req, res) => {
  try {
    console.log(`POST to delete route received for license ID: ${req.params.id}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Original URL: ${req.originalUrl}`);
    
    const license = await License.findById(req.params.id);
    
    if (!license) {
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // Check if user is owner or admin with better error handling
    const licenseOwnerId = license.owner ? license.owner.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    if (licenseOwnerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/licenses');
    }
    
    // Remove license references from systems
    await System.updateMany(
      { licenseRequirements: { $elemMatch: { licenseId: license._id } } },
      { $pull: { licenseRequirements: { licenseId: license._id } } }
    );
    
    // Delete attachments from filesystem
    if (license.attachments && license.attachments.length > 0) {
      license.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      });
    }
    
    await License.findByIdAndDelete(req.params.id);
    
    req.flash('success_msg', 'License deleted successfully');
    res.redirect('/licenses');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error deleting license');
    res.redirect('/licenses');
  }
});

// Remove attachment
router.delete('/:id/attachments/:attachmentId', ensureAuthenticated, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // Check if user is owner or admin with better error handling
    const licenseOwnerId = license.owner ? license.owner.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    if (licenseOwnerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/licenses');
    }
    
    const attachment = license.attachments.id(req.params.attachmentId);
    
    if (!attachment) {
      req.flash('error_msg', 'Attachment not found');
      return res.redirect(`/licenses/${license._id}`);
    }
    
    // Delete file from filesystem
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }
    
    // Remove attachment from license
    license.attachments.pull(req.params.attachmentId);
    await license.save();
    
    req.flash('success_msg', 'Attachment removed successfully');
    res.redirect(`/licenses/${license._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error removing attachment');
    res.redirect(`/licenses/${req.params.id}`);
  }
});

// Renew license form
router.get('/renew/:id', ensureAuthenticated, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // Check if user is owner or admin with better error handling
    const licenseOwnerId = license.owner ? license.owner.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    if (licenseOwnerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/licenses');
    }
    
    res.render('licenses/renew', {
      title: 'Renew License',
      license
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading license');
    res.redirect('/licenses');
  }
});

// Process license renewal
router.post('/renew/:id', ensureAuthenticated, upload.array('attachments', 5), async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      req.flash('error_msg', 'License not found');
      return res.redirect('/licenses');
    }
    
    // Check if user is owner or admin with better error handling
    const licenseOwnerId = license.owner ? license.owner.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    if (licenseOwnerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/licenses');
    }
    
    const {
      expiryDate,
      renewalDate,
      cost,
      notes
    } = req.body;
    
    // Add renewal attachments if files were uploaded
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        uploadDate: Date.now()
      }));
      
      license.attachments = [...license.attachments, ...newAttachments];
    }
    
    // Update license fields
    license.expiryDate = expiryDate;
    license.renewalDate = renewalDate || undefined;
    license.cost = cost || license.cost;
    license.notes = notes ? `${license.notes}\n\nRenewal Notes (${new Date().toLocaleDateString()}):\n${notes}` : license.notes;
    license.status = 'renewed';
    
    await license.save();
    
    req.flash('success_msg', 'License renewed successfully');
    res.redirect(`/licenses/${license._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error renewing license');
    res.redirect(`/licenses/renew/${req.params.id}`);
  }
});

// Import licenses form
router.get('/import', ensureAuthenticated, (req, res) => {
  res.render('licenses/import', {
    title: 'Import Licenses'
  });
});

// Process license import
router.post('/import', ensureAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'Please upload a file');
      return res.redirect('/licenses/import');
    }
    
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let licenses = [];
    
    if (fileExt === '.csv') {
      // Parse CSV file
      const results = [];
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            // Process CSV data
            for (const row of results) {
              const license = {
                name: row.name || 'Imported License',
                licenseKey: row.licenseKey || row.license_key || generateRandomKey(),
                product: row.product || 'Unknown',
                vendor: row.vendor || 'Unknown',
                purchaseDate: row.purchaseDate || row.purchase_date || new Date(),
                expiryDate: row.expiryDate || row.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                renewalDate: row.renewalDate || row.renewal_date,
                totalSeats: parseInt(row.totalSeats || row.total_seats || 1),
                usedSeats: parseInt(row.usedSeats || row.used_seats || 0),
                status: row.status || 'active',
                cost: row.cost ? parseFloat(row.cost) : undefined,
                currency: row.currency || 'USD',
                notes: row.notes || `Imported from CSV on ${new Date().toLocaleDateString()}`,
                owner: req.user.id
              };
              
              licenses.push(license);
            }
            
            // Save all licenses
            const savedLicenses = await License.insertMany(licenses);
            
            // Clean up the uploaded file
            fs.unlinkSync(req.file.path);
            
            req.flash('success_msg', `Successfully imported ${savedLicenses.length} licenses`);
            res.redirect('/licenses');
          } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Error processing CSV file');
            res.redirect('/licenses/import');
          }
        });
    } else if (fileExt === '.xlsx') {
      // Parse Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Process Excel data
      for (const row of data) {
        const license = {
          name: row.name || row.Name || 'Imported License',
          licenseKey: row.licenseKey || row.license_key || row.LicenseKey || generateRandomKey(),
          product: row.product || row.Product || 'Unknown',
          vendor: row.vendor || row.Vendor || 'Unknown',
          purchaseDate: row.purchaseDate || row.purchase_date || row.PurchaseDate || new Date(),
          expiryDate: row.expiryDate || row.expiry_date || row.ExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          renewalDate: row.renewalDate || row.renewal_date || row.RenewalDate,
          totalSeats: parseInt(row.totalSeats || row.total_seats || row.TotalSeats || 1),
          usedSeats: parseInt(row.usedSeats || row.used_seats || row.UsedSeats || 0),
          status: row.status || row.Status || 'active',
          cost: row.cost || row.Cost ? parseFloat(row.cost || row.Cost) : undefined,
          currency: row.currency || row.Currency || 'USD',
          notes: row.notes || row.Notes || `Imported from Excel on ${new Date().toLocaleDateString()}`,
          owner: req.user.id
        };
        
        licenses.push(license);
      }
      
      // Save all licenses
      const savedLicenses = await License.insertMany(licenses);
      
      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);
      
      req.flash('success_msg', `Successfully imported ${savedLicenses.length} licenses`);
      res.redirect('/licenses');
    } else {
      fs.unlinkSync(req.file.path);
      req.flash('error_msg', 'Unsupported file format. Please upload a CSV or XLSX file.');
      res.redirect('/licenses/import');
    }
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error importing licenses');
    res.redirect('/licenses/import');
  }
});

// Export licenses
router.get('/export', ensureAuthenticated, async (req, res) => {
  try {
    let query = { owner: req.user.id };
    
    // Filter by status if provided
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    
    // Filter by product if provided
    if (req.query.product) {
      query.product = { $regex: new RegExp(req.query.product, 'i') };
    }
    
    // Filter by vendor if provided
    if (req.query.vendor) {
      query.vendor = { $regex: new RegExp(req.query.vendor, 'i') };
    }
    
    const licenses = await License.find(query).sort({ expiryDate: 1 });
    
    // Create directory if it doesn't exist
    const dir = './data/exports';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const format = req.query.format || 'csv';
    const filename = `licenses_export_${Date.now()}.${format}`;
    const filepath = path.join(dir, filename);
    
    if (format === 'xlsx') {
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      
      // Convert licenses to a format suitable for Excel
      const data = licenses.map(license => ({
        Name: license.name,
        LicenseKey: license.licenseKey,
        Product: license.product,
        Vendor: license.vendor,
        PurchaseDate: license.purchaseDate.toISOString().split('T')[0],
        ExpiryDate: license.expiryDate.toISOString().split('T')[0],
        RenewalDate: license.renewalDate ? license.renewalDate.toISOString().split('T')[0] : '',
        TotalSeats: license.totalSeats,
        UsedSeats: license.usedSeats,
        Status: license.status,
        Cost: license.cost || '',
        Currency: license.currency,
        Notes: license.notes || ''
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Licenses');
      
      // Write to file
      XLSX.writeFile(workbook, filepath);
      
      // Send file to user
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error(err);
        }
        
        // Clean up file after download
        fs.unlinkSync(filepath);
      });
    } else {
      // Create CSV file
      const csvHeaders = 'Name,LicenseKey,Product,Vendor,PurchaseDate,ExpiryDate,RenewalDate,TotalSeats,UsedSeats,Status,Cost,Currency,Notes\n';
      const csvContent = licenses.map(license => {
        return `"${license.name}","${license.licenseKey}","${license.product}","${license.vendor}","${license.purchaseDate.toISOString().split('T')[0]}","${license.expiryDate.toISOString().split('T')[0]}","${license.renewalDate ? license.renewalDate.toISOString().split('T')[0] : ''}",${license.totalSeats},${license.usedSeats},"${license.status}",${license.cost || ''},"${license.currency}","${(license.notes || '').replace(/"/g, '""')}"\n`;
      }).join('');
      
      fs.writeFileSync(filepath, csvHeaders + csvContent);
      
      // Send file to user
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error(err);
        }
        
        // Clean up file after download
        fs.unlinkSync(filepath);
      });
    }
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error exporting licenses');
    res.redirect('/licenses');
  }
});

// Generate a random license key (helper function)
function generateRandomKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 4) key += '-';
  }
  
  return key;
}

module.exports = router;