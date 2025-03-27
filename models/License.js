const mongoose = require('mongoose');
const moment = require('moment');

const LicenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  licenseKey: {
    type: String,
    required: true,
    unique: false // Changed to prevent validation errors in demo mode
  },
  product: {
    type: String,
    required: true
  },
  vendor: {
    type: String,
    required: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  renewalDate: {
    type: Date
  },
  totalSeats: {
    type: Number,
    required: true
  },
  usedSeats: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'pending', 'renewed'],
    default: 'active'
  },
  cost: {
    type: Number
  },
  currency: {
    type: String,
    default: 'USD'
  },
  notes: {
    type: String
  },
  attachments: [{
    filename: String,
    path: String,
    uploadDate: Date
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedSystems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'System'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for license utilization percentage
LicenseSchema.virtual('utilization').get(function() {
  return this.totalSeats > 0 ? Math.round((this.usedSeats / this.totalSeats) * 100) : 0;
});

// Virtual for days until expiry
LicenseSchema.virtual('daysUntilExpiry').get(function() {
  return moment(this.expiryDate).diff(moment(), 'days');
});

// Virtual for days until renewal
LicenseSchema.virtual('daysUntilRenewal').get(function() {
  return this.renewalDate ? moment(this.renewalDate).diff(moment(), 'days') : null;
});

// Pre-save hook to update status based on expiry date
LicenseSchema.pre('save', function(next) {
  const today = moment().startOf('day');
  const expiry = moment(this.expiryDate).startOf('day');
  
  if (expiry.isBefore(today)) {
    this.status = 'expired';
  } else if (this.status !== 'pending' && this.status !== 'renewed') {
    this.status = 'active';
  }
  
  this.updatedAt = Date.now();
  next();
});

const License = mongoose.model('License', LicenseSchema);

module.exports = License;