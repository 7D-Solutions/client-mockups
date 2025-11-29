const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');
const BaseService = require('../../../infrastructure/services/BaseService');
const CalibrationRepository = require('../repositories/CalibrationRepository');
const GaugeRepository = require('../repositories/GaugeRepository');
const certificatePDFService = require('./CalibrationCertificatePDFService');
const dropboxService = require('../../../infrastructure/services/DropboxService');

class GaugeCalibrationService extends BaseService {
  constructor(calibrationRepository, gaugeRepository) {
    super(calibrationRepository);
    this.calibrationRepository = calibrationRepository || new CalibrationRepository();
    this.gaugeRepository = gaugeRepository || new GaugeRepository();
  }
  /**
   * Record a calibration for a gauge
   * @param {string} gaugeId - The gauge ID
   * @param {Object} calibrationData - The calibration data
   * @returns {Promise<Object>} Calibration result
   */
  async recordCalibration(gaugeId, calibrationData) {
    return await this.executeInTransaction(async (connection) => {
      // Get gauge details
      const gauge = await this.calibrationRepository.getGaugeForCalibration(gaugeId, connection);
      
      if (!gauge) {
        throw new Error('Gauge not found');
      }
      
      // Validate calibration can be recorded
      if (gauge.status === 'checked_out') {
        throw new Error('Cannot calibrate a gauge that is checked out');
      }
      
      // Calculate next calibration due date
      const calibrationInterval = calibrationData.calibration_interval || gauge.calibration_frequency_days || 365;
      const nextDueDate = new Date(calibrationData.calibration_date || new Date());
      nextDueDate.setDate(nextDueDate.getDate() + calibrationInterval);
      
      // Determine if calibration passed
      const passed = calibrationData.calibration_result === 'pass' || calibrationData.pass_fail === 'pass' || calibrationData.passed === true;
      
      // Insert calibration record
      const calibrationResult = await this.calibrationRepository.createCalibration({
        gauge_id: gauge.id,
        calibration_date: calibrationData.calibration_date || new Date(),
        due_date: nextDueDate,
        passed: passed ? 1 : 0,
        document_path: calibrationData.document_path || calibrationData.certificate_number || null,
        calibrated_by: calibrationData.calibrated_by || calibrationData.recorded_by_user_id || null,
        notes: calibrationData.notes || calibrationData.calibration_notes || null
      }, connection);
      
      // Update gauge status based on calibration result
      const newStatus = passed ? 'available' : 'out_of_service';
      await this.gaugeRepository.update(gauge.id, {
        status: newStatus
      }, connection);
      
      // Seal gauge if requested
      const shouldSeal = calibrationData.seal_after_calibration || false;
      if (shouldSeal && !gauge.is_sealed) {
        await this.gaugeRepository.update(gauge.id, {
          is_sealed: 1
        }, connection);
      }
      
      // Log the calibration
      await auditService.logAction({
        userId: calibrationData.recorded_by_user_id || calibrationData.calibrated_by,
        action: 'calibration_recorded',
        tableName: 'gauges',
        recordId: gauge.id,
        details: {
          gauge_id: gaugeId,
          calibration_id: calibrationResult.id,
          document_path: calibrationData.document_path || calibrationData.certificate_number,
          result: passed ? 'pass' : 'fail',
          sealed: shouldSeal,
          compliance_relevant: true
        }
      }, connection);
      
      return {
        success: true,
        message: 'Calibration recorded successfully',
        calibration_id: calibrationResult.id,
        gauge_id: gaugeId,
        next_due_date: nextDueDate,
        sealed: shouldSeal,
        result: passed ? 'pass' : 'fail'
      };
    });
  }

  /**
   * Get calibration history for a gauge
   * @param {string} gaugeId - The gauge ID
   * @returns {Promise<Array>} Calibration history
   */
  async getCalibrationHistory(gaugeId) {
    try {
      return await this.calibrationRepository.getCalibrationHistory(gaugeId);
    } catch (error) {
      logger.error('Error fetching calibration history:', error);
      throw error;
    }
  }

  /**
   * Get overdue calibrations
   * @returns {Promise<Array>} List of overdue gauges
   */
  async getOverdueCalibrations() {
    try {
      return await this.calibrationRepository.getOverdueCalibrations();
    } catch (error) {
      logger.error('Error fetching overdue calibrations:', error);
      throw error;
    }
  }

