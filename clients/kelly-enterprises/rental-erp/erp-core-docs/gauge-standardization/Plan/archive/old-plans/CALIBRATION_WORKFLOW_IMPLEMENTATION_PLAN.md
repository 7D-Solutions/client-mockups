# Calibration Workflow Implementation Plan
**Date**: 2025-10-25
**Status**: IN PROGRESS - Repository Complete, Service Implementation Needed
**Reference**: ADDENDUM lines 1061-1381

---

## Progress Summary

### ✅ COMPLETED
1. **CalibrationBatchRepository.js** - Full database layer (290 lines)
   - Location: `/backend/src/modules/gauge/repositories/CalibrationBatchRepository.js`
   - All CRUD operations for batches and gauge-batch associations
   - ADR-002 compliant (explicit connection parameters)
   - Statistics and batch management queries

### 🔄 IN PROGRESS
2. **CalibrationBatchService.js** - 7-step workflow service (NEXT TASK)

### ⏳ REMAINING
3. **Enhanced CertificateService.js** - Certificate supersession logic
4. **Calibration API Routes** - REST endpoints
5. **Integration Tests** - Comprehensive test suite
6. **Documentation Updates** - ADDENDUM_COMPLETION_TRACKER.md

---

## Implementation Details

### 1. CalibrationBatchRepository ✅ COMPLETE

**File**: `/backend/src/modules/gauge/repositories/CalibrationBatchRepository.js`
**Lines**: 290

**Methods Implemented**:
- ✅ `createBatch(batchData, connection)` - Create new batch
- ✅ `findById(batchId, connection)` - Get batch by ID
- ✅ `updateBatch(batchId, updates, connection)` - Update batch status/fields
- ✅ `addGaugeToBatch(batchId, gaugeId, connection)` - Add gauge to batch
- ✅ `getBatchGauges(batchId, connection)` - Get all gauges in batch
- ✅ `removeGaugeFromBatch(batchId, gaugeId, connection)` - Remove gauge from batch
- ✅ `getBatchGaugeCount(batchId, connection)` - Count gauges in batch
- ✅ `findBatches(filters, connection)` - List batches with filters
- ✅ `findActiveGaugeBatch(gaugeId, connection)` - Check if gauge in active batch
- ✅ `getBatchStatistics(batchId, connection)` - Get batch progress stats

**Quality**: Production-ready, follows all patterns

---

### 2. CalibrationBatchService - NEXT IMPLEMENTATION

**File**: `/backend/src/modules/gauge/services/CalibrationBatchService.js`
**Estimated Lines**: 450-500 (may need refactoring into 2 files)

**Required Dependencies**:
```javascript
const BaseService = require('../../../infrastructure/services/BaseService');
const CalibrationBatchRepository = require('../repositories/CalibrationBatchRepository');
const { GaugeRepository } = require('../repositories/GaugeRepository');
const CertificateRepository = require('../repositories/CertificateRepository');
const logger = require('../../../infrastructure/utils/logger');
```

**Service Methods to Implement**:

#### Step 1-3: Batch Management
```javascript
/**
 * Step 1: Create calibration batch
 * ADDENDUM lines 1137-1150
 */
async createBatch(batchData, userId) {
  // Validate required fields
  // calibration_type: 'internal' or 'external'
  // If external: vendor_name and tracking_number required
  // Create batch with status 'pending_send'
  // Return created batch
}

/**
 * Step 2: Add gauges to batch
 * ADDENDUM lines 1155-1173
 */
async addGaugeToBatch(batchId, gaugeId, userId) {
  // Validate batch exists and status is 'pending_send'
  // Validate gauge exists
  // Block if gauge.status === 'checked_out'
  // Block if gauge already in another active batch
  // Add gauge to batch
  // Audit log
  // Return {batchId, gaugeId}
}

/**
 * Step 3: Send batch to calibration
 * ADDENDUM lines 1178-1210
 */
async sendBatch(batchId, userId) {
  // Get all gauges in batch
  // Validate batch has at least 1 gauge
  // Update all gauge statuses to 'out_for_calibration'
  // Update batch status to 'sent', set sent_at timestamp
  // Audit log
  // Return {batchId, gaugesSent: count}
}
```

#### Step 4: Receive Gauge
```javascript
/**
 * Step 4: Receive gauge from calibration
 * ADDENDUM lines 1215-1259
 */
async receiveGauge(gaugeId, userId, calibrationPassed = true) {
  // Validate gauge.status === 'out_for_calibration'

  // If calibrationPassed === false:
  //   - Retire gauge with reason 'calibration_failed'
  //   - Return {gaugeId, status: 'retired', reason: 'calibration_failed'}

  // If calibrationPassed === true:
  //   - Update gauge: status = 'pending_certificate', is_sealed = 1
  //   - Audit log
  //   - Return {gaugeId, status: 'pending_certificate', isSealed: true}
}
```

