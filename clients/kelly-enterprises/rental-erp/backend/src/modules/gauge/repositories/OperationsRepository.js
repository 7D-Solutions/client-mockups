const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class OperationsRepository extends BaseRepository {
  constructor() {
    super('gauges', 'id');
  }

  async getGaugeDetails(gaugeId) {
    try {
      const query = `
        SELECT 
          g.id, g.gauge_id, g.name, g.manufacturer, g.model_number, 
          g.equipment_type, g.serial_number, g.status, 
          g.ownership_type, g.category_id,
          g.measurement_range_min, g.measurement_range_max,
          g.calibration_frequency_days,
          g.is_sealed, g.created_at, g.updated_at,
          ac.checked_out_to as checked_out_to, ac.checkout_date as checkout_date, 
          ac.department,
          u.name as checked_out_to_name, u.email as checked_out_to_email,
          gcs.next_due_date as calibration_due_date
        FROM gauges g
        LEFT JOIN gauge_active_checkouts ac ON g.id = ac.gauge_id
        LEFT JOIN core_users u ON ac.checked_out_to = u.id
        LEFT JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id AND gcs.is_active = 1
        WHERE g.gauge_id = ? AND g.is_active = 1
      `;

      const rows = await this.executeQuery(query, [gaugeId]);
      return rows[0] || null;
    } catch (error) {
      logger.error(`Failed to get gauge details for gaugeId ${gaugeId}:`, error);
      throw error;
    }
  }

  async createQCRecord(qcData) {
    try {
      const data = {
        gauge_id: qcData.gauge_id,
        checked_by: qcData.inspector_id,
        check_date: new Date(),
        check_type: qcData.check_type || 'return',
        passed: qcData.pass_fail === 'pass' ? 1 : 0,
        findings: JSON.stringify({ 
          condition_rating: qcData.condition_rating,
          notes: qcData.notes 
        }),
        corrective_action: qcData.corrective_action || null,
        next_action: qcData.next_action || (qcData.pass_fail === 'pass' ? 'available' : 'calibration')
      };

      // Note: This would need a proper table name in BaseRepository - using direct query for now
      const query = `
        INSERT INTO gauge_qc_checks (
          gauge_id, checked_by, check_date, check_type,
          passed, findings, corrective_action, next_action
        ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)
      `;
      
      const result = await this.executeQuery(query, [
        data.gauge_id, data.checked_by, data.check_type,
        data.passed, data.findings, data.corrective_action, data.next_action
      ]);

      return { id: result.insertId };
    } catch (error) {
      logger.error(`Failed to create QC record for gauge_id ${qcData.gauge_id}:`, error);
      throw error;
    }
  }

  async getQCHistory(gaugeId) {
    try {
      const query = `
        SELECT 
          qc.id, qc.check_date, qc.check_type,
          qc.passed, qc.findings, qc.corrective_action, qc.next_action,
          u.name as inspector_name
        FROM gauge_qc_checks qc
        JOIN core_users u ON qc.checked_by = u.id
        WHERE qc.gauge_id = ?
        ORDER BY qc.check_date DESC
        LIMIT 10
      `;

      const rows = await this.executeQuery(query, [gaugeId]);
      return rows;
    } catch (error) {
      logger.error(`Failed to get QC history for gauge_id ${gaugeId}:`, error);
      throw error;
    }
  }
}

module.exports = OperationsRepository;