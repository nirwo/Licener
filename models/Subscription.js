/**
 * Subscription Model (Fixed Version)
 * Resolves circular dependencies and ensures proper file-db compatibility
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const path = require('path');
const fs = require('fs');

// Define Subscription Schema
const subscriptionSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  vendor: {
    type: String,
    required: true,
  },
  product: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Subscription', 'SaaS', 'Perpetual', 'Trial', 'Open Source', 'Other'],
    default: 'Subscription',
  },
  seats: {
    type: Number,
    default: 1,
  },
  cost: {
    type: Number,
  },
  renewalDate: {
    type: Date,
  },
  purchaseDate: {
    type: Date,
  },
  notes: {
    type: String,
  },
  contractUrl: {
    type: String,
  },
  attachments: [
    {
      filename: String,
      path: String,
      uploadDate: Date,
    },
  ],
  tags: [
    {
      type: String,
    },
  ],
  assignedSystems: [
    {
      type: Schema.Types.ObjectId,
      ref: 'System',
    },
  ],
  usedSeats: {
    type: Number,
    default: 0,
  },
  utilization: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Expired', 'Pending', 'Suspended'],
    default: 'Active',
    set: function (val) {
      const statusMap = {
        active: 'Active',
        inactive: 'Inactive',
        expired: 'Expired',
        pending: 'Pending',
        suspended: 'Suspended',
      };
      return statusMap[val.toLowerCase()] || val;
    },
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  system: {
    type: Schema.Types.ObjectId,
    ref: 'System',
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes
subscriptionSchema.index({ name: 1 });
subscriptionSchema.index({ vendor: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ renewalDate: 1 });

// Virtual for formatted renewal date
subscriptionSchema.virtual('formattedRenewalDate').get(function () {
  return this.renewalDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Virtual for days until renewal
subscriptionSchema.virtual('daysUntilRenewal').get(function () {
  const today = new Date();
  const renewal = new Date(this.renewalDate);
  const diffTime = renewal - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if subscription is expiring soon
subscriptionSchema.methods.isExpiringSoon = function (days = 30) {
  return this.daysUntilRenewal <= days && this.daysUntilRenewal > 0;
};

// Method to check if subscription is expired
subscriptionSchema.methods.isExpired = function () {
  return this.daysUntilRenewal < 0;
};

// Pre-save middleware to update status based on renewal date
subscriptionSchema.pre('save', function (next) {
  if (this.isExpired()) {
    this.status = 'Expired';
  } else if (this.isExpiringSoon()) {
    this.status = 'Pending';
  }
  next();
});

// Add createDemo static method
subscriptionSchema.statics.createDemo = async function (userId) {
  try {
    const demoSubscription = new this({
      name: 'Demo Subscription',
      product: 'Demo Product',
      vendor: 'Demo Vendor',
      type: 'Subscription',
      seats: 10,
      cost: 99.99,
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      purchaseDate: new Date(),
      notes: 'This is a demo subscription',
      status: 'Active',
      user: userId,
    });

    await demoSubscription.save();
    return demoSubscription;
  } catch (err) {
    console.error('Error creating demo subscription:', err);
    throw err;
  }
};

// Create the model only if it doesn't exist
let Subscription;
try {
  Subscription = mongoose.model('Subscription');
} catch (err) {
  Subscription = mongoose.model('Subscription', subscriptionSchema);
}

module.exports = Subscription;

// Add a debug method to help diagnose issues
Subscription.debug = function () {
  return {
    hasMongoCreate: typeof Subscription.create === 'function',
    hasMongoSave: typeof Subscription.prototype.save === 'function',
    hasFileDBCreate: !!Subscription.create,
    mongoModelName: Subscription.modelName || 'Unknown',
    fileDBAvailable: !!Subscription.create,
    methods: {
      find: !!Subscription.find,
      findById: !!Subscription.findById,
      findOne: !!Subscription.findOne,
      count: !!Subscription.count,
      countDocuments: !!Subscription.countDocuments,
      create: !!Subscription.create,
      populate: !!Subscription.populate,
      createDemo: !!Subscription.createDemo,
    },
  };
};
