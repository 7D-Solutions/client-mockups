/**
 * Organization Service
 * Business logic for managing the 3-level organization hierarchy:
 * Facility → Building → Zone
 *
 * Storage Locations are managed separately in the Inventory module
 */

const BaseService = require('../../../infrastructure/services/BaseService');
const logger = require('../../../infrastructure/utils/logger');

class OrganizationService extends BaseService {
  constructor(organizationRepository, options = {}) {
    super(organizationRepository, options);
  }

  // ============================================================================
  // Hierarchy Methods
  // ============================================================================

  /**
   * Get complete organization hierarchy with counts
   * Returns facilities with nested buildings and zones
   */
  async getHierarchy() {
    try {
      const hierarchy = await this.repository.getHierarchy();

      // Transform to frontend-friendly format
      return hierarchy.map(facility => ({
        id: facility.id,
        code: facility.facility_code,
        name: facility.facility_name,
        isActive: facility.is_active === 1,
        displayOrder: facility.display_order,
        buildingCount: parseInt(facility.building_count) || 0,
        buildings: (facility.buildings || []).map(building => ({
          id: building.id,
          code: building.building_code,
          name: building.building_name,
          facilityId: building.facility_id,
          isActive: building.is_active === 1,
          displayOrder: building.display_order,
          zoneCount: parseInt(building.zone_count) || 0,
          zones: (building.zones || []).map(zone => ({
            id: zone.id,
            code: zone.zone_code,
            name: zone.zone_name,
            buildingId: zone.building_id,
            isActive: zone.is_active === 1,
            displayOrder: zone.display_order,
            locationCount: parseInt(zone.location_count) || 0
          }))
        }))
      }));

    } catch (error) {
      logger.error('OrganizationService.getHierarchy failed:', {
        error: error.message
      });
      throw new Error(`Failed to get organization hierarchy: ${error.message}`);
    }
  }

  // ============================================================================
  // Facility Methods
  // ============================================================================

  /**
   * Get all facilities with building counts
   */
  async getFacilities() {
    try {
      const facilities = await this.repository.getFacilities();

      return facilities.map(facility => ({
        id: facility.id,
        code: facility.facility_code,
        name: facility.facility_name,
        isActive: facility.is_active === 1,
        displayOrder: facility.display_order,
        buildingCount: parseInt(facility.building_count) || 0,
        createdAt: facility.created_at,
        updatedAt: facility.updated_at
      }));

    } catch (error) {
      logger.error('OrganizationService.getFacilities failed:', {
        error: error.message
      });
      throw new Error(`Failed to get facilities: ${error.message}`);
    }
  }

