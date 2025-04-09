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
      // Debug logging for systems database
      if (dbName === 'systems') {
        console.log('SYSTEMS DB QUERY - Filter:', JSON.stringify(filter));
        console.log('SYSTEMS DB QUERY - DB Content:', JSON.stringify(db.get('data').value()));
      }
      
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
              return item[key].some(v => {
                // Convert both to strings for proper comparison
                const itemValue = v ? v.toString() : '';
                const compareValue = value ? value.toString() : '';
                return itemValue === compareValue;
              });
            }
            
            // Handle array vs array (at least one match)
            if (Array.isArray(item[key]) && Array.isArray(value)) {
              return item[key].some(v => value.some(val => {
                const itemValue = v ? v.toString() : '';
                const compareValue = val ? val.toString() : '';
                return itemValue === compareValue;
              }));
            }
            
            // Handle ID comparisons (special case for managedBy, owner, _id)
            if (key === 'managedBy' || key === 'owner' || key === '_id') {
              // Ensure both values exist before comparing
              if (item[key] === undefined || value === undefined) {
                return false;
              }
              
              // Convert both to strings for proper comparison
              const itemValue = item[key] ? item[key].toString() : '';
              const compareValue = value ? value.toString() : '';
              
              console.log(`ID COMPARISON: ${key}=${itemValue} vs ${compareValue}, MATCH=${itemValue === compareValue}`);
              
              return itemValue === compareValue;
            }
            
            // Add strict logging for system lookups
            if (dbName === 'systems' && key === 'managedBy') {
              console.log(`COMPARING: Item ${key}=${item[key]} vs Query value=${value}, MATCH=${item[key] === value}`);
            }
            
            // Regular equality check
            return item[key] === value;
          });
        });
      }
      
      // More debug logging for systems database
      if (dbName === 'systems') {
        console.log('SYSTEMS DB QUERY - Result count:', result.length);
        if (result.length > 0) {
          console.log('SYSTEMS DB QUERY - First result:', JSON.stringify(result[0]));
        }
      }
      
      if (dbName === 'licenses') {
        console.log('LICENSES DB QUERY - Filter:', JSON.stringify(filter));
        console.log('LICENSES DB QUERY - Result count:', result.length);
      }
      
      return result;
    },
    
    /**
     * Find one record by ID
     * @param {String} id - Record ID
     * @returns {Object|null} The record or null if not found
     */
    findById: (id) => {
      if (!id) return null;
      
      // Convert id to string for comparison
      const idStr = id.toString(); 
      
      const result = db.get('data')
        .find(item => item._id && item._id.toString() === idStr)
        .value();
      
      return result || null;
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
      
      console.log(`${dbName.toUpperCase()} DB - Creating new record:`, JSON.stringify(newRecord));
      
      try {
        // Get current data
        const currentData = db.get('data').value() || [];
        
        // Check that currentData is an array
        if (!Array.isArray(currentData)) {
          console.error(`${dbName.toUpperCase()} DB - Error: Current data is not an array`);
          // Initialize with empty array
          db.set('data', [newRecord]).write();
        } else {
          // Add new record to data array
          db.set('data', [...currentData, newRecord]).write();
        }
        
        console.log(`${dbName.toUpperCase()} DB - Created record with ID:`, newRecord._id);
        return newRecord;
      } catch (error) {
        console.error(`${dbName.toUpperCase()} DB - Error creating record:`, error);
        throw error;
      }
    },
    
    /**
     * Update a record by ID
     * @param {String} id - Record ID
     * @param {Object} data - Data to update
     * @returns {Object|null} Updated record or null
     */
    findByIdAndUpdate: (id, data) => {
      if (!id) return null;
      
      // Convert id to string for comparison
      const idStr = id.toString();
      
      // Find record by string ID
      const record = db.get('data')
        .find(item => item._id && item._id.toString() === idStr)
        .value();
      
      if (!record) {
        console.warn(`${dbName.toUpperCase()} DB - Update failed: Record with ID ${idStr} not found`);
        return null;
      }
      
      const updatedRecord = { 
        ...record, 
        ...data,
        updatedAt: new Date()
      };
      
      try {
        db.get('data')
          .find(item => item._id && item._id.toString() === idStr)
          .assign(updatedRecord)
          .write();
        
        console.log(`${dbName.toUpperCase()} DB - Updated record:`, updatedRecord._id);
        return updatedRecord;
      } catch (error) {
        console.error(`${dbName.toUpperCase()} DB - Error updating record:`, error);
        throw error;
      }
    },
    
    /**
     * Delete a record by ID
     * @param {String} id - Record ID
     * @returns {Boolean} Success status
     */
    findByIdAndDelete: (id) => {
      if (!id) return false;
      
      // Convert id to string for comparison
      const idStr = id.toString();
      
      const record = db.get('data')
        .find(item => item._id && item._id.toString() === idStr)
        .value();
      
      if (!record) {
        return false;
      }
      
      try {
        db.get('data')
          .remove(item => item._id && item._id.toString() === idStr)
          .write();
        
        console.log(`${dbName.toUpperCase()} DB - Deleted record with ID:`, idStr);
        return true;
      } catch (error) {
        console.error(`${dbName.toUpperCase()} DB - Error deleting record:`, error);
        return false;
      }
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
      
      try {
        // Get current data
        const currentData = db.get('data').value() || [];
        
        // Check that currentData is an array
        if (!Array.isArray(currentData)) {
          db.set('data', [...savedRecords]).write();
        } else {
          db.set('data', [...currentData, ...savedRecords]).write();
        }
          
        return savedRecords;
      } catch (error) {
        console.error(`${dbName.toUpperCase()} DB - Error inserting multiple records:`, error);
        throw error;
      }
    },
    
    /**
     * Delete multiple records based on criteria
     * @param {Object} filter - Filter criteria
     * @returns {Number} Number of deleted records
     */
    deleteMany: (filter) => {
      const before = db.get('data').size().value();
      
      try {
        db.get('data')
          .remove(filter)
          .write();
          
        const after = db.get('data').size().value();
        return before - after;
      } catch (error) {
        console.error(`${dbName.toUpperCase()} DB - Error deleting multiple records:`, error);
        return 0;
      }
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
      
      try {
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
              
              // Handle ID comparisons
              if (key === 'managedBy' || key === 'owner' || key === '_id') {
                const itemValue = item[key] ? item[key].toString() : '';
                const compareValue = value ? value.toString() : '';
                return itemValue === compareValue;
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
      } catch (error) {
        console.error(`${dbName.toUpperCase()} DB - Error updating multiple records:`, error);
        return 0;
      }
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
            // Handle ID comparisons
            if (key === 'managedBy' || key === 'owner' || key === '_id') {
              const itemValue = item[key] ? item[key].toString() : '';
              const compareValue = value ? value.toString() : '';
              return itemValue === compareValue;
            }
            
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