const mysql = require('mysql2/promise');
const config = require('../config/config');
const logger = require('../utils/logger');
const dns = require('dns');
const util = require('util');

const dnsLookup = util.promisify(dns.lookup);

// Function to resolve hostname (supports both IPv4 and IPv6)
async function resolveHost(host) {
  try {
    console.log(`🔍 Resolving ${host}...`);
    // Use family: 0 to allow both IPv4 and IPv6 (Railway uses IPv6 for internal networking)
    const { address, family } = await dnsLookup(host, { family: 0 });
    console.log(`✅ Resolved ${host} to ${family === 6 ? 'IPv6' : 'IPv4'}: ${address}`);
    return address;
  } catch (err) {
    console.error('❌ Host resolution failed:', err);
    console.error('💡 If using Railway, try setting DB_HOST to "mysql" instead of "mysql.railway.internal"');
    throw err;
  }
}

// Global variable to store the pool - will be initialized after hostname resolution
let pool;

// Initialize the database pool with IPv4/IPv6 support
async function initializePool() {
  // Skip if database config is incomplete
  if (!config.database.host || !config.database.password) {
    console.warn('⚠️ Database configuration incomplete - skipping pool initialization');
    return null;
  }

  try {
    // For test environment on host machine, use localhost instead of host.docker.internal
    // This avoids DNS resolution issues when tests run outside Docker
    let resolvedHost;
    if (process.env.NODE_ENV === 'test' && config.database.host === 'host.docker.internal') {
      resolvedHost = '127.0.0.1';
      console.log('🧪 Test environment detected - using localhost instead of host.docker.internal');
    } else {
      // Resolve hostname (supports both IPv4 and IPv6 for Railway compatibility)
      resolvedHost = await resolveHost(config.database.host);
    }

    console.log('🔗 Creating MySQL pool with resolved config:', {
      host: resolvedHost,
      originalHost: config.database.host,
      port: config.database.port,
      user: config.database.user,
      database: config.database.database,
      ssl: config.database.ssl || false
    });

    // ChatGPT optimized connection pool with IPv6 support
    pool = mysql.createPool({
      host: resolvedHost, // Use resolved address (IPv4 or IPv6)
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10, // ChatGPT recommendation
      queueLimit: 0,
      connectTimeout: 15000, // 15 seconds for Railway
      // ChatGPT: Private networking usually doesn't need SSL
      ssl: config.database.ssl === true ? { rejectUnauthorized: false } : false
      // Removed all non-standard mysql2 options for clean config
    });

    // ChatGPT: Prove connectivity once during init
    await pool.query('SELECT 1');

    // Pool health monitoring
    pool.on('connection', (connection) => {
      logger.debug('New database connection established');
    });

    pool.on('error', (error) => {
      logger.error('Database pool error:', error);
    });

    // Add small delay to ensure pool is fully initialized
    console.log('⏳ Allowing pool to fully initialize...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

    console.log('✅ MySQL pool initialized successfully (IPv4/IPv6 compatible)');
    return pool;
  } catch (error) {
    console.error('❌ Failed to initialize MySQL pool:', error);
    throw error;
  }
}

// Pool monitoring and health functions
function getPoolStats() {
  try {
    // Access MySQL2 pool internals for monitoring
    const poolImpl = pool.pool;
    if (poolImpl && poolImpl._allConnections && poolImpl._freeConnections) {
      return {
        connectionLimit: poolImpl.config.connectionLimit,
        totalConnections: poolImpl._allConnections.length,
        activeConnections: poolImpl._allConnections.length - poolImpl._freeConnections.length,
        idleConnections: poolImpl._freeConnections.length,
        queuedRequests: poolImpl._connectionQueue ? poolImpl._connectionQueue.length : 0,
        status: 'detailed_monitoring'
      };
    } else {
      // Fallback to basic monitoring
      return {
        connectionLimit: 50,
        status: 'basic_monitoring'
      };
    }
  } catch (error) {
    return {
      connectionLimit: 50,
      status: 'monitoring_error',
      error: error.message
    };
  }
}

// Enhanced connection test with monitoring and retry logic
async function testConnection(maxRetries = 3, retryDelay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!pool) {
        throw new Error('Database pool not initialized. Call initializePool() first.');
      }
      
      console.log(`🔗 Testing database connection (attempt ${attempt}/${maxRetries})...`);
      
      // Try to get a connection with explicit error handling
      const connection = await pool.getConnection();
      
      // Check if connection is actually valid
      if (!connection) {
        throw new Error('Pool getConnection() returned null - pool may not be ready');
      }
      
      // Test the connection
      const [result] = await connection.execute('SELECT 1 as test, NOW() as timestamp');
      console.log('✅ Pool connection test successful:', result[0]);
      
      logger.info('Database connection successful');
      logger.info('Pool stats:', getPoolStats());
      connection.release();
      return true;
    } catch (error) {
      console.error(`❌ Database connection test failed (attempt ${attempt}/${maxRetries}):`, error.message);
      if (error.code) console.error('Error code:', error.code);
      if (error.errno) console.error('Error errno:', error.errno);
      
      // Special handling for null connection issue
      if (error.message.includes('null')) {
        console.error('🚨 Pool connection is null - this suggests pool initialization timing issue');
        console.error('Pool object exists:', !!pool);
        console.error('Pool stats:', getPoolStats());
      }
      
      if (attempt === maxRetries) {
        logger.error('Database connection failed after all retries:', error);
        logger.error('Pool stats:', getPoolStats());
        return false;
      }
      
      console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  return false;
}

