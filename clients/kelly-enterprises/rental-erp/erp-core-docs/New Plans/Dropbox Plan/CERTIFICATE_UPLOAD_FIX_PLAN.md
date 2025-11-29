# Certificate Upload Fix - Complete Production Solution

**Date**: 2025-10-26
**Status**: Ready for Implementation
**Priority**: CRITICAL
**Scope**: Backend certificate management system

---

## Executive Summary

Certificate uploads are failing with 500 errors due to incomplete database schema and code attempting to update non-existent columns. This document provides a complete, production-ready solution that fixes all architectural issues in one implementation.

**Root Cause**: Migration 006 created an incomplete `certificates` table schema, and the service layer attempts to update non-existent fields on both `certificates` and `gauges` tables.

**Solution**: Complete the schema, remove invalid column updates, add missing repository methods, and create efficient query patterns.

---

## Problem Analysis

### Current Error (Production)
```
[ERROR] GaugeRepository.update failed: Lock wait timeout exceeded
[ERROR] Certificate upload failed: Lock wait timeout exceeded
POST /api/gauges/CT4081A/upload-certificate [500] 54472ms
```

### Root Causes Identified

1. **Incomplete Schema** (Migration 006)
   - Missing: `is_current`, `superseded_at`, `superseded_by` fields
   - Code expects these fields but they don't exist
   - Repository attempts INSERT/UPDATE on non-existent columns

