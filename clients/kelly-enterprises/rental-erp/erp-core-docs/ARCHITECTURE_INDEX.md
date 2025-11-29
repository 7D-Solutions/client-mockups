# Fire-Proof ERP Platform - Architecture Index & Testing Reference

**Generated**: 2025-11-14  
**Platform**: Fire-Proof ERP Sandbox  
**Purpose**: Comprehensive testing strategy and architecture mapping

---

## Quick Navigation

### Documentation
- [Comprehensive Testing Strategy](./TESTING_STRATEGY.md) - Full 694-line report with all details
- [This Index](./ARCHITECTURE_INDEX.md) - Quick reference and navigation

### Key Statistics
- **7 Core Modules** identified
- **50+ Services** catalogued
- **70+ Repositories** mapped
- **100+ API Endpoints** documented
- **8 Critical Transactions** identified
- **7 Stress Test Scenarios** designed

---

## Module Map

### 1. Gauge Module (HIGHEST PRIORITY)
**Location**: `/backend/src/modules/gauge/`  
**Risk Level**: CRITICAL  
**Services**: 18+  
**Repositories**: 17+  
**Key Operations**:
- Gauge set creation/pairing/unpairing (CRITICAL - race conditions)
- Checkout/return workflows (HIGH - state transitions)
- Calibration management (CRITICAL - multi-step)
- Certificate handling (MEDIUM)

**Critical Endpoints**:
- `POST /api/gauges/v2/create-set` - Race condition risk
- `POST /api/gauges/v2/pair-spares` - CRITICAL race condition
- `POST /api/gauges/tracking/:id/checkout` - State transition risk
- `POST /api/calibration/batches/:id/send` - Multi-step state machine
- `POST /api/calibration/gauges/:id/release` - State consistency

**Transaction Patterns**:
- Gauge set creation: 7-step atomic operation
- Gauge pairing: 10-step atomic operation with validation window
- Checkout: 10-step atomic operation with status checks
- Calibration workflow: Multi-transaction state machine

### 2. Authentication Module (HIGH PRIORITY)
**Location**: `/backend/src/modules/auth/`  
**Risk Level**: HIGH (Account Lockout)  
**Services**: 1  
**Repositories**: 2  
**Key Operations**:
- Login with rate limiting (5 attempts/15 min)
- Account lockout mechanism (CRITICAL - counter race)
- Session management
- Token creation

**Critical Endpoints**:
- `POST /api/auth/login` - Race condition in counter increment
- `GET /api/auth/me` - Permission loading

**Transaction Patterns**:
- Failed attempt recording with atomic increment
- Account lockout creation with expiration window
- Session creation

### 3. Admin Module (MEDIUM-HIGH PRIORITY)
**Location**: `/backend/src/modules/admin/`  
**Risk Level**: MEDIUM-HIGH (Bulk Operations)  
**Services**: 3  
**Repositories**: 2  
**Key Operations**:
- User registration and management
- Permission grant/revoke
- System recovery operations

**Critical Endpoints**:
- `POST /api/admin/permissions/users/:id` - Permission grant
- `DELETE /api/admin/permissions/users/:id/:perm` - Permission revoke
- `POST /api/admin/user-management/register` - User creation

**Transaction Patterns**:
- User registration with role assignment (multi-table)
- Permission modifications (atomic)

### 4. User Module (MEDIUM PRIORITY)
**Location**: `/backend/src/modules/user/`  
**Risk Level**: MEDIUM  
**Services**: 4  
**Repositories**: 4  
**Key Operations**:
- Profile management
- Preferences sync
- Favorites tracking
- Badge count updates

**Critical Endpoints**:
- `PUT /api/users/me` - Profile updates (concurrent)
- `POST /api/users/me/favorites` - Concurrent favorites
- `POST /api/users/me/badge-counts` - Badge updates

### 5. Inventory Module (HIGH PRIORITY)
**Location**: `/backend/src/modules/inventory/`  
**Risk Level**: HIGH (Concurrent Movements)  
**Services**: 2  
**Repositories**: 2  
**Key Operations**:
- Item movement tracking
- Location management
- Historical tracking

**Critical Endpoints**:
- `POST /api/inventory/move` - Concurrent location updates
- `GET /api/inventory/location/:id` - Current location tracking

**Transaction Patterns**:
- Movement recording with location update (atomic)
- Concurrent updates from gauge operations

