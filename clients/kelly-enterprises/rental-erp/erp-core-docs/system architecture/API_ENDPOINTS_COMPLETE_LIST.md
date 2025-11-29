# Fire-Proof ERP API Endpoints - Complete List

**Generated**: 2025-09-08  
**Total Endpoints**: 86  
**Status**: Based on comprehensive system testing

## Endpoint Categories

### Authentication (3 endpoints)

**🚨 LEGACY-TO-MODULAR FRONTEND MIGRATION GAPS**:

**Legacy Frontend Endpoints (need to be migrated)**:
- **Auth**: `auth/login`, `auth/logout`, `auth/verify`, `auth/profile`
- **Admin Users**: `/admin/users` (CRUD operations)
- **Gauges**: Complex mix of `gauges/tracking`, `/v2/gauges`, `/gauges/{id}`, `/gauge-tracking/{id}/*`
- **Transfers**: `/gauge-transfers/{id}/*`, `/gauge-transfers/pending`
- **Rejection Reasons**: `/rejection-reasons/*`
- **Unseal Requests**: `/unseal-requests/{id}/*`, `gauges/tracking/unseal-requests`

**Modular Frontend Status**:
✅ **Already Implemented**:
- **Admin Users**: `/admin/users` (CRUD) - `adminService.ts`
- **Gauges**: `/gauges/v2` - `gaugeService.ts` 
- **Transfers**: Components exist (`BulkTransferModal.tsx`)
- **Unseals**: Components exist (`UnsealRequestModal.tsx`)
- **Auth**: Basic auth infrastructure exists

**Critical Issues Found**:
1. **API Path Mismatch**: 
   - Legacy: `gauges/tracking`, `/v2/gauges`, `/gauge-tracking/{id}`
   - Modular: `/gauges/v2`, `/api/gauges/*`
   - Backend: `/api/gauges/v2`, `/api/gauges/tracking`

2. **Missing API Endpoint Mapping**: Need to verify which legacy endpoints map to which backend endpoints

3. **Auth Endpoint Mismatch**:
   - Legacy expects: `auth/verify`, `auth/profile` 
   - Backend provides: `/api/auth/me`, `/api/auth/logout`

**1. POST /api/auth/login** ✅
- **[1] Route → Controller**: ✅ `auth.js:24` → `router.post('/login', ...)` with middleware chain
- **[2] Controller → Service**: ✅ `authService.checkAccountLockout()` (line 40) → `authService.authenticateUser()` (line 51) → `authService.createSession()` (line 71)
- **[3] Service → Database**: ✅ `core_users` (lines 34, 94), `core_login_attempts` (line 18), `core_sessions` (line 209), `core_user_roles`, `core_roles` via MySQL pool

**2. GET /api/auth/me** ✅
- **[1] Route → Controller**: ✅ `auth.js:89` → `router.get('/me', authenticateToken, asyncErrorHandler)`
- **[2] Controller → Service**: ✅ `authService.getUserById(req.user.user_id || req.user.id)` (line 90)
- **[3] Service → Database**: ✅ `core_users`, `core_user_roles`, `core_roles` (lines 227-238) via MySQL pool

**3. POST /api/auth/logout** ✅
- **[1] Route → Controller**: ✅ `auth.js:106` → `router.post('/logout', authenticateToken, asyncErrorHandler)`
- **[2] Controller → Service**: ✅ `authService.invalidateSession(token)` (line 112)
- **[3] Service → Database**: `core_sessions` table via MySQL pool (localhost:3307)

### Health & Monitoring (11 endpoints)
4. GET /health
5. GET /api/health/detailed
6. GET /api/health/check/:checkName
7. GET /api/metrics
8. GET /api/metrics/business
9. GET /metrics
10. GET /health/liveness
11. GET /health/readiness
12. GET /health/
13. GET /health/detailed
14. GET /health/metrics

### Gauge Management v2 (12 endpoints)
15. GET /api/gauges/v2
16. GET /api/gauges/v2/search
17. GET /api/gauges/v2/dashboard
18. GET /api/gauges/v2/users
19. GET /api/gauges/v2/:id
20. POST /api/gauges/v2
21. PATCH /api/gauges/v2/:id
22. POST /api/gauges/v2/calibrations/send
23. POST /api/gauges/v2/calibrations/receive
24. POST /api/gauges/v2/calibrations/bulk-send
25. POST /api/gauges/v2/recovery/:id/reset
26. POST /api/gauges/v2/bulk-update

