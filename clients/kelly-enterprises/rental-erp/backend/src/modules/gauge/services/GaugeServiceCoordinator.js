const BaseService = require('../../../infrastructure/services/BaseService');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');

/**
 * GaugeServiceCoordinator - Main coordination service for gauge operations
 * Delegates to specialized services while maintaining backward compatibility
 * Replaces the monolithic GaugeService with a clean service orchestration
 */
class GaugeServiceCoordinator extends BaseService {
  constructor(gaugeRepository, options = {}) {
    super(gaugeRepository, options);

    // Use registered services instead of creating new instances
    // This ensures proper dependency injection and avoids duplicate instantiation
    this.validationService = serviceRegistry.get('GaugeValidationService');
    this.queryService = serviceRegistry.get('GaugeQueryService');
    this.operationsService = serviceRegistry.get('GaugeOperationsService');
    this.creationService = serviceRegistry.get('GaugeCreationService');
  }

  // ========== VALIDATION DELEGATION ==========
  
  validateThreadFields(data) {
    return this.validationService.validateThreadFields(data);
  }

  normalizeThreadData(data) {
    return this.validationService.normalizeThreadData(data);
  }

  validateGaugeData(data, isUpdate = false) {
    return this.validationService.validateGaugeData(data, isUpdate);
  }

  // ========== QUERY DELEGATION ==========
  
  async getAllGauges() {
    return this.queryService.getAllGauges();
  }

  async searchGauges(criteria) {
    return this.queryService.searchGauges(criteria);
  }

  async search(criteria) {
    return this.queryService.search(criteria);
  }

  async getSpares(options = {}) {
    return this.queryService.getSpares(options);
  }

  async getActiveGauges(filters) {
    return this.queryService.getActiveGauges(filters);
  }

  async getUserGauges(userId) {
    return this.queryService.getUserGauges(userId);
  }

  async getGaugesByStatus(status) {
    return this.queryService.getGaugesByStatus(status);
  }

  async getGaugeById(id) {
    return this.queryService.getGaugeById(id);
  }

  async getGaugeByGaugeId(gaugeId) {
    return this.queryService.getGaugeByGaugeId(gaugeId);
  }

  async getDashboardSummary() {
    return this.queryService.getDashboardSummary();
  }

  async getGaugeSet(gaugeId) {
    return this.queryService.getGaugeSet(gaugeId);
  }

  // Lookup methods
  async getSealStatuses() {
    return this.queryService.getSealStatuses();
  }

  async getManufacturers() {
    return this.queryService.getManufacturers();
  }

  async getEquipmentTypes() {
    return this.queryService.getEquipmentTypes();
  }

  async getGaugeStatuses() {
    return this.queryService.getGaugeStatuses();
  }

  async getCategoriesByEquipmentType(equipmentType) {
    return this.queryService.getCategoriesByEquipmentType(equipmentType);
  }

  // ========== OPERATIONS DELEGATION ==========
  
  async checkoutGauge(gaugeId, userId, expectedReturn, additionalInfo = {}) {
    return this.operationsService.checkoutGauge(gaugeId, userId, expectedReturn, additionalInfo);
  }

  async returnGauge(gaugeId, userId, condition, notes) {
    return this.operationsService.returnGauge(gaugeId, userId, condition, notes);
  }

  async transferGauge(gaugeId, fromUserId, toUserId, reason) {
    return this.operationsService.transferGauge(gaugeId, fromUserId, toUserId, reason);
  }

  async getTransferHistory(gaugeId) {
    return this.operationsService.getTransferHistory(gaugeId);
  }

  async updateGaugeStatus(gaugeId, newStatus, userId = null, reason = null) {
    return this.operationsService.updateGaugeStatus(gaugeId, newStatus, userId, reason);
  }

  // Calibration operations
  async recordCalibration(gaugeId, calibrationData) {
    return this.operationsService.recordCalibration(gaugeId, calibrationData);
  }

