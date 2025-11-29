const BaseService = require('../../../infrastructure/services/BaseService');
const ReportsRepository = require('../repositories/ReportsRepository');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

class ReportsService extends BaseService {
  constructor() {
    super(new ReportsRepository());
  }
  async getGaugesList(query) {
    try {
      const { page = 1, limit = 50, status, ownership_type, equipment_type } = query;
      
      const filters = {};
      if (status) filters.status = status;
      if (ownership_type) filters.ownership_type = ownership_type;
      if (equipment_type) filters.equipment_type = equipment_type;
      
      // Use the service which already has the correct query with checked_out_by_user_id
      const gaugeService = serviceRegistry.get('GaugeService');
      const allGauges = await gaugeService.getActiveGauges(filters);
      
      // Paginate
      const limitNum = parseInt(limit);
      const pageNum = parseInt(page);
      const total = allGauges.length;
      const offset = (pageNum - 1) * limitNum;
      
      return {
        success: true,
        data: allGauges.slice(offset, offset + limitNum),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          pages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get gauges list: ${error.message}`);
    }
  }
  async getDashboardSummary() {
    try {
      const summary = await this.repository.getDashboardSummary();
      return { success: true, data: summary };
    } catch (error) {
      throw new Error(`Failed to get dashboard summary: ${error.message}`);
    }
  }

  async getOverdueCalibrations() {
    try {
      const overdueGauges = await this.repository.getOverdueCalibrations();
      return { 
        success: true, 
        data: overdueGauges, 
        count: overdueGauges.length 
      };
    } catch (error) {
      throw new Error(`Failed to get overdue calibrations: ${error.message}`);
    }
  }

  async getGaugeHistory(gaugeId) {
    try {
      const history = await this.repository.getGaugeHistory(gaugeId);
      if (history === null) {
        return { success: false, error: 'Gauge not found' };
      }
      // Empty array is a valid result - gauge exists but has no history yet
      return { success: true, data: history || [] };
    } catch (error) {
      throw new Error(`Failed to get gauge history: ${error.message}`);
    }
  }

  async getGaugesByStatus(status) {
    try {
      const gauges = await this.repository.getGaugesByStatus(status);
      return { success: true, data: gauges };
    } catch (error) {
      throw new Error(`Failed to get gauges by status: ${error.message}`);
    }
  }

  async getCheckoutHistory(gaugeId) {
    try {
      const history = await this.repository.getCheckoutHistory(gaugeId);
      return { success: true, data: history };
    } catch (error) {
      throw new Error(`Failed to get checkout history: ${error.message}`);
    }
  }
}

module.exports = ReportsService;