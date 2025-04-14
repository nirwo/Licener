const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ensureAuthenticated } = require('../middleware/auth');
const VendorSearch = require('../models/VendorSearch');
const Vendor = require('../models/Vendor');

// Display the vendor research form
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    // Get recent searches for this user
    const recentSearches = await VendorSearch.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(5);

    res.render('vendors/research/index', {
      title: 'Vendor Research Tool',
      recentSearches,
    });
  } catch (err) {
    console.error('Error loading vendor research page:', err);
    req.flash('error_msg', 'An error occurred while loading the research tool');
    res.redirect('/dashboard');
  }
});

// Process search request
router.post('/search', ensureAuthenticated, async (req, res) => {
  const { query, sources } = req.body;

  try {
    // Save the search query
    const search = new VendorSearch({
      query,
      user: req.user.id,
      sources: sources || ['web'],
    });
    await search.save();

    // Perform search using web APIs and internal database
    const results = await performVendorSearch(query, sources);

    // Render the results page
    res.render('vendors/research/results', {
      title: 'Vendor Research Results',
      query,
      results,
      searchId: search._id,
    });
  } catch (err) {
    console.error('Error performing vendor search:', err);
    req.flash('error_msg', 'An error occurred while performing the search');
    res.redirect('/vendors/research');
  }
});

// Add vendor from research results
router.post('/add-vendor', ensureAuthenticated, async (req, res) => {
  const { name, website, description, searchId } = req.body;

  try {
    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ name });

    if (existingVendor) {
      req.flash('info_msg', `Vendor '${name}' already exists in your database`);
      return res.redirect(`/vendors/edit/${existingVendor._id}`);
    }

    // Create a new vendor
    const vendor = new Vendor({
      name,
      website,
      description,
      addedBy: req.user.id,
    });

    await vendor.save();

    // Update the search record to indicate vendor was added
    if (searchId) {
      await VendorSearch.findByIdAndUpdate(searchId, {
        $push: {
          addedVendors: vendor._id,
        },
      });
    }

    req.flash('success_msg', `Vendor '${name}' has been added to your database`);
    res.redirect(`/vendors/view/${vendor._id}`);
  } catch (err) {
    console.error('Error adding vendor from research:', err);
    req.flash('error_msg', 'An error occurred while adding the vendor');
    res.redirect('/vendors/research');
  }
});

// Helper function to perform vendor search
async function performVendorSearch(query, sources = ['web']) {
  const results = [];

  // Search in internal database if requested
  if (sources.includes('database')) {
    const dbResults = await Vendor.find({
      name: { $regex: query, $options: 'i' },
    }).limit(5);

    dbResults.forEach(vendor => {
      results.push({
        name: vendor.name,
        website: vendor.website,
        description: vendor.description,
        source: 'database',
        inDatabase: true,
        id: vendor._id,
      });
    });
  }

  // Perform web search if requested
  if (sources.includes('web')) {
    try {
      // Use a search API or scraping service here
      // This is a placeholder - in a real implementation you would
      // integrate with an actual search API or web scraping service
      const apiUrl = 'https://api.serper.dev/search';
      const response = await axios.post(
        apiUrl,
        {
          q: `${query} software vendor`,
          num: 5,
        },
        {
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY || 'your-api-key',
            'Content-Type': 'application/json',
          },
        }
      );

      // Process the search results
      if (response.data && response.data.organic) {
        for (const result of response.data.organic) {
          // Check if this vendor is already in our database
          const vendorName = result.title.split(' - ')[0].trim();
          const existingVendor = await Vendor.findOne({
            name: { $regex: `^${vendorName}$`, $options: 'i' },
          });

          results.push({
            name: vendorName,
            website: result.link,
            description: result.snippet,
            source: 'web',
            inDatabase: !!existingVendor,
            id: existingVendor ? existingVendor._id : null,
          });
        }
      }
    } catch (err) {
      console.error('Web search API error:', err);
      // Continue with any results we have
    }
  }

  return results;
}

module.exports = router;