  async getCalibrationHistory(gaugeId) {
    return this.operationsService.getCalibrationHistory(gaugeId);
  }

  async getCalibrationDue(daysAhead = 30) {
    return this.operationsService.getCalibrationDue(daysAhead);
  }

  // Sealing operations
  async sealGauge(gaugeId, sealData, userId) {
    return this.operationsService.sealGauge(gaugeId, sealData, userId);
  }

  async unsealGauge(gaugeId, userId, reason) {
    return this.operationsService.unsealGauge(gaugeId, userId, reason);
  }

  // Status operations
  async markGaugeDamaged(gaugeId, damageInfo, userId) {
    return this.operationsService.markGaugeDamaged(gaugeId, damageInfo, userId);
  }

  async retireGauge(gaugeId, reason, userId) {
    return this.operationsService.retireGauge(gaugeId, reason, userId);
  }

  // ========== CREATION DELEGATION ==========
  
  async createGauge(gaugeData, userId) {
    return this.creationService.createGauge(gaugeData, userId);
  }

  async updateGauge(id, updates, userId = null) {
    return this.creationService.updateGauge(id, updates, userId);
  }

  async deleteGauge(id, userId = null) {
    return this.creationService.deleteGauge(id, userId);
  }

  async createGaugeSet(goGaugeData, noGoGaugeData, userId) {
    return this.creationService.createGaugeSet(goGaugeData, noGoGaugeData, userId);
  }

  async createGaugeV2(gaugeData, userId) {
    return this.creationService.createGaugeV2(gaugeData, userId);
  }

  // Standardization methods
  generateStandardizedName(gaugeData) {
    return this.creationService.generateStandardizedName(gaugeData);
  }

  convertToDecimal(size) {
    return this.creationService.convertToDecimal(size);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get service health status
   * @returns {Object} Health status of all services
   */
  getServiceHealth() {
    return {
      coordinator: 'healthy',
      validation: this.validationService ? 'healthy' : 'unavailable',
      query: this.queryService ? 'healthy' : 'unavailable',
      operations: this.operationsService ? 'healthy' : 'unavailable',
      creation: this.creationService ? 'healthy' : 'unavailable'
    };
  }

  /**
   * Get service statistics
   * @returns {Object} Service operation statistics
   */
  getServiceStats() {
    return {
      services_loaded: 4,
      methods_delegated: 45,
      architecture: 'decomposed',
      version: '2.0.0'
    };
  }

  /**
   * Batch operation support
   * @param {Array} operations - Array of operations to execute
   * @returns {Promise<Array>} Results of batch operations
   */
  async executeBatch(operations) {
    const results = [];
    
    for (const operation of operations) {
      try {
        const { service, method, args } = operation;
        let result;
        
        switch (service) {
          case 'query':
            result = await this.queryService[method](...args);
            break;
          case 'operations':
            result = await this.operationsService[method](...args);
            break;
          case 'creation':
            result = await this.creationService[method](...args);
            break;
          case 'validation':
            result = this.validationService[method](...args);
            break;
          default:
            throw new Error(`Unknown service: ${service}`);
        }
        
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    return results;
  }

  // ========== COMPATIBILITY METHODS ==========

  /**
   * Group gauges by set (compatibility method)
   * @param {Array} gauges - Array of gauge objects
   * @returns {Array} Grouped gauge sets
   */
  groupBySet(gauges) {
    return this.queryService.groupBySet(gauges);
  }

  /**
   * Execute in transaction (compatibility method)
   * @param {Function} callback - Transaction callback
   * @returns {Promise} Transaction result
   */
  async executeInTransaction(callback) {
    // Delegate to creation service which has transaction support
    return this.creationService.executeInTransaction(callback);
  }
}

// Export ValidationError for backward compatibility
GaugeServiceCoordinator.ValidationError = require('./GaugeValidationService').ValidationError;

module.exports = GaugeServiceCoordinator;