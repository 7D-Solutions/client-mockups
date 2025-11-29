const BaseService = require('../../../infrastructure/services/BaseService');
const { transformDates, GAUGE_DATE_FIELDS } = require('../../../infrastructure/utils/dateFormatter');
const logger = require('../../../infrastructure/utils/logger');
const GaugeEntity = require('../domain/GaugeEntity');
const GaugeSet = require('../domain/GaugeSet');

/**
 * GaugeQueryService - Focused on search, filtering, and retrieval operations
 * Handles all read operations for gauges with filtering and grouping logic
 */
class GaugeQueryService extends BaseService {
  constructor(gaugeRepository, gaugeQueryRepository, gaugeReferenceRepository, options = {}) {
    super(gaugeRepository, options);
    this.gaugeQueryRepository = gaugeQueryRepository;
    this.gaugeReferenceRepository = gaugeReferenceRepository;
  }

  /**
   * Private helper: Extract gauge array from repository result
   */
  _extractGaugeArray(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.gauges)) return result.gauges;
    return [];
  }

  /**
   * Private helper: Build gauge set response with GO/NO-GO determination and computed status
   * Implements ADDENDUM computed set status (lines 1004-1059)
   */
  _buildGaugeSetResponse(gauge, companion) {
    const GaugeIdService = require('./GaugeIdService');
    const gaugeSuffix = GaugeIdService.getGaugeSuffix(gauge.gauge_id);
    const companionSuffix = GaugeIdService.getGaugeSuffix(companion.gauge_id);

    // Determine GO and NO-GO gauges
    const goGauge = gaugeSuffix === 'A' ? gauge : companion;
    const noGoGauge = gaugeSuffix === 'A' ? companion : gauge;

    // Compute set status using domain model
    try {
      const goEntity = new GaugeEntity(goGauge);
      const noGoEntity = new GaugeEntity(noGoGauge);

      // Create minimal category object (just need name for NPT validation)
      const category = {
        id: goGauge.category_id,
        name: goGauge.category_name || 'Unknown'
      };

      // Extract base ID from gauge_id (remove A/B suffix)
      const baseId = goGauge.gauge_id.slice(0, -1);

      const gaugeSet = new GaugeSet({
        baseId,
        goGauge: goEntity,
        noGoGauge: noGoEntity,
        category
      });

      const computedStatus = gaugeSet.computeSetStatus();
      const computedSealStatus = gaugeSet.computeSealStatus();

      return {
        type: 'set',
        go_gauge: goGauge,
        nogo_gauge: noGoGauge,
        computed_status: computedStatus.status,
        can_checkout: computedStatus.canCheckout,
        status_reason: computedStatus.reason,
        seal_status: computedSealStatus
      };
    } catch (error) {
      // If domain model validation fails, return basic response without computed status
      logger.warn('Failed to compute set status:', { error: error.message, gaugeId: gauge.gauge_id });
      return {
        type: 'set',
        go_gauge: goGauge,
        nogo_gauge: noGoGauge,
        computed_status: 'unknown',
        can_checkout: false,
        status_reason: 'Unable to compute set status',
        seal_status: 'unknown'
      };
    }
  }

  /**
   * Get all gauges (no filtering)
   * @returns {Promise<Array>} All gauges
   */
  async getAllGauges() {
    try {
      return this._extractGaugeArray(await this.gaugeQueryRepository.searchGauges({}));
    } catch (error) {
      logger.error('Error getting all gauges:', error);
      throw error;
    }
  }

  /**
   * Search gauges with criteria
   * @param {Object} criteria - Search criteria (status, equipment_type, category_id, etc.)
   * @returns {Promise<Array>} Matching gauges
   */
  async searchGauges(criteria) {
    try {
      return await this.gaugeQueryRepository.searchGauges(criteria);
    } catch (error) {
      logger.error('Error searching gauges:', error);
      throw error;
    }
  }

  /**
   * Enhanced search with groupBySet functionality (O(1) Map-based)
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Search results, optionally grouped by sets
   */
  async search(criteria) {
    try {
      let results = this._extractGaugeArray(await this.gaugeQueryRepository.searchGauges(criteria));

      // Group thread gauges by set if requested
      if (criteria.groupBySets && criteria.equipment_type === 'thread_gauge') {
        results = this.groupBySet(results);
      }

      // Hide spares from regular users
      if (criteria.userRole === 'viewer' && Array.isArray(results)) {
        results = results.filter(g => !g.is_spare);
      }

      return results;
    } catch (error) {
      logger.error('Error in enhanced search:', error);
      throw error;
    }
  }

  /**
   * Group gauges by base system ID for thread gauge sets (O(1) Map lookups)
   * Includes computed set status (ADDENDUM lines 1004-1059)
   * @param {Array} gauges - Array of gauge objects
   * @returns {Array} Array of gauge sets and standalone gauges with computed status
   */
  groupBySet(gauges) {
    const setMap = new Map();
    const standalone = [];

    gauges.forEach(gauge => {
      if (!gauge.gauge_id) {
        standalone.push(gauge);
        return;
      }

      const GaugeIdService = require('./GaugeIdService');
      const suffix = GaugeIdService.getGaugeSuffix(gauge.gauge_id);

      // Check if gauge has a set_id (part of a set)
      if (gauge.set_id && suffix) {
        const baseId = gauge.set_id;  // Use set_id as the base identifier
        if (!setMap.has(baseId)) {
          setMap.set(baseId, { go: null, nogo: null });
        }

        const set = setMap.get(baseId);
        if (suffix === 'A') set.go = gauge;
        else if (suffix === 'B') set.nogo = gauge;
      } else {
        standalone.push(gauge);
      }
    });

    // Build sets with computed status
    const sets = Array.from(setMap.entries())
      .filter(([_, set]) => set.go && set.nogo)
      .map(([baseId, set]) => {
        try {
          const goEntity = new GaugeEntity(set.go);
          const noGoEntity = new GaugeEntity(set.nogo);

          const category = {
            id: set.go.category_id,
            name: set.go.category_name || 'Unknown'
          };

          const gaugeSet = new GaugeSet({
            baseId,
            goGauge: goEntity,
            noGoGauge: noGoEntity,
            category
          });

          const computedStatus = gaugeSet.computeSetStatus();
          const computedSealStatus = gaugeSet.computeSealStatus();

          return {
            type: 'set',
            gauges: [set.go, set.nogo],
            baseId,
            computed_status: computedStatus.status,
            can_checkout: computedStatus.canCheckout,
            status_reason: computedStatus.reason,
            seal_status: computedSealStatus
          };
        } catch (error) {
          logger.warn('Failed to compute set status for grouped set:', { error: error.message, baseId });
          return {
            type: 'set',
            gauges: [set.go, set.nogo],
            baseId,
            computed_status: 'unknown',
            can_checkout: false,
            status_reason: 'Unable to compute set status',
            seal_status: 'unknown'
          };
        }
      });

    return [...sets, ...standalone.map(g => ({ type: 'single', gauges: [g] }))];
  }

  /**
   * Get available spare gauges with optional filtering
   * @param {Object} options - Filter options (equipment_type, category_id, userRole)
   * @returns {Promise<Array>} Array of spare gauges
   */
  async getSpares(options = {}) {
    try {
      const { equipment_type, category_id, thread_size, thread_class, is_go_gauge, userRole } = options;

      const criteria = {
        equipment_type: equipment_type || 'thread_gauge', // Default to thread gauges
        is_deleted: 0,
        set_id_null: true, // Use the proper repository filter for IS NULL check (spares have no set_id)
        thread_type_exclude: 'npt', // Exclude NPT gauges from spares - they're not typically stocked as individual items
        ...(category_id && { category_id }),
        ...(thread_size && { thread_size }),
        ...(thread_class && { thread_class }),
        ...(is_go_gauge !== undefined && { is_go_gauge })
      };

      let spares = this._extractGaugeArray(await this.gaugeQueryRepository.searchGauges(criteria));

      // Limit viewer details to basic information only
      if (userRole === 'viewer') {
        spares = spares.map(({ id, gauge_id, name, displayName, equipment_type, status, category_id }) =>
          ({ id, gauge_id, name, displayName, equipment_type, status, category_id })
        );
      }

      logger.info('Retrieved spare gauges', {
        equipment_type,
        category_id,
        thread_size,
        thread_class,
        is_go_gauge,
        userRole,
        count: spares.length
      });
      return spares;
    } catch (error) {
      logger.error('Error retrieving spare gauges:', { ...options, error: error.message });
      throw error;
    }
  }

  /**
   * Get active gauges with optional filters
   * @param {Object} filters - Additional filter criteria
   * @returns {Promise<Array>} Active gauges (is_active = 1)
   */
  async getActiveGauges(filters) {
    try {
      return this._extractGaugeArray(await this.gaugeQueryRepository.searchGauges({ ...filters, is_active: 1 }));
    } catch (error) {
      logger.error('Error getting active gauges:', error);
      throw error;
    }
  }

  /**
   * Get gauges checked out by a specific user
   * @param {number} userId - User ID to filter by
   * @returns {Promise<Array>} Gauges currently checked out to this user
   */
  async getUserGauges(userId) {
    try {
      return this._extractGaugeArray(await this.gaugeQueryRepository.searchGauges({ checked_out_by_user_id: userId }));
    } catch (error) {
      logger.error('Error getting user gauges:', error);
      throw error;
    }
  }

  /**
   * Get gauges by status
   * @param {string} status - Status to filter by (available, checked_out, maintenance, etc.)
   * @returns {Promise<Array>} Gauges with the specified status
   */
  async getGaugesByStatus(status) {
    try {
      return this._extractGaugeArray(await this.gaugeQueryRepository.searchGauges({ status }));
    } catch (error) {
      logger.error('Error getting gauges by status:', { status, error });
      throw error;
    }
  }

  /**
   * Get gauge by ID (tries gauge_id then numeric ID)
   * @param {number|string} identifier - Gauge ID or gauge_id
   * @returns {Promise<Object|null>} Gauge with transformed dates
   */
  async getGaugeById(identifier) {
    try {
      const result = await this.repository.getGaugeByGaugeId(identifier) ||
                     await this.repository.getGaugeById(identifier);
      return result ? transformDates(result, GAUGE_DATE_FIELDS) : null;
    } catch (error) {
      logger.error('Error finding gauge:', { identifier, error });
      throw error;
    }
  }

  /**
   * Alias for getGaugeById (backwards compatibility)
   * @param {string} gaugeId - Gauge identifier
   * @returns {Promise<Object|null>} Gauge with transformed dates
   */
  async getGaugeByGaugeId(gaugeId) {
    return this.getGaugeById(gaugeId);
  }

  /**
   * Get dashboard summary data
   * @returns {Promise<Object>} Dashboard summary
   */
  async getDashboardSummary() {
    try {
      const ReportsRepository = require('../repositories/ReportsRepository');
      const reportsRepo = new ReportsRepository();
      return await reportsRepo.getDashboardSummary();
    } catch (error) {
      logger.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get gauge set information
   * @param {string} gaugeId - System gauge ID
   * @returns {Promise<Object|null>} Gauge set information
   */
  async getGaugeSet(gaugeId) {
    try {
      const gauge = await this.getGaugeByGaugeId(gaugeId);
      if (!gauge) return null;

      // If this gauge has a set_id, return the complete set
      if (gauge.set_id) {
        // Find companion by matching set_id
        const companions = this._extractGaugeArray(
          await this.gaugeQueryRepository.searchGauges({ set_id: gauge.set_id })
        );
        const companion = companions.find(g => g.id !== gauge.id);
        if (companion) {
          return this._buildGaugeSetResponse(gauge, companion);
        }
      }

      // Single gauge
      return { type: 'single', gauge };
    } catch (error) {
      logger.error('Error getting gauge set:', { gaugeId, error });
      throw error;
    }
  }

  /**
   * Get lookup data - reference methods delegate to GaugeReferenceRepository
   */

  /** Get all seal status options */
  async getSealStatuses() {
    return await this.gaugeReferenceRepository.getSealStatuses();
  }

  /** Get all manufacturer options */
  async getManufacturers() {
    return await this.gaugeReferenceRepository.getManufacturers();
  }

  /** Get all equipment type options */
  async getEquipmentTypes() {
    return await this.gaugeReferenceRepository.getEquipmentTypes();
  }

  /** Get all gauge status options */
  async getGaugeStatuses() {
    return await this.gaugeReferenceRepository.getGaugeStatuses();
  }

  /**
   * Get categories filtered by equipment type
   * @param {string} equipmentType - Equipment type to filter by
   * @returns {Promise<Array>} Categories for the specified equipment type
   */
  async getCategoriesByEquipmentType(equipmentType) {
    try {
      return await this.gaugeReferenceRepository.getCategoriesByEquipmentType(equipmentType);
    } catch (error) {
      logger.error('Error getting categories by equipment type:', { equipmentType, error });
      throw error;
    }
  }

  /**
   * SERIAL NUMBER SYSTEM: Find gauge by serial number
   * @param {string} serialNumber - Serial number to search for
   * @returns {Promise<Object|null>} Gauge object or null if not found
   */
  async findBySerialNumber(serialNumber) {
    try {
      return await this.repository.findBySerialNumber(serialNumber);
    } catch (error) {
      logger.error('Error finding gauge by serial number:', { serialNumber, error });
      throw error;
    }
  }

  /**
   * SERIAL NUMBER SYSTEM: Find spare thread gauges (gauge_id IS NULL)
   * @param {Object} filters - Optional filters (thread_size, thread_class, gauge_type)
   * @returns {Promise<Array>} Array of spare thread gauges
   */
  async findSpareThreadGauges(filters = {}) {
    try {
      return await this.repository.findSpareThreadGauges(filters);
    } catch (error) {
      logger.error('Error finding spare thread gauges:', { filters, error });
      throw error;
    }
  }

  /**
   * Get distinct manufacturers from gauges table
   * Returns alphabetically sorted list of non-null manufacturer names
   * @returns {Promise<Array<string>>} Array of manufacturer names
   */
  async getDistinctManufacturers() {
    try {
      const { pool } = require('../../../infrastructure/database/connection');
      const [rows] = await pool.query(
        `SELECT DISTINCT manufacturer
         FROM gauges
         WHERE manufacturer IS NOT NULL
           AND manufacturer != ''
           AND is_deleted = 0
         ORDER BY manufacturer ASC`
      );
      return rows.map(row => row.manufacturer);
    } catch (error) {
      logger.error('Error getting distinct manufacturers:', error);
      throw error;
    }
  }
}

module.exports = GaugeQueryService;