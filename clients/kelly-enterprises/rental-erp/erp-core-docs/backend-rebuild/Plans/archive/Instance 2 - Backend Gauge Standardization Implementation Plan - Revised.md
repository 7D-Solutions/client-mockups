# Instance 2 - Backend Gauge Standardization Implementation Plan (Revised)

**Document Type**: Implementation Plan  
**Focus Area**: Backend Services and API Implementation for Gauge Standardization v2.0  
**Environment**: Development (No production impact)  
**Created**: Instance 2 Analysis  
**Revised**: After Database Plan Review

## 🚨 CRITICAL CLAUDE CODE INSTRUCTIONS

### MANDATORY Execution Commands
```bash
# Overall implementation command
/implement --persona-backend --persona-architect --think-hard --validate --safe-mode --loop --uc

# Phase-specific commands
/implement --persona-backend --validate "service implementation with test coverage"
/implement --persona-qa --validate --loop "comprehensive testing and validation"
```

### Implementation Personas & Flags
```yaml
primary_personas:
  - backend     # Service implementation
  - architect   # System design decisions
  - qa         # Testing and validation

critical_flags:
  - --think-hard   # Complex service interactions
  - --validate     # All changes must be tested
  - --safe-mode    # Database operations
  - --loop        # Iterative improvements
  - --uc          # Efficient implementation

approach: |
  1. Database phases already complete (per Database_Plan_Final.md)
  2. Focus on service layer implementation
  3. Test-driven development for all services
  4. Maintain audit trail for all operations
```

## Executive Summary

This revised plan focuses on backend service and API implementation, as the database schema standardization has already been completed according to Database_Plan_Final.md. The implementation will build upon the standardized database structure to deliver full Gauge Standardization v2.0 compliance.

## Critical Context

1. **Database Already Standardized** - All 4 phases from Database_Plan_Final.md complete
2. **Focus on Services** - Build service layer on standardized database
3. **Development Mode** - No production systems at risk
4. **Test-Driven** - All services require comprehensive testing

## Current State Assessment

### ✅ Database Implementation (COMPLETE)
- Phase 1: Clean slate preparation executed
- Phase 2: Schema standardization with `standardized_name` field
- Phase 3: Categories populated with equipment_type mapping
- Phase 4: Constraints and validation rules applied
- Conflict-free prefix system: SP/SR, MP/MR, NPT, AC/AR, etc.

### ❌ Service Layer Gaps
- No companion gauge pairing service
- No category-driven workflow service
- No spare management with visibility rules
- GaugeIdService needs enhancement for gauge_id_config integration
- No admin configuration service

### ❌ API Layer Gaps
- No category workflow endpoints
- No companion management endpoints
- No spare visibility endpoints
- No admin configuration endpoints

## Implementation Phases

### Phase 1: Core Service Implementation

```yaml
claude_command: |
  /implement --persona-backend --think-hard --validate "core gauge services"
```

#### 1.1 Enhanced GaugeIdService

**File**: `/backend/src/modules/gauge/services/GaugeIdService.js`

**Enhancements Required**:
```javascript
class GaugeIdService extends BaseService {
  // EXISTING: Basic ID generation
  
  // NEW: Integration with gauge_id_config table
  async generateSystemIdFromConfig(categoryId, gaugeType = null) {
    // Query gauge_id_config for prefix and sequence
    // Handle atomic sequence increment
    // Generate ID with proper format
  }
  
  // NEW: Custom ID pattern support
  async generateCustomId(pattern, tokens) {
    // Support patterns like [SP]-[YYYY]-[###]
    // Token replacement logic
  }
  
  // NEW: Bulk ID generation for sets
  async generateCompanionIds(categoryId, threadType) {
    // Generate both GO (A) and NO GO (B) IDs
    // Ensure atomicity for pair generation
  }
  
  // ENHANCE: Standardized name generation
  generateStandardizedName(gaugeData) {
    // Decimal format enforcement (.500-20)
    // Equipment-specific formatting rules
    // GO/NO GO suffix handling
  }
}
```

#### 1.2 CompanionGaugeService (NEW)

**File**: `/backend/src/modules/gauge/services/CompanionGaugeService.js`

