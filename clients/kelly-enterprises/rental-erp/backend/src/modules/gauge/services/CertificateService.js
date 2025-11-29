const certificateRepository = require('../repositories/CertificateRepository');
const dropboxService = require('../../../infrastructure/services/DropboxService');
const auditService = require('../../../infrastructure/audit/auditService');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');
const { cleanupTempFile } = require('../../../infrastructure/middleware/upload');
const dbConnection = require('../../../infrastructure/database/connection');
const crypto = require('crypto');
const fs = require('fs').promises;

/**
 * CertificateService - Handles gauge certificate operations
 * Manages certificate uploads, downloads, naming, and Dropbox integration
 */
class CertificateService {
  /**
   * Generate unique certificate name with auto-increment suffix
   * Format: {EXTENSION}_Certificate_{YYYY.MM.DD}_{N}
   */
  generateCertificateName(fileExtension, existingCertificates) {
    const uploadDate = new Date();
    const year = uploadDate.getFullYear();
    const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
    const day = String(uploadDate.getDate()).padStart(2, '0');
    const dateCode = `${year}.${month}.${day}`;

    const baseName = `${fileExtension.toUpperCase()}_Certificate_${dateCode}`;

    // Check for existing certificates with same base name
    const existingWithBaseName = existingCertificates.filter(cert =>
      cert.custom_name && cert.custom_name.startsWith(baseName)
    );

    if (existingWithBaseName.length === 0) {
      return baseName;
    }

    // Find highest suffix number
    const suffixes = existingWithBaseName.map(cert => {
      const match = cert.custom_name.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:_(\\d+))?$`));
      return match && match[1] ? parseInt(match[1], 10) : 1;
    });

    const nextSuffix = Math.max(...suffixes, 0) + 1;
    return `${baseName}_${nextSuffix}`;
  }

  /**
   * Upload certificate for a gauge with automatic supersession
   * Reference: ADDENDUM lines 1434-1455
   */
  async uploadCertificate(gaugeId, file, userId) {
    let tempFilePath = file.path;
    const pool = dbConnection.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Initialize Dropbox if needed
      if (!dropboxService.isAvailable()) {
        dropboxService.initialize();
      }

      if (!dropboxService.isAvailable()) {
        await cleanupTempFile(tempFilePath);
        throw new Error('Certificate storage service is not configured');
      }

      // Verify gauge exists
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);

      if (!gauge) {
        await cleanupTempFile(tempFilePath);
        throw new Error('Gauge not found');
      }

      const actualGaugeId = gauge.gauge_id;

      // Get existing certificates (all) for naming
      const existingCertificates = await certificateRepository.findByGaugeId(gauge.id, {}, connection);

      // Get current certificates for supersession
      const currentCertificates = await certificateRepository.findByGaugeId(
        gauge.id,
        { is_current: true },
        connection
      );

      // Calculate file hash for duplicate detection
      const fileContent = await fs.readFile(tempFilePath);
      const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
      const fileSize = fileContent.length;

      // Check for duplicate by content hash
      const duplicate = await certificateRepository.findByFileHash(gauge.id, fileHash, fileSize);
      if (duplicate) {
        await cleanupTempFile(tempFilePath);
        throw new Error(
          `This certificate has already been uploaded for gauge ${actualGaugeId}. ` +
          `Existing certificate: ${duplicate.custom_name} (uploaded ${new Date(duplicate.uploaded_at).toLocaleDateString()})`
        );
      }

      // Generate certificate name
      const fileExtension = file.originalname.split('.').pop().toLowerCase();
      const certificateName = this.generateCertificateName(fileExtension, existingCertificates);

      logger.info('Uploading certificate with supersession', {
        gaugeId: actualGaugeId,
        fileName: file.originalname,
        customName: certificateName,
        fileHash,
        fileSize,
        currentCertificatesCount: currentCertificates.length,
        userId
      });

      // Upload to Dropbox
      const formattedFilename = `${certificateName}.${fileExtension}`;
      const uploadResult = await dropboxService.uploadCertificate(
        tempFilePath,
        actualGaugeId,
        formattedFilename,
        true  // Skip Dropbox duplicate check since we already checked database
      );

      // Mark old certificates as superseded FIRST (to avoid constraint violation)
      for (const oldCert of currentCertificates) {
        await certificateRepository.update(oldCert.id, {
          is_current: false,
          superseded_at: new Date(),
          superseded_by: null  // Will be updated after new cert is created
        }, connection);

        logger.info('Certificate marked for supersession', {
          oldCertificateId: oldCert.id,
          gaugeId: actualGaugeId
        });
      }

      // NOW create new certificate record with is_current = TRUE
      const certificate = await certificateRepository.create({
        gauge_id: gauge.id,
        dropbox_path: uploadResult.dropboxPath,
        custom_name: certificateName,
        file_size: uploadResult.fileSize,
        file_hash: fileHash,
        file_extension: fileExtension,
        uploaded_by: userId,
        is_current: true
      }, connection);

      // Update old certificates with the new certificate ID
      for (const oldCert of currentCertificates) {
        await certificateRepository.update(oldCert.id, {
          superseded_by: certificate.id
        }, connection);

        logger.info('Certificate superseded', {
          oldCertificateId: oldCert.id,
          newCertificateId: certificate.id,
          gaugeId: actualGaugeId
        });
      }

      await connection.commit();

      logger.info('Certificate upload completed', {
        gaugeId: actualGaugeId,
        certificateId: certificate.id,
        dropboxPath: uploadResult.dropboxPath
      });

      // Clean up temp file
      await cleanupTempFile(tempFilePath);

      logger.info('Certificate uploaded successfully with supersession', {
        gaugeId: actualGaugeId,
        certificateId: certificate.id,
        supersededCount: currentCertificates.length,
        userId
      });

      return {
        certificate,
        gauge,
        uploadResult,
        supersededCount: currentCertificates.length
      };
    } catch (error) {
      await connection.rollback();
      await cleanupTempFile(tempFilePath);
      logger.error('Error uploading certificate:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all certificates for a gauge with Dropbox link enrichment
   */
  async getCertificates(gaugeId) {
    const gaugeService = serviceRegistry.get('GaugeService');
    const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);

    if (!gauge) {
      throw new Error('Gauge not found');
    }

    const certificates = await certificateRepository.findByGaugeId(gauge.id);
    return { gauge, certificates };
  }

  /**
   * Get formatted certificates with Dropbox metadata and shared links
   */
  async getFormattedCertificates(gaugeId) {
    const { gauge, certificates } = await this.getCertificates(gaugeId);
    const actualGaugeId = gauge.gauge_id;

    const formattedCertificates = [];
    const orphanedCertificates = [];

    for (const cert of certificates) {
      // Check if file exists in Dropbox
      let fileExists = true;
      if (dropboxService.isAvailable()) {
        try {
          await dropboxService.dropbox.filesGetMetadata({ path: cert.dropbox_path });
        } catch (metadataError) {
          const isNotFound = metadataError.error?.['.tag'] === 'path' && metadataError.error.path?.['.tag'] === 'not_found';
          const is409Error = metadataError.message?.includes('409');

          if (isNotFound || is409Error) {
            fileExists = false;
            orphanedCertificates.push(cert.id);
            logger.warn('Certificate file not found in Dropbox', {
              certificateId: cert.id,
              dropboxPath: cert.dropbox_path
            });
          }
        }
      }

      if (!fileExists) continue;

      const formattedCert = {
        id: cert.id,
        name: `${cert.file_extension.toLowerCase()}_certificate.${cert.file_extension}`,
        path: cert.dropbox_path,
        size: cert.file_size,
        uploadedAt: cert.uploaded_at,
        customName: cert.custom_name,
        uploadedBy: cert.uploaded_by_username
      };

      // Get shared link if available
      if (dropboxService.isAvailable()) {
        try {
          const existingLinks = await dropboxService.dropbox.sharingListSharedLinks({
            path: cert.dropbox_path,
            direct_only: true
          });
          if (existingLinks.result.links.length > 0) {
            formattedCert.sharedLink = existingLinks.result.links[0].url.replace('?dl=0', '?dl=1');
          }
        } catch (linkError) {
          logger.warn('Could not get shared link', { certificateId: cert.id });
        }
      }

      formattedCertificates.push(formattedCert);
    }

    // Clean up orphaned records
    for (const orphanedId of orphanedCertificates) {
      try {
        await certificateRepository.deleteById(orphanedId);
        logger.info('Deleted orphaned certificate', { certificateId: orphanedId });
      } catch (deleteError) {
        logger.error('Failed to delete orphaned certificate', { certificateId: orphanedId });
      }
    }

    return {
      gaugeId: actualGaugeId,
      gaugeName: gauge.name,
      certificates: formattedCertificates
    };
  }

  /**
   * Get shared link for certificate download
   */
  async getCertificateDownloadLink(gaugeId, certificateId) {
    const { gauge, certificates } = await this.getCertificates(gaugeId);
    const certificate = certificates.find(c => c.id == certificateId);

    if (!certificate) {
      throw new Error('Certificate not found for this gauge');
    }

    if (!dropboxService.isAvailable()) {
      throw new Error('Certificate storage service is not configured');
    }

    // Check if file exists in Dropbox first
    try {
      await dropboxService.dropbox.filesGetMetadata({ path: certificate.dropbox_path });
    } catch (metadataError) {
      // Check for various file-not-found error formats
      const isNotFound =
        metadataError.status === 409 ||
        metadataError.error?.['.tag'] === 'path' ||
        metadataError.error?.path?.['.tag'] === 'not_found' ||
        metadataError.message?.includes('not_found') ||
        metadataError.message?.includes('409');

      if (isNotFound) {
        logger.warn('Certificate file not found in Dropbox', {
          certificateId,
          dropboxPath: certificate.dropbox_path,
          gaugeId
        });

        const error = new Error('Certificate file not found in storage. It may have been manually deleted.');
        error.code = 'FILE_NOT_FOUND';
        throw error;
      }

      // Re-throw other errors
      throw metadataError;
    }

    // Try to get existing shared link first
    let sharedLink = null;

    try {
      const existingLinks = await dropboxService.dropbox.sharingListSharedLinks({
        path: certificate.dropbox_path,
        direct_only: true
      });
      if (existingLinks.result.links.length > 0) {
        sharedLink = existingLinks.result.links[0].url;
        logger.info('Found existing shared link', { certificateId });
      }
    } catch (listError) {
      logger.warn('Could not list existing shared links', { error: listError.message });
    }

    // If no existing link, create a temporary one
    if (!sharedLink) {
      const tempLinkResponse = await dropboxService.dropbox.filesGetTemporaryLink({
        path: certificate.dropbox_path
      });
      sharedLink = tempLinkResponse.result.link;
      logger.info('Created temporary shared link', { certificateId });
    }

    return sharedLink;
  }

  /**
   * Validate certificate name
   */
  validateCertificateName(customName) {
    if (!customName || customName.trim() === '') {
      throw new Error('Certificate name is required');
    }

    if (/[<>:"/\\|?*\x00-\x1F]/.test(customName)) {
      throw new Error('Certificate name contains invalid characters. Please avoid: < > : " / \\ | ? *');
    }

    if (customName.trim().length > 100) {
      throw new Error('Certificate name is too long. Maximum 100 characters.');
    }

    return customName.trim();
  }

  /**
   * Delete all certificates for a gauge
   */
  async deleteAllCertificates(gaugeId, userId, userAgent, ipAddress) {
    const gaugeService = serviceRegistry.get('GaugeService');
    const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);

    if (!gauge) {
      throw new Error('Gauge not found');
    }

    const certificates = await certificateRepository.findByGaugeId(gauge.id);

    if (certificates.length === 0) {
      throw new Error('No certificates found for this gauge');
    }

    const actualGaugeId = gauge.gauge_id;

    // Delete from Dropbox
    const deletionResults = await Promise.allSettled(
      certificates.map(cert => dropboxService.deleteCertificate(cert.dropbox_path))
    );

    // Delete from database
    await certificateRepository.deleteByGaugeId(gauge.id);

    // Log audit
    await auditService.logAction({
      userId,
      module: 'gauge',
      action: 'certificates_deleted_all',
      tableName: 'certificates',
      recordId: gauge.id,
      entity_type: 'gauge',
      entity_id: gauge.id,
      oldValues: { certificate_count: certificates.length },
      newValues: { certificate_count: 0 },
      ipAddress,
      userAgent
    });

    logger.info('All certificates deleted', {
      gaugeId: actualGaugeId,
      count: certificates.length,
      userId
    });

    return { deletedCount: certificates.length, deletionResults };
  }

  /**
   * Delete a specific certificate
   */
  async deleteCertificate(gaugeId, certificateId, userId, userAgent, ipAddress) {
    const gaugeService = serviceRegistry.get('GaugeService');
    const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);

    if (!gauge) {
      throw new Error('Gauge not found');
    }

    const certificate = await certificateRepository.findById(certificateId);

    // Use loose equality to handle string/number comparison
    if (!certificate || certificate.gauge_id != gauge.id) {
      throw new Error('Certificate not found for this gauge');
    }

    const actualGaugeId = gauge.gauge_id;
    const pool = dbConnection.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Store certificate info before deletion
      const wasCurrent = certificate.is_current;
      const dropboxPath = certificate.dropbox_path;

      // Initialize Dropbox if needed
      if (!dropboxService.isAvailable()) {
        dropboxService.initialize();
      }

      // Delete from Dropbox first
      if (dropboxService.isAvailable()) {
        try {
          await dropboxService.deleteCertificate(dropboxPath);
          logger.info('Certificate file deleted from Dropbox', {
            certificateId,
            dropboxPath
          });
        } catch (dropboxError) {
          logger.error('Failed to delete certificate from Dropbox', {
            certificateId,
            dropboxPath,
            error: dropboxError.message
          });
          // Continue with DB deletion even if Dropbox fails
          // Cleanup job will handle orphaned DB records
        }
      } else {
        logger.warn('Dropbox not available - skipping file deletion', {
          certificateId,
          dropboxPath
        });
      }

      // Clear any superseded_by references pointing to this certificate
      await connection.query(`
        UPDATE certificates
        SET superseded_by = NULL
        WHERE superseded_by = ?
      `, [certificateId]);

      // Delete certificate from database
      await certificateRepository.delete(certificateId, connection);

      // If current certificate deleted, promote the next most recent one
      if (wasCurrent) {
        const [candidates] = await connection.query(`
          SELECT id, custom_name FROM certificates
          WHERE gauge_id = ? AND is_current = 0
          ORDER BY uploaded_at DESC
          LIMIT 1
        `, [gauge.id]);

        if (candidates.length > 0) {
          await connection.query(`
            UPDATE certificates
            SET is_current = 1, superseded_at = NULL, superseded_by = NULL
            WHERE id = ?
          `, [candidates[0].id]);

          logger.info('Promoted certificate to current after deletion', {
            gaugeId: gauge.gauge_id,
            deletedCertificateId: certificateId,
            promotedCertificateId: candidates[0].id,
            promotedCertificateName: candidates[0].custom_name
          });
        } else {
          logger.info('No certificates remain for gauge after deletion', {
            gaugeId: gauge.gauge_id,
            deletedCertificateId: certificateId
          });
        }
      } else {
        logger.info('Non-current certificate deleted', {
          gaugeId: gauge.gauge_id,
          certificateId,
          dropboxPath
        });
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // Log audit
    await auditService.logAction({
      userId,
      module: 'gauge',
      action: 'certificate_deleted',
      tableName: 'certificates',
      recordId: certificateId,
      entity_type: 'gauge',
      entity_id: gauge.id,
      oldValues: {
        certificate_id: certificateId,
        custom_name: certificate.custom_name,
        dropbox_path: certificate.dropbox_path
      },
      newValues: null,
      ipAddress,
      userAgent
    });

    logger.info('Certificate deleted', {
      gaugeId: actualGaugeId,
      certificateId,
      userId
    });

    return certificate;
  }

  /**
   * Download certificate
   */
  async downloadCertificate(gaugeId, certificateId) {
    const gaugeService = serviceRegistry.get('GaugeService');
    const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);

    if (!gauge) {
      throw new Error('Gauge not found');
    }

    const certificate = await certificateRepository.findById(certificateId);

    // Use loose equality to handle string/number comparison
    if (!certificate || certificate.gauge_id != gauge.id) {
      throw new Error('Certificate not found for this gauge');
    }

    const actualGaugeId = gauge.gauge_id;

    logger.info('Downloading certificate', {
      gaugeId: actualGaugeId,
      certificateId,
      dropboxPath: certificate.dropbox_path
    });

    const fileData = await dropboxService.downloadCertificate(certificate.dropbox_path);

    return {
      fileData,
      certificate,
      fileName: `${certificate.custom_name || 'certificate'}.${certificate.file_extension}`
    };
  }

  /**
   * Update certificate custom name
   */
  async updateCertificateName(gaugeId, certificateId, customName, userId, userAgent, ipAddress) {
    const gaugeService = serviceRegistry.get('GaugeService');
    const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);

    if (!gauge) {
      throw new Error('Gauge not found');
    }

    const certificate = await certificateRepository.findById(certificateId);

    // Use loose equality to handle string/number comparison
    if (!certificate || certificate.gauge_id != gauge.id) {
      throw new Error('Certificate not found for this gauge');
    }

    const oldName = certificate.custom_name;
    const oldDropboxPath = certificate.dropbox_path;
    const actualGaugeId = gauge.gauge_id;

    // Construct new filename with extension
    const newFilename = `${customName}.${certificate.file_extension}`;
    let newDropboxPath = oldDropboxPath;

    // Rename file in Dropbox if service is available
    if (dropboxService.isAvailable()) {
      try {
        logger.info('Renaming certificate file in Dropbox', {
          gaugeId: actualGaugeId,
          certificateId,
          oldPath: oldDropboxPath,
          newFilename
        });

        const renameResult = await dropboxService.renameCertificate(oldDropboxPath, newFilename);
        newDropboxPath = renameResult.newPath;

        logger.info('Certificate file renamed in Dropbox', {
          gaugeId: actualGaugeId,
          certificateId,
          oldPath: oldDropboxPath,
          newPath: newDropboxPath
        });
      } catch (dropboxError) {
        logger.error('Failed to rename certificate in Dropbox', {
          gaugeId: actualGaugeId,
          certificateId,
          oldPath: oldDropboxPath,
          error: dropboxError.message
        });
        // Don't throw - allow database update to proceed even if Dropbox rename fails
        // This keeps the system functional even if Dropbox is temporarily unavailable
      }
    } else {
      logger.warn('Dropbox not available - skipping file rename', {
        gaugeId: actualGaugeId,
        certificateId
      });
    }

    // Update database with new custom name and dropbox path
    await certificateRepository.update(certificateId, {
      custom_name: customName,
      dropbox_path: newDropboxPath
    });

    // Log audit
    await auditService.logAction({
      userId,
      module: 'gauge',
      action: 'certificate_renamed',
      tableName: 'certificates',
      recordId: certificateId,
      entity_type: 'gauge',
      entity_id: gauge.id,
      oldValues: {
        custom_name: oldName,
        dropbox_path: oldDropboxPath
      },
      newValues: {
        custom_name: customName,
        dropbox_path: newDropboxPath
      },
      ipAddress,
      userAgent
    });

    logger.info('Certificate renamed', {
      gaugeId: actualGaugeId,
      certificateId,
      oldName,
      newName: customName,
      oldPath: oldDropboxPath,
      newPath: newDropboxPath,
      userId
    });

    return {
      ...certificate,
      custom_name: customName,
      dropbox_path: newDropboxPath
    };
  }

  /**
   * Sync certificates from Dropbox to database
   * Finds files in Dropbox that aren't in the database and creates records for them
   */
  async syncDropboxCertificates(gaugeId, userId, userAgent, ipAddress) {
    const gaugeService = serviceRegistry.get('GaugeService');
    const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);

    if (!gauge) {
      throw new Error('Gauge not found');
    }

    const actualGaugeId = gauge.gauge_id;

    // Initialize Dropbox if needed
    if (!dropboxService.isAvailable()) {
      dropboxService.initialize();
    }

    // Gracefully handle case where Dropbox is not configured (optional feature)
    if (!dropboxService.isAvailable()) {
      logger.info('Dropbox not configured - skipping certificate sync', {
        gaugeId: actualGaugeId,
        userId
      });

      return {
        syncedCount: 0,
        removedCount: 0,
        skippedCount: 0,
        syncedCertificates: []
      };
    }

    logger.info('Starting Dropbox sync', {
      gaugeId: actualGaugeId,
      userId
    });

    // Get all files from Dropbox
    let dropboxFiles;
    try {
      dropboxFiles = await dropboxService.listCertificates(actualGaugeId);
    } catch (error) {
      // Handle case where folder doesn't exist in Dropbox
      if (error.error?.error?.['.tag'] === 'path' && error.error?.error?.path?.['.tag'] === 'not_found') {
        logger.info('Dropbox folder not found for gauge', {
          gaugeId: actualGaugeId,
          message: 'No certificates folder exists yet'
        });

        return {
          syncedCount: 0,
          syncedCertificates: []
        };
      }

      // Re-throw other errors
      throw error;
    }

    // Get all certificates from database
    const dbCertificates = await certificateRepository.findByGaugeId(gauge.id);

    // Find files in Dropbox that aren't in database
    const dbPaths = new Set(dbCertificates.map(cert => cert.dropbox_path));
    const newFiles = dropboxFiles.filter(file => !dbPaths.has(file.path));

    // Find certificates in database that are no longer in Dropbox
    const dropboxPaths = new Set(dropboxFiles.map(file => file.path));
    const deletedCertificates = dbCertificates.filter(cert => !dropboxPaths.has(cert.dropbox_path));

    if (newFiles.length === 0 && deletedCertificates.length === 0) {
      logger.info('No changes to sync', {
        gaugeId: actualGaugeId,
        dropboxFileCount: dropboxFiles.length,
        dbCertificateCount: dbCertificates.length
      });

      return {
        syncedCount: 0,
        removedCount: 0,
        skippedCount: 0,
        syncedCertificates: []
      };
    }

    if (newFiles.length > 0) {
      logger.info('Found new files in Dropbox', {
        gaugeId: actualGaugeId,
        newFileCount: newFiles.length,
        files: newFiles.map(f => f.name)
      });
    }

    if (deletedCertificates.length > 0) {
      logger.info('Found certificates deleted from Dropbox', {
        gaugeId: actualGaugeId,
        deletedCount: deletedCertificates.length,
        files: deletedCertificates.map(c => c.custom_name)
      });
    }

    const syncedCertificates = [];
    const skippedDuplicates = [];
    const pool = dbConnection.pool;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Add new files from Dropbox
      for (const file of newFiles) {
        // Download file from Dropbox to calculate hash
        let fileHash = null;
        try {
          const downloadResponse = await dropboxService.dropbox.filesDownload({
            path: file.path
          });
          fileHash = crypto.createHash('sha256').update(downloadResponse.result.fileBinary).digest('hex');
        } catch (downloadError) {
          logger.warn('Could not download file for duplicate check during sync', {
            gaugeId: actualGaugeId,
            fileName: file.name,
            error: downloadError.message
          });
          // Continue without hash - will add file anyway if download fails
        }

        // Check for duplicate by hash if we have it
        if (fileHash) {
          const duplicate = await certificateRepository.findByFileHash(gauge.id, fileHash, file.size, connection);
          if (duplicate) {
            logger.info('Skipping duplicate certificate during sync', {
              gaugeId: actualGaugeId,
              fileName: file.name,
              existingCertificate: duplicate.custom_name
            });
            skippedDuplicates.push({
              fileName: file.name,
              existingCertificate: duplicate.custom_name
            });
            continue; // Skip this file
          }
        }

        // Extract file extension from filename
        const fileExtension = file.name.split('.').pop().toLowerCase();

        // Use filename without extension as custom name
        const customName = file.name.substring(0, file.name.lastIndexOf('.'));

        // Create database record
        const certificate = await certificateRepository.create({
          gauge_id: gauge.id,
          dropbox_path: file.path,
          custom_name: customName,
          file_size: file.size,
          file_hash: fileHash,
          file_extension: fileExtension,
          uploaded_by: userId,
          is_current: true
        }, connection);

        syncedCertificates.push({
          id: certificate.id,
          customName: certificate.custom_name,
          fileName: file.name,
          dropboxPath: file.path,
          fileSize: file.size,
          uploadedAt: certificate.uploaded_at
        });

        logger.info('Synced certificate from storage', {
          gaugeId: actualGaugeId,
          certificateId: certificate.id,
          fileName: file.name,
          dropboxPath: file.path,
          fileHash
        });
      }

      // Remove certificates that no longer exist in Dropbox
      for (const cert of deletedCertificates) {
        await certificateRepository.delete(cert.id, connection);

        logger.info('Removed certificate deleted from Dropbox', {
          gaugeId: actualGaugeId,
          certificateId: cert.id,
          customName: cert.custom_name,
          dropboxPath: cert.dropbox_path
        });
      }

      await connection.commit();

      // Log audit for the sync operation
      await auditService.logAction({
        userId,
        module: 'gauge',
        action: 'certificates_synced',
        tableName: 'certificates',
        recordId: gauge.id,
        entity_type: 'gauge',
        entity_id: gauge.id,
        oldValues: { certificate_count: dbCertificates.length },
        newValues: {
          certificate_count: dbCertificates.length + syncedCertificates.length - deletedCertificates.length,
          synced_count: syncedCertificates.length,
          skipped_count: skippedDuplicates.length,
          removed_count: deletedCertificates.length,
          synced_files: syncedCertificates.map(c => c.fileName),
          skipped_files: skippedDuplicates.map(d => d.fileName),
          removed_files: deletedCertificates.map(c => c.custom_name)
        },
        ipAddress,
        userAgent
      });

      logger.info('Storage sync completed', {
        gaugeId: actualGaugeId,
        syncedCount: syncedCertificates.length,
        skippedCount: skippedDuplicates.length,
        removedCount: deletedCertificates.length,
        userId
      });

      return {
        syncedCount: syncedCertificates.length,
        skippedCount: skippedDuplicates.length,
        removedCount: deletedCertificates.length,
        syncedCertificates,
        skippedDuplicates
      };
    } catch (error) {
      await connection.rollback();
      logger.error('Error syncing certificates from Dropbox', {
        gaugeId: actualGaugeId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new CertificateService();
