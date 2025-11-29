# Business Logic Workflows - Database Operations

## 1. Authentication Workflows

### 1.1 User Login (POST /login)
```
1. Receive email/password
2. Check account lockout status
   - Query: SELECT from core_users WHERE email = ?
   - Query: SELECT COUNT failed attempts in last 30 min
   - If locked → return error
3. Authenticate user
   - Query: SELECT user with roles JOIN
   - Verify password hash with bcrypt
4. Handle login result
   - Success:
     - Query: UPDATE core_users SET failed_login_count = 0
     - Query: UPDATE core_users SET last_login_at = NOW()
     - Query: INSERT INTO core_login_attempts (success = 1)
     - Generate JWT token
   - Failure:
     - Query: INSERT INTO core_login_attempts (success = 0)
     - Check if should lock account
     - Query: UPDATE core_users SET locked_until = ? if needed
5. Return token or error
```

### 1.2 User Logout (POST /logout)
```
1. Validate JWT token
2. Create audit log entry
   - Query: INSERT INTO audit_logs (action = 'logout')
3. Invalidate session (in-memory)
4. Return success
```

## 2. User Management Workflows

### 2.1 Create User (POST /users)
```
1. Validate admin permissions
2. Check email uniqueness
   - Query: SELECT id FROM core_users WHERE email = ?
   - If exists → return error
3. Hash password with bcrypt
4. Begin transaction
   - Query: INSERT INTO core_users
   - Query: INSERT INTO core_user_roles (assign role)
   - Query: INSERT INTO audit_logs
5. Commit transaction
6. Return new user
```

### 2.2 Update User (PUT /users/:id)
```
1. Validate admin permissions
2. Get existing user
   - Query: SELECT FROM core_users WHERE id = ?
3. Check email uniqueness if changing
   - Query: SELECT FROM core_users WHERE email = ? AND id != ?
4. Begin transaction
   - Query: UPDATE core_users SET ...
   - If role change: UPDATE core_user_roles
   - Query: INSERT INTO audit_logs
5. Commit transaction
6. Return updated user
```

### 2.3 Delete User (DELETE /users/:id)
```
1. Validate admin permissions
2. Verify user exists
   - Query: SELECT FROM core_users WHERE id = ?
3. Begin transaction
   - Query: UPDATE core_users SET is_deleted = 1 (soft delete)
   - Query: INSERT INTO audit_logs
4. Commit transaction
5. Return success
```

## 3. Gauge Management Workflows

### 3.1 Create Gauge (POST /gauges)
```
1. Validate permissions (gauge_create)
2. Validate required fields
3. Check gauge_id uniqueness
   - Query: SELECT FROM gauges WHERE gauge_id = ?
4. Begin transaction
   - Query: INSERT INTO gauges
   - Query: INSERT INTO audit_logs
5. Commit transaction
6. Return new gauge
```

### 3.2 Checkout Gauge (POST /:gaugeId/checkout)
```
1. Validate permissions (gauge_checkout)
2. Get gauge details
   - Query: SELECT FROM gauges WHERE gauge_id = ?
3. Validate gauge can be checked out
   - Not already checked out
   - Not calibration due
   - Seal intact (if sealed type)
4. Check for active checkout
   - Query: SELECT FROM checkouts WHERE gauge_id = ? AND actual_return_date IS NULL
   - If exists → return error
5. Begin transaction
   - Query: INSERT INTO checkouts
   - Query: UPDATE gauges SET status = 'checked_out'
   - Query: UPDATE gauges SET assigned_to_user = ?
   - Query: UPDATE gauges SET location = ?
   - Query: INSERT INTO audit_logs
6. Commit transaction
7. Emit GAUGE_CHECKED_OUT event
8. Return checkout details
```

