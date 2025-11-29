# Instance 1 - Backend Gauge Standardization Implementation Plan

**Author**: Instance 1 (Backend Specialist)  
**Date**: 2025-09-17  
**Focus**: Backend API Implementation (Database Already Complete)  
**Specification**: Gauge_Standardization_v2.0.md

## Claude Implementation Instructions

### Master Command for Full Implementation
```bash
/implement --persona-backend --persona-architect --think-hard --validate --safe-mode --loop --uc
```

### Critical Claude Context
- **Always use** `--validate` flag for safety checks
- **Always use** `--safe-mode` for production-grade code
- **Use** `--loop` for iterative improvement
- **Use** `--uc` for efficient token usage
- **Think Mode**: Use `--think-hard` for complex logic

## Executive Summary

This implementation plan focuses on the backend API changes needed to support the Gauge Standardization v2.0 specification. The database schema has already been implemented per Database_Plan_Final.md, so this plan covers the remaining service, repository, and API endpoint work needed.

## Current State Analysis

### Existing Architecture
- **Database**: MySQL on port 3307 (external, non-containerized)
- **API**: Express.js with modular architecture at `/backend/src/modules/gauge/`
- **Tables**: Main `gauges` table with separate specification tables per equipment type
- **Services**: Specialized services for CRUD, tracking, calibration, search

### Key Strengths
1. Modular architecture with clear separation of concerns
2. Repository pattern already implemented
3. Equipment type categorization exists
4. ID generation service present (GaugeIdService)
5. Specification tables for different equipment types

### Critical Gaps Identified

#### 1. ID Structure & Naming
- **Current**: Uses `gauge_categories.prefix` but lacks full v2.0 ID patterns
- **Missing**: 
  - Proper suffix handling (A/B for GO/NO GO)
  - Sequential numbering that never resets
  - Admin-configurable ID patterns with tokens
  - NPT special case handling (no A/B suffix)

#### 2. Category System
- **Current**: Basic categories in `gauge_categories` table
- **Missing**:
  - Category-driven workflow implementation
  - Dynamic form generation based on category selection
  - Category confirmation process

#### 3. Data Model
- **Current**: Has equipment_type and basic fields
- **Missing**:
  - `standardized_name` vs `name` separation
  - `system_gauge_id` field (exists but not utilized properly)
  - Companion gauge pairing logic
  - Spare gauge management fields

#### 4. Thread Gauge Specifications
- **Current**: Basic thread specification table
- **Missing**:
  - Decimal format standardization (.500 instead of 1/2)
  - Thread type categorization (Standard, Metric, ACME, etc.)
  - Multi-start support for ACME threads
  - Left-hand thread indicator

#### 5. Calibration & Seal Management
- **Current**: Basic calibration tracking
- **Missing**:
  - Seal status workflow (sealed → unsealed clock start)
  - Calibration certificate tracking by serial number
  - Dynamic field requirements based on seal status

#### 6. Search & Display
- **Current**: Basic search functionality
- **Missing**:
  - Smart search across multiple fields
  - Set-based display (GO/NO GO pairs)
  - Role-based visibility (spares hidden from regular users)

## Database Implementation Status

✅ **COMPLETED**: The database schema has been fully implemented per Database_Plan_Final.md:
- Clean slate approach with test data removed
- `standardized_name` field added to gauges table
- `system_gauge_id` made NOT NULL
- `equipment_type` added to gauge_categories
- All 21 categories with proper prefix configurations
- Specification compliance constraints added
- Conflict-free prefix mapping (SPL for Surface Plate, MRS for Master Ring)

## Remaining Backend Implementation Phases

### Phase 1: ID Generation Service Enhancement (High Priority)

#### Claude Command
```bash
/implement --persona-backend --persona-architect --validate --safe-mode "enhance GaugeIdService for v2.0 ID generation"
```

#### Key Instructions for Claude
- **USE** existing `gauge_id_config` table for prefix lookups
- **IMPLEMENT** atomic sequence increment with retry logic
- **HANDLE** NPT special case (no suffix)
- **GENERATE** standardized names following decimal format (.500-20)
- **VALIDATE** all ID generation against specification rules

**Risk Level**: Medium  
**Rollback**: Feature flag to use old generation

#### Tasks:
1. Update GaugeIdService to use new schema:
   - Use gauge_id_config table with proper prefixes
   - Implement suffix handling (A/B for GO/NO GO)
   - NPT special case (no suffix)
   - Atomic sequence increment with retry logic
   - Generate standardized names based on specifications

2. Create validation utilities:
   - Validate gauge type matches category
   - Ensure proper suffix for thread gauges
   - Verify NPT has no companion
   - Check decimal format compliance

3. Update existing services:
   - Modify gaugeService.js to use new ID generation
   - Update repository layer for new fields
   - Add standardized_name generation logic

### Phase 2: Category-Driven Workflow API (High Priority)

#### Claude Command
```bash
/implement --persona-backend --validate --loop "create category-driven workflow API endpoints"
```

