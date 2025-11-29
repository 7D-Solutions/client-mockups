# File Size Violations and Remediation Plan

**Category**: Backend Standards
**Purpose**: Document files exceeding size limits and provide refactoring strategies
**Created**: 2025-11-07
**Status**: ⚠️ **PRODUCTION BLOCKER** - 19 files exceed standards

---

## Overview

The Fire-Proof ERP codebase has **documented file size standards**:

- **Target**: 200-300 lines (ideal for maintainability)
- **Maximum**: **500 lines** (absolute limit before refactoring required)

**Current Status**: **19 files exceed the 500-line maximum**, with violations ranging from 502 to 1087 lines.

**Impact**:
- ⚠️ Reduced maintainability and code comprehension
- ⚠️ Increased cognitive load for developers
- ⚠️ Higher probability of bugs and merge conflicts
- ⚠️ Violation of documented coding standards

---

## Violation Summary

### Severity Classification

**Critical Violations** (>800 lines): **3 files**
**High Violations** (650-800 lines): **3 files**
**Medium Violations** (550-649 lines): **6 files**
**Low Violations** (500-549 lines): **7 files**

### Complete Violation List

| File | Lines | Violation | Priority | Estimated Effort |
|------|-------|-----------|----------|------------------|
| `gauges-v2.js` | 1087 | 🔴 Critical | P0 | 8-12 hours |
| `AdminRepository.js` | 965 | 🔴 Critical | P0 | 6-8 hours |
| `CertificateService.js` | 953 | 🔴 Critical | P0 | 6-8 hours |
| `GaugeSetService.js` | 815 | 🟠 High | P1 | 5-6 hours |
| `GaugeCheckoutService.js` | 738 | 🟠 High | P1 | 4-5 hours |
| `ObservabilityManager.js` | 660 | 🟠 High | P1 | 4-5 hours |
| `permissions.js` | 655 | 🟡 Medium | P2 | 3-4 hours |
| `BaseRepository.js` | 637 | 🟡 Medium | P2 | 4-5 hours |
| `auditService.js` | 609 | 🟡 Medium | P2 | 3-4 hours |
| `HealthMonitor.js` | 584 | 🟡 Medium | P2 | 3-4 hours |
| `GaugeCascadeService.js` | 555 | 🟡 Medium | P2 | 2-3 hours |
| `GaugeCreationService.js` | 546 | 🟡 Medium | P2 | 2-3 hours |
| `gaugeCalibrationService.js` | 540 | 🟢 Low | P3 | 2-3 hours |
| `admin.js` | 536 | 🟢 Low | P3 | 2-3 hours |
| `OperationsService.js` | 529 | 🟢 Low | P3 | 2-3 hours |
| `AuthRepository.js` | 529 | 🟢 Low | P3 | 2-3 hours |
| `adminService.js` | 520 | 🟢 Low | P3 | 2-3 hours |
| `StructuredLogger.js` | 505 | 🟢 Low | P3 | 2-3 hours |
| `InventoryReportingService.js` | 502 | 🟢 Low | P3 | 2-3 hours |

**Total Estimated Effort**: **70-90 hours** (9-11 developer days)

---

## Remediation Strategies by Category

### 1. Route Files (2 files, 1623 lines total)

**Files**:
- `gauges-v2.js` (1087 lines, 17 routes)
- `permissions.js` (655 lines, estimated 10-12 routes)
- `admin.js` (536 lines, estimated 8-10 routes)

**Root Cause**: Multiple routes with validators and handlers in single file

#### Recommended Refactoring: Route Splitting

**Strategy**: Split by functional domain or resource type

**Example for `gauges-v2.js`** (1087 lines → 3 files of ~350 lines each):

```
modules/gauge/routes/
  ├── gauge-sets.routes.js        # Set operations (create-set, pair-spares, replace-companion, unpair)
  ├── gauge-categories.routes.js  # Category management (get categories by equipment type)
  └── gauge-spares.routes.js      # Spare gauge operations (get spares, create single gauge)
```

**Before** (gauges-v2.js - 1087 lines):
```javascript
// ALL routes in one file
router.get('/categories/:equipmentType', ...);  // Line 1-80
router.post('/create-set', ...);                // Line 81-200
router.post('/pair-spares', ...);               // Line 201-320
router.post('/replace-companion', ...);         // Line 321-440
router.post('/unpair', ...);                    // Line 441-560
router.get('/spares', ...);                     // Line 561-680
router.post('/create', ...);                    // Line 681-800
// ... more routes ...
```

