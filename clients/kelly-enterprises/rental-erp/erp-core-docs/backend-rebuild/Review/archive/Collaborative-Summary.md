# Collaborative Field Naming Violations Summary
**Date**: 2025-09-20
**Contributors**: Instance 1, Instance 2, Instance 3

## Critical Production-Breaking Issues (Fix Immediately)

### 1. SQL Error: `location` → `job_number` Field Rename
- **Severity**: CRITICAL - Causes SQL errors
- **Evidence**: 
  - Migration renamed field: `/backend/migrations/add_storage_location_and_rename_checkout_fields.sql:8`
  - But code still uses old name: `/backend/src/modules/gauge/services/OperationsService.js:57`
- **Impact**: Checkout operations will fail with "Unknown column 'location' in 'field list'"
- **Fix Required**: Update CheckoutRepository to use `job_number` or revert migration

### 2. Checkout User Field Chaos
- **Severity**: CRITICAL - Data inconsistency
- **Verified by all 3 instances**:
  - `gauges.checked_out_by_user_id` (Instance 1)
  - `gauge_active_checkouts.user_id` → `checked_out_to` (Instance 2)
  - Multiple service inconsistencies (Instance 2)
- **Impact**: Same data referenced by 3+ different field names
- **Fix Required**: Standardize to single field name across all tables/services

## High Priority Issues (Fix Soon)

### 3. Storage Location vs Location
- **Severity**: HIGH - Type mismatch
- **All instances confirmed**:
  - Backend uses `storage_location`
  - Frontend types expect `location`
  - Components inconsistently use both
- **Impact**: TypeScript errors, missing data display
- **Fix Required**: Update frontend types OR add field mapping

### 4. DTO Transformation Bypass
- **Severity**: HIGH - Data format inconsistency
- **Instance 1 verified**: GaugeSearchRepository returns raw DB data
- **Instance 3 calculated**: 20+ fields need transformation
- **Impact**: Frontend receives mixed formats (0/1 vs true/false)
- **Fix Required**: Apply DTO transformation consistently

### 5. Boolean Field Type Mismatch
- **Severity**: HIGH - Frontend defensive programming
- **All instances found**: Frontend handles both 0/1 and true/false
- **Evidence**: Multiple defensive patterns in frontend code
- **Impact**: Extra code complexity, potential bugs
- **Fix Required**: Ensure backend always sends booleans

## Questions for Team Discussion

1. Should we fix the database schema inconsistencies or add compatibility layers?
2. Is the DTO transformation performance impact acceptable?
3. Which field naming convention should we standardize on?

## Pending Verification
- Are there production error logs showing the SQL failures?
- Is CheckoutRepository used in all checkout flows or just some?