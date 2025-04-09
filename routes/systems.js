const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureManager } = require('../middleware/auth');
const System = require('../models/System');
const License = require('../models/License');

// Get all systems
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    console.log('User ID for systems query:', req.user._id);
    
    // Use enhanced System model methods
    let systems = [];
    if (req.user.role === 'admin') {
      systems = await System.find({});
    } else {
      systems = await System.findByManager(req.user._id);
    }
    
    // Filter by type if provided
    if (req.query.type && req.query.type !== 'all') {
      systems = systems.filter(system => system.type === req.query.type);
    }
    
    // Apply manual filtering for text search (OS)
    if (req.query.os) {
      const osRegex = new RegExp(req.query.os, 'i');
      systems = systems.filter(system => osRegex.test(system.os));
    }
    
    // Filter by status if provided
    if (req.query.status && req.query.status !== 'all') {
      systems = systems.filter(system => system.status === req.query.status);
    }
    
    // Sort by name
    systems.sort((a, b) => a.name.localeCompare(b.name));
    
    // Populate references
    systems = await System.populate(systems, 'managedBy');
    systems = await System.populate(systems, 'licenseRequirements.licenseId');
    
    // Get unique OS values for filter dropdown
    const osValues = System.distinct('os', { managedBy: req.user._id });
    
    res.render('systems/index', {
      title: 'Systems',
      systems,
      osValues,
      filters: req.query
    });
  } catch (err) {
    console.error('Error in systems listing:', err);
    req.flash('error_msg', 'Error loading systems');
    res.redirect('/dashboard');
  }
});

// Add system form
router.get('/add', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Getting licenses for user ID:', req.user._id);
    
    // Find licenses owned by user
    let licenses = License.find({ owner: req.user._id });
    
    // Sort by name
    licenses.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    
    res.render('systems/add', {
      title: 'Add System',
      licenses
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading licenses');
    res.redirect('/systems');
  }
});

// Add system
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const {
      name,
      type,
      os,
      osVersion,
      location,
      ip,
      department,
      installedSoftware,
      notes,
      status,
      licenses
    } = req.body;
    
    // Process installed software data
    let softwareArray = [];
    if (installedSoftware) {
      const softwareNames = Array.isArray(installedSoftware.name) ? installedSoftware.name : [installedSoftware.name];
      const softwareVersions = Array.isArray(installedSoftware.version) ? installedSoftware.version : [installedSoftware.version];
      const softwareInstallDates = Array.isArray(installedSoftware.installDate) ? installedSoftware.installDate : [installedSoftware.installDate];
      
      for (let i = 0; i < softwareNames.length; i++) {
        if (softwareNames[i]) {
          softwareArray.push({
            name: softwareNames[i],
            version: softwareVersions[i] || '',
            installDate: softwareInstallDates[i] || new Date()
          });
        }
      }
    }
    
    // Process license requirements
    let licenseRequirements = [];
    if (licenses) {
      const licenseIds = Array.isArray(licenses.id) ? licenses.id : [licenses.id];
      const licenseQuantities = Array.isArray(licenses.quantity) ? licenses.quantity : [licenses.quantity];
      
      for (let i = 0; i < licenseIds.length; i++) {
        if (licenseIds[i]) {
          // Get the license to determine the license type
          const license = await License.findById(licenseIds[i]);
          
          if (license) {
            licenseRequirements.push({
              licenseType: license.product,
              quantity: parseInt(licenseQuantities[i]) || 1,
              licenseId: licenseIds[i]
            });
          }
        }
      }
    }
    
    // Create system using file-db method
    console.log('Creating system with user ID:', req.user._id);
    
    const systemData = {
      name,
      type,
      os,
      osVersion,
      location,
      ip,
      department,
      managedBy: req.user._id,
      installedSoftware: softwareArray,
      licenseRequirements,
      notes,
      status: status || 'active'
    };
    
    console.log('Creating system with data:', systemData);
    const newSystem = await System.create(systemData);
    
    // Update license used seats for each assigned license
    if (licenseRequirements.length > 0) {
      for (const requirement of licenseRequirements) {
        const license = await License.findById(requirement.licenseId);
        
        if (license) {
          // Need to modify for file-db approach
          if (!license.assignedSystems) {
            license.assignedSystems = [];
          }
          license.assignedSystems.push(newSystem._id);
          
          await License.findByIdAndUpdate(requirement.licenseId, {
            assignedSystems: license.assignedSystems,
            usedSeats: license.assignedSystems.length
          });
        }
      }
    }
    
    req.flash('success_msg', 'System added successfully');
    res.redirect('/systems');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error adding system');
    res.redirect('/systems/add');
  }
});

