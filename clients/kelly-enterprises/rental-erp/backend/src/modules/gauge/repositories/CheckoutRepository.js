const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class CheckoutRepository extends BaseRepository {
  constructor() {
    super('gauge_active_checkouts', 'id');
  }

  async checkout(gaugeId, opts, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      if (!conn) await connection.beginTransaction();

      // First get the internal ID if a string gauge_id was passed
      let internalGaugeId = gaugeId;
      if (typeof gaugeId === 'string' && isNaN(gaugeId)) {
        const query = 'SELECT id FROM gauges WHERE gauge_id = ?';
        const result = await this.executeQuery(query, [gaugeId], connection);
        const gaugeRow = result[0]?.[0];
        if (!gaugeRow) throw new Error('Gauge not found');
        internalGaugeId = gaugeRow.id;
      }

      // Ensure not large_equipment
      const query = 'SELECT equipment_type, status, is_sealed FROM gauges WHERE id = ? FOR UPDATE';
      const result = await this.executeQuery(query, [internalGaugeId], connection);
      const g = result[0]?.[0];
      if (!g) throw new Error('Gauge not found');
      if (g.equipment_type === 'large_equipment') throw new Error('Fixed-location equipment cannot be checked out');
      if (g.is_sealed) throw new Error('Sealed gauge requires approval');
      if (['calibration_due','out_of_service'].includes(g.status)) {
        if (g.status === 'calibration_due') {
          throw new Error('Gauge requires calibration');
        }
        throw new Error('Gauge not available');
      }

      // Extract userId from opts (could be opts.userId or just opts if it's the userId directly)
      const userId = opts.userId || opts;
      const department = opts.department || null;

      // Create checkout record
      const checkoutData = {
        gauge_id: internalGaugeId,
        checked_out_to: userId,
        department: department,
        checkout_date: new Date()
      };
      
      await this.create(checkoutData, connection);
      
      // Update gauge status
      const updateQuery = 'UPDATE gauges SET status = ? WHERE id = ?';
      await this.executeQuery(updateQuery, ['checked_out', internalGaugeId], connection);
      
      // Log the checkout
      const auditQuery = `INSERT INTO core_audit_log (user_id, action, table_name, record_id, details, timestamp)
                          VALUES (?, 'gauge_checkout', 'gauges', ?, ?, NOW())`;
      const auditData = [userId, internalGaugeId, JSON.stringify({ gauge_id: gaugeId, department })];
      await this.executeQuery(auditQuery, auditData, connection);

      if (!conn) await connection.commit();
      return { success: true, gauge_id: gaugeId };
    } catch (e) {
      if (!conn) await connection.rollback();
      throw e;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  async return(gaugeId, opts, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      if (!conn) await connection.beginTransaction();

      // First get the internal ID if a string gauge_id was passed
      let internalGaugeId = gaugeId;
      if (typeof gaugeId === 'string' && isNaN(gaugeId)) {
        const query = 'SELECT id FROM gauges WHERE gauge_id = ?';
        const result = await this.executeQuery(query, [gaugeId], connection);
        const gaugeRow = result[0]?.[0];
        if (!gaugeRow) throw new Error('Gauge not found');
        internalGaugeId = gaugeRow.id;
      }

      // Extract userId from opts
      const userId = opts.userId || opts.actorUserId || opts;

      // Check if there's actually a checkout to return
      const checkQuery = 'SELECT * FROM gauge_active_checkouts WHERE gauge_id = ?';
      const result = await this.executeQuery(checkQuery, [internalGaugeId], connection);
      const checkout = result[0]?.[0];
      
      if (checkout) {
        // Delete checkout record
        const deleteQuery = 'DELETE FROM gauge_active_checkouts WHERE gauge_id = ?';
        await this.executeQuery(deleteQuery, [internalGaugeId], connection);
        
        // Update gauge status
        const updateQuery = 'UPDATE gauges SET status = ? WHERE id = ?';
        await this.executeQuery(updateQuery, ['available', internalGaugeId], connection);
        
        // Log the return
        const auditQuery = `INSERT INTO core_audit_log (user_id, action, table_name, record_id, details, timestamp)
                           VALUES (?, 'gauge_return', 'gauges', ?, ?, NOW())`;
        const auditData = [userId, internalGaugeId, JSON.stringify({ gauge_id: gaugeId })];
        await this.executeQuery(auditQuery, auditData, connection);
      }

      // No location updates allowed per field rules

      if (!conn) await connection.commit();
      return { success: true, gauge_id: gaugeId };
    } catch (e) {
      if (!conn) await connection.rollback();
      throw e;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  async getActiveCheckout(gaugeId) {
    try {
      // Handle both string gauge_id and internal id
      let whereClause, param;
      
      if (typeof gaugeId === 'string' && isNaN(gaugeId)) {
        // String gauge_id like "TPG001A" - gauge_id is the universal public identifier
        whereClause = 'g.gauge_id = ?';
        param = gaugeId;
      } else {
        // Numeric internal ID like 34
        whereClause = 'ac.gauge_id = ?';
        param = gaugeId;
      }
      
      const query = `
        SELECT 
          ac.gauge_id, ac.checked_out_to as checked_out_to, 
          ac.checkout_date as checkout_date, ac.department,
          u.name as checked_out_to_name, u.email as checked_out_to_email,
          g.gauge_id as display_gauge_id
        FROM gauge_active_checkouts ac
        JOIN gauges g ON ac.gauge_id = g.id
        JOIN core_users u ON ac.checked_out_to = u.id
        WHERE ${whereClause}
      `;
      
      const params = whereClause.includes('OR') ? [param, param] : [param];
      const rows = await this.executeQuery(query, params);
      return rows[0] || null;
    } catch (error) {
      logger.error(`Failed to get active checkout for gauge ${gaugeId}:`, error);
      throw error;
    }
  }

  async createCheckout(checkoutData) {
    try {
      // Get internal gauge ID if needed
      let internalGaugeId = checkoutData.gauge_id;
      if (typeof checkoutData.gauge_id === 'string' && isNaN(checkoutData.gauge_id)) {
        const query = 'SELECT id FROM gauges WHERE gauge_id = ?';
        const result = await this.executeQuery(query, [checkoutData.gauge_id]);
        const gaugeRow = result[0]?.[0];
        if (!gaugeRow) throw new Error('Gauge not found');
        internalGaugeId = gaugeRow.id;
      }
      
      // First, delete any existing checkout for this gauge
      const deleteQuery = 'DELETE FROM gauge_active_checkouts WHERE gauge_id = ?';
      await this.executeQuery(deleteQuery, [internalGaugeId]);
      
      // Create new checkout using BaseRepository
      const data = {
        gauge_id: internalGaugeId,
        checked_out_to: checkoutData.user_id,
        department: checkoutData.department,
        checkout_date: new Date()
      };
      
      await this.create(data);
      return { gauge_id: checkoutData.gauge_id };
    } catch (error) {
      logger.error(`Failed to create checkout for gauge ${checkoutData.gauge_id}:`, error);
      throw error;
    }
  }

  async getOverdueCheckouts() {
    try {
      const query = `
        SELECT
          ac.gauge_id, ac.checked_out_to as user_id, ac.checkout_date as checked_out_at,
          g.gauge_id, g.name,
          u.name as user_name, u.email
        FROM gauge_active_checkouts ac
        JOIN gauges g ON ac.gauge_id = g.id
        JOIN core_users u ON ac.checked_out_to = u.id
        WHERE ac.checkout_date < DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY ac.checkout_date ASC
      `;
      
      const rows = await this.executeQuery(query);
      return rows;
    } catch (error) {
      logger.error('Failed to get overdue checkouts:', error);
      throw error;
    }
  }

  async getCheckoutStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_active,
          COUNT(CASE WHEN ac.checkout_date < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as overdue_7days,
          COUNT(CASE WHEN ac.checkout_date < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as overdue_30days,
          AVG(DATEDIFF(NOW(), ac.checkout_date)) as avg_days_out
        FROM gauge_active_checkouts ac
      `;
      
      const rows = await this.executeQuery(query);
      return rows[0];
    } catch (error) {
      logger.error('Failed to get checkout stats:', error);
      throw error;
    }
  }

  async completeCheckout(gaugeId) {
    try {
      // Get internal gauge ID if needed
      let internalGaugeId = gaugeId;
      if (typeof gaugeId === 'string' && isNaN(gaugeId)) {
        const query = 'SELECT id FROM gauges WHERE gauge_id = ?';
        const result = await this.executeQuery(query, [gaugeId]);
        const gaugeRow = result[0]?.[0];
        if (!gaugeRow) throw new Error('Gauge not found');
        internalGaugeId = gaugeRow.id;
      }
      
      // Simply delete from active checkouts since it doesn't track returns
      const deleteQuery = 'DELETE FROM gauge_active_checkouts WHERE gauge_id = ?';
      await this.executeQuery(deleteQuery, [internalGaugeId]);
    } catch (error) {
      logger.error(`Failed to complete checkout for gauge ${gaugeId}:`, error);
      throw error;
    }
  }
}

module.exports = CheckoutRepository;