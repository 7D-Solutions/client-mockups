# Files with Direct Database Connections

## Total: 37 Files

### Bootstrap (1 file)
1. `src/bootstrap/validateRbac.js`

### Infrastructure (9 files)
2. `src/infrastructure/database/connection.js`
3. `src/infrastructure/health/audit-health.js`
4. `src/infrastructure/health/health.js`
5. `src/infrastructure/middleware/auth.js`
6. `src/infrastructure/middleware/checkPermission.js`
7. `src/infrastructure/middleware/idempotency.js`
8. `src/infrastructure/middleware/rbacMiddleware.js`
9. `src/infrastructure/utils/passwordValidator.js`

### Jobs (1 file)
10. `src/jobs/auditRetention.js`

### Admin Module (6 files)
11. `src/modules/admin/routes/admin-stats.js`
12. `src/modules/admin/routes/admin.js`
13. `src/modules/admin/routes/system-recovery.js`
14. `src/modules/admin/routes/user-management.js`
15. `src/modules/admin/services/AdminMaintenanceService.js`
16. `src/modules/admin/services/adminService.js`

### Auth Module (1 file)
17. `src/modules/auth/services/authService.js`

### Gauge Module - Repositories (8 files)
18. `src/modules/gauge/repositories/AuditRepo.js`
19. `src/modules/gauge/repositories/CalibrationsRepo.js`
20. `src/modules/gauge/repositories/CheckoutsRepo.js`
21. `src/modules/gauge/repositories/GaugesRepo.js`
22. `src/modules/gauge/repositories/OperationsRepo.js`
23. `src/modules/gauge/repositories/ReportsRepo.js`
24. `src/modules/gauge/repositories/TransfersRepo.js`
25. `src/modules/gauge/repositories/UnsealRequestsRepo.js`

### Gauge Module - Routes (2 files)
26. `src/modules/gauge/routes/gauges-v2.js`
27. `src/modules/gauge/routes/rejection-reasons.js`

### Gauge Module - Services (9 files)
28. `src/modules/gauge/services/GaugeCalibrationService.js`
29. `src/modules/gauge/services/GaugeRejectionService.js`
30. `src/modules/gauge/services/GaugeSearchService.js`
31. `src/modules/gauge/services/GaugeStatusService.js`
32. `src/modules/gauge/services/GaugeTrackingService.js`
33. `src/modules/gauge/services/accountLockoutService.js`
34. `src/modules/gauge/services/auditService.js`
35. `src/modules/gauge/services/gaugeService.js`
36. `src/modules/gauge/services/sealService.js`

### Health Module (1 file)
37. `src/modules/health/health.controller.js`

## Summary by Category
- **Bootstrap**: 1 file
- **Infrastructure**: 9 files (connection, health, middleware, utils)
- **Jobs**: 1 file
- **Admin Module**: 6 files (4 routes, 2 services)
- **Auth Module**: 1 file (service only)
- **Gauge Module**: 19 files (8 repositories, 2 routes, 9 services)
- **Health Module**: 1 file

## Notes
- These files directly use `pool.execute()`, `pool.query()`, or `pool.getConnection()`
- Other files may use database indirectly through these services/repositories
- Repository pattern is used heavily in the gauge module
- Some routes have direct database access (admin routes) while others delegate to services