#### Step 5: Upload Certificate (handled by CertificateService)
Certificate upload is handled by existing `CertificateService.uploadCertificate()`.
Enhancement needed: Auto-supersession logic (see Section 3 below).

#### Step 6: Verify Certificates & Move to pending_release
```javascript
/**
 * Step 6: Verify certificates uploaded for gauge/set
 * ADDENDUM lines 1093-1095 (set logic), Certificate Requirements section
 */
async verifyCertificates(gaugeId, userId) {
  // Get gauge
  // Validate gauge.status === 'pending_certificate'

  // Verify certificate exists for this gauge
  // If no certificate: throw error

  // Check if gauge is part of a set (has companion_gauge_id)
  // If part of set:
  //   - Get companion gauge
  //   - Check if companion also has certificate AND status === 'pending_certificate'
  //   - If BOTH verified: Update BOTH to 'pending_release'
  //   - If only one verified: Keep current status, return waiting message
  // If NOT part of set:
  //   - Update gauge to 'pending_release'

  // Audit log
  // Return status update result
}
```

#### Step 7: Verify Location & Release
```javascript
/**
 * Step 7: Verify physical location and release to available
 * ADDENDUM lines 1097-1100
 */
async verifyLocationAndRelease(gaugeId, userId, storageLocation = null) {
  // Get gauge
  // Validate gauge.status === 'pending_release'

  // If storageLocation provided: Update storage_location
  // Update gauge: status = 'available'

  // If part of set: Also update companion to 'available'

  // Audit log
  // Return {gaugeId, status: 'available', location: storageLocation}
}
```

**Helper Methods**:
```javascript
/**
 * Get batch with full details (gauges + statistics)
 */
async getBatchDetails(batchId) {
  // Get batch
  // Get gauges in batch
  // Get batch statistics
  // Return combined object
}

/**
 * Cancel batch (before sending)
 */
async cancelBatch(batchId, userId, reason) {
  // Validate batch.status === 'pending_send'
  // Update batch.status = 'cancelled'
  // Audit log
}
```

**Transaction Pattern** (follows existing patterns):
```javascript
async methodName(...args) {
  const connection = await this.pool.getConnection();

  try {
    await connection.beginTransaction();

    // ... business logic using connection parameter ...

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Error in methodName:', error);
    throw error;
  } finally {
    connection.release();
  }
}
```

---

### 3. Enhanced CertificateService - Certificate Supersession

**File**: `/backend/src/modules/gauge/services/CertificateService.js` (EXISTS)
**Enhancement Needed**: Add supersession logic (~50 lines)

**Current State**: Service exists, handles upload/download with Dropbox integration

**Enhancement Required** (ADDENDUM lines 1434-1455):
```javascript
async uploadCertificate(gaugeId, file, userId) {
  const connection = await this.pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get current certificates for this gauge where is_current = TRUE
    const currentCerts = await this.certificateRepository.findByGaugeId(
      gaugeId,
      { is_current: true },
      connection
    );

    // Upload new certificate (existing logic)
    const newCert = await this._uploadToDropbox(file);
    const certId = await this.certificateRepository.create({
      gauge_id: gaugeId,
      file_path: newCert.path,
      file_name: newCert.name,
      uploaded_by: userId,
      is_current: true
    }, connection);

    // Mark old certificates as superseded
    for (const oldCert of currentCerts) {
      await this.certificateRepository.update(oldCert.id, {
        is_current: false,
        superseded_at: new Date(),
        superseded_by: certId
      }, connection);
    }

    await connection.commit();
    return this.certificateRepository.findById(certId, connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

**Database Schema** (Migration 005 - ALREADY APPLIED):
```sql
-- These columns should already exist from Migration 005:
ALTER TABLE certificates
ADD COLUMN is_current BOOLEAN DEFAULT TRUE,
ADD COLUMN superseded_at TIMESTAMP NULL,
ADD COLUMN superseded_by INT NULL,
ADD FOREIGN KEY (superseded_by) REFERENCES certificates(id);

