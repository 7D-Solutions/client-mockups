/**
 * Application Constants
 * Central location for all magic numbers and constant values
 */

module.exports = {
  // Database Constants
  DATABASE: {
    DEFAULT_PORT: 3307,
    DEFAULT_HOST: '127.0.0.1',
    DEFAULT_CONNECTION_LIMIT: 25,
    ACQUIRE_TIMEOUT: 30000,
    CONNECTION_TIMEOUT: 30000,
    QUERY_TIMEOUT: 15000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
  },

  // API Constants
  API: {
    DEFAULT_PORT: 8000,
    REQUEST_BODY_LIMIT: '1mb',
    JSON_LIMIT: '1mb',
    MAX_QUERY_LIMIT: 100,
    DEFAULT_QUERY_LIMIT: 50
  },

  // Authentication
  AUTH: {
    JWT_EXPIRY: '24h',
    JWT_REFRESH_EXPIRY: '7d',
    BCRYPT_ROUNDS: 12,
    SESSION_TIMEOUT: 3600000, // 1 hour
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_TIME: 900000 // 15 minutes
  },

  // Circuit Breaker
  CIRCUIT_BREAKER: {
    FAILURE_THRESHOLD: 5,
    SUCCESS_THRESHOLD: 3,
    TIMEOUT: 30000,
    RESET_TIMEOUT: 60000,
    MONITORING_PERIOD: 600000 // 10 minutes
  },

  // Health Monitoring
  HEALTH: {
    CHECK_INTERVAL: 30000, // 30 seconds
    HISTORY_LIMIT: 1000,
    ALERT_THRESHOLD: {
      CPU: 80,
      MEMORY: 85,
      DISK: 90,
      ERROR_RATE: 5
    }
  },

  // Gauge Management
  GAUGE: {
    CALIBRATION_WARNING_DAYS: 30,
    DEFAULT_CALIBRATION_FREQUENCY: 365,
    STATUS_UPDATE_INTERVAL: 86400000, // 24 hours
    SEAL_TYPES: ['sealed', 'unsealed'],
    OWNERSHIP_TYPES: ['company', 'employee'],
    SIZE_CLASSIFICATIONS: ['hand_tool', 'large_equipment']
  },

  // Audit System
  AUDIT: {
    LOG_BATCH_SIZE: 100,
    RETENTION_DAYS: 730, // 2 years
    CLEANUP_INTERVAL: 86400000, // 24 hours
    MAX_LOG_SIZE: 5000 // characters
  },

  // Performance
  PERFORMANCE: {
    SLOW_QUERY_THRESHOLD: 1000, // 1 second
    REQUEST_TIMEOUT: 300000, // 5 minutes
    CACHE_TTL: 300000, // 5 minutes
    MAX_CONCURRENT_REQUESTS: 100
  },

  // Email Configuration
  EMAIL: {
    DEFAULT_PORT: 587,
    DEFAULT_FROM: 'noreply@fireproof.com',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000
  },

  // Test Configuration
  TEST: {
    DEFAULT_TIMEOUT: 30000,
    LOAD_TEST_DURATION: 300000, // 5 minutes
    CONCURRENT_USERS: [10, 50, 100],
    TEST_GAUGE_PREFIX: 'TEST-',
    TEST_USER_EMAIL: 'test@fireprooferp.com'
  },

  // Frontend Configuration
  FRONTEND: {
    DEFAULT_PORT: 3000,
    VITE_DEV_PORT: 5173,
    HMR_TIMEOUT: 20000,
    API_BASE_PATH: '/api'
  }
};