// Function to get the pool (ensures it's initialized)
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

// Railway-Smart Database Connection Testing
async function debugRailwayConnection() {
  const config = require('../config/config');
  console.log('🔍 Database Connection Debug Information:');
  console.log('Host:', config.database.host);
  console.log('Port:', config.database.port);
  console.log('User:', config.database.user);
  console.log('Database:', config.database.database);
  console.log('SSL Config:', config.database.ssl);
  console.log('Password provided:', config.database.password ? 'YES' : 'NO');
  console.log('Password length:', config.database.password ? config.database.password.length : 0);
  
  // Detect Railway environment and connection type
  const isRailwayPrivate = config.database.host && (
    config.database.host.includes('railway.internal') ||
    config.database.host.includes('railway-private') ||
    process.env.RAILWAY_PRIVATE_DOMAIN
  );
  
  console.log('🚂 Railway Private Network:', isRailwayPrivate);
  console.log('🔒 SSL Enabled:', !!config.database.ssl);
  
  // Test connection with Railway-specific settings
  const connectionConfig = {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    ssl: config.database.ssl || false,
    connectTimeout: isRailwayPrivate ? 15000 : 30000 // Longer timeouts for Railway
    // ChatGPT fix: Removed family option (not supported by mysql2)
  };
  
  // Test basic MySQL connection without pool
  try {
    console.log('🧪 Testing direct MySQL connection...');
    console.log('Connection config:', JSON.stringify({
      ...connectionConfig,
      password: connectionConfig.password ? '[HIDDEN]' : 'NOT_SET'
    }, null, 2));
    
    const directConnection = await mysql.createConnection(connectionConfig);
    
    // Test database access
    const [result] = await directConnection.execute('SELECT 1 as test, NOW() as timestamp, @@version as mysql_version');
    console.log('✅ Direct connection successful!');
    console.log('Test result:', result[0]);
    
    // Test database existence and permissions
    const [databases] = await directConnection.execute('SHOW DATABASES');
    console.log('Available databases:', databases.map(db => db.Database));
    
    // Test table access
    const [tables] = await directConnection.execute('SHOW TABLES');
    console.log('Tables in database:', tables.length);
    
    await directConnection.end();
    return true;
  } catch (error) {
    console.error('❌ Direct connection failed:', error.message);
    console.error('Error code:', error.code || 'NO_CODE');
    console.error('Error errno:', error.errno || 'NO_ERRNO');
    console.error('Error sqlState:', error.sqlState || 'NO_SQLSTATE');
    console.error('Error fatal:', error.fatal || false);
    
    // Railway-specific error analysis
    if (error.code === 'ECONNREFUSED') {
      console.error('🚨 Connection refused - check host and port');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('🚨 Access denied - check username and password');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('🚨 Database does not exist - check database name');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🚨 Host not found - check hostname');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🚨 Connection timed out - check network connectivity');
    }
    
    return false;
  }
}

// Initialize the pool and test connection with proper error handling
async function startDatabaseInitialization() {
  // Check if database variables are available
  const config = require('../config/config');
  if (!config.database.host || !config.database.password) {
    console.log('🔄 No database configured - starting without database');
    console.log('💡 Health endpoints will work, database features disabled');
    return;
  }
  
  try {
    console.log('🚀 Starting database initialization...');
    
    // Initialize pool first
    const poolResult = await initializePool();
    if (!poolResult) {
      console.log('⚠️ Database pool initialization skipped');
      return;
    }
    console.log('🎉 Database pool initialization complete');
    
    // Then test the pool with retries (using the pool, not direct connection)
    const success = await testConnection(3, 5000); // 3 retries, 5 second delays
    if (success) {
      console.log('🎯 Database connection test passed');
    } else {
      console.log('⚠️ Database connection test failed after retries');
      throw new Error('Database connection test failed');
    }
    
    // Optional: Run debug info after successful connection
    console.log('🔍 Testing direct connection for debugging...');
    await debugRailwayConnection();
    
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    console.error('🚨 Backend will continue without database - some features may not work');
    // Don't exit process - let app handle graceful degradation
  }
}

// Don't auto-initialize - let server.js explicitly call initializeDatabase()
// This prevents race conditions between module loading and server startup

// Store the initialization promise to prevent duplicate initialization
let initializationPromise = null;

// Initialize database and wait for completion
async function initializeDatabase() {
  // Return existing promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }

  // Check if we have database config (use config module, not env vars directly)
  const config = require('../config/config');
  if (!config.database.host || !config.database.password) {
    console.log('🔄 Database configuration missing - skipping initialization');
    return null;
  }

  // Create and store the initialization promise
  initializationPromise = startDatabaseInitialization();
  await initializationPromise;
  return pool;
}

// Export pool initialization and monitoring functions
module.exports = {
  get pool() {
    if (!pool) {
      console.warn('⚠️ Database pool not ready - some operations may fail');
      return null;
    }
    return pool;
  },
  initializePool,
  initializeDatabase,  // NEW: Use this instead of waitForPool for proper initialization
  getPoolStats,
  testConnection,
  getPool: () => {
    if (!pool) {
      console.warn('⚠️ Database pool not ready');
      return null;
    }
    return pool;
  },
  isReady: () => !!pool
};