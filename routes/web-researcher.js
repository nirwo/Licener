/**
 * Web Researcher Routes
 * 
 * This module provides routes for the Web Researcher tool, which allows users to search
 * for vendor and license information across the web and save the results to their database.
 * 
 * Features:
 * - Search for vendor information, license types, pricing, and contact details
 * - View and save search results
 * - Automatically create vendors and licenses from search results
 * 
 * API Integration:
 * - Uses Serper.dev API for real web search results when configured
 * - Falls back to simulated results when the API is not available
 * 
 * Configuration:
 * - Set SERPER_API_KEY in .env file to use the real search API
 * - Set USE_REAL_SEARCH=true to enable real search functionality
 */
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const WebSearch = require('../models/WebSearch');
const SearchResult = require('../models/SearchResult');
const License = require('../models/License');
const Vendor = require('../models/Vendor');
const webResearcherController = require('../controllers/webResearcherController');

// Web Researcher Home - Search Interface
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        // Get recent searches for this user
        const recentSearches = await webResearcherController.getRecentSearches(req.user.id);
            
        res.render('web-researcher/search', {
            title: 'Web Researcher Tool',
            recentSearches
        });
    } catch (err) {
        console.error('Error fetching recent searches:', err);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/dashboard');
    }
});

// Process search request
router.post('/search', ensureAuthenticated, async (req, res) => {
    try {
        const { searchQuery, searchType, sources, includeHistorical, deepSearch } = req.body;
        
        // Validate input
        if (!searchQuery || !searchType) {
            req.flash('error_msg', 'Search query and type are required');
            return res.redirect('/web-researcher');
        }
        
        // Create search record using controller
        const newSearch = await webResearcherController.createSearch({
            userId: req.user.id,
            query: searchQuery,
            type: searchType,
            sources,
            includeHistorical,
            deepSearch
        });
        
        // Perform web search using controller
        const results = await webResearcherController.performWebSearch(searchQuery, searchType, sources);
        
        // Save search results
        for (const result of results) {
            const newResult = new SearchResult({
                search: newSearch._id,
                vendorName: result.vendorName,
                productName: result.productName,
                licenseType: result.licenseType,
                price: result.price,
                pricePeriod: result.pricePeriod,
                description: result.description,
                fullDescription: result.fullDescription,
                source: result.source,
                sourceUrl: result.sourceUrl
            });
            
            await newResult.save();
        }
        
        newSearch.resultsCount = results.length;
        await newSearch.save();
        
        // Redirect to results page
        res.redirect(`/web-researcher/results/${newSearch._id}`);
    } catch (err) {
        console.error('Error processing search:', err);
        req.flash('error_msg', 'An error occurred while processing your search. Please try again.');
        res.redirect('/web-researcher');
    }
});

// Display search results
router.get('/results/:searchId', ensureAuthenticated, async (req, res) => {
    try {
        const searchId = req.params.searchId;
        
        // Use controller to get search results
        const { search, results } = await webResearcherController.getSearchResults(searchId, req.user.id);
        
        res.render('web-researcher/results', {
            title: 'Web Research Results',
            query: search.query,
            searchDate: search.createdAt,
            sources: search.sources,
            results
        });
    } catch (err) {
        console.error('Error fetching search results:', err);
        req.flash('error_msg', 'An error occurred while retrieving search results.');
        res.redirect('/web-researcher');
    }
});

// Handle /results/ without searchId
router.get('/results', ensureAuthenticated, (req, res) => {
    req.flash('error_msg', 'Search ID is required to view results. Please perform a new search.');
    res.redirect('/web-researcher');
});

// Save single result to license/vendor
router.post('/save-result', ensureAuthenticated, async (req, res) => {
    try {
        const { resultId } = req.body;
        
        if (!resultId) {
            return res.json({ success: false, message: 'Result ID is required' });
        }
        
        // Use controller to save result
        const license = await webResearcherController.saveResult(resultId, req.user.id);
        
        return res.json({ success: true, licenseId: license._id });
    } catch (err) {
        console.error('Error saving result:', err);
        return res.json({ success: false, message: 'An error occurred while saving the result' });
    }
});

// Save multiple results
router.post('/save-multiple', ensureAuthenticated, async (req, res) => {
    try {
        const { resultIds } = req.body;
        
        if (!resultIds || !resultIds.length) {
            return res.json({ success: false, message: 'Result IDs are required' });
        }
        
        const savedLicenses = [];
        
        for (const resultId of resultIds) {
            try {
                // Use controller to save each result
                const license = await webResearcherController.saveResult(resultId, req.user.id);
                savedLicenses.push(license._id);
            } catch (error) {
                console.error(`Error saving result ${resultId}:`, error);
                // Continue with other results
            }
        }
        
        return res.json({ 
            success: true, 
            savedCount: savedLicenses.length, 
            licenseIds: savedLicenses
        });
    } catch (err) {
        console.error('Error saving multiple results:', err);
        return res.json({ success: false, message: 'An error occurred while saving results' });
    }
});

module.exports = router; 