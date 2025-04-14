const bcrypt = require('bcrypt');

async function test() {
  try {
    const hash = '$2b$10$23dEiY9oNv3Xm/Y/F3oN1.rfBfzyxxjMWSMXxtECVjBdZk6XX9emq';
    const result = await bcrypt.compare('123456', hash);
    console.log('Result:', result);
  } catch (e) {
    console.error(e);
  }
}

test();
