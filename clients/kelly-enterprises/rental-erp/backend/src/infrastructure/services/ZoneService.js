/**
 * ZoneService - Manages warehouse zones (functional areas)
 *
 * Provides CRUD operations for zones that storage locations can be assigned to.
 * Zones represent functional areas like QC, Shipping, Shop Floor, etc.
 */

const { getPool } = require('../database/connection');

class ZoneService {
  /**
   * Get all zones
   * @param {Object} options - Query options
   * @param {boolean} options.includeInactive - Include inactive zones
   * @param {number} options.buildingId - Filter by building ID
   * @returns {Promise<Array>} List of zones
   */
  async getZones({ includeInactive = false, buildingId = null } = {}) {
    let query = `
      SELECT
        z.id,
        z.zone_code,
        z.zone_name,
        z.building_id,
        b.building_code,
        b.building_name,
        b.facility_id,
        f.facility_code,
        f.facility_name,
        z.is_active,
        z.display_order,
        z.created_at,
        z.updated_at,
        COUNT(sl.id) as location_count
      FROM zones z
      INNER JOIN buildings b ON z.building_id = b.id
      INNER JOIN facilities f ON b.facility_id = f.id
      LEFT JOIN storage_locations sl ON z.id = sl.zone_id
      WHERE 1=1
    `;

    const params = [];

    if (!includeInactive) {
      query += ' AND z.is_active = TRUE';
    }

    if (buildingId) {
      query += ' AND z.building_id = ?';
      params.push(buildingId);
    }

    query += ' GROUP BY z.id, z.zone_code, z.zone_name, z.building_id, b.building_code, b.building_name, b.facility_id, f.facility_code, f.facility_name, z.is_active, z.display_order, z.created_at, z.updated_at';
    query += ' ORDER BY z.display_order ASC, z.zone_name ASC';

    const [rows] = await getPool().execute(query, params);

    // Convert location_count from BigInt to Number
    return rows.map(row => ({
      ...row,
      location_count: Number(row.location_count || 0)
    }));
  }

  /**
   * Get a single zone by ID
   * @param {number} id - Zone ID
   * @returns {Promise<Object|null>} Zone or null if not found
   */
  async getZoneById(id) {
    const [rows] = await getPool().execute(
      `SELECT z.*, b.building_code, b.building_name, b.facility_id, f.facility_code, f.facility_name
       FROM zones z
       INNER JOIN buildings b ON z.building_id = b.id
       INNER JOIN facilities f ON b.facility_id = f.id
       WHERE z.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Get a single zone by code within building
   * @param {string} zoneCode - Zone code
   * @param {number} buildingId - Building ID
   * @returns {Promise<Object|null>} Zone or null if not found
   */
  async getZoneByCode(zoneCode, buildingId) {
    const [rows] = await getPool().execute(
      `SELECT z.*, b.building_code, b.building_name, b.facility_id, f.facility_code, f.facility_name
       FROM zones z
       INNER JOIN buildings b ON z.building_id = b.id
       INNER JOIN facilities f ON b.facility_id = f.id
       WHERE z.zone_code = ? AND z.building_id = ?`,
      [zoneCode, buildingId]
    );
    return rows[0] || null;
  }

  /**
   * Create a new zone
   * @param {Object} zoneData - Zone data
   * @param {string} zoneData.zone_code - Zone code (unique per building)
   * @param {string} zoneData.zone_name - Display name
   * @param {number} zoneData.building_id - Parent building ID
   * @param {number} zoneData.display_order - Sort order
   * @returns {Promise<Object>} Created zone
   */
  async createZone(zoneData) {
    const {
      zone_code,
      zone_name,
      building_id,
      display_order = 0
    } = zoneData;

    // Validate required fields
    if (!zone_code || !zone_name || !building_id) {
      throw new Error('zone_code, zone_name, and building_id are required');
    }

    // Verify building exists
    const [buildings] = await getPool().execute(
      'SELECT id FROM buildings WHERE id = ?',
      [building_id]
    );

    if (buildings.length === 0) {
      throw new Error(`Building with ID ${building_id} not found`);
    }

    // Check if zone code exists in this building
    const existing = await this.getZoneByCode(zone_code, building_id);
    if (existing) {
      throw new Error(`Zone with code '${zone_code}' already exists in this building`);
    }

    const [result] = await getPool().execute(
      `INSERT INTO zones (zone_code, zone_name, building_id, display_order)
       VALUES (?, ?, ?, ?)`,
      [zone_code, zone_name, building_id, display_order]
    );

    return await this.getZoneById(result.insertId);
  }

  /**
   * Update an existing zone
   * @param {number} id - Zone ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated zone
   */
  async updateZone(id, updateData) {
    const zone = await this.getZoneById(id);
    if (!zone) {
      throw new Error(`Zone with ID ${id} not found`);
    }

    const allowedFields = ['zone_code', 'zone_name', 'building_id', 'is_active', 'display_order'];
    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (updates.length === 0) {
      return zone; // No updates
    }

    params.push(id);
    await getPool().execute(
      `UPDATE zones SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return await this.getZoneById(id);
  }

  /**
   * Delete a zone (soft delete by marking inactive)
   * @param {number} id - Zone ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteZone(id) {
    // Soft delete by marking as inactive
    await this.updateZone(id, { is_active: false });
    return true;
  }

  /**
   * Hard delete a zone (use with caution)
   * @param {number} id - Zone ID
   * @returns {Promise<boolean>} Success status
   */
  async hardDeleteZone(id) {
    // Check if zone is in use
    const [locationsUsing] = await getPool().execute(
      'SELECT COUNT(*) as count FROM storage_locations WHERE zone_id = ?',
      [id]
    );

    if (locationsUsing[0].count > 0) {
      throw new Error(`Cannot delete zone: ${locationsUsing[0].count} storage location(s) are assigned to this zone`);
    }

    await getPool().execute('DELETE FROM zones WHERE id = ?', [id]);
    return true;
  }

  /**
   * Reorder zones
   * @param {Array<{id: number, display_order: number}>} orders - Zone ID and new order
   * @returns {Promise<boolean>} Success status
   */
  async reorderZones(orders) {
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      for (const { id, display_order } of orders) {
        await connection.execute(
          'UPDATE zones SET display_order = ? WHERE id = ?',
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

module.exports = new ZoneService();
