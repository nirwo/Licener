/**
 * Database Reset and Initialization Script
 * 
 * This script will:
 * 1. Create a fresh database file
 * 2. Add admin user and demo data
 * 3. Log detailed diagnostic information
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'db.json');

// Create the data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  console.log(`Creating data directory: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

// Current date for created/updated timestamps
const now = new Date().toISOString();

// Create admin user with password "admin"
async function createAdminUser() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin', salt);
  
  return {
    _id: uuidv4(),
    name: 'Admin User',
    email: 'admin@admin.com',
    password: hash,
    role: 'admin',
    createdAt: now,
    updatedAt: now
  };
}

// Create sample vendors
function createVendors() {
  return [
    {
      _id: uuidv4(),
      name: 'Microsoft',
      contact: 'support@microsoft.com',
      phone: '1-800-642-7676',
      website: 'https://www.microsoft.com',
      createdAt: now,
      updatedAt: now
    },
    {
      _id: uuidv4(),
      name: 'Adobe',
      contact: 'support@adobe.com',
      phone: '1-800-833-6687',
      website: 'https://www.adobe.com',
      createdAt: now,
      updatedAt: now
    },
    {
      _id: uuidv4(),
      name: 'Oracle',
      contact: 'support@oracle.com',
      phone: '1-800-392-2999',
      website: 'https://www.oracle.com',
      createdAt: now,
      updatedAt: now
    }
  ];
}

// Create sample systems
function createSystems() {
  return [
    {
      _id: uuidv4(),
      name: 'Production Server',
      description: 'Main production application server',
      type: 'Server',
      environment: 'Production',
      status: 'Active',
      createdAt: now,
      updatedAt: now
    },
    {
      _id: uuidv4(),
      name: 'Development Server',
      description: 'Development environment server',
      type: 'Server',
      environment: 'Development',
      status: 'Active',
      createdAt: now,
      updatedAt: now
    },
    {
      _id: uuidv4(),
      name: 'Design Workstation',
      description: 'Graphics design workstation',
      type: 'Workstation',
      environment: 'Production',
      status: 'Active',
      createdAt: now,
      updatedAt: now
    }
  ];
}

// Create sample licenses
function createLicenses(vendors, systems) {
  // Create dates - some active, some expired, some approaching expiry
  const expired = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
  const nearExpiry = new Date(new Date().setDate(new Date().getDate() + 15)).toISOString();
  const future = new Date(new Date().setDate(new Date().getDate() + 180)).toISOString();
  
  return [
    {
      _id: uuidv4(),
      name: 'Windows Server 2022',
      description: 'Enterprise server operating system license',
      vendor: vendors[0]._id,
      product: 'Windows Server 2022',
      type: 'Perpetual',
      purchaseDate: now,
      expiryDate: future,
      cost: 1200,
      quantity: 2,
      systems: [systems[0]._id],
      status: 'Active',
      createdAt: now,
      updatedAt: now
    },
    {
      _id: uuidv4(),
      name: 'Adobe Creative Cloud',
      description: 'Creative design software suite',
      vendor: vendors[1]._id,
      product: 'Creative Cloud',
      type: 'Subscription',
      purchaseDate: expired,
      expiryDate: expired,
      cost: 599.99,
      quantity: 1,
      systems: [systems[2]._id],
      status: 'Expired',
      createdAt: now,
      updatedAt: now
    },
    {
      _id: uuidv4(),
      name: 'Oracle Database',
      description: 'Enterprise database license',
      vendor: vendors[2]._id,
      product: 'Oracle Database Enterprise',
      type: 'Subscription',
      purchaseDate: now,
      expiryDate: nearExpiry,
      cost: 5000,
      quantity: 1,
      systems: [systems[0]._id, systems[1]._id],
      status: 'Active',
      createdAt: now,
      updatedAt: now
    }
  ];
}

// Main function to reset database
async function resetDatabase() {
  try {
    console.log('Starting database reset...');
    
    // Create admin user
    const adminUser = await createAdminUser();
    console.log('Created admin user with email: admin@admin.com and password: admin');
    
    // Create vendors
    const vendors = createVendors();
    console.log(`Created ${vendors.length} sample vendors`);
    
    // Create systems
    const systems = createSystems();
    console.log(`Created ${systems.length} sample systems`);
    
    // Create licenses
    const licenses = createLicenses(vendors, systems);
    console.log(`Created ${licenses.length} sample licenses`);
    
    // Create the database object
    const db = {
      users: [adminUser],
      vendors: vendors,
      systems: systems,
      licenses: licenses
    };
    
    // Write to file
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log(`Database reset successfully. File saved to: ${dbPath}`);
    
    // Verify file was created properly
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`Database file size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // Try to read it back
      const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      console.log('Database validation check:', {
        users: dbData.users.length,
        vendors: dbData.vendors.length,
        systems: dbData.systems.length,
        licenses: dbData.licenses.length
      });
    }
    
    console.log('\nDatabase reset complete!');
    console.log('You can now log in with:');
    console.log('Email: admin@admin.com');
    console.log('Password: admin');
    
  } catch (err) {
    console.error('Error resetting database:', err);
  }
}

// Run the reset function
resetDatabase(); 