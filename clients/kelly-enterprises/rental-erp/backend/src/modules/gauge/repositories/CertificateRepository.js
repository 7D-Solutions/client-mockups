const connection = require('../../../infrastructure/database/connection');
const logger = require('../../../infrastructure/utils/logger');

/**
 * Certificate Repository
 * Handles database operations for calibration certificates
 */
class CertificateRepository {
  /**
   * Gets the database pool with null check
   */
  getPool() {
    const pool = connection.pool;
    if (!pool) {
      throw new Error('Database pool not available - check database configuration');
    }
    return pool;
  }

  /**
   * Create a new certificate record
   * @param {Object} certificateData - Certificate data
   * @param {Object} connection - Optional database connection for transactions
   */
  async create(certificateData, connection = null) {
    const conn = connection || this.getPool();

    const {
      gauge_id,
      dropbox_path,
      custom_name,
      file_size,
      file_hash = null,
      file_extension,
      uploaded_by,
      is_current = true
    } = certificateData;

    const query = `
      INSERT INTO certificates (
        gauge_id,
        dropbox_path,
        custom_name,
        file_size,
        file_hash,
        file_extension,
        uploaded_by,
        is_current
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await conn.query(query, [
      gauge_id,
      dropbox_path,
      custom_name,
      file_size,
      file_hash,
      file_extension,
      uploaded_by,
      is_current ? 1 : 0
    ]);

    return this.findById(result.insertId, connection);
  }

  /**
   * Find certificate by ID
   * @param {number} id - Certificate ID
   * @param {Object} connection - Optional database connection for transactions
   */
  async findById(id, connection = null) {
    const query = `
      SELECT
        c.*,
        u.name as uploaded_by_username
      FROM certificates c
      LEFT JOIN core_users u ON c.uploaded_by = u.id
      WHERE c.id = ?
    `;

    const conn = connection || this.getPool();
    const [rows] = await conn.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find all certificates for a gauge with optional filters
   * @param {number} gaugeId - Gauge database ID
   * @param {Object} filters - Optional filters (e.g., { is_current: true })
   * @param {Object} connection - Optional database connection for transactions
   */
  async findByGaugeId(gaugeId, filters = {}, connection = null) {
    const conn = connection || this.getPool();

    let query = `
      SELECT
        c.*,
        u.name as uploaded_by_username
      FROM certificates c
      LEFT JOIN core_users u ON c.uploaded_by = u.id
      WHERE c.gauge_id = ?
    `;

    const params = [gaugeId];

    // Add optional filters
    if (filters.is_current !== undefined) {
      query += ` AND c.is_current = ?`;
      params.push(filters.is_current ? 1 : 0);
    }

    query += ` ORDER BY c.uploaded_at DESC`;

    const [rows] = await conn.query(query, params);
    return rows;
  }

  /**
   * Find certificate by Dropbox path
   */
  async findByDropboxPath(dropboxPath) {
    const query = `
      SELECT
        c.*,
        u.name as uploaded_by_username
      FROM certificates c
      LEFT JOIN core_users u ON c.uploaded_by = u.id
      WHERE c.dropbox_path = ?
    `;

    const pool = this.getPool();
    const [rows] = await pool.query(query, [dropboxPath]);
    return rows[0] || null;
  }

  /**
   * Find certificate by file hash and size for duplicate detection
   * @param {number} gaugeId - Gauge ID
   * @param {string} fileHash - SHA256 hash of file
   * @param {number} fileSize - File size in bytes
   * @param {Object} connection - Optional database connection for transactions
   */
  async findByFileHash(gaugeId, fileHash, fileSize, connection = null) {
    const query = `
      SELECT
        c.*,
        u.name as uploaded_by_username
      FROM certificates c
      LEFT JOIN core_users u ON c.uploaded_by = u.id
      WHERE c.gauge_id = ? AND c.file_hash = ? AND c.file_size = ?
      LIMIT 1
    `;

    const conn = connection || this.getPool();
    const [rows] = await conn.query(query, [gaugeId, fileHash, fileSize]);
    return rows[0] || null;
  }

  /**
   * Update certificate fields
   * @param {number} id - Certificate ID
   * @param {Object} updates - Fields to update
   * @param {Object} connection - Optional database connection for transactions
   */
  async update(id, updates, connection = null) {
    const conn = connection || this.getPool();

    const allowedFields = [
      'custom_name',
      'dropbox_path',
      'is_current',
      'superseded_at',
      'superseded_by'
    ];

    const updateFields = [];
    const params = [];

    // Build dynamic update query
    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        updateFields.push(`${field} = ?`);
        params.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(id);

    const query = `
      UPDATE certificates
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await conn.query(query, params);
    return this.findById(id, connection);
  }

  /**
   * Update certificate custom name
   */
  async updateName(id, customName) {
    return this.update(id, { custom_name: customName });
  }

  /**
   * Update certificate Dropbox path
   */
  async updateDropboxPath(id, dropboxPath, connection = null) {
    const query = `
      UPDATE certificates
      SET dropbox_path = ?
      WHERE id = ?
    `;

    const conn = connection || this.getPool();
    await conn.query(query, [dropboxPath, id]);
    return this.findById(id, connection);
  }

  /**
   * Delete certificate record
   * @param {number} id - Certificate ID
   * @param {Object} connection - Optional database connection for transactions
   */
  async delete(id, connection = null) {
    const certificate = await this.findById(id, connection);

    const conn = connection || this.getPool();

    // First, clear any references to this certificate in superseded_by column
    // This prevents foreign key constraint violations
    const clearReferencesQuery = 'UPDATE certificates SET superseded_by = NULL WHERE superseded_by = ?';
    await conn.query(clearReferencesQuery, [id]);

    // Now delete the certificate
    const query = 'DELETE FROM certificates WHERE id = ?';
    await conn.query(query, [id]);

    return certificate;
  }

  /**
   * Delete certificate by ID (alias for delete)
   */
  async deleteById(id) {
    return this.delete(id);
  }

  /**
   * Delete certificate by Dropbox path
   */
  async deleteByDropboxPath(dropboxPath) {
    const certificate = await this.findByDropboxPath(dropboxPath);

    if (certificate) {
      await this.delete(certificate.id);
    }

    return certificate;
  }

  /**
   * Delete all certificates for a gauge
   * Used when deleting a gauge or during cleanup operations
   *
   * @param {number} gaugeId - Gauge internal ID
   * @param {Object} connection - Optional database connection for transactions
   * @returns {Promise<number>} Number of certificates deleted
   */
  async deleteByGaugeId(gaugeId, connection = null) {
    const conn = connection || this.getPool();

    const query = 'DELETE FROM certificates WHERE gauge_id = ?';
    const [result] = await conn.query(query, [gaugeId]);

    logger.info('Deleted all certificates for gauge', {
      gaugeId,
      deletedCount: result.affectedRows
    });

    return result.affectedRows;
  }
}

module.exports = new CertificateRepository();
