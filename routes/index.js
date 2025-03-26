const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const License = require('../models/License');
const System = require('../models/System');
const moment = require('moment');

// Welcome Page
router.get('/', (req, res) => {
  res.render('welcome', {
    title: 'Welcome to Licener'
  });
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    // Get counts and stats
    const licenseCount = await License.countDocuments({ owner: req.user.id });
    const expiringLicenses = await License.find({
      owner: req.user.id,
      expiryDate: {
        $gte: new Date(),
        $lte: moment().add(30, 'days').toDate()
      }
    }).sort({ expiryDate: 1 }).limit(5);
    
    const expiredLicenses = await License.countDocuments({
      owner: req.user.id,
      status: 'expired'
    });
    
    const systemCount = await System.countDocuments({ managedBy: req.user.id });
    
    // Get license utilization data for chart
    const licenses = await License.find({ owner: req.user.id })
      .sort({ utilization: -1 })
      .limit(5);
    
    const licenseUtilization = {
      labels: licenses.map(license => license.name),
      data: licenses.map(license => license.utilization)
    };

    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      licenseCount,
      systemCount,
      expiredLicenses,
      expiringLicenses,
      licenseUtilization: JSON.stringify(licenseUtilization)
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading dashboard data');
    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user
    });
  }
});

module.exports = router;