  /**
   * Get calibrations due soon
   * @param {number} days - Number of days to look ahead
   * @returns {Promise<Array>} List of gauges due for calibration
   */
  async getCalibrationsDueSoon(days = 30) {
    try {
      return await this.calibrationRepository.getCalibrationsDueSoon(days);
    } catch (error) {
      logger.error('Error fetching calibrations due soon:', error);
      throw error;
    }
  }

  /**
   * Update calibration record
   * @param {number} calibrationId - The calibration ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} Update result
   */
  async updateCalibration(calibrationId, updateData) {
    return await this.executeInTransaction(async (connection) => {
      // Update calibration
      await this.calibrationRepository.updateCalibration(calibrationId, updateData, connection);
      
      // Log the update
      await auditService.logAction({
        userId: updateData.updated_by_user_id,
        action: 'calibration_updated',
        tableName: 'gauge_calibrations',
        recordId: calibrationId,
        details: {
          calibration_id: calibrationId,
          updates: updateData
        }
      }, connection);
      
      return {
        success: true,
        message: 'Calibration updated successfully',
        calibration_id: calibrationId
      };
    });
  }

  /**
   * Get latest calibration for a gauge
   * @param {string} gaugeId - The gauge ID
   * @returns {Promise<Object|null>} Latest calibration record
   */
  async getLatestCalibration(gaugeId) {
    try {
      return await this.calibrationRepository.getLatestCalibration(gaugeId);
    } catch (error) {
      logger.error('Error fetching latest calibration:', error);
      throw error;
    }
  }

  /**
   * Check if gauge is due for calibration
   * @param {string} gaugeId - The gauge ID
   * @returns {Promise<Object>} Due status
   */
  async checkCalibrationDue(gaugeId) {
    try {
      const latestCalibration = await this.getLatestCalibration(gaugeId);
      
      if (!latestCalibration || !latestCalibration.due_date) {
        return {
          isDue: true,
          dueDate: null,
          daysOverdue: null,
          message: 'No calibration history found'
        };
      }
      
      const dueDate = new Date(latestCalibration.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        isDue: diffDays <= 0,
        dueDate: latestCalibration.due_date,
        daysOverdue: diffDays < 0 ? Math.abs(diffDays) : 0,
        daysUntilDue: diffDays > 0 ? diffDays : 0,
        message: diffDays < 0 ? `Overdue by ${Math.abs(diffDays)} days` : 
                 diffDays === 0 ? 'Due today' : 
                 `Due in ${diffDays} days`
      };
    } catch (error) {
      logger.error('Error checking calibration due status:', error);
      throw error;
    }
  }

