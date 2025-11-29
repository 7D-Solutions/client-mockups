const express = require('express');
const router = express.Router();
const { authenticateToken, requireOperator } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const { uploadCertificate, handleUploadError } = require('../../../infrastructure/middleware/upload');
const certificateService = require('../services/CertificateService');
const auditService = require('../../../infrastructure/audit/auditService');
const { handleCertificateError, sendSuccess } = require('./helpers/certificateResponseHelper');

/**
 * POST /api/gauges/:id/upload-certificate
 */
router.post('/:id/upload-certificate',
  authenticateToken,
  requireOperator,
  uploadCertificate,
  handleUploadError,
  asyncErrorHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a certificate file.'
      });
    }

    try {
      const result = await certificateService.uploadCertificate(req.params.id, req.file, req.user.id);
      const actualGaugeId = result.gauge.gauge_id;

      await auditService.logAction({
        userId: req.user.id,
        module: 'gauge',
        action: 'certificate_upload',
        tableName: 'certificates',
        recordId: result.certificate.id,
        entity_type: 'gauge',
        entity_id: result.gauge.id,
        oldValues: null,
        newValues: {
          certificate_id: result.certificate.id,
          gauge_id: actualGaugeId,
          file_name: req.file.originalname,
          custom_name: result.certificate.custom_name,
          file_size: result.uploadResult.fileSize,
          file_extension: result.certificate.file_extension,
          dropbox_path: result.uploadResult.dropboxPath,
          uploaded_by: req.user.username || req.user.email
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      sendSuccess(res, 'Certificate uploaded successfully', {
        id: result.certificate.id,
        gaugeId: actualGaugeId,
        gaugeName: result.gauge.name,
        customName: result.certificate.custom_name,
        fileName: result.uploadResult.fileName,
        dropboxPath: result.uploadResult.dropboxPath,
        sharedLink: result.uploadResult.sharedLink,
        fileSize: result.uploadResult.fileSize,
        uploadedAt: result.certificate.uploaded_at,
        uploadedBy: req.user.username || req.user.id
      });
    } catch (error) {
      handleCertificateError(res, error, 'upload', {
        gaugeId: req.params.id,
        userId: req.user?.id
      });
    }
  })
);

/**
 * GET /api/gauges/:id/certificates
 */
router.get('/:id/certificates',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    try {
      const data = await certificateService.getFormattedCertificates(req.params.id);
      sendSuccess(res, null, data);
    } catch (error) {
      handleCertificateError(res, error, 'list', { gaugeId: req.params.id });
    }
  })
);

/**
 * DELETE /api/gauges/:id/certificates (legacy - by path)
 */
router.delete('/:id/certificates',
  authenticateToken,
  requireOperator,
  asyncErrorHandler(async (req, res) => {
    const { certificatePath } = req.body;

    if (!certificatePath) {
      return res.status(400).json({
        success: false,
        message: 'Certificate path is required'
      });
    }

    try {
      const { gauge, certificates } = await certificateService.getCertificates(req.params.id);
      const certificate = certificates.find(c => c.dropbox_path === certificatePath);

      if (!certificate) {
        return res.status(404).json({
          success: false,
          message: 'Certificate not found'
        });
      }

      await certificateService.deleteCertificate(
        req.params.id,
        certificate.id,
        req.user.id,
        req.get('user-agent'),
        req.ip
      );

      const actualGaugeId = gauge.gauge_id;

      sendSuccess(res, 'Certificate deleted successfully', {
        gaugeId: actualGaugeId,
        deletedPath: certificatePath
      });
    } catch (error) {
      handleCertificateError(res, error, 'delete', { gaugeId: req.params.id });
    }
  })
);

/**
 * DELETE /api/gauges/:id/certificates/:certificateId
 */
router.delete('/:id/certificates/:certificateId',
  authenticateToken,
  requireOperator,
  asyncErrorHandler(async (req, res) => {
    try {
      const result = await certificateService.deleteCertificate(
        req.params.id,
        req.params.certificateId,
        req.user.id,
        req.get('user-agent'),
        req.ip
      );

      const { gauge } = await certificateService.getCertificates(req.params.id);
      const actualGaugeId = gauge.gauge_id;

      sendSuccess(res, 'Certificate deleted successfully', {
        gaugeId: actualGaugeId,
        certificateId: req.params.certificateId,
        deletedPath: result.dropbox_path
      });
    } catch (error) {
      handleCertificateError(res, error, 'delete', {
        gaugeId: req.params.id,
        certificateId: req.params.certificateId
      });
    }
  })
);

/**
 * GET /api/gauges/:id/certificates/:certificateId/download
 */
router.get('/:id/certificates/:certificateId/download',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    try {
      const sharedLink = await certificateService.getCertificateDownloadLink(
        req.params.id,
        req.params.certificateId
      );
      res.redirect(sharedLink);
    } catch (error) {
      // Handle file not found in Dropbox gracefully
      if (error.code === 'FILE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      handleCertificateError(res, error, 'download', {
        gaugeId: req.params.id,
        certificateId: req.params.certificateId
      });
    }
  })
);

/**
 * PATCH /api/gauges/:id/certificates/:certificateId
 */
router.patch('/:id/certificates/:certificateId',
  authenticateToken,
  requireOperator,
  asyncErrorHandler(async (req, res) => {
    try {
      const validatedName = certificateService.validateCertificateName(req.body.customName);

      const result = await certificateService.updateCertificateName(
        req.params.id,
        req.params.certificateId,
        validatedName,
        req.user.id,
        req.get('user-agent'),
        req.ip
      );

      const { gauge } = await certificateService.getCertificates(req.params.id);
      const actualGaugeId = gauge.gauge_id;

      sendSuccess(res, 'Certificate renamed successfully', {
        id: result.id,
        customName: result.custom_name,
        gaugeId: actualGaugeId
      });
    } catch (error) {
      handleCertificateError(res, error, 'rename', {
        gaugeId: req.params.id,
        certificateId: req.params.certificateId
      });
    }
  })
);

/**
 * POST /api/gauges/:id/certificates/sync
 * Sync certificates from Dropbox to database
 * Note: Removed requireOperator - anyone can sync to view certificates added directly to Dropbox
 */
router.post('/:id/certificates/sync',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    try {
      const result = await certificateService.syncDropboxCertificates(
        req.params.id,
        req.user.id,
        req.get('user-agent'),
        req.ip
      );

      const { gauge } = await certificateService.getCertificates(req.params.id);
      const actualGaugeId = gauge.gauge_id;

      sendSuccess(res, `Synced ${result.syncedCount} certificate(s) from storage`, {
        gaugeId: actualGaugeId,
        syncedCount: result.syncedCount,
        skippedCount: result.skippedCount,
        removedCount: result.removedCount,
        syncedCertificates: result.syncedCertificates,
        skippedDuplicates: result.skippedDuplicates
      });
    } catch (error) {
      handleCertificateError(res, error, 'sync', {
        gaugeId: req.params.id
      });
    }
  })
);

module.exports = router;
