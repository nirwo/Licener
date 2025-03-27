const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const License = require('../models/License');
const System = require('../models/System');
const moment = require('moment');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  // Get auth header value
  const bearerHeader = req.headers['authorization'];
  
  // Check if bearer is undefined
  if (typeof bearerHeader !== 'undefined') {
    // Split at the space
    const bearer = bearerHeader.split(' ');
    // Get token from array
    const bearerToken = bearer[1];
    // Set the token
    req.token = bearerToken;
    
    // Verify token
    jwt.verify(req.token, process.env.JWT_SECRET || 'jwt_secret', (err, authData) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
      }
      
      // Set authenticated user
      req.user = authData.user;
      next();
    });
  } else {
    // Forbidden
    res.status(403).json({ success: false, message: 'No authorization token provided' });
  }
};

// API Authentication
router.post('/auth', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate request
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Create payload
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
    
    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'jwt_secret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        
        // Update last login
        user.lastLogin = Date.now();
        user.save();
        
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get authenticated user
router.get('/user', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all licenses
router.get('/licenses', verifyToken, async (req, res) => {
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
    
    // Filter by expiry date range
    if (req.query.expiryStart && req.query.expiryEnd) {
      query.expiryDate = {
        $gte: new Date(req.query.expiryStart),
        $lte: new Date(req.query.expiryEnd)
      };
    } else if (req.query.expiryStart) {
      query.expiryDate = { $gte: new Date(req.query.expiryStart) };
    } else if (req.query.expiryEnd) {
      query.expiryDate = { $lte: new Date(req.query.expiryEnd) };
    }
    
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const sortField = req.query.sortBy || 'expiryDate';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sort = {};
    sort[sortField] = sortOrder;
    
    const total = await License.countDocuments(query);
    const licenses = await License.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedSystems', 'name os type');
    
    res.json({
      success: true,
      count: licenses.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      licenses
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a specific license
router.get('/licenses/:id', verifyToken, async (req, res) => {
  try {
    const license = await License.findById(req.params.id)
      .populate('assignedSystems', 'name os type')
      .populate('owner', 'name email');
    
    if (!license) {
      return res.status(404).json({ success: false, message: 'License not found' });
    }
    
    // Check if user is owner or admin
    if (license.owner._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    res.json({
      success: true,
      license
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Direct license creation API (no auth)
router.post('/direct/licenses', async (req, res) => {
  console.log('Direct license API called');
  console.log('Request body:', req.body);
  
  // For the demo, we'll use a hardcoded user ID
  req.user = { id: "u39dks82bn" };
  
  try {
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
      assignedSystems
    } = req.body;
    
    console.log('Creating license with data:', {
      name, product, vendor, totalSeats, owner: req.user.id
    });
    
    // Create the license with file-based DB approach
    const licenseData = {
      name: name || product,
      licenseKey: licenseKey || `LIC-${Date.now()}`,
      product: product || "Unknown",
      vendor: vendor || "Unknown",
      purchaseDate: purchaseDate || new Date(),
      expiryDate: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      totalSeats: totalSeats || 1,
      status: 'active',
      cost: cost || undefined,
      currency: currency || 'USD',
      notes: notes || '',
      owner: req.user.id,
      assignedSystems: assignedSystems || [],
      _id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const License = require('../models/License');
    const newLicense = await License.create(licenseData);
    
    return res.status(201).json({
      success: true,
      message: 'License created successfully',
      license: newLicense
    });
  } catch (err) {
    console.error('License creation error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error creating license',
      error: err.message
    });
  }
});

// Create a new license
router.post('/licenses', verifyToken, async (req, res) => {
  try {
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
      assignedSystems
    } = req.body;
    
    // Validate required fields
    if (!name || !licenseKey || !product || !vendor || !purchaseDate || !expiryDate || !totalSeats) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }
    
    const newLicense = new License({
      name,
      licenseKey,
      product,
      vendor,
      purchaseDate,
      expiryDate,
      renewalDate: renewalDate || undefined,
      totalSeats,
      usedSeats: assignedSystems ? assignedSystems.length : 0,
      cost: cost || undefined,
      currency: currency || 'USD',
      notes,
      owner: req.user.id,
      assignedSystems: assignedSystems || []
    });
    
    const license = await newLicense.save();
    
    // Update assigned systems with the license requirement
    if (assignedSystems && assignedSystems.length > 0) {
      await System.updateMany(
        { _id: { $in: assignedSystems } },
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
    
    res.status(201).json({
      success: true,
      license
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update a license
router.put('/licenses/:id', verifyToken, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({ success: false, message: 'License not found' });
    }
    
    // Check if user is owner or admin
    if (license.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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
    
    // Update fields if provided
    if (name) license.name = name;
    if (licenseKey) license.licenseKey = licenseKey;
    if (product) license.product = product;
    if (vendor) license.vendor = vendor;
    if (purchaseDate) license.purchaseDate = purchaseDate;
    if (expiryDate) license.expiryDate = expiryDate;
    license.renewalDate = renewalDate || undefined;
    if (totalSeats) license.totalSeats = totalSeats;
    if (cost !== undefined) license.cost = cost || undefined;
    if (currency) license.currency = currency;
    if (notes) license.notes = notes;
    if (status) license.status = status;
    
    // Handle assigned systems if provided
    if (assignedSystems) {
      const oldAssignedSystems = license.assignedSystems.map(system => system.toString());
      
      // Systems to remove
      const systemsToRemove = oldAssignedSystems.filter(system => !assignedSystems.includes(system));
      
      // Systems to add
      const systemsToAdd = assignedSystems.filter(system => !oldAssignedSystems.includes(system));
      
      // Update license with new assigned systems
      license.assignedSystems = assignedSystems;
      license.usedSeats = assignedSystems.length;
      
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
                licenseType: product || license.product,
                quantity: 1,
                licenseId: license._id
              }
            }
          }
        );
      }
    }
    
    await license.save();
    
    res.json({
      success: true,
      license
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a license
router.delete('/licenses/:id', verifyToken, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({ success: false, message: 'License not found' });
    }
    
    // Check if user is owner or admin
    if (license.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Remove license references from systems
    await System.updateMany(
      { licenseRequirements: { $elemMatch: { licenseId: license._id } } },
      { $pull: { licenseRequirements: { licenseId: license._id } } }
    );
    
    await License.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'License deleted successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all systems
router.get('/systems', verifyToken, async (req, res) => {
  try {
    let query = { managedBy: req.user.id };
    
    // Filter by type if provided
    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type;
    }
    
    // Filter by OS if provided
    if (req.query.os) {
      query.os = { $regex: new RegExp(req.query.os, 'i') };
    }
    
    // Filter by status if provided
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const sortField = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sort = {};
    sort[sortField] = sortOrder;
    
    const total = await System.countDocuments(query);
    const systems = await System.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('managedBy', 'name email')
      .populate('licenseRequirements.licenseId', 'name product vendor expiryDate status');
    
    res.json({
      success: true,
      count: systems.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      systems
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a specific system
router.get('/systems/:id', verifyToken, async (req, res) => {
  try {
    const system = await System.findById(req.params.id)
      .populate('managedBy', 'name email')
      .populate('licenseRequirements.licenseId');
    
    if (!system) {
      return res.status(404).json({ success: false, message: 'System not found' });
    }
    
    // Check if user is manager or admin
    if (system.managedBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    res.json({
      success: true,
      system
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a new system
router.post('/systems', verifyToken, async (req, res) => {
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
      licenseRequirements
    } = req.body;
    
    // Validate required fields
    if (!name || !type || !os) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }
    
    const newSystem = new System({
      name,
      type,
      os,
      osVersion,
      location,
      ip,
      department,
      managedBy: req.user.id,
      installedSoftware: installedSoftware || [],
      licenseRequirements: licenseRequirements || [],
      notes,
      status: status || 'active'
    });
    
    const system = await newSystem.save();
    
    // Update licenses with the new system
    if (licenseRequirements && licenseRequirements.length > 0) {
      for (const requirement of licenseRequirements) {
        if (requirement.licenseId) {
          await License.findByIdAndUpdate(
            requirement.licenseId,
            {
              $push: { assignedSystems: system._id },
              $inc: { usedSeats: 1 }
            }
          );
        }
      }
    }
    
    res.status(201).json({
      success: true,
      system
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update a system
router.put('/systems/:id', verifyToken, async (req, res) => {
  try {
    const system = await System.findById(req.params.id);
    
    if (!system) {
      return res.status(404).json({ success: false, message: 'System not found' });
    }
    
    // Check if user is manager or admin
    if (system.managedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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
      licenseRequirements
    } = req.body;
    
    // Update fields if provided
    if (name) system.name = name;
    if (type) system.type = type;
    if (os) system.os = os;
    if (osVersion) system.osVersion = osVersion;
    if (location) system.location = location;
    if (ip) system.ip = ip;
    if (department) system.department = department;
    if (installedSoftware) system.installedSoftware = installedSoftware;
    if (notes) system.notes = notes;
    if (status) system.status = status;
    
    // Handle license requirements if provided
    if (licenseRequirements) {
      // Get old license IDs for comparison
      const oldLicenseIds = system.licenseRequirements
        .filter(req => req.licenseId)
        .map(req => req.licenseId.toString());
      
      const newLicenseIds = licenseRequirements
        .filter(req => req.licenseId)
        .map(req => req.licenseId.toString());
      
      // Licenses to remove
      const licensesToRemove = oldLicenseIds.filter(id => !newLicenseIds.includes(id));
      
      // Licenses to add
      const licensesToAdd = newLicenseIds.filter(id => !oldLicenseIds.includes(id));
      
      system.licenseRequirements = licenseRequirements;
      
      // Update licenses
      // Remove system from licenses that are no longer assigned
      if (licensesToRemove.length > 0) {
        for (const licenseId of licensesToRemove) {
          await License.findByIdAndUpdate(
            licenseId,
            {
              $pull: { assignedSystems: system._id },
              $inc: { usedSeats: -1 }
            }
          );
        }
      }
      
      // Add system to newly assigned licenses
      if (licensesToAdd.length > 0) {
        for (const licenseId of licensesToAdd) {
          await License.findByIdAndUpdate(
            licenseId,
            {
              $push: { assignedSystems: system._id },
              $inc: { usedSeats: 1 }
            }
          );
        }
      }
    }
    
    system.lastSeen = new Date();
    await system.save();
    
    res.json({
      success: true,
      system
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a system
router.delete('/systems/:id', verifyToken, async (req, res) => {
  try {
    const system = await System.findById(req.params.id);
    
    if (!system) {
      return res.status(404).json({ success: false, message: 'System not found' });
    }
    
    // Check if user is manager or admin
    if (system.managedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Update licenses to remove this system
    const licenseIds = system.licenseRequirements
      .filter(req => req.licenseId)
      .map(req => req.licenseId);
    
    for (const licenseId of licenseIds) {
      await License.findByIdAndUpdate(
        licenseId,
        {
          $pull: { assignedSystems: system._id },
          $inc: { usedSeats: -1 }
        }
      );
    }
    
    await System.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'System deleted successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Dashboard summary data
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // Get license statistics
    const totalLicenses = await License.countDocuments({ owner: req.user.id });
    const activeLicenses = await License.countDocuments({ owner: req.user.id, status: 'active' });
    const expiredLicenses = await License.countDocuments({ owner: req.user.id, status: 'expired' });
    const expiringLicenses = await License.countDocuments({
      owner: req.user.id,
      status: 'active',
      expiryDate: {
        $gte: new Date(),
        $lte: moment().add(30, 'days').toDate()
      }
    });
    
    // Get system statistics
    const totalSystems = await System.countDocuments({ managedBy: req.user.id });
    const activeSystems = await System.countDocuments({ managedBy: req.user.id, status: 'active' });
    
    // Calculate total license cost
    const licenses = await License.find({ owner: req.user.id });
    const totalCost = licenses.reduce((sum, license) => sum + (license.cost || 0), 0);
    
    // Get top 5 products by license count
    const productCounts = await License.aggregate([
      { $match: { owner: mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$product', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get monthly expiry forecast for the next 6 months
    const expiryForecast = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = moment().add(i, 'months').startOf('month');
      const monthEnd = moment().add(i, 'months').endOf('month');
      
      const count = await License.countDocuments({
        owner: req.user.id,
        expiryDate: {
          $gte: monthStart.toDate(),
          $lte: monthEnd.toDate()
        }
      });
      
      expiryForecast.push({
        month: monthStart.format('MMM YYYY'),
        count
      });
    }
    
    res.json({
      success: true,
      stats: {
        licenses: {
          total: totalLicenses,
          active: activeLicenses,
          expired: expiredLicenses,
          expiring: expiringLicenses
        },
        systems: {
          total: totalSystems,
          active: activeSystems
        },
        totalCost,
        productCounts,
        expiryForecast
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;