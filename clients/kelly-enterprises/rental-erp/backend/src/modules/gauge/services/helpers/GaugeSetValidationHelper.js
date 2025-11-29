/**
 * GaugeSetValidationHelper
 *
 * Validation and data retrieval helpers for gauge set operations
 */

class GaugeSetValidationHelper {
  constructor(repository, pool) {
    this.repository = repository;
    this.pool = pool;
  }

  /**
   * Get gauge and validate existence
   */
  async getAndValidateGauge(gaugeId, connection, errorPrefix = 'Gauge') {
    const gauge = await this.repository.getGaugeById(gaugeId, connection);

    if (!gauge) {
      throw new Error(`${errorPrefix} with ID ${gaugeId} not found`);
    }

    return gauge;
  }

  /**
   * Validate gauge is spare (has no companion)
   */
  validateIsSpare(gauge) {
    if (gauge.companionGaugeId) {
      throw new Error(`Gauge ${gauge.systemGaugeId} already has a companion`);
    }
  }

  /**
   * Validate gauge has companion
   */
  validateHasCompanion(gauge) {
    if (!gauge.companionGaugeId) {
      throw new Error(`Gauge ${gauge.systemGaugeId} does not have a companion`);
    }
  }

  /**
   * Get category by ID with fallback
   */
  async getCategory(categoryId, connection) {
    const [categoryRows] = await (connection || this.pool).execute(
      'SELECT id, name FROM gauge_categories WHERE id = ?',
      [categoryId]
    );

    return categoryRows[0] || { id: categoryId, name: 'Unknown' };
  }

  /**
   * Extract base ID from system gauge ID
   * SERIAL NUMBER SYSTEM: systemGaugeId may be null for spare gauges
   */
  extractBaseId(systemGaugeId) {
    if (!systemGaugeId) {
      return null;
    }
    return systemGaugeId.replace(/[AB]$/, '');
  }

  /**
   * Determine GO and NO GO gauges based on suffix
   */
  determineGoNoGo(gaugeA, gaugeB, gaugeAId, gaugeBId) {
    if (gaugeA.suffix === 'A') {
      return {
        goGauge: gaugeA,
        noGoGauge: gaugeB,
        goGaugeId: gaugeAId,
        noGoGaugeId: gaugeBId
      };
    } else {
      return {
        goGauge: gaugeB,
        noGoGauge: gaugeA,
        goGaugeId: gaugeBId,
        noGoGaugeId: gaugeAId
      };
    }
  }
}

module.exports = GaugeSetValidationHelper;
