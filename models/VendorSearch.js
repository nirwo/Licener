const mongoose = require('mongoose');

const VendorSearchSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sources: {
    type: [String],
    default: ['web']
  },
  date: {
    type: Date,
    default: Date.now
  },
  addedVendors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  }],
  results: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('VendorSearch', VendorSearchSchema); 