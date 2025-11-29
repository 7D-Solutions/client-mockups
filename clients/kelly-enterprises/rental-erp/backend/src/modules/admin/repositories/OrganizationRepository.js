const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * OrganizationRepository
 * Handles data access for the 3-level organization hierarchy:
 * Facility → Building → Zone
 *
 * Storage Locations are managed separately in the Inventory module
 */
class OrganizationRepository {
  constructor() {
    // Create repository instances for each table
    this.facilityRepo = new BaseRepository('facilities', 'id');
    this.buildingRepo = new BaseRepository('buildings', 'id');
    this.zoneRepo = new BaseRepository('zones', 'id');
  }

  // ============================================================================
  // Hierarchy Queries
  // ============================================================================

  /**
   * Get complete organization hierarchy with counts
   * Returns facilities with nested buildings and zones, including location counts
   */
  async getHierarchy(conn) {
    const connection = conn || await this.facilityRepo.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // Query facilities with building counts
      const [facilities] = await connection.execute(`
        SELECT
          f.*,
          COUNT(DISTINCT b.id) as building_count
        FROM facilities f
        LEFT JOIN buildings b ON b.facility_id = f.id AND b.is_active = 1
        WHERE f.is_active = 1
        GROUP BY f.id
        ORDER BY f.display_order ASC, f.facility_name ASC
      `);

      // For each facility, get buildings with zone counts
      for (const facility of facilities) {
        const [buildings] = await connection.execute(`
          SELECT
            b.*,
            COUNT(DISTINCT z.id) as zone_count
          FROM buildings b
          LEFT JOIN zones z ON z.building_id = b.id AND z.is_active = 1
          WHERE b.facility_id = ? AND b.is_active = 1
          GROUP BY b.id
          ORDER BY b.display_order ASC, b.building_name ASC
        `, [facility.id]);

        // For each building, get zones with location counts
        for (const building of buildings) {
          const [zones] = await connection.execute(`
            SELECT
              z.*,
              COUNT(DISTINCT sl.id) as location_count
            FROM zones z
            LEFT JOIN storage_locations sl ON sl.zone_id = z.id
            WHERE z.building_id = ? AND z.is_active = 1
            GROUP BY z.id
            ORDER BY z.display_order ASC, z.zone_name ASC
          `, [building.id]);

          building.zones = zones;
        }

        facility.buildings = buildings;
      }

      return facilities;

    } catch (error) {
      logger.error('OrganizationRepository.getHierarchy failed:', {
        error: error.message,
        sqlState: error.sqlState
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  // ============================================================================
  // Facility Methods
  // ============================================================================

  /**
   * Get all facilities with building counts
   */
  async getFacilities(conn) {
    const connection = conn || await this.facilityRepo.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [facilities] = await connection.execute(`
        SELECT
          f.*,
          COUNT(DISTINCT b.id) as building_count
        FROM facilities f
        LEFT JOIN buildings b ON b.facility_id = f.id AND b.is_active = 1
        WHERE f.is_active = 1
        GROUP BY f.id
        ORDER BY f.display_order ASC, f.facility_name ASC
      `);

      return facilities;

    } catch (error) {
      logger.error('OrganizationRepository.getFacilities failed:', {
        error: error.message,
        sqlState: error.sqlState
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get facility by ID
   */
  async getFacilityById(id, conn) {
    return this.facilityRepo.findById(id, conn);
  }

  /**
   * Create new facility
   */
  async createFacility(data, conn) {
    const facilityData = {
      facility_code: data.facility_code,
      facility_name: data.facility_name,
      is_active: data.is_active !== undefined ? data.is_active : true,
      display_order: data.display_order || 0
    };

    return this.facilityRepo.create(facilityData, conn);
  }

  /**
   * Update facility
   */
  async updateFacility(id, data, conn) {
    const updateData = {};

    if (data.facility_code !== undefined) updateData.facility_code = data.facility_code;
    if (data.facility_name !== undefined) updateData.facility_name = data.facility_name;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.display_order !== undefined) updateData.display_order = data.display_order;

    return this.facilityRepo.update(id, updateData, conn);
  }

  /**
   * Delete facility (CASCADE to buildings and zones via FK)
   */
  async deleteFacility(id, conn) {
    return this.facilityRepo.hardDelete(id, conn);
  }

  // ============================================================================
  // Building Methods
  // ============================================================================

  /**
   * Get buildings, optionally filtered by facility_id
   */
  async getBuildings(facilityId = null, conn) {
    const connection = conn || await this.buildingRepo.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      let query = `
        SELECT
          b.*,
          f.facility_name,
          COUNT(DISTINCT z.id) as zone_count
        FROM buildings b
        INNER JOIN facilities f ON f.id = b.facility_id
        LEFT JOIN zones z ON z.building_id = b.id AND z.is_active = 1
        WHERE b.is_active = 1
      `;

      const params = [];
      if (facilityId) {
        query += ' AND b.facility_id = ?';
        params.push(facilityId);
      }

      query += `
        GROUP BY b.id, f.facility_name
        ORDER BY b.display_order ASC, b.building_name ASC
      `;

      const [buildings] = await connection.execute(query, params);
      return buildings;

    } catch (error) {
      logger.error('OrganizationRepository.getBuildings failed:', {
        error: error.message,
        facilityId,
        sqlState: error.sqlState
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get building by ID
   */
  async getBuildingById(id, conn) {
    return this.buildingRepo.findById(id, conn);
  }

  /**
   * Create new building
   */
  async createBuilding(data, conn) {
    const buildingData = {
      building_code: data.building_code,
      building_name: data.building_name,
      facility_id: data.facility_id,
      is_active: data.is_active !== undefined ? data.is_active : true,
      display_order: data.display_order || 0
    };

    return this.buildingRepo.create(buildingData, conn);
  }

  /**
   * Update building
   */
  async updateBuilding(id, data, conn) {
    const updateData = {};

    if (data.building_code !== undefined) updateData.building_code = data.building_code;
    if (data.building_name !== undefined) updateData.building_name = data.building_name;
    if (data.facility_id !== undefined) updateData.facility_id = data.facility_id;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.display_order !== undefined) updateData.display_order = data.display_order;

    return this.buildingRepo.update(id, updateData, conn);
  }

  /**
   * Delete building (CASCADE to zones via FK)
   */
  async deleteBuilding(id, conn) {
    return this.buildingRepo.hardDelete(id, conn);
  }

  // ============================================================================
  // Zone Methods
  // ============================================================================

  /**
   * Get zones, optionally filtered by building_id
   */
  async getZones(buildingId = null, conn) {
    const connection = conn || await this.zoneRepo.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      let query = `
        SELECT
          z.*,
          b.building_name,
          f.facility_name,
          COUNT(DISTINCT sl.id) as location_count
        FROM zones z
        INNER JOIN buildings b ON b.id = z.building_id
        INNER JOIN facilities f ON f.id = b.facility_id
        LEFT JOIN storage_locations sl ON sl.zone_id = z.id
        WHERE z.is_active = 1
      `;

      const params = [];
      if (buildingId) {
        query += ' AND z.building_id = ?';
        params.push(buildingId);
      }

      query += `
        GROUP BY z.id, b.building_name, f.facility_name
        ORDER BY z.display_order ASC, z.zone_name ASC
      `;

      const [zones] = await connection.execute(query, params);
      return zones;

    } catch (error) {
      logger.error('OrganizationRepository.getZones failed:', {
        error: error.message,
        buildingId,
        sqlState: error.sqlState
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get zone by ID
   */
  async getZoneById(id, conn) {
    return this.zoneRepo.findById(id, conn);
  }

  /**
   * Create new zone
   */
  async createZone(data, conn) {
    const zoneData = {
      zone_code: data.zone_code,
      zone_name: data.zone_name,
      building_id: data.building_id,
      is_active: data.is_active !== undefined ? data.is_active : true,
      display_order: data.display_order || 0
    };

    return this.zoneRepo.create(zoneData, conn);
  }

  /**
   * Update zone
   */
  async updateZone(id, data, conn) {
    const updateData = {};

    if (data.zone_code !== undefined) updateData.zone_code = data.zone_code;
    if (data.zone_name !== undefined) updateData.zone_name = data.zone_name;
    if (data.building_id !== undefined) updateData.building_id = data.building_id;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.display_order !== undefined) updateData.display_order = data.display_order;

    return this.zoneRepo.update(id, updateData, conn);
  }

  /**
   * Delete zone (SET NULL on storage_locations.zone_id via FK)
   */
  async deleteZone(id, conn) {
    return this.zoneRepo.hardDelete(id, conn);
  }
}

module.exports = OrganizationRepository;
