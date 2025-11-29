# Fire-Proof ERP Platform - Comprehensive Testing Strategy & Architecture Mapping

**Report Generated**: 2025-11-14  
**Platform**: Fire-Proof ERP Sandbox  
**Backend Stack**: Node.js/Express, MySQL, Service-oriented architecture  
**Test Focus**: Stress testing, concurrency, transaction validation

---

## EXECUTIVE SUMMARY

The Fire-Proof ERP platform contains **7 core modules** with **50+ services**, **70+ repositories**, and **100+ API endpoints**. The architecture emphasizes:
- **Gauge Management** (primary module with complex workflows)
- **User & Authentication** (RBAC-based access control)
- **Admin Operations** (system configuration and user management)
- **Inventory Tracking** (location-based inventory system)
- **Audit Logging** (comprehensive state change tracking)
- **Calibration Workflows** (multi-step certification processes)

### Critical Stress Testing Areas
1. **Gauge Set Operations** - Concurrent creation/pairing/unpairing
2. **Calibration Workflow** - Multi-stage batch processing
3. **Checkout/Return Operations** - State transitions with inventory impacts
4. **Concurrent Gauge Updates** - Race conditions in status changes
5. **User Authentication** - Account lockout mechanisms under load
6. **Permission Enforcement** - RBAC validation on every API call

---

## MODULE INVENTORY

### 1. GAUGE MODULE (Primary Business Domain)
**Location**: `/backend/src/modules/gauge/`  
**Purpose**: Core gauge management, calibration, tracking, and certification  
**Complexity**: VERY HIGH (50+ services, 25+ repositories)  

#### Key Services:
- **GaugeService** - Main gauge CRUD and creation
- **GaugeSetService** - Gauge set pairing/unpairing (908 lines)
- **GaugeCheckoutService** - Checkout/return workflow (744 lines)
- **GaugeCreationService** - Gauge creation logic (561 lines)
- **CalibrationBatchManagementService** - Batch creation and management
- **CalibrationWorkflowService** - Multi-step calibration workflow
- **GaugeOperationsService** - Operations tracking (529 lines)
- **GaugeQueryService** - Search and filter operations
- **GaugeValidationService** - Business rule validation
- **GaugeCascadeService** - Cascading operations (555 lines)
- **TransfersService** - Gauge transfer operations
- **UnsealsService** - Unseal request management
- **sealService** - Seal/lock management
- **gaugeCalibrationService** - Internal hand tool calibration (549 lines)
- **ReportsService** - Historical reports
- **GaugeDashboardService** - Dashboard metrics
- **GaugeStatusService** - Status tracking
- **GaugeHistoryService** - Historical data

#### Key Repositories:
- GaugeRepository (445 lines)
- GaugeSetRepository
- CalibrationRepository
- CalibrationBatchRepository
- CertificateRepository
- CheckoutRepository
- GaugeStatusRepository
- OperationsRepository
- ReportsRepository
- TrackingRepository
- TransfersRepository
- UnsealRequestsRepository

#### Critical API Endpoints:
- **Gauge Set Management** (Concurrency Risk: CRITICAL)
  - `POST /api/gauges/v2/create-set` - Create GO/NO GO pair
  - `POST /api/gauges/v2/pair-spares` - Pair existing spares (Race condition risk)
  - `POST /api/gauges/v2/replace-companion` - Replace gauge in set (State conflict risk)
  - `POST /api/gauges/v2/unpair` - Break gauge set (Data inconsistency risk)
  - `POST /api/gauges/v2/retire-set` - Soft delete set
  - `GET /api/gauges/v2/spares` - Get available spares
  - `GET /api/gauges/v2/sets/:setId` - Get set details
  - `PUT /api/gauges/v2/sets/:setId` - Update set properties

- **Single Gauge Operations**
  - `POST /api/gauges/v2/create` - Create individual gauge
  - `GET /api/gauges` - List with pagination
  - `GET /api/gauges/:id` - Get gauge details
  - `GET /api/gauges/search` - Full-text search