### 6. Audit Module (LOW PRIORITY)
**Location**: `/backend/src/modules/audit/`  
**Risk Level**: LOW  
**Services**: 1  
**Repositories**: 1  

### 7. Health Module (LOW PRIORITY)
**Location**: `/backend/src/modules/health/`  
**Risk Level**: LOW  
**Services**: 1  

---

## Critical Operations by Risk Level

### CRITICAL Risk (P0 - Must Test First)

1. **Gauge Set Creation**
   - Endpoint: `POST /api/gauges/v2/create-set`
   - Risk: System ID collision, atomicity failure
   - Transaction: 7 steps must be atomic
   - Expected Issue: Duplicate set_id

2. **Gauge Set Pairing**
   - Endpoint: `POST /api/gauges/v2/pair-spares`
   - Risk: Gauge changes state between validation and update
   - Transaction: 10 steps, validation window vulnerability
   - Expected Issue: Same gauge paired by two threads

3. **Calibration Batch Workflow**
   - Sequence: Create → Add → Send → Receive → Verify → Release
   - Risk: State machine violation
   - Transaction: Multi-step, each step must maintain state
   - Expected Issue: Gauges skip steps or enter invalid states

4. **Checkout Operation**
   - Endpoint: `POST /api/gauges/tracking/:gaugeId/checkout`
   - Risk: Double checkout, inventory inconsistency
   - Transaction: 10 steps, status must not change between validation and update
   - Expected Issue: Same gauge checked out by two users

---

## High Priority (P1)

1. Account Lockout Counter Race
2. Inventory Location Conflicts
3. Return Operations State Transitions
4. Gauge Set Unpairing

---

## Transaction Boundaries

### Type 1: Single Transaction (BEGIN-COMMIT)
- Gauge set creation (7 steps)
- Gauge pairing (10 steps)
- Checkout (10 steps)
- Return (8 steps)

### Type 2: Multi-Transaction Workflow
- Calibration (6 transactions in sequence)
- Each transaction must maintain state validity
- No concurrent modifications allowed during workflow

### Type 3: Atomic Increment + Update
- Account lockout counter increment + lockout creation
- Permission modifications + audit logging

---

## Stress Test Scenarios

### Scenario 1: Concurrent Creation
```
Load: 100 concurrent POST /api/gauges/v2/create-set
Measurement: Set ID uniqueness, creation success rate
Expected Issues: Deadlocks, constraint violations
```

### Scenario 2: Concurrent Pairing
```
Load: 50 concurrent pair-spares operations
Measurement: Pairing success, state consistency
Expected Issues: Race conditions, duplicate pairs
```

### Scenario 3: Calibration Workflow Stress
```
Load: 20 batches × 50 gauges simultaneous workflow
Measurement: State progression accuracy
Expected Issues: Step skipping, state machine violations
```

### Scenario 4: Checkout/Return Surge
```
Load: 100 checkout, 5s pause, 100 return
Measurement: No double checkouts, return success
Expected Issues: Lost updates, state conflicts
```

### Scenario 5: Login Brute Force
```
Load: 100 failed attempts on 20 accounts
Measurement: Lockout correctness, timeout enforcement
Expected Issues: Counter increment races
```

### Scenario 6: Concurrent Inventory Moves
```
Load: 100 movements to same location
Measurement: Location tracking accuracy
Expected Issues: Lost writes, concurrent updates
```

### Scenario 7: Permission Changes
```
Load: 50 requests with concurrent permission modifications
Measurement: Permission enforcement consistency
Expected Issues: Stale cache, timing windows
```

---

## Testing Checklist

### Phase 1: Transaction Validation
- [ ] Gauge set creation atomicity
- [ ] Gauge pairing validation window
- [ ] Checkout state consistency
- [ ] Account lockout counter increment
- [ ] Permission modifications atomicity

### Phase 2: Concurrency Testing
- [ ] Race condition detection
- [ ] Deadlock identification
- [ ] Lost update prevention
- [ ] Data consistency validation

### Phase 3: Workflow Validation
- [ ] Calibration state machine
- [ ] Checkout/return transitions
- [ ] Multi-step operation sequencing

### Phase 4: Load Testing
- [ ] Execute all 7 scenarios
- [ ] Measure P95/P99 latencies
- [ ] Identify bottlenecks
- [ ] Capacity planning

### Phase 5: Chaos Testing
- [ ] Network failure injection
- [ ] Database timeout simulation
- [ ] Partial failure recovery
- [ ] Data consistency post-failure

