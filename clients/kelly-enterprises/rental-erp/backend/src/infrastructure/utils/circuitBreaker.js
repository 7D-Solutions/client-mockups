const EventEmitter = require('events');

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration with defaults from prompt
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 10;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 1 minute
    this.expectedResponseTime = options.expectedResponseTime || 1000; // 1 second
    this.volumeThreshold = options.volumeThreshold || 20; // Minimum requests before opening
    
    // State management
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
    
    // Metrics
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      responseTimes: [],
      stateChanges: [],
      lastStateChange: Date.now()
    };
    
    // Rolling window for monitoring
    this.rollingWindow = [];
    this.startRollingWindowCleanup();
  }

  async execute(operation, fallback = null) {
    this.metrics.totalRequests++;
    
    // Check if circuit should be open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.emit('rejected', { name: this.name, state: this.state });
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
      // Time to try half-open
      this.halfOpen();
    }
    
    const startTime = Date.now();
    
    try {
      // Execute the operation with timeout
      const result = await this.executeWithTimeout(operation, this.expectedResponseTime * 3);
      const responseTime = Date.now() - startTime;
      
      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error, responseTime);
      
      if (fallback && this.state === 'OPEN') {
        return await fallback();
      }
      throw error;
    }
  }

  async executeWithTimeout(operation, timeout) {
    return Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => {
          this.metrics.totalTimeouts++;
          reject(new Error(`Operation timeout after ${timeout}ms`));
        }, timeout)
      )
    ]);
  }

  onSuccess(responseTime) {
    this.failures = 0;
    this.successes++;
    this.consecutiveSuccesses++;
    this.metrics.totalSuccesses++;
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only last 100 response times
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    this.recordMetric('success', responseTime);
    
    if (this.state === 'HALF_OPEN') {
      if (this.consecutiveSuccesses >= this.failureThreshold / 2) {
        this.close();
      }
    }
    
    this.emit('success', { 
      name: this.name, 
      state: this.state, 
      responseTime 
    });
  }

  onFailure(error, responseTime) {
    this.failures++;
    this.successes = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();
    this.metrics.totalFailures++;
    
    this.recordMetric('failure', responseTime);
    
    if (this.state === 'HALF_OPEN') {
      this.open();
    } else if (this.state === 'CLOSED') {
      const recentMetrics = this.getRecentMetrics();
      const failureRate = this.calculateFailureRate(recentMetrics);
      const totalRequests = recentMetrics.length;
      
      // Open circuit if failure threshold reached and minimum volume met
      if (failureRate * 100 >= this.failureThreshold && totalRequests >= this.volumeThreshold) {
        this.open();
      }
    }
    
    this.emit('failure', { 
      name: this.name, 
      state: this.state, 
      error: error.message,
      responseTime 
    });
  }

  open() {
    if (this.state !== 'OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      this.metrics.stateChanges.push({
        from: this.state,
        to: 'OPEN',
        timestamp: Date.now(),
        reason: `Failure threshold reached (${this.failures} failures)`
      });
      this.metrics.lastStateChange = Date.now();
      
      this.emit('open', { 
        name: this.name, 
        nextAttempt: new Date(this.nextAttempt) 
      });
    }
  }

  close() {
    if (this.state !== 'CLOSED') {
      const previousState = this.state;
      this.state = 'CLOSED';
      this.failures = 0;
      this.nextAttempt = Date.now();
      this.metrics.stateChanges.push({
        from: previousState,
        to: 'CLOSED',
        timestamp: Date.now(),
        reason: 'Circuit recovered'
      });
      this.metrics.lastStateChange = Date.now();
      
      this.emit('close', { name: this.name });
    }
  }

  halfOpen() {
    if (this.state !== 'HALF_OPEN') {
      this.state = 'HALF_OPEN';
      this.consecutiveSuccesses = 0;
      this.metrics.stateChanges.push({
        from: 'OPEN',
        to: 'HALF_OPEN',
        timestamp: Date.now(),
        reason: 'Testing recovery'
      });
      this.metrics.lastStateChange = Date.now();
      
      this.emit('half-open', { name: this.name });
    }
  }

  recordMetric(type, responseTime) {
    this.rollingWindow.push({
      type,
      responseTime,
      timestamp: Date.now()
    });
  }

  getRecentMetrics() {
    const cutoff = Date.now() - this.monitoringPeriod;
    return this.rollingWindow.filter(metric => metric.timestamp >= cutoff);
  }

  calculateFailureRate(metrics) {
    if (metrics.length === 0) return 0;
    const failures = metrics.filter(m => m.type === 'failure').length;
    return failures / metrics.length;
  }

  startRollingWindowCleanup() {
    // Clean up old metrics every minute
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - this.monitoringPeriod * 2;
      this.rollingWindow = this.rollingWindow.filter(
        metric => metric.timestamp >= cutoff
      );
    }, 60000);
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  getStatus() {
    const recentMetrics = this.getRecentMetrics();
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    return {
      name: this.name,
      state: this.state,
      metrics: {
        ...this.metrics,
        failureRate: this.calculateFailureRate(recentMetrics),
        avgResponseTime: Math.round(avgResponseTime),
        recentRequests: recentMetrics.length
      },
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt) : null,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime) : null
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
    this.rollingWindow = [];
    
    this.emit('reset', { name: this.name });
  }
}

// Factory for creating circuit breakers
class CircuitBreakerFactory {
  constructor() {
    this.breakers = new Map();
  }

  create(name, options = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({ name, ...options });
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name);
  }

  get(name) {
    return this.breakers.get(name);
  }

  getAll() {
    return Array.from(this.breakers.values());
  }

  getStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  reset(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }

  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Create singleton factory
const factory = new CircuitBreakerFactory();

// Pre-configured circuit breakers for different operations
const circuitBreakers = {
  // Database read operations
  dbRead: factory.create('db-read', {
    failureThreshold: 20, // 20% failure rate
    resetTimeout: 20000, // 20 seconds
    expectedResponseTime: 500 // 500ms
  }),

  // Database write operations
  dbWrite: factory.create('db-write', {
    failureThreshold: 10, // 10% failure rate (more sensitive)
    resetTimeout: 30000, // 30 seconds
    expectedResponseTime: 1000 // 1 second
  }),

  // Critical operations (gauge checkout/return)
  critical: factory.create('critical', {
    failureThreshold: 5, // 5% failure rate (very sensitive)
    resetTimeout: 60000, // 1 minute
    expectedResponseTime: 2000 // 2 seconds
  }),

  // External API calls
  external: factory.create('external', {
    failureThreshold: 30, // 30% failure rate (more tolerant)
    resetTimeout: 15000, // 15 seconds
    expectedResponseTime: 5000 // 5 seconds
  })
};

module.exports = {
  CircuitBreaker,
  CircuitBreakerFactory,
  factory,
  circuitBreakers
};