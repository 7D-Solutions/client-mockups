# Certificate Management Architecture Investigation Report

## Executive Summary

The Fire-Proof ERP system has a **schema mismatch** between how certificates are managed and how the code expects them to work:

1. **Current State**: The `gauges` table does NOT have a `document_path` column
2. **Code Expectation**: `CertificateService.js` attempts to update `gauges.document_path` 
3. **Root Cause**: Legacy code pattern attempting to store denormalized certificate references on gauges table
4. **Modern Implementation**: Certificates are now properly managed via a separate `certificates` table with supersession tracking

---

## 1. Schema Evolution Timeline

### Phase 1: Initial Infrastructure (Migration 006)
**File**: `backend/src/infrastructure/database/migrations/006-add-certificates-table.sql`
**Date**: Created for certificate tracking
**What was created**:
- `certificates` table with:
  - `id`, `gauge_id`, `dropbox_path`, `custom_name`
  - `file_size`, `file_extension`, `uploaded_by`
  - `uploaded_at`, Unique constraint on `dropbox_path`
  - Foreign keys: `gauge_id` → `gauges.id`, `uploaded_by` → `core_users.id`

**Key Note**: This was the ONLY certificate table created at infrastructure level

### Phase 2: Gauge Module Schema (Migration 001-003)
**Files**: 
- `backend/src/modules/gauge/migrations/001_schema_and_fks.sql`
- `backend/src/modules/gauge/migrations/002_views.sql`
- `backend/src/modules/gauge/migrations/003_phase1_fixes.sql`

**What happened**:
- Created comprehensive gauge schema (thread_specifications, hand_tool_specifications, etc.)
- Created view `v_gauge_calibrations` that includes `document_path` from gauge_calibrations table
- NO `document_path` column added to `gauges` table in any migration

### Phase 3: Calibration Enhancement (Migration 005-006)
**Files**:
- `backend/src/modules/gauge/migrations/005_cascade_operations_schema.sql`
- `backend/src/modules/gauge/migrations/006_add_pending_release_status.sql`

**Enhancement to certificates table**:
```sql
ALTER TABLE certificates
ADD COLUMN is_current BOOLEAN DEFAULT TRUE
ADD COLUMN superseded_at TIMESTAMP NULL
ADD COLUMN superseded_by INT NULL
ADD CONSTRAINT fk_cert_superseded_by FOREIGN KEY (superseded_by) REFERENCES certificates(id)
ADD INDEX idx_current_certs ON certificates(gauge_id, is_current)
```

**Important**: These migrations only enhanced the `certificates` table, NOT the `gauges` table

### Actual Database State
**From db_export_20251021_212300.sql** (line 1260-1302):
The gauges table has these columns:
- id, gauge_id, custom_id, name, equipment_type, serial_number
- category_id, status, companion_gauge_id
- is_spare, is_sealed, is_active, is_deleted
- created_by, created_at, updated_at
- ownership_type, employee_owner_id, purchase_info
- system_gauge_id, gauge_suffix, standardized_name, storage_location

**⚠️ NO `document_path` COLUMN EXISTS ON GAUGES TABLE**

---

## 2. Code Dependencies Analysis

### Certificate Upload Flow (CertificateService.js)

#### Line 50-167: `uploadCertificate()` method
```javascript
// Lines 101-119: Upload to Dropbox and create certificate record
const certificate = await certificateRepository.create({
  gauge_id: gauge.id,
  dropbox_path: uploadResult.dropboxPath,
  custom_name: certificateName,
  file_size: uploadResult.fileSize,
  file_extension: fileExtension,
  uploaded_by: userId,
  is_current: true
}, connection);

// Lines 122-134: Mark old certificates as superseded
for (const oldCert of currentCertificates) {
  await certificateRepository.update(oldCert.id, {
    is_current: false,
    superseded_at: new Date(),
    superseded_by: certificate.id
  }, connection);
}

// PROBLEM: Lines 137-139 - This call will FAIL
await gaugeService.updateGauge(gauge.id, {
  document_path: uploadResult.dropboxPath  // ← gauges table has no document_path!
}, userId);
```

