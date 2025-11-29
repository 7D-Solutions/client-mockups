# BACKEND AUDIT - ALL ISSUES

## Security Issues

### Hardcoded Passwords (11 files)
- `/backend/src/infrastructure/middleware/rbacMiddleware.js:88,98`
- `/backend/src/infrastructure/utils/passwordValidator.js:122`
- `/backend/src/modules/admin/routes/user-management.js:6`
- `/backend/scripts/check-schema-drift.js:49`
- 7 additional occurrences

### Unauthenticated API Routes (4 endpoints)
- `/backend/src/modules/admin/routes/admin-maintenance.js:16` - GET `/gauge-status-report`
- `/backend/src/modules/admin/routes/admin-maintenance.js:33` - POST `/update-statuses`
- `/backend/src/modules/admin/routes/admin-maintenance.js:54` - GET `/status-inconsistencies`
- `/backend/src/modules/admin/routes/admin-maintenance.js:72` - POST `/seed-test-data`

### Missing Input Validation (4 POST routes)
- `/update-statuses`
- `/seed-test-data`
- `/users/:id/unlock`
- `/:id/return`

## Database Connection Issues

### Transaction Handling - Missing Rollback (22 files)

#### Admin Module
- `/backend/src/modules/admin/routes/system-recovery.js:156`
- `/backend/src/modules/admin/routes/user-management.js:48`
- `/backend/src/modules/admin/services/AdminMaintenanceService.js:264`
- `/backend/src/modules/admin/services/adminService.js:113,181`

#### Gauge Module
- `/backend/src/modules/gauge/repositories/CheckoutsRepo.js:7,40`
- `/backend/src/modules/gauge/repositories/GaugesRepo.js:21,64`
- `/backend/src/modules/gauge/routes/rejection-reasons.js:272`
- `/backend/src/modules/gauge/services/GaugeCalibrationService.js:18,210`
- `/backend/src/modules/gauge/services/GaugeRejectionService.js:18`
- `/backend/src/modules/gauge/services/GaugeTrackingService.js:48,109,161`
- `/backend/src/modules/gauge/services/gaugeService.js:95,188,251`
- `/backend/src/modules/gauge/services/sealService.js:14,142`
- `/backend/src/jobs/auditRetention.js:18`

### Connection Leaks (13 files)
- `/backend/src/jobs/auditRetention.js:15`
- `/backend/src/modules/admin/routes/system-recovery.js:153`
- `/backend/src/modules/admin/services/AdminMaintenanceService.js:261`
- `/backend/src/modules/admin/services/adminService.js:180`
- `/backend/src/modules/gauge/routes/rejection-reasons.js:271`
- `/backend/src/modules/gauge/services/GaugeCalibrationService.js:15,207`
- `/backend/src/modules/gauge/services/GaugeRejectionService.js:15`
- `/backend/src/modules/gauge/services/GaugeTrackingService.js:45`
- `/backend/src/modules/gauge/services/gaugeService.js:92,185`
- `/backend/src/modules/gauge/services/sealService.js:11,139`

### InsertId Usage with gauge_active_checkouts (13 files)
gauge_active_checkouts table has no auto-increment field, but code expects insertId

#### Source Files
- `/backend/src/modules/gauge/repositories/OperationsRepo.js:46` - `return { id: result.insertId };`
- `/backend/src/modules/gauge/services/GaugeRejectionService.js:214` - `id: result.insertId`
- `/backend/src/modules/gauge/services/GaugeTrackingService.js:91` - `assignment_id: result.insertId`

#### Test Files
- `/backend/tests/direct-database-test.js:148,150,156,185,192`
- `/backend/tests/modules/gauge/repositories/GaugesRepo.test.js:226`
- `/backend/tests/modules/gauge/repositories/SimpleRepo.test.js:138,445`
- `/backend/tests/modules/gauge/services/ComprehensiveServices.test.js:47`
- `/backend/tests/modules/gauge/services/OperationsService.integration.test.js:71`

## Database Schema Issues

### Missing Tables
- `gauge_statuses` (referenced in code)
- `users` (code uses `users`, actual table is `core_users`)

### Tables with Problems
- `gauge_qc_records` (exists but has no columns)

## Code Issues

### Missing Await Keywords (3 files)
- `/backend/src/modules/gauge/repositories/ReportsRepo.js:19`
- `/backend/src/modules/gauge/services/GaugeSearchService.js:228`
- `/backend/src/modules/gauge/services/GaugeTrackingService.js:265`

### Missing Error Handling (451 occurrences)
- `/backend/src/bootstrap/validateRbac.js:33,45`
- `/backend/src/infrastructure/health/audit-health.js:44,46,148`
- 446 additional async/await without try-catch

### Deprecated Methods (3 occurrences)
- `/backend/src/jobs/auditRetention.js:25,35,59` - uses `connection.query()` instead of `connection.execute()`

## Test Issues

### User ID 1 References (20+ files)
Database starts at ID 7, no user with ID 1 exists.

- `/backend/tests/setup-mocks.js:74`
- `/backend/tests/utils/route-test-utils.js:13,21`
- `/backend/tests/modules/gauge/repositories/AuditRepo.fixed.test.js:154`
- `/backend/tests/modules/gauge/routes/gauge-tracking-reports.routes.test.js:16`
- `/backend/tests/modules/gauge/routes/gauge-tracking-transfers.routes.test.js:16`
- `/backend/tests/modules/gauge/routes/gauge-tracking-unseals.routes.test.js:16`
- `/backend/tests/modules/gauge/routes/gauge-tracking-operations.routes.mock.test.js:22`
- `/backend/scripts/fix-phase2-tests.js:30`
- `/backend/scripts/phase2-final-fix.js:125,133`
- `/backend/scripts/apply-phase2-fixes.js:341`
- `/backend/tests/modules/gauge/repositories/TransfersRepo.test.js` - multiple
- `/backend/tests/modules/gauge/services/TransfersService.fixed.test.js` - multiple
- `/backend/tests/modules/gauge/mega-coverage-boost.test.js:520`
- `/backend/migrations/T1_validation_final.js:38`

### Username References (7 test files)
Table has 'name' column, not 'username'. 
**Status**: ✅ Production code fixed (uses fallback pattern), ❌ Test files need updating

- `/backend/tests/modules/gauge/routes/gauge-tracking-operations.routes.mock.test.js:22`
- `/backend/tests/setup-mocks.js:74`
- `/backend/tests/utils/route-test-utils.js:13,21`
- `/backend/scripts/fix-phase2-tests.js:30`
- `/backend/scripts/phase2-final-fix.js:125,133`

### Test Coverage
- 87 source files
- 55 test files
- 59 files without tests (68%)

Untested files include:
- `/backend/src/infrastructure/database/connection.js`
- `/backend/src/infrastructure/events/EventBus.js`
- `/backend/src/infrastructure/events/eventEmitters.js`
- `/backend/src/infrastructure/health/audit-health.js`
- `/backend/src/infrastructure/middleware/auditMiddleware.js`
- 54 additional files

## Code Style Issues
- console.log usage instead of proper logging
- Non-strict equality (`==` instead of `===`)
- Non-strict inequality (`!=` instead of `!==`)