---

## Key Files to Reference

### Services
- GaugeSetService: `/backend/src/modules/gauge/services/GaugeSetService.js` (908 lines)
- GaugeCheckoutService: `/backend/src/modules/gauge/services/GaugeCheckoutService.js` (744 lines)
- GaugeCreationService: `/backend/src/modules/gauge/services/GaugeCreationService.js` (561 lines)
- CalibrationBatchManagementService: `/backend/src/modules/gauge/services/CalibrationBatchManagementService.js`
- authService: `/backend/src/modules/auth/services/authService.js`
- adminService: `/backend/src/modules/admin/services/adminService.js` (520 lines)

### Routes
- Gauge V2: `/backend/src/modules/gauge/routes/gauges-v2.js` (1192 lines)
- Calibration: `/backend/src/modules/gauge/routes/calibration.routes.js`
- Auth: `/backend/src/modules/auth/routes/auth.js`
- Admin: `/backend/src/modules/admin/routes/`

### Infrastructure
- Database: `/backend/src/infrastructure/database/connection.js`
- Auth Middleware: `/backend/src/infrastructure/middleware/auth.js`
- Error Handler: `/backend/src/infrastructure/middleware/errorHandler.js`
- Rate Limiter: `/backend/src/infrastructure/middleware/rateLimiter.js`
- Audit: `/backend/src/infrastructure/middleware/auditMiddleware.js`

---

## Database Considerations

### Isolation Levels
- **SERIALIZABLE**: Gauge set operations (prevent phantom reads)
- **REPEATABLE READ**: Checkout/return (prevent dirty reads, enable lost update prevention)
- **REPEATABLE READ**: Account lockout (prevent stale reads)

### Locking Strategy
- SELECT FOR UPDATE on gauges during pairing
- Exclusive lock on set_id generation
- Row-level locks for account_lockout increment

### Indexes Required
```sql
CREATE INDEX idx_gauges_set_id ON gauges(set_id);
CREATE INDEX idx_gauges_status ON gauges(status);
CREATE INDEX idx_gauges_gauge_id ON gauges(gauge_id);
CREATE INDEX idx_checkouts_user_id ON checkouts(user_id);
CREATE INDEX idx_movements_location ON movements(current_location);
CREATE INDEX idx_account_lockouts_email ON account_lockouts(email);
```

---

## Performance Targets

### Latency (P95)
- GET endpoints: < 200ms
- POST endpoints: < 500ms
- Batch operations: < 2s

### Throughput
- API: 1000 requests/sec
- Auth login: 50 requests/sec (with rate limiting)
- Gauge operations: 100 requests/sec

### Database
- Connection pool: 10-50 concurrent
- Query timeout: 30s
- Transaction timeout: 5s

---

## Operational Notes

### Rate Limiting
- Login: 5 attempts per 15 minutes
- API: 100 requests per minute (global)
- Auth endpoints: Stricter limits applied

### Health Checks
- Basic: `/api/health` - App running
- Detailed: `/api/health/detailed` - Component status
- Metrics: `/api/metrics` - Performance dashboard

### Monitoring
- Request ID tracking (correlation)
- Performance monitoring (P95/P99)
- Error tracking (rate, types)
- Deadlock detection
- Account lockout monitoring

---

## Known Constraints

1. Database is external (not containerized)
2. Connection pool must handle concurrent stress
3. Set_id generation must be truly unique (risk: collision)
4. Account lockout counter uses non-atomic increment pattern (risk: race condition)
5. Permission enforcement runs on every request (risk: stale cache)

---

## Recommended Test Implementation

### Load Testing Tool
- Node.js: autocannon, clinic.js
- General: k6, JMeter, Locust
- Custom: Use provided infrastructure for custom scenarios

### Test Data Requirements
- 1000+ gauge records
- 500+ users with various roles
- 100+ batches in various states
- Historical transaction data

### Monitoring Stack
- Database query logging
- Transaction boundary logging
- Request/response timing
- Error rate tracking
- Deadlock detection

---

## Document Versions

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-14 | Initial architecture mapping and testing strategy |

---

## Contact & Reference

For detailed analysis of specific operations, consult the comprehensive testing strategy document at:
`/mnt/c/users/7d.vision/projects/fire-proof-erp-sandbox/erp-core-docs/TESTING_STRATEGY.md`

This index provides quick navigation to critical areas requiring stress testing.
