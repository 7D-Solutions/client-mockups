/**
 * UNIFIED REPOSITORY INTERFACE - PRODUCTION ARCHITECTURE
 * Clean, standardized search patterns for all entities
 * 
 * ZERO BACKWARDS COMPATIBILITY - Clean slate approach
 */

const logger = require('../utils/logger');

/**
 * Intelligent Identifier Router
 * Analyzes any identifier and determines the optimal search strategy
 */
class IdentifierRouter {
  /**
   * Route identifier to appropriate search method
   * @param {string|number} identifier 
   * @param {EntityConfig} config 
   * @returns {SearchRoute}
   */
  static route(identifier, config) {
    const str = String(identifier).trim();
    
    // 1. EMAIL DETECTION (highest priority)
    if (str.includes('@')) {
      return { method: 'findByEmail', value: str, confidence: 0.99 };
    }

    // 2. PURE NUMERIC = PRIMARY KEY
    if (/^\d+$/.test(str)) {
      return { method: 'findByPrimaryKey', value: parseInt(str), confidence: 0.95 };
    }

    // 3. PATTERN MATCHING for business identifiers
    for (const pattern of config.patterns) {
      if (pattern.regex.test(str)) {
        return { method: pattern.method, value: str, confidence: pattern.confidence };
      }
    }

    // 4. DEFAULT: Business identifier search
    return { method: 'findByBusinessIdentifier', value: str, confidence: 0.70 };
  }
}

/**
 * Entity Configuration for different entity types
 */
const ENTITY_CONFIGS = {
  gauge: {
    patterns: [
      { regex: /^[A-Z]{2,3}\d{4}[AB]?$/, method: 'findByGaugeId', confidence: 0.95 }  // GB0004, SP0001A, NPT0010 → gauge_id
    ],
    businessColumns: ['gauge_id'],
    primaryKey: 'id'
  },
  
  user: {
    patterns: [
      { regex: /^[a-zA-Z0-9_]+$/, method: 'findByUsername', confidence: 0.80 }
    ],
    businessColumns: ['username', 'email'],
    primaryKey: 'id'
  },
  
  unseal_request: {
    patterns: [],
    businessColumns: [],
    primaryKey: 'id'
  }
};

/**
 * Universal Repository Interface
 * All repositories MUST implement these methods
 */
class UniversalRepository {
  constructor(tableName, entityType) {
    this.tableName = tableName;
    this.entityType = entityType;
    this.config = ENTITY_CONFIGS[entityType] || { patterns: [], businessColumns: [], primaryKey: 'id' };
  }

  /**
   * SINGLE UNIVERSAL FIND METHOD
   * Handles ANY identifier type automatically
   */
  async find(identifier, connection = null) {
    const route = IdentifierRouter.route(identifier, this.config);
    
    logger.debug('Universal find routing', {
      identifier,
      entityType: this.entityType,
      route
    });

    switch (route.method) {
      case 'findByPrimaryKey':
        return this.findByPrimaryKey(route.value, connection);
      
      case 'findByEmail':
        return this.findByEmail(route.value, connection);
      
      case 'findByGaugeId':
        return this.findByGaugeId(route.value, connection);

      case 'findByUsername':
        return this.findByUsername(route.value, connection);
      
      case 'findByBusinessIdentifier':
      default:
        return this.findByBusinessIdentifier(route.value, connection);
    }
  }

  /**
   * REQUIRED: All repositories must implement these core methods
   */
  async findByPrimaryKey(id, connection) {
    throw new Error(`${this.constructor.name} must implement findByPrimaryKey`);
  }

  async findByBusinessIdentifier(identifier, connection) {
    throw new Error(`${this.constructor.name} must implement findByBusinessIdentifier`);
  }

  // OPTIONAL: Entity-specific methods
  async findByEmail(email, connection) {
    throw new Error(`${this.constructor.name} does not support email search`);
  }

  async findByGaugeId(gaugeId, connection) {
    throw new Error(`${this.constructor.name} does not support gauge_id search`);
  }

  async findByUsername(username, connection) {
    throw new Error(`${this.constructor.name} does not support username search`);
  }
}

module.exports = {
  IdentifierRouter,
  ENTITY_CONFIGS,
  UniversalRepository
};