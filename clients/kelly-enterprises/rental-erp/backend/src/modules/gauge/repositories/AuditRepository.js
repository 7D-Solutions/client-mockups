const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class AuditRepository extends BaseRepository {
  constructor() {
    super('core_audit_log', 'id');
  }

  setPool(pool) {
    this.pool = pool;
  }

  async createAuditLog(auditData) {
    try {
      const data = {
        user_id: auditData.user_id,
        action: auditData.action,
        entity_type: auditData.table_name || auditData.entity_type,
        entity_id: auditData.record_id || auditData.entity_id,
        new_values: auditData.details || auditData.new_values,
        module_id: 'gauge',
        created_at: new Date()
      };
      
      const result = await this.create(data);
      return { id: result.insertId || result.id };
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      throw error;
    }
  }

  async getAuditHistory(tableName, recordId, limit = 50) {
    try {
      // Validate limit parameter
      const validLimit = this.validateIntegerParameter(limit, 'limit', 1, 1000);
      
      const query = `
        SELECT 
          cal.id, cal.created_at as timestamp, cal.action, cal.new_values as details,
          cal.user_id, u.name as user_name, u.email as user_email
        FROM core_audit_log cal
        LEFT JOIN core_users u ON cal.user_id = u.id
        WHERE cal.entity_type = ? AND cal.entity_id = ?
        ORDER BY cal.created_at DESC
        LIMIT ?
      `;
      
      const rows = await this.executeQuery(query, [tableName, recordId, validLimit]);
      return rows;
    } catch (error) {
      logger.error(`Failed to get audit history for ${tableName}:${recordId}:`, error);
      throw error;
    }
  }

  async getUserAuditHistory(userId, limit = 50) {
    try {
      // Validate limit parameter
      const validLimit = this.validateIntegerParameter(limit, 'limit', 1, 1000);
      
      const query = `
        SELECT 
          id, created_at as timestamp, action, entity_type as table_name, 
          entity_id as record_id, new_values as details, module_id as event_type
        FROM core_audit_log
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const rows = await this.executeQuery(query, [userId, validLimit]);
      return rows;
    } catch (error) {
      logger.error(`Failed to get user audit history for ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new AuditRepository();