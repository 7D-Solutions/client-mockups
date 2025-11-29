/**
 * Audit System Health Monitoring Endpoints
 * Provides health checks and integrity verification for AS9102 compliance
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncErrorHandler } = require('../middleware/errorHandler');
const { checkPermission } = require('../middleware/checkPermission');
const auditService = require('../audit/auditService');
const { pool } = require('../database/connection');

const router = express.Router();

/**
 * Get audit system health status
 * Requires: audit.view permission
 */
router.get('/health', authenticateToken, checkPermission('audit', 'view'), asyncErrorHandler(async (req, res) => {

  try {
    // Get audit statistics
    const stats = await auditService.getAuditStatistics();
    
    // Check database connectivity
    const [dbCheck] = await pool.execute('SELECT 1');
    
    // Check last successful audit entry
    const [lastEntry] = await pool.execute(
      'SELECT MAX(timestamp) as last_entry FROM audit_logs'
    );
    
    // Check storage capacity
    const [storageCheck] = await pool.execute(`
      SELECT 
        table_name,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
        table_rows as row_count
      FROM information_schema.TABLES 
      WHERE table_schema = ? AND table_name = 'audit_logs'
    `, [process.env.DB_NAME || 'fai_db_sandbox']);
    
    // Check hash chain integrity (last 100 entries)
    const [maxId] = await pool.execute('SELECT MAX(id) as max_id FROM audit_logs');
    const startId = Math.max(1, (maxId[0].max_id || 100) - 100);
    const integrityCheck = await auditService.verifyIntegrity(startId);
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: dbCheck ? 'connected' : 'disconnected',
          lastEntry: lastEntry[0].last_entry
        },
        storage: {
          tableSizeMB: storageCheck[0]?.size_mb || 0,
          rowCount: storageCheck[0]?.row_count || 0,
          status: storageCheck[0]?.size_mb < 1000 ? 'healthy' : 'warning'
        },
        integrity: {
          status: integrityCheck.valid ? 'valid' : 'compromised',
          checkedEntries: integrityCheck.totalEntries,
          invalidEntries: integrityCheck.invalidEntries.length
        },
        statistics: stats
      }
    };
    
    // Determine overall health
    if (!dbCheck || !integrityCheck.valid) {
      health.status = 'critical';
    } else if (storageCheck[0]?.size_mb > 1000) {
      health.status = 'warning';
    }
    
    res.json({
      success: true,
      health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check audit health',
      message: error.message
    });
  }
}));

/**
 * Verify audit log integrity
 * Requires: audit.view permission
 */
router.post('/verify-integrity', authenticateToken, checkPermission('audit', 'view'), asyncErrorHandler(async (req, res) => {

  const { startId, endId } = req.body;
  
  try {
    const result = await auditService.verifyIntegrity(startId, endId);
    
    // Log the verification
    await pool.execute(`
      INSERT INTO audit_log_integrity 
      (start_id, end_id, total_entries, valid_entries, invalid_entries, verification_status, details, verified_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      startId || 1,
      endId || 'NULL',
      result.totalEntries,
      result.totalEntries - result.invalidEntries.length,
      result.invalidEntries.length,
      result.valid ? 'passed' : 'failed',
      JSON.stringify(result),
      req.user.user_id
    ]);
    
    res.json({
      success: true,
      verification: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify integrity',
      message: error.message
    });
  }
}));

/**
 * Export audit logs for compliance inspection
 * Requires: audit.view permission
 */
router.post('/export', authenticateToken, checkPermission('audit', 'view'), asyncErrorHandler(async (req, res) => {

  const { startDate, endDate, userId, action, tableName, format = 'json' } = req.body;
  
  try {
    const exportData = await auditService.exportAuditLogs({
      startDate,
      endDate,
      userId,
      action,
      tableName
    });
    
    // Log the export
    await pool.execute(`
      INSERT INTO audit_log_exports 
      (exported_by, start_date, end_date, filters, total_entries, export_format, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.user_id,
      startDate || null,
      endDate || null,
      JSON.stringify({ userId, action, tableName }),
      exportData.totalEntries,
      format,
      req.body.purpose || 'Compliance inspection'
    ]);
    
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData.entries);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        export: exportData
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs',
      message: error.message
    });
  }
}));

/**
 * Get audit log statistics
 * Requires: audit.view permission
 */
router.get('/statistics', authenticateToken, checkPermission('audit', 'view'), asyncErrorHandler(async (req, res) => {

  try {
    const stats = await auditService.getAuditStatistics();
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get audit statistics',
      message: error.message
    });
  }
}));

/**
 * Archive old audit logs
 * Requires: audit.view permission (admin level operation)
 */
router.post('/archive', authenticateToken, checkPermission('audit', 'view'), asyncErrorHandler(async (req, res) => {

  try {
    // Call the archive stored procedure
    await pool.execute('CALL archive_audit_logs()');
    
    // Get archive statistics
    const [archiveStats] = await pool.execute(`
      SELECT COUNT(*) as archived_count 
      FROM audit_logs_archive 
      WHERE DATE(timestamp) = CURDATE()
    `);
    
    res.json({
      success: true,
      message: 'Audit logs archived successfully',
      archivedToday: archiveStats[0].archived_count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to archive audit logs',
      message: error.message
    });
  }
}));

/**
 * Helper function to convert audit entries to CSV
 */
function convertToCSV(entries) {
  if (!entries || entries.length === 0) {
    return 'No data';
  }
  
  const headers = [
    'ID', 'Timestamp', 'User ID', 'Username', 'Full Name', 
    'Action', 'Table', 'Record ID', 'Event Type', 'Severity',
    'IP Address', 'User Agent', 'Details'
  ];
  
  const rows = entries.map(entry => [
    entry.id,
    entry.timestamp,
    entry.user_id || '',
    entry.username || '',
    entry.full_name || '',
    entry.action,
    entry.table_name || '',
    entry.record_id || '',
    entry.event_type || '',
    entry.severity_level || '',
    entry.ip_address || '',
    entry.user_agent || '',
    JSON.stringify(entry.details || {})
  ]);
  
  // Escape CSV values
  const escapeCSV = (value) => {
    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');
  
  return csvContent;
}

module.exports = router;