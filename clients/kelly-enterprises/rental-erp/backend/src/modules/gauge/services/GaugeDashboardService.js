const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

/**
 * GaugeDashboardService - Dashboard-specific business logic
 * Handles user-specific gauge filtering and dashboard statistics
 */
class GaugeDashboardService {
  /**
   * Get dashboard counts for a specific user
   */
  async getUserDashboardCounts(userId) {
    const gaugeService = serviceRegistry.get('GaugeService');
    const result = await gaugeService.searchGauges({});
    const allGauges = result.gauges || [];

    return {
      checkedOut: allGauges.filter(g =>
        g.status === 'checked_out' && String(g.checked_out_to) === String(userId)
      ).length,
      personal: allGauges.filter(g =>
        g.ownership_type === 'employee' && String(g.employee_owner_id) === String(userId)
      ).length,
      transfers: allGauges.filter(g =>
        g.pending_transfer_id && (
          String(g.transfer_to_user_id) === String(userId) ||
          String(g.transfer_from_user_id) === String(userId)
        )
      ).length
    };
  }

  /**
   * Get all gauges for a specific user
   */
  async getUserDashboardGauges(userId) {
    const gaugeService = serviceRegistry.get('GaugeService');
    const result = await gaugeService.searchGauges({});
    const allGauges = result.gauges || [];

    const myGauges = allGauges.filter(gauge => {
      const isPersonalTool = gauge.ownership_type === 'employee' &&
        String(gauge.employee_owner_id) === String(userId);
      const isCheckedOutByMe = gauge.status === 'checked_out' &&
        String(gauge.checked_out_to) === String(userId);
      const hasPendingTransfer = gauge.pending_transfer_id && (
        String(gauge.transfer_to_user_id) === String(userId) ||
        String(gauge.transfer_from_user_id) === String(userId)
      );

      return isPersonalTool || isCheckedOutByMe || hasPendingTransfer;
    });

    return { gauges: myGauges, total: myGauges.length };
  }

  /**
   * Get category counts by equipment type and ownership
   */
  async getCategoryCounts() {
    const gaugeService = serviceRegistry.get('GaugeService');
    const result = await gaugeService.getAllGauges();
    const allGauges = Array.isArray(result) ? result : (result?.gauges || []);
    const activeGauges = allGauges.filter(g => !g.is_deleted);

    return {
      thread: activeGauges.filter(g => g.equipment_type === 'thread_gauge').length,
      company: activeGauges.filter(g =>
        g.equipment_type === 'hand_tool' && g.ownership_type === 'company'
      ).length,
      employee: activeGauges.filter(g =>
        g.equipment_type === 'hand_tool' && g.ownership_type === 'employee'
      ).length,
      large: activeGauges.filter(g => g.equipment_type === 'large_equipment').length,
      total: activeGauges.length
    };
  }

  /**
   * Get active users for transfer operations
   */
  async getActiveUsersForTransfer() {
    const adminService = serviceRegistry.get('AdminService');
    const result = await adminService.getAllUsers(1, 1000);

    const activeUsers = result.users
      .filter(user => user.isActive === true || user.isActive === 1)
      .map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        email: user.email,
        roles: user.roles
      }));

    logger.info('Active users filtered for transfer', {
      activeCount: activeUsers.length,
      totalCount: result.users.length
    });

    return activeUsers;
  }
}

module.exports = new GaugeDashboardService();
