const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureManager } = require('../middleware/auth');
const System = require('../models/System');
const License = require('../models/License');

// List all systems
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    console.log('User ID for systems query:', req.user._id);
    const systems = await System.find({ user: req.user._id })
      .populate('user', 'name email')
      .populate('manager', 'name email')
      .lean();

    res.render('systems/index', {
      title: 'Systems',
      systems: systems.map(system => ({
        ...system,
        _id: system._id.toString(),
        user: system.user
          ? {
              ...system.user,
              _id: system.user._id.toString(),
            }
          : null,
        manager: system.manager
          ? {
              ...system.manager,
              _id: system.manager._id.toString(),
            }
          : null,
      })),
    });
  } catch (err) {
    console.error('Error in systems listing:', err);
    req.flash('error', 'Error loading systems');
    res.redirect('/dashboard');
  }
});

// Add system form
router.get('/add', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Getting licenses for user ID:', req.user._id);

    // Find licenses owned by user
    const licenses = await License.find({ owner: req.user._id }).lean();

    // Sort licenses after fetching the data
    licenses.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });

    res.render('systems/add', {
      title: 'Add System',
      licenses,
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading licenses');
    res.redirect('/systems');
  }
});

// Add system
router.post('/add', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Creating system with user ID:', req.user._id);
    console.log('Creating system with data:', {
      ...req.body,
      user: req.user._id,
    });

    const system = new System({
      ...req.body,
      user: req.user._id,
    });

    await system.save();
    req.flash('success', 'System added successfully');
    res.redirect('/systems');
  } catch (err) {
    console.error('Error creating system:', err);
    req.flash('error', 'Error creating system');
    res.redirect('/systems/add');
  }
});

// RESTful API: Create new system
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description, ...rest } = req.body;
    // You may want to add more fields and validation here
    const newSystem = await System.create({
      name,
      description,
      ...rest,
      user: req.user._id
    });
    res.status(201).json({ success: true, message: 'System created.', system: newSystem });
  } catch (err) {
    console.error('Error creating system:', err);
    res.status(500).json({ success: false, message: 'Failed to create system.' });
  }
});

// View single system
router.get('/:id/view', ensureAuthenticated, async (req, res) => {
  try {
    const system = await System.findById(req.params.id)
      .populate('user', 'name email')
      .populate('manager', 'name email')
      .lean();

    if (!system) {
      req.flash('error', 'System not found');
      return res.redirect('/systems');
    }

    // Check if user has permission to view this system
    if (system.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      req.flash('error', 'You do not have permission to view this system');
      return res.redirect('/systems');
    }

    res.render('systems/view', {
      title: 'View System',
      system: {
        ...system,
        _id: system._id.toString(),
        user: {
          ...system.user,
          _id: system.user._id.toString(),
        },
        manager: system.manager
          ? {
              ...system.manager,
              _id: system.manager._id.toString(),
            }
          : null,
      },
    });
  } catch (err) {
    console.error('Error viewing system:', err);
    req.flash('error', 'Error viewing system');
    res.redirect('/systems');
  }
});

// Edit system form
router.get('/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    const system = await System.findById(req.params.id).lean();

    if (!system) {
      req.flash('error', 'System not found');
      return res.redirect('/systems');
    }

    // Check if user has permission to edit this system
    if (system.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      req.flash('error', 'You do not have permission to edit this system');
      return res.redirect('/systems');
    }

    res.render('systems/edit', {
      title: 'Edit System',
      system: {
        ...system,
        _id: system._id.toString(),
      },
    });
  } catch (err) {
    console.error('Error loading edit form:', err);
    req.flash('error', 'Error loading edit form');
    res.redirect('/systems');
  }
});