**After** (gauge-sets.routes.js - ~350 lines):
```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, requireOperator } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const { setValidators } = require('../validators/gauge-set.validators');
const gaugeSetHandlers = require('../handlers/gauge-set.handlers');

// Set creation
router.post('/create-set',
  authenticateToken,
  requireOperator,
  setValidators.createSet,
  asyncErrorHandler(gaugeSetHandlers.createSet)
);

// Pair spares into set
router.post('/pair-spares',
  authenticateToken,
  requireOperator,
  setValidators.pairSpares,
  asyncErrorHandler(gaugeSetHandlers.pairSpares)
);

// Replace companion in set
router.post('/replace-companion',
  authenticateToken,
  requireOperator,
  setValidators.replaceCompanion,
  asyncErrorHandler(gaugeSetHandlers.replaceCompanion)
);

// Unpair gauges from set
router.post('/unpair',
  authenticateToken,
  requireOperator,
  setValidators.unpair,
  asyncErrorHandler(gaugeSetHandlers.unpair)
);

module.exports = router;
```

**Supporting Structure**:
```
modules/gauge/
  ├── routes/
  │   ├── gauge-sets.routes.js       # Set operations (350 lines)
  │   ├── gauge-categories.routes.js # Categories (250 lines)
  │   └── gauge-spares.routes.js     # Spares (300 lines)
  ├── validators/
  │   ├── gauge-set.validators.js    # Extracted validators
  │   ├── gauge-category.validators.js
  │   └── gauge-spare.validators.js
  └── handlers/
      ├── gauge-set.handlers.js      # Extracted route handlers
      ├── gauge-category.handlers.js
      └── gauge-spare.handlers.js
```

**Benefits**:
- ✅ Each file under 400 lines (well within limits)
- ✅ Clear functional separation
- ✅ Easier to locate and modify specific operations
- ✅ Reduced merge conflicts
- ✅ Better testability (focused test files)

---

### 2. Repository Files (2 files, 1494 lines total)

**Files**:
- `AdminRepository.js` (965 lines)
- `AuthRepository.js` (529 lines)

**Root Cause**: Too many methods in single repository class

#### Recommended Refactoring: Method Grouping or Repository Splitting

**Strategy**: Extract specialized repositories or method groups

**Example for `AdminRepository.js`** (965 lines → 3 classes of ~300 lines each):

**Before** (AdminRepository.js - 965 lines):
```javascript
class AdminRepository extends BaseRepository {
  // User management (300 lines)
  async getAllUsers() { ... }
  async getUserById() { ... }
  async createUser() { ... }
  async updateUser() { ... }
  async deleteUser() { ... }

  // Role management (250 lines)
  async getAllRoles() { ... }
  async createRole() { ... }
  async updateRole() { ... }
  async deleteRole() { ... }

  // Permission management (200 lines)
  async getAllPermissions() { ... }
  async assignPermission() { ... }
  async revokePermission() { ... }

  // Facility management (215 lines)
  async getAllFacilities() { ... }
  async createFacility() { ... }
  async updateFacility() { ... }
}
```

**After** - Split into specialized repositories:

**`UserRepository.js`** (~300 lines):
```javascript
class UserRepository extends BaseRepository {
  constructor() {
    super('users', 'user_id');
  }

  async getAllUsers(page, limit, search, sortBy, sortOrder) { ... }
  async getUserById(userId) { ... }
  async getUserByEmail(email) { ... }
  async createUser(userData) { ... }
  async updateUser(userId, updates) { ... }
  async deleteUser(userId) { ... }
  async getUserRoles(userId) { ... }
  async getUserPermissions(userId) { ... }
}

module.exports = UserRepository;
```

**`RoleRepository.js`** (~250 lines):
```javascript
class RoleRepository extends BaseRepository {
  constructor() {
    super('roles', 'role_id');
  }

  async getAllRoles() { ... }
  async getRoleById(roleId) { ... }
  async createRole(roleData) { ... }
  async updateRole(roleId, updates) { ... }
  async deleteRole(roleId) { ... }
  async getRolePermissions(roleId) { ... }
  async assignPermissionToRole(roleId, permissionId) { ... }
  async revokePermissionFromRole(roleId, permissionId) { ... }
}

module.exports = RoleRepository;
```

