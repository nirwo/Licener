const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureManager } = require('../middleware/auth');
const License = require('../models/License');
const System = require('../models/System');
const User = require('../models/User');
const moment = require('moment');

// Reports Dashboard
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    res.render('reports/index', {
      title: 'Reports Dashboard'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading reports dashboard');
    res.redirect('/dashboard');
  }
});

// License Expiry Report
router.get('/license-expiry', ensureAuthenticated, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '30';
    const days = parseInt(timeframe);
    
    const expiringLicenses = await License.find({
      owner: req.user.id,
      expiryDate: {
        $gte: new Date(),
        $lte: moment().add(days, 'days').toDate()
      }
    }).sort({ expiryDate: 1 });
    
    const expiredLicenses = await License.find({
      owner: req.user.id,
      expiryDate: { $lt: new Date() }
    }).sort({ expiryDate: -1 });
    
    res.render('reports/license-expiry', {
      title: 'License Expiry Report',
      expiringLicenses,
      expiredLicenses,
      timeframe
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error generating license expiry report');
    res.redirect('/reports');
  }
});

// License Utilization Report
router.get('/license-utilization', ensureAuthenticated, async (req, res) => {
  try {
    const licenses = await License.find({ owner: req.user.id })
      .sort({ product: 1, name: 1 });
    
    // Group licenses by product
    const licensesByProduct = {};
    
    licenses.forEach(license => {
      if (!licensesByProduct[license.product]) {
        licensesByProduct[license.product] = [];
      }
      
      licensesByProduct[license.product].push(license);
    });
    
    // Calculate product utilization
    const productUtilization = [];
    
    for (const [product, productLicenses] of Object.entries(licensesByProduct)) {
      const totalSeats = productLicenses.reduce((sum, license) => sum + license.totalSeats, 0);
      const usedSeats = productLicenses.reduce((sum, license) => sum + license.usedSeats, 0);
      const utilization = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
      
      productUtilization.push({
        product,
        totalSeats,
        usedSeats,
        utilization,
        licenses: productLicenses
      });
    }
    
    // Sort by utilization (highest to lowest)
    productUtilization.sort((a, b) => b.utilization - a.utilization);
    
    res.render('reports/license-utilization', {
      title: 'License Utilization Report',
      productUtilization
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error generating license utilization report');
    res.redirect('/reports');
  }
});

// Cost Analysis Report
router.get('/cost-analysis', ensureAuthenticated, async (req, res) => {
  try {
    const period = req.query.period || 'year';
    const licenses = await License.find({ owner: req.user.id });
    
    // Group costs by vendor, product, and time period
    const vendorCosts = {};
    const productCosts = {};
    let totalCost = 0;
    
    licenses.forEach(license => {
      if (!license.cost) return;
      
      const cost = license.cost;
      totalCost += cost;
      
      // Vendor costs
      if (!vendorCosts[license.vendor]) {
        vendorCosts[license.vendor] = 0;
      }
      vendorCosts[license.vendor] += cost;
      
      // Product costs
      if (!productCosts[license.product]) {
        productCosts[license.product] = 0;
      }
      productCosts[license.product] += cost;
    });
    
    // Convert to arrays for sorting
    const vendorCostsArray = Object.entries(vendorCosts).map(([vendor, cost]) => ({
      vendor,
      cost,
      percentage: (cost / totalCost) * 100
    }));
    
    const productCostsArray = Object.entries(productCosts).map(([product, cost]) => ({
      product,
      cost,
      percentage: (cost / totalCost) * 100
    }));
    
    // Sort by cost (highest to lowest)
    vendorCostsArray.sort((a, b) => b.cost - a.cost);
    productCostsArray.sort((a, b) => b.cost - a.cost);
    
    res.render('reports/cost-analysis', {
      title: 'Cost Analysis Report',
      vendorCosts: vendorCostsArray,
      productCosts: productCostsArray,
      totalCost,
      period
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error generating cost analysis report');
    res.redirect('/reports');
  }
});

// System License Compliance Report
router.get('/compliance', ensureAuthenticated, async (req, res) => {
  try {
    const systems = await System.find({ managedBy: req.user.id })
      .populate('licenseRequirements.licenseId')
      .sort({ name: 1 });
    
    // Calculate compliance status for each system
    const complianceData = systems.map(system => {
      const licenseRequirements = system.licenseRequirements.filter(req => req.licenseId);
      
      // Check if all licenses are active
      const hasExpiredLicense = licenseRequirements.some(
        req => req.licenseId.status === 'expired'
      );
      
      // Check if system has any licenses at all
      const hasLicenses = licenseRequirements.length > 0;
      
      let complianceStatus;
      if (!hasLicenses) {
        complianceStatus = 'unknown';
      } else if (hasExpiredLicense) {
        complianceStatus = 'non-compliant';
      } else {
        complianceStatus = 'compliant';
      }
      
      return {
        system,
        complianceStatus,
        licenseRequirements
      };
    });
    
    // Count compliance statuses
    const compliantCount = complianceData.filter(data => data.complianceStatus === 'compliant').length;
    const nonCompliantCount = complianceData.filter(data => data.complianceStatus === 'non-compliant').length;
    const unknownCount = complianceData.filter(data => data.complianceStatus === 'unknown').length;
    
    res.render('reports/compliance', {
      title: 'System License Compliance Report',
      complianceData,
      stats: {
        compliantCount,
        nonCompliantCount,
        unknownCount,
        totalCount: systems.length
      }
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error generating compliance report');
    res.redirect('/reports');
  }
});

// License Renewal Forecast
router.get('/renewal-forecast', ensureAuthenticated, async (req, res) => {
  try {
    const period = req.query.period || '12';
    const months = parseInt(period);
    
    const renewalData = [];
    let totalCost = 0;
    
    // Generate data for each month in the forecast period
    for (let i = 0; i < months; i++) {
      const monthStart = moment().add(i, 'months').startOf('month');
      const monthEnd = moment().add(i, 'months').endOf('month');
      
      const expiringLicenses = await License.find({
        owner: req.user.id,
        expiryDate: {
          $gte: monthStart.toDate(),
          $lte: monthEnd.toDate()
        }
      }).sort({ expiryDate: 1 });
      
      const monthCost = expiringLicenses.reduce((sum, license) => sum + (license.cost || 0), 0);
      totalCost += monthCost;
      
      renewalData.push({
        month: monthStart.format('MMMM YYYY'),
        licenses: expiringLicenses,
        cost: monthCost
      });
    }
    
    res.render('reports/renewal-forecast', {
      title: 'License Renewal Forecast',
      renewalData,
      totalCost,
      period
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error generating renewal forecast');
    res.redirect('/reports');
  }
});

// Custom report builder
router.get('/custom', ensureAuthenticated, async (req, res) => {
  try {
    const fields = req.query.fields ? (Array.isArray(req.query.fields) ? req.query.fields : [req.query.fields]) : [];
    const groupBy = req.query.groupBy;
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder || 'asc';
    
    let reportData = [];
    
    if (fields.length > 0) {
      // Get licenses with selected fields
      const projection = {};
      fields.forEach(field => {
        projection[field] = 1;
      });
      
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      const sortOptions = {};
      sortOptions[sortBy] = sortDirection;
      
      const licenses = await License.find({ owner: req.user.id }, projection)
        .sort(sortOptions);
      
      if (groupBy && fields.includes(groupBy)) {
        // Group data
        const groupedData = {};
        
        licenses.forEach(license => {
          const groupValue = license[groupBy];
          if (!groupedData[groupValue]) {
            groupedData[groupValue] = [];
          }
          
          groupedData[groupValue].push(license);
        });
        
        // Convert to array for template
        reportData = Object.entries(groupedData).map(([key, items]) => ({
          groupValue: key,
          items
        }));
      } else {
        reportData = licenses;
      }
    }
    
    res.render('reports/custom', {
      title: 'Custom Report Builder',
      fields,
      groupBy,
      sortBy,
      sortOrder,
      reportData,
      fieldOptions: [
        { value: 'name', label: 'License Name' },
        { value: 'product', label: 'Product' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'purchaseDate', label: 'Purchase Date' },
        { value: 'expiryDate', label: 'Expiry Date' },
        { value: 'renewalDate', label: 'Renewal Date' },
        { value: 'totalSeats', label: 'Total Seats' },
        { value: 'usedSeats', label: 'Used Seats' },
        { value: 'status', label: 'Status' },
        { value: 'cost', label: 'Cost' }
      ]
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error generating custom report');
    res.redirect('/reports');
  }
});

// Export report to CSV
router.get('/export/:report', ensureAuthenticated, async (req, res) => {
  try {
    const reportType = req.params.report;
    let reportData = [];
    let filename = `${reportType}_report_${Date.now()}.csv`;
    let csvHeaders = '';
    let csvContent = '';
    
    // Generate report data based on report type
    switch (reportType) {
      case 'expiry':
        const timeframe = req.query.timeframe || '30';
        const days = parseInt(timeframe);
        
        const expiringLicenses = await License.find({
          owner: req.user.id,
          expiryDate: {
            $gte: new Date(),
            $lte: moment().add(days, 'days').toDate()
          }
        }).sort({ expiryDate: 1 });
        
        csvHeaders = 'License Name,Product,Vendor,Expiry Date,Days Until Expiry,Status\n';
        csvContent = expiringLicenses.map(license => {
          const daysUntil = moment(license.expiryDate).diff(moment(), 'days');
          return `"${license.name}","${license.product}","${license.vendor}","${license.expiryDate.toISOString().split('T')[0]}",${daysUntil},"${license.status}"\n`;
        }).join('');
        break;
        
      case 'utilization':
        const licenses = await License.find({ owner: req.user.id })
          .sort({ product: 1, name: 1 });
        
        csvHeaders = 'License Name,Product,Vendor,Total Seats,Used Seats,Utilization %\n';
        csvContent = licenses.map(license => {
          const utilization = license.totalSeats > 0 ? Math.round((license.usedSeats / license.totalSeats) * 100) : 0;
          return `"${license.name}","${license.product}","${license.vendor}",${license.totalSeats},${license.usedSeats},${utilization}\n`;
        }).join('');
        break;
        
      case 'compliance':
        const systems = await System.find({ managedBy: req.user.id })
          .populate('licenseRequirements.licenseId')
          .sort({ name: 1 });
        
        csvHeaders = 'System Name,OS,Type,Compliance Status,License Count,Expired Licenses\n';
        csvContent = systems.map(system => {
          const licenseRequirements = system.licenseRequirements.filter(req => req.licenseId);
          const hasExpiredLicense = licenseRequirements.some(req => req.licenseId.status === 'expired');
          const hasLicenses = licenseRequirements.length > 0;
          
          let complianceStatus;
          if (!hasLicenses) {
            complianceStatus = 'unknown';
          } else if (hasExpiredLicense) {
            complianceStatus = 'non-compliant';
          } else {
            complianceStatus = 'compliant';
          }
          
          const expiredCount = licenseRequirements.filter(req => req.licenseId.status === 'expired').length;
          
          return `"${system.name}","${system.os}","${system.type}","${complianceStatus}",${licenseRequirements.length},${expiredCount}\n`;
        }).join('');
        break;
        
      default:
        req.flash('error_msg', 'Invalid report type');
        return res.redirect('/reports');
    }
    
    // Create file
    const fs = require('fs');
    const path = require('path');
    const dir = './data/exports';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, csvHeaders + csvContent);
    
    // Send file to user
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error(err);
      }
      
      // Clean up file after download
      fs.unlinkSync(filepath);
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error exporting report');
    res.redirect('/reports');
  }
});

module.exports = router;