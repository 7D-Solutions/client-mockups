/**
 * GaugeSetRepository
 *
 * Data access layer for gauge set operations with explicit transaction support.
 * Implements the Repository Pattern with transactional consistency guarantees.
 *
 * Key Architectural Decisions:
 * - ADR-002: Explicit Transaction Pattern (all write methods require connection)
 * - ADR-005: FOR UPDATE locks with REPEATABLE READ isolation
 * - ADR-003: Application-layer bidirectional linking (no database triggers)
 *
 * Transaction Requirements:
 * - All write operations MUST be wrapped in transactions
 * - Caller is responsible for transaction management (BEGIN, COMMIT, ROLLBACK)
 * - Connection parameter MUST be provided for all write methods
 *
 * Reference: UNIFIED_IMPLEMENTATION_PLAN.md Phase 3
 */

const GaugeEntity = require('../domain/GaugeEntity');
const GaugeSet = require('../domain/GaugeSet');
const GaugeSetSQLBuilder = require('../mappers/GaugeSetSQLBuilder');

class GaugeSetRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Private helper: Validate transaction connection requirement (ADR-002)
   */
  _validateConnection(connection, methodName) {
    if (!connection) {
      throw new Error(
        `Connection required for ${methodName} (ADR-002: Explicit Transaction Pattern)`
      );
    }
  }

  /**
   * Private helper: Insert gauge record into database
   */
  async _insertGaugeRecord(connection, gaugeData) {
    const { sql, params } = GaugeSetSQLBuilder.buildGaugeInsert(gaugeData);
    const [result] = await connection.execute(sql, params);
    return result.insertId;
  }

  /**
   * Private helper: Insert thread specifications for a gauge
   */
  async _insertThreadSpecifications(connection, gaugeId, specs, isGoGauge) {
    if (!specs) return;

    const { sql, params } = GaugeSetSQLBuilder.buildThreadSpecInsert(
      gaugeId,
      specs,
      isGoGauge
    );
    await connection.execute(sql, params);
  }

  /**
   * Create gauge set (GO and NO GO gauges) within transaction (ADR-002)
   * @param {Connection} connection - Transaction connection (required)
   * @param {GaugeSet} gaugeSet - Domain model gauge set
   * @returns {Promise<{goGaugeId: number, noGoGaugeId: number}>} Created gauge IDs
   */
  async createGaugeSetWithinTransaction(connection, gaugeSet) {
    this._validateConnection(connection, 'createGaugeSetWithinTransaction');

    // Validate domain model
    if (!(gaugeSet instanceof GaugeSet)) {
      throw new Error('gaugeSet must be an instance of GaugeSet domain model');
    }

    // Convert domain model to database format
    const dbFormat = gaugeSet.toDatabase();

    // Insert GO gauge and specifications
    const goGaugeId = await this._insertGaugeRecord(connection, dbFormat.goGauge);
    const goSpecs = gaugeSet.goGauge.toThreadSpecifications();
    await this._insertThreadSpecifications(connection, goGaugeId, goSpecs, true); // true = GO gauge

    // Insert NO GO gauge and specifications
    const noGoGaugeId = await this._insertGaugeRecord(connection, dbFormat.noGoGauge);
    const noGoSpecs = gaugeSet.noGoGauge.toThreadSpecifications();
    await this._insertThreadSpecifications(connection, noGoGaugeId, noGoSpecs, false); // false = NO-GO gauge

    return { goGaugeId, noGoGaugeId };
  }

  /**
   * Link gauges into a set by assigning set_id (ADR-002, ADR-005)
   * @param {Connection} connection - Transaction connection (required)
   * @param {number} goGaugeId - GO gauge ID
   * @param {number} noGoGaugeId - NO GO gauge ID
   * @param {string} setId - Set identifier to assign
   * @returns {Promise<void>}
   */
  async linkGaugesIntoSetWithinTransaction(connection, goGaugeId, noGoGaugeId, setId) {
    this._validateConnection(connection, 'linkGaugesIntoSetWithinTransaction');

    // Validate parameters
    if (!goGaugeId || !noGoGaugeId || !setId) {
      throw new Error('goGaugeId, noGoGaugeId, and setId are required');
    }

    // Lock both gauges for update (ADR-005: FOR UPDATE locks)
    await connection.execute(
      'SELECT id FROM gauges WHERE id IN (?, ?) FOR UPDATE',
      [goGaugeId, noGoGaugeId]
    );

    // Assign set_id to both gauges
    await connection.execute(
      'UPDATE gauges SET set_id = ? WHERE id IN (?, ?)',
      [setId, goGaugeId, noGoGaugeId]
    );
  }

  /**
   * Unlink gauges from set within transaction (ADR-002)
   * Clears set_id for all gauges in the set
   * @param {Connection} connection - Transaction connection (required)
   * @param {number} gaugeId - Gauge ID to unlink (will unlink entire set)
   * @returns {Promise<void>}
   */
  async unlinkGaugesFromSetWithinTransaction(connection, gaugeId) {
    this._validateConnection(connection, 'unlinkGaugesFromSetWithinTransaction');

    if (!gaugeId) {
      throw new Error('gaugeId is required');
    }

    // Get set_id before unlinking
    const [rows] = await connection.execute(
      'SELECT set_id FROM gauges WHERE id = ? FOR UPDATE',
      [gaugeId]
    );

    if (rows.length === 0) {
      throw new Error(`Gauge with ID ${gaugeId} not found`);
    }

    const setId = rows[0].set_id;

    if (!setId) {
      // Gauge is not part of a set, nothing to unlink
      return;
    }

    // Unlink ALL gauges in this set (clear set_id for all gauges with this set_id)
    await connection.execute(
      'UPDATE gauges SET set_id = NULL WHERE set_id = ?',
      [setId]
    );
  }

  /**
   * Link companions (GO + NO GO gauges) into a set (alias for linkGaugesIntoSetWithinTransaction)
   * @param {Connection} connection - Transaction connection (required)
   * @param {number} goGaugeId - GO gauge ID
   * @param {number} noGoGaugeId - NO GO gauge ID
   * @param {string} setId - Set identifier to assign
   * @returns {Promise<void>}
   */
  async linkCompanionsWithinTransaction(connection, goGaugeId, noGoGaugeId, setId) {
    return this.linkGaugesIntoSetWithinTransaction(connection, goGaugeId, noGoGaugeId, setId);
  }

  /**
   * Find spare gauges (not in a set) by category and suffix
   * @param {number} categoryId - Category ID
   * @param {string} suffix - 'A' (GO) or 'B' (NO GO)
   * @param {string} [status='available'] - Status filter
   * @returns {Promise<GaugeEntity[]>} Spare gauge entities
   */
  async findSpareGauges(categoryId, suffix, status = 'available') {
    const sql = GaugeSetSQLBuilder.buildGaugeSelect({
      whereClause: `g.category_id = ?
        AND g.gauge_suffix = ?
        AND g.set_id IS NULL
        AND g.equipment_type = 'thread_gauge'
        AND g.status = ?
        AND g.is_active = 1
        AND g.is_deleted = 0`,
      orderBy: 'g.gauge_id'
    });

    const [rows] = await this.pool.execute(sql, [categoryId, suffix, status]);
    return rows.map(row => new GaugeEntity(row));
  }

  /**
   * Get gauge set by base ID (retrieves both GO and NO GO gauges)
   * @param {string} baseId - Base gauge ID (without A/B suffix)
   * @returns {Promise<{goGauge: GaugeEntity|null, noGoGauge: GaugeEntity|null, category: object|null}>}
   */
  async getGaugeSetByBaseId(baseId) {
    const sql = GaugeSetSQLBuilder.buildGaugeSelect({
      whereClause: `g.gauge_id IN (?, ?)
        AND g.equipment_type = 'thread_gauge'
        AND g.is_active = 1
        AND g.is_deleted = 0`,
      includeCategory: true
    });

    const [rows] = await this.pool.execute(sql, [`${baseId}A`, `${baseId}B`]);

    let goGauge = null;
    let noGoGauge = null;
    let category = null;

    for (const row of rows) {
      const gaugeEntity = new GaugeEntity(row);

      if (row.gauge_suffix === 'A') {
        goGauge = gaugeEntity;
      } else if (row.gauge_suffix === 'B') {
        noGoGauge = gaugeEntity;
      }

      // Extract category (same for both gauges)
      if (row.cat_id) {
        category = {
          id: row.cat_id,
          name: row.cat_name
        };
      }
    }

    return { goGauge, noGoGauge, category };
  }

  /**
   * Get gauge by ID with optional FOR UPDATE lock
   * @param {number} gaugeId - Gauge ID
   * @param {Connection} [connection] - Optional connection (enables FOR UPDATE lock)
   * @returns {Promise<GaugeEntity|null>}
   */
  async getGaugeById(gaugeId, connection = null) {
    const conn = connection || this.pool;

    const sql = GaugeSetSQLBuilder.buildGaugeSelect({
      whereClause: 'g.id = ?',
      forUpdate: !!connection
    });

    const [rows] = await conn.execute(sql, [gaugeId]);

    if (rows.length === 0) {
      return null;
    }

    return new GaugeEntity(rows[0]);
  }

  /**
   * Create audit record for gauge set operation (ADR-002)
   * Inserts into companion_history table (historical table name retained for legacy compatibility)
   * @param {Connection} connection - Transaction connection
   * @param {number} goGaugeId - GO gauge ID
   * @param {number} noGoGaugeId - NO GO gauge ID
   * @param {string} action - Action: created_together, paired_from_spares, replaced, unpaired
   * @param {number} performedBy - User ID
   * @param {string} [reason] - Optional reason
   * @param {object} [metadata] - Optional metadata
   * @returns {Promise<number>} History record ID
   */
  async createSetHistory(connection, goGaugeId, noGoGaugeId, action, performedBy, reason = null, metadata = null) {
    this._validateConnection(connection, 'createSetHistory');

    const [result] = await connection.execute(
      `INSERT INTO companion_history (
        go_gauge_id,
        nogo_gauge_id,
        action,
        performed_by,
        reason,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        goGaugeId,
        noGoGaugeId,
        action,
        performedBy,
        reason,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return result.insertId;
  }

  /**
   * Unpair gauges (clear set_id) (ADR-002)
   * @param {Connection} connection - Transaction connection
   * @param {number} gaugeId1 - First gauge ID
   * @param {number} gaugeId2 - Second gauge ID
   * @returns {Promise<void>}
   */
  async unpairGauges(connection, gaugeId1, gaugeId2) {
    this._validateConnection(connection, 'unpairGauges');

    // When unpairing, clear set_id to return gauges to unpaired state
    // Note: gauge_id (serial number) remains unchanged
    await connection.execute(
      'UPDATE gauges SET set_id = NULL WHERE id IN (?, ?)',
      [gaugeId1, gaugeId2]
    );
  }

  /**
   * Update gauge storage location - DEPRECATED
   * Location updates should use the inventory movement system via MovementService
   * @deprecated Use MovementService.moveItem() instead
   * @param {Connection} connection - Transaction connection
   * @param {number} gaugeId - Gauge ID
   * @param {string} location - New storage location
   * @returns {Promise<void>}
   */
  async updateLocation(connection, gaugeId, location) {
    throw new Error('updateLocation is deprecated. Use MovementService.moveItem() instead to update gauge locations.');
  }

  /**
   * Update gauge status (ADR-002)
   * @param {Connection} connection - Transaction connection
   * @param {number} gaugeId - Gauge ID
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async updateStatus(connection, gaugeId, status) {
    this._validateConnection(connection, 'updateStatus');

    await connection.execute(
      'UPDATE gauges SET status = ? WHERE id = ?',
      [status, gaugeId]
    );
  }

  /**
   * Get other gauge in the set for a given gauge (using set_id)
   * Returns the GO or NO-GO counterpart in the same gauge set
   * @param {number} gaugeId - Gauge ID
   * @param {Connection} [connection] - Optional connection (enables FOR UPDATE lock)
   * @returns {Promise<GaugeEntity|null>} Other gauge in set or null if not paired
   */
  async getSetMemberGauge(gaugeId, connection = null) {
    const conn = connection || this.pool;

    const sql = `
      SELECT g2.*, s.thread_size, s.thread_class, s.thread_type
      FROM gauges g1
      JOIN gauges g2 ON g1.set_id = g2.set_id AND g2.id != g1.id
      LEFT JOIN gauge_thread_specifications s ON g2.id = s.gauge_id
      WHERE g1.id = ? AND g1.set_id IS NOT NULL
      ${connection ? 'FOR UPDATE' : ''}
    `;

    const [rows] = await conn.execute(sql, [gaugeId]);

    if (rows.length === 0) {
      return null;
    }

    return new GaugeEntity(rows[0]);
  }

  /**
   * Soft delete gauge (set is_deleted = 1) (ADR-002)
   * @param {Connection} connection - Transaction connection
   * @param {number} gaugeId - Gauge ID
   * @returns {Promise<void>}
   */
  async softDeleteGauge(connection, gaugeId) {
    this._validateConnection(connection, 'softDeleteGauge');

    await connection.execute(
      'UPDATE gauges SET is_deleted = 1 WHERE id = ?',
      [gaugeId]
    );
  }
}

module.exports = GaugeSetRepository;
