/**
 * Vendor Model
 * File-based implementation using LowDB
 */
const { db } = require('../utils/file-db');
const path = require('path');
const fs = require('fs');

// Ensure the vendors collection exists in the DB
const dbFile = path.join(__dirname, '..', 'data', 'vendors.json');
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({ data: [] }), 'utf8');
}

const Vendor = {
  // Create a new vendor
  create: async (vendorData) => {
    const newVendor = {
      ...vendorData,
      _id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      // Read the current data
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      
      // Add the new vendor
      data.data.push(newVendor);
      
      // Write back to file
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
      
      return newVendor;
    } catch (err) {
      console.error('Error creating vendor:', err);
      throw err;
    }
  },
  
  // Find all vendors
  find: async (query = {}) => {
    try {
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      
      // If query is empty, return all vendors
      if (Object.keys(query).length === 0) {
        return data.data;
      }
      
      // Otherwise, filter based on query
      return data.data.filter(vendor => {
        for (const key in query) {
          if (vendor[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });
    } catch (err) {
      console.error('Error finding vendors:', err);
      return [];
    }
  },
  
  // Find vendor by ID
  findById: async (id) => {
    try {
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      return data.data.find(vendor => vendor._id === id) || null;
    } catch (err) {
      console.error('Error finding vendor by ID:', err);
      return null;
    }
  },
  
  // Update vendor
  findByIdAndUpdate: async (id, updateData) => {
    try {
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      
      const index = data.data.findIndex(vendor => vendor._id === id);
      if (index === -1) return null;
      
      data.data[index] = {
        ...data.data[index],
        ...updateData,
        updatedAt: new Date()
      };
      
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
      
      return data.data[index];
    } catch (err) {
      console.error('Error updating vendor:', err);
      throw err;
    }
  },
  
  // Delete vendor
  findByIdAndDelete: async (id) => {
    try {
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      
      const index = data.data.findIndex(vendor => vendor._id === id);
      if (index === -1) return null;
      
      const deletedVendor = data.data[index];
      data.data.splice(index, 1);
      
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
      
      return deletedVendor;
    } catch (err) {
      console.error('Error deleting vendor:', err);
      throw err;
    }
  }
};

module.exports = Vendor;