**`FacilityRepository.js`** (~250 lines):
```javascript
class FacilityRepository extends BaseRepository {
  constructor() {
    super('facilities', 'facility_id');
  }

  async getAllFacilities(search, sortBy, sortOrder) { ... }
  async getFacilityById(facilityId) { ... }
  async createFacility(facilityData) { ... }
  async updateFacility(facilityId, updates) { ... }
  async deleteFacility(facilityId) { ... }
  async getFacilityBuildings(facilityId) { ... }
}

module.exports = FacilityRepository;
```

**Service Layer Integration**:
```javascript
// Before: AdminService used single AdminRepository
class AdminService {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async getAllUsers(...) {
    return this.adminRepository.getAllUsers(...);
  }
}

// After: AdminService uses specialized repositories
class AdminService {
  constructor(userRepository, roleRepository, facilityRepository) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.facilityRepository = facilityRepository;
  }

  async getAllUsers(...) {
    return this.userRepository.getAllUsers(...);
  }

  async getAllRoles() {
    return this.roleRepository.getAllRoles();
  }

  async getAllFacilities(...) {
    return this.facilityRepository.getAllFacilities(...);
  }
}

// Service initialization
const userRepository = new UserRepository();
const roleRepository = new RoleRepository();
const facilityRepository = new FacilityRepository();
const adminService = new AdminService(userRepository, roleRepository, facilityRepository);
```

**Benefits**:
- ✅ Single Responsibility Principle (each repository handles one entity)
- ✅ All files under 350 lines
- ✅ Clearer separation of concerns
- ✅ Easier testing (isolated repository tests)
- ✅ Better code navigation and searchability

---

### 3. Service Files (10 files, 6407 lines total)

**Files**:
- `CertificateService.js` (953 lines)
- `GaugeSetService.js` (815 lines)
- `GaugeCheckoutService.js` (738 lines)
- `GaugeCascadeService.js` (555 lines)
- `GaugeCreationService.js` (546 lines)
- `gaugeCalibrationService.js` (540 lines)
- `OperationsService.js` (529 lines)
- `adminService.js` (520 lines)
- `InventoryReportingService.js` (502 lines)
- `auditService.js` (609 lines)

**Root Cause**: Complex business logic with many methods per service

#### Recommended Refactoring: Method Extraction and Service Composition

**Strategy**: Extract complex methods into helper classes or sub-services

**Example for `CertificateService.js`** (953 lines → 1 main + 3 helpers = ~300 lines each):

**Before** (CertificateService.js - 953 lines):
```javascript
class CertificateService {
  // Certificate CRUD (200 lines)
  async createCertificate() { ... }
  async updateCertificate() { ... }
  async deleteCertificate() { ... }

  // Complex validation logic (300 lines)
  async validateCertificateData() { ... }
  async checkDuplicates() { ... }
  async validateExpiration() { ... }

  // File handling (250 lines)
  async uploadCertificateFile() { ... }
  async downloadCertificate() { ... }
  async deleteCertificateFile() { ... }

  // Notification logic (203 lines)
  async notifyExpiringCertificates() { ... }
  async sendExpirationWarnings() { ... }
}
```

**After** - Composition pattern:

**`CertificateService.js`** (~300 lines - orchestration):
```javascript
const CertificateValidator = require('./helpers/CertificateValidator');
const CertificateFileHandler = require('./helpers/CertificateFileHandler');
const CertificateNotifier = require('./helpers/CertificateNotifier');

class CertificateService {
  constructor(certificateRepository) {
    this.certificateRepository = certificateRepository;
    this.validator = new CertificateValidator(certificateRepository);
    this.fileHandler = new CertificateFileHandler();
    this.notifier = new CertificateNotifier();
  }

  async createCertificate(certificateData, file) {
    // Validate data
    await this.validator.validateCertificateData(certificateData);
    await this.validator.checkDuplicates(certificateData);

    // Handle file upload
    const fileData = await this.fileHandler.uploadCertificateFile(file);

    // Create certificate record
    const certificate = await this.certificateRepository.create({
      ...certificateData,
      ...fileData
    });

    // Schedule expiration notification
    await this.notifier.scheduleExpirationReminder(certificate);

    return certificate;
  }

  async updateCertificate(certificateId, updates, file) {
    // Validation
    const existing = await this.certificateRepository.findById(certificateId);
    await this.validator.validateCertificateData(updates);

    // Handle file if provided
    let fileData = {};
    if (file) {
      await this.fileHandler.deleteCertificateFile(existing.file_path);
      fileData = await this.fileHandler.uploadCertificateFile(file);
    }

    // Update record
    const updated = await this.certificateRepository.update(certificateId, {
      ...updates,
      ...fileData
    });

    return updated;
  }

  async deleteCertificate(certificateId) {
    const certificate = await this.certificateRepository.findById(certificateId);

    // Delete file
    await this.fileHandler.deleteCertificateFile(certificate.file_path);

    // Delete record
    await this.certificateRepository.delete(certificateId);
  }

  async checkExpiringCertificates() {
    const expiring = await this.certificateRepository.findExpiring();
    await this.notifier.notifyExpiringCertificates(expiring);
  }
}

module.exports = CertificateService;
```

