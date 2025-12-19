// Script to create initial Super Admin user
// Usage: node scripts/create-admin.js <email> <password> <name>

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createAdmin() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Super Admin';

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password> [name]');
    process.exit(1);
  }

  try {
    // Create database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inhouse_management'
    });

    // Check if user already exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.log('User already exists with this email. Updating password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.execute(
        'UPDATE users SET password = ?, role = ?, is_active = 1 WHERE email = ?',
        [hashedPassword, 'Super Admin', email]
      );
      console.log('✓ Password updated successfully');
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      await connection.execute(
        `INSERT INTO users (name, email, password, role, is_active)
         VALUES (?, ?, ?, 'Super Admin', 1)`,
        [name, email, hashedPassword]
      );

      console.log('✓ Super Admin user created successfully');
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Name: ${name}`);
    }

    await connection.end();
    console.log('\n✓ Setup complete! You can now login with the credentials above.');
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdmin();

