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
    // Fetch all licenses and systems for the user - use _id instead of id
    const allUserLicenses = await License.find({ owner: req.user._id.toString() });
    const allUserSystems = await System.find({ managedBy: req.user._id.toString() });

    // Debugging: Log user ID and fetched licenses
    console.log(`Dashboard - Logged in User ID: ${req.user.id}`);
    console.log(`Dashboard - Found ${allUserLicenses.length} licenses for this owner ID.`);
    // Optional: Log the actual license objects if the count is 0 but shouldn't be
    if (allUserLicenses.length === 0) {
      const allLicensesInDb = await License.find({}); // Fetch all licenses regardless of owner
      console.log('Dashboard - All licenses in DB:', JSON.stringify(allLicensesInDb, null, 2));
    }

    // Calculate counts
    const licenseCount = allUserLicenses.length;
    const systemCount = allUserSystems.length;
    const expiredLicensesCount = allUserLicenses.filter(lic => lic.status === 'expired').length;

    // Calculate expiring licenses (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = moment().add(30, 'days').toDate();
    const expiringLicenses = allUserLicenses
      .filter(lic => {
        if (!lic.expiryDate) return false;
        const expiry = new Date(lic.expiryDate);
        return expiry >= now && expiry <= thirtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)) // Sort by expiry date ASC
      .slice(0, 5); // Limit to 5

    // Get license utilization data for chart with proper ID comparison
    const licenses = await License.find({ owner: req.user._id.toString() })
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
      expiredLicenses: expiredLicensesCount, // Pass the count
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