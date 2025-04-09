const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureManager } = require('../middleware/auth');
const License = require('../models/License');
const System = require('../models/System');
const User = require('../models/User');
const moment = require('moment');
const { NodeParser } = require('@json2csv/node'); // Updated package

// Helper function to convert user ID to string for queries
const getUserId = (req) => req.user._id.toString();

// Reports Dashboard
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    // For the dashboard, we'll redirect to license expiry report as default
    const userId = getUserId(req);
    
    // Get some basic stats for the dashboard
    let allLicenses = License.find({ owner: userId });
    
    const currentDate = new Date();
    const thirtyDaysLater = new Date(currentDate);
    thirtyDaysLater.setDate(currentDate.getDate() + 30);
    const ninetyDaysLater = new Date(currentDate);
    ninetyDaysLater.setDate(currentDate.getDate() + 90);
    
    // Filter licenses manually for date ranges
    const expiringLicenses = allLicenses.filter(license => {
      const expiryDate = new Date(license.expiryDate);
      return expiryDate >= currentDate && expiryDate <= thirtyDaysLater;
    });
    
    const expiredLicenses = allLicenses.filter(license => {
      return new Date(license.expiryDate) < currentDate;
    });
    
    // Sort by expiry date
    expiringLicenses.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    expiredLicenses.sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate));
    
    res.render('reports/license-expiry', {
      title: 'License Expiry Report',
      expiringLicenses,
      expiredLicenses,
      timeframe: 30,
      stats: {
        critical: expiringLicenses.length,
        warning: 0, // We could calculate this if needed
        ok: allLicenses.length - expiringLicenses.length - expiredLicenses.length
      },
      licenses: [...expiringLicenses, ...expiredLicenses]
    });
  } catch (err) {
    console.error('Error loading reports dashboard:', err);
    req.flash('error_msg', 'Error loading reports dashboard');
    res.redirect('/dashboard');
  }
});

// License Expiry Report
router.get('/license-expiry', ensureAuthenticated, async (req, res) => {
  try {
    const userId = getUserId(req);
    const timeframe = req.query.timeframe || '30';
    const days = parseInt(timeframe);
    const currentDate = new Date();
    const futureDate = moment().add(days, 'days').toDate();
    
    // Use file-db find with manual filtering for dates
    let allLicenses = License.find({
      owner: userId
    });
    
    // Filter licenses manually for date ranges
    const expiringLicenses = allLicenses.filter(license => {
      const expiryDate = new Date(license.expiryDate);
      return expiryDate >= currentDate && expiryDate <= futureDate;
    });
    
    const expiredLicenses = allLicenses.filter(license => {
      return new Date(license.expiryDate) < currentDate;
    });
    
    // Sort by expiry date
    expiringLicenses.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    expiredLicenses.sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate));
    
    res.render('reports/license-expiry', {
      title: 'License Expiry Report',
      expiringLicenses,
      expiredLicenses,
      timeframe
    });
  } catch (err) {
    console.error('Error generating license expiry report:', err);
    req.flash('error_msg', 'Error generating license expiry report');
    res.redirect('/reports');
  }
});

