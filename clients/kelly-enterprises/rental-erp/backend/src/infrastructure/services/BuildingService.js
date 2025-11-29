/**
 * BuildingService - Manages buildings within facilities
 *
 * Provides CRUD operations for buildings (physical structures).
 * Buildings belong to facilities and contain zones.
 */

const { getPool } = require('../database/connection');

class BuildingService {
  /**
   * Get all buildings
   * @param {Object} options - Query options
   * @param {boolean} options.includeInactive - Include inactive buildings
   * @param {number} options.facilityId - Filter by facility ID
   * @returns {Promise<Array>} List of buildings
   */
  async getBuildings({ includeInactive = false, facilityId = null } = {}) {
    let query = `
      SELECT
        b.id,
        b.building_code,
        b.building_name,
        b.facility_id,
        f.facility_code,
        f.facility_name,
        b.is_active,
        b.display_order,
        b.created_at,
        b.updated_at,
        COUNT(DISTINCT z.id) as zone_count
      FROM buildings b
      INNER JOIN facilities f ON b.facility_id = f.id
      LEFT JOIN zones z ON b.id = z.building_id
      WHERE 1=1
    `;

    const params = [];

    if (!includeInactive) {
      query += ' AND b.is_active = TRUE';
    }

    if (facilityId) {
      query += ' AND b.facility_id = ?';
      params.push(facilityId);
    }

    query += ' GROUP BY b.id, b.building_code, b.building_name, b.facility_id, f.facility_code, f.facility_name, b.is_active, b.display_order, b.created_at, b.updated_at';
    query += ' ORDER BY b.display_order ASC, b.building_name ASC';

    const [rows] = await getPool().execute(query, params);

    return rows.map(row => ({
      ...row,
      zone_count: Number(row.zone_count || 0)
    }));
  }

  /**
   * Get a single building by ID
   * @param {number} id - Building ID
   * @returns {Promise<Object|null>} Building or null if not found
   */
  async getBuildingById(id) {
    const [rows] = await getPool().execute(
      `SELECT b.*, f.facility_code, f.facility_name
       FROM buildings b
       INNER JOIN facilities f ON b.facility_id = f.id
       WHERE b.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Get a single building by code within facility
   * @param {string} buildingCode - Building code
   * @param {number} facilityId - Facility ID
   * @returns {Promise<Object|null>} Building or null if not found
   */
  async getBuildingByCode(buildingCode, facilityId) {
    const [rows] = await getPool().execute(
      `SELECT b.*, f.facility_code, f.facility_name
       FROM buildings b
       INNER JOIN facilities f ON b.facility_id = f.id
       WHERE b.building_code = ? AND b.facility_id = ?`,
      [buildingCode, facilityId]
    );
    return rows[0] || null;
  }

  /**
   * Create a new building
   * @param {Object} buildingData - Building data
   * @param {string} buildingData.building_code - Building code (unique per facility)
   * @param {string} buildingData.building_name - Display name
   * @param {number} buildingData.facility_id - Parent facility ID
   * @param {number} buildingData.display_order - Sort order
   * @returns {Promise<Object>} Created building
   */
  async createBuilding(buildingData) {
    const {
      building_code,
      building_name,
      facility_id,
      display_order = 0
    } = buildingData;

    if (!building_code || !building_name || !facility_id) {
      throw new Error('building_code, building_name, and facility_id are required');
    }

    // Verify facility exists
    const [facilities] = await getPool().execute(
      'SELECT id FROM facilities WHERE id = ?',
      [facility_id]
    );

    if (facilities.length === 0) {
      throw new Error(`Facility with ID ${facility_id} not found`);
    }

    // Check if building code exists in this facility
    const existing = await this.getBuildingByCode(building_code, facility_id);
    if (existing) {
      throw new Error(`Building with code '${building_code}' already exists in this facility`);
    }

    const [result] = await getPool().execute(
      `INSERT INTO buildings (building_code, building_name, facility_id, display_order)
       VALUES (?, ?, ?, ?)`,
      [building_code, building_name, facility_id, display_order]
    );

    return await this.getBuildingById(result.insertId);
  }

  /**
   * Update an existing building
   * @param {number} id - Building ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated building
   */
  async updateBuilding(id, updateData) {
    const building = await this.getBuildingById(id);
    if (!building) {
      throw new Error(`Building with ID ${id} not found`);
    }

    const allowedFields = ['building_code', 'building_name', 'facility_id', 'is_active', 'display_order'];
    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (updates.length === 0) {
      return building;
    }

    params.push(id);
    await getPool().execute(
      `UPDATE buildings SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return await this.getBuildingById(id);
  }

  /**
   * Delete a building (soft delete)
   * @param {number} id - Building ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteBuilding(id) {
    await this.updateBuilding(id, { is_active: false });
    return true;
  }

  /**
   * Hard delete a building (use with caution)
   * @param {number} id - Building ID
   * @returns {Promise<boolean>} Success status
   */
  async hardDeleteBuilding(id) {
    // Check if building has zones
    const [zonesUsing] = await getPool().execute(
      'SELECT COUNT(*) as count FROM zones WHERE building_id = ?',
      [id]
    );

    if (zonesUsing[0].count > 0) {
      throw new Error(`Cannot delete building: ${zonesUsing[0].count} zone(s) belong to this building`);
    }

    // Check if building has storage locations
    const [locationsUsing] = await getPool().execute(
      'SELECT COUNT(*) as count FROM storage_locations WHERE building_id = ?',
      [id]
    );

    if (locationsUsing[0].count > 0) {
      throw new Error(`Cannot delete building: ${locationsUsing[0].count} storage location(s) belong to this building`);
    }

    await getPool().execute('DELETE FROM buildings WHERE id = ?', [id]);
    return true;
  }

  /**
   * Reorder buildings within a facility
   * @param {Array<{id: number, display_order: number}>} orders - Building orders
   * @returns {Promise<boolean>} Success status
   */
  async reorderBuildings(orders) {
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      for (const { id, display_order } of orders) {
        await connection.execute(
          'UPDATE buildings SET display_order = ? WHERE id = ?',
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

module.exports = new BuildingService();