#### Key Instructions for Claude
- **CREATE** new v2 routes file: `routes/gauges-v2.js`
- **USE** existing `gauge_categories` table with equipment_type mapping
- **IMPLEMENT** dynamic form configuration based on category
- **VALIDATE** equipment type + category + gauge type combinations
- **ENSURE** backward compatibility with v1 endpoints

**Risk Level**: Low  
**Rollback**: Keep v1 endpoints active

#### Tasks:
1. Create new API endpoints:
   ```javascript
   // GET /api/gauges/v2/equipment-types
   // Returns: thread_gauge, hand_tool, large_equipment, calibration_standard
   
   // GET /api/gauges/v2/categories/:equipmentType
   // Returns categories with prefixes and metadata
   
   // POST /api/gauges/v2/validate-selection
   // Validates equipment type + category + gauge type combination
   
   // GET /api/gauges/v2/form-config
   // Returns dynamic form fields based on selection
   ```

2. Implement form configuration service:
   - Dynamic field requirements by category
   - Seal status conditional logic
   - Thread type specific validations
   - Decimal format enforcement

3. Create workflow validation:
   - Confirm valid category selection
   - Verify gauge type matches category
   - Check companion requirements

### Phase 3: Standardized Naming & Enhanced Search (Medium Priority)

#### Claude Command
```bash
/implement --persona-backend --persona-analyzer --validate "enhance search with standardized naming"
```

#### Key Instructions for Claude
- **USE** `standardized_name` field for primary search
- **MAINTAIN** original `name` field for backward compatibility
- **IMPLEMENT** multi-field smart search (size, class, type)
- **ADD** role-based filtering (hide spares from regular users)
- **OPTIMIZE** search queries with proper indexes

**Risk Level**: Low  
**Rollback**: Use original name field

#### Tasks:
1. Implement name standardization:
   - Decimal format conversion (1/2 → .500)
   - Pattern-based name generation
   - Preserve original names in `name` field

2. Enhance search service:
   - Multi-field smart search
   - Set-based results for paired gauges
   - Role-based filtering (hide spares)

3. Update display logic:
   - Show standardized names with IDs
   - Group GO/NO GO pairs
   - Calibration status indicators

### Phase 4: Companion & Spare Management (High Priority)

#### Claude Command
```bash
/implement --persona-backend --persona-security --think-hard --validate --safe-mode "implement companion gauge pairing and spare management"
```

#### Key Instructions for Claude
- **CRITICAL**: GO/NO GO gauges must be paired (except NPT)
- **USE** `companion_gauge_id` for bidirectional linking
- **IMPLEMENT** set checkout (both or none)
- **TRACK** companion history in `gauge_companion_history` table
- **MANAGE** spare pool with `is_spare` flag
- **VALIDATE** all pairing operations for data integrity

**Risk Level**: High  
**Rollback**: Complex - Preserve existing logic

#### Tasks:
1. Implement companion pairing:
   - Bidirectional companion links
   - Set checkout logic (both or none)
   - Companion history tracking

2. Create spare management:
   - Spare pool visibility controls
   - Sealed/unsealed spare tracking
   - Set creation from spares

3. Add replacement workflow:
   - Spare to active gauge promotion
   - Maintain calibration history
   - Update companion links

### Phase 5: Calibration & Seal Enhancement (Medium Priority)

#### Claude Command
```bash
/implement --persona-backend --validate --loop "enhance calibration with seal-aware logic"
```

#### Key Instructions for Claude
- **IMPLEMENT** seal-aware calibration clock (starts on unseal)
- **TRACK** certificates by serial number, not gauge ID
- **USE** existing calibration tables
- **ADD** dynamic due date calculation based on seal status
- **MAINTAIN** complete calibration history per serial

**Risk Level**: Medium  
**Rollback**: Feature flag for new logic

#### Tasks:
1. Implement seal-aware calibration:
   - Clock starts on unseal date
   - Certificate tracking by serial
   - Dynamic due date calculation

2. Add calibration history view:
   - Serial number based history
   - Certificate retrieval
   - Cross-gauge tracking

## Risk Mitigation Strategies

### 1. Feature Flags
```javascript
const FEATURES = {
  USE_V2_ID_GENERATION: process.env.GAUGE_V2_IDS === 'true',
  CATEGORY_WORKFLOW: process.env.GAUGE_CATEGORY_WORKFLOW === 'true',
  STANDARDIZED_NAMES: process.env.GAUGE_STD_NAMES === 'true',
  COMPANION_LOGIC: process.env.GAUGE_COMPANIONS === 'true'
};
```

### 2. Parallel Running
- Keep old endpoints active during transition
- Route traffic gradually to v2 endpoints
- Monitor error rates and performance

### 3. Data Validation Gates
- Pre-migration validation scripts
- Post-migration verification
- Automated rollback triggers

