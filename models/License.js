/**
 * License Model
 * File-based implementation using LowDB
 */
const { License: FileDBLicense } = require('../utils/file-db');

// This is a wrapper around the file DB to maintain API compatibility
const License = {
  ...FileDBLicense,
  
  // Mongoose-like populate functionality
  populate: async (docs, path) => {
    const { System } = require('./System');
    const { User } = require('./User');
    
    if (!docs) return null;
    
    // Handle single document
    if (!Array.isArray(docs)) {
      return License.populate([docs], path)[0];
    }
    
    // Clone the documents to avoid modifying originals
    const clonedDocs = JSON.parse(JSON.stringify(docs));
    
    // Process each document
    for (const doc of clonedDocs) {
      if (path === 'assignedSystems') {
        // Populate systems
        if (doc.assignedSystems && doc.assignedSystems.length > 0) {
          doc.assignedSystems = doc.assignedSystems.map(systemId => {
            const system = System.findById(systemId);
            return system || systemId;
          });
        }
      } else if (path === 'owner') {
        // Populate owner
        if (doc.owner) {
          const owner = User.findById(doc.owner);
          if (owner) {
            doc.owner = owner;
          }
        }
      }
    }
    
    return clonedDocs;
  }
};

module.exports = License;