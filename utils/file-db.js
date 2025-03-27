/**
 * File-based database using LowDB
 */
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database files if they don't exist
const dbFiles = {
  licenses: path.join(dataDir, 'licenses.json'),
  systems: path.join(dataDir, 'systems.json'),
  users: path.join(dataDir, 'users.json')
};

// Initialize each database file
Object.values(dbFiles).forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ data: [] }));
  }
});

// Create database connections
const dbs = {};
Object.entries(dbFiles).forEach(([name, file]) => {
  const adapter = new FileSync(file);
  const db = low(adapter);
  
  // Initialize with empty data array if not exists
  db.defaults({ data: [] }).write();
  
  dbs[name] = db;
});

// Helper to generate IDs
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

/**
 * Generic database operations
 */
const dbOperations = (dbName) => {
  const db = dbs[dbName];
  
  return {
    /**
     * Find all records, optionally filtered
     * @param {Object} filter - Optional filter criteria
     * @returns {Array} Array of records
     */
    find: (filter = {}) => {
      let result = db.get('data').value();
      
      // Apply filters if provided
      if (Object.keys(filter).length > 0) {
        result = result.filter(item => {
          return Object.entries(filter).every(([key, value]) => {
            // Handle special query operators
            if (key.includes('.')) {
              const [field, operator] = key.split('.');
              
              switch (operator) {
                case '$regex':
                  return new RegExp(value).test(item[field]);
                case '$lt':
                  return new Date(item[field]) < new Date(value);
                case '$lte':
                  return new Date(item[field]) <= new Date(value);
                case '$gt':
                  return new Date(item[field]) > new Date(value);
                case '$gte':
                  return new Date(item[field]) >= new Date(value);
                default:
                  return false;
              }
            }
            
            // Handle array contains
            if (Array.isArray(item[key]) && !Array.isArray(value)) {
              return item[key].includes(value);
            }
            
            // Handle array vs array (at least one match)
            if (Array.isArray(item[key]) && Array.isArray(value)) {
              return item[key].some(v => value.includes(v));
            }
            
            // Regular equality check
            return item[key] === value;
          });
        });
      }
      
      return result;
    },
    
    /**
     * Find one record by ID
     * @param {String} id - Record ID
     * @returns {Object|null} The record or null if not found
     */
    findById: (id) => {
      return db.get('data').find({ _id: id }).value() || null;
    },
    
    /**
     * Insert a new record
     * @param {Object} data - Record data
     * @returns {Object} The saved record
     */
    create: (data) => {
      const newRecord = { 
        ...data,
        _id: data._id || generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      db.get('data').push(newRecord).write();
      return newRecord;
    },
    
    /**
     * Update a record by ID
     * @param {String} id - Record ID
     * @param {Object} data - Data to update
     * @returns {Object|null} Updated record or null
     */
    findByIdAndUpdate: (id, data) => {
      const record = db.get('data').find({ _id: id }).value();
      
      if (!record) {
        return null;
      }
      
      const updatedRecord = { 
        ...record, 
        ...data,
        updatedAt: new Date()
      };
      
      db.get('data')
        .find({ _id: id })
        .assign(updatedRecord)
        .write();
        
      return updatedRecord;
    },
    
    /**
     * Delete a record by ID
     * @param {String} id - Record ID
     * @returns {Boolean} Success status
     */
    findByIdAndDelete: (id) => {
      const record = db.get('data').find({ _id: id }).value();
      
      if (!record) {
        return false;
      }
      
      db.get('data')
        .remove({ _id: id })
        .write();
        
      return true;
    },
    
    /**
     * Insert multiple records
     * @param {Array} records - Array of records to insert
     * @returns {Array} The saved records
     */
    insertMany: (records) => {
      const savedRecords = records.map(record => ({
        ...record,
        _id: record._id || generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      db.get('data')
        .push(...savedRecords)
        .write();
        
      return savedRecords;
    },
    
    /**
     * Delete multiple records based on criteria
     * @param {Object} filter - Filter criteria
     * @returns {Number} Number of deleted records
     */
    deleteMany: (filter) => {
      const before = db.get('data').size().value();
      
      db.get('data')
        .remove(filter)
        .write();
        
      const after = db.get('data').size().value();
      return before - after;
    },
    
    /**
     * Update multiple records based on criteria
     * @param {Object} filter - Filter criteria
     * @param {Object} update - Update operations
     * @returns {Number} Number of updated records
     */
    updateMany: (filter, update) => {
      let updated = 0;
      
      // Extract operations from update object
      const operations = update.$set || update;
      const pull = update.$pull;
      const push = update.$push;
      
      // Get matching records
      const records = db.get('data')
        .filter(item => {
          return Object.entries(filter).every(([key, value]) => {
            // Handle special query operators for updateMany
            if (key === 'licenseRequirements' && value.$elemMatch) {
              return item.licenseRequirements && item.licenseRequirements.some(req => {
                return Object.entries(value.$elemMatch).every(([subKey, subValue]) => {
                  return req[subKey] === subValue;
                });
              });
            }
            
            return item[key] === value;
          });
        })
        .value();
      
      // Apply updates to each matching record
      records.forEach(record => {
        // Apply regular updates
        if (operations) {
          Object.assign(record, operations, { updatedAt: new Date() });
        }
        
        // Apply $pull operation (remove items from arrays)
        if (pull) {
          Object.entries(pull).forEach(([key, value]) => {
            if (Array.isArray(record[key])) {
              record[key] = record[key].filter(item => {
                if (typeof item === 'object') {
                  return !Object.entries(value).every(([subKey, subValue]) => {
                    return item[subKey] === subValue;
                  });
                }
                return item !== value;
              });
            }
          });
        }
        
        // Apply $push operation (add items to arrays)
        if (push) {
          Object.entries(push).forEach(([key, value]) => {
            if (!Array.isArray(record[key])) {
              record[key] = [];
            }
            record[key].push(value);
          });
        }
        
        // Save the updated record
        db.get('data')
          .find({ _id: record._id })
          .assign(record)
          .write();
          
        updated++;
      });
      
      return updated;
    },
    
    /**
     * Get distinct values for a field
     * @param {String} field - Field name
     * @param {Object} filter - Optional filter criteria
     * @returns {Array} Array of distinct values
     */
    distinct: (field, filter = {}) => {
      let records = db.get('data').value();
      
      // Apply filters if provided
      if (Object.keys(filter).length > 0) {
        records = records.filter(item => {
          return Object.entries(filter).every(([key, value]) => {
            return item[key] === value;
          });
        });
      }
      
      // Extract distinct values
      const values = records
        .map(item => item[field])
        .filter(value => value !== undefined && value !== null);
        
      // Return unique values
      return [...new Set(values)];
    }
  };
};

// Create models
const License = dbOperations('licenses');
const System = dbOperations('systems');
const User = dbOperations('users');

// Populate initial demo user if none exists
if (User.find().length === 0) {
  User.create({
    name: 'Demo User',
    email: 'demo@example.com',
    password: '$2a$10$XZqOWgAQNQRGQl7jxvp8BuWzBzF10U5idkRr0z0KjWlnf4e0JZ1.i', // Hash for 'password'
    role: 'admin'
  });
  console.log('Created demo user: demo@example.com / password');
}

module.exports = {
  License,
  System,
  User
};