### 3.3 Return Gauge (POST /:gaugeId/return)
```
1. Validate permissions (gauge_return)
2. Get active checkout
   - Query: SELECT FROM checkouts WHERE gauge_id = ? AND actual_return_date IS NULL
   - If not found → error
3. Validate user can return (checked out to them or admin)
4. Begin transaction
   - Query: UPDATE checkouts SET actual_return_date = NOW()
   - Query: UPDATE checkouts SET return_condition = ?
   - Query: UPDATE gauges SET status = 'available'
   - Query: UPDATE gauges SET assigned_to_user = NULL
   - Query: UPDATE gauges SET location = 'storage'
   - Query: INSERT INTO audit_logs
5. Commit transaction
6. Emit GAUGE_RETURNED event
7. Return success
```

### 3.4 Record Calibration (POST /:id/calibration)
```
1. Validate permissions (gauge_calibrate)
2. Get gauge details
   - Query: SELECT FROM gauges WHERE gauge_id = ?
3. Validate calibration data
4. Begin transaction
   - Query: INSERT INTO calibrations
   - Query: UPDATE gauges SET last_calibration_date = ?
   - Query: UPDATE gauges SET next_calibration_date = ?
   - Query: UPDATE gauges SET calibration_status = 'calibrated'
   - Query: INSERT INTO audit_logs
5. Commit transaction
6. Emit GAUGE_CALIBRATION_COMPLETED event
7. Return calibration record
```

## 4. Transfer Workflows

### 4.1 Create Transfer Request (POST /transfers)
```
1. Validate permissions (gauge_transfer)
2. Get gauge details
   - Query: SELECT FROM gauges WHERE gauge_id = ?
3. Validate gauge can be transferred
   - Not checked out
   - User has access to from_department
4. Begin transaction
   - Query: INSERT INTO transfers
   - Query: UPDATE gauges SET transfer_status = 'pending'
   - Query: INSERT INTO audit_logs
5. Commit transaction
6. Emit GAUGE_TRANSFER_REQUESTED event
7. Return transfer request
```

### 4.2 Approve Transfer (PUT /transfers/:id/accept)
```
1. Validate permissions (gauge_transfer_approve)
2. Get transfer details
   - Query: SELECT FROM transfers WHERE id = ?
3. Validate transfer is pending
4. Validate approver has access to to_department
5. Begin transaction
   - Query: UPDATE transfers SET approval_status = 'approved'
   - Query: UPDATE transfers SET approved_by = ?
   - Query: UPDATE gauges SET department_id = ?
   - Query: UPDATE gauges SET location = ?
   - Query: UPDATE gauges SET transfer_status = NULL
   - Query: INSERT INTO audit_logs
6. Commit transaction
7. Emit GAUGE_TRANSFERRED event
8. Return success
```

## 5. Unseal Request Workflows

### 5.1 Create Unseal Request (POST /:gaugeId/unseal-request)
```
1. Validate permissions (gauge_unseal_request)
2. Get gauge details
   - Query: SELECT FROM gauges WHERE gauge_id = ?
3. Validate gauge is sealed
4. Check for pending request
   - Query: SELECT FROM unseal_requests WHERE gauge_id = ? AND status = 'pending'
5. Begin transaction
   - Query: INSERT INTO unseal_requests
   - Query: INSERT INTO audit_logs
6. Commit transaction
7. Emit GAUGE_UNSEAL_REQUESTED event
8. Return request
```

### 5.2 Approve Unseal (PUT /unseal-requests/:id/approve)
```
1. Validate permissions (gauge_unseal_approve)
2. Get request details
   - Query: SELECT FROM unseal_requests WHERE id = ?
3. Validate request is pending
4. Begin transaction
   - Query: UPDATE unseal_requests SET status = 'approved'
   - Query: UPDATE gauges SET seal_intact = 0
   - Query: UPDATE gauges SET seal_broken_date = NOW()
   - Query: UPDATE gauges SET seal_broken_by = ?
   - Query: INSERT INTO audit_logs
5. Commit transaction
6. Emit GAUGE_UNSEALED event
7. Return success
```

## 6. Quality Control Workflows

