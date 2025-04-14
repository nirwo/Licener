const webResearcher = require('../utils/web-researcher');
const Vendor = require('../models/Vendor');
const logger = require('../utils/logger');

/**
 * Display the research form
 */
exports.showResearchForm = (req, res) => {
  res.render('vendors/research/form', {
    title: 'Vendor Research',
    user: req.user,
  });
};

/**
 * Search for vendors based on a search term
 */
exports.searchVendors = async (req, res) => {
  const { searchTerm, source = 'web' } = req.body;

  if (!searchTerm) {
    req.flash('error', 'Please provide a search term');
    return res.redirect('/vendors/research');
  }

  try {
    logger.info(
      `User ${req.user.email} is searching for vendors with term "${searchTerm}" using source "${source}"`

    // Perform the search
    const results = await webResearcher.searchVendors(searchTerm, source);

    // Check if any results were found
    if (!results || results.length === 0) {
      req.flash(
        'warning',
        'No vendors found for your search term. Try a different term or source.'
      );
      return res.redirect('/vendors/research');
    }

    // Save the results in the session for later use
    req.session.vendorSearchResults = results;

    // Render the results page
    res.render('vendors/research/results', {
      title: 'Vendor Search Results',
      user: req.user,
      searchTerm,
      source,
      results,
      hasResults: results.length > 0,
    });

  } catch (error) {
    logger.error(`Error searching for vendors: ${error.message}`);
    req.flash('error', `An error occurred during the search: ${error.message}`);
    res.redirect('/vendors/research');
  }
};

/**
 * Add a vendor to the database from search results
 */
exports.addVendorFromResults = async (req, res) => {
  const { resultId } = req.body;

  // Check if we have results in the session
  if (!req.session.vendorSearchResults) {
    req.flash('error', 'No search results found. Please search again.');
    return res.redirect('/vendors/research');
  }

  // Find the selected vendor from the results
  const vendorData = req.session.vendorSearchResults.find(v => v.id === resultId);

  if (!vendorData) {
    req.flash('error', 'The selected vendor was not found in the search results.');
    return res.redirect('/vendors/research');
  }

  try {
    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({
      $or: [
        { name: { $regex: new RegExp('^' + vendorData.name + '$', 'i') } },
        { website: vendorData.website },
      ],
    });

    if (existingVendor) {
      req.flash('info', `Vendor "${vendorData.name}" already exists in your database.`);
      return res.redirect('/vendors');
    }

    // Create the new vendor
    const newVendor = new Vendor({
      name: vendorData.name,
      website: vendorData.website,
      description: vendorData.description,
      createdBy: req.user._id,
      source: 'web-research',
    });

    await newVendor.save();

    logger.info(
      `User ${req.user.email} added new vendor "${newVendor.name}" from research results`
    );
    req.flash('success', `Vendor "${newVendor.name}" has been added successfully!`);
    res.redirect('/vendors');

  } catch (error) {
    logger.error(`Error adding vendor from research: ${error.message}`);
    req.flash('error', `Failed to add vendor: ${error.message}`);
    res.redirect('/vendors/research');
  }
};

/**
 * Research license types for a vendor
 */
exports.researchLicenses = async (req, res) => {
  const { vendorId } = req.params;

  try {
    // Get the vendor
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      req.flash('error', 'Vendor not found');
      return res.redirect('/vendors');
    }

    // Research licenses for this vendor
    const licenseResults = await webResearcher.researchLicenses(vendor.name);

    // Save the results in the session
    req.session.licenseSearchResults = {
      vendorId: vendor._id,
      vendorName: vendor.name,
      results: licenseResults,
    };

    // Render the results page
    res.render('vendors/research/license-results', {
      title: `License Research for ${vendor.name}`,
      user: req.user,
      vendor,
      results: licenseResults,
      hasResults: licenseResults.length > 0,
    });
  } catch (error) {
    logger.error(`Error researching licenses: ${error.message}`);
    req.flash('error', `An error occurred during license research: ${error.message}`);
    res.redirect('/vendors');
  }
};
