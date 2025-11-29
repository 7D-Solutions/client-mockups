/**
 * Retry Handler for Database Operations
 * Implements intelligent retry logic with backoff strategies
 */

const { isRetryableError, getRetryDelay } = require('./errorClassifier');
const logger = require('./logger');

/**
 * Retry configuration for different operation types
 */
const RETRY_CONFIGS = {
  default: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },
  database: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitter: true
  },
  connection: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2.5,
    jitter: true
  },
  critical: {
    maxAttempts: 1,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    jitter: false
  }
};

/**
 * Retry an operation with intelligent backoff
 * @param {Function} operation - The operation to retry
 * @param {Object} options - Retry configuration options
 * @param {string} context - Context for logging
 * @returns {Promise} Result of the operation
 */
async function retryOperation(operation, options = {}, context = 'operation') {
  const config = { ...RETRY_CONFIGS.default, ...options };
  let lastError;
  let attempt = 0;

  while (attempt < config.maxAttempts) {
    attempt++;
    
    try {
      const startTime = Date.now();
      const result = await operation();
      
      // Log successful retry if it wasn't the first attempt
      if (attempt > 1) {
        logger.info('Operation succeeded after retry', {
          context,
          attempt,
          duration: Date.now() - startTime,
          previousErrors: lastError?.message
        });
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        logger.warn('Non-retryable error encountered', {
          context,
          attempt,
          error: error.message,
          errorCode: error.code
        });
        throw error;
      }
      
      // Check if we've exhausted all attempts
      if (attempt >= config.maxAttempts) {
        logger.error('All retry attempts exhausted', {
          context,
          totalAttempts: attempt,
          finalError: error.message,
          errorCode: error.code
        });
        throw error;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, config);
      
      logger.warn('Operation failed, retrying', {
        context,
        attempt,
        maxAttempts: config.maxAttempts,
        error: error.message,
        errorCode: error.code,
        retryDelayMs: delay
      });
      
      // Wait before next attempt
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Retry database operations with database-specific configuration
 * @param {Function} operation - Database operation to retry
 * @param {Object} options - Override options
 * @param {string} context - Context for logging
 * @returns {Promise} Result of the operation
 */
async function retryDatabaseOperation(operation, options = {}, context = 'database') {
  const config = { ...RETRY_CONFIGS.database, ...options };
  return retryOperation(operation, config, context);
}

/**
 * Retry connection operations with connection-specific configuration
 * @param {Function} operation - Connection operation to retry
 * @param {Object} options - Override options
 * @param {string} context - Context for logging
 * @returns {Promise} Result of the operation
 */
async function retryConnectionOperation(operation, options = {}, context = 'connection') {
  const config = { ...RETRY_CONFIGS.connection, ...options };
  return retryOperation(operation, config, context);
}

/**
 * Execute operation with circuit breaker and retry logic
 * @param {Function} operation - Operation to execute
 * @param {Object} circuitBreaker - Circuit breaker instance
 * @param {Object} retryOptions - Retry configuration
 * @param {string} context - Context for logging
 * @returns {Promise} Result of the operation
 */
async function executeWithRetryAndCircuitBreaker(operation, circuitBreaker, retryOptions = {}, context = 'operation') {
  const fallback = () => {
    throw new Error('Circuit breaker is open - service temporarily unavailable');
  };

  const wrappedOperation = async () => {
    return circuitBreaker.execute(operation, fallback);
  };

  return retryOperation(wrappedOperation, retryOptions, context);
}

/**
 * Batch retry operations with error aggregation
 * @param {Array} operations - Array of operations to retry
 * @param {Object} options - Retry configuration
 * @param {boolean} failFast - Whether to fail on first error
 * @returns {Promise<Array>} Results or errors for each operation
 */
async function retryBatch(operations, options = {}, failFast = false) {
  const results = [];
  const errors = [];

  for (let i = 0; i < operations.length; i++) {
    try {
      const result = await retryOperation(operations[i], options, `batch-${i}`);
      results[i] = { success: true, result };
    } catch (error) {
      const errorResult = { success: false, error: error.message, index: i };
      results[i] = errorResult;
      errors.push(errorResult);

      if (failFast) {
        throw new Error(`Batch operation failed at index ${i}: ${error.message}`);
      }
    }
  }

  // Log batch results
  logger.info('Batch retry completed', {
    totalOperations: operations.length,
    successful: results.filter(r => r.success).length,
    failed: errors.length,
    errors: errors.map(e => ({ index: e.index, error: e.error }))
  });

  return results;
}

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current attempt number
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt, config) {
  let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Apply maximum delay limit
  delay = Math.min(delay, config.maxDelay);
  
  // Apply jitter to prevent thundering herd
  if (config.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retryable wrapper for a function
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Retry configuration
 * @param {string} context - Context for logging
 * @returns {Function} Wrapped function with retry logic
 */
function createRetryableFunction(fn, options = {}, context = 'function') {
  return async (...args) => {
    return retryOperation(() => fn(...args), options, context);
  };
}

/**
 * Get retry statistics for monitoring
 * @returns {Object} Retry configuration and statistics
 */
function getRetryStatistics() {
  return {
    configs: RETRY_CONFIGS,
    defaultMaxAttempts: RETRY_CONFIGS.default.maxAttempts,
    supportedStrategies: ['default', 'database', 'connection', 'critical']
  };
}

/**
 * Validate retry configuration
 * @param {Object} config - Configuration to validate
 * @returns {boolean} True if valid
 */
function validateRetryConfig(config) {
  const required = ['maxAttempts', 'baseDelay', 'maxDelay', 'backoffMultiplier'];
  
  for (const key of required) {
    if (typeof config[key] !== 'number' || config[key] < 0) {
      return false;
    }
  }
  
  return config.maxAttempts >= 1 && 
         config.baseDelay <= config.maxDelay &&
         config.backoffMultiplier >= 1;
}

module.exports = {
  retryOperation,
  retryDatabaseOperation,
  retryConnectionOperation,
  executeWithRetryAndCircuitBreaker,
  retryBatch,
  createRetryableFunction,
  getRetryStatistics,
  validateRetryConfig,
  RETRY_CONFIGS
};