```javascript
class CompanionGaugeService extends BaseService {
  constructor(gaugeRepository, auditService) {
    super();
    this.gaugeRepository = gaugeRepository;
    this.auditService = auditService;
  }
  
  // Create companion pair for thread gauges
  async createCompanionPair(gaugeData, userId) {
    // Validate thread gauge type (not NPT)
    // Generate paired IDs (SP0001A, SP0001B)
    // Create both gauges in transaction
    // Link via companion_gauge_id
    // Audit the pairing
  }
  
  // Link existing spares as companions
  async linkCompanions(goGaugeId, noGoGaugeId, userId) {
    // Validate both gauges exist and are spares
    // Verify matching specifications
    // Update companion_gauge_id bidirectionally
    // Update is_spare = false
    // Audit the linking
  }
  
  // Unlink companion gauges
  async unlinkCompanions(gaugeId, userId, reason) {
    // Get both gauges
    // Clear companion_gauge_id
    // Mark as spares if appropriate
    // Create audit trail with reason
  }
  
  // Get companion for a gauge
  async getCompanion(gaugeId) {
    // Query by companion_gauge_id
    // Include full gauge details
    // Handle orphaned gauges
  }
  
  // Validate pairing rules
  async validateCompanionPairing(gauge1, gauge2) {
    // Same thread specifications
    // One GO, one NO GO
    // Not NPT gauges
    // Same seal status preferred
  }
}
```

#### 1.3 CategoryWorkflowService (NEW)

**File**: `/backend/src/modules/gauge/services/CategoryWorkflowService.js`

```javascript
class CategoryWorkflowService extends BaseService {
  constructor(categoryRepository) {
    super();
    this.categoryRepository = categoryRepository;
  }
  
  // Get categories for equipment type
  async getCategoriesByEquipmentType(equipmentType) {
    // Query gauge_categories by equipment_type
    // Include prefix configuration
    // Order by display_order
  }
  
  // Generate dynamic form schema
  async getFormSchema(categoryId) {
    // Get category details
    // Build schema based on equipment_type
    // Include validation rules
    // Return JSON schema format
  }
  
  // Validate category-specific data
  async validateCategoryData(categoryId, formData) {
    // Apply category-specific rules
    // Thread gauge decimal format
    // Hand tool range validation
    // Return validation errors
  }
  
  // Transform to specifications
  async transformToSpecifications(categoryId, formData) {
    // Map form fields to spec table columns
    // Handle equipment-specific transformations
    // Prepare for database insertion
  }
}
```

#### 1.4 SpareManagementService (NEW)

**File**: `/backend/src/modules/gauge/services/SpareManagementService.js`

```javascript
class SpareManagementService extends BaseService {
  constructor(gaugeRepository, authService) {
    super();
    this.gaugeRepository = gaugeRepository;
    this.authService = authService;
  }
  
  // Apply visibility rules
  async getVisibleGauges(userId, role, filters) {
    // Regular users: complete sets only
    // QC+: all including spares
    // Apply role-based filtering
    // Include companion information
  }
  
  // Find matching spare gauges
  async getAvailableSpares(specifications, sealStatus = null) {
    // Query spares by specifications
    // Prefer matching seal status
    // Group by GO/NO GO type
    // Return pairing options
  }
  
  // Create set from existing spares
  async createSetFromSpares(goSpareId, noGoSpareId, setId, userId) {
    // Validate both are spares
    // Assign new gauge IDs
    // Link as companions
    // Update spare status
    // Create audit trail
  }
  
  // Mark gauge as spare
  async markAsSpare(gaugeId, reason, userId) {
    // Validate gauge can be spare
    // Clear gauge assignments
    // Update is_spare flag
    // Audit with reason
  }
}
```

**Validation & Testing**:
```bash
# Unit tests for each service
npm test -- --testPathPattern="services.*test.js"

# Integration tests
npm test -- --testPathPattern="integration.*test.js"
```

---

### Phase 2: Repository Layer Enhancements

```yaml
claude_command: |
  /implement --persona-backend --validate "repository pattern enhancements"
```

#### 2.1 GaugeRepository Enhancements

**File**: `/backend/src/modules/gauge/repositories/GaugeRepository.js`

