/**
 * GaugeSetSQLBuilder
 *
 * Centralized SQL query builder for gauge set operations.
 * Separates SQL construction from repository business logic.
 */

class GaugeSetSQLBuilder {
  /**
   * Common gauge table fields for INSERT operations (excluding created_at which uses UTC_TIMESTAMP())
   */
  static GAUGE_INSERT_FIELDS = [
    'gauge_id',
    'set_id',
    'custom_id',
    'name',
    'equipment_type',
    'category_id',
    'status',
    'is_spare',
    'is_sealed',
    'is_active',
    'is_deleted',
    'created_by',
    'ownership_type',
    'employee_owner_id',
    'purchase_info'
  ];

  /**
   * Common gauge and specification fields for SELECT operations
   */
  static GAUGE_SELECT_FIELDS = [
    'g.id',
    'g.gauge_id',
    'g.set_id',
    'g.custom_id',
    'g.name',
    'g.equipment_type',
    'g.category_id',
    'g.status',
    'g.is_spare',
    'g.is_sealed',
    'g.is_active',
    'g.is_deleted',
    'g.created_by',
    'g.ownership_type',
    'g.employee_owner_id',
    'g.purchase_info',
    's.thread_size',
    's.thread_class',
    's.thread_type'
  ];

  /**
   * Build INSERT SQL and parameters for gauge record
   *
   * @param {Object} gaugeData - Gauge data from domain model
   * @returns {{ sql: string, params: Array }} SQL query and parameters
   */
  static buildGaugeInsert(gaugeData) {
    const placeholders = this.GAUGE_INSERT_FIELDS.map(() => '?').join(', ');
    const fields = this.GAUGE_INSERT_FIELDS.join(', ');

    const sql = `INSERT INTO gauges (${fields}, created_at) VALUES (${placeholders}, UTC_TIMESTAMP())`;

    const params = [
      gaugeData.gauge_id,
      gaugeData.set_id || null,
      gaugeData.custom_id || null,
      gaugeData.name,
      gaugeData.equipment_type,
      gaugeData.category_id,
      gaugeData.status || 'available',
      gaugeData.is_spare || 0,
      gaugeData.is_sealed || 0,
      gaugeData.is_active !== undefined ? gaugeData.is_active : 1,
      gaugeData.is_deleted || 0,
      gaugeData.created_by,
      gaugeData.ownership_type || 'company',
      gaugeData.employee_owner_id || null,
      gaugeData.purchase_info || 'company_issued'
    ];

    return { sql, params };
  }

  /**
   * Build INSERT SQL and parameters for thread specifications
   *
   * @param {number} gaugeId - Database gauge ID
   * @param {Object} specs - Thread specifications
   * @param {boolean} isGoGauge - true for GO gauge, false for NO-GO gauge
   * @returns {{ sql: string, params: Array }} SQL query and parameters
   */
  static buildThreadSpecInsert(gaugeId, specs, isGoGauge) {
    const sql = `INSERT INTO gauge_thread_specifications (
      gauge_id,
      thread_type,
      thread_size,
      thread_form,
      thread_class,
      gauge_type,
      is_go_gauge
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      gaugeId,
      specs.thread_type || null,
      specs.thread_size,
      'UN',  // Default thread form (standard threads)
      specs.thread_class || null,
      isGoGauge ? 'GO' : 'NOGO',  // gauge_type: 'GO' or 'NOGO'
      isGoGauge ? 1 : 0
    ];

    return { sql, params };
  }

  /**
   * Build SELECT SQL for gauge with specifications
   *
   * @param {Object} options - Query options
   * @param {string} [options.whereClause] - WHERE clause
   * @param {string} [options.orderBy] - ORDER BY clause
   * @param {boolean} [options.includeCategory=false] - Include category fields
   * @param {boolean} [options.forUpdate=false] - Add FOR UPDATE lock
   * @returns {string} SQL query
   */
  static buildGaugeSelect(options = {}) {
    const {
      whereClause = '',
      orderBy = '',
      includeCategory = false,
      forUpdate = false
    } = options;

    let fields = this.GAUGE_SELECT_FIELDS.join(',\n        ');

    if (includeCategory) {
      fields += ',\n        c.id as cat_id,\n        c.name as cat_name';
    }

    let sql = `SELECT
        ${fields}
      FROM gauges g
      LEFT JOIN gauge_thread_specifications s ON g.id = s.gauge_id`;

    if (includeCategory) {
      sql += '\n      LEFT JOIN gauge_categories c ON g.category_id = c.id';
    }

    if (whereClause) {
      sql += `\n      WHERE ${whereClause}`;
    }

    if (orderBy) {
      sql += `\n      ORDER BY ${orderBy}`;
    }

    if (forUpdate) {
      sql += '\n      FOR UPDATE';
    }

    return sql;
  }
}

module.exports = GaugeSetSQLBuilder;