// License Utilization Report
router.get('/license-utilization', ensureAuthenticated, async (req, res) => {
  try {
    const userId = getUserId(req);
    // Get all licenses for the user
    let licenses = License.find({ owner: userId });
    
    // If no licenses found, show empty state
    if (!licenses || licenses.length === 0) {
      return res.render('reports/license-utilization', {
        title: 'License Utilization Report',
        productUtilization: [],
        noLicenses: true
      });
    }

    // Recalculate usedSeats by counting assigned systems for accuracy
    for (const license of licenses) {
      const assignedSystemIds = license.assignedSystems || [];
      license.usedSeats = assignedSystemIds.length;
      
      // Make sure totalSeats is a number
      if (!license.totalSeats || isNaN(parseInt(license.totalSeats))) {
        license.totalSeats = 1; // Default to 1 seat
      } else {
        license.totalSeats = parseInt(license.totalSeats);
      }
      
      // Update license in DB
      await License.findByIdAndUpdate(license._id, { 
        usedSeats: license.usedSeats,
        totalSeats: license.totalSeats
      });
    }
    
    // Sort by product and name
    licenses.sort((a, b) => {
      const productCompare = (a.product || '').localeCompare(b.product || '');
      if (productCompare !== 0) return productCompare;
      return (a.name || '').localeCompare(b.name || '');
    });
    
    // Group licenses by product
    const licensesByProduct = {};
    licenses.forEach(license => {
      const productKey = license.product || 'Uncategorized';
      if (!licensesByProduct[productKey]) {
        licensesByProduct[productKey] = [];
      }
      licensesByProduct[productKey].push(license);
    });
    
    // Calculate product utilization
    const productUtilization = [];
    for (const [product, productLicenses] of Object.entries(licensesByProduct)) {
      const totalSeats = productLicenses.reduce((sum, license) => sum + (parseInt(license.totalSeats) || 0), 0);
      const usedSeats = productLicenses.reduce((sum, license) => sum + (parseInt(license.usedSeats) || 0), 0);
      const utilization = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
      
      productUtilization.push({
        product,
        totalSeats,
        usedSeats,
        availableSeats: totalSeats - usedSeats,
        utilization,
        licenses: productLicenses,
        licenseCount: productLicenses.length
      });
    }
    
    // Sort by utilization (highest to lowest)
    productUtilization.sort((a, b) => b.utilization - a.utilization);
    
    // Calculate total utilization
    const totalSeats = licenses.reduce((sum, license) => sum + (parseInt(license.totalSeats) || 0), 0);
    const usedSeats = licenses.reduce((sum, license) => sum + (parseInt(license.usedSeats) || 0), 0);
    const overallUtilization = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
    
    res.render('reports/license-utilization', {
      title: 'License Utilization Report',
      productUtilization,
      totalLicenses: licenses.length,
      totalSeats,
      usedSeats,
      availableSeats: totalSeats - usedSeats,
      overallUtilization
    });
  } catch (err) {
    console.error('Error generating license utilization report:', err);
    req.flash('error_msg', 'Error generating license utilization report');
    res.redirect('/reports');
  }
});

// Cost Analysis Report
router.get('/cost-analysis', ensureAuthenticated, async (req, res) => {
  try {
    const userId = getUserId(req);
    const period = req.query.period || 'year'; // Note: Period isn't used in current calculation logic
    const chartType = req.query.chartType || 'pie';
    const groupBy = req.query.groupBy || 'vendor';
    
    // Get all licenses for the user
    let licenses = License.find({ owner: userId });
    
    // Group costs by vendor, product
    const vendorCosts = {};
    const productCosts = {};
    let totalCost = 0;
    let vendorCounts = {};
    let productCounts = {};
    
    licenses.forEach(license => {
      // Ensure cost is a valid number
      const cost = parseFloat(license.cost || 0);
      // If cost is NaN, use 0
      const numericCost = isNaN(cost) ? 0 : cost;
      
      // Get vendor and product
      const vendorKey = license.vendor || 'Unknown Vendor';
      const productKey = license.product || 'Unknown Product';
      
      // Count vendors and products
      vendorCounts[vendorKey] = (vendorCounts[vendorKey] || 0) + 1;
      productCounts[productKey] = (productCounts[productKey] || 0) + 1;
      
      // Add to total cost
      totalCost += numericCost;
      
      // Vendor costs
      vendorCosts[vendorKey] = (vendorCosts[vendorKey] || 0) + numericCost;
      // Product costs
      productCosts[productKey] = (productCosts[productKey] || 0) + numericCost;
    });
    
    // Convert to arrays for sorting and display
    const vendorCostsArray = Object.entries(vendorCosts).map(([vendor, cost]) => ({
      vendor,
      cost: cost.toFixed(2),
      count: vendorCounts[vendor], // Add license count
      percentage: totalCost > 0 ? ((cost / totalCost) * 100).toFixed(2) : 0
    }));
    
    const productCostsArray = Object.entries(productCosts).map(([product, cost]) => ({
      product,
      cost: cost.toFixed(2),
      count: productCounts[product], // Add license count
      percentage: totalCost > 0 ? ((cost / totalCost) * 100).toFixed(2) : 0
    }));
    
    // Sort by cost (highest to lowest)
    vendorCostsArray.sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost));
    productCostsArray.sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost));
    
    res.render('reports/cost-analysis', {
      title: 'Cost Analysis Report',
      vendorCosts: vendorCostsArray,
      productCosts: productCostsArray,
      totalCost: totalCost.toFixed(2),
      period, // Pass period to template if needed for display
      chartType, // Pass chart type for rendering
      groupBy, // Pass groupBy preference
      totalLicenses: licenses.length
    });
  } catch (err) {
    console.error('Error generating cost analysis report:', err);
    req.flash('error_msg', 'Error generating cost analysis report');
    res.redirect('/reports');
  }
});