### Gauge Operations (5 endpoints)
27. GET /api/operations/:gaugeId
28. POST /api/operations/:gaugeId/checkout
29. POST /api/operations/checkout
30. POST /api/operations/:gaugeId/return
31. POST /api/operations/:gaugeId/qc-verify

### Transfers (4 endpoints)
32. GET /api/transfers
33. POST /api/transfers
34. PUT /api/transfers/:transferId/accept
35. PUT /api/transfers/:transferId/reject

### Unseals (4 endpoints)
36. GET /api/unseals/unseal-requests
37. POST /api/unseals/:gaugeId/unseal-request
38. PUT /api/unseals/unseal-requests/:requestId/approve
39. PUT /api/unseals/unseal-requests/:requestId/reject

### Quality Control (4 endpoints)
40. POST /api/qc/:gaugeId/verify
41. GET /api/qc/pending
42. POST /api/qc/:gaugeId/fail
43. GET /api/qc/history/:gaugeId

### Rejection Reasons (6 endpoints)
44. GET /api/rejection-reasons/
45. GET /api/rejection-reasons/:id
46. POST /api/rejection-reasons/
47. PUT /api/rejection-reasons/:id
48. DELETE /api/rejection-reasons/:id
49. POST /api/rejection-reasons/reject-gauge

### Reports (4 endpoints)
50. GET /api/reports/dashboard/summary
51. GET /api/reports/overdue/calibration
52. GET /api/reports/:gaugeId/history
53. GET /api/reports/

### User Management (2 endpoints)
54. GET /api/users/assignments
55. GET /api/users/transfers

### Admin Operations (9 endpoints)
56. GET /api/admin/users
57. GET /api/admin/users/:id
58. POST /api/admin/users
59. PUT /api/admin/users/:id
60. DELETE /api/admin/users/:id
61. POST /api/admin/users/:id/reset-password
62. POST /api/admin/users/:id/unlock
63. GET /api/admin/roles
64. GET /api/admin/stats

### User Management Operations (2 endpoints)
65. POST /api/user-management/register
66. POST /api/user-management/change-password

### Admin Statistics (2 endpoints)
67. GET /api/admin-stats/
68. GET /api/admin-stats/detailed

### System Recovery (2 endpoints)
69. GET /api/system-recovery/gauge/:gaugeId
70. POST /api/system-recovery/gauge/:gaugeId/recover

### Admin Maintenance (5 endpoints)
71. GET /api/admin-maintenance/gauge-status-report
72. POST /api/admin-maintenance/update-statuses
73. GET /api/admin-maintenance/status-inconsistencies
74. POST /api/admin-maintenance/seed-test-data
75. GET /api/admin-maintenance/system-users

### Audit System (6 endpoints)
76. POST /api/audit/frontend-event
77. GET /api/audit-health/health
78. POST /api/audit-health/verify-integrity
79. POST /api/audit-health/export
80. GET /api/audit-health/statistics
81. POST /api/audit-health/archive

### Gauge Tracking Routes (Corrected Paths) (5 endpoints)
82. GET /api/gauges/tracking/dashboard/summary
83. GET /api/gauges/tracking/overdue/calibration
84. GET /api/gauges/tracking/transfers
85. GET /api/gauges/tracking/unseal-requests
86. GET /api/gauges/tracking/qc/pending

## Testing Summary

### Working Endpoints (Verified)
- Authentication: 3/3 (100%)
- Health & Monitoring: 5/11 (45%)
- Gauge Management: 11/12 (92%)
- Admin Operations: 3/9 (33%)
- Gauge Tracking: 5/5 (100%)
- Audit System: 1/6 (17%)

### Failed/Not Accessible
- Some health monitoring endpoints
- User assignments/transfers (internal server errors)
- Most audit health endpoints
- Some admin user management operations

### Notes
- Many "not found" errors were due to incorrect path construction in initial tests
- The `/api/gauges/tracking/*` routes work when accessed correctly
- Some endpoints require specific data to exist (e.g., gauge ID 1)
- Authentication and core business operations are fully functional