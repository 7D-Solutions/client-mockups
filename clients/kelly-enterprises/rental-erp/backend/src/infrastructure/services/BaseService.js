const dbConnection = require('../database/connection');
const logger = require('../utils/logger');

class BaseService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.pool = options.pool || null;
    this.auditService = options.auditService || null;
  }

  async executeInTransaction(operation, auditData = null) {
    // Use service-specific pool if available, otherwise use global pool
    const pool = this.pool || dbConnection.getPool();
    if (!pool) {
      throw new Error('Database pool not initialized');
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await operation(connection);
      
      if (auditData && this.auditService) {
        await this.auditService.logAction({
          ...auditData,
          details: { ...auditData.details, result }
        }, connection);
      }
      
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error(`Transaction failed: ${error.message}`);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = BaseService;