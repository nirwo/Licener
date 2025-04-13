const mongoose = require('mongoose');

const SearchResultSchema = new mongoose.Schema({
    search: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WebSearch',
        required: true
    },
    vendorName: {
        type: String,
        required: true,
        trim: true
    },
    productName: {
        type: String,
        trim: true
    },
    licenseType: {
        type: String,
        trim: true
    },
    price: {
        type: String,
        trim: true
    },
    pricePeriod: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    fullDescription: {
        type: String,
        trim: true
    },
    source: {
        type: String,
        required: true
    },
    sourceUrl: {
        type: String,
        trim: true
    },
    saved: {
        type: Boolean,
        default: false
    },
    ignored: {
        type: Boolean,
        default: false
    },
    relevanceScore: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Virtual for calculating normalized price (for sorting/filtering)
SearchResultSchema.virtual('normalizedPrice').get(function() {
    if (!this.price) return 0;
    
    // Extract numeric value from price string
    const numericPrice = parseFloat(this.price.replace(/[^0-9.]/g, ''));
    
    // Normalize based on period
    if (this.pricePeriod === 'monthly') {
        return numericPrice * 12;  // Convert to annual
    } else if (this.pricePeriod === 'per user/month') {
        return numericPrice * 12;  // Convert to annual per user
    } else {
        return numericPrice;
    }
});

// Statics
SearchResultSchema.statics.findBestMatches = async function(searchId, limit = 10) {
    return this.find({ 
        search: searchId,
        ignored: false 
    })
    .sort({ relevanceScore: -1 })
    .limit(limit)
    .lean();
};

SearchResultSchema.statics.findSaved = async function(searchId) {
    return this.find({
        search: searchId,
        saved: true
    }).lean();
};

module.exports = mongoose.model('SearchResult', SearchResultSchema); 