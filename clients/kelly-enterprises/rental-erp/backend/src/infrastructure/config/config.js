// Only load dotenv in development (Railway injects env vars directly)
console.log('🔧 Config loading - NODE_ENV:', process.env.NODE_ENV);
if (process.env.NODE_ENV !== 'production') {
  console.log('📄 Loading dotenv for development');
  require('dotenv').config();
} else {
  console.log('☁️ Production mode - using Railway environment variables');
}

console.log('🔍 Environment variables check:');
console.log('DB_HOST:', process.env.DB_HOST ? `✅ SET (${process.env.DB_HOST})` : '❌ MISSING');
console.log('MYSQLHOST:', process.env.MYSQLHOST ? `✅ SET (${process.env.MYSQLHOST})` : '❌ MISSING');
console.log('RAILWAY_PRIVATE_DOMAIN:', process.env.RAILWAY_PRIVATE_DOMAIN ? '✅ SET' : '❌ MISSING');
console.log('DB_USER:', process.env.DB_USER ? `✅ SET (${process.env.DB_USER})` : '❌ MISSING');
console.log('MYSQLUSER:', process.env.MYSQLUSER ? `✅ SET (${process.env.MYSQLUSER})` : '❌ MISSING');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? `✅ SET (${process.env.DB_PASSWORD.length} chars)` : '❌ MISSING');
console.log('DB_PASS:', process.env.DB_PASS ? `✅ SET (${process.env.DB_PASS.length} chars)` : '❌ MISSING');
console.log('MYSQLPASSWORD:', process.env.MYSQLPASSWORD ? `✅ SET (${process.env.MYSQLPASSWORD.length} chars)` : '❌ MISSING');
console.log('MYSQL_ROOT_PASSWORD:', process.env.MYSQL_ROOT_PASSWORD ? `✅ SET (${process.env.MYSQL_ROOT_PASSWORD.length} chars)` : '❌ MISSING');
console.log('DB_NAME:', process.env.DB_NAME ? `✅ SET (${process.env.DB_NAME})` : '❌ MISSING');
console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE ? `✅ SET (${process.env.MYSQLDATABASE})` : '❌ MISSING');
console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE ? `✅ SET (${process.env.MYSQL_DATABASE})` : '❌ MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ MISSING');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ SET' : '❌ MISSING');

const CONSTANTS = require('./constants');

// Railway Environment Detection and Smart Configuration
const isRailwayEnvironment = !!(
  process.env.RAILWAY_PRIVATE_DOMAIN || 
  process.env.RAILWAY_PUBLIC_DOMAIN || 
  process.env.RAILWAY_PROJECT_ID
);

console.log('🚂 Railway Environment Detected:', isRailwayEnvironment);

// Railway-Smart Database Configuration (ChatGPT approach)
function getRailwayDatabaseConfig() {
  // Priority: Railway variables first, then custom, then defaults
  const host = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306');
  const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.DB_PASS;
  const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'railway';
  
  // Determine if we're using Railway internal network
  const isUsingRailwayInternal = !!process.env.MYSQLHOST;
  
  console.log(isUsingRailwayInternal ? 
    '✅ Using Railway internal MySQL configuration' : 
    '⚙️ Using external/custom database configuration');
    
  return {
    host,
    port,
    user,
    password,
    database,
    // SSL: false for internal Railway, object for external
    ssl: isUsingRailwayInternal ? false : 
         (process.env.DB_SSL_ENABLED === 'true' || process.env.NODE_ENV === 'production') ? {
           rejectUnauthorized: false // Railway external SSL
         } : false
  };
}

const databaseConfig = getRailwayDatabaseConfig();

// Validate required database configuration
const hasDbHost = databaseConfig.host;
const hasDbUser = databaseConfig.user;
const hasDbName = databaseConfig.database;
const hasDbPass = databaseConfig.password;

// Enhanced validation with Railway-aware messaging
const missingVars = [];
if (!hasDbHost) {
  missingVars.push(isRailwayEnvironment ? 'MYSQLHOST (Railway)' : 'DB_HOST');
}
if (!hasDbUser) {
  missingVars.push(isRailwayEnvironment ? 'MYSQLUSER (Railway)' : 'DB_USER');
}
if (!hasDbName) {
  missingVars.push(isRailwayEnvironment ? 'MYSQLDATABASE (Railway)' : 'DB_NAME');
}
if (!hasDbPass) {
  missingVars.push(isRailwayEnvironment ? 'MYSQLPASSWORD (Railway)' : 'DB_PASS');
}
if (!process.env.JWT_SECRET) missingVars.push('JWT_SECRET');
if (!process.env.SESSION_SECRET) missingVars.push('SESSION_SECRET');

// Check for JWT/SESSION secrets (always required)
const criticalMissing = [];
if (!process.env.JWT_SECRET) criticalMissing.push('JWT_SECRET');
if (!process.env.SESSION_SECRET) criticalMissing.push('SESSION_SECRET');

if (criticalMissing.length > 0) {
  console.error(`❌ Missing critical environment variables: ${criticalMissing.join(', ')}`);
  process.exit(1);
}

// Database is optional - warn but don't exit
if (missingVars.length > 0) {
  console.warn(`⚠️ Database variables missing: ${missingVars.join(', ')}`);
  console.warn('🔄 Starting without database - health endpoints will work');
  if (isRailwayEnvironment) {
    console.warn('🚂 To add database: Add MySQL service in Railway dashboard');
  }
}

// Log the final configuration being used
console.log('🎯 Final Database Configuration:');
console.log('Host:', databaseConfig.host);
console.log('Port:', databaseConfig.port);
console.log('User:', databaseConfig.user);
console.log('Database:', databaseConfig.database);
console.log('SSL Enabled:', !!databaseConfig.ssl);
console.log('Environment:', isRailwayEnvironment ? 'Railway' : 'Custom');

module.exports = {
  // Smart Database Configuration (Railway-aware)
  database: {
    host: databaseConfig.host,
    port: parseInt(databaseConfig.port),
    user: databaseConfig.user,
    password: databaseConfig.password,
    database: databaseConfig.database,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || CONSTANTS.DATABASE.DEFAULT_CONNECTION_LIMIT),
    waitForConnections: true,
    queueLimit: 0,
    // Smart SSL Configuration
    ssl: databaseConfig.ssl ? (typeof databaseConfig.ssl === 'boolean' ? 
      databaseConfig.ssl : {
        rejectUnauthorized: false // Railway certificates are managed
      }) : false,
    // Connection settings for MySQL2
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || CONSTANTS.DATABASE.ACQUIRE_TIMEOUT)
  },
  
  // Server configuration
  server: {
    port: parseInt(process.env.API_PORT || CONSTANTS.API.DEFAULT_PORT),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  
  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || CONSTANTS.AUTH.BCRYPT_ROUNDS)
  },
  
  // Feature flags
  features: {
    enableQcVerification: process.env.ENABLE_QC_VERIFICATION === 'true',
    enableSealTracking: process.env.ENABLE_SEAL_TRACKING === 'true',
    enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true'
  },
  
  // External services
  services: {
    emailHost: process.env.EMAIL_HOST,
    emailPort: parseInt(process.env.EMAIL_PORT || CONSTANTS.EMAIL.DEFAULT_PORT),
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    emailFrom: process.env.EMAIL_FROM || CONSTANTS.EMAIL.DEFAULT_FROM
  }
};