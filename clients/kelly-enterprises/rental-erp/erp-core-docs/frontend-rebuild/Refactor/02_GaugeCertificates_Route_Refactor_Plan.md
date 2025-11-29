# gauge-certificates.js Route Refactoring Plan

**Status**: Critical - 987 lines, 6 routes
**Priority**: #2 - Highest
**Location**: `backend/src/modules/gauge/routes/gauge-certificates.js`

---

## Problem Analysis

**Fat Route Handlers**:
- 987 lines for only 6 routes = **164 lines per route average**
- Massive inline business logic in route handlers
- File upload, validation, database operations all in routes
- Violates separation of concerns
- Hard to test, hard to reuse

**Route Complexity**:
```
Route                  Lines   Complexity
─────────────────────  ─────  ──────────
POST /upload           ~200    Very High
GET /:gaugeId          ~150    Medium
DELETE /:id            ~180    High
PUT /:id/rename        ~160    High
GET /:id/download      ~150    Medium
GET /gauge/:gaugeId    ~147    Medium
```

---

## Refactoring Strategy

### Extract Service Layer

**Create**: `GaugeCertificateService.js` (~400 lines)

**Keep Routes Thin** (~200 lines total for all 6 routes)

---

## New File: GaugeCertificateService.js

**Purpose**: Handle all certificate business logic

### Service Structure

