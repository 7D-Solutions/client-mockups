const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

let Dropbox;

/**
 * Dropbox Service
 * Handles file uploads to Dropbox for certificate storage
 */
class DropboxService {
  constructor() {
    this.dropbox = null;
    // Default path for App Folder access (automatically scoped to /Apps/YourAppName/)
    this.rootPath = process.env.DROPBOX_ROOT_PATH || '/certificates';
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize Dropbox client with refresh token support
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Only initialize once
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // Dynamic import for ESM module
        const dropboxModule = await import('dropbox');
        Dropbox = dropboxModule.Dropbox;

        const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
        const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
        const clientId = process.env.DROPBOX_APP_KEY;
        const clientSecret = process.env.DROPBOX_APP_SECRET;

        // Option 1: Use refresh token (preferred - never expires)
        if (refreshToken && clientId && clientSecret) {
          try {
            this.dropbox = new Dropbox({
              refreshToken,
              clientId,
              clientSecret
            });
            this.initialized = true;
            logger.info('Dropbox service initialized with refresh token (permanent solution)');
            return;
          } catch (error) {
            logger.error('Failed to initialize Dropbox with refresh token', { error: error.message });
          }
        }

        // Option 2: Fall back to access token (temporary - expires in 4 hours)
        if (accessToken) {
          try {
            this.dropbox = new Dropbox({ accessToken });
            this.initialized = true;
            logger.warn('Dropbox service initialized with short-lived access token (will expire in 4 hours)');
            return;
          } catch (error) {
            logger.error('Failed to initialize Dropbox service', { error: error.message });
            throw error;
          }
        }

        logger.warn('Dropbox not configured - certificate uploads will be disabled');
      } catch (error) {
        logger.error('Failed to load Dropbox module', { error: error.message });
      }
    })();

    return this.initPromise;
  }

  /**
   * Check if Dropbox is configured and ready
   */
  isAvailable() {
    return this.initialized && this.dropbox !== null;
  }

  /**
   * Calculate file hash for duplicate detection
   * @param {Buffer} fileContent - File content buffer
   * @returns {string} SHA256 hash of file
   */
  calculateFileHash(fileContent) {
    return crypto.createHash('sha256').update(fileContent).digest('hex');
  }

  /**
   * Check if certificate already exists for gauge
   * @param {string} gaugeId - Gauge ID
   * @param {string} fileHash - SHA256 hash of file
   * @param {number} fileSize - File size in bytes
   * @returns {Promise<Object|null>} Existing file info or null
   */
  async checkDuplicateCertificate(gaugeId, fileHash, fileSize) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const gaugeFolderPath = `${this.rootPath}/${gaugeId}`;

      // List all files in gauge folder
      const folderContents = await this.dropbox.filesListFolder({
        path: gaugeFolderPath
      });

      // Check each file for duplicate content
      for (const entry of folderContents.result.entries) {
        if (entry['.tag'] === 'file') {
          // First check: file size (fast comparison)
          if (entry.size !== fileSize) {
            continue; // Different size = different file
          }

          // Size matches - download file and compare hash
          try {
            const downloadResponse = await this.dropbox.filesDownload({
              path: entry.path_display
            });

            const existingFileHash = this.calculateFileHash(downloadResponse.result.fileBinary);

            if (existingFileHash === fileHash) {
              // Exact duplicate found
              return {
                exists: true,
                path: entry.path_display,
                name: entry.name,
                uploadedAt: entry.server_modified
              };
            }
          } catch (downloadError) {
            logger.warn('Could not download file for duplicate check', {
              gaugeId,
              file: entry.name,
              error: downloadError.message
            });
            // Continue checking other files
          }
        }
      }

      return null;
    } catch (error) {
      // Folder doesn't exist or other error - not a duplicate
      if (error.error && error.error['.tag'] === 'path' && error.error.path && error.error.path['.tag'] === 'not_found') {
        return null;
      }
      logger.warn('Error checking for duplicate certificate', {
        gaugeId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Upload a certificate file to Dropbox
   * @param {string} localFilePath - Local path to the file
   * @param {string} gaugeId - Gauge ID for organizing files
   * @param {string} originalFilename - Original filename
   * @param {boolean} skipDuplicateCheck - Skip duplicate check (for orphan cleanup)
   * @returns {Promise<Object>} Upload result with Dropbox path and shareable link
   */
  async uploadCertificate(localFilePath, gaugeId, originalFilename, skipDuplicateCheck = false) {
    await this.initialize();
    if (!this.isAvailable()) {
      throw new Error('Dropbox service is not available - check DROPBOX_ACCESS_TOKEN configuration');
    }

    try {
      // Read the file
      const fileContent = await fs.readFile(localFilePath);

      // Calculate file hash for duplicate detection
      const fileHash = this.calculateFileHash(fileContent);
      const fileSize = fileContent.length;

      // Check for duplicates (unless skipping for orphan cleanup)
      if (!skipDuplicateCheck) {
        logger.info('Checking for duplicate certificate', {
          gaugeId,
          fileHash,
          fileSize,
          fileName: originalFilename
        });

        const duplicate = await this.checkDuplicateCertificate(gaugeId, fileHash, fileSize);
        if (duplicate) {
          logger.warn('Duplicate certificate detected', {
            gaugeId,
            existingFile: duplicate.name,
            uploadedAt: duplicate.uploadedAt
          });

          throw new Error(
            `This certificate has already been uploaded for gauge ${gaugeId}. ` +
            `Existing file: ${duplicate.name} (uploaded ${new Date(duplicate.uploadedAt).toLocaleDateString()})`
          );
        }
      } else {
        logger.info('Skipping duplicate check (orphan cleanup mode)', {
          gaugeId,
          fileHash,
          fileSize,
          fileName: originalFilename
        });
      }

      // Use the provided filename (already formatted by the caller)
      // The caller (gauge-certificates route) generates the formatted name
      const dropboxPath = `${this.rootPath}/${gaugeId}/${originalFilename}`;

      logger.info('Uploading certificate to Dropbox', {
        gaugeId,
        dropboxPath,
        fileSize: fileContent.length,
        fileHash
      });

      // Upload to Dropbox
      const uploadResponse = await this.dropbox.filesUpload({
        path: dropboxPath,
        contents: fileContent,
        mode: 'add',
        autorename: true,
        mute: false
      });

      logger.info('Certificate uploaded successfully', {
        gaugeId,
        dropboxPath: uploadResponse.result.path_display,
        fileId: uploadResponse.result.id
      });

      // Generate a shareable link (for viewing in the app)
      let sharedLink = null;
      try {
        const linkResponse = await this.dropbox.sharingCreateSharedLinkWithSettings({
          path: uploadResponse.result.path_display,
          settings: {
            requested_visibility: 'public',
            audience: 'public',
            access: 'viewer'
          }
        });
        sharedLink = linkResponse.result.url;

        // Convert to direct download link (replace ?dl=0 with ?dl=1)
        sharedLink = sharedLink.replace('?dl=0', '?dl=1');
      } catch (linkError) {
        // If link already exists, get existing link
        if (linkError.error && linkError.error['.tag'] === 'shared_link_already_exists') {
          try {
            const existingLinks = await this.dropbox.sharingListSharedLinks({
              path: uploadResponse.result.path_display,
              direct_only: true
            });
            if (existingLinks.result.links.length > 0) {
              sharedLink = existingLinks.result.links[0].url.replace('?dl=0', '?dl=1');
            }
          } catch (listError) {
            logger.warn('Could not retrieve existing shared link', { error: listError.message });
          }
        } else {
          logger.warn('Could not create shared link', { error: linkError.message });
        }
      }

      return {
        success: true,
        dropboxPath: uploadResponse.result.path_display,
        fileId: uploadResponse.result.id,
        sharedLink,
        fileName: uploadResponse.result.name,
        fileSize: uploadResponse.result.size,
        uploadedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to upload certificate to Dropbox', {
        gaugeId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Dropbox upload failed: ${error.message}`);
    }
  }

  /**
   * List all certificates for a gauge
   * @param {string} gaugeId - Gauge ID
   * @returns {Promise<Array>} List of certificates with metadata
   */
  async listCertificates(gaugeId) {
    await this.initialize();
    if (!this.isAvailable()) {
      throw new Error('Dropbox service is not available');
    }

    try {
      const gaugeFolderPath = `${this.rootPath}/${gaugeId}`;

      // List all files in gauge folder
      const folderContents = await this.dropbox.filesListFolder({
        path: gaugeFolderPath
      });

      const certificates = [];

      for (const entry of folderContents.result.entries) {
        if (entry['.tag'] === 'file') {
          // Get shareable link for the file
          let sharedLink = null;
          try {
            const existingLinks = await this.dropbox.sharingListSharedLinks({
              path: entry.path_display,
              direct_only: true
            });
            if (existingLinks.result.links.length > 0) {
              sharedLink = existingLinks.result.links[0].url.replace('?dl=0', '?dl=1');
            }
          } catch (linkError) {
            logger.warn('Could not get shared link for certificate', {
              path: entry.path_display,
              error: linkError.message
            });
          }

          certificates.push({
            name: entry.name,
            path: entry.path_display,
            size: entry.size,
            uploadedAt: entry.server_modified,
            id: entry.id,
            sharedLink
          });
        }
      }

      // Sort by upload date (newest first)
      certificates.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

      return certificates;
    } catch (error) {
      // Folder doesn't exist - return empty array
      if (error.error && error.error['.tag'] === 'path' && error.error.path && error.error.path['.tag'] === 'not_found') {
        return [];
      }

      // Handle 409 conflict errors (folder exists but has conflicts) - return empty array
      if (error.status === 409 || error.message?.includes('409')) {
        logger.info('Dropbox folder conflict for gauge - returning empty', {
          gaugeId,
          message: 'Folder may have naming conflicts or be in inconsistent state'
        });
        return [];
      }

      logger.error('Failed to list certificates from Dropbox', {
        gaugeId,
        error: error.message
      });
      throw new Error(`Failed to list certificates: ${error.message}`);
    }
  }

  /**
   * Rename a certificate file in Dropbox
   * @param {string} oldPath - Current path to the file in Dropbox
   * @param {string} newName - New filename (without path, with extension)
   * @returns {Promise<Object>} Rename result with new path
   */
  async renameCertificate(oldPath, newName) {
    await this.initialize();
    if (!this.isAvailable()) {
      throw new Error('Dropbox service is not available');
    }

    try {
      // Extract the directory path and construct new path
      const pathParts = oldPath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');

      logger.info('Renaming certificate in Dropbox', {
        oldPath,
        newPath,
        newName
      });

      // Use Dropbox move API to rename the file
      const moveResponse = await this.dropbox.filesMoveV2({
        from_path: oldPath,
        to_path: newPath,
        autorename: false
      });

      logger.info('Certificate renamed successfully in Dropbox', {
        oldPath,
        newPath
      });

      return {
        success: true,
        oldPath,
        newPath: moveResponse.result.metadata.path_display
      };
    } catch (error) {
      logger.error('Failed to rename certificate in Dropbox', {
        oldPath,
        newName,
        error: error.message
      });
      throw new Error(`Dropbox rename failed: ${error.message}`);
    }
  }

  /**
   * Delete a certificate from Dropbox
   * @param {string} dropboxPath - Path to the file in Dropbox
   */
  async deleteCertificate(dropboxPath) {
    await this.initialize();
    if (!this.isAvailable()) {
      throw new Error('Dropbox service is not available');
    }

    try {
      await this.dropbox.filesDeleteV2({ path: dropboxPath });
      logger.info('Certificate deleted from Dropbox', { dropboxPath });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete certificate from Dropbox', {
        dropboxPath,
        error: error.message
      });
      throw new Error(`Dropbox delete failed: ${error.message}`);
    }
  }

  /**
   * Get file metadata from Dropbox
   * @param {string} dropboxPath - Path to the file in Dropbox
   */
  async getFileMetadata(dropboxPath) {
    await this.initialize();
    if (!this.isAvailable()) {
      throw new Error('Dropbox service is not available');
    }

    try {
      const response = await this.dropbox.filesGetMetadata({ path: dropboxPath });
      return response.result;
    } catch (error) {
      logger.error('Failed to get file metadata from Dropbox', {
        dropboxPath,
        error: error.message
      });
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }
}

// Export singleton instance
const dropboxService = new DropboxService();

module.exports = dropboxService;
