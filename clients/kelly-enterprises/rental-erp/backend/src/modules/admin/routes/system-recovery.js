const express = require('express');
const { authenticateToken, requireSuperAdmin } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const AdminService = require('../services/adminService');
const AdminRepository = require('../repositories/AdminRepository');
const logger = require('../../../infrastructure/utils/logger');

const router = express.Router();

// Initialize service with repository
const adminRepository = new AdminRepository();
const adminService = new AdminService(adminRepository);

// GET /api/system-recovery/gauge/:gaugeId - Get gauge state and available recovery actions
router.get('/gauge/:gaugeId', authenticateToken, requireSuperAdmin, asyncErrorHandler(async (req, res) => {
  const { gaugeId } = req.params;
  
  try {
    const gaugeDetails = await adminRepository.getGaugeDetailsForRecovery(gaugeId);
    
    if (!gaugeDetails) {
      return res.status(404).json({ success: false, error: 'Gauge not found' });
    }
    
    const { gauge, pendingTransfers, pendingUnsealRequests, activeAssignments, lastCalibration } = gaugeDetails;
    
    // Determine recovery actions based on state
    const recoveryActions = [];
    const statusIssues = [];
    
    // Check for stuck transfers
    if (pendingTransfers.length > 0) {
      statusIssues.push('Has pending transfers');
      recoveryActions.push({
        action: 'cancel_transfers',
        description: 'Cancel all pending transfers for this gauge',
        impact: 'medium',
        data: pendingTransfers
      });
    }
    
    // Check for stuck unseal requests
    if (pendingUnsealRequests.length > 0) {
      statusIssues.push('Has pending unseal requests');
      recoveryActions.push({
        action: 'clear_unseal_requests',
        description: 'Clear pending unseal requests',
        impact: 'low',
        data: pendingUnsealRequests
      });
    }
    
    // Check for status mismatches
    if (gauge.status === 'checked_out' && activeAssignments.length === 0) {
      statusIssues.push('Status shows checked out but no active assignment');
      recoveryActions.push({
        action: 'reset_status',
        description: 'Reset gauge status to available',
        impact: 'high',
        targetStatus: 'available'
      });
    }
    
    if (gauge.status !== 'checked_out' && activeAssignments.length > 0) {
      statusIssues.push('Has active assignment but status is not checked out');
      recoveryActions.push({
        action: 'clear_assignments',
        description: 'Clear active assignments and reset status',
        impact: 'high',
        data: activeAssignments
      });
    }
    
    // Check calibration status
    const isOverdue = lastCalibration && new Date(lastCalibration.due_date) < new Date();
    if (isOverdue && gauge.status !== 'calibration_due') {
      statusIssues.push('Calibration overdue but status not updated');
      recoveryActions.push({
        action: 'update_calibration_status',
        description: 'Update status to calibration_due',
        impact: 'medium',
        targetStatus: 'calibration_due'
      });
    }
    
    res.json({
      success: true,
      data: {
        gauge: {
          id: gauge.id,
          gauge_id: gauge.gauge_id,
          status: gauge.status,
          checked_out_by: gauge.checked_out_by_user_id,
          created_at: gauge.created_at,
          updated_at: gauge.updated_at
        },
        status_issues: statusIssues,
        recovery_actions: recoveryActions,
        related_data: {
          pending_transfers: pendingTransfers,
          pending_unseal_requests: pendingUnsealRequests,
          active_assignments: activeAssignments,
          calibration_overdue: isOverdue
        }
      }
    });
  } catch (error) {
    logger.error('Error getting gauge recovery info:', { gaugeId, error });
    throw error;
  }
}));

// POST /api/system-recovery/gauge/:gaugeId/execute - Execute recovery actions
router.post('/gauge/:gaugeId/execute', authenticateToken, requireSuperAdmin, asyncErrorHandler(async (req, res) => {
  const { gaugeId } = req.params;
  const { action, force = false } = req.body;
  
  try {
    const gaugeDetails = await adminRepository.getGaugeDetailsForRecovery(gaugeId);
    
    if (!gaugeDetails) {
      return res.status(404).json({ success: false, error: 'Gauge not found' });
    }
    
    const { gauge } = gaugeDetails;
    
    logger.warn('System recovery action initiated', {
      gaugeId,
      action,
      force,
      admin: req.user.email
    });
    
    let result = { success: false, message: 'Unknown action' };
    
    switch (action) {
      case 'reset_status':
        await adminRepository.updateGaugeStatus(gauge.id, 'available');
        result = { success: true, message: 'Gauge status reset to available' };
        break;
        
      case 'cancel_transfers':
        // TODO: Implement transfer cancellation in gauge module
        result = { success: false, message: 'Transfer cancellation not implemented yet' };
        break;
        
      case 'clear_unseal_requests':
        // TODO: Implement unseal request clearing in gauge module
        result = { success: false, message: 'Unseal request clearing not implemented yet' };
        break;
        
      case 'clear_assignments':
        // TODO: Implement assignment clearing in gauge module
        result = { success: false, message: 'Assignment clearing not implemented yet' };
        break;
        
      case 'update_calibration_status':
        await adminRepository.updateGaugeStatus(gauge.id, 'calibration_due');
        result = { success: true, message: 'Gauge status updated to calibration_due' };
        break;
        
      default:
        result = { success: false, message: 'Invalid recovery action' };
    }
    
    // Log the recovery action
    if (result.success) {
      logger.info('System recovery action completed', {
        gaugeId,
        action,
        result,
        admin: req.user.email
      });
    }
    
    res.json(result);
  } catch (error) {
    logger.error('Error executing recovery action:', { gaugeId, action, error });
    throw error;
  }
}));

module.exports = router;