```javascript
// backend/src/modules/gauge/services/GaugeCertificateService.js

const BaseService = require('../../../infrastructure/services/BaseService');
const CertificateRepository = require('../repositories/CertificateRepository');
const GaugeRepository = require('../repositories/GaugeRepository');
const DropboxService = require('../../../infrastructure/services/DropboxService');
const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');
const path = require('path');

class GaugeCertificateService extends BaseService {
  constructor() {
    super(new CertificateRepository());
    this.gaugeRepository = new GaugeRepository();
    this.dropboxService = new DropboxService();
  }

  /**
   * Upload a certificate for a gauge
   * @param {Object} file - Uploaded file from multer
   * @param {Object} metadata - Certificate metadata
   * @param {number} userId - User uploading
   * @returns {Promise<Object>} Upload result
   */
  async uploadCertificate(file, metadata, userId) {
    // Validate file
    this.validateFile(file);

    // Validate gauge exists
    const gauge = await this.gaugeRepository.findByGaugeId(metadata.gaugeId);
    if (!gauge) {
      throw new Error(`Gauge ${metadata.gaugeId} not found`);
    }

    return this.executeInTransaction(async (connection) => {
      // Generate unique filename
      const filename = this.generateCertificateFilename(
        gauge.system_gauge_id,
        file.originalname
      );

      // Upload to Dropbox
      const dropboxPath = await this.dropboxService.uploadFile(
        file.buffer,
        filename,
        'certificates'
      );

      // Save to database
      const certificate = await this.repository.create({
        gauge_id: gauge.id,
        gauge_system_id: gauge.system_gauge_id,
        file_name: file.originalname,
        display_name: metadata.displayName || file.originalname,
        file_path: dropboxPath,
        file_size: file.size,
        mime_type: file.mimetype,
        uploaded_by: userId,
        description: metadata.description || null,
        certificate_type: metadata.certificateType || 'calibration'
      }, connection);

      // Audit log
      await auditService.logAction({
        module: 'gauge',
        action: 'certificate_uploaded',
        entity_type: 'certificate',
        entity_id: certificate.id,
        user_id: userId,
        ip_address: metadata.ipAddress || '127.0.0.1',
        details: {
          gauge_id: gauge.system_gauge_id,
          file_name: file.originalname,
          file_size: file.size
        }
      });

      return certificate;
    });
  }

  /**
   * Get certificates for a gauge
   * @param {string} gaugeId - Gauge ID (system_gauge_id)
   * @returns {Promise<Array>} List of certificates
   */
  async getCertificatesByGaugeId(gaugeId) {
    const gauge = await this.gaugeRepository.findByGaugeId(gaugeId);
    if (!gauge) {
      throw new Error(`Gauge ${gaugeId} not found`);
    }

    const certificates = await this.repository.findByGaugeId(gauge.id);

    // Add download URLs
    return certificates.map(cert => ({
      ...cert,
      download_url: `/api/gauges/certificates/${cert.id}/download`,
      preview_url: this.getPreviewUrl(cert)
    }));
  }

  /**
   * Delete a certificate
   * @param {number} certificateId - Certificate ID
   * @param {number} userId - User deleting
   * @returns {Promise<Object>} Delete result
   */
  async deleteCertificate(certificateId, userId) {
    return this.executeInTransaction(async (connection) => {
      // Get certificate
      const certificate = await this.repository.findById(certificateId, connection);
      if (!certificate) {
        throw new Error('Certificate not found');
      }

      // Delete from Dropbox
      try {
        await this.dropboxService.deleteFile(certificate.file_path);
      } catch (error) {
        logger.warn('Failed to delete from Dropbox:', {
          certificateId,
          filePath: certificate.file_path,
          error: error.message
        });
        // Continue with database deletion even if Dropbox fails
      }

      // Delete from database
      await this.repository.delete(certificateId, connection);

      // Audit log
      await auditService.logAction({
        module: 'gauge',
        action: 'certificate_deleted',
        entity_type: 'certificate',
        entity_id: certificateId,
        user_id: userId,
        details: {
          gauge_system_id: certificate.gauge_system_id,
          file_name: certificate.file_name
        }
      });

      return { success: true, message: 'Certificate deleted successfully' };
    });
  }

  /**
   * Rename a certificate
   * @param {number} certificateId - Certificate ID
   * @param {string} newDisplayName - New display name
   * @param {number} userId - User renaming
   * @returns {Promise<Object>} Rename result
   */
  async renameCertificate(certificateId, newDisplayName, userId) {
    return this.executeInTransaction(async (connection) => {
      // Validate certificate exists
      const certificate = await this.repository.findById(certificateId, connection);
      if (!certificate) {
        throw new Error('Certificate not found');
      }

      // Validate name
      if (!newDisplayName || newDisplayName.trim().length === 0) {
        throw new Error('Display name cannot be empty');
      }

      // Update
      await this.repository.update(certificateId, {
        display_name: newDisplayName.trim()
      }, connection);

      // Audit log
      await auditService.logAction({
        module: 'gauge',
        action: 'certificate_renamed',
        entity_type: 'certificate',
        entity_id: certificateId,
        user_id: userId,
        details: {
          old_name: certificate.display_name,
          new_name: newDisplayName,
          gauge_system_id: certificate.gauge_system_id
        }
      });

      return {
        success: true,
        message: 'Certificate renamed successfully',
        certificate: {
          ...certificate,
          display_name: newDisplayName.trim()
        }
      };
    });
  }

  /**
   * Download a certificate
   * @param {number} certificateId - Certificate ID
   * @returns {Promise<Object>} File stream and metadata
   */
  async downloadCertificate(certificateId) {
    // Get certificate
    const certificate = await this.repository.findById(certificateId);
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    // Get file from Dropbox
    const fileBuffer = await this.dropboxService.downloadFile(certificate.file_path);

    return {
      buffer: fileBuffer,
      filename: certificate.file_name,
      mimeType: certificate.mime_type || 'application/octet-stream',
      size: certificate.file_size
    };
  }

  /**
   * Get certificate by ID with details
   * @param {number} certificateId - Certificate ID
   * @returns {Promise<Object>} Certificate details
   */
  async getCertificateById(certificateId) {
    const certificate = await this.repository.findById(certificateId);
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    return {
      ...certificate,
      download_url: `/api/gauges/certificates/${certificate.id}/download`,
      preview_url: this.getPreviewUrl(certificate)
    };
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE HELPER METHODS
  // ─────────────────────────────────────────────────────────────

  /**
   * Validate uploaded file
   * @private
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Check file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('File type not allowed');
    }
  }

  /**
   * Generate unique certificate filename
   * @private
   */
  generateCertificateFilename(systemGaugeId, originalName) {
    const timestamp = Date.now();
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);

    // Sanitize filename
    const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');

    return `${systemGaugeId}_${sanitized}_${timestamp}${ext}`;
  }

  /**
   * Get preview URL for certificate
   * @private
   */
  getPreviewUrl(certificate) {
    // Only PDFs and images can be previewed
    const previewableMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (previewableMimeTypes.includes(certificate.mime_type)) {
      return `/api/gauges/certificates/${certificate.id}/preview`;
    }

    return null;
  }
}

module.exports = GaugeCertificateService;
```

