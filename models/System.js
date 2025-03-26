const mongoose = require('mongoose');

const SystemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['physical', 'virtual', 'cloud'],
    required: true
  },
  os: {
    type: String,
    required: true
  },
  osVersion: {
    type: String
  },
  location: {
    type: String
  },
  ip: {
    type: String
  },
  department: {
    type: String
  },
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  installedSoftware: [{
    name: String,
    version: String,
    installDate: Date
  }],
  licenseRequirements: [{
    licenseType: String,
    quantity: Number,
    licenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'License'
    }
  }],
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'retired'],
    default: 'active'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to update the updated date
SystemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const System = mongoose.model('System', SystemSchema);

module.exports = System;