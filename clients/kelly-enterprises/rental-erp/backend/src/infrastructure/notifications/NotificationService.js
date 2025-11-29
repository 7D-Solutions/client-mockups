/**
 * Comprehensive Notification Service
 * Integrates with EventBus for canonical event-driven notifications
 */

const logger = require('../utils/logger');
const { eventBus, EVENT_TYPES, EVENT_PRIORITIES } = require('../events/EventBus');

/**
 * Notification channels
 */
const CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms', 
  PUSH: 'push',
  WEBHOOK: 'webhook',
  IN_APP: 'in_app',
  SLACK: 'slack'
};

/**
 * Notification template types
 */
const TEMPLATE_TYPES = {
  // Gauge notifications
  GAUGE_CALIBRATION_DUE: 'gauge_calibration_due',
  GAUGE_OVERDUE: 'gauge_overdue',
  GAUGE_CHECKOUT_REMINDER: 'gauge_checkout_reminder',
  GAUGE_TRANSFER_REQUESTED: 'gauge_transfer_requested',
  GAUGE_UNSEAL_APPROVED: 'gauge_unseal_approved',
  
  // QC notifications
  QC_APPROVAL_REQUIRED: 'qc_approval_required',
  QC_VERIFICATION_COMPLETED: 'qc_verification_completed',
  QC_VERIFICATION_FAILED: 'qc_verification_failed',
  
  // User notifications
  USER_PASSWORD_RESET: 'user_password_reset',
  USER_ACCOUNT_CREATED: 'user_account_created',
  USER_ROLE_CHANGED: 'user_role_changed',
  
  // System notifications
  SYSTEM_MAINTENANCE_SCHEDULED: 'system_maintenance_scheduled',
  SYSTEM_BACKUP_COMPLETED: 'system_backup_completed',
  SYSTEM_ERROR_ALERT: 'system_error_alert',
  
  // Security notifications
  SECURITY_LOGIN_FAILED: 'security_login_failed',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security_suspicious_activity'
};

/**
 * Comprehensive notification service
 */
class NotificationService {
  constructor() {
    this.channels = new Map();
    this.templates = new Map();
    this.subscribers = new Map();
    this.stats = {
      sent: 0,
      failed: 0,
      byChannel: new Map(),
      byTemplate: new Map()
    };
    
    // Initialize default templates
    this.initializeTemplates();
    
    // Setup event bus subscriptions for automatic notifications
    this.setupEventSubscriptions();
    
    logger.info('NotificationService initialized');
  }
  
  /**
   * Register a notification channel
   */
  registerChannel(channelName, channelImplementation) {
    this.channels.set(channelName, channelImplementation);
    this.stats.byChannel.set(channelName, { sent: 0, failed: 0 });
    
    logger.info('Notification channel registered:', { channelName });
  }
  
  /**
   * Register a notification template
   */
  registerTemplate(templateType, template) {
    this.templates.set(templateType, template);
    this.stats.byTemplate.set(templateType, { sent: 0, failed: 0 });
    
    logger.debug('Notification template registered:', { templateType });
  }
  
  /**
   * Send notification through specified channel
   */
  async sendNotification(options) {
    const {
      channel,
      templateType,
      recipient,
      data = {},
      priority = EVENT_PRIORITIES.MEDIUM,
      correlationId = null
    } = options;
    
    try {
      // Validate inputs
      if (!this.channels.has(channel)) {
        throw new Error(`Unknown notification channel: ${channel}`);
      }
      
      if (!this.templates.has(templateType)) {
        throw new Error(`Unknown template type: ${templateType}`);
      }
      
      // Get channel implementation and template
      const channelImpl = this.channels.get(channel);
      const template = this.templates.get(templateType);
      
      // Render template with data
      const renderedNotification = this.renderTemplate(template, data);
      
      // Send notification
      const notificationId = await channelImpl.send({
        recipient,
        subject: renderedNotification.subject,
        content: renderedNotification.content,
        priority,
        correlationId
      });
      
      // Update statistics
      this.updateStats(channel, templateType, true);
      
      // Log successful notification
      logger.info('Notification sent successfully:', {
        notificationId,
        channel,
        templateType,
        recipient: this.maskRecipient(recipient),
        priority
      });
      
      // Emit notification sent event
      eventBus.emitEvent('notification.sent', {
        notificationId,
        channel,
        templateType,
        recipient: this.maskRecipient(recipient),
        priority
      }, { correlationId });
      
      return notificationId;
      
    } catch (error) {
      // Update failure statistics
      this.updateStats(channel, templateType, false);
      
      logger.error('Failed to send notification:', {
        channel,
        templateType,
        error: error.message,
        recipient: this.maskRecipient(recipient)
      });
      
      // Emit notification failed event
      eventBus.emitEvent('notification.failed', {
        channel,
        templateType,
        recipient: this.maskRecipient(recipient),
        error: error.message
      }, { correlationId });
      
      throw error;
    }
  }
  
