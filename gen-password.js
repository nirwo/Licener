const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function generatePassword() {
  const password = '123456';
  
  // Generate hash with bcrypt
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log(`Password: ${password}`);
  console.log(`Generated hash: ${hash}`);
  
  // Update the database file
  const dbPath = path.join(__dirname, 'data', 'db.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  if (db.users && db.users.length > 0) {
    db.users[0].password = hash;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('Database updated with new password hash');
  } else {
    console.log('No users found in database');
  }
}

generatePassword().catch(console.error); 