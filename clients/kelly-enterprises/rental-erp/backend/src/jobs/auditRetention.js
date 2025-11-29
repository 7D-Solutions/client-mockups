const { pool } = require('../infrastructure/database/connection');
const logger = require('../infrastructure/utils/logger');

/**
 * Run audit log retention policy
 * Archives old audit logs and then deletes them based on configured retention period
 * @returns {object} Result of archive and delete operations
 */
async function runAuditRetention() {
  const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '5475', 10); // Default 15 years
  const batchSize = parseInt(process.env.AUDIT_ARCHIVE_BATCH || '20000', 10);
  
  logger.info(`Starting audit retention job - retention: ${retentionDays} days, batch: ${batchSize} rows`);
  
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');
    
    // Get old records to archive
    const [recordsToArchive] = await connection.execute(
      "SELECT * FROM audit_logs WHERE created_at < ? LIMIT ?",
      [cutoffDateStr, String(batchSize)]
    );
    
    let archivedCount = 0;
    
    // Archive records one by one (more reliable for complex schemas)
    for (const record of recordsToArchive) {
      try {
        await connection.execute(
          `INSERT IGNORE INTO audit_logs_archive 
           (id, user_id, action, table_name, record_id, details, ip_address, user_agent, event_type, severity_level, hash_chain, digital_signature, previous_hash, created_at, archived_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            record.id, record.user_id, record.action, record.table_name, record.record_id,
            record.details, record.ip_address, record.user_agent, record.event_type,
            record.severity_level, record.hash_chain, record.digital_signature,
            record.previous_hash, record.created_at
          ]
        );
        archivedCount++;
      } catch (error) {
        logger.warn(`Failed to archive record ${record.id}:`, error.message);
      }
    }
    
    // Delete archived records
    const deleteQuery = `
      DELETE FROM audit_logs 
      WHERE created_at < ? 
      LIMIT ?
    `;
    
    const [deleteResult] = await connection.execute(deleteQuery, [cutoffDateStr, String(batchSize)]);
    const deletedCount = deleteResult.affectedRows;
    
    await connection.commit();
    
    const result = {
      success: true,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      archived: archivedCount,
      deleted: deletedCount,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`Audit retention completed: ${archivedCount} archived, ${deletedCount} deleted`);
    
    // Log this operation to audit log
    await logRetentionOperation(result);
    
    return result;
    
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error('Audit retention failed:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Log retention operation to audit log
 * @param {object} result - Result of retention operation
 */
async function logRetentionOperation(result) {
  try {
    const auditEntry = {
      user_id: null, // System operation
      table_name: 'audit_logs',
      record_id: null,
      action: 'RETENTION',
      details: JSON.stringify({
        operation: 'audit_retention',
        archived: result.archived,
        deleted: result.deleted,
        cutoff_date: result.cutoffDate,
        retention_days: result.retentionDays
      }),
      ip_address: '127.0.0.1',
      user_agent: 'System/AuditRetentionJob'
    };
    
    await pool.execute(
      `INSERT INTO audit_logs (user_id, table_name, record_id, action, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      Object.values(auditEntry)
    );
  } catch (error) {
    logger.error('Failed to log retention operation:', error);
  }
}

/**
 * Get audit log age statistics
 * @returns {object} Age bucket statistics
 */
async function getAuditAgeStatistics() {
  try {
    const query = `
      SELECT 
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as less_than_30_days,
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 90 DAY) 
                 AND created_at <= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as days_30_to_90,
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 180 DAY) 
                 AND created_at <= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) as days_90_to_180,
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 365 DAY) 
                 AND created_at <= DATE_SUB(NOW(), INTERVAL 180 DAY) THEN 1 ELSE 0 END) as days_180_to_365,
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 2 YEAR) 
                 AND created_at <= DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN 1 ELSE 0 END) as years_1_to_2,
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 5 YEAR) 
                 AND created_at <= DATE_SUB(NOW(), INTERVAL 2 YEAR) THEN 1 ELSE 0 END) as years_2_to_5,
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 10 YEAR) 
                 AND created_at <= DATE_SUB(NOW(), INTERVAL 5 YEAR) THEN 1 ELSE 0 END) as years_5_to_10,
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 15 YEAR) 
                 AND created_at <= DATE_SUB(NOW(), INTERVAL 10 YEAR) THEN 1 ELSE 0 END) as years_10_to_15,
        SUM(CASE WHEN created_at <= DATE_SUB(NOW(), INTERVAL 15 YEAR) THEN 1 ELSE 0 END) as older_than_15_years,
        COUNT(*) as total_records,
        MIN(created_at) as oldest_record,
        MAX(created_at) as newest_record
      FROM audit_logs
    `;
    
    const [results] = await pool.execute(query);
    return results[0];
  } catch (error) {
    logger.error('Failed to get audit age statistics:', error);
    throw error;
  }
}

module.exports = {
  runAuditRetention,
  getAuditAgeStatistics
};

// If run directly, execute retention
if (require.main === module) {
  runAuditRetention()
    .then(result => {
      logger.info('Audit retention completed:', result);
      process.exit(0);
    })
    .catch(error => {
      logger.error('Audit retention failed:', error);
      process.exit(1);
    });
}