### Certificate Deletion Flow (CertificateService.js)

#### Line 349: `deleteAllCertificates()`
```javascript
// Line 349: Missing method call
await certificateRepository.deleteByGaugeId(gauge.id);  // ← Method doesn't exist!

// Line 352: Attempts to update non-existent column
await gaugeService.updateGauge(gauge.id, { document_path: null }, userId);
```

#### Line 404-407: `deleteCertificate()` 
```javascript
// Line 404-407: PROBLEMATIC CODE
if (gauge.document_path === certificate.dropbox_path) {
  const remainingCerts = await certificateRepository.findByGaugeId(gauge.id);
  const newDocPath = remainingCerts.length > 0 ? remainingCerts[0].dropbox_path : null;
  await gaugeService.updateGauge(gauge.id, { document_path: newDocPath }, userId);
}
```

### Certificate Repository Issues

#### Missing method: `deleteByGaugeId()`
**File**: `backend/src/modules/gauge/repositories/CertificateRepository.js`
- Lines 200-228 include: delete(), deleteById(), deleteByDropboxPath()
- **Missing**: `deleteByGaugeId(gaugeId)` - called in CertificateService.js line 349

### Calibration Service Legacy Pattern (gaugeCalibrationService.js)

#### Line 48: Using document_path from calibration
```javascript
document_path: calibrationData.document_path || calibrationData.certificate_number || null,
```

**This pattern suggests legacy code treating calibration.document_path as certificate reference**

### Validation Rules (gaugeValidationRules.js)

#### Line 139: Accepting document_path in request body
```javascript
const calibrationReceiveValidation = [
  body('gauge_id').trim().notEmpty(),
  body('passed').isBoolean(),
  body('document_path').optional().trim(),  // ← Still accepting this
  body('notes').optional().trim(),
  body('performed_at').isISO8601()
];
```

---

## 3. API Routes Analysis

### Route: POST /api/gauges/:id/calibrations

**File**: `backend/src/modules/gauge/routes/gauges.js`

**Lines ~650-680** (approximate):
```javascript
const { gauge_id, passed, document_path, notes, performed_at } = req.body;
// ...
const calibrationResult = await calibrationService.recordCalibration({
  // ...
  document_path,
  // ...
});
```

**Issue**: Route accepts `document_path` from request body for calibrations, but:
1. Calibrations table has `document_path` column (legacy)
2. Modern certificates table is separate
3. Route doesn't create certificate records

---

## 4. Data Model Relationships

### Current Architecture (Modern)

```
gauges (id)
  ↓ (gauge_id)
certificates (id)
  ├── dropbox_path (Dropbox storage location)
  ├── custom_name (User-friendly name)
  ├── is_current (Boolean for current active)
  ├── superseded_by (Links to newer certificate)
  └── superseded_at (Timestamp when replaced)

gauge_calibrations (id)
  ├── gauge_id → gauges(id)
  ├── document_path (LEGACY - for historical compatibility)
  └── ... other calibration fields
```

### Issues with Current Design

1. **Dual Certificate Systems**:
   - Old: calibration.document_path (legacy, on gauge_calibrations table)
   - New: certificates table (modern, with proper relationships)

2. **Supersession Not Tracked in Calibrations**:
   - certificates table has supersession (is_current, superseded_by)
   - gauge_calibrations still uses flat document_path

