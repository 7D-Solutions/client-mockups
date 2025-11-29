# AUDIT FINDINGS TO FIX

## Summary
This document lists all issues discovered during the comprehensive backend audit that still need to be fixed.

## 1. Missing Await Keywords (3 files)

These files use `Promise.all()` with `map()` but the mapped function might not be properly awaited:

- `/backend/src/modules/gauge/repositories/ReportsRepo.js:19`
  ```javascript
  const results = await Promise.all(queries.map(query => pool.execute(query)));
  ```

- `/backend/src/modules/gauge/services/GaugeSearchService.js:228`
  ```javascript
  const results = await Promise.all(queries.map(query => pool.execute(query)));
  ```

- `/backend/src/modules/gauge/services/GaugeTrackingService.js:265`
  ```javascript
  const results = await Promise.all(queries.map(query => pool.execute(query)));
  ```

## 2. Transaction Handling Issues (22 files)

These files have `beginTransaction()` without proper rollback in catch blocks:

### Admin Module
- `/backend/src/modules/admin/routes/system-recovery.js:156`
- `/backend/src/modules/admin/routes/user-management.js:48`
- `/backend/src/modules/admin/services/AdminMaintenanceService.js:264`
- `/backend/src/modules/admin/services/adminService.js:113`
- `/backend/src/modules/admin/services/adminService.js:181`

### Gauge Module - Repositories
- `/backend/src/modules/gauge/repositories/CheckoutsRepo.js:7`
- `/backend/src/modules/gauge/repositories/CheckoutsRepo.js:40`
- `/backend/src/modules/gauge/repositories/GaugesRepo.js:21`
- `/backend/src/modules/gauge/repositories/GaugesRepo.js:64`

### Gauge Module - Routes
- `/backend/src/modules/gauge/routes/rejection-reasons.js:272`

### Gauge Module - Services
- `/backend/src/modules/gauge/services/GaugeCalibrationService.js:18`
- `/backend/src/modules/gauge/services/GaugeCalibrationService.js:210`
- `/backend/src/modules/gauge/services/GaugeRejectionService.js:18`
- `/backend/src/modules/gauge/services/GaugeTrackingService.js:48`
- `/backend/src/modules/gauge/services/GaugeTrackingService.js:109`
- `/backend/src/modules/gauge/services/GaugeTrackingService.js:161`
- `/backend/src/modules/gauge/services/gaugeService.js:95`
- `/backend/src/modules/gauge/services/gaugeService.js:188`
- `/backend/src/modules/gauge/services/gaugeService.js:251`
- `/backend/src/modules/gauge/services/sealService.js:14`
- `/backend/src/modules/gauge/services/sealService.js:142`

### Jobs
- `/backend/src/jobs/auditRetention.js:18`

## 3. Connection Leaks (13 files)

These files call `getConnection()` without proper `release()` or `end()` in all code paths:

- `/backend/src/jobs/auditRetention.js:15`
- `/backend/src/modules/admin/routes/system-recovery.js:153`
- `/backend/src/modules/admin/services/AdminMaintenanceService.js:261`
- `/backend/src/modules/admin/services/adminService.js:180`
- `/backend/src/modules/gauge/routes/rejection-reasons.js:271`
- `/backend/src/modules/gauge/services/GaugeCalibrationService.js:15`
- `/backend/src/modules/gauge/services/GaugeCalibrationService.js:207`
- `/backend/src/modules/gauge/services/GaugeRejectionService.js:15`
- `/backend/src/modules/gauge/services/GaugeTrackingService.js:45`
- `/backend/src/modules/gauge/services/gaugeService.js:92`
- `/backend/src/modules/gauge/services/gaugeService.js:185`
- `/backend/src/modules/gauge/services/sealService.js:11`
- `/backend/src/modules/gauge/services/sealService.js:139`

## 4. InsertId Usage with gauge_active_checkouts (13 files)

These files expect `insertId` from gauge_active_checkouts table which has no auto-increment field:

### Source Files
- `/backend/src/modules/gauge/repositories/OperationsRepo.js:46`
  ```javascript
  return { id: result.insertId };
  ```

- `/backend/src/modules/gauge/services/GaugeRejectionService.js:214`
  ```javascript
  id: result.insertId
  ```

- `/backend/src/modules/gauge/services/GaugeTrackingService.js:91`
  ```javascript
  assignment_id: result.insertId,
  ```

### Test Files
- `/backend/tests/direct-database-test.js:148`
- `/backend/tests/direct-database-test.js:150`
- `/backend/tests/direct-database-test.js:156`
- `/backend/tests/direct-database-test.js:185`
- `/backend/tests/direct-database-test.js:192`
- `/backend/tests/modules/gauge/repositories/GaugesRepo.test.js:226`
- `/backend/tests/modules/gauge/repositories/SimpleRepo.test.js:138`
- `/backend/tests/modules/gauge/repositories/SimpleRepo.test.js:445`
- `/backend/tests/modules/gauge/services/ComprehensiveServices.test.js:47`
- `/backend/tests/modules/gauge/services/OperationsService.integration.test.js:71`

## 5. Hardcoded User ID 1 References (4 test files)

These test files hardcode user ID 1, but the database has no user with ID 1:

- `/backend/tests/modules/gauge/repositories/AuditRepo.fixed.test.js:154`
  ```javascript
  const userId = 1;
  ```

- `/backend/tests/modules/gauge/routes/gauge-tracking-reports.routes.test.js:16`
  ```javascript
  const createTestToken = (userId = 1, role = 'operator') => {
  ```

- `/backend/tests/modules/gauge/routes/gauge-tracking-transfers.routes.test.js:16`
  ```javascript
  const createTestToken = (userId = 1, role = 'operator') => {
  ```

- `/backend/tests/modules/gauge/routes/gauge-tracking-unseals.routes.test.js:16`
  ```javascript
  const createTestToken = (userId = 1, role = 'operator') => {
  ```

## 6. Database Schema Issues

### Missing Tables
- `gauge_statuses` - Referenced in code but doesn't exist
- `users` - Referenced in code but doesn't exist in this database

### Tables with Issues
- `gauge_qc_records` - Exists but has NO columns defined

## 7. Code Quality Issues (From comprehensive audit)

### Widespread Issues
- **console.log usage**: Should use proper logging (winston/pino)
- **Non-strict equality**: Using `==` instead of `===` 
- **Non-strict inequality**: Using `!=` instead of `!==`

### Async Functions Without Error Handling
- Over 10 async functions found without try/catch blocks

## Priority Order for Fixes

1. **CRITICAL - Data Integrity**
   - Transaction handling issues (22 files)
   - Connection leaks (13 files)

2. **HIGH - Runtime Errors**
   - InsertId usage with non-auto-increment table (13 files)
   - Missing await keywords (3 files)

3. **MEDIUM - Test Failures**
   - Hardcoded user ID 1 (4 files)
   - Missing database tables

4. **LOW - Code Quality**
   - Logging improvements
   - Strict equality operators