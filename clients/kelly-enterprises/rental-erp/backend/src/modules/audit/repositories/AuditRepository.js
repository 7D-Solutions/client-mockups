const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

class AuditRepository extends BaseRepository {
  constructor() {
    super('audit_logs', 'id');
  }

  /**
   * Log a frontend audit event
   */
  async logFrontendEvent(eventData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [result] = await connection.execute(
        `INSERT INTO audit_logs 
         (user_id, action, table_name, details, ip_address, user_agent, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          eventData.userId || null,
          `frontend_${eventData.action}`,
          eventData.entity,
          JSON.stringify(eventData.details || {}),
          eventData.ipAddress || 'unknown',
          eventData.userAgent || 'unknown'
        ]
      );
      
      return { id: result.insertId, ...eventData };
    } catch (error) {
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = AuditRepository;