- **Calibration Workflow** (Concurrency Risk: HIGH)
  - `POST /api/calibration/batches` - Create batch (Transaction boundary)
  - `POST /api/calibration/batches/:batchId/gauges` - Add gauge to batch
  - `POST /api/calibration/batches/:batchId/send` - Send for calibration
  - `POST /api/calibration/gauges/:id/receive` - Receive from calibration
  - `POST /api/calibration/gauges/receive-multiple` - Bulk receive
  - `POST /api/calibration/gauges/:id/verify-certificates` - Verify certs
  - `POST /api/calibration/gauges/:id/release` - Release to inventory
  - `GET /api/calibration/batches` - List batches
  - `GET /api/calibration/gauges/:id/status` - Get workflow status

- **Checkout/Return Operations** (Concurrency Risk: HIGH)
  - `POST /api/gauges/tracking/:gaugeId/checkout` - Checkout gauge
  - `POST /api/gauges/tracking/:gaugeId/return` - Return gauge
  - `POST /api/gauges/tracking/:gaugeId/qc-verify` - QC verification
  - `POST /api/gauges/tracking/:gaugeId/return-customer` - Return to customer
  - `POST /api/gauges/tracking/checkout` - Bulk checkout

- **Transfer Operations** (Concurrency Risk: MEDIUM)
  - `POST /api/gauges/tracking/transfers` - Create transfer
  - `GET /api/gauges/tracking/transfers` - List transfers
  - `POST /api/gauges/tracking/transfers/:transferId/confirm` - Confirm transfer

- **Unseal Requests** (Concurrency Risk: MEDIUM)
  - `POST /api/gauges/tracking/unseals` - Create unseal request
  - `GET /api/gauges/tracking/unseals` - List requests
  - `POST /api/gauges/tracking/unseals/:requestId/approve` - Approve

- **Certificate Management**
  - `POST /api/gauges/:id/certificates` - Upload certificate
  - `GET /api/gauges/:id/certificates` - List certificates
  - `DELETE /api/gauges/:id/certificates/:certificateId` - Remove certificate

- **Reports & History**
  - `GET /api/gauges/:gaugeId/history` - Get gauge history
  - `GET /api/gauges/tracking/reports` - Get reports

---

### 2. AUTHENTICATION MODULE
**Location**: `/backend/src/modules/auth/`  
**Purpose**: User authentication, session management, account lockout  
**Complexity**: HIGH

#### Key Services:
- **authService** - Login, token creation, password management

#### Key Repositories:
- AuthRepository (529 lines)
- AccountLockoutRepository

#### Critical API Endpoints (Concurrency Risk: HIGH - Account lockout):
- `POST /api/auth/login` - User login with rate limiting
  - Rate limit: 5 attempts per 15 minutes
  - Account lockout after failed attempts
  - JWT token creation and cookie setting
  
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change password (authenticated)

#### Transaction Patterns:
- Login attempt recording (concurrent access)
- Account lockout creation/update (race condition risk)
- Token and session creation (atomicity required)

---

### 3. ADMIN MODULE
**Location**: `/backend/src/modules/admin/`  
**Purpose**: System administration, user management, permissions, organization settings  
**Complexity**: HIGH

#### Key Services:
- **adminService** (520 lines) - Admin operations
- **AdminMaintenanceService** - System maintenance
- **organizationService** (483 lines) - Organization settings

#### Key Repositories:
- AdminRepository (965 lines)
- OrganizationRepository

#### Critical API Endpoints (Concurrency Risk: HIGH - Bulk operations):
- **User Management**
  - `POST /api/admin/user-management/register` - Create new user
  - `POST /api/admin/user-management/unlock/:userId` - Unlock account
  - `POST /api/admin/user-management/change-password` - Admin change password
  - `POST /api/admin/user-management/reset-password/:userId` - Reset password
  - `DELETE /api/admin/user-management/users/:id` - Delete user
  - `GET /api/admin/user-management/users` - List users (paginated)

- **Permission Management**
  - `POST /api/admin/permissions/roles` - Create role
  - `GET /api/admin/permissions/roles` - List roles
  - `POST /api/admin/permissions/users/:userId` - Grant permission
  - `DELETE /api/admin/permissions/users/:userId/:permissionId` - Revoke permission
  - `DELETE /api/admin/permissions/users/:userId/bulk` - Bulk revoke