**`helpers/CertificateValidator.js`** (~250 lines):
```javascript
class CertificateValidator {
  constructor(certificateRepository) {
    this.certificateRepository = certificateRepository;
  }

  async validateCertificateData(certificateData) {
    // Complex validation logic (100 lines)
    this.validateRequiredFields(certificateData);
    this.validateDateRanges(certificateData);
    this.validateCertificateType(certificateData);
  }

  async checkDuplicates(certificateData) {
    // Duplicate checking logic (80 lines)
  }

  async validateExpiration(expirationDate) {
    // Expiration validation logic (70 lines)
  }

  validateRequiredFields(data) { ... }
  validateDateRanges(data) { ... }
  validateCertificateType(data) { ... }
}

module.exports = CertificateValidator;
```

**`helpers/CertificateFileHandler.js`** (~200 lines):
```javascript
const fs = require('fs').promises;
const path = require('path');

class CertificateFileHandler {
  async uploadCertificateFile(file) {
    // File upload logic (100 lines)
    const filename = this.generateUniqueFilename(file);
    const filepath = path.join(process.env.CERT_UPLOAD_DIR, filename);
    await fs.writeFile(filepath, file.buffer);

    return {
      file_path: filepath,
      file_name: file.originalname,
      file_size: file.size
    };
  }

  async downloadCertificate(certificateId) {
    // Download logic (50 lines)
  }

  async deleteCertificateFile(filepath) {
    // Deletion logic (50 lines)
    await fs.unlink(filepath);
  }

  generateUniqueFilename(file) { ... }
}

module.exports = CertificateFileHandler;
```

**`helpers/CertificateNotifier.js`** (~200 lines):
```javascript
const NotificationService = require('../../../infrastructure/notifications/NotificationService');

class CertificateNotifier {
  constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  async scheduleExpirationReminder(certificate) {
    // Scheduling logic (80 lines)
  }

  async notifyExpiringCertificates(certificates) {
    // Notification logic (70 lines)
    for (const cert of certificates) {
      await this.sendExpirationWarning(cert);
    }
  }

  async sendExpirationWarning(certificate) {
    // Email sending logic (50 lines)
  }
}

module.exports = CertificateNotifier;
```

**Benefits**:
- ✅ Main service under 300 lines (orchestration only)
- ✅ Helper classes under 250 lines (focused responsibilities)
- ✅ Highly testable (can test each helper independently)
- ✅ Clear separation of concerns
- ✅ Reusable components (e.g., CertificateValidator can be used elsewhere)

---

### 4. Infrastructure Files (4 files, 2355 lines total)

**Files**:
- `ObservabilityManager.js` (660 lines)
- `BaseRepository.js` (637 lines)
- `HealthMonitor.js` (584 lines)
- `StructuredLogger.js` (505 lines)

**Root Cause**: Comprehensive infrastructure with many features

#### Recommended Approach: **Defer Refactoring** (Acceptable Infrastructure Complexity)

**Rationale**:

These infrastructure files provide **centralized, foundational services** that:
1. **Are already well-documented** (Observability Standards docs completed)
2. **Have clear responsibilities** (logging, monitoring, repository base)
3. **Are infrequently modified** (stable infrastructure)
4. **Have high cohesion** (all methods relate to core purpose)

**Analysis**:

**`ObservabilityManager.js`** (660 lines):
- **Purpose**: Central orchestration for metrics, tracing, logging
- **Structure**: 3 main components (business metrics, distributed tracing, logger integration)
- **Verdict**: ✅ **Acceptable** - Comprehensive infrastructure requires multiple features