// View system details
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const system = await System.findById(req.params.id)
      .populate('managedBy', 'name email')
      .populate('licenseRequirements.licenseId');
    
    if (!system) {
      req.flash('error_msg', 'System not found');
      return res.redirect('/systems');
    }
    
    // Check if user is manager or admin with better error handling
    const systemManagerId = system.managedBy && system.managedBy._id ? system.managedBy._id.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    console.log(`Checking authorization - System Manager ID: ${systemManagerId}, Current User ID: ${currentUserId}, User Role: ${req.user.role}`);
    
    if (systemManagerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/systems');
    }
    
    res.render('systems/view', {
      title: system.name,
      system
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading system');
    res.redirect('/systems');
  }
});

// Edit system form
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const system = await System.findById(req.params.id);
    
    if (!system) {
      req.flash('error_msg', 'System not found');
      return res.redirect('/systems');
    }
    
    // Check if user is manager or admin with better error handling
    const systemManagerId = system.managedBy ? system.managedBy.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    console.log(`Checking authorization - System Manager ID: ${systemManagerId}, Current User ID: ${currentUserId}, User Role: ${req.user.role}`);
    
    if (systemManagerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/systems');
    }
    
    const licenses = await License.find({ owner: req.user._id.toString() }).sort({ name: 1 });
    
    res.render('systems/edit', {
      title: 'Edit System',
      system,
      licenses
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading system');
    res.redirect('/systems');
  }
});

