const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

/**
 * CalibrationBatchRepository - Database operations for calibration batches
 *
 * Manages calibration_batches and calibration_batch_gauges tables
 * Reference: ADDENDUM lines 1343-1379
 */
class CalibrationBatchRepository extends BaseRepository {
  constructor() {
    super('calibration_batches', 'id');
  }

  /**
   * Create a new calibration batch
   * @param {Object} batchData - Batch creation data
   * @param {Object} connection - Database connection (for transactions)
   * @returns {Promise<Object>} Created batch
   */
  async createBatch(batchData, connection) {
    this._validateConnection(connection, 'createBatch');

    const {
      created_by,
      calibration_type,
      vendor_name = null,
      tracking_number = null,
      status = 'pending_send'
    } = batchData;

    const [result] = await connection.execute(
      `INSERT INTO calibration_batches
       (created_by, calibration_type, vendor_name, tracking_number, status)
       VALUES (?, ?, ?, ?, ?)`,
      [created_by, calibration_type, vendor_name, tracking_number, status]
    );

    return this.findById(result.insertId, connection);
  }

  /**
   * Find batch by ID
   * @param {number} batchId - Batch ID
   * @param {Object} connection - Database connection (optional)
   * @returns {Promise<Object|null>} Batch or null
   */
  async findById(batchId, connection = null) {
    const conn = connection || await this.pool.getConnection();

    try {
      const [rows] = await conn.execute(
        `SELECT * FROM calibration_batches WHERE id = ?`,
        [batchId]
      );

      return rows[0] || null;
    } finally {
      if (!connection) conn.release();
    }
  }

  /**
   * Update batch
   * @param {number} batchId - Batch ID
   * @param {Object} updates - Fields to update
   * @param {Object} connection - Database connection (for transactions)
   * @returns {Promise<Object>} Updated batch
   */
  async updateBatch(batchId, updates, connection) {
    this._validateConnection(connection, 'updateBatch');

    const allowedFields = ['status', 'sent_at', 'completed_at', 'vendor_name', 'tracking_number'];
    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updates[field]);

    await connection.execute(
      `UPDATE calibration_batches SET ${setClause} WHERE id = ?`,
      [...values, batchId]
    );

