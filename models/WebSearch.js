const mongoose = require('mongoose');

const WebSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['vendor', 'license', 'pricing', 'contact'],
      required: true,
    },
    sources: {
      type: String,
      default: 'vendor',
    },
    options: {
      includeHistorical: {
        type: Boolean,
        default: false,
      },
      deepSearch: {
        type: Boolean,
        default: false,
      },
    },
    resultsCount: {
      type: Number,
      default: 0,
    },
    savedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Method to find recent searches by a user
WebSearchSchema.statics.findRecentByUser = async function (userId, limit = 5) {
  return this.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean();
};

// Method to find popular searches across all users
WebSearchSchema.statics.findPopular = async function (limit = 10) {
  return this.aggregate([
    { $group: { _id: '$query', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

// Method to track when a result is saved from this search
WebSearchSchema.methods.incrementSavedCount = async function () {
  this.savedCount += 1;
  return this.save();
};

module.exports = mongoose.model('WebSearch', WebSearchSchema);
