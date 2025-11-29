# Backend Database Connections Inventory

## Database Connection Configuration
- **Host**: localhost
- **Port**: 3307
- **Database**: fai_db_sandbox
- **Connection Pool**: mysql2/promise

## Complete List of Database Connections by Module

### 1. Authentication Module (`/modules/auth`)

#### authService.js
- **Login**: `SELECT id, username, password, email, role_id, is_deleted FROM users WHERE username = ? AND is_deleted = 0`
- **Update Last Login**: `UPDATE users SET last_login_at = ? WHERE id = ?`
- **Get User by ID**: `SELECT id, username, email, role_id FROM users WHERE id = ? AND is_deleted = 0`
- **Reset Password**: `UPDATE users SET password = ? WHERE id = ?`
- **Logout Audit**: Audit log entry for logout

### 2. Admin Module (`/modules/admin`)

#### adminService.js
- **Get All Users**: `SELECT * FROM users`
- **Get User by ID**: `SELECT * FROM users WHERE id = ?`
- **Create User**: `INSERT INTO users (username, password, email, role_id) VALUES (?, ?, ?, ?)`
- **Update User**: `UPDATE users SET username = ?, email = ?, role_id = ? WHERE id = ?`
- **Delete User**: `UPDATE users SET is_deleted = 1 WHERE id = ?`
- **Audit Logs**: INSERT entries for all admin actions

#### AdminMaintenanceService.js
- **Get System Status**: Multiple queries for system health
- **Database Statistics**: Information schema queries
- **Maintenance Mode**: System configuration updates

#### admin-stats.js (Routes)
- **Dashboard Stats**: Complex aggregation queries for system metrics
- **User Activity**: Join queries on users and audit_logs
- **Gauge Statistics**: Aggregations on gauge operations

#### user-management.js (Routes)
- **User CRUD**: All user table operations
- **Role Assignment**: Role and permission queries
- **Password Management**: Password updates with bcrypt

#### system-recovery.js (Routes)
- **Backup Operations**: Database backup commands
- **Recovery Status**: System state queries
- **Audit Trail**: Recovery action logging

### 3. Gauge Module (`/modules/gauge`)

#### Repositories

**GaugesRepo.js**
- **Get All**: `SELECT * FROM gauges WHERE is_deleted = 0`
- **Get by ID**: `SELECT * FROM gauges WHERE gauge_id = ? AND is_deleted = 0`
- **Create**: `INSERT INTO gauges (...) VALUES (...)`
- **Update**: `UPDATE gauges SET ... WHERE gauge_id = ?`
- **Delete**: `UPDATE gauges SET is_deleted = 1 WHERE gauge_id = ?`

**CheckoutsRepo.js**
- **Create Checkout**: `INSERT INTO checkouts (gauge_id, user_id, checkout_date, expected_return_date, location, department_id) VALUES (?, ?, ?, ?, ?, ?)`
- **Get Active Checkouts**: `SELECT * FROM checkouts WHERE gauge_id = ? AND actual_return_date IS NULL`
- **Complete Return**: `UPDATE checkouts SET actual_return_date = ?, return_condition = ?, return_notes = ? WHERE id = ?`
- **Checkout History**: `SELECT * FROM checkouts WHERE gauge_id = ? ORDER BY checkout_date DESC`

**CalibrationsRepo.js**
- **Record Calibration**: `INSERT INTO calibrations (gauge_id, calibration_date, next_calibration_date, calibrated_by, certificate_number) VALUES (?, ?, ?, ?, ?)`
- **Get Calibration History**: `SELECT * FROM calibrations WHERE gauge_id = ? ORDER BY calibration_date DESC`
- **Get Overdue**: `SELECT * FROM gauges WHERE next_calibration_date < CURDATE() AND is_deleted = 0`

**TransfersRepo.js**
- **Create Transfer**: `INSERT INTO transfers (gauge_id, from_department, to_department, transfer_date, transferred_by) VALUES (?, ?, ?, ?, ?)`
- **Get Pending**: `SELECT * FROM transfers WHERE approval_status = 'pending'`
- **Approve Transfer**: `UPDATE transfers SET approval_status = 'approved', approved_by = ?, approval_date = ? WHERE id = ?`

**UnsealRequestsRepo.js**
- **Create Request**: `INSERT INTO unseal_requests (gauge_id, requested_by, reason, priority) VALUES (?, ?, ?, ?)`
- **Get Pending**: `SELECT * FROM unseal_requests WHERE status = 'pending'`
- **Process Request**: `UPDATE unseal_requests SET status = ?, processed_by = ?, processed_date = ? WHERE id = ?`

**AuditRepo.js**
- **Create Audit Entry**: `INSERT INTO audit_logs (user_id, action, table_name, record_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)`
- **Get Audit Trail**: `SELECT * FROM audit_logs WHERE table_name = ? AND record_id = ? ORDER BY created_at DESC`

**OperationsRepo.js**
- **Track Operation**: Generic operation tracking queries
- **Operation History**: Historical operation queries