- **System Maintenance**
  - `GET /api/admin/maintenance/system-health` - System health
  - `POST /api/admin/system-recovery/restart-sync` - Restart sync

- **Organization**
  - `POST /api/admin/organization/settings` - Update settings
  - `GET /api/admin/organization/settings` - Get settings

#### Transaction Patterns:
- User registration with role assignment (multi-table transaction)
- Permission grants/revokes (concurrent updates)
- System recovery operations (atomic batch operations)

---

### 4. USER MODULE
**Location**: `/backend/src/modules/user/`  
**Purpose**: User profile, preferences, favorites, badge counts  
**Complexity**: MEDIUM

#### Key Services:
- **UserService** - Profile and preference management
- **UserPreferencesService** - Cross-device settings sync
- **FavoritesService** - Navigation favorites
- **BadgeCountsService** - Sidebar notification counts

#### Key Repositories:
- UserRepository
- UserPreferencesRepository
- FavoritesRepository
- BadgeCountsRepository

#### Critical API Endpoints (Concurrency Risk: MEDIUM - Profile updates):
- `GET /api/users` - List all active users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `GET /api/users/assignments` - Get user assignments
- `GET /api/users/transfers` - Get pending transfers
- `POST /api/users/me/favorites` - Add favorite
- `GET /api/users/me/favorites` - List favorites
- `DELETE /api/users/me/favorites/:key` - Remove favorite
- `POST /api/users/me/badge-counts` - Update badge counts
- `GET /api/users/me/badge-counts/:key` - Get badge count
- `POST /api/user/preferences` - Update preferences
- `GET /api/user/preferences/:key` - Get preference

---

### 5. INVENTORY MODULE
**Location**: `/backend/src/modules/inventory/`  
**Purpose**: Inventory movement tracking, location management, reporting  
**Complexity**: MEDIUM

#### Key Services:
- **MovementService** - Track item movements
- **InventoryReportingService** (502 lines) - Reporting and analysis

#### Key Repositories:
- MovementRepository
- CurrentLocationRepository

#### Critical API Endpoints (Concurrency Risk: HIGH - Location tracking):
- `POST /api/inventory/move` - Move item to location
- `GET /api/inventory/location/:itemType/:itemIdentifier` - Get current location
- `DELETE /api/inventory/location/:itemType/:itemIdentifier` - Remove from inventory
- `GET /api/inventory/movements/:itemType/:itemIdentifier` - Get movement history
- `GET /api/inventory/reports` - Get inventory reports

#### Transaction Patterns:
- Movement record creation with location update
- Concurrent location updates from gauge operations
- Historical record preservation on deletions

---

### 6. AUDIT MODULE
**Location**: `/backend/src/modules/audit/`  
**Purpose**: Audit logging for frontend events and system changes  
**Complexity**: LOW

#### Key Services:
- AuditService

#### Key Repositories:
- AuditRepository

#### Critical API Endpoints:
- `POST /api/audit/frontend-event` - Log frontend events (no auth)
- `GET /api/audit/logs` - Get audit logs (admin only)

---

### 7. HEALTH MODULE
**Location**: `/backend/src/modules/health/`  
**Purpose**: System health monitoring and diagnostics  
**Complexity**: LOW

#### Key Services:
- HealthService

#### Critical API Endpoints:
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health report
- `GET /api/metrics` - Performance metrics

---

## INFRASTRUCTURE SERVICES

### Location**: `/backend/src/infrastructure/`

#### Core Services:
1. **Database Connection** (`database/connection.js`)
   - MySQL connection pooling
   - Query execution with async/await
   - Transaction support

2. **Authentication Middleware** (`middleware/auth.js`)
   - JWT verification
   - User permission loading
   - Role extraction

3. **Authorization Middleware** (`middleware/checkPermission.js`, `middleware/permissionEnforcement.js`)
   - RBAC validation
   - Permission checking on every request

4. **Audit Middleware** (`middleware/auditMiddleware.js`)
   - State change logging
   - User action tracking
   - Comprehensive audit trail

5. **Rate Limiting** (`middleware/rateLimiter.js`)
   - Global API rate limiting
   - Auth endpoint rate limiting (5 attempts per 15 min)
   - Token bucket algorithm