// Update system
router.post('/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    const system = await System.findById(req.params.id);

    if (!system) {
      req.flash('error', 'System not found');
      return res.redirect('/systems');
    }

    // Check if user has permission to edit this system
    if (system.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      req.flash('error', 'You do not have permission to edit this system');
      return res.redirect('/systems');
    }

    // Update system data
    const {
      name,
      systemType,
      operatingSystem,
      ipAddress,
      macAddress,
      location,
      department,
      notes,
    } = req.body;

    system.name = name;
    system.systemType = systemType;
    system.operatingSystem = operatingSystem;
    system.ipAddress = ipAddress;
    system.macAddress = macAddress;
    system.location = location;
    system.department = department;
    system.notes = notes;

    await system.save();
    req.flash('success', 'System updated successfully');
    res.redirect(`/systems/${system._id}/view`);
  } catch (err) {
    console.error('Error updating system:', err);
    req.flash('error', 'Error updating system');
    res.redirect(`/systems/${req.params.id}/edit`);
  }
});

// Delete system
router.post('/:id/delete', ensureAuthenticated, async (req, res) => {
  try {
    const system = await System.findById(req.params.id);

    if (!system) {
      req.flash('error', 'System not found');
      return res.redirect('/systems');
    }

    // Check if user has permission to delete this system
    if (system.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      req.flash('error', 'You do not have permission to delete this system');
      return res.redirect('/systems');
    }

    await system.remove();
    req.flash('success', 'System deleted successfully');
    res.redirect('/systems');
  } catch (err) {
    console.error('Error deleting system:', err);
    req.flash('error', 'Error deleting system');
    res.redirect('/systems');
  }
});

// Bulk import systems form
router.get('/import', ensureAuthenticated, (req, res) => {
  res.render('systems/import', {
    title: 'Import Systems',
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
        status: systemData.status || 'active',
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
    const system = await System.findById(req.params.id).populate('licenseRequirements.licenseId');

    if (!system) {
      return res.status(404).json({ success: false, error: 'System not found' });
    }

    // Check if user is manager or admin with better error handling
    const systemManagerId = system.managedBy ? system.managedBy.toString() : '';
    const currentUserId = req.user && req.user._id ? req.user._id.toString() : '';
    console.log(
      `API Check - System Manager ID: ${systemManagerId}, Current User ID: ${currentUserId}, User Role: ${req.user.role}`
    );

    if (systemManagerId !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({
      success: true,
      licenseRequirements: system.licenseRequirements,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Network scan form
router.get('/scan', ensureAuthenticated, (req, res) => {
  res.render('systems/scan', {
    title: 'Network Scan',
  });
});

// Process network scan
router.post('/scan', ensureAuthenticated, async (req, res) => {
  try {
    const { ipAddress, hostname, username, password, scanType } = req.body;

    if (!ipAddress) {
      req.flash('error_msg', 'IP address is required');
      return res.redirect('/systems/scan');
    }

    console.log(`Initiating scan for IP: ${ipAddress}`);

    // This is where you would implement the actual scanning logic
    // For this example, we'll create a placeholder system with the provided IP
    const systemData = {
      name: hostname || `System-${ipAddress.replace(/\./g, '-')}`,
      systemType: 'Other', // Use a valid enum value
      environment: 'production', // Use a valid enum value or default
      status: 'Active', // Use a valid enum value or default
      os: 'Unknown', // Would be detected by scan
      ip: ipAddress,
      hostname: hostname || '',
      location: '',
      department: '',
      user: req.user._id, // Fix: set user as required by schema
      managedBy: req.user._id,
      notes: `Auto-discovered on ${new Date().toLocaleDateString()}`,
      licenseRequirements: [],
    };

    // Create the system
    const newSystem = await System.create(systemData);

    req.flash('success_msg', `System ${systemData.name} added successfully from IP ${ipAddress}`);
    res.redirect(`/systems/view/${newSystem._id}`);
  } catch (err) {
    console.error('Error scanning system:', err);
    req.flash('error_msg', `Error scanning system: ${err.message}`);
    res.redirect('/systems/scan');
  }
});

module.exports = router;