// System License Compliance Report
router.get('/compliance', ensureAuthenticated, async (req, res) => {
  try {
    const userId = getUserId(req);
    // Get systems managed by the user
    let systems = System.findByManager(userId);
    
    // Sort by name
    systems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // Populate license requirements using the refined System.populate
    // Note: populate now returns cloned objects, safe to modify
    systems = await System.populate(systems, 'licenseRequirements.licenseId');

    if (!Array.isArray(systems)) {
        console.warn('Compliance Report: Systems data is not an array after population.');
        systems = []; // Prevent errors if population failed unexpectedly
    }
    
    // Calculate compliance status for each system
    const complianceData = systems.map(system => {
      const licenseRequirements = system.licenseRequirements || [];
      let complianceStatus = 'unknown'; // Default
      let issues = [];

      if (licenseRequirements.length === 0) {
          complianceStatus = 'no_requirements';
      } else {
          let compliant = true;
          for (const req of licenseRequirements) {
              if (!req.licenseId || typeof req.licenseId !== 'object') {
                  // License ID was not populated (likely missing license)
                  compliant = false;
                  issues.push(`Missing license for requirement: ${req.licenseType || 'Unknown Type'}`);
              } else if (req.licenseId.status === 'expired') {
                  // License is expired
                  compliant = false;
                  issues.push(`Expired license: ${req.licenseId.name} (Product: ${req.licenseId.product})`);
              }
              // Add other checks here (e.g., seat count mismatches)
          }
          complianceStatus = compliant ? 'compliant' : 'non-compliant';
      }
      
      return {
        system,
        complianceStatus,
        issues, // Add issues array for details
        licenseRequirements // Keep populated requirements for display
      };
    });
    
    // Count compliance statuses
    const counts = complianceData.reduce((acc, data) => {
        acc[data.complianceStatus] = (acc[data.complianceStatus] || 0) + 1;
        return acc;
    }, {});

    res.render('reports/compliance', {
      title: 'System License Compliance Report',
      complianceData,
      stats: {
        compliantCount: counts.compliant || 0,
        nonCompliantCount: counts['non-compliant'] || 0,
        noRequirementsCount: counts.no_requirements || 0,
        unknownCount: counts.unknown || 0, // Should be 0 with new logic
        totalCount: systems.length
      }
    });
  } catch (err) {
    console.error('Error generating compliance report:', err);
    req.flash('error_msg', 'Error generating compliance report');
    res.redirect('/reports');
  }
});

