/**
 * FacilityService - Manages facilities (top-level organization)
 *
 * Provides CRUD operations for facilities (companies/organizations).
 * For multi-tenant future support.
 */

const { getPool } = require('../database/connection');

class FacilityService {
  /**
   * Get all facilities
   * @param {Object} options - Query options
   * @param {boolean} options.includeInactive - Include inactive facilities
   * @returns {Promise<Array>} List of facilities
   */
  async getFacilities({ includeInactive = false } = {}) {
    let query = `
      SELECT
        f.id,
        f.facility_code,
        f.facility_name,
        f.is_active,
        f.display_order,
        f.created_at,
        f.updated_at,
        COUNT(DISTINCT b.id) as building_count
      FROM facilities f
      LEFT JOIN buildings b ON f.id = b.facility_id
      WHERE 1=1
    `;

    if (!includeInactive) {
      query += ' AND f.is_active = TRUE';
    }

    query += ' GROUP BY f.id, f.facility_code, f.facility_name, f.is_active, f.display_order, f.created_at, f.updated_at';
    query += ' ORDER BY f.display_order ASC, f.facility_name ASC';

    const [rows] = await getPool().execute(query);

    return rows.map(row => ({
      ...row,
      building_count: Number(row.building_count || 0)
    }));
  }

  /**
   * Get a single facility by ID
   * @param {number} id - Facility ID
   * @returns {Promise<Object|null>} Facility or null if not found
   */
  async getFacilityById(id) {
    const [rows] = await getPool().execute(
      'SELECT * FROM facilities WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Get a single facility by code
   * @param {string} facilityCode - Facility code
   * @returns {Promise<Object|null>} Facility or null if not found
   */
  async getFacilityByCode(facilityCode) {
    const [rows] = await getPool().execute(
      'SELECT * FROM facilities WHERE facility_code = ?',
      [facilityCode]
    );
    return rows[0] || null;
  }

  /**
   * Create a new facility
   * @param {Object} facilityData - Facility data
   * @param {string} facilityData.facility_code - Unique facility code
   * @param {string} facilityData.facility_name - Display name
   * @param {number} facilityData.display_order - Sort order
   * @returns {Promise<Object>} Created facility
   */
  async createFacility(facilityData) {
    const {
      facility_code,
      facility_name,
      display_order = 0
    } = facilityData;

    if (!facility_code || !facility_name) {
      throw new Error('facility_code and facility_name are required');
    }

    const existing = await this.getFacilityByCode(facility_code);
    if (existing) {
      throw new Error(`Facility with code '${facility_code}' already exists`);
    }

    const [result] = await getPool().execute(
      `INSERT INTO facilities (facility_code, facility_name, display_order)
       VALUES (?, ?, ?)`,
      [facility_code, facility_name, display_order]
    );

    return await this.getFacilityById(result.insertId);
  }

  /**
   * Update an existing facility
   * @param {number} id - Facility ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated facility
   */
  async updateFacility(id, updateData) {
    const facility = await this.getFacilityById(id);
    if (!facility) {
      throw new Error(`Facility with ID ${id} not found`);
    }

    const allowedFields = ['facility_code', 'facility_name', 'is_active', 'display_order'];
    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (updates.length === 0) {
      return facility;
    }

    params.push(id);
    await getPool().execute(
      `UPDATE facilities SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return await this.getFacilityById(id);
  }

  /**
   * Delete a facility (soft delete)
   * @param {number} id - Facility ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteFacility(id) {
    await this.updateFacility(id, { is_active: false });
    return true;
  }

  /**
   * Hard delete a facility (use with caution)
   * @param {number} id - Facility ID
   * @returns {Promise<boolean>} Success status
   */
  async hardDeleteFacility(id) {
    const [buildingsUsing] = await getPool().execute(
      'SELECT COUNT(*) as count FROM buildings WHERE facility_id = ?',
      [id]
    );

    if (buildingsUsing[0].count > 0) {
      throw new Error(`Cannot delete facility: ${buildingsUsing[0].count} building(s) belong to this facility`);
    }

    await getPool().execute('DELETE FROM facilities WHERE id = ?', [id]);
    return true;
  }

  /**
   * Reorder facilities
   * @param {Array<{id: number, display_order: number}>} orders - Facility orders
   * @returns {Promise<boolean>} Success status
   */
  async reorderFacilities(orders) {
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      for (const { id, display_order } of orders) {
        await connection.execute(
          'UPDATE facilities SET display_order = ? WHERE id = ?',
          [display_order, id]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new FacilityService();
