/**
 * Master Database Configuration
 * 
 * This file centralizes all database configuration settings.
 * For production, use environment variables.
 * 
 * Environment Variables Required:
 * - DB_HOST: Database host (default: localhost)
 * - DB_USER: Database username (default: root)
 * - DB_PASSWORD: Database password (default: '')
 * - DB_NAME: Database name (default: inhouse_management)
 * - DB_PORT: Database port (default: 3306)
 * - DB_CONNECTION_LIMIT: Connection pool limit (default: 10)
 * - DB_QUEUE_LIMIT: Connection queue limit (default: 0)
 */

const databaseConfig = {
  // Connection settings
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inhouse_management',
  port: parseInt(process.env.DB_PORT || '3306', 10),

  // Connection pool settings
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),

  // SSL/TLS settings (for production)
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false,

  // Timezone
  timezone: process.env.DB_TIMEZONE || 'Z',

  // Connection timeout (milliseconds)
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),

  // Enable keep-alive
  enableKeepAlive: process.env.DB_ENABLE_KEEP_ALIVE !== 'false',
};

// Validation
function validateConfig() {
  const required = ['host', 'user', 'database'];
  const missing = required.filter(key => !databaseConfig[key]);
  
  if (missing.length > 0) {
    console.warn(`Warning: Missing database configuration: ${missing.join(', ')}`);
  }

  if (!databaseConfig.password && process.env.NODE_ENV === 'production') {
    console.warn('Warning: Database password is empty in production environment!');
  }

  return databaseConfig;
}

// Get configuration for different environments
function getConfig(environment = process.env.NODE_ENV || 'development') {
  const baseConfig = { ...databaseConfig };

  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10),
        ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        } : false,
      };
    
    case 'staging':
      return {
        ...baseConfig,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10),
      };
    
    case 'development':
    default:
      return baseConfig;
  }
}

module.exports = {
  databaseConfig,
  validateConfig,
  getConfig,
};


