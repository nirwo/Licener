const axios = require('axios');
const WebSearch = require('../models/WebSearch');
const SearchResult = require('../models/SearchResult');
const Vendor = require('../models/Vendor');
const License = require('../models/License');

// Set up logger with fallback to console
let logger;
try {
    logger = require('../utils/logger');
} catch (error) {
    // If logger is not available, use console
    logger = {
        info: (message) => console.log(`[INFO] ${message}`),
        error: (message, error) => console.error(`[ERROR] ${message}`, error || ''),
        warn: (message) => console.warn(`[WARN] ${message}`),
        debug: (message) => process.env.NODE_ENV !== 'production' ? console.debug(`[DEBUG] ${message}`) : null
    };
}

/**
 * Get recent searches for the current user
 * @param {Object} userId - User ID
 * @param {Number} limit - Maximum number of searches to return (default: 5)
 * @returns {Promise<Array>} - Array of recent searches
 */
exports.getRecentSearches = async (userId, limit = 5) => {
    try {
        return await WebSearch.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    } catch (error) {
        logger.error(`Error fetching recent searches: ${error.message}`);
        throw new Error('Failed to fetch recent searches');
    }
};

/**
 * Create a new search
 * @param {Object} searchData - Search data
 * @returns {Promise<Object>} - Created search
 */
exports.createSearch = async (searchData) => {
    try {
        const newSearch = new WebSearch({
            user: searchData.userId,
            query: searchData.query,
            type: searchData.type,
            sources: Array.isArray(searchData.sources) 
                ? searchData.sources.join(', ') 
                : (typeof searchData.sources === 'string' ? searchData.sources : ''),
            options: {
                includeHistorical: searchData.includeHistorical === 'on',
                deepSearch: searchData.deepSearch === 'on'
            }
        });
        
        return await newSearch.save();
    } catch (error) {
        logger.error(`Error creating search: ${error.message}`);
        throw new Error('Failed to create search');
    }
};

/**
 * Get search results by search ID
 * @param {String} searchId - Search ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Search and results
 */
exports.getSearchResults = async (searchId, userId) => {
    try {
        // Fetch search info
        const search = await WebSearch.findOne({ 
            _id: searchId,
            user: userId
        }).lean();
        
        if (!search) {
            throw new Error('Search not found');
        }
        
        // Ensure all fields are of correct type
        const safeSearch = {
            ...search,
            _id: search._id.toString(),
            user: search.user.toString(),
            query: search.query || '',
            type: search.type || '',
            sources: typeof search.sources === 'string' ? search.sources : '',
            createdAt: search.createdAt instanceof Date ? search.createdAt : new Date(),
            options: search.options || {}
        };
        
        // Fetch results
        const results = await SearchResult.find({ search: searchId }).lean();
        
        // Map and ensure all fields are of correct type
        const safeResults = results.map(r => ({
            id: r._id.toString(),
            _id: r._id.toString(),
            search: r.search.toString(),
            vendorName: r.vendorName || '',
            productName: r.productName || '',
            licenseType: r.licenseType || '',
            price: r.price || '',
            pricePeriod: r.pricePeriod || '',
            description: r.description || '',
            fullDescription: r.fullDescription || '',
            source: r.source || '',
            sourceUrl: r.sourceUrl || '',
            saved: !!r.saved
        }));
        
        return {
            search: safeSearch,
            results: safeResults
        };
    } catch (error) {
        logger.error(`Error fetching search results: ${error.message}`);
        throw new Error('Failed to fetch search results');
    }
};

/**
 * Save a search result as a license
 * @param {String} resultId - Result ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Saved license
 */
exports.saveResult = async (resultId, userId) => {
    try {
        logger.info(`Attempting to save result ID: ${resultId} for user: ${userId}`);
        
        // Fetch the result
        const result = await SearchResult.findById(resultId).lean();
        
        if (!result) {
            logger.error(`Result not found with ID: ${resultId}`);
            throw new Error('Result not found');
        }
        
        logger.info(`Found search result: ${JSON.stringify(result)}`);
        
        // Find or create vendor
        let vendor = await Vendor.findOne({ name: result.vendorName });
        
        if (!vendor) {
            logger.info(`Creating new vendor: ${result.vendorName}`);
            vendor = new Vendor({
                name: result.vendorName,
                createdBy: userId
            });
            await vendor.save();
            logger.info(`New vendor created with ID: ${vendor._id}`);
        } else {
            logger.info(`Using existing vendor: ${vendor.name} (${vendor._id})`);
        }
        
        // Extract price as number if possible
        let priceValue = 0;
        if (result.price) {
            if (typeof result.price === 'string') {
                // Remove non-numeric characters except decimal point
                const priceStr = result.price.replace(/[^0-9.]/g, '');
                priceValue = parseFloat(priceStr) || 0;
            } else if (typeof result.price === 'number') {
                priceValue = result.price;
            }
        }
        
        // Create license from result
        const licenseData = {
            name: result.productName || result.vendorName,
            product: result.productName || 'Unknown Product',
            vendor: vendor._id || vendor.id || result.vendorName, // Handle both mongoose and file DB
            licenseKey: `WEB-${Math.floor(Math.random() * 1000000)}`, // Generate a random license key
            licenseType: result.licenseType || 'Unknown',
            price: priceValue,
            pricePeriod: result.pricePeriod || 'one-time',
            notes: result.fullDescription || result.description,
            createdBy: userId,
            assignedSystems: [],
            startDate: new Date(),
            endDate: null
        };
        
        logger.info(`Creating new license with data: ${JSON.stringify(licenseData)}`);
        
        const newLicense = new License(licenseData);
        await newLicense.save();
        
        logger.info(`New license created with ID: ${newLicense._id || newLicense.id}`);
        
        // Mark result as saved
        await SearchResult.findByIdAndUpdate(resultId, { saved: true });
        
        // Increment saved count on search
        if (result.search) {
            await WebSearch.findByIdAndUpdate(result.search, {
                $inc: { savedCount: 1 }
            });
        }
        
        return newLicense;
    } catch (error) {
        logger.error(`Error saving result: ${error.message}`, error);
        throw new Error(`Failed to save result: ${error.message}`);
    }
};