**`BaseRepository.js`** (637 lines):
- **Purpose**: Base class for all repositories with CRUD, pagination, validation
- **Structure**: Core CRUD (200 lines), Pagination (100 lines), Validation (150 lines), Utilities (187 lines)
- **Verdict**: ✅ **Acceptable** - Provides complete repository abstraction

**`HealthMonitor.js`** (584 lines):
- **Purpose**: System health checks with 7 built-in monitors
- **Structure**: Core monitoring (150 lines), 7 health check types (434 lines)
- **Verdict**: ✅ **Acceptable** - Comprehensive health monitoring

**`StructuredLogger.js`** (505 lines):
- **Purpose**: Enhanced logging with correlation IDs, 6 file transports
- **Structure**: Core logging (150 lines), Transport configuration (200 lines), Utilities (155 lines)
- **Verdict**: ✅ **Acceptable** - Just over limit, comprehensive logging

**Recommendation**: **No immediate action required**

These files are:
- ✅ Well-documented
- ✅ Stable infrastructure
- ✅ High cohesion
- ✅ Clear responsibilities
- ✅ Under 700 lines (reasonable for infrastructure)

**Future Consideration**: If any of these files grow beyond 700 lines, consider refactoring at that time.

---

## Remediation Priority Matrix

### Priority 0 (Critical - Immediate Action Required)

**Target**: Complete by end of current sprint

| File | Lines | Strategy | Files Created | Estimated Effort |
|------|-------|----------|---------------|------------------|
| `gauges-v2.js` | 1087 | Route splitting | 3 route files, 3 validators, 3 handlers | 8-12 hours |
| `AdminRepository.js` | 965 | Repository splitting | UserRepo, RoleRepo, FacilityRepo | 6-8 hours |
| `CertificateService.js` | 953 | Service composition | 1 service + 3 helpers | 6-8 hours |

**Total P0 Effort**: **20-28 hours** (2.5-3.5 developer days)

### Priority 1 (High - Next Sprint)

**Target**: Complete within 2 sprints

| File | Lines | Strategy | Estimated Effort |
|------|-------|----------|------------------|
| `GaugeSetService.js` | 815 | Service composition | 5-6 hours |
| `GaugeCheckoutService.js` | 738 | Service composition | 4-5 hours |

**Total P1 Effort**: **9-11 hours** (1-1.5 developer days)

### Priority 2 (Medium - Planned Refactoring)

**Target**: Complete within 3 months

| File | Lines | Strategy | Estimated Effort |
|------|-------|----------|------------------|
| `permissions.js` | 655 | Route splitting | 3-4 hours |
| `auditService.js` | 609 | Service composition | 3-4 hours |
| `GaugeCascadeService.js` | 555 | Service composition | 2-3 hours |
| `GaugeCreationService.js` | 546 | Service composition | 2-3 hours |

**Total P2 Effort**: **10-14 hours** (1.5-2 developer days)

### Priority 3 (Low - Opportunistic Refactoring)

**Target**: Refactor when modifying for other reasons

| File | Lines | Strategy | Estimated Effort |
|------|-------|----------|------------------|
| `gaugeCalibrationService.js` | 540 | Service composition | 2-3 hours |
| `admin.js` | 536 | Route splitting | 2-3 hours |
| `OperationsService.js` | 529 | Service composition | 2-3 hours |
| `AuthRepository.js` | 529 | Repository splitting | 2-3 hours |
| `adminService.js` | 520 | Service composition | 2-3 hours |
| `InventoryReportingService.js` | 502 | Service composition | 2-3 hours |

**Total P3 Effort**: **12-18 hours** (1.5-2.5 developer days)

---

## Refactoring Checklist

Use this checklist when refactoring oversized files:

### Pre-Refactoring

- [ ] **Read existing code** - Understand current structure and dependencies
- [ ] **Identify logical boundaries** - Determine how to split (by function, resource, domain)
- [ ] **Check test coverage** - Ensure tests exist before refactoring
- [ ] **Document current behavior** - Note any quirks or edge cases
- [ ] **Create refactoring branch** - Use descriptive branch name (e.g., `refactor/split-gauges-v2-routes`)

### During Refactoring

- [ ] **Create new file structure** - Set up new files with proper naming
- [ ] **Extract code incrementally** - Move one logical section at a time
- [ ] **Maintain functionality** - Ensure each step keeps system working
- [ ] **Update imports/exports** - Fix all references to moved code
- [ ] **Preserve comments** - Move relevant documentation with code
- [ ] **Run tests frequently** - Verify nothing breaks after each move

