const Vendor = require('../models/Vendor');
const axios = require('axios');
const cheerio = require('cheerio');

// Show research form
exports.showResearchForm = (req, res) => {
  res.render('vendors/research/form', {
    title: 'Vendor Research',
  });
};

// Process research request
exports.processResearch = async (req, res) => {
  try {
    const { searchTerm, source } = req.body;

    if (!searchTerm) {
      req.flash('error_msg', 'Search term is required');
      return res.redirect('/vendors/research/form');
    }

    // Store search parameters in session
    req.session.vendorSearch = {
      searchTerm,
      source,
      timestamp: new Date(),
    };

    // Perform search based on selected source
    let results = [];

    if (source === 'web' || !source) {
      // Web search
      results = await performWebSearch(searchTerm);
    } else if (source === 'crunchbase') {
      // Crunchbase search (premium API - mock data for now)
      results = mockCrunchbaseSearch(searchTerm);
    } else if (source === 'linkedin') {
      // LinkedIn search (premium API - mock data for now)
      results = mockLinkedInSearch(searchTerm);
    }

    // Store results in session
    req.session.vendorResults = results;

    res.redirect('/vendors/research/results');
  } catch (err) {
    console.error('Error researching vendors:', err);
    req.flash('error_msg', 'Error performing vendor research');
    res.redirect('/vendors/research/form');
  }
};

// Show research results
exports.showResults = (req, res) => {
  // Get results from session
  const results = req.session.vendorResults || [];
  const searchInfo = req.session.vendorSearch || {};

  res.render('vendors/research/results', {
    title: 'Research Results',
    results,
    searchInfo,
  });
};

// Save selected vendor from research
exports.saveVendor = async (req, res) => {
  try {
    const { index } = req.body;

    // Get results from session
    const results = req.session.vendorResults || [];

    if (!results[index]) {
      req.flash('error_msg', 'Selected vendor result not found');
      return res.redirect('/vendors/research/results');
    }

    const vendorData = results[index];

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({
      name: { $regex: new RegExp('^' + vendorData.name + '$', 'i') },
    });

    if (existingVendor) {
      req.flash('error_msg', 'A vendor with this name already exists');
      return res.redirect('/vendors/research/results');
    }

    // Create new vendor
    const newVendor = new Vendor({
      name: vendorData.name,
      description: vendorData.description,
      website: vendorData.website,
      contactEmail: vendorData.email,
      contactPhone: vendorData.phone,
      address: vendorData.location,
      notes: `Added from research on ${new Date().toLocaleDateString()}`,
    });

    await newVendor.save();

    req.flash('success_msg', 'Vendor added successfully');
    res.redirect(`/vendors/view/${newVendor._id}`);
  } catch (err) {
    console.error('Error saving vendor from research:', err);
    req.flash('error_msg', 'Error saving vendor');
    res.redirect('/vendors/research/results');
  }
};

// Helper function to perform web search
async function performWebSearch(searchTerm) {
  try {
    // Simulated web scraping results
    // In a real implementation, this would use axios to fetch data and cheerio to parse it

    // For demo purposes, return mock results
    return [
      {
        name: `${searchTerm} Technologies`,
        description: `Leading provider of software solutions in the ${searchTerm} space.`,
        website: `https://www.${searchTerm.toLowerCase().replace(/\s+/g, '')}.com`,
        email: `info@${searchTerm.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: '+1 (800) 555-1234',
        location: 'San Francisco, CA',
        foundedYear: '2010',
        employees: '100-500',
      },
      {
        name: `${searchTerm} Solutions Inc.`,
        description: `Enterprise software company specializing in ${searchTerm} management.`,
        website: `https://www.${searchTerm.toLowerCase().replace(/\s+/g, '')}solutions.com`,
        email: `contact@${searchTerm.toLowerCase().replace(/\s+/g, '')}solutions.com`,
        phone: '+1 (888) 555-5678',
        location: 'New York, NY',
        foundedYear: '2005',
        employees: '500-1000',
      },
      {
        name: `${searchTerm} Group`,
        description: `Global leader in ${searchTerm} software and services.`,
        website: `https://www.${searchTerm.toLowerCase().replace(/\s+/g, '')}group.com`,
        email: `info@${searchTerm.toLowerCase().replace(/\s+/g, '')}group.com`,
        phone: '+1 (866) 555-9012',
        location: 'Austin, TX',
        foundedYear: '2015',
        employees: '50-100',
      },
    ];
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

// Mock Crunchbase search
function mockCrunchbaseSearch(searchTerm) {
  return [
    {
      name: `${searchTerm} Corp`,
      description: `Crunchbase: ${searchTerm} Corp is a technology company focused on enterprise solutions.`,
      website: `https://www.${searchTerm.toLowerCase().replace(/\s+/g, '')}corp.com`,
      email: `info@${searchTerm.toLowerCase().replace(/\s+/g, '')}corp.com`,
      phone: '+1 (800) 555-2345',
      location: 'Boston, MA',
      foundedYear: '2012',
      employees: '200-500',
      funding: '$24M Series B',
    },
    {
      name: `${searchTerm} AI`,
      description: `Crunchbase: ${searchTerm} AI develops artificial intelligence solutions for business.`,
      website: `https://www.${searchTerm.toLowerCase().replace(/\s+/g, '')}ai.com`,
      email: `contact@${searchTerm.toLowerCase().replace(/\s+/g, '')}ai.com`,
      phone: '+1 (888) 555-6789',
      location: 'Palo Alto, CA',
      foundedYear: '2018',
      employees: '25-50',
      funding: '$8M Seed',
    },
  ];
}

// Mock LinkedIn search
function mockLinkedInSearch(searchTerm) {
  return [
    {
      name: `${searchTerm} Technologies Ltd.`,
      description: `LinkedIn: ${searchTerm} Technologies is a software company with expertise in cloud solutions.`,
      website: `https://www.${searchTerm.toLowerCase().replace(/\s+/g, '')}tech.com`,
      email: `info@${searchTerm.toLowerCase().replace(/\s+/g, '')}tech.com`,
      phone: '+1 (800) 555-3456',
      location: 'Seattle, WA',
      foundedYear: '2008',
      employees: '1000+',
      industry: 'Information Technology',
    },
    {
      name: `${searchTerm} Systems`,
      description: `LinkedIn: ${searchTerm} Systems provides integrated software solutions for enterprise clients.`,
      website: `https://www.${searchTerm.toLowerCase().replace(/\s+/g, '')}systems.com`,
      email: `contact@${searchTerm.toLowerCase().replace(/\s+/g, '')}systems.com`,
      phone: '+1 (888) 555-7890',
      location: 'Chicago, IL',
      foundedYear: '2010',
      employees: '500-1000',
      industry: 'Enterprise Software',
    },
  ];
}