**New Methods**:
```javascript
// Get gauges by companion
async getGaugesByCompanion(companionId, conn) {
  // Find gauges where companion_gauge_id = companionId
}

// Get spare gauges with filters
async getSpareGauges(filters = {}, conn) {
  // Query where is_spare = 1
  // Apply equipment_type, specifications filters
  // Include seal status
}

// Get complete gauge sets
async getCompleteSets(filters = {}, conn) {
  // Query gauges with companions
  // Exclude orphaned gauges
  // Apply visibility rules
}

// Update companion links atomically
async updateCompanionLinks(gaugeId, companionId, conn) {
  // Update both gauges in transaction
  // Maintain bidirectional relationship
}

// Bulk create for sets
async bulkCreateGauges(gaugesData, conn) {
  // Insert multiple gauges
  // Handle companion linking
  // Return all created IDs
}
```

#### 2.2 CategoryRepository (NEW)

**File**: `/backend/src/modules/gauge/repositories/CategoryRepository.js`

```javascript
class CategoryRepository extends BaseRepository {
  constructor() {
    super('gauge_categories', 'id');
  }
  
  async getCategoriesByEquipmentType(equipmentType, conn) {
    // Query with equipment_type filter
    // Join with gauge_id_config for prefixes
    // Order by display_order
  }
  
  async getCategoryWithPrefix(categoryId, conn) {
    // Get category with all prefix configs
    // Include gauge_type variations
  }
  
  async updateNextNumber(categoryId, nextNumber, conn) {
    // Atomic update of sequence number
    // Used by ID generation
  }
}
```

#### 2.3 ConfigurationRepository (NEW)

**File**: `/backend/src/modules/gauge/repositories/ConfigurationRepository.js`

```javascript
class ConfigurationRepository extends BaseRepository {
  constructor() {
    super('gauge_system_config', 'id');
  }
  
  async getConfig(key, conn) {
    // Get single configuration value
    // Parse based on config_type
  }
  
  async setConfig(key, value, conn) {
    // Update configuration
    // Validate against locked flag
  }
  
  async getIdPatterns(conn) {
    // Get all ID generation patterns
    // From gauge_id_config
  }
  
  async updateIdPattern(categoryId, pattern, conn) {
    // Update pattern for category
    // Validate pattern format
  }
}
```

---

### Phase 3: API Layer Implementation

```yaml
claude_command: |
  /implement --persona-backend --persona-architect --validate "RESTful API endpoints"
```

#### 3.1 Category Workflow Routes

**File**: `/backend/src/modules/gauge/routes/gauge-categories.js`

```javascript
// GET categories by equipment type
router.get('/by-equipment-type/:equipmentType', 
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { equipmentType } = req.params;
    const categories = await categoryWorkflowService
      .getCategoriesByEquipmentType(equipmentType);
    res.json({ success: true, categories });
  })
);

// GET form schema for category
router.get('/:categoryId/form-schema',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { categoryId } = req.params;
    const schema = await categoryWorkflowService
      .getFormSchema(categoryId);
    res.json({ success: true, schema });
  })
);

// POST validate category data
router.post('/:categoryId/validate',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { categoryId } = req.params;
    const validation = await categoryWorkflowService
      .validateCategoryData(categoryId, req.body);
    res.json({ success: validation.valid, errors: validation.errors });
  })
);
```

#### 3.2 Companion Management Routes

**File**: `/backend/src/modules/gauge/routes/gauge-companions.js`

```javascript
// POST create companion for gauge
router.post('/:id/companions',
  authenticateToken,
  requireQCRole,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const companion = await companionGaugeService
      .createCompanionPair({ gaugeId: id, ...req.body }, req.user.id);
    res.json({ success: true, companion });
  })
);

// DELETE unlink companions
router.delete('/:id/companions',
  authenticateToken,
  requireQCRole,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    await companionGaugeService.unlinkCompanions(id, req.user.id, reason);
    res.json({ success: true, message: 'Companions unlinked' });
  })
);

// GET companion for gauge
router.get('/:id/companion',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const companion = await companionGaugeService.getCompanion(id);
    res.json({ success: true, companion });
  })
);

// POST create set from new gauges
router.post('/create-set',
  authenticateToken,
  requireQCRole,
  asyncErrorHandler(async (req, res) => {
    const set = await companionGaugeService
      .createCompanionPair(req.body, req.user.id);
    res.json({ success: true, set });
  })
);
```

#### 3.3 Spare Management Routes

**File**: `/backend/src/modules/gauge/routes/gauge-spares.js`