CREATE INDEX idx_current_certs ON certificates(gauge_id, is_current);
```

---

### 4. Calibration API Routes

**File**: `/backend/src/modules/gauge/routes/calibration.routes.js` (NEW)
**Estimated Lines**: 200-250

**Endpoints to Create**:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, requireQC } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

// ========== BATCH MANAGEMENT (Steps 1-3) ==========

/**
 * POST /api/calibration/batches
 * Step 1: Create calibration batch
 */
router.post('/batches',
  authenticateToken,
  requireQC,
  asyncErrorHandler(async (req, res) => {
    const { calibrationType, vendorName, trackingNumber } = req.body;

    const calibrationService = serviceRegistry.get('CalibrationBatchService');
    const batch = await calibrationService.createBatch({
      calibrationType,
      vendorName,
      trackingNumber
    }, req.user.id);

    res.status(201).json({ success: true, data: batch });
  })
);

/**
 * GET /api/calibration/batches/:batchId
 * Get batch details with gauges
 */
router.get('/batches/:batchId',
  authenticateToken,
  requireQC,
  asyncErrorHandler(async (req, res) => {
    const { batchId } = req.params;

    const calibrationService = serviceRegistry.get('CalibrationBatchService');
    const batch = await calibrationService.getBatchDetails(batchId);

    res.json({ success: true, data: batch });
  })
);

/**
 * POST /api/calibration/batches/:batchId/gauges
 * Step 2: Add gauge to batch
 */
router.post('/batches/:batchId/gauges',
  authenticateToken,
  requireQC,
  asyncErrorHandler(async (req, res) => {
    const { batchId } = req.params;
    const { gaugeId } = req.body;

    const calibrationService = serviceRegistry.get('CalibrationBatchService');
    const result = await calibrationService.addGaugeToBatch(batchId, gaugeId, req.user.id);

    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/calibration/batches/:batchId/send
 * Step 3: Send batch to calibration
 */
router.post('/batches/:batchId/send',
  authenticateToken,
  requireQC,
  asyncErrorHandler(async (req, res) => {
    const { batchId } = req.params;

    const calibrationService = serviceRegistry.get('CalibrationBatchService');
    const result = await calibrationService.sendBatch(batchId, req.user.id);

    res.json({ success: true, data: result });
  })
);

// ========== GAUGE CALIBRATION WORKFLOW (Steps 4, 6, 7) ==========

/**
 * POST /api/calibration/gauges/:id/receive
 * Step 4: Receive gauge from calibration
 */
router.post('/gauges/:id/receive',
  authenticateToken,
  requireQC,
  asyncErrorHandler(async (req, res) => {
    const { id: gaugeId } = req.params;
    const { calibrationPassed = true } = req.body;

    const calibrationService = serviceRegistry.get('CalibrationBatchService');
    const result = await calibrationService.receiveGauge(gaugeId, req.user.id, calibrationPassed);

    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/calibration/gauges/:id/verify-certificates
 * Step 6: Verify certificates and move to pending_release
 */
router.post('/gauges/:id/verify-certificates',
  authenticateToken,
  requireQC,
  asyncErrorHandler(async (req, res) => {
    const { id: gaugeId } = req.params;

    const calibrationService = serviceRegistry.get('CalibrationBatchService');
    const result = await calibrationService.verifyCertificates(gaugeId, req.user.id);

    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/calibration/gauges/:id/release
 * Step 7: Verify location and release to available
 */
router.post('/gauges/:id/release',
  authenticateToken,
  requireQC,
  asyncErrorHandler(async (req, res) => {
    const { id: gaugeId } = req.params;
    const { storageLocation } = req.body; // Optional

    const calibrationService = serviceRegistry.get('CalibrationBatchService');
    const result = await calibrationService.verifyLocationAndRelease(
      gaugeId,
      req.user.id,
      storageLocation
    );

    res.json({ success: true, data: result });
  })
);

module.exports = router;
```

**Route Registration** (add to `/backend/src/modules/gauge/routes/index.js`):
```javascript
const calibrationRoutes = require('./calibration.routes');
router.use('/calibration', calibrationRoutes);
```

---

### 5. Integration Tests

**File**: `/backend/tests/modules/gauge/integration/CalibrationWorkflow.integration.test.js`
**Estimated Lines**: 600-800

**Test Suites Needed**:

1. **Batch Creation (Step 1)** - 5 tests
   - ✅ Create internal calibration batch
   - ✅ Create external calibration batch with vendor
   - ✅ Reject external batch without vendor_name
   - ✅ Reject invalid calibration_type
   - ✅ Create batch with correct default status

2. **Add Gauges to Batch (Step 2)** - 6 tests
   - ✅ Add gauge to batch successfully
   - ✅ Reject checked_out gauge
   - ✅ Reject gauge already in active batch
   - ✅ Reject adding to sent batch
   - ✅ Add multiple gauges to same batch
   - ✅ Remove gauge from batch before sending

3. **Send Batch (Step 3)** - 5 tests
   - ✅ Send batch and update all gauge statuses
   - ✅ Reject sending empty batch
   - ✅ Reject sending already-sent batch
   - ✅ Update batch sent_at timestamp
   - ✅ Audit log created

