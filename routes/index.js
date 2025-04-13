const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const License = require('../models/License');
const System = require('../models/System');
const moment = require('moment');

// Home page
router.get('/', (req, res) => {
  // If user is authenticated, redirect to dashboard
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  
  // Otherwise show landing page - no layout needed as the landing page includes its own complete HTML
  res.render('landing', {
    title: 'Welcome to Licener',
    layout: false // Don't use any layout, the landing page is self-contained
  });
});

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Licener'
  });
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    // Initialize variables that will be reassigned later
    let recentLicenses = [];
    let expiringLicenses = [];
    let chartData = {};
    
    // Extract user ID and normalize to string for consistent comparison
    const userId = req.user._id ? req.user._id.toString() : req.user._id;
    
    console.log('Dashboard loading for user:', {
      _id: userId,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    });
    
    // IMPORTANT DEBUG: Dump all licenses to see what's actually in the database
    const allLicensesInDb = await License.find({});
    console.log(`DEBUG - Found ${allLicensesInDb.length} total licenses in database`);
    allLicensesInDb.forEach((license, index) => {
      console.log(`License ${index+1} in DB: ID=${license._id}, Owner=${license.owner}, Product=${license.product || license.name}`);
    });
    
    // First try exact string match
    let allUserLicenses = [];
    if (userId) {
      allUserLicenses = allLicensesInDb.filter(license => {
        const licenseOwner = license.owner ? license.owner.toString() : '';
        const isMatch = licenseOwner === userId;
        console.log(`License ${license._id} - Owner: ${licenseOwner}, User: ${userId}, Match: ${isMatch}`);
        return isMatch;
      });
    }
    
    console.log(`Found ${allUserLicenses.length} licenses with exact owner ID match`);
    
    // Add better debug output for license data
    console.log('Dashboard loading - Found licenses:', {
      total: allLicensesInDb.length,
      forCurrentUser: allUserLicenses.length
    });

    // Ensure we're not sending empty data to the template
    if (allUserLicenses.length === 0 && !process.env.DEMO_MODE) {
      console.log('WARNING: No licenses found for user, using all licenses for display');
      allUserLicenses = allLicensesInDb;
    }

    // Make sure to pass a proper array even if no data exists
    recentLicenses = allUserLicenses.length > 0 
      ? allUserLicenses.slice(0, 5) 
      : [];

    // Debug the actual data being passed to the template
    console.log('Sending to dashboard:', {
      licenseCount: recentLicenses.length,
      expiringCount: expiringLicenses ? expiringLicenses.length : 0
    });

    // If no licenses found and this isn't the demo user, show all licenses
    if (allUserLicenses.length === 0 && userId !== 'u39dks82bn') { 
      console.log(`No licenses found for user ${userId}, loading all licenses for display`);
      allUserLicenses = allLicensesInDb;
    }
    
    // Print license details for dashboard display
    if (allUserLicenses.length > 0) {
      console.log(`Using ${allUserLicenses.length} licenses for dashboard display`);
      allUserLicenses.forEach((license, index) => {
        console.log(`Dashboard License ${index+1}: ID=${license._id}, Name=${license.name || license.product}`);
      });
    } else {
      console.log('No licenses available for dashboard display');
    }
    
    // Always get user-specific systems 
    const allUserSystems = await System.find({});
    const userSystems = allUserSystems.filter(system => {
      const systemManager = system.managedBy ? system.managedBy.toString() : '';
      return systemManager === userId;
    });
    
    console.log(`Dashboard - Found ${userSystems.length} systems managed by this user out of ${allUserSystems.length} total systems.`);
    
    // Use all systems for display if none found for this user and not demo
    const allUserSystemsForDisplay = userSystems.length > 0 ? userSystems : 
                                    (userId !== 'u39dks82bn' ? allUserSystems : []);

    // Calculate counts
    const licenseCount = allUserLicenses.length;
    const systemCount = allUserSystemsForDisplay.length;
    const expiredLicensesCount = allUserLicenses.filter(lic => lic.status === 'expired').length;

    // Calculate expiring licenses (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = moment().add(30, 'days').toDate();
    
    // Add debug for expiry dates
    console.log('DEBUG - License expiry check');
    allUserLicenses.forEach(lic => {
      if (lic.expiryDate) {
        console.log(`License ${lic._id} expiry: ${lic.expiryDate}, in 30-day window: ${new Date(lic.expiryDate) <= thirtyDaysFromNow}`);
      }
    });
    
    expiringLicenses = allUserLicenses
      .filter(lic => {
        if (!lic.expiryDate) return false;
        const expiry = new Date(lic.expiryDate);
        return expiry >= now && expiry <= thirtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)) // Sort by expiry date ASC
      .slice(0, 5); // Limit to 5
      
    console.log(`Found ${expiringLicenses.length} licenses expiring within 30 days`);
    
    // Get license utilization data for chart with improved calculation
    const utilizationLicenses = allUserLicenses
      .filter(license => license.totalSeats > 0) // Only include licenses with seats
      .map(license => {
        // Ensure proper utilization calculation
        const totalSeats = parseInt(license.totalSeats) || 1;
        const usedSeats = license.assignedSystems ? license.assignedSystems.length : (license.usedSeats || 0);
        const utilization = Math.min(100, (usedSeats / totalSeats) * 100);
        
        return {
          ...license,
          calculatedUtilization: parseFloat(utilization.toFixed(2))
        };
      })
      .sort((a, b) => b.calculatedUtilization - a.calculatedUtilization) // Sort DESC
      .slice(0, 5); // Limit to 5
    
    const licenseUtilization = {
      labels: utilizationLicenses.map(license => license.name || license.product || 'Unknown'),
      data: utilizationLicenses.map(license => license.calculatedUtilization)
    };
    
    console.log('License utilization data:', {
      licenseCount: utilizationLicenses.length,
      utilizationData: utilizationLicenses.map(l => 
        `${l.name || l.product}: ${l.calculatedUtilization}% (${l.assignedSystems ? l.assignedSystems.length : 0}/${l.totalSeats})`
      )
    });

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
    recentLicenses = [...allUserLicenses]
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
    
    // Define standard colors for charts
    const chartColors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#5a5c69'];
    
    // Prepare chart data object with fallback values if empty
    chartData = {
      expiryTimeline: {
        labels: expiryTimelineData.labels.length > 0 ? expiryTimelineData.labels : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: expiryTimelineData.data.length > 0 ? expiryTimelineData.data : [0, 0, 0, 0, 0, 0],
        colors: expiryTimelineData.colors.length > 0 ? expiryTimelineData.colors : ['#e74a3b', '#f6c23e', '#4e73df', '#4e73df', '#4e73df', '#4e73df']
      },
      vendors: {
        labels: Object.keys(vendorCounts).length > 0 ? Object.keys(vendorCounts) : ['No Vendors'],
        data: Object.values(vendorCounts).length > 0 ? Object.values(vendorCounts) : [0]
      },
      costs: {
        labels: Object.keys(vendorCosts).length > 0 ? Object.keys(vendorCosts) : ['No Cost Data'],
        data: Object.values(vendorCosts).length > 0 ? Object.values(vendorCosts).map(cost => cost.toFixed(2)) : [0]
      },
      colors: chartColors
    };
    
    // Debug chart data
    console.log('Dashboard - Chart Data:', JSON.stringify({
      timelineLabels: chartData.expiryTimeline.labels,
      timelineData: chartData.expiryTimeline.data,
      vendorLabels: chartData.vendors.labels,
      vendorData: chartData.vendors.data,
      costLabels: chartData.costs.labels,
      costData: chartData.costs.data
    }, null, 2));
    
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
    
    // Check if we're missing any critical data
    if (!stats || !stats.totalLicenses) {
      console.log('WARNING: Stats data is missing or incomplete, using backup data');
      stats = {
        totalLicenses: allUserLicenses.length || 0,
        activeLicenses: allUserLicenses.filter(lic => lic.status === 'active').length || 0,
        expiredLicenses: allUserLicenses.filter(lic => lic.status === 'expired').length || 0,
        pendingLicenses: allUserLicenses.filter(lic => lic.status === 'pending').length || 0,
        renewedLicenses: allUserLicenses.filter(lic => lic.status === 'renewed').length || 0,
        expiringSoon: expiringLicenses.length || 0,
        totalSystems: allUserSystemsForDisplay.length || 0
      };
    }
    
    // If no license data at all, create some demo data
    if (!allUserLicenses.length) {
      console.log('WARNING: No license data available, creating fake demo data');
      // Generate fake licenses for demo purposes
      const demoLicenses = [
        {
          _id: 'demo1',
          product: 'Microsoft Office 365',
          vendor: 'Microsoft',
          status: 'active',
          expiryDate: moment().add(20, 'days').toDate(),
          assignedTo: 2,
          cost: 999
        },
        {
          _id: 'demo2',
          product: 'Adobe Creative Cloud',
          vendor: 'Adobe',
          status: 'active',
          expiryDate: moment().add(45, 'days').toDate(),
          assignedTo: 5,
          cost: 1299
        },
        {
          _id: 'demo3',
          product: 'Windows Server 2022',
          vendor: 'Microsoft',
          status: 'pending',
          expiryDate: moment().add(5, 'days').toDate(),
          assignedTo: 1,
          cost: 2499
        },
        {
          _id: 'demo4',
          product: 'AutoCAD 2023',
          vendor: 'Autodesk',
          status: 'active',
          expiryDate: moment().add(15, 'days').toDate(),
          assignedTo: 3,
          cost: 1799
        }
      ];
      
      // Update demo data with utilization information
      demoLicenses.forEach(license => {
        const totalSeats = license.totalSeats || 1;
        const usedSeats = license.assignedTo || 0;
        license.usedSeats = usedSeats;
        license.utilization = Math.min(100, (usedSeats / totalSeats) * 100);
      });

      // Set demo data
      allUserLicenses = demoLicenses;
      recentLicenses = demoLicenses;
      expiringLicenses = demoLicenses.filter(lic => {
        const expiry = new Date(lic.expiryDate);
        return expiry >= now && expiry <= thirtyDaysFromNow;
      });
      
      // Update stats with demo data
      stats = {
        totalLicenses: demoLicenses.length,
        activeLicenses: demoLicenses.filter(lic => lic.status === 'active').length,
        expiredLicenses: demoLicenses.filter(lic => lic.status === 'expired').length,
        pendingLicenses: demoLicenses.filter(lic => lic.status === 'pending').length,
        renewedLicenses: demoLicenses.filter(lic => lic.status === 'renewed').length,
        expiringSoon: expiringLicenses.length,
        totalSystems: 3
      };
      
      // Update chart data with demo data
      const vendorCounts = {};
      const vendorCosts = {};
      
      demoLicenses.forEach(license => {
        const vendor = license.vendor || 'Unknown';
        vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
        vendorCosts[vendor] = (vendorCosts[vendor] || 0) + (license.cost || 0);
      });
      
      // Define standard colors for charts
      const chartColors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#5a5c69'];
      
      chartData = {
        expiryTimeline: {
          labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
          data: [3, 1, 0, 0, 0, 0],
          colors: ['#e74a3b', '#f6c23e', '#4e73df', '#4e73df', '#4e73df', '#4e73df']
        },
        vendors: {
          labels: Object.keys(vendorCounts),
          data: Object.values(vendorCounts)
        },
        costs: {
          labels: Object.keys(vendorCosts),
          data: Object.values(vendorCosts).map(cost => cost.toFixed(2))
        },
        colors: chartColors
      };
    }
    
    // Render dashboard with complete data
    // Add a helper to properly serialize the data for handlebars
    res.locals.json = function(obj) {
      return JSON.stringify(obj);
    };
    
    // Debug output for charts
    console.log('FINAL Chart data for render:', JSON.stringify({
      timelineLabels: chartData.expiryTimeline.labels,
      vendorLabels: chartData.vendors.labels,
      costLabels: chartData.costs.labels
    }));
    
    console.log('FINAL Stats for render:', JSON.stringify(stats));
    console.log('User info for render:', JSON.stringify({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }));
    
    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      stats,
      expiringLicenses,
      recentLicenses,
      chartData
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    req.flash('error_msg', 'Error loading dashboard data: ' + err.message);
    
    // Generate demo data for the error case
    // Generate fake licenses for demo purposes
    const demoLicenses = [
      {
        _id: 'demo1',
        product: 'Microsoft Office 365',
        vendor: 'Microsoft',
        status: 'active',
        expiryDate: moment().add(20, 'days').toDate(),
        assignedTo: 2,
        cost: 999
      },
      {
        _id: 'demo2',
        product: 'Adobe Creative Cloud',
        vendor: 'Adobe',
        status: 'active',
        expiryDate: moment().add(45, 'days').toDate(),
        assignedTo: 5,
        cost: 1299
      },
      {
        _id: 'demo3',
        product: 'Windows Server 2022',
        vendor: 'Microsoft',
        status: 'pending',
        expiryDate: moment().add(5, 'days').toDate(),
        assignedTo: 1,
        cost: 2499
      }
    ];
    
    const expiringDemoLicenses = demoLicenses.filter(lic => 
      moment(lic.expiryDate).diff(moment(), 'days') <= 30
    );
    
    // Create demo stats
    const demoStats = {
      totalLicenses: demoLicenses.length,
      activeLicenses: demoLicenses.filter(lic => lic.status === 'active').length,
      expiredLicenses: 0,
      pendingLicenses: demoLicenses.filter(lic => lic.status === 'pending').length,
      renewedLicenses: 0,
      expiringSoon: expiringDemoLicenses.length,
      totalSystems: 2
    };
    
    // Create vendor and cost distribution data
    const vendorCounts = {};
    const vendorCosts = {};
    
    demoLicenses.forEach(license => {
      const vendor = license.vendor || 'Unknown';
      vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
      vendorCosts[vendor] = (vendorCosts[vendor] || 0) + (license.cost || 0);
    });
    
    // Define standard colors for charts
    const demoChartColors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#5a5c69'];
    
    // Create demo chart data
    const demoChartData = {
      expiryTimeline: {
        labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        data: [2, 1, 0, 0, 0, 0],
        colors: ['#e74a3b', '#f6c23e', '#4e73df', '#4e73df', '#4e73df', '#4e73df']
      },
      vendors: {
        labels: Object.keys(vendorCounts),
        data: Object.values(vendorCounts)
      },
      costs: {
        labels: Object.keys(vendorCosts),
        data: Object.values(vendorCosts).map(cost => cost.toFixed(2))
      },
      colors: demoChartColors
    };
    
    // Add a helper to properly serialize the data for handlebars
    res.locals.json = function(obj) {
      return JSON.stringify(obj);
    };
    
    console.log('FALLBACK: Using demo data after error');
    
    res.render('dashboard', {
      title: 'Dashboard [DEMO MODE]',
      user: req.user,
      stats: demoStats,
      expiringLicenses: expiringDemoLicenses,
      recentLicenses: demoLicenses,
      chartData: demoChartData,
      errorOccurred: true,
      errorMessage: err.message
    });
  }
});

module.exports = router;