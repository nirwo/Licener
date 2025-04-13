// Script to create an admin user
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createAdmin() {
  console.log('Creating admin user...');
  
  // User data
  const email = 'admin@admin.com';
  const password = 'admin';
  
  // Generate password hash with simpler settings
  const hash = await bcrypt.hash(password, 10);
  
  console.log(`Created user: ${email} / ${password}`);
  console.log(`Password hash: ${hash}`);
  
  // Create user object
  const user = {
    _id: uuidv4(),
    name: 'Admin User',
    email: email,
    password: hash,
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Read database
  const dbPath = path.join(__dirname, 'data', 'db.json');
  let db;
  
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    db = JSON.parse(data);
  } catch (err) {
    console.log('Database file not found, creating new one');
    db = {
      licenses: [],
      systems: [],
      users: [],
      vendors: []
    };
  }
  
  // Check if user already exists
  const existingUserIndex = db.users.findIndex(u => u.email === email);
  if (existingUserIndex >= 0) {
    console.log(`User ${email} already exists, updating password`);
    db.users[existingUserIndex].password = hash;
    db.users[existingUserIndex].updatedAt = new Date().toISOString();
  } else {
    console.log(`Adding new user: ${email}`);
    db.users.push(user);
  }
  
  // Write back to database
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log('Database updated successfully');
}

createAdmin().catch(console.error); 