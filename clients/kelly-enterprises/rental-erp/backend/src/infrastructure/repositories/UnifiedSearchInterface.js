/**
 * UNIFIED SEARCH INTERFACE DESIGN
 * Standardized search patterns for all entities in the Fire-Proof ERP system
 * 
 * DESIGN PRINCIPLES:
 * 1. Auto-detect identifier type and route to appropriate method
 * 2. Consistent method names across all repositories
 * 3. Backward compatibility during migration
 * 4. Type-safe parameter validation
 * 5. Performance-optimized routing
 */

const logger = require('../utils/logger');

/**
 * Identifier Type Detection and Routing
 */
class IdentifierRouter {
  /**
   * Detect identifier type based on format and context
   * @param {string|number} identifier - The identifier to analyze
   * @param {Object} entity - Entity configuration
   * @returns {Object} Routing decision
   */
  static analyzeIdentifier(identifier, entity) {
    const analysis = {
      value: identifier,
      type: null,
      method: null,
      confidence: 0
    };

    // Convert to string for analysis
    const strValue = String(identifier).trim();
    
    // 1. NUMERIC PRIMARY KEY DETECTION
    if (/^\d+$/.test(strValue) && !entity.numericBusinessIds) {
      analysis.type = 'primary_key';
      analysis.method = 'findByPrimaryKey';
      analysis.confidence = 0.95;
      return analysis;
    }

    // 2. EMAIL IDENTIFIER DETECTION
    if (strValue.includes('@') && entity.hasEmailIdentifier) {
      analysis.type = 'email';
      analysis.method = 'findByEmail';
      analysis.confidence = 0.99;
      return analysis;
    }

    // 3. BUSINESS IDENTIFIER PATTERNS
    if (entity.businessIdPatterns) {
      for (const pattern of entity.businessIdPatterns) {
        if (pattern.regex.test(strValue)) {
          analysis.type = 'business_id';
          analysis.method = pattern.method;
          analysis.confidence = pattern.confidence || 0.90;
          return analysis;
        }
      }
    }

    // 4. DEFAULT TO BUSINESS IDENTIFIER
    analysis.type = 'business_id';
    analysis.method = 'findByBusinessId';
    analysis.confidence = 0.70;
    
    return analysis;
  }
}

/**
 * Entity Configuration Registry
 * Defines search patterns for each entity type
 */
class EntityConfigRegistry {
  static configs = {
    gauge: {
      primaryKey: 'id',
      businessIdColumns: ['gauge_id'],
      businessIdPatterns: [
        {
          name: 'gauge_id',
          regex: /^[A-Z]{2,3}\d{4}[AB]?$/,  // AC0002, SP0001A, NPT0010 patterns
          method: 'findByGaugeId',
          confidence: 0.95
        }
      ],
      hasEmailIdentifier: false,
      numericBusinessIds: false
    },

    user: {
      primaryKey: 'id',
      businessIdColumns: ['email', 'username'],
      businessIdPatterns: [
        {
          name: 'username',
          regex: /^[a-zA-Z0-9_]+$/,
          method: 'findByUsername',
          confidence: 0.80
        }
      ],
      hasEmailIdentifier: true,
      numericBusinessIds: false
    },

    rejection_reason: {
      primaryKey: 'id',
      businessIdColumns: ['code'],
      businessIdPatterns: [
        {
          name: 'reason_code',
          regex: /^[A-Z_]+$/,
          method: 'findByCode',
          confidence: 0.90
        }
      ],
      hasEmailIdentifier: false,
      numericBusinessIds: false
    },

    transfer: {
      primaryKey: 'id',
      businessIdColumns: [],
      businessIdPatterns: [],
      hasEmailIdentifier: false,
      numericBusinessIds: false
    }
  };

  static getConfig(entityType) {
    return this.configs[entityType] || {
      primaryKey: 'id',
      businessIdColumns: [],
      businessIdPatterns: [],
      hasEmailIdentifier: false,
      numericBusinessIds: false
    };
  }
}

/**
 * Unified Search Mixin
 * Adds standardized search methods to any repository
 */
class UnifiedSearchMixin {
  /**
   * Initialize unified search for an entity
   * @param {string} entityType - Type of entity (gauge, user, etc.)
   */
  initUnifiedSearch(entityType) {
    this.entityType = entityType;
    this.entityConfig = EntityConfigRegistry.getConfig(entityType);
  }

  /**
   * UNIVERSAL FIND METHOD
   * Auto-detects identifier type and routes to appropriate method
   * @param {string|number} identifier - Any valid identifier for this entity
   * @param {Object} options - Search options
   * @returns {Promise<Object|null>} Found entity or null
   */
  async find(identifier, options = {}) {
    const routing = IdentifierRouter.analyzeIdentifier(identifier, this.entityConfig);
    
    logger.debug('Unified search routing', {
      identifier,
      entityType: this.entityType,
      routing
    });

    // Route to appropriate method
    try {
      switch (routing.method) {
        case 'findByPrimaryKey':
          return await this.findByPrimaryKey(parseInt(identifier), options.connection);
          
        case 'findByEmail':
          return await this.findByEmail(identifier, options.connection);
          
        case 'findByGaugeId':
          return await this.findByGaugeId(identifier, options.connection);
          
        case 'findByUsername':
          return await this.findByUsername(identifier, options.connection);
          
        case 'findByCode':
          return await this.findByCode(identifier, options.connection);
          
        case 'findByBusinessId':
        default:
          return await this.findByBusinessId(identifier, options.connection);
      }
    } catch (error) {
      logger.error('Unified search failed', {
        identifier,
        entityType: this.entityType,
        routing,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * BACKWARDS COMPATIBILITY WRAPPER
   * Maps old method names to new unified search
   */
  async findById(id, conn) {
    return this.find(id, { connection: conn });
  }

  /**
   * ENTITY-SPECIFIC WRAPPERS
   * Provides entity-specific method names that route to unified search
   */
  async getGaugeById(id, conn) {
    if (this.entityType !== 'gauge') {
      throw new Error('getGaugeById can only be called on gauge repositories');
    }
    return this.find(id, { connection: conn });
  }

  async getUserById(id, conn) {
    if (this.entityType !== 'user') {
      throw new Error('getUserById can only be called on user repositories');
    }
    return this.find(id, { connection: conn });
  }

  // ... more entity-specific wrappers as needed
}

/**
 * IMPLEMENTATION STRATEGY:
 * 
 * 1. PHASE 1 - Add mixin to BaseRepository
 * 2. PHASE 2 - Implement entity-specific methods in each repository
 * 3. PHASE 3 - Update services to use unified methods
 * 4. PHASE 4 - Deprecate old methods (but keep for compatibility)
 * 5. PHASE 5 - Remove deprecated methods after full migration
 */

module.exports = {
  IdentifierRouter,
  EntityConfigRegistry,
  UnifiedSearchMixin
};