4. **Receive Gauge (Step 4)** - 6 tests
   - ✅ Receive gauge with calibration passed
   - ✅ Gauge status → pending_certificate
   - ✅ Gauge is_sealed → 1
   - ✅ Receive gauge with calibration failed → retired
   - ✅ Reject receiving gauge not out_for_calibration
   - ✅ Audit log created

5. **Certificate Upload (Step 5)** - 4 tests
   - ✅ Upload certificate for pending_certificate gauge
   - ✅ Auto-supersede old certificate
   - ✅ is_current flag management
   - ✅ Supersession chain integrity

6. **Verify Certificates (Step 6)** - 7 tests
   - ✅ Verify single gauge → pending_release
   - ✅ Verify set: both ready → both pending_release
   - ✅ Verify set: one ready → wait for other
   - ✅ Reject if no certificate uploaded
   - ✅ Reject if not pending_certificate status
   - ✅ Set verification logic correctness
   - ✅ Audit log created

7. **Location Verification & Release (Step 7)** - 5 tests
   - ✅ Release single gauge to available
   - ✅ Release with location update
   - ✅ Release set: both to available
   - ✅ Reject if not pending_release status
   - ✅ Audit log created

**Total Estimated Tests**: 38 integration tests

---

## Next Steps for Implementation

### Immediate (Next Session)
1. **Implement CalibrationBatchService.js** (~450 lines)
   - All 7 workflow steps
   - Transaction handling
   - Validation logic
   - Audit logging

2. **Enhance CertificateService.js** (~50 lines)
   - Add supersession logic to uploadCertificate method

3. **Create calibration.routes.js** (~200 lines)
   - All API endpoints
   - Validation middleware
   - Error handling

4. **Create integration tests** (~700 lines)
   - 38 comprehensive tests
   - Full workflow coverage

5. **Service Registration**
   - Register CalibrationBatchService in ServiceRegistry
   - Update route index.js

6. **Update ADDENDUM_COMPLETION_TRACKER.md**
   - Mark Calibration Workflow as COMPLETE
   - Mark Certificate Requirements as COMPLETE
   - Update statistics

### Refactoring (If Needed)
If `CalibrationBatchService.js` exceeds 500 lines, split into:
- `CalibrationBatchManagementService.js` (Steps 1-3: Create, Add, Send)
- `CalibrationWorkflowService.js` (Steps 4, 6-7: Receive, Verify, Release)

---

## Database Schema Verification

**Tables Required** (from Migration 005):
- ✅ `calibration_batches` - Batch management
- ✅ `calibration_batch_gauges` - Gauge-batch junction
- ✅ `certificates` with supersession columns (is_current, superseded_at, superseded_by)

**Status Enum Required**:
- ✅ `out_for_calibration`
- ✅ `pending_certificate`
- ✅ `pending_release`
- ✅ `returned` (for customer ownership)

All schema changes applied in Migration 005 on 2025-10-25.

---

## Architecture Decisions

### 1. Single Service vs. Multiple Services
**Decision**: Start with single `CalibrationBatchService`, refactor if >500 lines
**Rationale**: Workflow is cohesive, easier to implement as one service first

### 2. Certificate Supersession in CertificateService
**Decision**: Enhance existing service rather than create new one
**Rationale**: Certificate management already centralized, add supersession logic there

### 3. Set-Aware Verification Logic
**Decision**: Check companion_gauge_id in verifyCertificates method
**Rationale**: Sets must be verified together, both need certificates before release

### 4. Location Verification Optional
**Decision**: Allow null storageLocation in Step 7
**Rationale**: QC may just confirm existing location without updating

### 5. Audit Logging
**Decision**: Log all calibration operations
**Rationale**: Compliance requirement, track entire calibration lifecycle

---

## Files Summary

### Created ✅
1. `/backend/src/modules/gauge/repositories/CalibrationBatchRepository.js` (290 lines)

### To Create 🔄
2. `/backend/src/modules/gauge/services/CalibrationBatchService.js` (~450 lines)
3. `/backend/src/modules/gauge/routes/calibration.routes.js` (~200 lines)
4. `/backend/tests/modules/gauge/integration/CalibrationWorkflow.integration.test.js` (~700 lines)

### To Enhance 🔧
5. `/backend/src/modules/gauge/services/CertificateService.js` (+50 lines)
6. `/backend/src/modules/gauge/routes/index.js` (+1 line: route registration)
7. `/backend/src/bootstrap/registerServices.js` (+2 lines: service registration)

---

**Status**: Repository complete, service implementation ready to proceed
**Branch**: production-v1
**Reference**: ADDENDUM lines 1061-1381
**Next Instance**: Implement CalibrationBatchService.js and remaining components