---

## Refactored Route File: gauge-certificates.js

**Purpose**: Thin route handlers only

### New Route Structure (~200 lines total)

```javascript
// backend/src/modules/gauge/routes/gauge-certificates.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const GaugeCertificateService = require('../services/GaugeCertificateService');
const logger = require('../../../infrastructure/utils/logger');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const certificateService = new GaugeCertificateService();

// ─────────────────────────────────────────────────────────────
// ROUTE HANDLERS
// ─────────────────────────────────────────────────────────────

/**
 * Upload certificate for a gauge
 * POST /api/gauges/certificates/upload
 */
router.post('/upload', authenticateToken, upload.single('certificate'), async (req, res) => {
  try {
    const result = await certificateService.uploadCertificate(
      req.file,
      {
        gaugeId: req.body.gaugeId,
        displayName: req.body.displayName,
        description: req.body.description,
        certificateType: req.body.certificateType,
        ipAddress: req.ip
      },
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: result
    });
  } catch (error) {
    logger.error('Certificate upload failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get certificates for a gauge
 * GET /api/gauges/certificates/:gaugeId
 */
router.get('/:gaugeId', authenticateToken, async (req, res) => {
  try {
    const certificates = await certificateService.getCertificatesByGaugeId(req.params.gaugeId);

    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    logger.error('Failed to get certificates:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete certificate
 * DELETE /api/gauges/certificates/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await certificateService.deleteCertificate(
      parseInt(req.params.id),
      req.user.id
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to delete certificate:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rename certificate
 * PUT /api/gauges/certificates/:id/rename
 */
router.put('/:id/rename', authenticateToken, async (req, res) => {
  try {
    const result = await certificateService.renameCertificate(
      parseInt(req.params.id),
      req.body.displayName,
      req.user.id
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to rename certificate:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Download certificate
 * GET /api/gauges/certificates/:id/download
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const file = await certificateService.downloadCertificate(parseInt(req.params.id));

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', file.size);

    res.send(file.buffer);
  } catch (error) {
    logger.error('Failed to download certificate:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get certificate details
 * GET /api/gauges/certificates/details/:id
 */
router.get('/details/:id', authenticateToken, async (req, res) => {
  try {
    const certificate = await certificateService.getCertificateById(parseInt(req.params.id));

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    logger.error('Failed to get certificate details:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

---

## New Repository: CertificateRepository.js

**Purpose**: Data access for certificates table

```javascript
// backend/src/modules/gauge/repositories/CertificateRepository.js

const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

class CertificateRepository extends BaseRepository {
  constructor() {
    super('gauge_certificates', 'id');
  }

  async findByGaugeId(gaugeId, connection = null) {
    const query = `
      SELECT * FROM gauge_certificates
      WHERE gauge_id = ?
      ORDER BY created_at DESC
    `;
    return this.executeQuery(query, [gaugeId], connection);
  }

  async findByGaugeSystemId(systemGaugeId, connection = null) {
    const query = `
      SELECT * FROM gauge_certificates
      WHERE gauge_system_id = ?
      ORDER BY created_at DESC
    `;
    return this.executeQuery(query, [systemGaugeId], connection);
  }

  async findById(id, connection = null) {
    const query = `
      SELECT * FROM gauge_certificates
      WHERE id = ?
    `;
    const results = await this.executeQuery(query, [id], connection);
    return results.length > 0 ? results[0] : null;
  }

