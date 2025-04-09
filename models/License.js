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
    const User = require('./User');
    
    if (!docs) return null;
    
    // Handle single document
    if (!Array.isArray(docs)) {
      // Use await to ensure proper async resolution
      return (await License.populate([docs], path))[0];
    }
    
    // Clone the documents to avoid modifying originals
    const clonedDocs = JSON.parse(JSON.stringify(docs));
    
    // Process each document
    for (const doc of clonedDocs) {
      if (path === 'assignedSystems') {
        // Populate systems
        if (doc.assignedSystems && doc.assignedSystems.length > 0) {
          // Map to array of promises then await all
          const systemPromises = doc.assignedSystems.map(async systemId => {
            const system = await System.findById(systemId);
            return system || systemId;
          });
          doc.assignedSystems = await Promise.all(systemPromises);
        }
      } else if (path === 'owner') {
        // Populate owner
        if (doc.owner) {
          console.log(`License Populate - Attempting to find User with ID: ${doc.owner}`); // Log owner ID
          const owner = await User.findById(doc.owner);
          console.log(`License Populate - User.findById result: ${JSON.stringify(owner)}`); // Log result
          if (owner) {
            doc.owner = owner;
            // Add id property for backwards compatibility
            doc.owner.id = doc.owner._id.toString();
          }
        }
      }
    }
    
    return clonedDocs;
  }
};

module.exports = License;