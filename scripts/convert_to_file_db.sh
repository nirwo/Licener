#!/bin/bash

# Script to convert Licener to use file-based database

# Install lowdb
echo "Installing lowdb..."
npm install lowdb@1.0.0

# Create data directory
mkdir -p ./data

# Backup original files
echo "Backing up original files..."
mkdir -p ./backup_mongo
cp models/License.js ./backup_mongo/
cp models/System.js ./backup_mongo/
cp models/User.js ./backup_mongo/
cp app.js ./backup_mongo/

# Create initial demo data
echo "Creating initial data files..."
cat > ./data/licenses.json << EOL
{"data":[
  {
    "_id": "license1",
    "name": "Microsoft 365 Business",
    "product": "Microsoft 365",
    "licenseKey": "XXXX-XXXX-XXXX-XXXX-1234",
    "purchaseDate": "2023-01-01T00:00:00.000Z",
    "expiryDate": "2024-01-01T00:00:00.000Z",
    "totalSeats": 10,
    "usedSeats": 8,
    "cost": 1200,
    "currency": "USD",
    "vendor": "Microsoft",
    "notes": "Annual subscription, auto-renewal enabled",
    "status": "active",
    "assignedSystems": ["system1", "system2"],
    "owner": "user1",
    "attachments": [
      {
        "_id": "att1",
        "filename": "invoice.pdf",
        "path": "/path/to/invoice.pdf",
        "uploadDate": "2023-01-01T00:00:00.000Z"
      }
    ]
  },
  {
    "_id": "license2",
    "name": "Adobe Creative Cloud",
    "product": "Creative Cloud",
    "licenseKey": "ADBE-XXXX-XXXX-XXXX-5678",
    "purchaseDate": "2023-02-15T00:00:00.000Z",
    "expiryDate": "2024-02-15T00:00:00.000Z",
    "totalSeats": 5,
    "usedSeats": 5,
    "cost": 3000,
    "currency": "USD",
    "vendor": "Adobe",
    "notes": "Design team licenses",
    "status": "active",
    "assignedSystems": ["system2"],
    "owner": "user1",
    "attachments": []
  },
  {
    "_id": "license3",
    "name": "Antivirus Enterprise",
    "product": "Security Suite Pro",
    "licenseKey": "AVPRO-XXXX-XXXX-XXXX-5432",
    "purchaseDate": "2022-09-15T00:00:00.000Z",
    "expiryDate": "2023-01-01T00:00:00.000Z",
    "totalSeats": 100,
    "usedSeats": 95,
    "cost": 3599.99,
    "currency": "USD",
    "vendor": "Symantec",
    "notes": "Company-wide antivirus solution - EXPIRED",
    "status": "expired",
    "assignedSystems": [],
    "owner": "user1",
    "attachments": []
  }
]}
EOL

cat > ./data/systems.json << EOL
{"data":[
  {
    "_id": "system1",
    "name": "Production Server A",
    "type": "physical",
    "os": "Linux",
    "osVersion": "Ubuntu 20.04 LTS",
    "location": "Data Center A",
    "department": "Operations",
    "status": "active",
    "managedBy": "user1",
    "ip": "192.168.1.10",
    "lastSeen": "2023-01-15T00:00:00.000Z",
    "installedSoftware": [
      { "name": "Docker", "version": "20.10.12", "installDate": "2023-01-15T00:00:00.000Z" },
      { "name": "Nginx", "version": "1.18.0", "installDate": "2023-01-15T00:00:00.000Z" }
    ],
    "licenseRequirements": [
      { "licenseType": "Microsoft 365", "quantity": 1, "licenseId": "license1" }
    ],
    "notes": "Primary production server"
  },
  {
    "_id": "system2",
    "name": "Development VM 1",
    "type": "virtual",
    "os": "Windows",
    "osVersion": "Windows Server 2019",
    "location": "Cloud",
    "department": "Development",
    "status": "active",
    "managedBy": "user1",
    "ip": "192.168.1.20",
    "lastSeen": "2023-02-10T00:00:00.000Z",
    "installedSoftware": [
      { "name": "Visual Studio", "version": "2022", "installDate": "2023-02-10T00:00:00.000Z" },
      { "name": "Node.js", "version": "16.14.0", "installDate": "2023-02-10T00:00:00.000Z" },
      { "name": "Adobe Creative Cloud", "version": "2023", "installDate": "2023-02-20T00:00:00.000Z" }
    ],
    "licenseRequirements": [
      { "licenseType": "Microsoft 365", "quantity": 1, "licenseId": "license1" },
      { "licenseType": "Creative Cloud", "quantity": 1, "licenseId": "license2" }
    ],
    "notes": "Developer workstation"
  }
]}
EOL