/**
 * Perform a web search
 * @param {String} query - Search query
 * @param {String} type - Search type (vendor, license, pricing, contact)
 * @param {Array|String} sources - Search sources
 * @returns {Promise<Array>} - Search results
 */
exports.performWebSearch = async (query, type, sources) => {
    // Try to use Serper.dev API for real search results
    const useRealSearch = process.env.SERPER_API_KEY && process.env.USE_REAL_SEARCH === 'true';
    
    if (useRealSearch) {
        try {
            logger.info(`Performing real web search for "${query}" using Serper.dev API`);
            const apiUrl = 'https://google.serper.dev/search';
            
            // Construct search query based on type
            let searchQuery = query;
            switch (type) {
                case 'vendor':
                    searchQuery = `${query} software vendor company information`;
                    break;
                case 'license':
                    searchQuery = `${query} software license types subscription pricing`;
                    break;
                case 'pricing':
                    searchQuery = `${query} software subscription pricing plans cost`;
                    break;
                case 'contact':
                    searchQuery = `${query} vendor customer support contact information`;
                    break;
            }
            
            const response = await axios.post(apiUrl, {
                q: searchQuery,
                num: 10
            }, {
                headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            // Process API results into the expected format
            const results = [];
            
            if (response.data && response.data.organic) {
                for (const item of response.data.organic) {
                    // Extract vendor and product names
                    const title = item.title || '';
                    let vendorName = '';
                    let productName = '';
                    
                    if (title.includes('-')) {
                        const parts = title.split('-').map(p => p.trim());
                        vendorName = parts[0];
                        productName = parts.length > 1 ? parts[1] : '';
                    } else if (title.includes('|')) {
                        const parts = title.split('|').map(p => p.trim());
                        vendorName = parts[0];
                        productName = parts.length > 1 ? parts[1] : '';
                    } else {
                        vendorName = title;
                    }
                    
                    // Determine license type and pricing from snippet
                    const snippet = item.snippet || '';
                    let licenseType = 'Unknown';
                    let price = '';
                    let pricePeriod = 'one-time';
                    
                    // Look for subscription keywords in title and snippet
                    const isSubscriptionRelated = 
                        title.toLowerCase().includes('subscription') || 
                        title.toLowerCase().includes('pricing') ||
                        snippet.toLowerCase().includes('subscription') ||
                        snippet.toLowerCase().includes('per month') ||
                        snippet.toLowerCase().includes('monthly') ||
                        snippet.toLowerCase().includes('annually') ||
                        snippet.toLowerCase().includes('per year');
                    
                    // Look for license type in snippet with enhanced subscription detection
                    const licenseTypes = [
                        'Subscription', 'Perpetual', 'Term', 'User-based', 'Device-based', 
                        'Enterprise', 'SaaS', 'Cloud', 'On-Premise', 'Floating'
                    ];
                    
                    // Prefer subscription if related keywords are found
                    if (isSubscriptionRelated) {
                        licenseType = 'Subscription';
                    } else {
                        // Otherwise try to detect from standard license types
                        for (const type of licenseTypes) {
                            if (snippet.toLowerCase().includes(type.toLowerCase())) {
                                licenseType = type;
                                break;
                            }
                        }
                    }
                    
                    // Look for pricing in snippet
                    const priceMatch = snippet.match(/\$\d+(\.\d+)?|\$\d{1,3}(,\d{3})*(\.\d+)?/);
                    if (priceMatch) {
                        price = priceMatch[0];
                    }
                    
                    // Look for period in snippet with better detection
                    if (snippet.toLowerCase().includes('per month') || 
                        snippet.toLowerCase().includes('/month') || 
                        snippet.toLowerCase().includes(' monthly')) {
                        pricePeriod = 'monthly';
                    } else if (snippet.toLowerCase().includes('per year') || 
                               snippet.toLowerCase().includes('/year') || 
                               snippet.toLowerCase().includes(' annually')) {
                        pricePeriod = 'annually';
                    } else if (snippet.toLowerCase().includes('per user')) {
                        if (snippet.toLowerCase().includes('per month') || 
                            snippet.toLowerCase().includes('/month')) {
                            pricePeriod = 'per user/month';
                        } else if (snippet.toLowerCase().includes('per year') || 
                                 snippet.toLowerCase().includes('/year')) {
                            pricePeriod = 'per user/year';
                        } else {
                            pricePeriod = 'per user/month';
                        }
                    }
                    
                    // Create a more detailed description if available
                    let fullDescription = snippet;
                    if (item.snippet && item.snippet.length > 100) {
                        fullDescription = `${item.snippet}\n\nSource: ${item.link || 'Web Search'}`;
                    }
                    
                    results.push({
                        id: `result-${Date.now()}-${results.length}`,
                        vendorName: vendorName,
                        productName: productName,
                        licenseType: licenseType,
                        price: price || 'Contact for pricing',
                        pricePeriod: pricePeriod,
                        description: snippet,
                        fullDescription: fullDescription,
                        source: 'Web Search',
                        sourceUrl: item.link || '#'
                    });
                }
            }
            
            // Return results if we found any
            if (results.length > 0) {
                return results;
            }
            
            // Fall back to simulation if no results were found
            logger.info('No results found from API, falling back to simulation');
        } catch (error) {
            logger.error(`Error performing real web search: ${error.message}`);
            logger.info('Falling back to simulation');
        }
    }
    
    // This is a simulation - fallback when API search fails or is not configured
    logger.info('Using simulated web search results');
    return simulateSearchResults(query, type, sources);
};

/**
 * Simulate search results when API is not available
 * @param {String} query - Search query
 * @param {String} type - Search type
 * @param {Array|String} sources - Search sources
 * @returns {Promise<Array>} - Simulated search results
 */
function simulateSearchResults(query, type, sources) {
    const results = [];
    const sourcesArray = Array.isArray(sources) ? sources : [sources];
    
    // Generate 5-10 mock results
    const resultCount = Math.floor(Math.random() * 6) + 5;
    
    const vendors = ['Microsoft', 'Adobe', 'Salesforce', 'Oracle', 'IBM', 'SAP', 'Autodesk', 'VMware'];
    const products = {
        'Microsoft': ['Microsoft 365', 'Windows 11', 'Azure', 'SQL Server', 'Visual Studio'],
        'Adobe': ['Creative Cloud', 'Photoshop', 'Acrobat Pro', 'Premiere Pro', 'Illustrator'],
        'Salesforce': ['Sales Cloud', 'Service Cloud', 'Marketing Cloud', 'Commerce Cloud'],
        'Oracle': ['Database', 'ERP Cloud', 'HCM Cloud', 'NetSuite'],
        'IBM': ['WebSphere', 'Db2', 'Watson', 'Cloud Pak'],
        'SAP': ['S/4HANA', 'Business One', 'SuccessFactors', 'Ariba'],
        'Autodesk': ['AutoCAD', 'Revit', 'Maya', '3ds Max'],
        'VMware': ['vSphere', 'Workstation', 'Fusion', 'NSX']
    };
    
    const licenseTypes = ['Subscription', 'Perpetual', 'Term', 'User-based', 'Device-based', 'Enterprise', 'Open Value'];
    const prices = ['$10', '$19.99', '$49', '$99.99', '$199', '$299.99', '$499', '$999.99', '$1,999'];
    const periods = ['monthly', 'annually', 'per user/month', 'per device/year', 'one-time'];
    const sourceTypes = ['Vendor Website', 'Reseller', 'Price Comparison', 'Review Site', 'Documentation'];
    
    // Generate random results
    for (let i = 0; i < resultCount; i++) {
        const vendor = vendors[Math.floor(Math.random() * vendors.length)];
        const vendorProducts = products[vendor];
        const product = vendorProducts[Math.floor(Math.random() * vendorProducts.length)];
        const licenseType = licenseTypes[Math.floor(Math.random() * licenseTypes.length)];
        const price = prices[Math.floor(Math.random() * prices.length)];
        const period = periods[Math.floor(Math.random() * periods.length)];
        const source = sourceTypes[Math.floor(Math.random() * sourceTypes.length)];
        
        // Create description
        const description = `${product} is a ${licenseType.toLowerCase()} license offered by ${vendor}. It includes standard features and support.`;
        const fullDescription = `${product} is a comprehensive solution offered by ${vendor} with a ${licenseType.toLowerCase()} licensing model. This license provides full access to all product features, regular updates, and standard technical support. The price of ${price} ${period} includes all core functionality. Additional modules or add-ons may be available at extra cost. For enterprise deployments, volume discounts may apply.`;
        
        // Ensure product is a string before applying string methods
        const safeProductString = typeof product === 'string' ? product : String(product);
        
        results.push({
            id: `result-${i + 1}`,
            vendorName: vendor,
            productName: product,
            licenseType: licenseType,
            price: price,
            pricePeriod: period,
            description: description,
            fullDescription: fullDescription,
            source: source,
            sourceUrl: `https://example.com/${vendor.toLowerCase()}/${safeProductString.toLowerCase().replace(/\s+/g, '-')}`
        });
    }
    
    return results;
} 