// License Renewal Forecast
router.get('/renewal-forecast', ensureAuthenticated, async (req, res) => {
  try {
    const userId = getUserId(req);
    const period = req.query.period || '12';
    const months = parseInt(period);
    
    // Calculate date range for the entire forecast period
    const forecastStartDate = moment().startOf('day').toDate();
    const forecastEndDate = moment().add(months, 'months').endOf('month').toDate();
    
    // Fetch all licenses and filter manually
    let allLicenses = License.find({ owner: userId });
    
    // Filter for licenses within the forecast period
    let relevantLicenses = allLicenses.filter(license => {
      const expiryDate = new Date(license.expiryDate);
      return expiryDate >= forecastStartDate && expiryDate <= forecastEndDate;
    });
    
    const renewalData = [];
    let totalForecastCost = 0;
    
    // Process licenses month by month
    for (let i = 0; i < months; i++) {
      const monthStart = moment().add(i, 'months').startOf('month');
      const monthEnd = moment().add(i, 'months').endOf('month');
      
      // Filter licenses for the current month from the pre-fetched list
      const expiringThisMonth = relevantLicenses.filter(license => {
        const expiryDate = new Date(license.expiryDate);
        return expiryDate >= monthStart.toDate() && expiryDate <= monthEnd.toDate();
      });
      
      // Sort by expiry date
      expiringThisMonth.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
      
      // Calculate cost for the month (ensure cost is a number and multiply by total seats for total cost)
      const monthCost = expiringThisMonth.reduce((sum, license) => {
          const cost = parseFloat(license.cost);
          const totalSeats = parseInt(license.totalSeats) || 1;
          const licenseTotalCost = (isNaN(cost) ? 0 : cost) * totalSeats;
          console.log(`License ${license.name}: Cost per seat: ${cost}, Total seats: ${totalSeats}, Total cost: ${licenseTotalCost}`);
          return sum + licenseTotalCost;
      }, 0);
      totalForecastCost += monthCost;
      
      renewalData.push({
        month: monthStart.format('MMMM YYYY'),
        licenses: expiringThisMonth,
        cost: monthCost.toFixed(2),
        count: expiringThisMonth.length
      });
    }
    
    res.render('reports/renewal-forecast', {
      title: 'License Renewal Forecast',
      renewalData,
      totalCost: totalForecastCost.toFixed(2),
      period
    });
  } catch (err) {
    console.error('Error generating renewal forecast:', err);
    req.flash('error_msg', 'Error generating renewal forecast');
    res.redirect('/reports');
  }
});

