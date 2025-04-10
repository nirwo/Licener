const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Vendor = require('../models/Vendor');
const License = require('../models/License');

// Vendor list
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    // Get all vendors
    const vendors = await Vendor.find({});
    
    // Count licenses for each vendor
    const vendorsWithStats = await Promise.all(vendors.map(async vendor => {
      const licenses = await License.find({ vendor: vendor.name });
      return {
        ...vendor,
        licenseCount: licenses.length
      };
    }));
    
    res.render('vendors/index', {
      title: 'Vendor Management',
      vendors: vendorsWithStats
    });
  } catch (err) {
    console.error('Error fetching vendors:', err);
    req.flash('error_msg', 'Error loading vendors');
    res.redirect('/dashboard');
  }
});

// Add vendor form
router.get('/add', ensureAuthenticated, (req, res) => {
  res.render('vendors/add', {
    title: 'Add Vendor'
  });
});

// Add vendor
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { name, website, contactPerson, email, phone, address, notes } = req.body;
    
    // Validate required fields
    if (!name) {
      req.flash('error_msg', 'Vendor name is required');
      return res.redirect('/vendors/add');
    }
    
    // Check if vendor already exists
    const existingVendor = await Vendor.find({ name });
    if (existingVendor.length > 0) {
      req.flash('error_msg', `Vendor "${name}" already exists`);
      return res.redirect('/vendors/add');
    }
    
    // Create vendor
    const vendorData = {
      name,
      website: website || '',
      contactPerson: contactPerson || '',
      email: email || '',
      phone: phone || '',
      address: address || '',
      notes: notes || '',
      owner: req.user._id
    };
    
    await Vendor.create(vendorData);
    
    req.flash('success_msg', 'Vendor added successfully');
    res.redirect('/vendors');
  } catch (err) {
    console.error('Error adding vendor:', err);
    req.flash('error_msg', 'Error adding vendor');
    res.redirect('/vendors/add');
  }
});

// View vendor details
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      req.flash('error_msg', 'Vendor not found');
      return res.redirect('/vendors');
    }
    
    // Get all licenses for this vendor
    const licenses = await License.find({ vendor: vendor.name });
    
    res.render('vendors/view', {
      title: vendor.name,
      vendor,
      licenses
    });
  } catch (err) {
    console.error('Error loading vendor:', err);
    req.flash('error_msg', 'Error loading vendor details');
    res.redirect('/vendors');
  }
});

// Edit vendor form
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      req.flash('error_msg', 'Vendor not found');
      return res.redirect('/vendors');
    }
    
    res.render('vendors/edit', {
      title: `Edit ${vendor.name}`,
      vendor
    });
  } catch (err) {
    console.error('Error loading vendor for edit:', err);
    req.flash('error_msg', 'Error loading vendor details');
    res.redirect('/vendors');
  }
});

// Update vendor
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { name, website, contactPerson, email, phone, address, notes } = req.body;
    
    // Validate required fields
    if (!name) {
      req.flash('error_msg', 'Vendor name is required');
      return res.redirect(`/vendors/edit/${req.params.id}`);
    }
    
    // Check if vendor exists
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      req.flash('error_msg', 'Vendor not found');
      return res.redirect('/vendors');
    }
    
    // Update vendor data
    const updatedData = {
      name,
      website: website || '',
      contactPerson: contactPerson || '',
      email: email || '',
      phone: phone || '',
      address: address || '',
      notes: notes || ''
    };
    
    // If the vendor name has changed, update all licenses that use this vendor
    if (name !== vendor.name) {
      console.log(`Updating licenses from vendor "${vendor.name}" to "${name}"`);
      const licenses = await License.find({ vendor: vendor.name });
      
      for (const license of licenses) {
        await License.findByIdAndUpdate(license._id, { vendor: name });
      }
    }
    
    await Vendor.findByIdAndUpdate(req.params.id, updatedData);
    
    req.flash('success_msg', 'Vendor updated successfully');
    res.redirect(`/vendors/${req.params.id}`);
  } catch (err) {
    console.error('Error updating vendor:', err);
    req.flash('error_msg', 'Error updating vendor');
    res.redirect(`/vendors/edit/${req.params.id}`);
  }
});

// Delete vendor
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      req.flash('error_msg', 'Vendor not found');
      return res.redirect('/vendors');
    }
    
    // Check if there are licenses using this vendor
    const licenses = await License.find({ vendor: vendor.name });
    if (licenses.length > 0) {
      req.flash('error_msg', `Cannot delete vendor "${vendor.name}" because it is used by ${licenses.length} license(s)`);
      return res.redirect('/vendors');
    }
    
    await Vendor.findByIdAndDelete(req.params.id);
    
    req.flash('success_msg', 'Vendor deleted successfully');
    res.redirect('/vendors');
  } catch (err) {
    console.error('Error deleting vendor:', err);
    req.flash('error_msg', 'Error deleting vendor');
    res.redirect('/vendors');
  }
});

module.exports = router;