  /**
   * Get suggested gauge blocks for hand tool calibration
   * Returns gauge blocks that fit within the tool's measurement range
   * @param {string} gaugeId - The gauge ID
   * @returns {Promise<Object>} Suggested gauge blocks and tool info
   */
  async getSuggestedGaugeBlocks(gaugeId) {
    try {
      // Get gauge details with hand tool specifications
      const gauge = await this.calibrationRepository.getGaugeForCalibration(gaugeId);

      if (!gauge) {
        const error = new Error('Gauge not found');
        error.statusCode = 404;
        error.userMessage = `Gauge with ID ${gaugeId} was not found in the system`;
        throw error;
      }

      if (gauge.equipment_type !== 'hand_tool') {
        const error = new Error('Invalid gauge type for internal calibration');
        error.statusCode = 400;
        error.userMessage = `This gauge (${gauge.gauge_id}) is not a hand tool. Only hand tools can use internal calibration with gauge blocks. Equipment type: ${gauge.equipment_type}`;
        throw error;
      }

      // Get hand tool specifications from gauge_hand_tool_specifications
      const { getPool } = require('../../../infrastructure/database/connection');
      const pool = getPool();
      const [specs] = await pool.execute(
        'SELECT range_min, range_max, range_unit, tolerance FROM gauge_hand_tool_specifications WHERE gauge_id = ?',
        [gauge.id]
      );

      if (!specs || specs.length === 0) {
        const error = new Error('Hand tool specifications missing');
        error.statusCode = 400;
        error.userMessage = `This hand tool (${gauge.gauge_id}) is missing required specifications (range, tolerance). Please contact an administrator to configure this gauge before performing internal calibration.`;
        throw error;
      }

      const spec = specs[0];
      const rangeMin = parseFloat(spec.range_min) || 0;
      const rangeMax = parseFloat(spec.range_max) || 6;
      const unit = spec.range_unit || 'inches';
      const tolerance = parseFloat(spec.tolerance) || 0.001;

      // Standard gauge block sets (inches)
      const standardBlocks = [
        0.100, 0.101, 0.102, 0.103, 0.104, 0.105, 0.106, 0.107, 0.108, 0.109,
        0.110, 0.120, 0.130, 0.140, 0.150,
        0.200, 0.250, 0.300, 0.350, 0.400, 0.450, 0.500,
        0.550, 0.600, 0.650, 0.700, 0.750, 0.800, 0.850, 0.900, 0.950,
        1.000, 1.500, 2.000, 2.500, 3.000, 3.500, 4.000
      ];

      // Filter blocks that fit within the tool's range
      const suggestedBlocks = standardBlocks.filter(block => {
        return block >= rangeMin && block <= rangeMax;
      });

      // Suggest measurement points based on range
      const suggestedPoints = [];
      if (suggestedBlocks.length >= 3) {
        // Low point (near minimum)
        suggestedPoints.push({
          label: 'Low',
          reference: suggestedBlocks[0],
          description: 'Near minimum range'
        });

        // Mid point (middle of range)
        const midIndex = Math.floor(suggestedBlocks.length / 2);
        suggestedPoints.push({
          label: 'Mid',
          reference: suggestedBlocks[midIndex],
          description: 'Middle of range'
        });

        // High point (near maximum)
        suggestedPoints.push({
          label: 'High',
          reference: suggestedBlocks[suggestedBlocks.length - 1],
          description: 'Near maximum range'
        });

        // Optional 4th and 5th points
        if (suggestedBlocks.length >= 5) {
          const quarterIndex = Math.floor(suggestedBlocks.length / 4);
          const threeQuarterIndex = Math.floor((suggestedBlocks.length * 3) / 4);

          suggestedPoints.push({
            label: 'Quarter',
            reference: suggestedBlocks[quarterIndex],
            description: 'First quarter of range',
            optional: true
          });

          suggestedPoints.push({
            label: 'Three-Quarter',
            reference: suggestedBlocks[threeQuarterIndex],
            description: 'Third quarter of range',
            optional: true
          });
        }
      }

      return {
        gauge_id: gaugeId,
        gauge_identifier: gauge.gauge_id,
        tool_range: {
          min: rangeMin,
          max: rangeMax,
          unit: unit
        },
        tolerance: tolerance,
        available_blocks: suggestedBlocks,
        suggested_points: suggestedPoints,
        total_blocks_available: suggestedBlocks.length
      };
    } catch (error) {
      logger.error('Error getting suggested gauge blocks:', error);
      throw error;
    }
  }

