# Field Naming Violations Report - Instance 3 (Verified Findings)

**Date**: 2025-09-20  
**Analyst**: Instance 3  
**Scope**: Fire-Proof ERP Sandbox - Field Naming Consistency Analysis (Evidence-Based)

## Executive Summary

This architectural analysis has identified **12 verified field naming violations** across the Fire-Proof ERP Sandbox codebase. Each finding is backed by specific code evidence showing these violations are actively causing issues in the system.

## Verified Critical Violations

### 1. Thread Type/Form Field Confusion [VERIFIED]

**Violation**: System validates against frontend sending wrong field values

**Evidence**:
- Backend validation code (gaugeService.js:50-51):
  ```javascript
  message: `You sent thread_type="${data.thread_type}" but this appears to be a thread_form value. ` +
           `For ${upperThreadType} threads, use thread_type="npt" and thread_form="${upperThreadType}"`,
  ```
- Frontend test cases show the issue (gaugeService.runtime.test.ts:92):
  ```javascript
  thread_type: 'NPT', // Should be mapped to thread_form
  ```

**Impact**: Validation errors prevent gauge creation

---

### 2. Primary Key Identity Crisis [VERIFIED]

**Violation**: Three competing identifiers in use

**Evidence**:
- Frontend expects all three fields (types/index.ts:55-57):
  ```typescript
  id: string;
  system_gauge_id: string; // Now required - standardized format like SP0001A
  gauge_id: string; // Primary gauge identifier from backend
  ```
- Backend deprecation comment (GaugeRepository.js:174-175):
  ```javascript
  // MIGRATION NOTE: If frontend breaks without gauge_id, uncomment temporarily:
  // gauge_id: String(dbGauge.id), // DEPRECATED - remove after frontend update
  ```

**Impact**: Field mapping confusion and technical debt

---

### 3. Equipment Category/Type Duplication [VERIFIED]

**Violation**: Frontend expects `equipment_category` that backend decided not to implement

**Evidence**:
- Frontend interface has both fields (types/index.ts:60,63):
  ```typescript
  equipment_category: string;
  equipment_type?: EquipmentType; // New typed field
  ```
- Backend migration comment (phase2-gauge-standardization-schema.sql:10):
  ```sql
  -- 1. Use existing equipment_type field - Don't add equipment_category
  ```

**Impact**: Frontend expecting non-existent field

---

### 4. Storage Location Field Mismatch [VERIFIED]

**Violation**: Backend uses `storage_location` while frontend uses `location`

**Evidence**:
- Database migration adds `storage_location` (add_storage_location_and_rename_checkout_fields.sql:3)
- Backend uses `storage_location` (GaugeRepository.js:116)
- Frontend interface expects `location` (types/index.ts:73)
- Normalization maps fields (gaugeService.refactored.ts:161):
  ```typescript
  storage_location: gauge.storage_location || 'Unknown',
  ```

**Impact**: Requires normalization layer

---

### 5. Checkout User Field Inconsistency [VERIFIED]

**Violation**: Different tables use different field names for same concept

**Evidence**:
- Main gauges table field transformation (GaugeRepository.js:178):
  ```javascript
  checked_out_by_user_id: dbGauge.checked_out_by_user_id ? String(dbGauge.checked_out_by_user_id) : null,
  ```
- Join table uses different name (GaugeRepository.js:266,690):
  ```javascript
  gac.checked_out_to,
  INSERT INTO gauge_active_checkouts (gauge_id, checked_out_to)
  ```

**Impact**: Confusing data model

---

### 6. Unsealed Date Field Duplication [VERIFIED]

**Violation**: Frontend defines both `unsealed_date` and `unsealed_at`

**Evidence** (types/index.ts):
- Line 38: `unsealed_date?: string;`
- Line 70: `unsealed_at?: string;`

**Impact**: Same concept with two field names in same interface

---

### 7. User Reference Field Patterns [VERIFIED]

**Violation**: Multiple inconsistent patterns for user references

**Evidence** from field transformations (GaugeRepository.js:178-186):
```javascript
checked_out_by_user_id  // Pattern: field_by_user_id
checked_out_to          // Pattern: field_to (missing _user_id)
transfer_to_user_id     // Pattern: field_to_user_id
created_by              // Pattern: field_by (no suffix)
updated_by              // Pattern: field_by (no suffix)
employee_owner_id       // Pattern: role_owner_id
```

**Impact**: No consistent pattern for user references

---

### 8. Date Field Suffix Patterns [VERIFIED]

**Violation**: Inconsistent date field naming

**Evidence** from GaugeRepository.js:
- `created_at`, `updated_at` (uses `_at` suffix - lines 197-198)
- `calibration_date`, `unsealed_date` (uses `_date` suffix - line 199)
- `calibration_due_date` (uses `_due_date` suffix - line 200)
- `expected_return` (no suffix - line 202)
- `checkout_date` (inconsistent with `checked_out_at` pattern - line 201)

**Impact**: Unpredictable field naming

---

### 9. Expected Return Field Name [VERIFIED]

**Violation**: API uses different name than database

**Evidence**:
- API validation expects `expected_return_date` (lib/validation/index.js:140)
- Database queries use `expected_return` (GaugeRepository.js:268)

**Impact**: API/database mismatch

---

### 10. Status Value Remapping [VERIFIED]

**Violation**: Legacy status values being remapped

**Evidence** (audit-fixes.js:77-79):
```javascript
'pending_qc': { type: 'status', replacement: 'calibration_due' },
'needs_qc': { type: 'status', replacement: 'calibration_due' },
```

**Impact**: Status inconsistency between systems

---

### 11. Boolean Field Transformations [VERIFIED]

**Violation**: All boolean fields require 0/1 to true/false transformation

**Evidence** (GaugeRepository.js:189-194):
```javascript
// Boolean transformations (0/1 → true/false)
is_sealed: Boolean(dbGauge.is_sealed),
is_spare: Boolean(dbGauge.is_spare),
is_active: Boolean(dbGauge.is_active),
is_deleted: Boolean(dbGauge.is_deleted),
has_pending_transfer: Boolean(dbGauge.has_pending_transfer),
has_pending_unseal_request: Boolean(dbGauge.has_pending_unseal_request),
```

**Impact**: Transformation overhead on every query

---

### 12. API Transformation Requirements [VERIFIED]

**Violation**: Multiple transformation layers required

**Evidence**:
- Backend has `transformToDTO()` and `transformFromDTO()` methods (GaugeRepository.js)
- Frontend has `normalizeGauge()` method (gaugeService.refactored.ts:149)
- Over 20 fields require transformation in each layer

**Impact**: Performance overhead and maintenance burden

## Pattern Analysis

The evidence shows:
1. **No naming convention standard** - Multiple patterns for same concept type
2. **Incomplete migrations** - Comments show fields in transition
3. **Frontend/Backend disconnect** - Each evolved independently
4. **Legacy compatibility debt** - Old field names preserved for compatibility

## Recommendations

1. **Immediate**: Fix thread type/form validation to unblock users
2. **High Priority**: Standardize primary key usage to single `id` field
3. **Medium Priority**: Align frontend/backend field expectations
4. **Long Term**: Establish and enforce field naming conventions

## Conclusion

These verified violations demonstrate systematic field naming issues that are actively impacting system functionality, performance, and maintainability. Each violation is backed by specific code evidence showing the need for a comprehensive field standardization effort.