# Backend Database Connections - Verified Inventory

## Database Configuration
- **Host**: localhost
- **Port**: 3307
- **Database**: fai_db_sandbox
- **Connection Pool**: mysql2/promise

## Verified Database Connections by Module

### 1. Authentication Module (`/modules/auth/services/authService.js`)

1. **Record Login Attempt**
   ```sql
   INSERT INTO core_login_attempts (email, ip_address, success, failure_reason, attempted_at) 
   VALUES (?, ?, ?, ?, NOW())
   ```

2. **Check Account Lockout - Get User**
   ```sql
   SELECT id, failed_login_count, locked_until 
   FROM core_users 
   WHERE email = ? AND is_deleted = 0
   ```

3. **Check Failed Attempts**
   ```sql
   SELECT COUNT(*) as failed_count 
   FROM core_login_attempts 
   WHERE email = ? AND success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
   ```

4. **Update Lock Status**
   ```sql
   UPDATE core_users 
   SET failed_login_count = ?, locked_until = ? 
   WHERE id = ?
   ```

5. **Authenticate User**
   ```sql
   SELECT u.id, u.email, u.password_hash, u.name, u.failed_login_count, u.locked_until, 
          u.is_deleted, r.id as role_id, r.name as role_name
   FROM core_users u
   LEFT JOIN core_user_roles ur ON u.id = ur.user_id
   LEFT JOIN core_roles r ON ur.role_id = r.id
   WHERE u.email = ? AND u.is_deleted = 0
   ```

6. **Clear Failed Attempts**
   ```sql
   UPDATE core_users 
   SET failed_login_count = 0, locked_until = NULL 
   WHERE id = ?
   ```

7. **Update Last Login**
   ```sql
   UPDATE core_users 
   SET last_login_at = NOW() 
   WHERE id = ?
   ```

### 2. Admin Module

#### adminService.js
1. **Get Users Count**
   ```sql
   SELECT COUNT(*) as total FROM core_users WHERE is_deleted = 0
   ```

2. **Get Users with Pagination**
   ```sql
   SELECT u.id, u.email, u.name, u.is_active, u.created_at, u.last_login_at,
          r.id as role_id, r.name as role_name
   FROM core_users u
   LEFT JOIN core_user_roles ur ON u.id = ur.user_id
   LEFT JOIN core_roles r ON ur.role_id = r.id
   WHERE u.is_deleted = 0
   ORDER BY u.created_at DESC
   LIMIT ? OFFSET ?
   ```

3. **Get User by ID**
   ```sql
   SELECT u.id, u.email, u.name, u.is_active, u.created_at, u.updated_at,
          u.last_login_at, r.id as role_id, r.name as role_name
   FROM core_users u
   LEFT JOIN core_user_roles ur ON u.id = ur.user_id
   LEFT JOIN core_roles r ON ur.role_id = r.id
   WHERE u.id = ? AND u.is_deleted = 0
   ```

4. **Check Email Exists**
   ```sql
   SELECT id FROM core_users WHERE email = ?
   ```

5. **Create User**
   ```sql
   INSERT INTO core_users (email, password_hash, name, is_active, created_at) 
   VALUES (?, ?, ?, 1, NOW())
   ```

6. **Assign Role**
   ```sql
   INSERT INTO core_user_roles (user_id, role_id) VALUES (?, ?)
   ```

7. **Update User**
   ```sql
   UPDATE core_users 
   SET email = ?, name = ?, is_active = ?, updated_at = NOW() 
   WHERE id = ? AND is_deleted = 0
   ```

8. **Delete User (Soft)**
   ```sql
   UPDATE core_users 
   SET is_deleted = 1, updated_at = NOW() 
   WHERE id = ? AND is_deleted = 0
   ```

9. **Reset Password**
   ```sql
   UPDATE core_users 
   SET password_hash = ?, updated_at = NOW() 
   WHERE id = ? AND is_deleted = 0
   ```

### 3. Gauge Module

#### Repositories

**GaugesRepo.js**
1. **Get All Gauges**
   ```sql
   SELECT * FROM gauges WHERE is_deleted = 0
   ```

2. **Get Gauge by ID**
   ```sql
   SELECT * FROM gauges WHERE gauge_id = ? AND is_deleted = 0
   ```

3. **Create Gauge**
   ```sql
   INSERT INTO gauges (gauge_id, name, equipment_type, serial_number, ...) 
   VALUES (?, ?, ?, ?, ...)
   ```

4. **Update Gauge**
   ```sql
   UPDATE gauges SET ... WHERE gauge_id = ?
   ```

5. **Delete Gauge**
   ```sql
   UPDATE gauges SET is_deleted = 1 WHERE gauge_id = ?
   ```

