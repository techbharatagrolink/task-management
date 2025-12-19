// Database connection utility
import mysql from 'mysql2/promise';

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inhouse_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Execute query helper
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get connection from pool (for transactions)
async function getConnection() {
  return await pool.getConnection();
}

export {
  pool,
  query,
  getConnection
};

