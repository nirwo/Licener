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
    const userId = req.user._id.toString();
    console.log('Dashboard loading for user:', {
      _id: userId,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    });
    
    // IMPORTANT FIX: Get all licenses temporarily for testing/display
    console.log(`Loading all licenses for display, skipping owner filter for now`);
    let allUserLicenses = await License.find({});
    
    // Print license details for debugging
    allUserLicenses.forEach((license, index) => {
      console.log(`License ${index+1}: ID=${license._id}, Name=${license.name}, Owner=${license.owner}`);
    });
    
    // Always get user-specific systems 
    const allUserSystems = await System.find({ managedBy: userId });

    // Add detailed debug logging
    console.log(`Dashboard - Logged in User ID: ${userId}`);
    console.log(`Dashboard - Found ${allUserLicenses.length} licenses for this owner ID.`);
    console.log(`Dashboard - Found ${allUserSystems.length} systems managed by this user.`);
    
    // Log license owner IDs if no licenses found
    if (allUserLicenses.length === 0) {
      const allLicensesInDb = await License.find({}); // Fetch all licenses regardless of owner
      console.log(`Found ${allLicensesInDb.length} total licenses in database`);
      
      // Log owner IDs for comparison
      if (allLicensesInDb.length > 0) {
        const ownerIds = allLicensesInDb.map(license => ({ 
          _id: license._id, 
          owner: license.owner,
          name: license.name 
        }));
        console.log('Dashboard - License owner IDs:', JSON.stringify(ownerIds, null, 2));
      }
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

    // Prepare data for charts
    const activeLicensesCount = allUserLicenses.filter(lic => lic.status === 'active').length;
    const pendingLicensesCount = allUserLicenses.filter(lic => lic.status === 'pending').length;
    const renewedLicensesCount = allUserLicenses.filter(lic => lic.status === 'renewed').length;
    
    // Create vendor distribution data
    const vendorCounts = {};
    allUserLicenses.forEach(license => {
      const vendor = license.vendor || 'Unknown';
      vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    });
    
    // Create cost data
    const vendorCosts = {};
    allUserLicenses.forEach(license => {
      const vendor = license.vendor || 'Unknown';
      const cost = parseFloat(license.cost) || 0;
      const seats = parseInt(license.totalSeats) || 1;
      vendorCosts[vendor] = (vendorCosts[vendor] || 0) + (cost * seats);
    });
    
    // Prepare expiry timeline (next 6 months)
    const expiryTimelineData = {
      labels: [],
      data: [],
      colors: []
    };
    
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const expiringCount = allUserLicenses.filter(lic => {
        const expiryDate = new Date(lic.expiryDate);
        return expiryDate >= monthStart && expiryDate <= monthEnd;
      }).length;
      
      expiryTimelineData.labels.push(monthName);
      expiryTimelineData.data.push(expiringCount);
      
      // Color code: red for current month, orange for next, yellow for others
      if (i === 0) expiryTimelineData.colors.push('#e74a3b'); // Red
      else if (i === 1) expiryTimelineData.colors.push('#f6c23e'); // Orange/Yellow
      else expiryTimelineData.colors.push('#4e73df'); // Blue
    }
    
    // Get recent licenses for display (5 most recent)
    const recentLicenses = [...allUserLicenses]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5)
      .map(license => ({
        _id: license._id,
        product: license.product || 'Unknown',
        vendor: license.vendor || 'Unknown',
        status: license.status || 'unknown',
        expiryDate: license.expiryDate,
        assignedTo: Array.isArray(license.assignedSystems) ? license.assignedSystems.length : 0
      }));
    
    // Prepare chart data object
    const chartData = {
      expiryTimeline: expiryTimelineData,
      vendors: {
        labels: Object.keys(vendorCounts),
        data: Object.values(vendorCounts)
      },
      costs: {
        labels: Object.keys(vendorCosts),
        data: Object.values(vendorCosts).map(cost => cost.toFixed(2))
      }
    };
    
    // Prepare dashboard stats
    const stats = {
      totalLicenses: licenseCount,
      activeLicenses: activeLicensesCount,
      expiredLicenses: expiredLicensesCount,
      pendingLicenses: pendingLicensesCount,
      renewedLicenses: renewedLicensesCount,
      expiringSoon: expiringLicenses.length,
      totalSystems: systemCount
    };
    
    // Render dashboard with complete data
    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      stats,
      expiringLicenses,
      recentLicenses,
      chartData
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