6. **Error Handling** (`middleware/errorHandler.js`)
   - Global error handler
   - Circuit breaker pattern
   - Request ID tracking

7. **Observability** (`observability/`)
   - StructuredLogger - Structured logging
   - HealthMonitor - System health tracking
   - ObservabilityManager - Tracing and metrics
   - ReliabilityBudgetMonitor - SLA tracking

8. **Event System** (`events/EventBus.js`)
   - Event publishing and subscription
   - Async event handling

9. **Notification System** (`notifications/NotificationService.js`)
   - Multi-channel notifications
   - Email channel integration

10. **Performance Monitoring** (`utils/performanceMonitor.js`)
    - Request/response timing
    - Performance dashboard
    - Bottleneck identification

11. **Location Hierarchy Services**
    - BuildingService
    - FacilityService
    - StorageLocationService
    - ZoneService

---

## CRITICAL BUSINESS OPERATIONS (Transaction Analysis)

### 1. GAUGE SET CREATION & PAIRING (CRITICAL - Race Conditions)

**Operation**: `POST /api/gauges/v2/create-set`
```
Sequence:
1. Validate gauge specifications (thread size, form, class must match)
2. Generate system ID for GO gauge
3. Create GO gauge record
4. Generate system ID for NO GO gauge
5. Create NO GO gauge record
6. Create gaugeSet link (set_id, shared)
7. Update inventory location
8. Log audit trail
```
**Concurrency Risks**:
- Race: Two threads generate same set_id
- Atomicity: Failure between gauge creation and set linkage
- Consistency: Mismatched specifications not detected
**Transaction Boundary**: All 7 steps must be atomic

**Operation**: `POST /api/gauges/v2/pair-spares` (Race Condition CRITICAL)
```
Sequence:
1. Fetch GO gauge by ID
2. Fetch NO GO gauge by ID
3. Validate both are spares (not in set, not checked out)
4. Validate specifications match
5. Check they're not already paired
6. Generate set_id
7. Update both gauges with set_id
8. Update base_gauge_id relationship
9. Update inventory location
10. Log audit trail
```
**Concurrency Risks**:
- Race: Gauge gets paired by two threads simultaneously
- Validation: Check state → pair window where gauge changes state
- Inconsistency: Gauges get into invalid state
**Transaction Boundary**: Steps 1-10 must prevent interleaving

### 2. CALIBRATION BATCH WORKFLOW (HIGH - Multi-step Process)

**Operation**: Calibration workflow (7-step process)
```
Step 1: POST /api/calibration/batches - Create batch
  - Create batch record
  - Set status = pending_assembly
  - Initialize gauge list

Step 2: POST /api/calibration/batches/:batchId/gauges - Add gauges
  - Add gauge to batch
  - Update gauge status = calibration_pending
  - Validate gauge state

Step 3: POST /api/calibration/batches/:batchId/send - Send batch
  - Lock batch from further additions
  - Set status = sent_to_calibration
  - Record send timestamp
  - Update all gauge states

Step 4: POST /api/calibration/gauges/:id/receive - Receive gauge
  - Update gauge status
  - Set calibration_result (passed/failed)
  - Record receive timestamp
  - If failed: mark for retry

Step 5: (Certificate receipt - external process)

Step 6: POST /api/calibration/gauges/:id/verify-certificates
  - Validate certificate presence
  - Verify certificate details
  - Set status = pending_release

Step 7: POST /api/calibration/gauges/:id/release - Release to inventory
  - Verify location set
  - Set status = available
  - Update inventory location
  - Make gauge available for checkout
```
**Concurrency Risks**:
- State machine violation (receive before send)
- Concurrent gauge additions while batch sending
- Batch locked status not respected
- Certificate verification race (Step 5/6 timing)
**Transaction Boundary**: Each step atomic, workflow sequence critical

### 3. CHECKOUT/RETURN OPERATIONS (HIGH - State Transitions)