// Custom report builder
router.get('/custom', ensureAuthenticated, async (req, res) => {
  try {
    const userId = getUserId(req);
    const fields = req.query.fields ? (Array.isArray(req.query.fields) ? req.query.fields : [req.query.fields]) : [];
    const groupBy = req.query.groupBy;
    const sortBy = req.query.sortBy || (fields.includes('name') ? 'name' : (fields.length > 0 ? fields[0] : 'name')); // Default sort
    const sortOrder = req.query.sortOrder || 'asc';
    
    let reportData = [];
    const availableFields = [
        { value: 'name', label: 'License Name' },
        { value: 'product', label: 'Product' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'licenseKey', label: 'License Key' },
        { value: 'purchaseDate', label: 'Purchase Date' },
        { value: 'expiryDate', label: 'Expiry Date' },
        { value: 'renewalDate', label: 'Renewal Date' },
        { value: 'totalSeats', label: 'Total Seats' },
        { value: 'usedSeats', label: 'Used Seats' }, // Consider recalculating like in utilization?
        { value: 'status', label: 'Status' },
        { value: 'cost', label: 'Cost' },
        { value: 'notes', label: 'Notes' }
    ];

    if (fields.length > 0) {
      // Get all licenses for the user
      let licenses = License.find({ owner: userId });
      
      // Project only selected fields
      licenses = licenses.map(license => {
        const projection = {};
        fields.forEach(field => {
          // Handle potential undefined fields gracefully
          projection[field] = license.hasOwnProperty(field) ? license[field] : null;
        });
        projection._id = license._id; // Keep ID for potential linking
        return projection;
      });
      
      // Sort the data
      const sortFunction = (a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        let comparison = 0;

        // Handle different types for comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else if (aValue instanceof Date && bValue instanceof Date) {
            comparison = aValue.getTime() - bValue.getTime();
        } else if (aValue && bValue) { // Add check for non-null values
            // Try to convert to appropriate types
            if (!isNaN(Date.parse(aValue)) && !isNaN(Date.parse(bValue))) {
                // If both can be parsed as dates
                comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
            } else if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
                // If both can be parsed as numbers
                comparison = Number(aValue) - Number(bValue);
            } else {
                // Fallback for other types
                const strA = String(aValue);
                const strB = String(bValue);
                comparison = strA.localeCompare(strB);
            }
        } else {
            // Handle cases where one or both values are null/undefined
            const strA = aValue !== null && aValue !== undefined ? String(aValue) : '';
            const strB = bValue !== null && bValue !== undefined ? String(bValue) : '';
            comparison = strA.localeCompare(strB);
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      };
      
      licenses.sort(sortFunction);
      
      if (groupBy && fields.includes(groupBy)) {
        // Group data
        const groupedData = {};
        licenses.forEach(license => {
          const groupValue = license[groupBy] != null ? String(license[groupBy]) : 'Uncategorized';
          if (!groupedData[groupValue]) {
            groupedData[groupValue] = [];
          }
          groupedData[groupValue].push(license);
        });
        
        // Convert to array for template, sort groups by key
        reportData = Object.entries(groupedData)
            .map(([key, items]) => ({ groupValue: key, items }))
            .sort((a, b) => a.groupValue.localeCompare(b.groupValue));
      } else {
        reportData = licenses; // Ungrouped, already sorted
      }
    }
    
    res.render('reports/custom', {
      title: 'Custom Report Builder',
      fields: fields, // Pass selected fields
      groupBy: groupBy,
      sortBy: sortBy,
      sortOrder: sortOrder,
      reportData: reportData,
      fieldOptions: availableFields,
      isGrouped: !!(groupBy && fields.includes(groupBy))
    });
  } catch (err) {
    console.error('Error generating custom report:', err);
    req.flash('error_msg', 'Error generating custom report');
    res.redirect('/reports');
  }
});

