const BaseService = require('../../../infrastructure/services/BaseService');
const UnsealRequestsRepository = require('../repositories/UnsealRequestsRepository');
const AuditRepository = require('../repositories/AuditRepository');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');

class UnsealsService extends BaseService {
  constructor() {
    super(new UnsealRequestsRepository());
  }
  async getUnsealRequests(filters = {}) {
    try {
      const requests = await this.repository.findPending(filters);
      return { success: true, data: requests };
    } catch (error) {
      throw new Error(`Failed to get unseal requests: ${error.message}`);
    }
  }

  async getAllUnsealRequests(filters = {}) {
    try {
      // This method gets ALL unseal requests, not just pending ones
      const requests = await this.repository.findAll(filters);
      return { success: true, data: requests };
    } catch (error) {
      throw new Error(`Failed to get all unseal requests: ${error.message}`);
    }
  }

  async getUnsealRequestByGaugeId(gaugeId) {
    try {
      // Get gauge details first to get the internal ID
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeById(gaugeId);
      if (!gauge) {
        return { success: false, error: 'Gauge not found' };
      }

      // Find unseal requests for this gauge
      const requests = await this.repository.findByGaugeId(gauge.id);
      
      // Return the most recent request or null if none exist
      const latestRequest = requests.length > 0 ? requests[0] : null;
      
      return { 
        success: true, 
        data: latestRequest,
        has_pending_request: latestRequest && latestRequest.status === 'pending'
      };
    } catch (error) {
      logger.error('Failed to get unseal request by gauge ID:', error);
      throw new Error(`Failed to get unseal request for gauge: ${error.message}`);
    }
  }

  async createUnsealRequest(gaugeId, requestData, userId) {
    try {
      // Get gauge details
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await serviceRegistry.get('GaugeService').getGaugeById(gaugeId);
      if (!gauge) {
        return { success: false, error: 'Gauge not found' };
      }

      // Check if gauge is sealed
      if (!gauge.is_sealed) {
        return { 
          success: false, 
          error: 'Gauge is not sealed' 
        };
      }

      // Check for existing pending request
      const existingRequests = await this.repository.findByGaugeId(gauge.id);
      const pendingRequest = existingRequests.find(r => r.status === 'pending');
      
      if (pendingRequest) {
        return { 
          success: false, 
          error: 'An unseal request is already pending for this gauge' 
        };
      }

      // Create unseal request
      const requestId = await this.repository.create({
        gauge_id: gauge.id,
        requested_by_user_id: userId,
        reason: requestData.reason
      });

      // Create audit log
      await AuditRepository.createAuditLog({
        user_id: userId,
        action: 'UNSEAL_REQUEST_CREATED',
        entity_type: 'gauge_unseal_requests',
        entity_id: requestId,
        details: JSON.stringify({
          gauge_id: gaugeId,
          reason: requestData.reason
        })
      });

      return { 
        success: true, 
        data: { 
          request_id: requestId,
          message: 'Unseal request created successfully' 
        } 
      };
    } catch (error) {
      throw new Error(`Failed to create unseal request: ${error.message}`);
    }
  }

  async approveUnsealRequest(requestId, reviewData, userId) {
    try {
      // Get request details
      const request = await this.repository.findById(requestId);
      if (!request) {
        return { success: false, error: 'Unseal request not found' };
      }

      // Check request status
      if (request.status !== 'pending') {
        return { 
          success: false, 
          error: `Request is already ${request.status}` 
        };
      }

      // Update request status
      await this.repository.updateStatus(
        requestId, 
        'approved', 
        userId
      );

      // Do NOT unseal the gauge yet - wait for physical confirmation

      // Create audit log
      await AuditRepository.createAuditLog({
        user_id: userId,
        action: 'UNSEAL_REQUEST_APPROVED',
        entity_type: 'gauge_unseal_requests',
        entity_id: requestId,
        details: JSON.stringify({
          gauge_id: request.gauge_id,
          requester: request.requester_name,
          review_notes: reviewData.review_notes
        })
      });

      return { 
        success: true, 
        data: { 
          message: 'Unseal request approved and gauge unsealed' 
        } 
      };
    } catch (error) {
      throw new Error(`Failed to approve unseal request: ${error.message}`);
    }
  }

