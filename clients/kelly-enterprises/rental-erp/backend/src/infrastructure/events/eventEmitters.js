/**
 * Event emitter utilities for business operations
 * Provides easy integration between services and the EventBus
 */

const { eventBus, EVENT_TYPES, EVENT_PRIORITIES } = require('./EventBus');
const logger = require('../utils/logger');

/**
 * Business event emitters for different modules
 */
class EventEmitters {
  /**
   * Emit gauge-related events
   */
  static gauge = {
    created: (gaugeData, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_CREATED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        gaugeType: gaugeData.type,
        serialNumber: gaugeData.serial_number,
        department: gaugeData.department,
        createdBy: userId
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId
      });
    },
    
    updated: (gaugeData, changes, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_UPDATED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        changes: changes,
        updatedBy: userId
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId
      });
    },
    
    deleted: (gaugeData, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_DELETED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        serialNumber: gaugeData.serial_number,
        deletedBy: userId
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId
      });
    },
    
    checkedOut: (gaugeData, userCheckout, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_CHECKED_OUT, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        checkedOutBy: userCheckout.id,
        checkedOutByName: userCheckout.name,
        checkoutDate: new Date().toISOString(),
        expectedReturnDate: userCheckout.expectedReturnDate
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId
      });
    },
    
    returned: (gaugeData, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_RETURNED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        returnedBy: userId,
        returnDate: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId
      });
    },
    
    transferred: (gaugeData, fromDept, toDept, reason, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_TRANSFERRED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        fromDepartment: fromDept,
        toDepartment: toDept,
        reason: reason,
        transferredBy: userId,
        transferDate: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId
      });
    },
    
    calibrationDue: (gaugeData, dueDate) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_CALIBRATION_DUE, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        serialNumber: gaugeData.serial_number,
        currentLocation: gaugeData.location,
        dueDate: dueDate,
        daysOverdue: Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24))
      }, {
        priority: EVENT_PRIORITIES.HIGH
      });
    },
    
    calibrationCompleted: (gaugeData, calibrationData, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_CALIBRATION_COMPLETED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        calibratedBy: userId,
        calibrationDate: calibrationData.date,
        nextCalibrationDate: calibrationData.nextDueDate,
        results: calibrationData.results,
        certified: calibrationData.certified
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId
      });
    },
    
    unsealRequested: (gaugeData, reason, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_UNSEAL_REQUESTED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        requestedBy: userId,
        reason: reason,
        requestDate: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId
      });
    },
    
    unsealed: (gaugeData, approvedBy, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_UNSEALED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        unsealedBy: userId,
        approvedBy: approvedBy,
        unsealDate: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId
      });
    },
    
    sealed: (gaugeData, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.GAUGE_SEALED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        sealedBy: userId,
        sealDate: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId
      });
    }
  };
  
  /**
   * Emit QC-related events
   */
  static qc = {
    verificationStarted: (gaugeData, qcData, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.QC_VERIFICATION_STARTED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        qcInspector: userId,
        verificationType: qcData.type,
        startDate: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId
      });
    },
    
    verificationCompleted: (gaugeData, qcResults, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.QC_VERIFICATION_COMPLETED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        qcInspector: userId,
        results: qcResults.results,
        passed: qcResults.passed,
        completionDate: new Date().toISOString(),
        nextAction: qcResults.nextAction
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId
      });
    },
    
    verificationFailed: (gaugeData, failureReasons, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.QC_VERIFICATION_FAILED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        qcInspector: userId,
        failureReasons: failureReasons,
        failureDate: new Date().toISOString(),
        requiredActions: failureReasons.requiredActions || []
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId
      });
    },
    
    approvalRequired: (gaugeData, approvalData, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.QC_APPROVAL_REQUIRED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        requestedBy: userId,
        approvalType: approvalData.type,
        reason: approvalData.reason,
        urgency: approvalData.urgency || 'normal',
        requestDate: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId
      });
    },
    
    approved: (gaugeData, approvalData, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.QC_APPROVED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        approvedBy: userId,
        approvalType: approvalData.type,
        comments: approvalData.comments,
        approvalDate: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId
      });
    },
    
    rejected: (gaugeData, rejectionData, userId = null) => {
      return eventBus.emitEvent(EVENT_TYPES.QC_REJECTED, {
        gaugeId: gaugeData.id,
        gaugeName: gaugeData.name,
        rejectedBy: userId,
        rejectionReason: rejectionData.reason,
        comments: rejectionData.comments,
        requiredActions: rejectionData.requiredActions || [],
        rejectionDate: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId
      });
    }
  };
  
  /**
   * Emit user-related events
   */
  static user = {
    created: (userData, createdBy = null) => {
      return eventBus.emitEvent(EVENT_TYPES.USER_CREATED, {
        userId: userData.id,
        username: userData.name || userData.username,
        email: userData.email,
        roles: userData.roles || [],
        department: userData.department,
        createdBy: createdBy
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId: createdBy
      });
    },
    
    updated: (userData, changes, updatedBy = null) => {
      return eventBus.emitEvent(EVENT_TYPES.USER_UPDATED, {
        userId: userData.id,
        username: userData.name || userData.username,
        email: userData.email,
        changes: changes,
        updatedBy: updatedBy
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId: updatedBy
      });
    },
    
    deleted: (userData, deletedBy = null) => {
      return eventBus.emitEvent(EVENT_TYPES.USER_DELETED, {
        userId: userData.id,
        username: userData.name || userData.username,
        email: userData.email,
        deletedBy: deletedBy
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId: deletedBy
      });
    },
    
    loggedIn: (userData, loginInfo) => {
      return eventBus.emitEvent(EVENT_TYPES.USER_LOGGED_IN, {
        userId: userData.id,
        username: userData.name || userData.username,
        email: userData.email,
        ipAddress: loginInfo.ipAddress,
        userAgent: loginInfo.userAgent,
        loginTime: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.LOW,
        userId: userData.id
      });
    },
    
    loggedOut: (userData) => {
      return eventBus.emitEvent(EVENT_TYPES.USER_LOGGED_OUT, {
        userId: userData.id,
        username: userData.name || userData.username,
        logoutTime: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.LOW,
        userId: userData.id
      });
    },
    
    passwordReset: (userData, resetBy = null) => {
      return eventBus.emitEvent(EVENT_TYPES.USER_PASSWORD_RESET, {
        userId: userData.id,
        username: userData.name || userData.username,
        email: userData.email,
        resetBy: resetBy,
        resetTime: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.MEDIUM,
        userId: resetBy
      });
    },
    
    roleChanged: (userData, oldRoles, newRoles, changedBy = null) => {
      return eventBus.emitEvent(EVENT_TYPES.USER_ROLE_CHANGED, {
        userId: userData.id,
        username: userData.name || userData.username,
        email: userData.email,
        oldRoles: oldRoles,
        newRoles: newRoles,
        changedBy: changedBy,
        changeTime: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId: changedBy
      });
    }
  };
  
  /**
   * Emit system-related events
   */
  static system = {
    backupCompleted: (backupInfo) => {
      return eventBus.emitEvent(EVENT_TYPES.SYSTEM_BACKUP_COMPLETED, {
        backupId: backupInfo.id,
        backupSize: backupInfo.size,
        backupLocation: backupInfo.location,
        duration: backupInfo.duration,
        completionTime: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.MEDIUM
      });
    },
    
    maintenanceStarted: (maintenanceInfo) => {
      return eventBus.emitEvent(EVENT_TYPES.SYSTEM_MAINTENANCE_STARTED, {
        maintenanceId: maintenanceInfo.id,
        maintenanceType: maintenanceInfo.type,
        estimatedDuration: maintenanceInfo.estimatedDuration,
        affectedServices: maintenanceInfo.affectedServices || [],
        startTime: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH
      });
    },
    
    maintenanceCompleted: (maintenanceInfo) => {
      return eventBus.emitEvent(EVENT_TYPES.SYSTEM_MAINTENANCE_COMPLETED, {
        maintenanceId: maintenanceInfo.id,
        maintenanceType: maintenanceInfo.type,
        actualDuration: maintenanceInfo.actualDuration,
        completionTime: new Date().toISOString(),
        success: maintenanceInfo.success
      }, {
        priority: EVENT_PRIORITIES.MEDIUM
      });
    },
    
    errorOccurred: (errorInfo) => {
      return eventBus.emitEvent(EVENT_TYPES.SYSTEM_ERROR_OCCURRED, {
        errorId: errorInfo.id || require('uuid').v4(),
        errorType: errorInfo.type,
        errorMessage: errorInfo.message,
        component: errorInfo.component,
        severity: errorInfo.severity || 'medium',
        stackTrace: errorInfo.stack,
        occurredAt: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH
      });
    }
  };
  
  /**
   * Emit security-related events
   */
  static security = {
    unauthorizedAccess: (accessInfo) => {
      return eventBus.emitEvent(EVENT_TYPES.SECURITY_UNAUTHORIZED_ACCESS, {
        userId: accessInfo.userId,
        ipAddress: accessInfo.ipAddress,
        userAgent: accessInfo.userAgent,
        resource: accessInfo.resource,
        action: accessInfo.action,
        timestamp: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.CRITICAL
      });
    },
    
    loginFailed: (loginInfo) => {
      return eventBus.emitEvent(EVENT_TYPES.SECURITY_LOGIN_FAILED, {
        username: loginInfo.name || loginInfo.username,
        ipAddress: loginInfo.ipAddress,
        userAgent: loginInfo.userAgent,
        attemptCount: loginInfo.attemptCount || 1,
        failureReason: loginInfo.reason,
        timestamp: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH
      });
    },
    
    permissionDenied: (accessInfo) => {
      return eventBus.emitEvent(EVENT_TYPES.SECURITY_PERMISSION_DENIED, {
        userId: accessInfo.userId,
        username: accessInfo.name || accessInfo.username,
        resource: accessInfo.resource,
        requiredPermission: accessInfo.requiredPermission,
        userPermissions: accessInfo.userPermissions || [],
        ipAddress: accessInfo.ipAddress,
        timestamp: new Date().toISOString()
      }, {
        priority: EVENT_PRIORITIES.HIGH,
        userId: accessInfo.userId
      });
    }
  };
}

module.exports = {
  EventEmitters,
  EVENT_TYPES,
  EVENT_PRIORITIES
};