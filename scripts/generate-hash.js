// Quick script to generate bcrypt hash for password
const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = process.argv[2] || 'bharatagrolink@2024';
  const hash = await bcrypt.hash(password, 10);
  console.log('\nPassword:', password);
  console.log('Hash:', hash);
  console.log('\nSQL INSERT statement:');
  console.log(`INSERT INTO users (name, email, password, role, is_active, created_at) VALUES ('Super Admin', 'admin@bharatagrolink.com', '${hash}', 'Super Admin', 1, NOW());`);
}

generateHash().catch(console.error);