  /**
   * Confirm physical unsealing of gauge
   * @param {number} requestId - Request ID
   * @param {number} userId - User confirming unseal
   * @returns {Promise<Object>} Result
   */
  async confirmUnseal(requestId, userId) {
    try {
      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new Error('Unseal request not found');
      }

      // Check if request is approved
      if (request.status !== 'approved') {
        throw new Error('Request must be approved before confirming unseal');
      }

      // Get the gauge details to calculate new calibration due date
      const gaugeDetails = await serviceRegistry.get('GaugeService').getGaugeByGaugeId(request.gauge_tag);
      if (!gaugeDetails) {
        throw new Error('Gauge not found for calibration update');
      }

      // Calculate new calibration due date based on unseal date
      const unsealDate = new Date();
      const calibrationFrequencyDays = gaugeDetails.calibration_frequency_days || 365;
      const newDueDate = new Date(unsealDate);
      newDueDate.setDate(newDueDate.getDate() + calibrationFrequencyDays);

      // Check if this gauge is part of a set - if so, unseal ALL gauges in the set
      let gaugesToUnseal = [gaugeDetails];
      if (gaugeDetails.set_id) {
        // Get all gauges in the set
        const gaugeRepository = serviceRegistry.get('GaugeService').repository;
        const setGauges = await gaugeRepository.findBySetId(gaugeDetails.set_id);
        gaugesToUnseal = setGauges;
        logger.info(`Unsealing gauge set ${gaugeDetails.set_id} with ${setGauges.length} gauges`);
      }

      // Unseal all gauges in the set (or single gauge if not part of a set)
      for (const gauge of gaugesToUnseal) {
        // Only unseal and update calibration if the gauge was actually sealed
        if (gauge.is_sealed === 1 || gauge.is_sealed === true) {
          // Unseal the gauge (only update is_sealed in gauges table)
          await serviceRegistry.get('GaugeService').updateGauge(gauge.id, {
            is_sealed: 0
          }, userId);

          // Update the calibration schedule with the new due date (only for sealed gauges)
          if (gauge.id) {
            // Update the gauge_calibration_schedule table using repository method
            await this.repository.updateCalibrationSchedule(
              gauge.id,
              newDueDate,
              calibrationFrequencyDays
            );
          }

          // Create audit log for each gauge unsealed
          await AuditRepository.createAuditLog({
            user_id: userId,
            action: 'GAUGE_UNSEALED',
            entity_type: 'gauge_unseal_requests',
            entity_id: requestId,
            details: JSON.stringify({
              gauge_id: gauge.gauge_id,
              gauge_tag: gauge.gauge_id,
              set_id: gaugeDetails.set_id || null,
              unseal_date: unsealDate,
              new_due_date: newDueDate,
              was_sealed: true
            })
          });
        }
      }

      // Delete all unseal requests for gauges that were unsealed
      // If this is a set, delete requests for all gauges in the set
      // If individual gauge, delete just the one request
      for (const gauge of gaugesToUnseal) {
        const gaugeRequests = await this.repository.findByGaugeId(gauge.id);
        for (const req of gaugeRequests) {
          // Only delete approved requests (the ones we just confirmed)
          if (req.status === 'approved') {
            await this.repository.delete(req.id);
            logger.info(`Deleted approved unseal request ${req.id} for gauge ${gauge.gauge_id}`);
          }
        }
      }

      return {
        success: true,
        data: {
          request_id: requestId,
          gauge_id: request.gauge_tag,
          set_id: gaugeDetails.set_id || null,
          gauges_unsealed: gaugesToUnseal.length,
          unsealed: true,
          message: gaugeDetails.set_id
            ? `Gauge set successfully unsealed (${gaugesToUnseal.length} gauges)`
            : 'Gauge successfully unsealed'
        }
      };
    } catch (error) {
      logger.error('Failed to confirm unseal:', error);
      throw new Error(`Failed to confirm unseal: ${error.message}`);
    }
  }

  async rejectUnsealRequest(requestId, reviewData, userId) {
    try {
      // Get request details
      const request = await this.repository.findById(requestId);
      if (!request) {
        return { success: false, error: 'Unseal request not found' };
      }

      // Check request status
      if (request.status !== 'pending') {
        return {
          success: false,
          error: `Request is already ${request.status}`
        };
      }

      // Update request status
      await this.repository.updateStatus(
        requestId,
        'rejected',
        userId
      );

      // Create audit log
      await AuditRepository.createAuditLog({
        user_id: userId,
        action: 'UNSEAL_REQUEST_REJECTED',
        entity_type: 'gauge_unseal_requests',
        entity_id: requestId,
        details: JSON.stringify({
          gauge_id: request.gauge_id,
          requester: request.requester_name,
          review_notes: reviewData.review_notes
        })
      });

      return {
        success: true,
        data: {
          message: 'Unseal request rejected'
        }
      };
    } catch (error) {
      throw new Error(`Failed to reject unseal request: ${error.message}`);
    }
  }

  /**
   * Approve all pending unseal requests for gauges in a set
   * @param {string} setId - Set ID
   * @param {number} userId - User approving requests
   * @returns {Promise<Object>} Result
   */
  async approveSetUnsealRequests(setId, userId) {
    try {
      // Get all gauges in the set
      const gaugeRepository = serviceRegistry.get('GaugeService').repository;
      const setGauges = await gaugeRepository.findBySetId(setId);

      if (!setGauges || setGauges.length === 0) {
        return { success: false, error: 'No gauges found for this set' };
      }

      // Get all pending unseal requests for gauges in this set
      const allRequests = await this.repository.findAll({ status: 'pending' });
      const setGaugeIds = setGauges.map(g => g.id);
      const setRequests = allRequests.filter(req => setGaugeIds.includes(req.gauge_id));

      if (setRequests.length === 0) {
        return {
          success: false,
          error: 'No pending unseal requests found for this set'
        };
      }

      // Approve each request
      let approvedCount = 0;
      for (const request of setRequests) {
        await this.repository.updateStatus(request.id, 'approved', userId);

        // Create audit log for each request
        await AuditRepository.createAuditLog({
          user_id: userId,
          action: 'UNSEAL_REQUEST_APPROVED',
          entity_type: 'gauge_unseal_requests',
          entity_id: request.id,
          details: JSON.stringify({
            gauge_id: request.gauge_id,
            gauge_tag: request.gauge_tag,
            set_id: setId,
            requester: request.requester_name,
            batch_approval: true
          })
        });

        approvedCount++;
      }

      logger.info(`Approved ${approvedCount} unseal requests for set ${setId}`);

      return {
        success: true,
        data: {
          message: `Approved ${approvedCount} unseal request(s) for set ${setId}`,
          approved_count: approvedCount,
          set_id: setId
        }
      };
    } catch (error) {
      logger.error(`Failed to approve set unseal requests for set ${setId}:`, error);
      throw new Error(`Failed to approve set unseal requests: ${error.message}`);
    }
  }

  /**
   * Reject all pending unseal requests for gauges in a set
   * @param {string} setId - Set ID
   * @param {Object} reviewData - Review data with review_notes
   * @param {number} userId - User rejecting requests
   * @returns {Promise<Object>} Result
   */
  async rejectSetUnsealRequests(setId, reviewData, userId) {
    try {
      // Get all gauges in the set
      const gaugeRepository = serviceRegistry.get('GaugeService').repository;
      const setGauges = await gaugeRepository.findBySetId(setId);

      if (!setGauges || setGauges.length === 0) {
        return { success: false, error: 'No gauges found for this set' };
      }

      // Get all pending unseal requests for gauges in this set
      const allRequests = await this.repository.findAll({ status: 'pending' });
      const setGaugeIds = setGauges.map(g => g.id);
      const setRequests = allRequests.filter(req => setGaugeIds.includes(req.gauge_id));

      if (setRequests.length === 0) {
        return {
          success: false,
          error: 'No pending unseal requests found for this set'
        };
      }

      // Reject each request
      let rejectedCount = 0;
      for (const request of setRequests) {
        await this.repository.updateStatus(request.id, 'rejected', userId);

        // Create audit log for each request
        await AuditRepository.createAuditLog({
          user_id: userId,
          action: 'UNSEAL_REQUEST_REJECTED',
          entity_type: 'gauge_unseal_requests',
          entity_id: request.id,
          details: JSON.stringify({
            gauge_id: request.gauge_id,
            gauge_tag: request.gauge_tag,
            set_id: setId,
            requester: request.requester_name,
            review_notes: reviewData.review_notes,
            batch_rejection: true
          })
        });

        rejectedCount++;
      }

      logger.info(`Rejected ${rejectedCount} unseal requests for set ${setId}`);

      return {
        success: true,
        data: {
          message: `Rejected ${rejectedCount} unseal request(s) for set ${setId}`,
          rejected_count: rejectedCount,
          set_id: setId
        }
      };
    } catch (error) {
      logger.error(`Failed to reject set unseal requests for set ${setId}:`, error);
      throw new Error(`Failed to reject set unseal requests: ${error.message}`);
    }
  }
}

module.exports = UnsealsService;