### 4. Backup & Recovery
```bash
# Before each phase
mysqldump -h localhost -P 3307 -u root -p fai_db_sandbox > backup_phase_X.sql

# Rollback script
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < backup_phase_X.sql
```

## Testing Strategy

### Unit Tests
- ID generation edge cases
- Name standardization rules
- Companion pairing logic
- Search algorithm accuracy

### Integration Tests
- Full workflow: select → create → pair
- Calibration lifecycle with seals
- Spare to active transitions
- Multi-user checkout scenarios

### Performance Tests
- Search performance with 10k+ gauges
- Concurrent ID generation
- Bulk import operations

## Monitoring & Success Metrics

### Key Metrics
1. **ID Generation Success Rate**: >99.9%
2. **Search Accuracy**: >95% relevant results
3. **API Response Time**: <200ms p95
4. **Data Integrity**: 0 orphaned companions
5. **User Adoption**: >80% using new workflow

### Monitoring Implementation
```javascript
// Add to each critical operation
const metrics = {
  id_generation_success: new Counter('gauge_id_gen_success'),
  id_generation_failure: new Counter('gauge_id_gen_failure'),
  search_performance: new Histogram('gauge_search_duration_ms'),
  companion_operations: new Counter('gauge_companion_ops')
};
```

## Rollback Procedures

### Phase-Specific Rollbacks

#### Phase 1 (ID Generation)
- Feature flag to disable v2 generation
- Fallback to existing ID logic
- Preserve any created IDs

#### Phase 2-5 (Code)
1. Feature flags to disable
2. Revert to previous service versions
3. Clear caches
4. Restore database if needed

## Implementation Priority Order

| Phase | Priority | Risk | Dependencies | Status |
|-------|----------|------|--------------|--------|
| Database | - | - | - | ✅ COMPLETE |
| 1. ID Generation | High | Medium | Database | 🔄 Ready |
| 2. Category API | High | Low | Phase 1 | 📋 Planned |
| 3. Naming & Search | Medium | Low | Phase 1 | 📋 Planned |
| 4. Companions | High | High | Phases 1-2 | 📋 Planned |
| 5. Calibration | Medium | Medium | Phase 1 | 📋 Planned |

## Critical Success Factors

1. **No Production Downtime**: All changes must be backwards compatible
2. **Data Integrity**: No loss of existing gauge relationships
3. **Performance**: No degradation in API response times
4. **User Experience**: Seamless transition with training
5. **Rollback Ready**: Every phase must be reversible

## Implementation Code Examples

### ID Generation Service Update
```javascript
// GaugeIdService.js - Enhanced for v2.0
async generateSystemId(categoryId, gaugeType, suffix = null) {
  // Use gauge_id_config table
  const config = await this.getIdConfig(categoryId, gaugeType);
  const nextSequence = await this.getNextSequence(config.id);
  
  // Format: PREFIX + 4-digit sequence + suffix (A/B)
  let systemId = `${config.prefix}${nextSequence.toString().padStart(4, '0')}`;
  if (suffix) systemId += suffix;
  
  return systemId;
}

generateStandardizedName(gaugeData) {
  const { equipment_type, spec, gauge_suffix } = gaugeData;
  
  if (equipment_type === 'thread_gauge') {
    // Build name: .500-20 UN 2A Thread Plug Gauge GO
    let name = spec.thread_size + ' ';
    if (spec.thread_form) name += spec.thread_form + ' ';
    name += spec.thread_class + ' Thread ';
    name += spec.gauge_type.charAt(0).toUpperCase() + spec.gauge_type.slice(1) + ' Gauge';
    
    if (gauge_suffix === 'A') name += ' GO';
    else if (gauge_suffix === 'B') name += ' NO GO';
    
    return name;
  }
  // ... other equipment types
}
```

### Category Workflow API
```javascript
// routes/gauges-v2.js
router.get('/equipment-types', async (req, res) => {
  const types = ['thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'];
  res.json({ success: true, equipment_types: types });
});

router.get('/categories/:equipmentType', async (req, res) => {
  const categories = await categoryService.getByEquipmentType(req.params.equipmentType);
  res.json({ success: true, categories });
});

router.post('/validate-selection', async (req, res) => {
  const { equipment_type, category_id, gauge_type } = req.body;
  const validation = await workflowService.validateSelection(equipment_type, category_id, gauge_type);
  res.json({ success: validation.valid, errors: validation.errors });
});
```

## Next Steps

1. **Phase 1 Implementation**: Update ID generation service
2. **API Testing**: Create comprehensive test suite
3. **Service Integration**: Update existing services to use new schema
4. **Frontend Coordination**: Work with frontend team on new workflows
5. **Documentation**: Update API documentation for v2 endpoints

---

## Important Notes

- **Database Complete**: Schema already implemented per Database_Plan_Final.md
- **Development Mode**: Safe to experiment without production impact
- **Backward Compatibility**: Keep v1 endpoints active during transition
- **Docker Restart**: Required after any erp-core changes
- **Testing First**: Every phase includes comprehensive test coverage