### 6.1 QC Verification (POST /:gaugeId/verify)
```
1. Validate permissions (gauge_qc)
2. Get gauge details
   - Query: SELECT FROM gauges WHERE gauge_id = ?
3. Begin transaction
   - Query: UPDATE gauges SET qc_status = 'verified'
   - Query: UPDATE gauges SET qc_date = NOW()
   - Query: UPDATE gauges SET qc_by = ?
   - Query: INSERT INTO audit_logs
4. Commit transaction
5. Emit QC_VERIFICATION_COMPLETED event
6. Return success
```

### 6.2 QC Failure (POST /:gaugeId/fail)
```
1. Validate permissions (gauge_qc)
2. Get gauge details
   - Query: SELECT FROM gauges WHERE gauge_id = ?
3. Begin transaction
   - Query: UPDATE gauges SET qc_status = 'failed'
   - Query: UPDATE gauges SET status = 'quarantine'
   - Query: INSERT INTO rejection_reasons
   - Query: INSERT INTO audit_logs
4. Commit transaction
5. Emit QC_VERIFICATION_FAILED event
6. Return failure details
```

## 7. Report Generation Workflows

### 7.1 Dashboard Summary (GET /dashboard/summary)
```
1. Validate permissions (gauge_read)
2. Execute aggregation queries in parallel:
   - Query: COUNT(*) total gauges
   - Query: COUNT(*) WHERE status = 'available'
   - Query: COUNT(*) WHERE status = 'checked_out'
   - Query: COUNT(*) WHERE calibration_due < NOW()
   - Query: COUNT(*) WHERE seal_intact = 0
3. Combine results
4. Return summary object
```

### 7.2 Overdue Calibration Report (GET /overdue/calibration)
```
1. Validate permissions (gauge_read)
2. Query overdue gauges
   - Query: SELECT FROM gauges WHERE next_calibration_date < NOW()
   - JOIN with categories, departments, users
3. Calculate days overdue for each
4. Sort by priority/days overdue
5. Return formatted report
```

## 8. Administrative Workflows

### 8.1 Bulk Status Update (POST /update-statuses)
```
1. Validate admin permissions
2. Begin transaction
3. For each gauge in batch:
   - Query: SELECT current status
   - Validate status transition
   - Query: UPDATE gauges SET status = ?
   - Query: INSERT INTO audit_logs
4. Commit transaction
5. Return update summary
```

### 8.2 System Recovery (POST /gauge/:gaugeId/recover)
```
1. Validate admin permissions
2. Get gauge full history
   - Query: SELECT FROM gauges
   - Query: SELECT FROM checkouts
   - Query: SELECT FROM audit_logs
3. Determine correct state
4. Begin transaction
   - Query: UPDATE gauges to correct state
   - Query: UPDATE/INSERT checkouts if needed
   - Query: INSERT recovery audit log
5. Commit transaction
6. Return recovery details
```

## Key Business Rules Enforced

1. **Calibration Due**: Cannot checkout if calibration overdue
2. **Seal Status**: Sealed gauges require unseal approval before use
3. **Single Checkout**: One gauge can only be checked out to one user
4. **Department Access**: Users can only access gauges in their department
5. **Audit Trail**: Every state change is logged
6. **Soft Deletes**: No hard deletes, only is_deleted flags
7. **Transaction Integrity**: Multi-table updates use transactions
8. **Event Notifications**: State changes emit events for subscribers

## Transaction Patterns

### Simple Transaction
```sql
BEGIN;
UPDATE table SET ... WHERE ...;
INSERT INTO audit_logs (...) VALUES (...);
COMMIT;
```

### Complex Transaction (Checkout)
```sql
BEGIN;
INSERT INTO checkouts (...) VALUES (...);
UPDATE gauges SET status = 'checked_out' WHERE ...;
UPDATE gauges SET assigned_to_user = ? WHERE ...;
UPDATE gauges SET location = ? WHERE ...;
INSERT INTO audit_logs (...) VALUES (...);
COMMIT;
```

### Rollback on Error
```sql
BEGIN;
-- Multiple operations
-- If any fail:
ROLLBACK;
-- Return error to user
```