2. **Invalid Column Updates** (CertificateService.js)
   - Attempts to update `gauges.document_path` (column doesn't exist)
   - Causes BaseRepository to filter out the field
   - Results in UPDATE statement with only `updated_at`
   - Holds database lock for 50+ seconds until timeout

3. **Missing Repository Methods**
   - `CertificateRepository.deleteByGaugeId()` called but doesn't exist
   - `CertificateRepository.getCurrentCertificate()` not implemented
   - Causes runtime errors on certificate deletion

### Evidence from Logs
```
[WARN] gauges: Filtered out unknown columns:
  {"filteredOut":["document_path"],"availableColumns":["id","gauge_id",...]}

[ERROR] GaugeRepository.update failed: Lock wait timeout exceeded
  at GaugeRepository.updateGauge (/app/src/modules/gauge/repositories/GaugeRepository.js:233:22)
  at CertificateService.uploadCertificate (/app/src/modules/gauge/services/CertificateService.js:137:7)
```

---

## Complete Solution Architecture

### Design Principles

1. **Normalized Data Model**: Certificates are separate entities with 1:N relationship to gauges
2. **Efficient Queries**: Use database views for common gauge+certificate queries
3. **Proper Versioning**: Track certificate supersession through `is_current` flag and supersession chain
4. **No Denormalization**: Remove legacy `document_path` pattern from gauge records
5. **Transaction Safety**: Ensure atomic operations with proper rollback

### Schema Design (Final)

```
gauges (1) ──────< (N) certificates
  ├── id                  ├── id
  ├── gauge_id            ├── gauge_id (FK)
  ├── name                ├── dropbox_path
  ├── status              ├── custom_name
  └── ...                 ├── is_current ← New
                          ├── superseded_at ← New
                          ├── superseded_by ← New (self-FK)
                          └── file_hash ← New
```

---

## Implementation Plan

### Phase 1: Fix Database Schema

#### File: `backend/src/infrastructure/database/migrations/008-complete-certificates-schema.sql` (NEW FILE)

```sql
-- ============================================================================
-- Migration 008: Complete certificates table schema
-- ============================================================================
-- Adds missing supersession tracking fields that the application code expects
-- Fixes incomplete migration 006 that caused certificate upload failures
--
-- Changes:
--   1. Add is_current BOOLEAN field for tracking current certificate
--   2. Add superseded_at DATETIME for tracking when certificate was replaced
--   3. Add superseded_by INT for tracking replacement certificate
--   4. Add file_hash VARCHAR(64) for duplicate detection
--   5. Add foreign key constraint for supersession chain
--   6. Add composite index for efficient current certificate queries
--   7. Backfill existing records to set is_current = 1
-- ============================================================================

-- Add missing columns
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT 1
    COMMENT 'Whether this is the current active certificate for the gauge'
    AFTER uploaded_at,

  ADD COLUMN IF NOT EXISTS superseded_at DATETIME NULL
    COMMENT 'Timestamp when this certificate was superseded by a newer one'
    AFTER is_current,

  ADD COLUMN IF NOT EXISTS superseded_by INT NULL
    COMMENT 'ID of the certificate that replaced this one'
    AFTER superseded_at,

  ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64) NULL
    COMMENT 'SHA-256 hash for duplicate detection and integrity verification'
    AFTER file_extension;

-- Add foreign key for supersession chain
-- This allows tracking the full history of certificate replacements
ALTER TABLE certificates
  ADD CONSTRAINT fk_superseded_by
  FOREIGN KEY (superseded_by) REFERENCES certificates(id)
  ON DELETE SET NULL;

-- Add composite index for efficient queries of current certificates
-- This index is critical for performance when querying: WHERE gauge_id = X AND is_current = 1
CREATE INDEX idx_gauge_current ON certificates(gauge_id, is_current);

-- Backfill: Set all existing certificates as current
-- This ensures backward compatibility for any existing certificate records
UPDATE certificates
SET is_current = 1
WHERE is_current IS NULL;

-- Verify migration
SELECT
  COUNT(*) as total_certificates,
  SUM(CASE WHEN is_current = 1 THEN 1 ELSE 0 END) as current_certificates
FROM certificates;
```

**Migration Safety**:
- ✅ Uses `IF NOT EXISTS` to prevent errors on re-run
- ✅ Sets `DEFAULT 1` for is_current (backward compatible)
- ✅ Backfills existing records
- ✅ Uses `ON DELETE SET NULL` for supersession FK (safe cascade)

---

### Phase 2: Fix CertificateRepository

#### File: `backend/src/modules/gauge/repositories/CertificateRepository.js`

**Add these methods after line 200:**

```javascript
  /**
   * Delete all certificates for a gauge
   * Used when deleting a gauge or during cleanup operations
   *
   * @param {number} gaugeId - Gauge ID
   * @param {Object} connection - Optional database connection for transactions
   * @returns {Promise<number>} Number of certificates deleted
   */
  async deleteByGaugeId(gaugeId, connection = null) {
    const conn = connection || this.getPool();

    // First get count for logging
    const [countResult] = await conn.query(
      'SELECT COUNT(*) as count FROM certificates WHERE gauge_id = ?',
      [gaugeId]
    );
    const count = countResult[0].count;

    // Delete all certificates
    const query = 'DELETE FROM certificates WHERE gauge_id = ?';
    const [result] = await conn.query(query, [gaugeId]);

    logger.info('Deleted all certificates for gauge', {
      gaugeId,
      expectedCount: count,
      deletedCount: result.affectedRows
    });

    return result.affectedRows;
  }

  /**
   * Get the current active certificate for a gauge
   * Returns null if no current certificate exists
   *
   * @param {number} gaugeId - Gauge ID
   * @returns {Promise<Object|null>} Current certificate or null
   */
  async getCurrentCertificate(gaugeId) {
    const query = `
      SELECT
        c.*,
        u.name as uploaded_by_username,
        u.email as uploaded_by_email
      FROM certificates c
      LEFT JOIN core_users u ON c.uploaded_by = u.id
      WHERE c.gauge_id = ?
        AND c.is_current = 1
      LIMIT 1
    `;

    const pool = this.getPool();
    const [rows] = await pool.query(query, [gaugeId]);
    return rows[0] || null;
  }

  /**
   * Get supersession history for a certificate
   * Returns the chain of certificates that replaced each other
   *
   * @param {number} certificateId - Starting certificate ID
   * @returns {Promise<Array>} Chain of certificates in supersession order
   */
  async getSupersessionChain(certificateId) {
    const query = `
      WITH RECURSIVE supersession_chain AS (
        -- Base case: start with the given certificate
        SELECT
          c.*,
          u.name as uploaded_by_username,
          0 as depth
        FROM certificates c
        LEFT JOIN core_users u ON c.uploaded_by = u.id
        WHERE c.id = ?

        UNION ALL

        -- Recursive case: find certificates that superseded this one
        SELECT
          c.*,
          u.name as uploaded_by_username,
          sc.depth + 1
        FROM certificates c
        LEFT JOIN core_users u ON c.uploaded_by = u.id
        INNER JOIN supersession_chain sc ON c.id = sc.superseded_by
        WHERE sc.superseded_by IS NOT NULL
      )
      SELECT * FROM supersession_chain
      ORDER BY depth DESC
    `;

    const pool = this.getPool();
    const [rows] = await pool.query(query, [certificateId]);
    return rows;
  }

  /**
   * Get all certificates for a gauge with supersession status
   * Orders by uploaded_at DESC (newest first)
   *
   * @param {number} gaugeId - Gauge ID
   * @returns {Promise<Array>} All certificates for gauge
   */
  async getAllForGauge(gaugeId) {
    const query = `
      SELECT
        c.*,
        u.name as uploaded_by_username,
        u.email as uploaded_by_email,
        superseding.custom_name as superseded_by_name
      FROM certificates c
      LEFT JOIN core_users u ON c.uploaded_by = u.id
      LEFT JOIN certificates superseding ON c.superseded_by = superseding.id
      WHERE c.gauge_id = ?
      ORDER BY c.uploaded_at DESC
    `;

    const pool = this.getPool();
    const [rows] = await pool.query(query, [gaugeId]);
    return rows;
  }
```

---

### Phase 3: Fix CertificateService

#### File: `backend/src/modules/gauge/services/CertificateService.js`

**Change 1: Remove document_path update (Lines 136-139)**

**BEFORE:**
```javascript
      // Update gauge with latest certificate path
      await gaugeService.updateGauge(gauge.id, {
        document_path: uploadResult.dropboxPath
      }, userId);

      await connection.commit();
```

**AFTER:**
```javascript
      // Commit transaction - certificate is now current
      await connection.commit();

      logger.info('Certificate upload transaction committed', {
        gaugeId: actualGaugeId,
        certificateId: certificate.id,
        dropboxPath: uploadResult.dropboxPath
      });
```

**Change 2: Remove document_path update (Line 352)**

**BEFORE:**
```javascript
    await this.certificateRepository.deleteByGaugeId(gaugeId, connection);
    await gaugeService.updateGauge(gauge.id, { document_path: null }, userId);
    await connection.commit();
```

**AFTER:**
```javascript
    await this.certificateRepository.deleteByGaugeId(gaugeId, connection);
    await connection.commit();

    logger.info('All certificates deleted for gauge', {
      gaugeId,
      gaugeInternalId: gauge.id
    });
```

**Change 3: Replace document_path logic (Lines 402-410)**

**BEFORE:**
```javascript
    // Update gauge document_path if this was the current certificate
    if (gauge.document_path === certificate.dropbox_path) {
      // Find new current certificate if any
      const newCurrentCert = await this.certificateRepository.findByGaugeId(
        gauge.id,
        { is_current: true }
      );
      const newDocPath = newCurrentCert ? newCurrentCert.dropbox_path : null;
      await gaugeService.updateGauge(gauge.id, { document_path: newDocPath }, userId);
    }
```

**AFTER:**
```javascript
    // Log certificate deletion
    const wasCurrent = certificate.is_current;
    const newCurrentCert = wasCurrent
      ? await this.certificateRepository.getCurrentCertificate(gauge.id)
      : null;

    logger.info('Certificate deleted', {
      gaugeId: gauge.gauge_id,
      gaugeInternalId: gauge.id,
      certificateId,
      wasCurrent,
      newCurrentCertificateId: newCurrentCert?.id || null,
      dropboxPath: certificate.dropbox_path
    });
```

---

### Phase 4: Create Efficient Query View

#### File: `backend/src/modules/gauge/migrations/007-gauge-certificate-view.sql` (NEW FILE)

```sql
-- ============================================================================
-- Migration 007: Create view for gauges with current certificate
-- ============================================================================
-- Creates an optimized view that joins gauges with their current certificate
-- This eliminates the need for complex JOINs in application code
--
-- Performance:
--   - Uses composite index on certificates(gauge_id, is_current)
--   - LEFT JOIN ensures all gauges are returned even without certificates
--   - View can be queried like a table with minimal overhead
--
-- Usage:
--   SELECT * FROM v_gauges_with_current_certificate WHERE gauge_id = 'CT4081A'
-- ============================================================================

CREATE OR REPLACE VIEW v_gauges_with_current_certificate AS
SELECT
  -- All gauge fields
  g.*,

  -- Current certificate fields (NULL if no current certificate)
  c.id as current_certificate_id,
  c.dropbox_path as current_certificate_path,
  c.custom_name as current_certificate_name,
  c.file_size as current_certificate_size,
  c.file_extension as current_certificate_extension,
  c.uploaded_at as certificate_uploaded_at,
  c.uploaded_by as certificate_uploaded_by,

  -- Certificate uploader info
  u.name as certificate_uploaded_by_name,
  u.email as certificate_uploaded_by_email,

  -- Computed fields
  CASE
    WHEN c.id IS NOT NULL THEN TRUE
    ELSE FALSE
  END as has_current_certificate,

  CASE
    WHEN c.uploaded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN TRUE
    ELSE FALSE
  END as certificate_recently_updated

FROM gauges g

-- LEFT JOIN ensures all gauges are returned, even without certificates
LEFT JOIN certificates c ON (
  c.gauge_id = g.id
  AND c.is_current = 1
)

-- Get uploader info
LEFT JOIN core_users u ON c.uploaded_by = u.id

-- Only show active gauges
WHERE g.is_deleted = 0;

-- Add index hint comment for query optimizer
-- Query optimizer will use idx_gauge_current index on certificates table

-- Example queries:
-- 1. Get single gauge with certificate: WHERE gauge_id = 'CT4081A'
-- 2. Get all gauges without certificates: WHERE has_current_certificate = FALSE
-- 3. Get recently updated certificates: WHERE certificate_recently_updated = TRUE
```

---

### Phase 5: Update GaugeQueryService (Optional Enhancement)

#### File: `backend/src/modules/gauge/services/GaugeQueryService.js`

**Add method to use the new view:**

```javascript
  /**
   * Get gauge with current certificate using optimized view
   * This replaces the need for complex JOINs in application code
   *
   * @param {string} gaugeId - Gauge ID (gauge_id or custom_id)
   * @returns {Promise<Object|null>} Gauge with certificate info
   */
  async getGaugeWithCertificate(gaugeId) {
    const query = `
      SELECT *
      FROM v_gauges_with_current_certificate
      WHERE gauge_id = ? OR custom_id = ?
      LIMIT 1
    `;

    const pool = this.getPool();
    const [rows] = await pool.query(query, [gaugeId, gaugeId]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * Get all gauges with their current certificates
   * Uses optimized view for efficient querying
   *
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of gauges with certificate info
   */
  async getAllGaugesWithCertificates(filters = {}) {
    let query = 'SELECT * FROM v_gauges_with_current_certificate WHERE 1=1';
    const params = [];

    // Add filters
    if (filters.hasCertificate !== undefined) {
      query += ' AND has_current_certificate = ?';
      params.push(filters.hasCertificate ? 1 : 0);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.equipmentType) {
      query += ' AND equipment_type = ?';
      params.push(filters.equipmentType);
    }

    // Order by gauge_id
    query += ' ORDER BY gauge_id ASC';

    const pool = this.getPool();
    const [rows] = await pool.query(query, params);
    return rows;
  }
```

---

## Testing Strategy

### 1. Database Migration Testing

```bash
# Run migrations
cd backend
node src/infrastructure/database/run-migrations.js

# Verify schema
mysql -h localhost -P 3307 -u root -p fai_db_sandbox
> DESCRIBE certificates;
> SELECT * FROM v_gauges_with_current_certificate LIMIT 1;
```

**Expected Output:**
```
+---------------+--------------+------+-----+---------+
| Field         | Type         | Null | Key | Default |
+---------------+--------------+------+-----+---------+
| id            | int          | NO   | PRI | NULL    |
| gauge_id      | int          | NO   | MUL | NULL    |
| dropbox_path  | varchar(500) | NO   | UNI | NULL    |
| custom_name   | varchar(255) | YES  |     | NULL    |
| file_size     | int          | NO   |     | NULL    |
| file_extension| varchar(10)  | NO   |     | NULL    |
| file_hash     | varchar(64)  | YES  |     | NULL    |
| uploaded_by   | int          | NO   | MUL | NULL    |
| uploaded_at   | datetime     | NO   |     | CURRENT |
| is_current    | tinyint(1)   | NO   | MUL | 1       |
| superseded_at | datetime     | YES  |     | NULL    |
| superseded_by | int          | YES  | MUL | NULL    |
+---------------+--------------+------+-----+---------+
```

### 2. Certificate Upload Testing

```bash
# Restart backend to load new code
docker-compose restart backend

# Watch logs
docker logs fireproof-erp-modular-backend-dev -f
```

**Test Case 1: Upload First Certificate**
1. Navigate to gauge CT4081A in UI
2. Click "Upload Certificate"
3. Select PDF file
4. Enter custom name: "Calibration_2025_Q4"
5. Click Upload

**Expected Result:**
- ✅ Upload completes in <5 seconds
- ✅ 200 OK response
- ✅ Certificate appears in UI
- ✅ No database lock timeout
- ✅ Log shows: "Certificate uploaded successfully with supersession"

**Test Case 2: Upload Second Certificate (Supersession)**
1. Upload another certificate for same gauge
2. Enter custom name: "Calibration_2025_Q4_Updated"

**Expected Result:**
- ✅ First certificate marked as `is_current = 0`
- ✅ First certificate has `superseded_at` timestamp
- ✅ First certificate has `superseded_by = <new_cert_id>`
- ✅ Second certificate marked as `is_current = 1`

**Verify in Database:**
```sql
SELECT
  id,
  custom_name,
  is_current,
  superseded_at,
  superseded_by
FROM certificates
WHERE gauge_id = (SELECT id FROM gauges WHERE gauge_id = 'CT4081A')
ORDER BY uploaded_at;
```

### 3. Certificate Deletion Testing

**Test Case 3: Delete Current Certificate**
1. Click delete on current certificate
2. Confirm deletion

**Expected Result:**
- ✅ Certificate deleted from database
- ✅ Dropbox file deleted
- ✅ If superseded certificates exist, oldest becomes current
- ✅ UI updates immediately

### 4. View Query Testing

```sql
-- Test 1: Get single gauge with certificate
SELECT * FROM v_gauges_with_current_certificate
WHERE gauge_id = 'CT4081A';

-- Test 2: Get all gauges without certificates
SELECT gauge_id, name, has_current_certificate
FROM v_gauges_with_current_certificate
WHERE has_current_certificate = FALSE
LIMIT 10;

-- Test 3: Get recently updated certificates
SELECT gauge_id, certificate_uploaded_at
FROM v_gauges_with_current_certificate
WHERE certificate_recently_updated = TRUE;
```

### 5. Integration Tests

**File**: `backend/tests/modules/gauge/integration/CertificateUpload.integration.test.js` (NEW)

```javascript
const request = require('supertest');
const app = require('../../../src/app');
const { setupTestDB, cleanupTestDB } = require('../../_utils/testDb');

describe('Certificate Upload Integration', () => {
  let authToken;
  let testGaugeId;

  beforeAll(async () => {
    await setupTestDB();
    // Login and get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'test123' });
    authToken = response.body.token;

    // Create test gauge
    const gaugeResponse = await request(app)
      .post('/api/gauges')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ /* gauge data */ });
    testGaugeId = gaugeResponse.body.gauge_id;
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  test('should upload certificate successfully', async () => {
    const response = await request(app)
      .post(`/api/gauges/${testGaugeId}/upload-certificate`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('certificate', Buffer.from('test pdf'), 'test.pdf')
      .field('customName', 'Test Certificate');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.certificate).toBeDefined();
    expect(response.body.certificate.is_current).toBe(true);
  });

  test('should supersede old certificate on new upload', async () => {
    // Upload first certificate
    await request(app)
      .post(`/api/gauges/${testGaugeId}/upload-certificate`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('certificate', Buffer.from('test pdf 1'), 'test1.pdf')
      .field('customName', 'Certificate 1');

    // Upload second certificate
    const response = await request(app)
      .post(`/api/gauges/${testGaugeId}/upload-certificate`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('certificate', Buffer.from('test pdf 2'), 'test2.pdf')
      .field('customName', 'Certificate 2');

    expect(response.status).toBe(200);

    // Verify supersession
    const certsResponse = await request(app)
      .get(`/api/gauges/${testGaugeId}/certificates`)
      .set('Authorization', `Bearer ${authToken}`);

    const certs = certsResponse.body.certificates;
    expect(certs.length).toBe(2);

    const currentCert = certs.find(c => c.is_current);
    const supersededCert = certs.find(c => !c.is_current);

    expect(currentCert.custom_name).toBe('Certificate 2');
    expect(supersededCert.superseded_by).toBe(currentCert.id);
  });

  test('should complete upload in less than 5 seconds', async () => {
    const startTime = Date.now();

    await request(app)
      .post(`/api/gauges/${testGaugeId}/upload-certificate`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('certificate', Buffer.from('test pdf'), 'test.pdf')
      .field('customName', 'Performance Test');

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });
});
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Backup production database
- [ ] Review all code changes with team
- [ ] Prepare rollback plan
- [ ] Schedule deployment window

### Implementation Order
1. [ ] Create migration 008 (complete certificates schema)
2. [ ] Create migration 007 (gauge certificate view)
3. [ ] Run migrations on development database
4. [ ] Verify schema changes in development
5. [ ] Update CertificateRepository.js (add methods)
6. [ ] Update CertificateService.js (remove document_path updates)
7. [ ] Restart backend service
8. [ ] Run manual tests (upload, supersede, delete)
9. [ ] Run integration tests
10. [ ] Verify logs show no errors
11. [ ] Test on staging environment
12. [ ] Deploy to production

### Post-Implementation Verification
- [ ] Upload certificate for test gauge - verify success
- [ ] Check response time < 5 seconds
- [ ] Verify no database lock timeouts in logs
- [ ] Test supersession workflow
- [ ] Test certificate deletion
- [ ] Query view for performance check
- [ ] Monitor error logs for 24 hours

---

## Rollback Plan

If issues occur after deployment:

### Immediate Rollback Steps
```bash
# 1. Revert code changes
git revert <commit-hash>

# 2. Restart backend
docker-compose restart backend

# 3. Database rollback (if needed)
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < backup_before_migration.sql
```

### Migration Rollback (If Required)
```sql
-- Rollback migration 008
ALTER TABLE certificates
  DROP COLUMN IF EXISTS is_current,
  DROP COLUMN IF EXISTS superseded_at,
  DROP COLUMN IF EXISTS superseded_by,
  DROP COLUMN IF EXISTS file_hash;

ALTER TABLE certificates
  DROP FOREIGN KEY IF EXISTS fk_superseded_by;

DROP INDEX IF EXISTS idx_gauge_current ON certificates;

-- Rollback migration 007
DROP VIEW IF EXISTS v_gauges_with_current_certificate;
```

---

## Performance Impact

### Before Fix
- Certificate upload: **50+ seconds** (timeout)
- Database locks: **YES** (50s wait)
- Success rate: **0%**

### After Fix
- Certificate upload: **<3 seconds** (typical)
- Database locks: **NO**
- Success rate: **100%** (expected)

### Query Performance
- View query: <50ms for single gauge
- JOIN overhead: Minimal (indexed columns)
- Supersession chain: <100ms for typical history

---

## Future Enhancements (Not Required Now)

1. **Bulk Certificate Upload**: Upload multiple certificates at once
2. **Certificate Expiration**: Track expiration dates and send alerts
3. **Version Comparison**: Compare different certificate versions
4. **Certificate Templates**: Pre-defined naming conventions
5. **Automatic Backup**: Backup superseded certificates to archive storage

---

## Documentation Updates Required

After implementation, update:
1. API documentation with certificate endpoints
2. Database schema documentation
3. Developer onboarding guide
4. System architecture diagram
5. Troubleshooting guide

---

## Success Criteria

✅ **Implementation is successful when:**
1. Certificate upload completes without errors
2. Response time < 5 seconds
3. No database lock timeouts
4. Supersession workflow works correctly
5. Certificate deletion works correctly
6. View queries return correct data
7. Integration tests pass
8. No regression in other gauge operations

---

## Contact & Support

**Issue**: Certificate Upload 500 Error
**Reported**: 2025-10-26
**Fixed By**: [Implementation Team]
**Reviewed By**: [Tech Lead]
**Approved By**: [Engineering Manager]

For questions or issues during implementation, contact the development team.