    return this.findById(batchId, connection);
  }

  /**
   * Add gauge to batch
   * @param {number} batchId - Batch ID
   * @param {number} gaugeId - Gauge ID
   * @param {Object} connection - Database connection (for transactions)
   * @returns {Promise<Object>} Created association
   */
  async addGaugeToBatch(batchId, gaugeId, connection) {
    this._validateConnection(connection, 'addGaugeToBatch');

    const [result] = await connection.execute(
      `INSERT INTO calibration_batch_gauges (batch_id, gauge_id)
       VALUES (?, ?)`,
      [batchId, gaugeId]
    );

    const [rows] = await connection.execute(
      `SELECT * FROM calibration_batch_gauges WHERE id = ?`,
      [result.insertId]
    );

    return rows[0];
  }

  /**
   * Get all gauges in a batch
   * @param {number} batchId - Batch ID
   * @param {Object} connection - Database connection (optional)
   * @returns {Promise<Array>} Gauges in batch
   */
  async getBatchGauges(batchId, connection = null) {
    const conn = connection || await this.pool.getConnection();

    try {
      const [rows] = await conn.execute(
        `SELECT g.*, cbg.added_at as batch_added_at
         FROM gauges g
         INNER JOIN calibration_batch_gauges cbg ON g.id = cbg.gauge_id
         WHERE cbg.batch_id = ?
         ORDER BY cbg.added_at ASC`,
        [batchId]
      );

      return rows;
    } finally {
      if (!connection) conn.release();
    }
  }

  /**
   * Remove gauge from batch (before sending)
   * @param {number} batchId - Batch ID
   * @param {number} gaugeId - Gauge ID
   * @param {Object} connection - Database connection (for transactions)
   * @returns {Promise<void>}
   */
  async removeGaugeFromBatch(batchId, gaugeId, connection) {
    this._validateConnection(connection, 'removeGaugeFromBatch');

    await connection.execute(
      `DELETE FROM calibration_batch_gauges
       WHERE batch_id = ? AND gauge_id = ?`,
      [batchId, gaugeId]
    );
  }

  /**
   * Get batch gauge count
   * @param {number} batchId - Batch ID
   * @param {Object} connection - Database connection (optional)
   * @returns {Promise<number>} Count of gauges
   */
  async getBatchGaugeCount(batchId, connection = null) {
    const conn = connection || await this.pool.getConnection();

    try {
      const [rows] = await conn.execute(
        `SELECT COUNT(*) as count
         FROM calibration_batch_gauges
         WHERE batch_id = ?`,
        [batchId]
      );

      return rows[0].count;
    } finally {
      if (!connection) conn.release();
    }
  }

  /**
   * Find all batches with optional filters
   * @param {Object} filters - Filter options
   * @param {Object} connection - Database connection (optional)
   * @returns {Promise<Array>} Batches
   */
  async findBatches(filters = {}, connection = null) {
    const conn = connection || await this.pool.getConnection();

    try {
      const { status, calibration_type, created_by, limit = 100, offset = 0 } = filters;

      let query = 'SELECT * FROM calibration_batches WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (calibration_type) {
        query += ' AND calibration_type = ?';
        params.push(calibration_type);
      }

      if (created_by) {
        query += ' AND created_by = ?';
        params.push(created_by);
      }

      // MySQL doesn't like placeholders for LIMIT/OFFSET in some cases, use direct insertion
      const safeLimit = parseInt(limit) || 100;
      const safeOffset = parseInt(offset) || 0;
      query += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

      const [rows] = await conn.execute(query, params);
      return rows;
    } finally {
      if (!connection) conn.release();
    }
  }

  /**
   * Check if gauge is in any active batch
   * @param {number} gaugeId - Gauge ID
   * @param {Object} connection - Database connection (optional)
   * @returns {Promise<Object|null>} Active batch or null
   */
  async findActiveGaugeBatch(gaugeId, connection = null) {
    const conn = connection || await this.pool.getConnection();

    try {
      const [rows] = await conn.execute(
        `SELECT cb.*
         FROM calibration_batches cb
         INNER JOIN calibration_batch_gauges cbg ON cb.id = cbg.batch_id
         WHERE cbg.gauge_id = ?
           AND cb.status IN ('pending_send', 'sent')
         LIMIT 1`,
        [gaugeId]
      );

      return rows[0] || null;
    } finally {
      if (!connection) conn.release();
    }
  }

  /**
   * Get batch statistics
   * @param {number} batchId - Batch ID
   * @param {Object} connection - Database connection (optional)
   * @returns {Promise<Object>} Batch statistics
   */
  async getBatchStatistics(batchId, connection = null) {
    const conn = connection || await this.pool.getConnection();

    try {
      const [rows] = await conn.execute(
        `SELECT
           COUNT(*) as total_gauges,
           SUM(CASE WHEN g.status = 'out_for_calibration' THEN 1 ELSE 0 END) as out_for_calibration,
           SUM(CASE WHEN g.status = 'pending_certificate' THEN 1 ELSE 0 END) as pending_certificate,
           SUM(CASE WHEN g.status = 'pending_release' THEN 1 ELSE 0 END) as pending_release,
           SUM(CASE WHEN g.status = 'available' THEN 1 ELSE 0 END) as completed
         FROM calibration_batch_gauges cbg
         INNER JOIN gauges g ON cbg.gauge_id = g.id
         WHERE cbg.batch_id = ?`,
        [batchId]
      );

      return rows[0];
    } finally {
      if (!connection) conn.release();
    }
  }

  /**
   * Validate connection exists (ADR-002 compliance)
   * @param {Object} connection - Database connection
   * @param {string} methodName - Method name for error message
   * @private
   */
  _validateConnection(connection, methodName) {
    if (!connection) {
      throw new Error(`${methodName} requires an explicit database connection (ADR-002)`);
    }
  }
}

module.exports = CalibrationBatchRepository;
