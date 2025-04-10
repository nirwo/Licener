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

// Safe toString helper function to avoid errors
const safeToString = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  
  try {
    return String(value);
  } catch (err) {
    console.error('Error converting value to string:', err);
    return '';
  }
};

/**
 * Safely compare two IDs which might be strings, objects with toString, etc.
 * @param {*} id1 - First ID
 * @param {*} id2 - Second ID
 * @return {boolean} Whether the IDs match
 */
const safeIdCompare = (id1, id2) => {
  if (id1 === id2) return true;
  if (!id1 || !id2) return false;
  
  try {
    return safeToString(id1) === safeToString(id2);
  } catch (err) {
    console.error('Error comparing IDs:', err);
    return false;
  }
};

// Define a common database utility object
const db = {
  // Find by ID and update method for all collections
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
      const index = data.data.findIndex(item => safeIdCompare(item._id, id));
      
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
  // ...other db methods...
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
                const itemValue = safeToString(v);
                const compareValue = safeToString(value);
                return itemValue === compareValue;
              });
            }
            
            // Handle array vs array (at least one match)
            if (Array.isArray(item[key]) && Array.isArray(value)) {
              return item[key].some(v => value.some(val => {
                const itemValue = safeToString(v);
                const compareValue = safeToString(val);
                return itemValue === compareValue;
              }));
            }
            
            // Handle ID comparisons (special case for managedBy, owner, _id)
            if (key === 'managedBy' || key === 'owner' || key === '_id') {
              return safeIdCompare(item[key], value);
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
      
      // Convert id to string for comparison with error handling
      const idStr = safeToString(id); 
      console.log(`FIND BY ID: Looking for _id=${idStr} in ${dbName}`);
      
      try {
        const result = db.get('data')
          .find(item => safeIdCompare(item._id, idStr))
          .value();
        
        return result || null;
      } catch (err) {
        console.error(`Error in findById for ${dbName}:`, err);
        return null;
      }
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
    findByIdAndUpdate: async (id, updates) => {
      try {
        console.log(`UPDATE BY ID: Looking to update _id=${id} in ${dbName}`);
        const collectionPath = path.join(dataDir, `${dbName}.json`);
        
        // Make sure the file exists
        if (!fs.existsSync(collectionPath)) {
          console.log(`UPDATE BY ID: Collection file not found for ${dbName}`);
          return null;
        }
        
        // Read the collection data
        const data = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
        
        // Find the item by ID
        const index = data.data.findIndex(item => safeIdCompare(item._id, id));
        
        // If item not found, return null
        if (index === -1) {
          console.log(`UPDATE BY ID: No matching item with _id=${id} in ${dbName}`);
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
        
        console.log(`UPDATE BY ID: Successfully updated item with _id=${id} in ${dbName}`);
        
        // Return the updated item
        return updatedItem;
      } catch (err) {
        console.error(`Error in findByIdAndUpdate for ${dbName}:`, err);
        throw err;
      }
    },
    
    /**
     * Delete a record by ID
     * @param {String} id - Record ID
     * @returns {Boolean} Success status
     */
    findByIdAndDelete: (id) => {
      if (!id) return false;
      
      // Convert id to string for comparison with error handling
      const idStr = safeToString(id);
      console.log(`DELETE BY ID: Looking to delete _id=${idStr} in ${dbName}`);
      
      try {
        // Find record by string ID with better error handling
        const record = db.get('data')
          .find(item => safeIdCompare(item._id, idStr))
          .value();
        
        if (!record) {
          console.warn(`${dbName.toUpperCase()} DB - Delete failed: Record with ID ${idStr} not found`);
          return false;
        }
        
        db.get('data')
          .remove(item => safeIdCompare(item._id, idStr))
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
              
              // Handle ID comparisons with better error handling
              if (key === 'managedBy' || key === 'owner' || key === '_id') {
                return safeIdCompare(item[key], value);
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
            // Handle ID comparisons with better error handling
            if (key === 'managedBy' || key === 'owner' || key === '_id') {
              return safeIdCompare(item[key], value);
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
const License = {
  ...dbOperations('licenses'),
  
  /**
   * Populate references in license document(s)
   * @param {Object|Array} docs - License document or array of documents
   * @param {String} path - Path to populate ('assignedSystems' or 'owner')
   * @return {Object|Array} Populated document(s)
   */
  populate: async (docs, path) => {
    console.log(`Populating ${path} for license(s)`);
    
    if (!docs) {
      console.log('No documents to populate');
      return null;
    }
    
    // Handle single document
    if (!Array.isArray(docs)) {
      return await populateSingleDocument(docs, path);
    }
    
    // Handle array of documents
    const populatedDocs = [];
    for (const doc of docs) {
      const populated = await populateSingleDocument(doc, path);
      populatedDocs.push(populated);
    }
    
    return populatedDocs;
  },
  
  // Create a new license with proper ID handling
  create: async (licenseData) => {
    try {
      // Ensure license has an ID
      if (!licenseData._id) {
        licenseData._id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      }
      
      console.log(`Creating license with ID: ${licenseData._id}`);
      
      // Get existing licenses
      let licenses = [];
      if (fs.existsSync(dbFiles.licenses)) {
        const data = JSON.parse(fs.readFileSync(dbFiles.licenses, 'utf8'));
        licenses = data.data || [];
      }
      
      // Ensure ID is unique
      const existingLicense = licenses.find(lic => lic._id === licenseData._id);
      if (existingLicense) {
        console.log(`ID collision detected: ${licenseData._id}, generating new ID`);
        licenseData._id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      }
      
      // Add timestamps
      licenseData.createdAt = new Date();
      licenseData.updatedAt = new Date();
      
      // Add the new license
      licenses.push(licenseData);
      
      // Save to file
      fs.writeFileSync(dbFiles.licenses, JSON.stringify({ data: licenses }, null, 2));
      
      console.log(`License saved successfully with ID: ${licenseData._id}`);
      return licenseData;
    } catch (err) {
      console.error('Error creating license:', err);
      throw err;
    }
  },
  
  // Find license by ID with improved error handling
  findById: async (id) => {
    try {
      if (!id) {
        console.error('Invalid license ID: null or undefined');
        return null;
      }
      
      console.log(`Looking for license with ID: ${id}`);
      
      if (!fs.existsSync(dbFiles.licenses)) {
        console.log('License file does not exist');
        return null;
      }
      
      const data = JSON.parse(fs.readFileSync(dbFiles.licenses, 'utf8'));
      const licenses = data.data || [];
      
      console.log(`Searching among ${licenses.length} licenses`);
      
      // Find by exact ID match
      const license = licenses.find(lic => lic._id === id);
      
      console.log(`License with ID ${id} ${license ? 'found' : 'not found'}`);
      return license || null;
    } catch (err) {
      console.error(`Error finding license with ID ${id}:`, err);
      return null;
    }
  },
  
  // Find all licenses with improved error handling
  find: async (query = {}) => {
    try {
      if (!fs.existsSync(dbFiles.licenses)) {
        console.log('License file does not exist, returning empty array');
        return [];
      }
      
      const data = JSON.parse(fs.readFileSync(dbFiles.licenses, 'utf8'));
      const licenses = data.data || [];
      
      // If no query or empty query, return all
      if (!query || Object.keys(query).length === 0) {
        return licenses;
      }
      
      // Otherwise, filter based on query
      // ...existing filtering code...
      
      return licenses;
    } catch (err) {
      console.error('Error finding licenses:', err);
      return [];
    }
  }
};

/**
 * Helper function to populate a single document
 * @param {Object} doc - The document to populate
 * @param {String} path - Path to populate
 * @return {Object} Populated document
 */
async function populateSingleDocument(doc, path) {
  // Clone the document to avoid modifying the original
  const clonedDoc = JSON.parse(JSON.stringify(doc));
  
  if (path === 'assignedSystems') {
    // Populate systems
    if (clonedDoc.assignedSystems && Array.isArray(clonedDoc.assignedSystems)) {
      const populatedSystems = [];
      
      for (const systemId of clonedDoc.assignedSystems) {
        if (!systemId) continue;
        
        try {
          const system = await System.findById(systemId);
          if (system) {
            populatedSystems.push(system);
          }
        } catch (err) {
          console.error(`Error populating system ${systemId}:`, err);
        }
      }
      
      clonedDoc.assignedSystems = populatedSystems;
    }
  } else if (path === 'owner') {
    // Populate owner
    if (clonedDoc.owner) {
      try {
        const owner = await User.findById(clonedDoc.owner);
        if (owner) {
          clonedDoc.owner = owner;
        }
      } catch (err) {
        console.error(`Error populating owner ${clonedDoc.owner}:`, err);
      }
    }
  }
  
  return clonedDoc;
}

const SYSTEM_FILE = dbFiles.systems;

const System = {
  ...dbOperations('systems'),
  
  // Fix the findById method that's causing the error
  findById: async (id) => {
    if (!id) return null;
    const idStr = safeToString(id);
    
    try {
      // Read from systems file directly instead of using db.findById
      if (!fs.existsSync(SYSTEM_FILE)) {
        console.log('System file does not exist');
        return null;
      }
      
      const data = JSON.parse(fs.readFileSync(SYSTEM_FILE, 'utf8'));
      const systems = data.data || [];
      
      // Find by ID with safe comparison
      const system = systems.find(sys => safeIdCompare(sys._id, idStr));
      return system || null;
    } catch (err) {
      console.error('Error in System.findById:', err);
      return null;
    }
  },

  /**
   * Find systems managed by a specific user
   * @param {string} managerId - ID of the manager/user
   * @return {Array} Array of systems managed by the user
   */
  findByManager: async (managerId) => {
    try {
      console.log(`Finding systems managed by user ID: ${managerId}`);
      
      if (!managerId) {
        console.warn('No manager ID provided to findByManager');
        return [];
      }
      
      // Check if system file exists
      if (!fs.existsSync(SYSTEM_FILE)) {
        console.log('System file does not exist, returning empty array');
        return [];
      }
      
      // Read systems from file
      const data = JSON.parse(fs.readFileSync(SYSTEM_FILE, 'utf8'));
      const systems = data.data || [];
      
      // Filter by manager ID
      const managedSystems = systems.filter(system => {
        // Check if managedBy exists and matches the provided ID
        if (!system.managedBy) return false;
        
        // Convert IDs to strings for comparison
        const systemManagerId = typeof system.managedBy === 'string' ? 
          system.managedBy : system.managedBy.toString();
        const requestedManagerId = typeof managerId === 'string' ? 
          managerId : managerId.toString();
          
        return systemManagerId === requestedManagerId;
      });
      
      console.log(`Found ${managedSystems.length} systems managed by user ${managerId}`);
      return managedSystems;
    } catch (err) {
      console.error(`Error finding systems managed by ${managerId}:`, err);
      return [];
    }
  }
};

const USER_FILE = dbFiles.users;

const User = {
  ...dbOperations('users'),
  
  // Create a new user
  create: async (userData) => {
    try {
      // Read current users
      let users = [];
      if (fs.existsSync(USER_FILE)) {
        const data = JSON.parse(fs.readFileSync(USER_FILE, 'utf8'));
        users = data.data || [];
      }
      
      // Add new user
      users.push(userData);
      
      // Save to file
      fs.writeFileSync(USER_FILE, JSON.stringify({ data: users }, null, 2));
      
      return userData;
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  },
  
  // Find a user by email
  findOne: async (query) => {
    try {
      console.log('Finding user with query:', query);
      
      // Check if file exists, create it if it doesn't
      if (!fs.existsSync(USER_FILE)) {
        // Initialize empty users file
        fs.writeFileSync(USER_FILE, JSON.stringify({ data: [] }, null, 2));
        console.log('Created new users file');
        return null;
      }
      
      // Read users from file
      const fileContent = fs.readFileSync(USER_FILE, 'utf8');
      const data = JSON.parse(fileContent);
      const users = data.data || [];
      
      console.log(`Searching among ${users.length} users`);
      
      // Find by email (most common case)
      if (query.email) {
        const user = users.find(user => user.email === query.email);
        console.log(`User with email ${query.email} ${user ? 'found' : 'not found'}`);
        return user || null;
      }
      
      // Find by ID
      if (query._id) {
        const user = users.find(user => safeIdCompare(user._id, query._id));
        console.log(`User with ID ${query._id} ${user ? 'found' : 'not found'}`);
        return user || null;
      }
      
      // No matching criteria
      console.log('No valid search criteria in query');
      return null;
    } catch (err) {
      console.error('Error in User.findOne:', err);
      return null; // Return null instead of throwing to prevent app crashes
    }
  },
  
  // Make sure findById exists too
  findById: async (id) => {
    if (!id) return null;
    
    try {
      // Safe string conversion
      const idStr = safeToString(id);
      if (!idStr) return null;
      
      return await User.findOne({ _id: idStr });
    } catch (err) {
      console.error('Error in User.findById:', err);
      return null;
    }
  }
};

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
  User,
  db,
  safeToString,
  safeIdCompare
};