### Post-Refactoring

- [ ] **Verify all tests pass** - Run full test suite
- [ ] **Check file sizes** - Confirm all new files are under 500 lines (ideally under 300)
- [ ] **Update documentation** - Fix any references to old file structure
- [ ] **Code review** - Get peer review before merging
- [ ] **Update this document** - Remove file from violation list
- [ ] **Deploy carefully** - Monitor for issues after deployment

---

## Testing Strategy

### Pre-Refactoring Tests

**Step 1**: Verify existing tests pass

```bash
# Run tests for module being refactored
npm test -- tests/modules/gauge/

# Verify integration tests pass
npm test -- tests/integration/

# Check coverage
npm test -- --coverage
```

**Step 2**: Add missing tests if coverage is low (<80%)

### During Refactoring

**Option 1**: Keep tests unchanged (test through public API)
- ✅ Fastest approach
- ✅ Tests verify behavior preserved
- ⚠️ May not catch internal regressions

**Option 2**: Update tests to match new structure
- ✅ Better test organization
- ✅ Easier to debug failures
- ⚠️ More work

### Post-Refactoring Tests

**Step 1**: Verify all existing tests still pass

```bash
npm test
```

**Step 2**: Add tests for new file structure (if using Option 2)

```bash
# Example: New route file tests
tests/modules/gauge/routes/gauge-sets.routes.test.js
tests/modules/gauge/validators/gauge-set.validators.test.js
tests/modules/gauge/handlers/gauge-set.handlers.test.js
```

---

## Migration Guide

### Example: Refactoring `gauges-v2.js`

**Step-by-Step Process**:

#### Step 1: Create New File Structure

```bash
cd backend/src/modules/gauge
mkdir -p routes validators handlers

# Create new files
touch routes/gauge-sets.routes.js
touch routes/gauge-categories.routes.js
touch routes/gauge-spares.routes.js
touch validators/gauge-set.validators.js
touch validators/gauge-category.validators.js
touch validators/gauge-spare.validators.js
touch handlers/gauge-set.handlers.js
touch handlers/gauge-category.handlers.js
touch handlers/gauge-spare.handlers.js
```

#### Step 2: Extract Validators

Move validation arrays from `gauges-v2.js` to `validators/gauge-set.validators.js`:

```javascript
// validators/gauge-set.validators.js
const { body } = require('express-validator');

module.exports = {
  createSet: [
    body('goGauge.equipment_type').equals('thread_gauge'),
    body('goGauge.category_id').isInt({ min: 1 }),
    // ... more validators
  ],

  pairSpares: [
    body('goGaugeId').isInt({ min: 1 }),
    body('noGoGaugeId').isInt({ min: 1 }),
    // ... more validators
  ],

  unpair: [
    body('gaugeId').isInt({ min: 1 }),
    // ... more validators
  ]
};
```

#### Step 3: Extract Route Handlers

Move handler logic from `gauges-v2.js` to `handlers/gauge-set.handlers.js`:

```javascript
// handlers/gauge-set.handlers.js
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');

module.exports = {
  async createSet(req, res) {
    const { goGauge, noGoGauge } = req.body;
    const createdByUserId = req.user.id;

    const gaugeCreationService = serviceRegistry.get('GaugeCreationService');
    const result = await gaugeCreationService.createGaugeSet(
      goGauge,
      noGoGauge,
      createdByUserId
    );

    logger.info('Gauge set created', { setId: result.setId });

    res.status(201).json({
      success: true,
      message: 'Gauge set created successfully',
      data: result
    });
  },

  async pairSpares(req, res) {
    // Handler logic...
  },

  async unpair(req, res) {
    // Handler logic...
  }
};
```

#### Step 4: Create New Route Files

Create clean route files:

```javascript
// routes/gauge-sets.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireOperator } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const validators = require('../validators/gauge-set.validators');
const handlers = require('../handlers/gauge-set.handlers');

router.post('/create-set',
  authenticateToken,
  requireOperator,
  validators.createSet,
  asyncErrorHandler(handlers.createSet)
);

router.post('/pair-spares',
  authenticateToken,
  requireOperator,
  validators.pairSpares,
  asyncErrorHandler(handlers.pairSpares)
);

router.post('/unpair',
  authenticateToken,
  requireOperator,
  validators.unpair,
  asyncErrorHandler(handlers.unpair)
);

module.exports = router;
```

