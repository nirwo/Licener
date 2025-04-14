const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const Vendor = require('../models/Vendor');
const License = require('../models/License');
const webResearcher = require('../utils/web-researcher');
const vendorController = require('../controllers/vendorController');
const vendorResearchController = require('../controllers/vendorResearchController');

// Vendor list
router.get('/', ensureAuthenticated, vendorController.list);

// Add vendor form
router.get('/add', ensureAuthenticated, vendorController.addForm);

// Add vendor
router.post('/add', ensureAuthenticated, vendorController.create);

// View vendor details
router.get('/:id', ensureAuthenticated, vendorController.view);

// Edit vendor form
router.get('/edit/:id', ensureAuthenticated, vendorController.editForm);

// Update vendor
router.post('/edit/:id', ensureAuthenticated, vendorController.update);

// Delete vendor
router.get('/delete/:id', ensureAuthenticated, vendorController.delete);

// Web Researcher Section

// Show web researcher form
router.get('/research', ensureAuthenticated, ensureAdmin, (req, res) => {
  res.render('vendors/research', {
    title: 'Research Vendors',
  });
});

// Research a vendor
router.post('/research', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { vendorName } = req.body;

    if (!vendorName) {
      req.flash('error_msg', 'Vendor name is required');
      return res.redirect('/vendors/research');
    }

    // Start the research process - this runs asynchronously
    const result = await webResearcher.researchAndUpdateVendor(vendorName);

    if (result.success) {
      req.flash('success_msg', `Research completed for ${vendorName}`);

      // If license types were found, show them
      if (result.licenseTypes && result.licenseTypes.length > 0) {
        req.session.researchResults = {
          vendor: result.vendor,
          licenseTypes: result.licenseTypes,
        };
        return res.redirect('/vendors/research/results');
      }

      res.redirect('/vendors');
    } else {
      req.flash('error_msg', `Error researching vendor: ${result.error}`);
      res.redirect('/vendors/research');
    }
  } catch (err) {
    console.error('Error in vendor research:', err);
    req.flash('error_msg', 'Error processing research request');
    res.redirect('/vendors/research');
  }
});

// Show research results
router.get('/research/results', ensureAuthenticated, (req, res) => {
  // Get results from session
  const results = req.session.researchResults || {};

  res.render('vendors/research-results', {
    title: 'Research Results',
    vendor: results.vendor || {},
    licenseTypes: results.licenseTypes || [],
  });
});

// Save selected research results
router.post('/research/save', ensureAuthenticated, async (req, res) => {
  try {
    const { vendorId, selectedTypes } = req.body;

    if (!vendorId || !selectedTypes) {
      req.flash('error_msg', 'Vendor ID and selected license types are required');
      return res.redirect('/vendors/research/results');
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      req.flash('error_msg', 'Vendor not found');
      return res.redirect('/vendors/research/results');
    }

    // Update vendor with selected license types
    if (Array.isArray(selectedTypes)) {
      vendor.licenseTypes = [...new Set([...(vendor.licenseTypes || []), ...selectedTypes])];
    } else {
      vendor.licenseTypes = [...new Set([...(vendor.licenseTypes || []), selectedTypes])];
    }

    await vendor.save();

    req.flash('success_msg', 'License types saved successfully');
    res.redirect(`/vendors/${vendorId}`);
  } catch (err) {
    console.error('Error saving research results:', err);
    req.flash('error_msg', 'Error saving research results');
    res.redirect('/vendors/research/results');
  }
});

// Batch research form
router.get('/research/batch', ensureAuthenticated, ensureAdmin, (req, res) => {
  res.render('vendors/batch-research', {
    title: 'Batch Research Vendors',
  });
});

// Batch research vendors
router.post('/research/batch', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { vendorNames } = req.body;

    if (!vendorNames) {
      req.flash('error_msg', 'Vendor names are required');
      return res.redirect('/vendors/research/batch');
    }

    // Split the vendor names by newline or comma
    const vendors = vendorNames
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (vendors.length === 0) {
      req.flash('error_msg', 'No valid vendor names provided');
      return res.redirect('/vendors/research/batch');
    }

    // Store the vendor list in session to process in the background
    req.session.batchVendors = vendors;
    req.session.batchResults = [];
    req.session.batchInProgress = true;
    req.session.batchStarted = new Date().toISOString();

    req.flash('success_msg', `Started batch research for ${vendors.length} vendors`);
    res.redirect('/vendors/research/batch/status');

    // Process vendors in the background
    processBatchVendors(req);
  } catch (err) {
    console.error('Error in batch vendor research:', err);
    req.flash('error_msg', 'Error processing batch research request');
    res.redirect('/vendors/research/batch');
  }
});

// Check batch research status
router.get('/research/batch/status', ensureAuthenticated, ensureAdmin, (req, res) => {
  const batchInProgress = req.session.batchInProgress || false;
  const batchResults = req.session.batchResults || [];
  const batchVendors = req.session.batchVendors || [];
  const batchStarted = req.session.batchStarted || null;

  res.render('vendors/batch-status', {
    title: 'Batch Research Status',
    batchInProgress,
    batchResults,
    batchVendors,
    batchStarted,
    progress:
      batchVendors.length > 0 ? Math.round((batchResults.length / batchVendors.length) * 100) : 0,
  });
});

// Process batch research in the background
async function processBatchVendors(req) {
  try {
    const vendors = req.session.batchVendors || [];

    if (vendors.length === 0) {
      req.session.batchInProgress = false;
      return;
    }

    // Process vendors one by one
    for (const vendorName of vendors) {
      try {
        const result = await webResearcher.researchAndUpdateVendor(vendorName);

        req.session.batchResults = req.session.batchResults || [];
        req.session.batchResults.push({
          vendorName,
          success: result.success,
          error: result.error,
          licenseTypesCount: result.licenseTypes ? result.licenseTypes.length : 0,
          completedAt: new Date().toISOString(),
        });

        // Add a delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Error processing vendor ${vendorName}:`, err);
        req.session.batchResults = req.session.batchResults || [];
        req.session.batchResults.push({
          vendorName,
          success: false,
          error: err.message,
          completedAt: new Date().toISOString(),
        });
      }
    }

    // Mark batch as completed
    req.session.batchInProgress = false;
  } catch (err) {
    console.error('Error in processBatchVendors:', err);
    req.session.batchInProgress = false;
  }
}

module.exports = router;