  /**
   * Send notification to multiple recipients
   */
  async sendBulkNotification(options) {
    const { recipients, ...notificationOptions } = options;
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const notificationId = await this.sendNotification({
          ...notificationOptions,
          recipient
        });
        results.push({ recipient, notificationId, success: true });
      } catch (error) {
        results.push({ recipient, error: error.message, success: false });
      }
    }
    
    return results;
  }
  
  /**
   * Subscribe to specific events for automatic notifications
   */
  subscribeToEvent(eventType, notificationConfig) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    this.subscribers.get(eventType).push(notificationConfig);
    
    // Setup event bus subscription
    eventBus.subscribe(eventType, async (eventData) => {
      await this.handleEventNotification(eventType, eventData, notificationConfig);
    });
    
    logger.info('Event subscription added for notifications:', { eventType });
  }
  
  /**
   * Handle event-driven notifications
   */
  async handleEventNotification(eventType, eventData, config) {
    try {
      // Determine recipients based on configuration
      const recipients = await this.resolveRecipients(config.recipients, eventData);
      
      // Send notifications to each recipient
      for (const recipient of recipients) {
        await this.sendNotification({
          channel: config.channel,
          templateType: config.templateType,
          recipient,
          data: {
            ...eventData.payload,
            event: eventData
          },
          priority: eventData.priority,
          correlationId: eventData.correlationId
        });
      }
      
    } catch (error) {
      logger.error('Failed to handle event notification:', {
        eventType,
        eventId: eventData.id,
        error: error.message
      });
    }
  }
  
  /**
   * Resolve notification recipients based on configuration
   */
  async resolveRecipients(recipientConfig, eventData) {
    const recipients = [];
    
    if (Array.isArray(recipientConfig)) {
      recipients.push(...recipientConfig);
    } else if (typeof recipientConfig === 'function') {
      const resolved = await recipientConfig(eventData);
      recipients.push(...(Array.isArray(resolved) ? resolved : [resolved]));
    } else if (typeof recipientConfig === 'string') {
      recipients.push(recipientConfig);
    }
    
    return recipients.filter(Boolean);
  }
  
  /**
   * Render notification template with data
   */
  renderTemplate(template, data) {
    const renderString = (str, data) => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || match;
      });
    };
    
    return {
      subject: renderString(template.subject, data),
      content: renderString(template.content, data)
    };
  }
  
  /**
   * Setup automatic event subscriptions
   */
  setupEventSubscriptions() {
    // Gauge calibration due notifications
    this.subscribeToEvent(EVENT_TYPES.GAUGE_CALIBRATION_DUE, {
      channel: CHANNELS.EMAIL,
      templateType: TEMPLATE_TYPES.GAUGE_CALIBRATION_DUE,
      recipients: async (eventData) => {
        // Would resolve from user management service
        return ['calibration@company.com'];
      }
    });
    
    // QC approval required notifications
    this.subscribeToEvent(EVENT_TYPES.QC_APPROVAL_REQUIRED, {
      channel: CHANNELS.EMAIL,
      templateType: TEMPLATE_TYPES.QC_APPROVAL_REQUIRED,
      recipients: async (eventData) => {
        // Would resolve QC inspectors for the gauge
        return ['qc@company.com'];
      }
    });
    
    // Security event notifications
    this.subscribeToEvent(EVENT_TYPES.SECURITY_LOGIN_FAILED, {
      channel: CHANNELS.EMAIL,
      templateType: TEMPLATE_TYPES.SECURITY_LOGIN_FAILED,
      recipients: ['security@company.com']
    });
    
    // System error notifications
    this.subscribeToEvent(EVENT_TYPES.SYSTEM_ERROR_OCCURRED, {
      channel: CHANNELS.EMAIL,
      templateType: TEMPLATE_TYPES.SYSTEM_ERROR_ALERT,
      recipients: ['admin@company.com']
    });
  }
  
  /**
   * Initialize default notification templates
   */
  initializeTemplates() {
    // Gauge templates
    this.registerTemplate(TEMPLATE_TYPES.GAUGE_CALIBRATION_DUE, {
      subject: 'Gauge Calibration Due - {{gaugeId}}',
      content: `
        Gauge {{gaugeId}} ({{gaugeName}}) requires calibration.
        
        Due Date: {{dueDate}}
        Location: {{location}}
        Assigned Technician: {{assignedTo}}
        
        Please schedule calibration as soon as possible.
      `.trim()
    });
    
    this.registerTemplate(TEMPLATE_TYPES.GAUGE_TRANSFER_REQUESTED, {
      subject: 'Gauge Transfer Request - {{gaugeId}}',
      content: `
        A gauge transfer has been requested:
        
        Gauge: {{gaugeId}} ({{gaugeName}})
        From: {{fromDepartment}}
        To: {{toDepartment}}
        Requested By: {{requestedBy}}
        Reason: {{reason}}
        
        Please approve or reject this transfer request.
      `.trim()
    });
    
    // QC templates
    this.registerTemplate(TEMPLATE_TYPES.QC_APPROVAL_REQUIRED, {
      subject: 'QC Approval Required - {{gaugeId}}',
      content: `
        QC approval is required for gauge {{gaugeId}}.
        
        Calibration Date: {{calibrationDate}}
        Technician: {{technician}}
        Results: {{results}}
        
        Please review and approve the calibration results.
      `.trim()
    });
    
    // Security templates
    this.registerTemplate(TEMPLATE_TYPES.SECURITY_LOGIN_FAILED, {
      subject: 'Security Alert: Failed Login Attempt',
      content: `
        Multiple failed login attempts detected.
        
        Username: {{username}}
        IP Address: {{ipAddress}}
        Timestamp: {{timestamp}}
        Attempts: {{attemptCount}}
        
        Please investigate this security incident.
      `.trim()
    });
    
    // System templates
    this.registerTemplate(TEMPLATE_TYPES.SYSTEM_ERROR_ALERT, {
      subject: 'System Error Alert - {{errorType}}',
      content: `
        A system error has occurred:
        
        Error Type: {{errorType}}
        Message: {{errorMessage}}
        Component: {{component}}
        Timestamp: {{timestamp}}
        
        Immediate attention may be required.
      `.trim()
    });
  }
  
  /**
   * Update notification statistics
   */
  updateStats(channel, templateType, success) {
    if (success) {
      this.stats.sent++;
      this.stats.byChannel.get(channel).sent++;
      this.stats.byTemplate.get(templateType).sent++;
    } else {
      this.stats.failed++;
      this.stats.byChannel.get(channel).failed++;
      this.stats.byTemplate.get(templateType).failed++;
    }
  }
  
  /**
   * Mask recipient information for logging
   */
  maskRecipient(recipient) {
    if (typeof recipient === 'string' && recipient.includes('@')) {
      const [name, domain] = recipient.split('@');
      return `${name.substring(0, 2)}***@${domain}`;
    }
    return recipient;
  }
  
  /**
   * Get notification statistics
   */
  getStats() {
    return {
      ...this.stats,
      byChannel: Array.from(this.stats.byChannel.entries()).map(([channel, stats]) => ({
        channel,
        ...stats
      })),
      byTemplate: Array.from(this.stats.byTemplate.entries()).map(([template, stats]) => ({
        template,
        ...stats
      }))
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Export service and constants
module.exports = {
  notificationService,
  NotificationService,
  CHANNELS,
  TEMPLATE_TYPES
};