#### Step 5: Update Module Router

Update main module router to mount new route files:

```javascript
// modules/gauge/routes/index.js (main router)
const express = require('express');
const router = express.Router();

const gaugeSetRoutes = require('./gauge-sets.routes');
const gaugeCategoryRoutes = require('./gauge-categories.routes');
const gaugeSpareRoutes = require('./gauge-spares.routes');

// Mount routes
router.use('/', gaugeSetRoutes);
router.use('/', gaugeCategoryRoutes);
router.use('/', gaugeSpareRoutes);

module.exports = router;
```

#### Step 6: Run Tests

```bash
# Run tests
npm test -- tests/modules/gauge/

# Verify all tests pass
# If failures, debug and fix
```

#### Step 7: Delete Old File

```bash
# Only after tests pass
rm routes/gauges-v2.js
```

#### Step 8: Update Documentation

Update any documentation referencing the old file structure.

---

## Monitoring and Prevention

### Pre-Commit Hooks

Add file size check to pre-commit hooks:

```javascript
// .husky/pre-commit or hooks/pre-commit.js
const fs = require('fs');
const path = require('path');

function checkFileSize(filePath, maxLines = 500) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;

  if (lines > maxLines) {
    console.error(`❌ File size violation: ${filePath} has ${lines} lines (max: ${maxLines})`);
    return false;
  }

  return true;
}

// Check all modified .js files
const modifiedFiles = process.argv.slice(2);
let hasViolations = false;

for (const file of modifiedFiles) {
  if (file.endsWith('.js') && !checkFileSize(file)) {
    hasViolations = true;
  }
}

if (hasViolations) {
  console.error('\\n⚠️  Pre-commit check failed: File size violations detected');
  console.error('Please refactor files exceeding 500 lines before committing.\\n');
  process.exit(1);
}
```

### CI/CD Integration

Add file size check to CI pipeline:

```yaml
# .github/workflows/code-quality.yml
name: Code Quality Checks

on: [push, pull_request]

jobs:
  file-size-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check file sizes
        run: |
          find backend/src -name "*.js" -type f -exec sh -c '
            lines=$(wc -l < "$1")
            if [ "$lines" -gt 500 ]; then
              echo "❌ File size violation: $1 has $lines lines (max: 500)"
              exit 1
            fi
          ' _ {} \\;
```

### Regular Audits

**Monthly Review**:
```bash
# Generate file size report
cd backend/src
find . -name "*.js" -type f -exec sh -c 'lines=$(wc -l < "$1"); echo "$lines: $1"' _ {} \; | sort -rn | head -20
```

**Quarterly Refactoring**:
- Review top 20 largest files
- Prioritize refactoring for files >400 lines
- Update this document with progress

---

## Success Metrics

### Completion Criteria

**Phase 1 (P0 - Critical)**: **COMPLETE when 3 critical files refactored**
- ✅ `gauges-v2.js` reduced from 1087 → <400 lines (3 files)
- ✅ `AdminRepository.js` reduced from 965 → <350 lines (3 repos)
- ✅ `CertificateService.js` reduced from 953 → <300 lines (1+3 files)

**Phase 2 (P1 - High)**: **COMPLETE when 5 high-priority files refactored**

**Phase 3 (P2 - Medium)**: **COMPLETE when 9 medium-priority files refactored**

**Phase 4 (P3 - Low)**: **COMPLETE when all 19 violations resolved**

### Target Metrics

**Before Refactoring**:
- Files >500 lines: **19 files** (⚠️ VIOLATION)
- Average file size (top 19): **634 lines**
- Largest file: **1087 lines** (⚠️ CRITICAL)

**After Refactoring** (Target):
- Files >500 lines: **0 files** (✅ COMPLIANT)
- Average file size (all): **<300 lines** (✅ IDEAL)
- Largest file: **<450 lines** (✅ GOOD)

---

## Related Documentation

- [Backend Standards](./README.md)
- [Repository Pattern](./03-Repository-Pattern.md)
- [Service Layer Standards](./02-Service-Layer.md)
- [API Route Standards](../04-API-Standards/README.md)

---

**Last Updated**: 2025-11-07
**Status**: ⚠️ **19 ACTIVE VIOLATIONS** - Remediation in progress
**Next Review**: 2025-11-14 (weekly tracking)
