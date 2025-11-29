const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class ReportsRepository extends BaseRepository {
  constructor() {
    super('gauges', 'id');
  }
  async getDashboardSummary() {
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM gauges WHERE status = "available"',
        'SELECT COUNT(*) as overdue FROM gauges WHERE status = "calibration_due"',
        `SELECT COUNT(*) as overdue_cal FROM gauges g
         JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id
         WHERE gcs.next_due_date < CURDATE() AND g.status = "available" AND gcs.is_active = 1`,
        `SELECT COUNT(*) as due_soon FROM gauges g
         JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id
         WHERE gcs.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         AND g.status = "available" AND gcs.is_active = 1`,
        'SELECT COUNT(*) as company FROM gauges WHERE ownership_type = "company_owned"',
        'SELECT COUNT(*) as employee FROM gauges WHERE ownership_type = "customer_owned"',
        'SELECT COUNT(*) as out_of_service FROM gauges WHERE status = "out_of_service"'
      ];

      const results = await Promise.all(queries.map(query => this.executeQuery(query)));

      return {
        total_active: results[0][0].total,
        status_overdue: results[1][0].overdue,
        overdue_calibration: results[2][0].overdue_cal,
        due_soon: results[3][0].due_soon,
        company_owned: results[4][0].company,
        employee_owned: results[5][0].employee,
        out_of_service: results[6][0].out_of_service
      };
    } catch (error) {
      logger.error('Failed to get dashboard summary:', error);
      throw error;
    }
  }

  async getOverdueCalibrations() {
    try {
      const rows = await this.executeQuery(`
        SELECT 
          g.gauge_id, g.name, g.manufacturer, g.model_number, 
          gcs.next_due_date as calibration_due_date,
          g.ownership_type
        FROM gauges g
        JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id
        WHERE gcs.next_due_date < CURDATE() AND g.status = 'available' AND gcs.is_active = 1
        ORDER BY gcs.next_due_date ASC
      `);

      return rows;
    } catch (error) {
      logger.error('Failed to get overdue calibrations:', error);
      throw error;
    }
  }

  async getGaugeHistory(gaugeId) {
    try {
      // First verify gauge exists and get its database ID
      // Handle both numeric ID and gauge_id string (gauge_id is the universal public identifier)
      const gaugeRows = await this.executeQuery(
        'SELECT id FROM gauges WHERE gauge_id = ? OR id = ?',
        [gaugeId, gaugeId]
      );

      if (gaugeRows.length === 0) {
        return null;
      }

      const rows = await this.executeQuery(`
        SELECT 
          gt.created_at as action_date,
          gt.action,
          gt.user_id,
          cu.name as user_name,
          gt.related_user_id,
          ru.name as related_user_name,
          gt.location,
          gt.notes
        FROM gauge_transactions gt
        LEFT JOIN core_users cu ON gt.user_id = cu.id
        LEFT JOIN core_users ru ON gt.related_user_id = ru.id
        WHERE gt.gauge_id = ?
        ORDER BY gt.created_at DESC
      `, [gaugeRows[0].id]);

      return rows;
    } catch (error) {
      logger.error(`Failed to get gauge history for gaugeId ${gaugeId}:`, error);
      throw error;
    }
  }

  async getGaugesByStatus(status) {
    try {
      const rows = await this.executeQuery(`
        SELECT 
          g.id, g.gauge_id, g.name, g.status, g.equipment_type,
          g.manufacturer, g.model_number, g.serial_number,
          g.ownership_type
        FROM gauges g
        WHERE g.status = ?
        ORDER BY g.gauge_id ASC
      `, [status]);
      return rows;
    } catch (error) {
      logger.error(`Failed to get gauges by status ${status}:`, error);
      throw error;
    }
  }

  async getCheckoutHistory(gaugeId) {
    try {
      const gaugeRows = await this.executeQuery(
        'SELECT id FROM gauges WHERE gauge_id = ?',
        [gaugeId]
      );

      if (gaugeRows.length === 0) {
        return [];
      }

      const rows = await this.executeQuery(`
        SELECT 
          cal.timestamp as checkout_date,
          cal.user_id,
          cu.name as user_name,
          cal.details
        FROM core_audit_log cal
        LEFT JOIN core_users cu ON cal.user_id = cu.id
        WHERE cal.table_name = 'gauges' 
          AND cal.record_id = ?
          AND cal.action LIKE '%checkout%'
        ORDER BY cal.timestamp DESC
      `, [gaugeRows[0].id]);

      return rows;
    } catch (error) {
      logger.error(`Failed to get checkout history for gaugeId ${gaugeId}:`, error);
      throw error;
    }
  }
}

module.exports = ReportsRepository;