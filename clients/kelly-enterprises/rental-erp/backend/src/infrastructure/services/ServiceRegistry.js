/**
 * Service Registry Pattern
 * Provides dependency injection for cross-module communication
 * without direct imports, maintaining module independence
 */
class ServiceRegistry {
  constructor() {
    this.services = new Map();
  }

  /**
   * Register a service with a key
   * @param {string} key - Service identifier
   * @param {Object} service - Service instance
   */
  register(key, service) {
    if (!key || !service) {
      throw new Error('Service key and instance are required');
    }
    this.services.set(key, service);
  }

  /**
   * Get a registered service
   * @param {string} key - Service identifier
   * @returns {Object} Service instance
   */
  get(key) {
    if (!this.services.has(key)) {
      throw new Error(`Service '${key}' not found in registry`);
    }
    return this.services.get(key);
  }

  /**
   * Check if a service is registered
   * @param {string} key - Service identifier
   * @returns {boolean}
   */
  has(key) {
    return this.services.has(key);
  }

  /**
   * Get all registered service keys
   * @returns {string[]}
   */
  getKeys() {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all registered services
   */
  clear() {
    this.services.clear();
  }
}

// Create singleton instance
const serviceRegistry = new ServiceRegistry();

module.exports = serviceRegistry;