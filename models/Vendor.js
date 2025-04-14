/**
 * Vendor Model
 * File-based implementation using LowDB
 */
const mongoose = require('mongoose');

// Define Vendor Schema
const VendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  website: {
    type: String,
  },
  contactName: {
    type: String,
  },
  contactEmail: {
    type: String,
  },
  contactPhone: {
    type: String,
  },
  address: {
    type: String,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update 'updatedAt' on save
VendorSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create the Vendor model
let Vendor;
try {
  // Try to get the existing model first to avoid redefining
  Vendor = mongoose.model('Vendor');
} catch (e) {
  // If not found, define it
  Vendor = mongoose.model('Vendor', VendorSchema);
}

module.exports = Vendor;