cat > ./data/users.json << EOL
{"data":[
  {
    "_id": "user1",
    "name": "Demo User",
    "email": "demo@example.com",
    "password": "\$2a\$10\$XZqOWgAQNQRGQl7jxvp8BuWzBzF10U5idkRr0z0KjWlnf4e0JZ1.i",
    "role": "admin",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]}
EOL

# Create the file-db.js utility
echo "Creating file-db.js utility..."
mkdir -p ./utils
cat > ./utils/file-db.js << 'EOL'
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
EOL

# Update License model
echo "Updating License model..."
cat > ./models/License.js << 'EOL'
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
EOL

# Update System model
echo "Updating System model..."
cat > ./models/System.js << 'EOL'
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
EOL

# Update User model
echo "Updating User model..."
cat > ./models/User.js << 'EOL'
/**
 * User Model
 * File-based implementation using LowDB
 */
const { User: FileDBUser } = require('../utils/file-db');
const bcrypt = require('bcryptjs');

// This is a wrapper around the file DB to maintain API compatibility
const User = {
  ...FileDBUser,
  
  // Special method for user creation with password hashing
  register: async (userData) => {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // Create user with hashed password
    return FileDBUser.create({
      ...userData,
      password: hashedPassword
    });
  },
  
  // Method to check password
  authenticate: async (email, password) => {
    // Find user by email
    const user = FileDBUser.find({ email })[0];
    
    if (!user) {
      return null;
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    return isMatch ? user : null;
  }
};

module.exports = User;
EOL

# Update banner.js utility
echo "Updating banner.js utility..."
mkdir -p ./utils
cat > ./utils/banner.js << 'EOL'
/**
 * Console banner for Licener app
 */

/**
 * Display a banner in the console
 * @param {boolean} demoMode - Whether the app is running in demo mode
 * @param {string} dbMode - Database mode ('MONGO', 'FILE-DB', etc.)
 */
function displayBanner(demoMode = false, dbMode = 'MONGO') {
  console.log('\n');
  console.log('┌───────────────────────────────────────────────────────────┐');
  console.log('│                                                           │');
  console.log('│                   LICENER                                 │');
  console.log('│           License Management System                       │');
  console.log('│                                                           │');
  
  if (demoMode) {
    console.log('│                                                           │');
    console.log('│  ███████ DEMO MODE ███████                                │');
    console.log('│  No database connection required                          │');
    console.log('│  All data is stored in memory and will be lost on restart │');
    console.log('│                                                           │');
  } else if (dbMode === 'FILE-DB') {
    console.log('│                                                           │');
    console.log('│  ███████ FILE DATABASE ███████                            │');
    console.log('│  Using JSON files for data storage                        │');
    console.log('│  Data stored in ./data directory                          │');
    console.log('│                                                           │');
  }
  
  console.log('└───────────────────────────────────────────────────────────┘');
  console.log('\n');
}

module.exports = { displayBanner };
EOL

# Update app.js to use file-based database
echo "Updating app.js to use file-based database..."
awk '
{
  if (/const mongoose = require\(/) next;
  else if (/const dotenv = require\(/) {
    print;
    print "const { displayBanner } = require(\"./utils/banner\");";
  }
  else if (/\/\/ Load environment variables/) {
    print;
    print "dotenv.config();";
    print "";
    print "const app = express();";
    print "";
    print "// Initialize file-based database";
    print "const { License, System, User } = require(\"./utils/file-db\");";
    print "console.log(\"File-based database initialized\");";
    print "";
    print "// Display file database banner";
    print "displayBanner(false, \"FILE-DB\");";
    print "";
    getline; // Skip dotenv.config()
    getline; // Skip empty line
    getline; // Skip app = express line
    next;
  }
  else if (/\/\/ DB Config/) {
    next;
  }
  else if (/const db = process.env.MONGO_URI/) {
    next;
  }
  else if (/\/\/ Connect to MongoDB/) {
    while (!/else {/) {
      getline;
    }
    next;
  }
  else if (/connectWithRetry\(\);/) {
    next;
  }
  else print;
}
' app.js > app.js.new && mv app.js.new app.js

# Make the script executable
chmod +x ./scripts/convert_to_file_db.sh

echo "Conversion complete. You are now using a file-based database."
echo "Run the app with 'npm start' and data will be stored in JSON files in the ./data directory."