**ReportsRepo.js**
- **Generate Reports**: Complex aggregation queries
- **Export Data**: Data extraction queries

#### Services

**GaugeService.js**
- Orchestrates repository calls
- Complex transactions for multi-table operations
- Business logic with database validations

**GaugeTrackingService.js**
- **Checkout Transaction**: BEGIN → Update gauge status → Insert checkout → Audit → COMMIT
- **Return Transaction**: BEGIN → Update checkout → Update gauge → Audit → COMMIT
- **Transfer Transaction**: BEGIN → Create transfer → Update locations → Notify → COMMIT

**GaugeCalibrationService.js**
- **Record Calibration**: Transaction with gauge update and calibration insert
- **Update Status**: Complex status calculations based on dates
- **Notification Triggers**: Query for due calibrations

**GaugeSearchService.js**
- **Full Text Search**: `SELECT * FROM gauges WHERE MATCH(gauge_id, name, description) AGAINST(? IN BOOLEAN MODE)`
- **Advanced Search**: Dynamic query building with multiple JOINs
- **Filter Queries**: Complex WHERE clauses based on search criteria

**GaugeStatusService.js**
- **Status Calculations**: Business logic queries
- **State Transitions**: Validation queries for allowed transitions
- **Bulk Updates**: Mass status update operations

**sealService.js**
- **Check Seal Status**: Queries on seal_intact field
- **Break Seal**: Update operations with audit
- **Seal History**: Historical seal status queries

**GaugeRejectionService.js**
- **Record Rejection**: INSERT with reason codes
- **Get Rejection Reasons**: Reference data queries
- **Rejection Statistics**: Aggregation queries

**auditService.js**
- **Comprehensive Audit**: All entity change tracking
- **Audit Search**: Complex filtering on audit logs
- **Compliance Reports**: Audit aggregations

**accountLockoutService.js**
- **Track Failed Attempts**: INSERT/UPDATE on failed_login_attempts
- **Check Lockout**: Query attempt count and timing
- **Reset Attempts**: DELETE old attempts

### 4. Infrastructure (`/infrastructure`)

#### Database Connection (`database/connection.js`)
- Connection pool initialization
- Connection health checks
- Transaction management utilities

#### Middleware

**auth.js**
- **Token Validation**: User lookup queries
- **Session Validation**: Active session checks
- **Permission Queries**: Role-based access queries

**rbacMiddleware.js**
- **Permission Check**: `SELECT p.name FROM core_permissions p JOIN core_role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?`
- **Role Validation**: Role existence and active status
- **Resource Access**: Resource-specific permission queries

**checkPermission.js**
- Dynamic permission validation queries
- Resource ownership checks
- Hierarchical permission queries

**idempotency.js**
- **Check Existing**: `SELECT response FROM idempotency_keys WHERE key = ? AND user_id = ?`
- **Store Response**: `INSERT INTO idempotency_keys (key, user_id, response, created_at) VALUES (?, ?, ?, ?)`

#### Health Checks

**health.js**
- **Database Health**: `SELECT 1`
- **Connection Pool Status**: Pool statistics queries
- **Table Health**: Information schema queries

**audit-health.js**
- **Audit System Health**: Audit log statistics
- **Integrity Checks**: Hash chain validation queries
- **Performance Metrics**: Audit query performance

### 5. Jobs (`/jobs`)

**auditRetention.js**
- **Archive Old Logs**: `INSERT INTO audit_logs_archive SELECT * FROM audit_logs WHERE created_at < ?`
- **Delete Archived**: `DELETE FROM audit_logs WHERE created_at < ? LIMIT ?`
- **Age Distribution**: Complex date range aggregations

## Transaction Patterns

### Simple Transactions
```sql
BEGIN;
INSERT/UPDATE/DELETE;
INSERT audit_log;
COMMIT;
```

### Complex Transactions (Multi-table)
```sql
BEGIN;
UPDATE gauges SET status = ?;
INSERT INTO checkouts (...);
INSERT INTO audit_logs (...);
UPDATE inventory SET available = available - 1;
COMMIT;
```

### Read Transactions
```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT with JOINs;
COMMIT;
```

## Connection Pool Usage
- **Total Files Using Pool**: 37
- **Transaction Files**: ~15 (services with complex operations)
- **Read-Only Files**: ~22 (routes, simple queries)

## Database Tables Referenced
1. users
2. gauges
3. checkouts
4. calibrations
5. transfers
6. unseal_requests
7. audit_logs
8. audit_logs_archive
9. core_roles
10. core_permissions
11. core_role_permissions
12. departments
13. gauge_categories
14. idempotency_keys
15. failed_login_attempts
16. rejection_reasons
17. notification_queue
18. system_config

## Query Complexity Levels
- **Simple**: Single table SELECT/INSERT/UPDATE (60%)
- **Medium**: 2-3 table JOINs, basic transactions (30%)
- **Complex**: Multi-table transactions, aggregations, full-text search (10%)