  /**
   * Create new facility
   */
  async createFacility(data) {
    try {
      // Validate required fields
      if (!data.facility_code || !data.facility_name) {
        throw new Error('Facility code and name are required');
      }

      const facility = await this.repository.createFacility(data);

      return {
        id: facility.id,
        code: facility.facility_code,
        name: facility.facility_name,
        isActive: facility.is_active === 1,
        displayOrder: facility.display_order
      };

    } catch (error) {
      logger.error('OrganizationService.createFacility failed:', {
        error: error.message,
        data
      });

      // Handle duplicate code error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Facility code already exists');
      }

      throw new Error(`Failed to create facility: ${error.message}`);
    }
  }

  /**
   * Update facility
   */
  async updateFacility(id, data) {
    try {
      // Check if facility exists
      const existing = await this.repository.getFacilityById(id);
      if (!existing) {
        throw new Error('Facility not found');
      }

      const updated = await this.repository.updateFacility(id, data);

      return {
        id: updated.id,
        code: updated.facility_code,
        name: updated.facility_name,
        isActive: updated.is_active === 1,
        displayOrder: updated.display_order
      };

    } catch (error) {
      logger.error('OrganizationService.updateFacility failed:', {
        error: error.message,
        id,
        data
      });

      // Handle duplicate code error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Facility code already exists');
      }

      throw new Error(`Failed to update facility: ${error.message}`);
    }
  }

  /**
   * Delete facility (cascades to buildings and zones)
   */
  async deleteFacility(id) {
    try {
      // Check if facility exists
      const existing = await this.repository.getFacilityById(id);
      if (!existing) {
        throw new Error('Facility not found');
      }

      await this.repository.deleteFacility(id);

      logger.info('Facility deleted (cascaded to buildings and zones)', { id });

    } catch (error) {
      logger.error('OrganizationService.deleteFacility failed:', {
        error: error.message,
        id
      });
      throw new Error(`Failed to delete facility: ${error.message}`);
    }
  }

  // ============================================================================
  // Building Methods
  // ============================================================================

  /**
   * Get buildings, optionally filtered by facility_id
   */
  async getBuildings(facilityId = null) {
    try {
      const buildings = await this.repository.getBuildings(facilityId);

      return buildings.map(building => ({
        id: building.id,
        code: building.building_code,
        name: building.building_name,
        facilityId: building.facility_id,
        facilityName: building.facility_name,
        isActive: building.is_active === 1,
        displayOrder: building.display_order,
        zoneCount: parseInt(building.zone_count) || 0,
        createdAt: building.created_at,
        updatedAt: building.updated_at
      }));

    } catch (error) {
      logger.error('OrganizationService.getBuildings failed:', {
        error: error.message,
        facilityId
      });
      throw new Error(`Failed to get buildings: ${error.message}`);
    }
  }

  /**
   * Create new building
   */
  async createBuilding(data) {
    try {
      // Validate required fields
      if (!data.building_code || !data.building_name || !data.facility_id) {
        throw new Error('Building code, name, and facility ID are required');
      }

      // Verify facility exists
      const facility = await this.repository.getFacilityById(data.facility_id);
      if (!facility) {
        throw new Error('Facility not found');
      }

      const building = await this.repository.createBuilding(data);

      return {
        id: building.id,
        code: building.building_code,
        name: building.building_name,
        facilityId: building.facility_id,
        isActive: building.is_active === 1,
        displayOrder: building.display_order
      };

    } catch (error) {
      logger.error('OrganizationService.createBuilding failed:', {
        error: error.message,
        data
      });

      // Handle duplicate code error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Building code already exists for this facility');
      }

      throw new Error(`Failed to create building: ${error.message}`);
    }
  }

  /**
   * Update building
   */
  async updateBuilding(id, data) {
    try {
      // Check if building exists
      const existing = await this.repository.getBuildingById(id);
      if (!existing) {
        throw new Error('Building not found');
      }

      // If changing facility, verify new facility exists
      if (data.facility_id && data.facility_id !== existing.facility_id) {
        const facility = await this.repository.getFacilityById(data.facility_id);
        if (!facility) {
          throw new Error('Facility not found');
        }
      }

      const updated = await this.repository.updateBuilding(id, data);

      return {
        id: updated.id,
        code: updated.building_code,
        name: updated.building_name,
        facilityId: updated.facility_id,
        isActive: updated.is_active === 1,
        displayOrder: updated.display_order
      };

    } catch (error) {
      logger.error('OrganizationService.updateBuilding failed:', {
        error: error.message,
        id,
        data
      });

      // Handle duplicate code error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Building code already exists for this facility');
      }

      throw new Error(`Failed to update building: ${error.message}`);
    }
  }

  /**
   * Delete building (cascades to zones)
   */
  async deleteBuilding(id) {
    try {
      // Check if building exists
      const existing = await this.repository.getBuildingById(id);
      if (!existing) {
        throw new Error('Building not found');
      }

      await this.repository.deleteBuilding(id);

      logger.info('Building deleted (cascaded to zones)', { id });

    } catch (error) {
      logger.error('OrganizationService.deleteBuilding failed:', {
        error: error.message,
        id
      });
      throw new Error(`Failed to delete building: ${error.message}`);
    }
  }

  // ============================================================================
  // Zone Methods
  // ============================================================================

  /**
   * Get zones, optionally filtered by building_id
   */
  async getZones(buildingId = null) {
    try {
      const zones = await this.repository.getZones(buildingId);

      return zones.map(zone => ({
        id: zone.id,
        code: zone.zone_code,
        name: zone.zone_name,
        buildingId: zone.building_id,
        buildingName: zone.building_name,
        facilityName: zone.facility_name,
        isActive: zone.is_active === 1,
        displayOrder: zone.display_order,
        locationCount: parseInt(zone.location_count) || 0,
        createdAt: zone.created_at,
        updatedAt: zone.updated_at
      }));

    } catch (error) {
      logger.error('OrganizationService.getZones failed:', {
        error: error.message,
        buildingId
      });
      throw new Error(`Failed to get zones: ${error.message}`);
    }
  }

  /**
   * Create new zone
   */
  async createZone(data) {
    try {
      // Validate required fields
      if (!data.zone_code || !data.zone_name || !data.building_id) {
        throw new Error('Zone code, name, and building ID are required');
      }

      // Verify building exists
      const building = await this.repository.getBuildingById(data.building_id);
      if (!building) {
        throw new Error('Building not found');
      }

      const zone = await this.repository.createZone(data);

      return {
        id: zone.id,
        code: zone.zone_code,
        name: zone.zone_name,
        buildingId: zone.building_id,
        isActive: zone.is_active === 1,
        displayOrder: zone.display_order
      };

    } catch (error) {
      logger.error('OrganizationService.createZone failed:', {
        error: error.message,
        data
      });

      // Handle duplicate code error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Zone code already exists for this building');
      }

      throw new Error(`Failed to create zone: ${error.message}`);
    }
  }

  /**
   * Update zone
   */
  async updateZone(id, data) {
    try {
      // Check if zone exists
      const existing = await this.repository.getZoneById(id);
      if (!existing) {
        throw new Error('Zone not found');
      }

      // If changing building, verify new building exists
      if (data.building_id && data.building_id !== existing.building_id) {
        const building = await this.repository.getBuildingById(data.building_id);
        if (!building) {
          throw new Error('Building not found');
        }
      }

      const updated = await this.repository.updateZone(id, data);

      return {
        id: updated.id,
        code: updated.zone_code,
        name: updated.zone_name,
        buildingId: updated.building_id,
        isActive: updated.is_active === 1,
        displayOrder: updated.display_order
      };

    } catch (error) {
      logger.error('OrganizationService.updateZone failed:', {
        error: error.message,
        id,
        data
      });

      // Handle duplicate code error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Zone code already exists for this building');
      }

      throw new Error(`Failed to update zone: ${error.message}`);
    }
  }

  /**
   * Delete zone (sets storage_locations.zone_id to NULL)
   */
  async deleteZone(id) {
    try {
      // Check if zone exists
      const existing = await this.repository.getZoneById(id);
      if (!existing) {
        throw new Error('Zone not found');
      }

      await this.repository.deleteZone(id);

      logger.info('Zone deleted (storage locations set to NULL)', { id });

    } catch (error) {
      logger.error('OrganizationService.deleteZone failed:', {
        error: error.message,
        id
      });
      throw new Error(`Failed to delete zone: ${error.message}`);
    }
  }
}

module.exports = OrganizationService;
