/**
 * StorageLocationService - Manages configurable storage locations
 *
 * Provides CRUD operations for storage locations that can be customized
 * per company/deployment
 */

const { getPool } = require('../database/connection');

class StorageLocationService {
  /**
   * Get all active storage locations
   * @param {Object} options - Query options
   * @param {boolean} options.includeInactive - Include inactive locations
   * @param {string} options.locationType - Filter by location type
   * @returns {Promise<Array>} List of storage locations
   */
  async getStorageLocations({ includeInactive = false, locationType = null, buildingId = null, zoneId = null } = {}) {
    let query = `
      SELECT
        sl.id,
        sl.location_code,
        sl.building_id,
        b.building_code,
        b.building_name,
        b.facility_id,
        f.facility_code,
        f.facility_name,
        sl.zone_id,
        z.zone_code,
        z.zone_name,
        sl.location_type,
        sl.is_active,
        sl.allowed_item_types,
        sl.created_at,
        sl.updated_at,
        COUNT(DISTINCT icl.item_identifier) as item_count
      FROM storage_locations sl
      LEFT JOIN buildings b ON sl.building_id = b.id
      LEFT JOIN facilities f ON b.facility_id = f.id
      LEFT JOIN zones z ON sl.zone_id = z.id
      LEFT JOIN inventory_current_locations icl ON sl.location_code = icl.current_location
      WHERE 1=1
    `;

    const params = [];

    if (!includeInactive) {
      query += ' AND sl.is_active = TRUE';
    }

    if (locationType) {
      query += ' AND sl.location_type = ?';
      params.push(locationType);
    }

    if (buildingId) {
      query += ' AND sl.building_id = ?';
      params.push(buildingId);
    }

    if (zoneId) {
      query += ' AND sl.zone_id = ?';
      params.push(zoneId);
    }

    query += ' GROUP BY sl.id, sl.location_code, sl.building_id, b.building_code, b.building_name, b.facility_id, f.facility_code, f.facility_name, sl.zone_id, z.zone_code, z.zone_name, sl.location_type, sl.is_active, sl.allowed_item_types, sl.created_at, sl.updated_at';
    query += ' ORDER BY sl.location_code ASC';

    const [rows] = await getPool().execute(query, params);

    // Convert item_count from BigInt to Number
    return rows.map(row => ({
      ...row,
      item_count: Number(row.item_count || 0)
    }));
  }