  /**
   * Record internal hand tool calibration with multi-point measurements
   * @param {string} gaugeId - The gauge ID
   * @param {Object} calibrationData - The calibration data with measurement points
   * @param {number} userId - User recording the calibration
   * @returns {Promise<Object>} Calibration result with certificate
   */
  async recordInternalHandToolCalibration(gaugeId, calibrationData, userId) {
    return await this.executeInTransaction(async (connection) => {
      // Get gauge details
      const gauge = await this.calibrationRepository.getGaugeForCalibration(gaugeId, connection);

      if (!gauge) {
        throw new Error('Gauge not found');
      }

      // Validate it's a hand tool
      if (gauge.equipment_type !== 'hand_tool') {
        throw new Error('This calibration method is only for hand tools');
      }

      // Generate certificate number using gauge_id (universal public identifier)
      const certNumber = `INT-${gauge.gauge_id}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;

      // Calculate due date
      const calibrationInterval = gauge.calibration_frequency_days || 365;
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + calibrationInterval);

      // Determine overall pass/fail from measurement points
      const overallPass = calibrationData.measurement_points.every(point => point.pass);

      // Structure measurements data
      const measurements = {
        calibration_type: 'internal',
        number_of_points: calibrationData.number_of_points,
        tolerance_spec: calibrationData.tolerance_spec,
        gauge_blocks_used: calibrationData.gauge_blocks_used,
        temperature: calibrationData.temperature || 68,
        humidity: calibrationData.humidity || 45,
        technician_name: calibrationData.technician_name,
        measurement_points: calibrationData.measurement_points,
        visual_inspection: calibrationData.visual_inspection
      };

      // Create calibration record
      const calibrationResult = await this.calibrationRepository.createCalibration({
        gauge_id: gauge.id,
        calibration_date: new Date(),
        due_date: nextDueDate,
        certificate_number: certNumber,
        calibrated_by: calibrationData.technician_name,
        calibration_company: 'Internal',
        passed: overallPass ? 1 : 0,
        is_sealed: 0,
        measurements: JSON.stringify(measurements),
        notes: calibrationData.notes || null,
        document_path: null, // Will be updated when PDF is generated
        created_by: userId
      }, connection);

      // Update gauge status based on result
      let newStatus = 'available';
      if (!overallPass) {
        // If failed, let user choose next action
        newStatus = calibrationData.failure_action || 'out_of_service';
      }

      await this.gaugeRepository.updateGaugeStatus(gauge.id, newStatus, connection);

      // Log audit
      await auditService.logAction({
        userId: userId,
        module: 'gauge',
        action: 'calibration_recorded',
        tableName: 'gauge_calibrations',
        recordId: calibrationResult.id,
        entity_type: 'gauge',
        entity_id: gauge.id,
        oldValues: { status: gauge.status },
        newValues: {
          status: newStatus,
          calibration_result: overallPass ? 'pass' : 'fail',
          certificate_number: certNumber
        },
        ipAddress: calibrationData.ipAddress,
        userAgent: calibrationData.userAgent
      });

      logger.info('Internal hand tool calibration recorded', {
        gaugeId: gauge.gauge_id,
        calibrationId: calibrationResult.id,
        passed: overallPass,
        userId: userId
      });

      // Generate PDF certificate
      let pdfPath = null;
      let dropboxPath = null;

      try {
        // Get hand tool specifications for PDF
        const { getPool } = require('../../../infrastructure/database/connection');
        const pool = getPool();
        const [specs] = await pool.execute(
          'SELECT range_min, range_max, range_unit, tolerance, tool_type FROM gauge_hand_tool_specifications WHERE gauge_id = ?',
          [gauge.id]
        );

        const spec = specs && specs.length > 0 ? specs[0] : {};

        // Prepare data for PDF generation
        const pdfData = {
          certificate_number: certNumber,
          calibration_date: new Date(),
          due_date: nextDueDate,
          technician_name: calibrationData.technician_name,
          temperature: calibrationData.temperature || 68,
          humidity: calibrationData.humidity || 45,
          gauge_blocks_used: Array.isArray(calibrationData.gauge_blocks_used)
            ? calibrationData.gauge_blocks_used.join(', ')
            : calibrationData.gauge_blocks_used || 'N/A',
          measurement_points: calibrationData.measurement_points,
          visual_inspection: calibrationData.visual_inspection,
          passed: overallPass
        };

        const gaugeInfo = {
          gauge_id: gauge.gauge_id,
          name: gauge.name || 'Hand Tool',
          tool_type: spec.tool_type || 'N/A',
          range_min: spec.range_min || 0,
          range_max: spec.range_max || 0,
          range_unit: spec.range_unit || 'inches',
          tolerance: spec.tolerance || 0.001
        };

        // Generate PDF
        const pdfResult = await certificatePDFService.generateCertificate(pdfData, gaugeInfo);
        pdfPath = pdfResult.filePath;

        // Initialize Dropbox if needed
        if (!dropboxService.isAvailable()) {
          dropboxService.initialize();
        }

        // Upload to Dropbox
        if (dropboxService.isAvailable()) {
          const uploadResult = await dropboxService.uploadCertificate(
            pdfPath,
            gauge.gauge_id,
            `${certNumber}.pdf`,
            false
          );
          dropboxPath = uploadResult.dropboxPath;

          // Update calibration record with document path
          await this.calibrationRepository.updateCalibration(
            calibrationResult.id,
            { document_path: dropboxPath },
            connection
          );

          logger.info('Certificate PDF uploaded to Dropbox', {
            gaugeId: gauge.gauge_id,
            calibrationId: calibrationResult.id,
            dropboxPath
          });
        } else {
          logger.warn('Dropbox not available - certificate PDF not uploaded', {
            gaugeId: gauge.gauge_id,
            calibrationId: calibrationResult.id
          });
        }

        // Clean up temp PDF file
        if (pdfPath) {
          await certificatePDFService.cleanupTempFile(pdfPath);
        }
      } catch (pdfError) {
        logger.error('Error generating/uploading certificate PDF', {
          gaugeId: gauge.gauge_id,
          calibrationId: calibrationResult.id,
          error: pdfError.message
        });
        // Don't fail the entire calibration if PDF generation fails
        // The calibration data is already saved
      }

      return {
        calibration_id: calibrationResult.id,
        certificate_number: certNumber,
        passed: overallPass,
        due_date: nextDueDate,
        gauge_status: newStatus,
        certificate_path: dropboxPath
      };
    });
  }
}

module.exports = GaugeCalibrationService;