# 🎯 Real Database Testing Plan - 90% Coverage Target

## 🔥 CORE PHILOSOPHY
# "If it doesn't hit the database, it's not a real test!"

## Current Status
- **Coverage**: 42.95% 
- **Mock Files**: 39 files with 3019 violations
- **Target**: 90% coverage with ZERO mocks

## Database Connections to Test

### 1. Authentication & Authorization
- [ ] User login → users table validation
- [ ] JWT token → user sessions verification
- [ ] Role permissions → roles + permissions tables join
- [ ] Permission checks → user_permissions lookup
- [ ] Password validation → bcrypt comparison with stored hash
- [ ] Session management → active sessions tracking
- [ ] Account lockout → failed_login_attempts table

### 2. Gauge CRUD Operations
- [ ] Create gauge → INSERT with all constraints
- [ ] Update gauge → UPDATE with version checking
- [ ] Delete gauge → Soft delete (is_deleted flag)
- [ ] Get gauge by ID → JOIN with categories, status
- [ ] Search gauges → Full text search across multiple columns
- [ ] Bulk operations → Transaction handling for multiple gauges
- [ ] Duplicate prevention → Unique constraint validation

### 3. Gauge Status Management
- [ ] Status transitions → Valid state machine paths
- [ ] Seal status → seal_broken, seal_intact validation
- [ ] Calibration status → calibration_due calculations
- [ ] Location tracking → current_location updates
- [ ] Assignment status → assigned_to_user foreign key

### 4. Calibration System
- [ ] Record calibration → calibrations table INSERT
- [ ] Calibration history → Historical records retrieval
- [ ] Next calibration date → Date calculation and storage
- [ ] Calibration standards → standards table JOIN
- [ ] Overdue calibrations → Date comparison queries
- [ ] Calibration certificates → Document references

### 5. Checkout/Return Workflow
- [ ] Checkout gauge → checkouts table + gauge status update
- [ ] Return gauge → checkout completion + status revert
- [ ] Expected return dates → Date tracking and alerts
- [ ] Checkout history → User checkout records
- [ ] Concurrent checkouts → Lock handling
- [ ] Department assignments → department foreign key

### 6. Transfer Operations
- [ ] Create transfer → transfers table INSERT
- [ ] Transfer approval → approval_status updates
- [ ] Transfer history → Historical transfer records
- [ ] Cross-department → department validation
- [ ] Transfer notifications → notification triggers

### 7. Unseal Requests
- [ ] Request unseal → unseal_requests INSERT
- [ ] Approve unseal → Status update + gauge unsealing
- [ ] Reject unseal → Status update with reason
- [ ] Emergency unseals → Priority handling
- [ ] Unseal history → Audit trail

### 8. Audit Trail
- [ ] All INSERT operations → audit_logs entries
- [ ] All UPDATE operations → Change tracking
- [ ] All DELETE operations → Deletion records
- [ ] User actions → user_id tracking
- [ ] Timestamp accuracy → created_at, updated_at
- [ ] Entity relationships → entity_type, entity_id

### 9. Foreign Key Constraints
- [ ] gauge.category_id → gauge_categories.id
- [ ] gauge.assigned_to_user → users.id
- [ ] checkouts.user_id → users.id
- [ ] checkouts.gauge_id → gauges.gauge_id
- [ ] transfers.from_department → departments.id
- [ ] transfers.to_department → departments.id
- [ ] Invalid FK insertions → Constraint violations

### 10. Unique Constraints
- [ ] gauges.gauge_id uniqueness
- [ ] gauges.serial_number uniqueness
- [ ] users.username uniqueness
- [ ] Compound unique indexes
- [ ] Constraint violation handling

### 11. Transaction Management
- [ ] Multi-table operations → ACID compliance
- [ ] Rollback scenarios → Failure recovery
- [ ] Deadlock handling → Retry logic
- [ ] Isolation levels → Read consistency
- [ ] Bulk inserts → Transaction batching

### 12. Query Performance
- [ ] Index usage → EXPLAIN plan verification
- [ ] Complex JOINs → Multi-table query optimization
- [ ] Search queries → Full-text index usage
- [ ] Pagination → LIMIT/OFFSET efficiency
- [ ] Aggregation queries → GROUP BY performance
- [ ] Subqueries → Optimization strategies

### 13. Connection Pool
- [ ] Max connections → Pool exhaustion handling
- [ ] Connection timeouts → Timeout recovery
- [ ] Connection reuse → Pool efficiency
- [ ] Concurrent requests → Pool queuing
- [ ] Connection health → Automatic recovery

### 14. Data Integrity
- [ ] Date validations → Valid date ranges
- [ ] Enum validations → Valid option sets
- [ ] Numeric ranges → Min/max constraints
- [ ] String lengths → VARCHAR limits
- [ ] NULL handling → Required vs optional fields
- [ ] Default values → Automatic population

### 15. Business Rule Validation
- [ ] Calibration due → Cannot checkout
- [ ] Sealed gauge → Cannot use until unsealed
- [ ] Role permissions → Action authorization
- [ ] Companion gauge rules → Paired gauge logic
- [ ] Spare gauge allocation → Availability checks

## Priority Order

### CRITICAL (Must have for 90% coverage)
1. Authentication flow (0% current)
2. Error handling (12.6% current)
3. Calibration service (7.22% current)
4. Seal service (6.77% current)
5. Status service (11.29% current)

### HIGH (Core functionality)
6. Gauge CRUD operations
7. Checkout/Return workflow
8. Audit trail verification
9. Foreign key constraints
10. Transaction management

### MEDIUM (Important features)
11. Transfer operations
12. Unseal requests
13. Search functionality
14. Permission checks
15. Concurrent operations

### LOW (Nice to have)
16. Performance benchmarks
17. Connection pool testing
18. Complex query optimization

## Success Metrics
- All database operations use real connections
- No mock objects or jest.fn() in tests
- Transaction isolation for each test
- Real constraint violation testing
- Actual query performance measurement
- True concurrent operation validation