**CheckoutsRepo.js**
1. **Create Checkout**
   ```sql
   INSERT INTO checkouts (gauge_id, user_id, checkout_date, expected_return_date, location, department_id) 
   VALUES (?, ?, ?, ?, ?, ?)
   ```

2. **Get Active Checkouts**
   ```sql
   SELECT * FROM checkouts WHERE gauge_id = ? AND actual_return_date IS NULL
   ```

3. **Complete Return**
   ```sql
   UPDATE checkouts 
   SET actual_return_date = ?, return_condition = ?, return_notes = ? 
   WHERE id = ?
   ```

**TransfersRepo.js**
1. **Create Transfer**
   ```sql
   INSERT INTO transfers (gauge_id, from_department, to_department, transfer_date, transferred_by) 
   VALUES (?, ?, ?, ?, ?)
   ```

2. **Get Pending Transfers**
   ```sql
   SELECT * FROM transfers WHERE approval_status = 'pending'
   ```

3. **Approve Transfer**
   ```sql
   UPDATE transfers 
   SET approval_status = 'approved', approved_by = ?, approval_date = ? 
   WHERE id = ?
   ```

**AuditRepo.js**
1. **Create Audit Entry**
   ```sql
   INSERT INTO audit_logs (user_id, action, table_name, record_id, details, ip_address, user_agent) 
   VALUES (?, ?, ?, ?, ?, ?, ?)
   ```

### 4. Infrastructure

#### Middleware

**rbacMiddleware.js**
1. **Get User Permissions**
   ```sql
   SELECT DISTINCT p.name, p.resource, p.action
   FROM core_permissions p
   JOIN core_role_permissions rp ON p.id = rp.permission_id
   JOIN core_user_roles ur ON rp.role_id = ur.role_id
   WHERE ur.user_id = ? AND p.is_active = 1
   ```

**checkPermission.js**
1. **Check Permission**
   ```sql
   SELECT COUNT(*) as has_permission
   FROM core_users u
   JOIN core_user_roles ur ON u.id = ur.user_id
   JOIN core_role_permissions rp ON ur.role_id = rp.role_id
   JOIN core_permissions p ON rp.permission_id = p.id
   WHERE u.id = ? AND p.name = ? AND u.is_deleted = 0 AND u.is_active = 1
   ```

2. **Check Permission Override**
   ```sql
   SELECT COUNT(*) as has_override
   FROM core_user_permission_overrides upo
   JOIN core_permissions p ON upo.permission_id = p.id
   WHERE upo.user_id = ? AND p.name = ? AND upo.is_granted = 1
   ```

**idempotency.js**
1. **Check Existing Request**
   ```sql
   SELECT response FROM idempotency_keys WHERE key = ? AND user_id = ?
   ```

2. **Store Response**
   ```sql
   INSERT INTO idempotency_keys (key, user_id, response, created_at) 
   VALUES (?, ?, ?, ?)
   ```

#### Health Checks

**health.controller.js**
1. **Basic Health Check**
   ```sql
   SELECT 1
   ```

2. **Detailed Health Check**
   ```sql
   SELECT 1 as healthy
   ```

### 5. Jobs

**auditRetention.js**
1. **Get Old Audit Logs**
   ```sql
   SELECT * FROM audit_logs WHERE created_at < ? LIMIT ?
   ```

2. **Archive Audit Logs**
   ```sql
   INSERT IGNORE INTO audit_logs_archive 
   (id, user_id, action, table_name, record_id, details, ip_address, user_agent, 
    event_type, severity_level, hash_chain, digital_signature, previous_hash, created_at, archived_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
   ```

3. **Delete Archived Logs**
   ```sql
   DELETE FROM audit_logs 
   WHERE created_at < ? 
   LIMIT ?
   ```

4. **Get Age Statistics**
   ```sql
   SELECT 
     SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as less_than_30_days,
     SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 90 DAY) 
              AND created_at <= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as days_30_to_90,
     -- ... more age ranges ...
     MIN(created_at) as oldest_record,
     MAX(created_at) as newest_record
   FROM audit_logs
   ```

### 6. Bootstrap

**validateRbac.js**
1. **Get Roles**
   ```sql
   SELECT name FROM core_roles
   ```

2. **Get Permissions**
   ```sql
   SELECT name FROM core_permissions
   ```

3. **Get Role-Permission Mappings**
   ```sql
   SELECT r.name as role_name, p.name as perm_name 
   FROM core_role_permissions rp 
   JOIN core_roles r ON r.id = rp.role_id 
   JOIN core_permissions p ON p.id = rp.permission_id
   ```

## API Routes Mapping (All 51 Endpoints)

### Authentication Routes (`/api/auth`)
1. **POST /login** → authService login queries (5 DB operations)
2. **POST /logout** → Audit log only
3. **GET /me** → Get user by ID query