**Operation**: `POST /api/gauges/tracking/:gaugeId/checkout`
```
Sequence:
1. Fetch gauge and validate exists
2. Fetch user and validate permissions
3. Validate gauge status = available
4. Validate gauge not already checked out
5. Check for active seals/locks
6. Create checkout record
7. Update gauge status = checked_out
8. Update gauge assigned_to = current_user_id
9. Create movement record to "checkout"
10. Log audit trail
```
**Concurrency Risks**:
- Race: Same gauge checked out by two users
- State: Gauge status changes between validation and update
- Double checkout: No exclusive lock
**Transaction Boundary**: Steps 1-10 must be atomic

**Operation**: `POST /api/gauges/tracking/:gaugeId/return`
```
Sequence:
1. Fetch gauge and validate checked out
2. Validate current user is checkout holder
3. Validate gauge status consistency
4. Create return record
5. Update gauge status = available
6. Clear assigned_to
7. Update inventory location
8. Log audit trail
```
**Concurrency Risks**:
- Return without checkout (orphan return record)
- Concurrent return attempts
**Transaction Boundary**: Steps 1-8 must be atomic

### 4. ACCOUNT LOCKOUT MECHANISM (HIGH - Concurrent Authentication)

**Operation**: Login with account lockout
```
Sequence on each failed login attempt:
1. Check if account locked
2. If locked, check lockout duration
3. If not expired, return 423 Locked
4. If expired, clear lockout
5. Increment failed attempt counter
6. If failed_attempts >= threshold:
   - Create/update lockout record
   - Set locked_until = now + duration
   - Return 423 Locked
7. Record login attempt
8. Log audit trail
```
**Concurrency Risks**:
- Race: Multiple failed attempts increment counter non-atomically
- Lost updates: Concurrent increment operations
- Lockout state: Multiple records created for same account
- Time window: Lockout expiration checks race
**Transaction Boundary**: Failed attempt recording + lockout check/update

### 5. PERMISSION ENFORCEMENT (MEDIUM - Every Request)

**Operation**: Permission validation on all API requests
```
Sequence:
1. Extract JWT token from header/cookie
2. Verify token signature and expiration
3. Fetch user from database
4. Fetch user permissions from database
5. Extract required permission for endpoint
6. Check if user has permission
7. If not, return 403 Forbidden
8. Proceed to handler
```
**Concurrency Risks**:
- Cache invalidation: Permission changes not reflected immediately
- Stale permissions: Loaded once per request
- Race: Permission revoke → request with old permission
**Transaction Boundary**: Permission fetch must be fresh per request

---

## TESTING PRIORITY MATRIX

| Module | Operation | Risk Level | Concurrency | Transaction | Priority |
|--------|-----------|-----------|-------------|------------|----------|
| Gauge | Create Set | CRITICAL | HIGH | Yes | P0 |
| Gauge | Pair Spares | CRITICAL | CRITICAL | Yes | P0 |
| Gauge | Unpair Gauges | HIGH | HIGH | Yes | P1 |
| Calibration | Batch Workflow | CRITICAL | HIGH | Multi-step | P0 |
| Gauge | Checkout | HIGH | HIGH | Yes | P1 |
| Gauge | Return | HIGH | HIGH | Yes | P1 |
| Auth | Login Lockout | HIGH | CRITICAL | Yes | P1 |
| Admin | Permission Grant | MEDIUM | MEDIUM | Yes | P2 |
| Inventory | Movement | HIGH | HIGH | Yes | P1 |
| Admin | User Register | MEDIUM | MEDIUM | Yes | P2 |

---

## STRESS TEST SCENARIOS

### Scenario 1: Concurrent Gauge Set Creation
**Load**: 100 concurrent requests to `POST /api/gauges/v2/create-set`
**Validation**:
- No duplicate set_id values
- All gauges created with correct pairing
- No orphaned gauge records
- Audit trail complete for all operations
**Expected Issues**: System ID collision, database deadlocks

### Scenario 2: Rapid Pairing/Unpairing
**Load**: 50 concurrent pairs, then 50 unpair on same gauges
**Validation**:
- No gauges left in inconsistent state
- Set IDs properly cleaned up
- Historical tracking intact
- Inventory location tracking maintained
**Expected Issues**: Race conditions, data inconsistency

