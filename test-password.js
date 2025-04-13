const bcrypt = require('bcrypt');

async function testPassword() {
  const storedHash = '$2b$10$23dEiY9oNv3Xm/Y/F3oN1.rfBfzyxxjMWSMXxtECVjBdZk6XX9emq';
  
  console.log('Testing password comparison:');
  
  try {
    const passwordToTest = '123456';
    const result = await bcrypt.compare(passwordToTest, storedHash);
    console.log(`Password '${passwordToTest}' matches: ${result}`);
    
    const wrongPassword = 'wrong';
    const wrongResult = await bcrypt.compare(wrongPassword, storedHash);
    console.log(`Wrong password '${wrongPassword}' matches: ${wrongResult}`);
  } catch (err) {
    console.error('Error testing password:', err);
  }
}

testPassword(); 