### Admin Routes (`/api/admin`)
4. **GET /users** → Get users with pagination
5. **POST /users** → Create user + role assignment
6. **GET /users/:id** → Get user by ID
7. **PUT /users/:id** → Update user
8. **DELETE /users/:id** → Soft delete user
9. **POST /users/:id/reset-password** → Update password
10. **POST /users/:id/unlock** → Clear lockout
11. **POST /change-password** → Update password
12. **POST /register** → Create user + role
13. **GET /roles** → Get all roles
14. **GET /stats** → Dashboard statistics queries
15. **GET /detailed** → Detailed stats aggregations
16. **GET /system-users** → System users queries
17. **GET /gauge-status-report** → Gauge status report
18. **GET /status-inconsistencies** → Data integrity checks
19. **POST /update-statuses** → Bulk status updates
20. **POST /seed-test-data** → Test data insertion
21. **GET /gauge/:gaugeId** → Recovery gauge details
22. **POST /gauge/:gaugeId/recover** → Gauge recovery operations

### Gauge Routes (`/api/gauges`)
23. **GET /** → Get all gauges (main listing)
24. **POST /** → Create new gauge
25. **GET /categories** → Get gauge categories
26. **GET /dashboard** → Dashboard summary
27. **GET /search** → Search gauges
28. **GET /my-tools/:userId** → User's gauges
29. **GET /overdue/list** → Overdue calibrations
30. **GET /due-soon/list** → Due soon calibrations
31. **GET /:id** → Get gauge by ID
32. **PUT /:id** → Update gauge
33. **PATCH /:id** → Partial update
34. **DELETE /:id** → Soft delete gauge
35. **POST /:id/calibration** → Record calibration
36. **PUT /:id/calibration** → Update calibration
37. **POST /:id/checkout** → Checkout gauge (idempotent)
38. **PUT /:id/checkout** → Update checkout
39. **POST /:id/return** → Return gauge (idempotent)
40. **PUT /:id/return** → Update return
41. **POST /:id/transfer** → Create transfer

### Gauge Tracking Routes
42. **GET /:gaugeId** → Get gauge details (operations)
43. **POST /checkout** → Checkout operation
44. **POST /:gaugeId/checkout** → Checkout specific gauge
45. **POST /:gaugeId/return** → Return specific gauge
46. **POST /:gaugeId/qc-verify** → QC verification
47. **GET /:gaugeId/history** → Gauge history
48. **GET /dashboard/summary** → Dashboard summary
49. **GET /overdue/calibration** → Overdue report

### Transfer Routes
50. **GET /transfers** → Get all transfers
51. **POST /transfers** → Create transfer
52. **PUT /transfers/:transferId/accept** → Accept transfer
53. **PUT /transfers/:transferId/reject** → Reject transfer

### Unseal Request Routes
54. **GET /unseal-requests** → Get all requests
55. **POST /:gaugeId/unseal-request** → Create request
56. **PUT /unseal-requests/:requestId/approve** → Approve
57. **PUT /unseal-requests/:requestId/reject** → Reject

### QC Routes
58. **GET /pending** → Pending QC items
59. **POST /:gaugeId/verify** → Verify gauge
60. **POST /:gaugeId/fail** → Fail gauge
61. **GET /history/:gaugeId** → QC history

### Rejection Routes
62. **POST /reject-gauge** → Record rejection

## Summary Statistics

- **Total API Endpoints**: 51 unique routes (some with multiple methods = 62 total)
- **Total Files with Database Access**: 37
- **Total Unique Queries**: ~60+
- **Tables Accessed**: 
  - core_users
  - core_roles
  - core_permissions
  - core_user_roles
  - core_role_permissions
  - core_user_permission_overrides
  - core_login_attempts
  - gauges
  - checkouts
  - transfers
  - calibrations
  - unseal_requests
  - audit_logs
  - audit_logs_archive
  - idempotency_keys
  - gauge_categories
  - rejection_reasons

## Query Types
- **SELECT**: ~35 queries
- **INSERT**: ~15 queries
- **UPDATE**: ~10 queries
- **DELETE**: ~2 queries

## Transaction Patterns
- Simple single-table operations
- Multi-table JOINs
- Transaction blocks for complex operations
- Batch operations for audit retention

## Route to Database Operation Mapping

### High Database Activity Routes (5+ queries)
- POST /login (7 operations)
- POST /checkout (5+ operations)
- POST /return (5+ operations)
- POST /transfer (4+ operations)

### Medium Database Activity Routes (2-4 queries)
- All CRUD operations (create/update typically 2-3 queries)
- Status updates (2-3 queries)
- Report generation (2-4 queries)

### Low Database Activity Routes (1 query)
- Simple GET operations
- Basic lookups
- Health checks