const Vendor = require('../models/Vendor');
const License = require('../models/License');

// List all vendors
exports.list = async (req, res) => {
  try {
    const vendors = await Vendor.find({}).sort({ name: 1 });
    
    res.render('vendors/index', {
      title: 'Vendors',
      vendors
    });
  } catch (err) {
    console.error('Error fetching vendors:', err);
    req.flash('error_msg', 'Error loading vendors');
    res.redirect('/dashboard');
  }
};

// View add vendor form
exports.addForm = (req, res) => {
  res.render('vendors/add', {
    title: 'Add Vendor'
  });
};

// Process add vendor form
exports.create = async (req, res) => {
  try {
    const { name, description, website, contactName, contactEmail, contactPhone, address, notes } = req.body;
    
    // Validate input
    if (!name) {
      req.flash('error_msg', 'Vendor name is required');
      return res.redirect('/vendors/add');
    }
    
    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
    
    if (existingVendor) {
      req.flash('error_msg', 'A vendor with this name already exists');
      return res.redirect('/vendors/add');
    }
    
    // Create new vendor
    const newVendor = new Vendor({
      name,
      description,
      website,
      contactName,
      contactEmail,
      contactPhone,
      address,
      notes
    });
    
    await newVendor.save();
    
    req.flash('success_msg', 'Vendor added successfully');
    res.redirect('/vendors');
  } catch (err) {
    console.error('Error adding vendor:', err);
    req.flash('error_msg', 'Error adding vendor');
    res.redirect('/vendors/add');
  }
};

// View edit vendor form
exports.editForm = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      req.flash('error_msg', 'Vendor not found');
      return res.redirect('/vendors');
    }
    
    res.render('vendors/edit', {
      title: 'Edit Vendor',
      vendor
    });
  } catch (err) {
    console.error('Error fetching vendor for edit:', err);
    req.flash('error_msg', 'Error loading vendor');
    res.redirect('/vendors');
  }
};

// Process edit vendor form
exports.update = async (req, res) => {
  try {
    const { name, description, website, contactName, contactEmail, contactPhone, address, notes } = req.body;
    
    // Validate input
    if (!name) {
      req.flash('error_msg', 'Vendor name is required');
      return res.redirect(`/vendors/edit/${req.params.id}`);
    }
    
    // Update vendor
    await Vendor.findByIdAndUpdate(req.params.id, {
      name,
      description,
      website,
      contactName,
      contactEmail,
      contactPhone,
      address,
      notes,
      updatedAt: new Date()
    });
    
    req.flash('success_msg', 'Vendor updated successfully');
    res.redirect('/vendors');
  } catch (err) {
    console.error('Error updating vendor:', err);
    req.flash('error_msg', 'Error updating vendor');
    res.redirect(`/vendors/edit/${req.params.id}`);
  }
};

// Delete vendor
exports.delete = async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    
    req.flash('success_msg', 'Vendor deleted successfully');
    res.redirect('/vendors');
  } catch (err) {
    console.error('Error deleting vendor:', err);
    req.flash('error_msg', 'Error deleting vendor');
    res.redirect('/vendors');
  }
};

// View single vendor
exports.view = async (req, res) => {
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
}; 