  async create(data, connection = null) {
    const query = `
      INSERT INTO gauge_certificates (
        gauge_id, gauge_system_id, file_name, display_name,
        file_path, file_size, mime_type, uploaded_by,
        description, certificate_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
    `;

    const result = await this.executeQuery(query, [
      data.gauge_id,
      data.gauge_system_id,
      data.file_name,
      data.display_name,
      data.file_path,
      data.file_size,
      data.mime_type,
      data.uploaded_by,
      data.description,
      data.certificate_type
    ], connection);

    return { id: result.insertId, ...data };
  }

  async update(id, data, connection = null) {
    const query = `
      UPDATE gauge_certificates
      SET display_name = ?, description = ?
      WHERE id = ?
    `;

    await this.executeQuery(query, [
      data.display_name,
      data.description,
      id
    ], connection);

    return { id, ...data };
  }

  async delete(id, connection = null) {
    const query = `DELETE FROM gauge_certificates WHERE id = ?`;
    await this.executeQuery(query, [id], connection);
    return { success: true };
  }
}

module.exports = CertificateRepository;
```

---

## Implementation Steps

### Step 1: Create CertificateRepository
1. Create `CertificateRepository.js`
2. Implement CRUD methods
3. Write unit tests

### Step 2: Create GaugeCertificateService
1. Create `GaugeCertificateService.js`
2. Extract business logic from route handlers
3. Implement all methods
4. Write comprehensive unit tests

### Step 3: Refactor Route Handlers
1. Import new service
2. Replace inline logic with service calls
3. Keep routes thin (5-15 lines each)
4. Test all routes

### Step 4: Remove Old Code
1. Delete unused helper functions from route file
2. Clean up imports
3. Update route comments/documentation

---

## Testing Strategy

### Service Unit Tests
```javascript
describe('GaugeCertificateService', () => {
  describe('uploadCertificate', () => {
    test('uploads valid certificate');
    test('validates file size');
    test('validates file type');
    test('generates unique filename');
    test('creates database record');
    test('logs audit event');
  });

  describe('deleteCertificate', () => {
    test('deletes from Dropbox');
    test('deletes from database');
    test('logs audit event');
    test('handles Dropbox deletion failure gracefully');
  });

  describe('renameCertificate', () => {
    test('updates display name');
    test('validates empty name');
    test('logs audit event');
  });

  describe('downloadCertificate', () => {
    test('retrieves file from Dropbox');
    test('returns file buffer with metadata');
  });
});
```

### Route Integration Tests
```javascript
describe('Certificate Routes', () => {
  test('POST /upload - uploads certificate');
  test('GET /:gaugeId - retrieves certificates');
  test('DELETE /:id - deletes certificate');
  test('PUT /:id/rename - renames certificate');
  test('GET /:id/download - downloads certificate');
  test('handles authentication errors');
  test('handles validation errors');
});
```

---

## Benefits

### Before Refactor
- ❌ 987 lines in route file
- ❌ 164 lines per route average
- ❌ Business logic in routes
- ❌ Hard to test
- ❌ No code reuse

### After Refactor
- ✅ ~200 lines in route file (5x reduction)
- ✅ ~15 lines per route
- ✅ Business logic in service
- ✅ Easy to test
- ✅ Service reusable across application

---

## Files Created/Modified

### Created
1. `backend/src/modules/gauge/services/GaugeCertificateService.js` (~400 lines)
2. `backend/src/modules/gauge/repositories/CertificateRepository.js` (~100 lines)

### Modified
1. `backend/src/modules/gauge/routes/gauge-certificates.js` (987 → ~200 lines)

---

## Acceptance Criteria

- ✅ Route file reduced to < 250 lines
- ✅ All business logic in service layer
- ✅ Each route handler < 20 lines
- ✅ Service layer fully unit tested
- ✅ Routes integration tested
- ✅ All existing functionality preserved
- ✅ Audit logging maintained
- ✅ Error handling comprehensive

---

**Status**: Ready for implementation
**Impact**: High - improves testability and maintainability
**Risk**: Low - clear separation, easy to verify