// Update system
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const system = await System.findById(req.params.id);
    
    if (!system) {
      req.flash('error_msg', 'System not found');
      return res.redirect('/systems');
    }
    
    // Check if user is manager or admin
    if (system.managedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/systems');
    }
    
    const {
      name,
      type,
      os,
      osVersion,
      location,
      ip,
      department,
      installedSoftware,
      notes,
      status,
      licenses
    } = req.body;
    
    // Process installed software data
    let softwareArray = [];
    if (installedSoftware) {
      const softwareNames = Array.isArray(installedSoftware.name) ? installedSoftware.name : [installedSoftware.name];
      const softwareVersions = Array.isArray(installedSoftware.version) ? installedSoftware.version : [installedSoftware.version];
      const softwareInstallDates = Array.isArray(installedSoftware.installDate) ? installedSoftware.installDate : [installedSoftware.installDate];
      
      for (let i = 0; i < softwareNames.length; i++) {
        if (softwareNames[i]) {
          softwareArray.push({
            name: softwareNames[i],
            version: softwareVersions[i] || '',
            installDate: softwareInstallDates[i] || new Date()
          });
        }
      }
    }
    
    // Process license requirements
    let licenseRequirements = [];
    if (licenses) {
      const licenseIds = Array.isArray(licenses.id) ? licenses.id : [licenses.id];
      const licenseQuantities = Array.isArray(licenses.quantity) ? licenses.quantity : [licenses.quantity];
      
      for (let i = 0; i < licenseIds.length; i++) {
        if (licenseIds[i]) {
          // Get the license to determine the license type
          const license = await License.findById(licenseIds[i]);
          
          if (license) {
            licenseRequirements.push({
              licenseType: license.product,
              quantity: parseInt(licenseQuantities[i]) || 1,
              licenseId: licenseIds[i]
            });
          }
        }
      }
    }
    
    // Get old license requirements for comparison
    const oldLicenseIds = system.licenseRequirements.map(req => req.licenseId.toString());
    const newLicenseIds = licenseRequirements.map(req => req.licenseId.toString());
    
    // Licenses to remove
    const licensesToRemove = oldLicenseIds.filter(id => !newLicenseIds.includes(id));
    
    // Licenses to add
    const licensesToAdd = newLicenseIds.filter(id => !oldLicenseIds.includes(id));
    
    // Update system fields
    system.name = name;
    system.type = type;
    system.os = os;
    system.osVersion = osVersion;
    system.location = location;
    system.ip = ip;
    system.department = department;
    system.installedSoftware = softwareArray;
    system.licenseRequirements = licenseRequirements;
    system.notes = notes;
    system.status = status || 'active';
    system.lastSeen = new Date();
    
    await system.save();
    
    // Update licenses
    // Remove system from licenses that are no longer assigned
    if (licensesToRemove.length > 0) {
      for (const licenseId of licensesToRemove) {
        const license = await License.findById(licenseId);
        
        if (license) {
          license.assignedSystems = license.assignedSystems.filter(sys => sys.toString() !== system._id.toString());
          license.usedSeats = license.assignedSystems.length;
          await license.save();
        }
      }
    }
    
    // Add system to newly assigned licenses
    if (licensesToAdd.length > 0) {
      for (const licenseId of licensesToAdd) {
        const license = await License.findById(licenseId);
        
        if (license) {
          license.assignedSystems.push(system._id);
          license.usedSeats = license.assignedSystems.length;
          await license.save();
        }
      }
    }
    
    req.flash('success_msg', 'System updated successfully');
    res.redirect(`/systems/${system._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating system');
    res.redirect(`/systems/edit/${req.params.id}`);
  }
});

// Delete system
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const system = await System.findById(req.params.id);
    
    if (!system) {
      req.flash('error_msg', 'System not found');
      return res.redirect('/systems');
    }
    
    // Check if user is manager or admin with better error handling
    const systemManagerId = system.managedBy ? system.managedBy.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    console.log(`Checking authorization - System Manager ID: ${systemManagerId}, Current User ID: ${currentUserId}, User Role: ${req.user.role}`);
    
    if (systemManagerId !== currentUserId && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/systems');
    }
    
    // Update licenses to remove this system
    const licenseIds = system.licenseRequirements.map(req => req.licenseId);
    
    for (const licenseId of licenseIds) {
      const license = await License.findById(licenseId);
      
      if (license) {
        license.assignedSystems = license.assignedSystems.filter(sys => sys.toString() !== system._id.toString());
        license.usedSeats = license.assignedSystems.length;
        await license.save();
      }
    }
    
    await System.findByIdAndDelete(req.params.id);
    
    req.flash('success_msg', 'System deleted successfully');
    res.redirect('/systems');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error deleting system');
    res.redirect('/systems');
  }
});

// Bulk import systems form
router.get('/import', ensureAuthenticated, (req, res) => {
  res.render('systems/import', {
    title: 'Import Systems'
  });
});

// Process bulk import
router.post('/import', ensureAuthenticated, async (req, res) => {
  try {
    const { systems } = req.body;
    
    if (!systems || systems.trim() === '') {
      req.flash('error_msg', 'Please provide system data');
      return res.redirect('/systems/import');
    }
    
    const systemsData = JSON.parse(systems);
    const systemsToCreate = [];
    
    for (const systemData of systemsData) {
      systemsToCreate.push({
        name: systemData.name,
        type: systemData.type || 'physical',
        os: systemData.os || 'Unknown',
        osVersion: systemData.osVersion || systemData.os_version,
        location: systemData.location,
        ip: systemData.ip,
        department: systemData.department,
        managedBy: req.user._id.toString(),
        notes: systemData.notes || `Imported on ${new Date().toLocaleDateString()}`,
        status: systemData.status || 'active'
      });
    }
    
    const createdSystems = await System.insertMany(systemsToCreate);
    
    req.flash('success_msg', `Successfully imported ${createdSystems.length} systems`);
    res.redirect('/systems');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error importing systems: ' + err.message);
    res.redirect('/systems/import');
  }
});

// Get system license requirements
router.get('/:id/licenses', ensureAuthenticated, async (req, res) => {
  try {
    const system = await System.findById(req.params.id)
      .populate('licenseRequirements.licenseId');
    
    if (!system) {
      return res.status(404).json({ success: false, error: 'System not found' });
    }
    
    // Check if user is manager or admin with better error handling
    const systemManagerId = system.managedBy ? system.managedBy.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    console.log(`API Check - System Manager ID: ${systemManagerId}, Current User ID: ${currentUserId}, User Role: ${req.user.role}`);
    
    if (systemManagerId !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    res.json({
      success: true,
      licenseRequirements: system.licenseRequirements
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;