```javascript
// GET available spares
router.get('/spares',
  authenticateToken,
  requireQCRole,
  asyncErrorHandler(async (req, res) => {
    const spares = await spareManagementService
      .getAvailableSpares(req.query);
    res.json({ success: true, spares });
  })
);

// POST mark gauge as spare
router.post('/:id/mark-as-spare',
  authenticateToken,
  requireQCRole,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    await spareManagementService.markAsSpare(id, reason, req.user.id);
    res.json({ success: true, message: 'Marked as spare' });
  })
);

// POST create set from spares
router.post('/spares/create-set',
  authenticateToken,
  requireQCRole,
  asyncErrorHandler(async (req, res) => {
    const { goSpareId, noGoSpareId, setId } = req.body;
    const set = await spareManagementService
      .createSetFromSpares(goSpareId, noGoSpareId, setId, req.user.id);
    res.json({ success: true, set });
  })
);
```

#### 3.4 Configuration Routes

**File**: `/backend/src/modules/admin/routes/gauge-config.js`

```javascript
// GET configuration values
router.get('/gauge-config',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const config = await configurationService.getAllConfig();
    res.json({ success: true, config });
  })
);

// PUT update configuration
router.put('/gauge-config/:key',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    await configurationService.updateConfig(key, value);
    res.json({ success: true, message: 'Configuration updated' });
  })
);

// GET ID patterns
router.get('/gauge-config/id-patterns',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const patterns = await configurationService.getIdPatterns();
    res.json({ success: true, patterns });
  })
);

// POST new ID pattern
router.post('/gauge-config/id-patterns',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const pattern = await configurationService.createIdPattern(req.body);
    res.json({ success: true, pattern });
  })
);
```

---

### Phase 4: Business Logic Integration

```yaml
claude_command: |
  /implement --persona-backend --think-hard "complex business rules and workflows"
```

#### 4.1 Companion Gauge Rules Engine

**File**: `/backend/src/modules/gauge/rules/CompanionRules.js`

```javascript
class CompanionRules {
  // NPT gauges cannot have companions
  static canHaveCompanion(gaugeData) {
    return gaugeData.equipment_type === 'thread_gauge' 
      && gaugeData.spec?.thread_type !== 'npt';
  }
  
  // Validate companion specifications match
  static validateCompanionSpecs(gauge1, gauge2) {
    // Same thread size, form, class
    // One GO, one NO GO
    // Same manufacturer preferred
  }
  
  // Set operations affect both gauges
  static applySetOperation(operation, gaugeIds) {
    // Checkout both or neither
    // Same calibration schedule
    // Synchronized status updates
  }
}
```

#### 4.2 Visibility Rules Engine

**File**: `/backend/src/modules/gauge/rules/VisibilityRules.js`

```javascript
class VisibilityRules {
  static applyUserVisibility(gauges, userRole) {
    if (userRole === 'user' || userRole === 'operator') {
      // Filter to complete sets only
      return gauges.filter(g => 
        !g.is_spare && 
        (!this.requiresCompanion(g) || g.companion_gauge_id)
      );
    }
    // QC+ see everything
    return gauges;
  }
  
  static requiresCompanion(gauge) {
    return gauge.equipment_type === 'thread_gauge' 
      && gauge.spec?.thread_type !== 'npt';
  }
}
```

#### 4.3 Calibration Clock Rules

**File**: `/backend/src/modules/gauge/rules/CalibrationRules.js`

```javascript
class CalibrationRules {
  static calculateDueDate(gauge) {
    if (gauge.is_sealed) {
      // Clock starts from unseal date
      if (!gauge.unseal_date) return null;
      return addDays(gauge.unseal_date, gauge.calibration_frequency);
    }
    // Clock starts from last calibration
    return addDays(gauge.last_calibration_date, gauge.calibration_frequency);
  }
  
  static syncCompanionCalibration(gauge1, gauge2) {
    // Companions can have different due dates
    // But should be scheduled together when possible
  }
}
```

---

### Phase 5: Testing & Validation

```yaml
claude_command: |
  /implement --persona-qa --validate --loop "comprehensive test coverage"
```

#### 5.1 Unit Tests