  /**
   * Get a single storage location by ID
   * @param {number} id - Location ID
   * @returns {Promise<Object|null>} Storage location or null if not found
   */
  async getStorageLocationById(id) {
    const [rows] = await getPool().execute(
      `SELECT
        sl.*,
        b.building_code, b.building_name, b.facility_id,
        f.facility_code, f.facility_name,
        z.zone_code, z.zone_name
      FROM storage_locations sl
      LEFT JOIN buildings b ON sl.building_id = b.id
      LEFT JOIN facilities f ON b.facility_id = f.id
      LEFT JOIN zones z ON sl.zone_id = z.id
      WHERE sl.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Get a single storage location by code
   * @param {string} locationCode - Location code
   * @returns {Promise<Object|null>} Storage location or null if not found
   */
  async getStorageLocationByCode(locationCode) {
    const [rows] = await getPool().execute(
      'SELECT * FROM storage_locations WHERE location_code = ?',
      [locationCode]
    );
    return rows[0] || null;
  }

  /**
   * Create a new storage location
   * @param {Object} locationData - Location data
   * @param {string} locationData.location_code - Unique location code
   * @param {number} locationData.building_id - Building ID (optional)
   * @param {number} locationData.zone_id - Zone ID (optional)
   * @param {string} locationData.location_type - Type of location
   * @param {Array<string>} locationData.allowed_item_types - Allowed item types (gauges, tools, parts)
   * @returns {Promise<Object>} Created storage location
   */
  async createStorageLocation(locationData) {
    const {
      location_code,
      building_id = null,
      zone_id = null,
      location_type = 'bin',
      allowed_item_types = ['gauges', 'tools', 'parts']
    } = locationData;

    // Check if location code already exists
    const existing = await this.getStorageLocationByCode(location_code);
    if (existing) {
      throw new Error(`Storage location with code '${location_code}' already exists`);
    }

    const [result] = await getPool().execute(
      `INSERT INTO storage_locations (location_code, building_id, zone_id, location_type, allowed_item_types)
       VALUES (?, ?, ?, ?, ?)`,
      [location_code, building_id, zone_id, location_type, JSON.stringify(allowed_item_types)]
    );

    return await this.getStorageLocationById(result.insertId);
  }

  /**
   * Update an existing storage location
   * @param {number} id - Location ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated storage location
   */
  async updateStorageLocation(id, updateData) {
    const location = await this.getStorageLocationById(id);
    if (!location) {
      throw new Error(`Storage location with ID ${id} not found`);
    }

    const allowedFields = ['location_code', 'building_id', 'zone_id', 'location_type', 'is_active', 'allowed_item_types'];
    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        // JSON stringify allowed_item_types
        params.push(key === 'allowed_item_types' ? JSON.stringify(value) : value);
      }
    }

    if (updates.length === 0) {
      return location; // No updates
    }

    params.push(id);
    await getPool().execute(
      `UPDATE storage_locations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return await this.getStorageLocationById(id);
  }

  /**
   * Delete a storage location (soft delete by marking inactive)
   * @param {number} id - Location ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteStorageLocation(id) {
    // Soft delete by marking as inactive
    await this.updateStorageLocation(id, { is_active: false });
    return true;
  }

  /**
   * Hard delete a storage location (use with caution)
   * @param {number} id - Location ID
   * @returns {Promise<boolean>} Success status
   */
  async hardDeleteStorageLocation(id) {
    // Check if location is in use by checking inventory_current_locations
    const [result] = await getPool().execute(
      'SELECT location_code FROM storage_locations WHERE id = ?',
      [id]
    );

    if (result.length === 0) {
      throw new Error('Storage location not found');
    }

    const locationCode = result[0].location_code;

    const [itemsUsingLocation] = await getPool().execute(
      'SELECT COUNT(*) as count FROM inventory_current_locations WHERE current_location = ?',
      [locationCode]
    );

    if (itemsUsingLocation[0].count > 0) {
      throw new Error(`Cannot delete storage location: ${itemsUsingLocation[0].count} item(s) are using this location`);
    }

    await getPool().execute('DELETE FROM storage_locations WHERE id = ?', [id]);
    return true;
  }

  /**
   * Bulk create storage locations
   * @param {Array<Object>} locations - Array of location data
   * @returns {Promise<Array>} Created storage locations
   */
  async bulkCreateStorageLocations(locations) {
    const created = [];
    for (const locationData of locations) {
      try {
        const location = await this.createStorageLocation(locationData);
        created.push(location);
      } catch (error) {
        // Skip duplicates, log other errors
        if (!error.message.includes('already exists')) {
          console.error('Error creating storage location:', error.message);
        }
      }
    }
    return created;
  }

  /**
   * Get storage locations that allow a specific item type
   * @param {string} itemType - Item type (gauges, tools, parts)
   * @returns {Promise<Array>} List of storage locations that allow this item type
   */
  async getLocationsByItemType(itemType) {
    const [rows] = await getPool().execute(
      `SELECT
        sl.id,
        sl.location_code,
        sl.building_id,
        b.building_code,
        b.building_name,
        b.facility_id,
        f.facility_code,
        f.facility_name,
        sl.zone_id,
        z.zone_code,
        z.zone_name,
        sl.location_type,
        sl.is_active,
        sl.allowed_item_types,
        sl.created_at,
        sl.updated_at
      FROM storage_locations sl
      LEFT JOIN buildings b ON sl.building_id = b.id
      LEFT JOIN facilities f ON b.facility_id = f.id
      LEFT JOIN zones z ON sl.zone_id = z.id
      WHERE sl.is_active = TRUE
      AND JSON_CONTAINS(sl.allowed_item_types, ?)
      ORDER BY sl.location_code ASC`,
      [JSON.stringify(itemType)]
    );
    return rows;
  }
}

module.exports = new StorageLocationService();