### Scenario 3: Concurrent Calibration Batch Processing
**Load**: 20 batches, each with 50 gauges, all in workflow simultaneously
**Validation**:
- All gauges progress through correct states
- No gauges skip steps or enter invalid states
- Certificates properly linked
- Release operations succeed only with valid state
**Expected Issues**: State machine violations, step skipping

### Scenario 4: Checkout/Return Surge
**Load**: 100 checkout, wait 5s, 100 return simultaneously
**Validation**:
- No double checkouts
- All returns processed successfully
- Inventory location tracking accurate
- Assignment tracking correct
**Expected Issues**: Lost updates, state conflicts

### Scenario 5: Authentication Brute Force + Account Lockout
**Load**: 100 failed login attempts (varies across 20 accounts)
**Validation**:
- Accounts lock after N failures
- Lockout duration respected
- Concurrent attempts properly serialized
- Recovery possible after timeout
**Expected Issues**: Race conditions in counter increment, double lockout

### Scenario 6: Permission Changes During Request
**Load**: 50 requests with permission modifications mid-flight
**Validation**:
- Permissions verified consistently
- No privilege escalation
- Revoked permissions enforced immediately
**Expected Issues**: Stale permission caches, timing windows

### Scenario 7: Inventory Location Conflicts
**Load**: 100 concurrent movements to same location
**Validation**:
- All movements recorded correctly
- Current location tracking accurate
- History preserved
- No lost writes
**Expected Issues**: Lost updates in concurrent location tracking

---

## DATABASE TRANSACTION REQUIREMENTS

### Transactions Required:
1. **Gauge Set Creation** - 7-step atomic operation
2. **Gauge Pairing** - 10-step atomic operation
3. **Batch Send** - All gauges status change atomic
4. **Calibration Release** - All gauges release atomic
5. **Checkout** - Gauge + movement + assignment atomic
6. **Return** - Gauge status + movement + location atomic
7. **Account Lockout** - Increment + lockout creation atomic
8. **Permission Grant/Revoke** - All permission changes atomic

### Lock Requirements:
1. **Gauge Records** - SELECT FOR UPDATE on gauge pairing
2. **Set ID Generation** - Exclusive access during ID generation
3. **Account Lockout** - Lock during increment check
4. **Batch Status** - Lock during state transitions

### Isolation Level Requirements:
- **SERIALIZABLE** for gauge set operations (prevent phantom reads)
- **REPEATABLE READ** for checkout/return (prevent dirty reads)
- **REPEATABLE READ** for account lockout (prevent lost updates)

---

## METRICS TO TRACK

### Performance Metrics:
- P95/P99 latency for each endpoint
- Throughput (requests/second)
- Error rate by endpoint
- Database connection pool utilization

### Reliability Metrics:
- Transaction success/failure rates
- Deadlock frequency
- Timeout frequency
- Account lockout false positives

### Data Quality Metrics:
- Orphaned gauge records (gauges without set)
- Inconsistent inventory tracking
- Permission revocation lag
- Audit trail completeness

---

## RECOMMENDED TEST Execution Order

1. **Phase 1 - Unit Transaction Tests** (2 days)
   - Test each transaction independently
   - Validate atomicity
   - Confirm lock behavior

2. **Phase 2 - Concurrency Tests** (3 days)
   - Concurrent operation pairs
   - Race condition identification
   - Deadlock detection

3. **Phase 3 - Workflow Tests** (4 days)
   - Multi-step process validation
   - State machine correctness
   - Error recovery

4. **Phase 4 - Load Tests** (5 days)
   - Stress scenarios 1-7
   - Capacity planning
   - Bottleneck identification

5. **Phase 5 - Chaos Tests** (3 days)
   - Failure injection
   - Recovery validation
   - Stability confirmation

---

## IMPLEMENTATION NOTES

- Database version: MySQL (external, not containerized)
- Connection pool: Available via `getPool()` from infrastructure
- Service registry: Use `serviceRegistry.get('ServiceName')`
- Error handling: Use `asyncErrorHandler` wrapper
- Logging: Use `logger` from infrastructure
- Rate limiting: Already configured for login endpoint (5 attempts/15 min)
- Transaction support: Use `connection.beginTransaction()` and `commit()`/`rollback()`