// Export report to CSV
router.get('/export/:report', ensureAuthenticated, async (req, res) => {
  try {
    const userId = getUserId(req);
    const reportType = req.params.report;
    let reportData = [];
    let csvHeaders = [];
    let filename = `${reportType}_report_${moment().format('YYYYMMDD_HHmmss')}.csv`;

    // --- Fetch data based on report type (similar logic to GET routes) ---
    if (reportType === 'expiry') {
      const timeframe = req.query.timeframe || '30';
      const days = parseInt(timeframe);
      const currentDate = new Date();
      const futureDate = moment().add(days, 'days').toDate();
      
      // Get all licenses and filter manually
      let allLicenses = License.find({ owner: userId });
      
      // Filter for expiring and expired licenses
      const expiring = allLicenses.filter(license => {
        const expiryDate = new Date(license.expiryDate);
        return expiryDate >= currentDate && expiryDate <= futureDate;
      });
      
      const expired = allLicenses.filter(license => {
        return new Date(license.expiryDate) < currentDate;
      });
      
      reportData = [...expiring, ...expired].map(l => ({ 
        ...l, 
        reportStatus: new Date(l.expiryDate) < currentDate ? 'Expired' : 'Expiring Soon' 
      }));
      csvHeaders = ['reportStatus', 'name', 'product', 'vendor', 'expiryDate', 'totalSeats', 'cost'];
      filename = `expiry_report_${timeframe}days_${moment().format('YYYYMMDD_HHmmss')}.csv`;

    } else if (reportType === 'utilization') {
      let licenses = License.find({ owner: userId });
      for (const license of licenses) {
          license.usedSeats = (license.assignedSystems || []).length;
      }
      reportData = licenses.map(l => ({
          ...l,
          utilization: (l.totalSeats > 0 ? Math.round(((l.usedSeats || 0) / l.totalSeats) * 100) : 0) + '%'
      }));
      csvHeaders = ['product', 'name', 'vendor', 'totalSeats', 'usedSeats', 'utilization', 'expiryDate'];

    } else if (reportType === 'cost') {
      let licenses = License.find({ owner: userId });
      reportData = licenses.filter(l => !isNaN(parseFloat(l.cost)) && parseFloat(l.cost) > 0);
      csvHeaders = ['vendor', 'product', 'name', 'cost', 'currency', 'purchaseDate', 'expiryDate'];

    } else if (reportType === 'compliance') {
      let systems = System.findByManager(userId);
      systems = await System.populate(systems, 'licenseRequirements.licenseId');
      reportData = systems.map(system => {
          const licenseRequirements = system.licenseRequirements || [];
          let complianceStatus = 'unknown';
          let issues = [];
          if (licenseRequirements.length === 0) complianceStatus = 'no_requirements';
          else {
              let compliant = true;
              licenseRequirements.forEach(req => {
                  if (!req.licenseId || typeof req.licenseId !== 'object') issues.push(`Missing license for ${req.licenseType || 'type'}`);
                  else if (req.licenseId.status === 'expired') issues.push(`Expired: ${req.licenseId.name}`);
              });
              if (issues.length > 0) compliant = false;
              complianceStatus = compliant ? 'compliant' : 'non-compliant';
          }
          return {
              systemName: system.name,
              systemType: system.systemType,
              status: complianceStatus,
              issues: issues.join('; ') // Join issues for CSV cell
          };
      });
      csvHeaders = ['systemName', 'systemType', 'status', 'issues'];

    } else if (reportType === 'renewal') {
      const period = req.query.period || '12';
      const months = parseInt(period);
      const forecastStartDate = moment().startOf('day').toDate();
      const forecastEndDate = moment().add(months, 'months').endOf('month').toDate();
      
      // Get all licenses and filter manually
      let allLicenses = License.find({ owner: userId });
      
      // Filter licenses for the forecast period
      reportData = allLicenses.filter(license => {
        const expiryDate = new Date(license.expiryDate);
        return expiryDate >= forecastStartDate && expiryDate <= forecastEndDate;
      });
      
      csvHeaders = ['name', 'product', 'vendor', 'expiryDate', 'renewalDate', 'cost', 'currency'];
      filename = `renewal_forecast_${period}months_${moment().format('YYYYMMDD_HHmmss')}.csv`;

    } else if (reportType === 'custom') {
        // Re-run custom report logic - requires query params from original request
        // This might be complex, consider passing params or simplifying
        return res.status(400).send('CSV Export for custom reports requires original query parameters. Feature not fully implemented.');
    } else {
      req.flash('error_msg', 'Invalid report type for export.');
      return res.redirect('/reports');
    }

    if (reportData.length === 0) {
        req.flash('info_msg', 'No data available to export for this report.');
        return res.redirect('/reports');
    }

    // --- Generate CSV --- 
    try {
        // Clean up the data to ensure all fields exist and are properly formatted
        const cleanData = reportData.map(item => {
          const cleanItem = {};
          csvHeaders.forEach(header => {
            cleanItem[header] = item[header] !== undefined ? item[header] : '';
          });
          return cleanItem;
        });
        
        const json2csvParser = new NodeParser({ fields: csvHeaders });
        const csv = json2csvParser.parse(cleanData);

        res.header('Content-Type', 'text/csv');
        res.attachment(filename);
        res.send(csv);
    } catch (csvError) {
        console.error('Error generating CSV:', csvError);
        req.flash('error_msg', 'Error generating CSV file.');
        res.redirect('/reports');
    }

  } catch (err) {
    console.error(`Error exporting report ${req.params.report}:`, err);
    req.flash('error_msg', 'Error exporting report data.');
    res.redirect('/reports');
  }
});

module.exports = router;