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
    // Dynamically require models to avoid circular dependencies
    const License = require('./License'); 
    const User = require('./User');
    
    if (!docs) return null;
    
    // Handle single document case
    const wasSingleDoc = !Array.isArray(docs);
    const docArray = wasSingleDoc ? [docs] : docs;
    
    // Clone the documents to avoid modifying originals
    const clonedDocs = JSON.parse(JSON.stringify(docArray));
    
    // Process each document
    for (const doc of clonedDocs) {
      if (path === 'licenseRequirements.licenseId') {
        // Populate license requirements
        if (doc.licenseRequirements && Array.isArray(doc.licenseRequirements)) {
          for (const req of doc.licenseRequirements) {
            if (req.licenseId) {
              try {
                // Use the robust findById from the License model
                const license = License.findById(req.licenseId);
                if (license) {
                  req.licenseId = license; // Replace ID with populated object
                } else {
                  console.warn(`System Populate: License with ID ${req.licenseId} not found for system ${doc._id}`);
                  // Keep the original ID if lookup fails
                }
              } catch (error) {
                console.error(`System Populate: Error finding license ${req.licenseId} for system ${doc._id}`, error);
              }
            }
          }
        }
      } else if (path === 'managedBy') {
        // Populate managed by
        if (doc.managedBy) {
          try {
            // Use the robust findById from the User model
            const manager = User.findById(doc.managedBy);
            if (manager) {
              // Selectively populate user fields to avoid exposing sensitive data like password hash
              doc.managedBy = {
                _id: manager._id,
                name: manager.name,
                email: manager.email,
                role: manager.role
              };
            } else {
              console.warn(`System Populate: Manager with ID ${doc.managedBy} not found for system ${doc._id}`);
            }
          } catch (error) {
            console.error(`System Populate: Error finding manager ${doc.managedBy} for system ${doc._id}`, error);
          }
        }
      }
      // Add other population paths here if needed
    }
    
    // Return single object or array based on input
    return wasSingleDoc ? clonedDocs[0] : clonedDocs;
  },
  
  // Enhanced find method with debug
  find: (query = {}) => {
    console.log('SYSTEM MODEL - Find query:', JSON.stringify(query));
    
    // Ensure managedBy is properly handled (convert to string)
    if (query.managedBy) {
      query.managedBy = query.managedBy.toString();
    }
    
    const results = FileDBSystem.find(query);
    console.log('SYSTEM MODEL - Find results count:', results.length);
    return results;
  },
  
  // Get systems by manager ID, ensuring correct ID comparison
  findByManager: (managerId) => {
    if (!managerId) return [];
    
    const managerId_str = managerId.toString();
    console.log('Finding systems for manager ID:', managerId_str);
    
    // Use the find method with proper filtering
    return System.find({ managedBy: managerId_str });
  }
};

module.exports = System;