const BaseService = require('../../../infrastructure/services/BaseService');
const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

class AdminMaintenanceService extends BaseService {
  constructor(adminRepository, options = {}) {
    super(adminRepository, options);
  }

  /**
   * Get comprehensive gauge status report
   */
  async getGaugeStatusReport() {
    try {
      // Get gauge stats from repository
      const gaugeStats = await this.repository.getGaugeStats();
      
      // Get calibration service from registry if available
      let calibrationStats = null;
      if (serviceRegistry.has('GaugeCalibrationService')) {
        const calibrationService = serviceRegistry.get('GaugeCalibrationService');
        calibrationStats = await calibrationService.getCalibrationOverview();
      } else {
        // Use repository methods
        const overdue = await this.repository.getOverdueCalibrationCount();
        const dueSoon = await this.repository.getDueSoonCalibrationCount();
        
        calibrationStats = {
          overdue,
          due_soon: dueSoon
        };
      }

      // Get recent activity
      const recentActivity = await this.repository.getRecentActivity(7 * 24); // Last 7 days

      return {
        status_distribution: gaugeStats.statusDistribution,
        calibration: calibrationStats,
        checkout_stats: gaugeStats.checkouts,
        recent_activity: recentActivity,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get gauge status report:', error);
      throw error;
    }
  }

  /**
   * Check and correct gauge status inconsistencies
   */
  async checkAndCorrectGaugeStatuses() {
    try {
      const gauges = await this.repository.getGaugesForMaintenance();
      const corrections = [];

      for (const gauge of gauges) {
        // Determine correct status - calibration due is calculated, not a status
        let calculatedStatus = gauge.status;
        
        // No longer set status to 'calibration_due' - this is handled by calibration_status field
        // Only correct gauges that were incorrectly marked as calibration_due back to available
        if (gauge.status === 'calibration_due') {
          calculatedStatus = 'available'; // Reset incorrect manual calibration_due status
        }

        // If status mismatch, correct it
        if (gauge.status !== calculatedStatus) {
          await this.repository.updateGaugeStatus(gauge.id, calculatedStatus);
          corrections.push({
            gauge_id: gauge.gauge_id,
            old_status: gauge.status,
            new_status: calculatedStatus,
            reason: 'calibration_status_sync'
          });
        }
      }

      return {
        gauges_checked: gauges.length,
        corrections_made: corrections.length,
        corrections,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to check and correct gauge statuses:', error);
      throw error;
    }
  }

  /**
   * Check data consistency across tables
   */
  async checkDataConsistency() {
    try {
      const issues = await this.repository.getDataConsistencyIssues();
      
      // Group issues by type
      const groupedIssues = issues.reduce((acc, issue) => {
        if (!acc[issue.type]) {
          acc[issue.type] = [];
        }
        acc[issue.type].push(issue);
        return acc;
      }, {});

      return {
        total_issues: issues.length,
        issues_by_type: groupedIssues,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to check data consistency:', error);
      throw error;
    }
  }

  /**
   * Sync gauge statuses based on transfers, calibrations, etc.
   */
  async syncGaugeStatuses() {
    try {
      const results = await this.checkAndCorrectGaugeStatuses();
      
      // Log corrections
      if (results.corrections_made > 0 && this.auditService) {
        await this.auditService.logAction({
          module: 'admin',
          action: 'gauge_status_sync',
          entity_type: 'system',
          entity_id: null,
          user_id: null, // System action
          ip_address: '127.0.0.1',
          details: {
            gauges_checked: results.gauges_checked,
            corrections_made: results.corrections_made,
            corrections: results.corrections
          }
        });
      }

      return results;
    } catch (error) {
      logger.error('Failed to sync gauge statuses:', error);
      throw error;
    }
  }

  /**
   * Get user integrity report
   */
  async getUserIntegrityReport() {
    try {
      const users = await this.repository.getUsersForIntegrityCheck();
      
      const issues = [];
      const stats = {
        total_users: users.length,
        active_users: 0,
        inactive_users: 0,
        deleted_users: 0,
        users_without_roles: 0
      };

      for (const user of users) {
        if (user.is_active) stats.active_users++;
        else stats.inactive_users++;
        
        if (user.is_deleted) stats.deleted_users++;
        
        if (user.roles.length === 0) {
          stats.users_without_roles++;
          issues.push({
            type: 'missing_roles',
            user_id: user.id,
            email: user.email,
            message: 'User has no assigned roles'
          });
        }
      }

      return {
        stats,
        issues,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get user integrity report:', error);
      throw error;
    }
  }
}

module.exports = AdminMaintenanceService;