3. **Gauge Has No Direct Certificate Reference**:
   - Code tries to update `gauge.document_path` (doesn't exist)
   - Should query `certificates WHERE gauge_id=X AND is_current=1`

---

## 5. Root Cause Analysis

### Why `document_path` on Gauges Was Never Created

**Evidence**:
1. Migration 006 created `certificates` table with proper structure
2. No migration ever added `document_path` to `gauges` table
3. The schema export from 2025-10-21 shows no `document_path` on gauges

**Likely Reason**: During schema design, decision was made to:
- Keep certificates separate from gauges
- Use foreign key relationship instead of denormalization
- But code wasn't fully refactored to match this design

### Why Code References It Anyway

**Pattern**: Legacy code copies from old calibration flow
- Old: Store certificate reference on gauge for quick lookup
- New: Query certificates table for current certificate
- **Gap**: Code still uses old pattern, trying to denormalize

---

## 6. Complete Code Dependencies

### Files Referencing `document_path`

#### Direct References (9 files):
1. **CertificateService.js** (Lines 138, 352, 404)
   - uploadCertificate() attempts gauge update
   - deleteCertificate() checks gauge.document_path

2. **CalibrationRepository.js** (Lines 136, 194-196)
   - Stores in gauge_calibrations table
   - Supports updates to this field

3. **gaugeCalibrationService.js** (Line 48)
   - Sets calibration.document_path

4. **gaugeValidationRules.js** (Line 139)
   - Validation for document_path input

5. **routes/gauges.js** (request body parsing)
   - Accepts document_path from requests

6. **002_views.sql** (Line 13)
   - View exposes document_path from calibrations

7-9. **Test files** (3 files)
   - Seeds and integration tests use document_path

### Service Dependencies

```
CertificateService
  ├── certificateRepository.create()
  ├── certificateRepository.update()
  ├── certificateRepository.findByGaugeId()
  ├── certificateRepository.deleteByGaugeId()  ← MISSING!
  └── gaugeService.updateGauge()  ← Tries to set document_path

GaugeService.updateGauge()
  ├── GaugeCreationService.updateGauge()
  └── Would need to handle document_path if field existed
```

---

## 7. Business Logic Analysis

### Certificate Lifecycle Expected by Code

```
1. Upload Certificate
   ├── Save to Dropbox → get dropbox_path
   ├── Create certificates record
   ├── Mark old certs as superseded
   └── Update gauge.document_path ← FAILS (column doesn't exist)

2. Get Certificates
   ├── Query certificates table
   ├── Check Dropbox for file existence
   └── Return formatted list with shared links

3. Delete Certificate
   ├── Delete from Dropbox
   ├── Delete from database
   ├── If it was "current", update gauge.document_path ← FAILS
   └── Create audit log

4. Current Certificate Query
   ├── Should be: SELECT * FROM certificates WHERE gauge_id=X AND is_current=1
   ├── Currently: gauge.document_path → not available
   └── View v_gauge_calibrations provides workaround for calibrations only
```

---

## 8. Schema Mismatch Impact

### What Breaks

1. **Certificate Upload**: Fails on line 137-139 when trying to update gauge
2. **Certificate Deletion**: Fails on line 349 (missing deleteByGaugeId) and line 407 (missing document_path)
3. **Audit Trails**: Partial logging only

### What Still Works

1. Creating certificate records (with transactional rollback on gauge update failure)
2. Querying certificates
3. Downloading certificates
4. Getting shared links
5. Legacy calibration records with embedded document_path

### What's Inconsistent

1. Calibrations table has `document_path` (for historical reasons)
2. Gauges table doesn't have it (schema design choice)
3. Code tries to use both patterns simultaneously

---

## 9. Design Recommendations

### Architecture Decision: Where Should Current Certificate Reference Live?

**Option A: Keep separation, query certificates table** (RECOMMENDED)
```sql
-- To get gauge with current certificate:
SELECT g.*, c.dropbox_path, c.custom_name
FROM gauges g
LEFT JOIN certificates c ON g.id = c.gauge_id AND c.is_current = 1
WHERE g.gauge_id = ?
```

**Pros**:
- Single source of truth (certificates table)
- Proper normalization
- Supersession naturally handled
- No redundant data

**Cons**:
- Requires JOIN instead of single column lookup
- Need to update query service

**Option B: Maintain denormalized document_path on gauges**
```sql
ALTER TABLE gauges ADD COLUMN document_path VARCHAR(500)
```

**Pros**:
- Single-column lookup (faster for simple queries)
- Matches current code pattern
- Backward compatible

**Cons**:
- Denormalized data risks
- Must sync with certificates.dropbox_path
- Creates consistency issues
- Requires migration and data population

---

## 10. Long-Term Solution Architecture

### Recommended Refactoring

#### Phase 1: Fix Immediate Issues (This Sprint)
1. Add missing `deleteByGaugeId()` method to CertificateRepository
2. Remove `document_path` updates from CertificateService (they fail silently)
3. Create helper method to get current certificate:
   ```javascript
   async getCurrentCertificate(gaugeId) {
     return certificateRepository.findByGaugeId(gaugeId, { is_current: true });
   }
   ```

#### Phase 2: Refactor Query Pattern (Next Sprint)
1. Update GaugeQueryService to include current certificate in gauge responses
2. Add database view for gauge + current certificate:
   ```sql
   CREATE VIEW v_gauges_with_current_cert AS
   SELECT g.*, c.dropbox_path, c.custom_name
   FROM gauges g
   LEFT JOIN certificates c ON g.id = c.gauge_id AND c.is_current = 1
   ```
3. Update all routes using this view

#### Phase 3: Deprecate Legacy Pattern (After stable)
1. Keep gauge_calibrations.document_path for backward compatibility
2. Mark as deprecated in code comments
3. Migrate all certificate operations to modern pattern
4. Eventually: Remove legacy column in future major version

### Migration Strategy

```sql
-- Add as view first (non-breaking):
CREATE VIEW v_gauges_with_cert_info AS
SELECT 
  g.*,
  c.id as current_certificate_id,
  c.dropbox_path,
  c.custom_name as certificate_name,
  c.is_current
FROM gauges g
LEFT JOIN certificates c ON g.id = c.gauge_id AND c.is_current = 1;

-- Update code to use view or JOIN
-- Remove attempted gauge.document_path updates
-- Add missing CertificateRepository.deleteByGaugeId()
```

---

## 11. Complete File Dependency Map

### Affected Files Summary

**Core Certificate Management** (5 files):
- `CertificateService.js` - Service layer (HAS BUGS)
- `CertificateRepository.js` - Repository layer (MISSING METHOD)
- `certicate routes` - API routes (in gauges.js)
- `certificates table` - Schema
- `v_gauge_calibrations view` - Supporting view

**Legacy Calibration References** (3 files):
- `CalibrationRepository.js` - Stores document_path in calibrations table
- `gaugeCalibrationService.js` - Sets document_path on calibration records
- `gaugeValidationRules.js` - Validates document_path input

**API/Routes** (1 file):
- `gauges.js` - Routes handler (accepts document_path)

**Test Files** (3 files):
- Multiple test files use document_path in seeds

**Database** (1 file):
- `db_export_20251021_212300.sql` - Current schema state

---

## 12. Critical Findings Summary

| Item | Status | Severity | Impact |
|------|--------|----------|--------|
| `gauges.document_path` column | ✗ MISSING | HIGH | Certificate upload/delete fails |
| `CertificateRepository.deleteByGaugeId()` | ✗ MISSING | HIGH | Certificate deletion fails |
| Supersession tracking | ✓ EXISTS | LOW | Works correctly in certificates table |
| Calibration.document_path | ✓ EXISTS | MEDIUM | Legacy pattern still functional |
| Certificate query service | ✓ PARTIAL | MEDIUM | Works but missing current cert helpers |

---

## Conclusion

The Fire-Proof ERP certificate management system has a well-designed modern schema using a separate `certificates` table with proper supersession tracking. However, there's a **critical gap** where the application code attempts to maintain a denormalized `document_path` on the `gauges` table that **doesn't exist** in the database schema.

This is a **legacy code pattern** that was never properly refactored when the modern certificate architecture was implemented. The fix requires:

1. **Immediate**: Add missing `deleteByGaugeId()` method and remove failing gauge updates
2. **Short-term**: Refactor to use certificate queries instead of gauge.document_path
3. **Long-term**: Clean up legacy calibration.document_path pattern

The modern `certificates` table architecture is sound and should be the single source of truth for all certificate management going forward.