**Test Structure**:
```
backend/tests/unit/modules/gauge/
  ├── services/
  │   ├── CompanionGaugeService.test.js
  │   ├── CategoryWorkflowService.test.js
  │   ├── SpareManagementService.test.js
  │   └── GaugeIdService.enhanced.test.js
  ├── rules/
  │   ├── CompanionRules.test.js
  │   ├── VisibilityRules.test.js
  │   └── CalibrationRules.test.js
  └── repositories/
      ├── CategoryRepository.test.js
      └── ConfigurationRepository.test.js
```

#### 5.2 Integration Tests

**Test Categories**:
```javascript
// Category workflow integration
describe('Category-Driven Workflow', () => {
  test('Equipment type → Category → Form → Creation');
  test('Dynamic form validation');
  test('Standardized name generation');
});

// Companion gauge integration
describe('Companion Gauge Management', () => {
  test('Create GO/NO GO pair');
  test('Link existing spares');
  test('Unlink with audit trail');
  test('NPT single gauge validation');
});

// Spare visibility integration
describe('Spare Management & Visibility', () => {
  test('User sees complete sets only');
  test('QC sees all gauges');
  test('Create set from spares');
});
```

#### 5.3 Performance Tests

```javascript
// Bulk operations
describe('Performance Benchmarks', () => {
  test('Generate 1000 IDs < 5s');
  test('Search 10000 gauges < 500ms');
  test('Bulk create 100 gauge sets < 10s');
});
```

#### 5.4 Acceptance Tests

**Specification Compliance**:
- [ ] All equipment types supported
- [ ] Category-driven workflow functional
- [ ] Standardized naming (decimal format)
- [ ] Companion pairing for thread gauges
- [ ] NPT single gauge handling
- [ ] Spare visibility rules enforced
- [ ] Admin configuration working

---

## Rollback Strategies

### Service Rollback Plan

1. **Service Version Control**:
   - Tag each service version
   - Maintain previous version branches
   - Quick revert via Git

2. **Feature Flags**:
   ```javascript
   // config/features.js
   module.exports = {
     companionGauges: process.env.ENABLE_COMPANION || false,
     categoryWorkflow: process.env.ENABLE_CATEGORY_WORKFLOW || false,
     spareManagement: process.env.ENABLE_SPARE_MGMT || false
   };
   ```

3. **Database Rollback**:
   - Already handled by Database_Plan_Final.md
   - Service layer doesn't modify schema

### Risk Mitigation

1. **Gradual Rollout**:
   - Enable features one at a time
   - Monitor error rates
   - Quick disable if issues

2. **Comprehensive Logging**:
   - All service operations logged
   - Audit trail maintained
   - Performance metrics tracked

3. **Backward Compatibility**:
   - Maintain old endpoints during transition
   - Gradual migration path
   - Clear deprecation warnings

## Success Metrics

### Functional Success
- [ ] Category workflow: Equipment → Category → Form → Creation
- [ ] Companion pairing: GO/NO GO sets created and managed
- [ ] Spare visibility: Role-based filtering working
- [ ] Standardized names: All gauges use decimal format
- [ ] Admin config: ID patterns and settings manageable

### Performance Success
- [ ] ID generation: < 100ms per ID
- [ ] Search operations: < 500ms for 10K records
- [ ] Bulk creation: < 50ms per gauge
- [ ] API response: < 200ms average

### Quality Success
- [ ] Test coverage: > 95% for new services
- [ ] Zero data integrity issues
- [ ] All validations passing
- [ ] Audit trail complete

## Post-Implementation

1. **Documentation Updates**:
   - API documentation
   - Service architecture diagrams
   - Admin user guides

2. **Monitoring Setup**:
   - Service health checks
   - Performance dashboards
   - Error tracking

3. **Training Materials**:
   - Category workflow guide
   - Companion management guide
   - Admin configuration guide

## Implementation Notes

### Critical Success Factors
- **Database Ready**: All schema changes complete per Database_Plan_Final.md
- **Service Focus**: Build on standardized database structure
- **Test Coverage**: Every service method must be tested
- **Audit Everything**: Complete trail for compliance

### Key Dependencies
- Database migrations executed successfully
- Docker environment stable
- Test data available for validation
- Frontend team ready for integration

### Remember
- This is development environment - be thorough but fearless
- Database schema is finalized - focus on service layer
- Use existing patterns from codebase
- Maintain backward compatibility where possible

---

**END OF REVISED IMPLEMENTATION PLAN**

*Ready for Backend Service Implementation*
*Database Foundation Already in Place*