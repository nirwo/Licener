/**
 * License Model
 * File-based implementation using LowDB
 */
const { License: FileDBLicense } = require('../utils/file-db');
const fs = require('fs');
const path = require('path');

// Define path to data directory
const dataDir = path.join(__dirname, '..', 'data');

// Define database utilities
const db = {
  findByIdAndUpdate: async (collection, id, updates) => {
    try {
      console.log(`UPDATE BY ID: Looking to update _id=${id} in ${collection}`);
      const collectionPath = path.join(dataDir, `${collection}.json`);
      
      // Make sure the file exists
      if (!fs.existsSync(collectionPath)) {
        console.log(`UPDATE BY ID: Collection file not found for ${collection}`);
        return null;
      }
      
      // Read the collection data
      const data = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
      
      // Find the item by ID
      const index = data.data.findIndex(item => item._id === id);
      
      // If item not found, return null
      if (index === -1) {
        console.log(`UPDATE BY ID: No matching item with _id=${id} in ${collection}`);
        return null;
      }
      
      console.log(`UPDATE BY ID: Found matching item with _id=${id}`);
      
      // Get the existing item
      const existingItem = data.data[index];
      
      // Create updated item by merging existing with updates
      const updatedItem = {
        ...existingItem,
        ...updates,
        updatedAt: new Date()
      };
      
      // Replace the old item with the updated one
      data.data[index] = updatedItem;
      
      // Write the updated data back to the file
      fs.writeFileSync(collectionPath, JSON.stringify(data, null, 2), 'utf8');
      
      console.log(`UPDATE BY ID: Successfully updated item with _id=${id} in ${collection}`);
      
      // Return the updated item
      return updatedItem;
    } catch (err) {
      console.error(`Error in findByIdAndUpdate for ${collection}:`, err);
      throw err;
    }
  }
};

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
        // Populate systems with better error handling
        if (doc.assignedSystems && doc.assignedSystems.length > 0) {
          console.log(`License Populate - Populating ${doc.assignedSystems.length} systems for license ${doc._id}`);
          
          // Map to array of promises then await all
          const systemPromises = doc.assignedSystems.map(async systemId => {
            if (!systemId) {
              console.log(`License Populate - Skipping null/undefined system ID`);
              return null;
            }
            
            // Ensure we're working with a string ID
            const sysId = systemId.toString();
            console.log(`License Populate - Attempting to find System with ID: ${sysId}`);
            
            try {
              const system = await System.findById(sysId);
              if (system) {
                return system;
              } else {
                console.log(`License Populate - No system found with ID: ${sysId}`);
                return systemId; // Return original ID if system not found
              }
            } catch (err) {
              console.error(`Error populating system with ID ${sysId}:`, err);
              return systemId; // Return original ID on error
            }
          });
          
          // Filter out null values after populating
          const populatedSystems = await Promise.all(systemPromises);
          doc.assignedSystems = populatedSystems.filter(system => system !== null);
        } else {
          console.log(`License Populate - No systems to populate for license ${doc._id}`);
          // Initialize as empty array if undefined
          if (!doc.assignedSystems) {
            doc.assignedSystems = [];
          }
        }
      } else if (path === 'owner') {
        // Populate owner with better error handling
        if (doc.owner) {
          // Ensure we're working with a string ID
          const ownerId = doc.owner.toString();
          console.log(`License Populate - Attempting to find User with ID: ${ownerId}`);
          
          try {
            const owner = await User.findById(ownerId);
            console.log(`License Populate - User.findById result: ${JSON.stringify(owner)}`);
            
            if (owner) {
              doc.owner = owner;
              // Ensure _id is available as a string
              if (owner._id) {
                // Add id property for backwards compatibility
                doc.owner.id = owner._id.toString();
              }
            } else {
              console.log(`License Populate - No owner found with ID: ${ownerId}`);
            }
          } catch (err) {
            console.error(`Error populating owner with ID ${ownerId}:`, err);
          }
        } else {
          console.log(`License Populate - No owner ID to populate`);
        }
      }
    }
    
    return clonedDocs;
  },

  // Update a license by ID with better error handling
  findByIdAndUpdate: async (id, updateData) => {
    console.log(`Updating license with ID: ${id}`);
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    try {
      // Use the fixed db function to update the license
      const result = await db.findByIdAndUpdate('licenses', id, updateData);
      if (!result) {
        console.log(`License with ID ${id} not found for update`);
        return null;
      }
      return result;
    } catch (err) {
      console.error('Error updating license:', err);
      throw new Error(`Failed to update license: ${err.message}`);
    }
  }
};

module.exports = License;