/**
 * System Model
 * File-based implementation using LowDB
 */
const { System: FileDBSystem } = require('../utils/file-db');

// This is a wrapper around the file DB to maintain API compatibility
const System = {
  ...FileDBSystem,
  
  // Mongoose-like populate functionality
  populate: async (docs, path) => {
    const { License } = require('./License');
    const { User } = require('./User');
    
    if (!docs) return null;
    
    // Handle single document
    if (!Array.isArray(docs)) {
      return System.populate([docs], path)[0];
    }
    
    // Clone the documents to avoid modifying originals
    const clonedDocs = JSON.parse(JSON.stringify(docs));
    
    // Process each document
    for (const doc of clonedDocs) {
      if (path === 'licenseRequirements.licenseId') {
        // Populate license requirements
        if (doc.licenseRequirements && doc.licenseRequirements.length > 0) {
          for (const req of doc.licenseRequirements) {
            if (req.licenseId) {
              const license = License.findById(req.licenseId);
              if (license) {
                req.licenseId = license;
              }
            }
          }
        }
      } else if (path === 'managedBy') {
        // Populate managed by
        if (doc.managedBy) {
          const manager = User.findById(doc.managedBy);
          if (manager) {
            doc.managedBy = manager;
          }
        }
      }
    }
    
    return clonedDocs;
  }
};

module.exports = System;