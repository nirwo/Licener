/**
 * System Model
 * Mongoose implementation
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define System Schema
const SystemSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  systemType: {
    type: String,
    required: true,
    enum: ['Server', 'Workstation', 'Laptop', 'Mobile', 'Other'],
    default: 'Other',
  },
  environment: {
    type: String,
    enum: ['production', 'development', 'testing', 'staging'],
    default: 'production',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'decommissioned'],
    default: 'active',
  },
  operatingSystem: {
    type: String,
    trim: true,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  macAddress: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  manager: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  licenseRequirements: [
    {
      licenseType: String,
      quantity: Number,
      licenseId: {
        type: Schema.Types.ObjectId,
        ref: 'Subscription',
      },
    },
  ],
  notes: {
    type: String,
    trim: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update 'updatedAt' on save
SystemSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Find by manager method
SystemSchema.statics.findByManager = function (managerId) {
  return this.find({ manager: managerId });
};

// Add createDemo static method
SystemSchema.statics.createDemo = async function (userId) {
  try {
    const demoSystem = new this({
      name: 'Demo System',
      systemType: 'Server',
      operatingSystem: 'Windows Server 2022',
      ipAddress: '192.168.1.100',
      macAddress: '00:1A:2B:3C:4D:5E',
      location: 'Data Center',
      department: 'IT',
      user: userId,
      notes: 'This is a demo system',
    });

    await demoSystem.save();
    return demoSystem;
  } catch (err) {
    console.error('Error creating demo system:', err);
    throw err;
  }
};

// Add method to check if user has permission
SystemSchema.methods.hasPermission = function (userId, isAdmin) {
  return isAdmin || this.user.toString() === userId.toString();
};

// Add method to get formatted system info
SystemSchema.methods.getFormattedInfo = function () {
  return {
    id: this._id,
    name: this.name,
    type: this.systemType,
    os: this.operatingSystem,
    ip: this.ipAddress,
    location: this.location,
    department: this.department,
    created: this.created,
  };
};

// Add method to update license requirements
SystemSchema.methods.updateLicenseRequirements = async function (licenseId, quantity) {
  const existingRequirement = this.licenseRequirements.find(
    req => req.licenseId.toString() === licenseId.toString()
  );

  if (existingRequirement) {
    existingRequirement.quantity = quantity;
  } else {
    this.licenseRequirements.push({
      licenseType: 'Subscription',
      quantity: quantity,
      licenseId: licenseId,
    });
  }

  await this.save();
  return this;
};

// Create the System model
const System = mongoose.model('System', SystemSchema);

module.exports = System;
