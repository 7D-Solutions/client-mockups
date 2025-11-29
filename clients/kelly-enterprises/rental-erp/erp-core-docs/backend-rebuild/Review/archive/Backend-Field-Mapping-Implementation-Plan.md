# Backend Field Mapping Implementation Plan

## 🚨 CRITICAL IMPLEMENTATION INSTRUCTIONS

**MANDATORY - READ BEFORE STARTING**:
1. **No file deletion** - Never delete files, move to review-for-delete/ if needed
2. **No new files unless absolutely necessary** - Always prefer editing existing files
3. **Complete discovery before changes** - Search ALL variations of patterns before making any changes
4. **Evidence-based decisions** - Verify problems exist before adding complexity
5. **Production quality only** - No quick fixes, patches, or temporary solutions
6. **Test thoroughly after each phase** - Do not proceed until current phase is validated
7. **Maintain backward compatibility** - Except for shadow API (intentional break)
8. **Educational errors are critical** - Help frontend developers understand the correct usage

**DECISION POINTS - Avoid Unnecessary Complexity**:
- **Transactions**: Only add if current code actually uses them
- **Gradual Rollout**: Only add if >10 endpoints affected AND <50% test coverage
- **Bidirectional DTO**: Only add transformFromDTO if API has significant write operations
- **New Repository Methods**: Use existing methods before creating new ones

## Executive Summary

This plan addresses critical architectural violations and domain model confusion in the gauge management system. The root cause is a misunderstanding of the `thread_type` (category) vs `thread_form` (specification) fields, enabled by poor backend practices including a "shadow API" and repository pattern violations.

### Critical Analysis: Why Each Phase is Necessary

**Phase 0 (Preparation)**: Establishes baselines to measure success. Without metrics, we can't prove the fixes work.

**Phase 1 (Table Name Bug)**: Causes RUNTIME FAILURES. This is not theoretical - the system breaks without this fix.

**Phase 2 (Repository Pattern)**: Service bypassing repository creates maintenance nightmares and inconsistency. However, only add transaction handling if current code actually uses transactions - don't over-engineer.

**Phase 3 (Shadow API)**: The `thread_form || thread_type` pattern is THE ROOT CAUSE of domain confusion. Must be eliminated. Gradual rollout adds complexity - only use if truly needed.

**Phase 4 (DTO Transformation)**: Eliminates 1,000+ operations per 100 gauges. Significant performance win. Verify if bidirectional transformation is actually needed.

**Phase 5 (Testing)**: Ensures correctness. Non-negotiable.

**Phase 6 (Documentation)**: Prevents regression. Essential for long-term success.

### Key Consensus Points from Architecture Review:
1. `thread_type` = Category (standard, metric, npt, acme, sti, spiralock)
2. `thread_form` = Specific form ONLY for standard/npt types (NULL for others)
3. Service layer is bypassing the existing repository pattern
4. Shadow API (`thread_form || thread_type`) enables domain confusion
5. Frontend already has correct domain knowledge in validation but uses it incorrectly in API calls
6. Performance impact: 1,000+ operations for 100 gauges in normalizeGauge()
7. Repository pattern already exists with correct table mappings - just not being used

## SuperClaude Implementation Instructions

**Primary Persona**: `--persona-architect`  
**Secondary Personas**: `--persona-backend`, `--persona-analyzer`  
**Thinking Mode**: `--think-hard` for architectural analysis, `--think` for implementation  
**Analysis Focus**: `--focus architecture` and `--focus quality`

**Critical Mindset**: You are fixing architectural violations and enforcing proper domain modeling. This is NOT about accommodating frontend confusion - it's about enforcing correct patterns and providing educational feedback.

## Phase 0: Preparation and Monitoring

**Persona**: `--persona-analyzer` with `--persona-devops`  
**Thinking**: `--think` to assess current state
**Focus**: `--focus analysis` for usage patterns

### Critical Instructions
- **MANDATORY**: Complete ALL discovery before any changes
- **No new files** - Add scripts to existing test infrastructure if possible
- Search for all shadow API patterns in code
- Create verification scripts for database state
- Write test cases for validation logic
- Document findings in code comments
- **DECISION**: Only proceed to Phase 1 if shadow API usage is confirmed

### Actions
1. **Search and Document Current Usage**:
   ```javascript
   // Search for shadow API patterns
   Search patterns:
   - "thread_form || thread_type"
   - "thread_type || thread_form"
   - "gaugeData.thread_form || gaugeData.thread_type"
   
   // Document each occurrence with:
   - File name and line number
   - Context of usage
   - Affected endpoints
   ```

2. **Count Shadow API Usage for Baseline**:
   ```javascript
   // backend/scripts/count-shadow-api-usage.js
   const fs = require('fs');
   const path = require('path');
   
   async function countShadowApiUsage() {
     const patterns = [
       /thread_form\s*\|\|\s*thread_type/g,
       /thread_type\s*\|\|\s*thread_form/g
     ];
     
     const results = {
       total: 0,
       byFile: {},
       byEndpoint: {}
     };
     
     // Scan service files
     const scanDirectory = (dir) => {
       const files = fs.readdirSync(dir);
       files.forEach(file => {
         const filePath = path.join(dir, file);
         if (fs.statSync(filePath).isDirectory()) {
           scanDirectory(filePath);
         } else if (file.endsWith('.js')) {
           const content = fs.readFileSync(filePath, 'utf8');
           patterns.forEach(pattern => {
             const matches = content.match(pattern);
             if (matches) {
               results.total += matches.length;
               results.byFile[filePath] = (results.byFile[filePath] || 0) + matches.length;
               
               // Extract endpoint from route definitions
               const routePattern = /router\.(get|post|put|patch)\(['"]([^'"]+)/g;
               let route;
               while ((route = routePattern.exec(content)) !== null) {
                 results.byEndpoint[route[2]] = (results.byEndpoint[route[2]] || 0) + matches.length;
               }
             }
           });
         }
       });
     };
     
     scanDirectory('./backend/src');
     
     console.log('Shadow API Usage Baseline:');
     console.log(`Total occurrences: ${results.total}`);
     console.log(`Files affected: ${Object.keys(results.byFile).length}`);
     console.log('\nBy endpoint (for prioritization):');
     Object.entries(results.byEndpoint)
       .sort(([,a], [,b]) => b - a)
       .forEach(([endpoint, count]) => {
         console.log(`  ${endpoint}: ${count} occurrences`);
       });
     
     return results;
   }
   
   countShadowApiUsage();
   ```

3. **Establish Performance Baselines**:
   ```javascript
   // backend/scripts/measure-performance-baseline.js
   const gaugeService = require('../src/modules/gauge/services/gaugeService');
   
   async function measureBaselines() {
     console.log('Performance Baseline Measurements:\n');
     
     // Measure normalizeGauge performance
     console.log('1. Frontend normalizeGauge() overhead:');
     const sampleGauges = await gaugeService.getGauges({ limit: 100 });
     
     // Simulate frontend normalization
     console.time('normalizeGauge for 100 gauges');
     sampleGauges.forEach(gauge => {
       // Simulate the 10+ operations per gauge
       const normalized = {
         ...gauge,
         id: String(gauge.id),
         gauge_id: String(gauge.gauge_id || gauge.id),
         is_sealed: Boolean(gauge.is_sealed),
         is_spare: Boolean(gauge.is_spare),
         has_pending_transfer: Boolean(gauge.has_pending_transfer),
         has_pending_unseal_request: Boolean(gauge.has_pending_unseal_request),
         checked_out_by_user_id: gauge.checked_out_by_user_id ? String(gauge.checked_out_by_user_id) : null,
         pending_transfer_id: gauge.pending_transfer_id ? String(gauge.pending_transfer_id) : null,
         transfer_to_user_id: gauge.transfer_to_user_id ? String(gauge.transfer_to_user_id) : null,
         transfer_from_user_id: gauge.transfer_from_user_id ? String(gauge.transfer_from_user_id) : null,
       };
     });
     console.timeEnd('normalizeGauge for 100 gauges');
     
     // Measure API response times
     console.log('\n2. Current API response times:');
     const endpoints = ['/api/gauges/v2', '/api/gauges/v2/123'];
     
     for (const endpoint of endpoints) {
       const start = Date.now();
       await fetch(`http://localhost:8000${endpoint}`);
       const duration = Date.now() - start;
       console.log(`  ${endpoint}: ${duration}ms`);
     }
     
     // Measure error rates
     console.log('\n3. Current error rates by endpoint:');
     // This would need to parse logs or use monitoring data
     console.log('  (Requires log analysis or monitoring integration)');
     
     // If you have existing monitoring (e.g., DataDog, New Relic, CloudWatch):
     // - Add custom metrics for shadow API usage
     // - Track validation error rates by error code
     // - Monitor performance improvements after DTO implementation
   }
   
   measureBaselines();
   ```

4. **Verify Database State**:
   ```javascript
   // Create a verification script to check constraint
   const verifyConstraint = async () => {
     const result = await db.query(`
       SELECT CONSTRAINT_NAME, CHECK_CLAUSE 
       FROM information_schema.CHECK_CONSTRAINTS 
       WHERE TABLE_NAME = 'gauge_thread_specifications'
     `);
     console.log('Constraint status:', result);
   };
   ```

5. **Create Test Cases for Migration**:
   ```javascript
   // Create test file: test-thread-validation.js
   const testCases = [
     { thread_type: 'UN', expected: 'error', reason: 'form value as type' },
     { thread_type: 'standard', thread_form: 'UN', expected: 'success' },
     { thread_type: 'metric', thread_form: 'UN', expected: 'error', reason: 'metric cannot have form' },
     { thread_type: 'M6', expected: 'error', reason: 'size value as type' }
   ];
   ```

6. **Document Success Criteria in Code**:
   ```javascript
   // Add to test suite
   describe('Field Mapping Success Criteria', () => {
     it('should have zero shadow API patterns', async () => {
       const shadowPatterns = await searchCodebase('thread_form || thread_type');
       expect(shadowPatterns.length).toBe(0);
     });
     
     it('should have all queries through repository', async () => {
       const directSQL = await searchInService(['INSERT INTO', 'UPDATE', 'SELECT']);
       expect(directSQL.length).toBe(0);
     });
   });
   ```

### Validation
- All shadow API patterns found and documented in code
- Database constraint verification script created and run
- Test cases written for all validation scenarios
- Success criteria documented in test suite

## Phase 1: Emergency Fix - Table Name Bug

**Persona**: `--persona-backend`  
**Thinking**: `--think` to analyze impact across codebase

### Critical Instructions
- **THIS IS A RUNTIME FAILURE** - Not theoretical, the system breaks without this fix
- **NEVER** create new files unless absolutely necessary
- **ALWAYS** prefer editing existing files
- **MANDATORY**: Complete discovery of ALL table name references before making changes
- **IMPORTANT**: The repository already uses the CORRECT table name via SPEC_TABLES mapping
- **VERIFY**: Check if this bug actually exists by testing gauge creation/update first

### Background
The repository layer correctly maps to `gauge_thread_specifications`:
```javascript
// GaugeRepository.js - CORRECT
const SPEC_TABLES = {
  thread_gauge: 'gauge_thread_specifications',
  hand_tool: 'gauge_hand_tool_specifications',
  large_equipment: 'gauge_large_equipment_specifications',
  calibration_standard: 'gauge_calibration_standard_specifications',
};
```

But the service layer bypasses this and uses the WRONG table name directly.

### Actions
1. **Comprehensive Search** for ALL occurrences of incorrect table name:
   ```
   Search patterns:
   - "gauge_thread_specs"
   - 'gauge_thread_specs'
   - `gauge_thread_specs`
   
   Also search for:
   - Prepared statement definitions
   - Stored procedures
   - Migration files
   - Concatenated SQL strings
   - Test fixtures
   ```

2. **Verify Repository Correctness FIRST**:
   - Confirm GaugeRepository uses correct table name via SPEC_TABLES
   - This validates the architectural pattern is sound

3. **Fix the incorrect table name** in `gaugeService.js`:
   - Change: `gauge_thread_specs` → `gauge_thread_specifications`
   - This is around line 948-960 based on the evidence
   - This bug causes RUNTIME FAILURES

4. **Check for related issues**:
   - Verify no other services have this same bug
   - Check for any hardcoded table references
   - Look for dynamic SQL construction

### Validation
- Confirm the repository layer uses the correct table name
- Test that thread gauge creation/update operations work
- Check logs for any SQL errors related to table names

## Phase 2: Fix Repository Pattern Violation

**Persona**: `--persona-architect` with `--persona-backend`  
**Thinking**: `--think-hard` to understand service-repository boundaries
**Analysis**: `--analyze` existing repository pattern implementation

### Critical Instructions
- The repository pattern ALREADY EXISTS - do not create new patterns
- Service layer must NEVER contain direct SQL queries
- Maintain separation of concerns strictly
- **CRITICAL DECISION**: Only add transaction support if you find actual transaction usage
- **VERIFY FIRST**: Search for beginTransaction, commit, rollback patterns
- **If no transactions found, SKIP transaction complexity entirely**

### Actions
1. **Analyze Repository and Transaction Patterns**:
   - Document available repository methods
   - Identify transaction handling in existing repository
   - Check if BaseRepository supports transactions
   - Note any methods that might be missing

2. **Find ALL direct SQL queries** in `gaugeService.js`:
   - Search for: `INSERT INTO`, `UPDATE`, `SELECT`, `DELETE`
   - Document each violation with line numbers
   - **CRITICAL**: Note which queries are wrapped in transactions
   - Identify transaction boundaries that must be preserved

3. **Check Transaction Requirements FIRST**:
   ```javascript
   // IMPORTANT: Only add transaction support if the current code actually uses them
   // Search for transaction patterns in gaugeService.js:
   // - beginTransaction, commit, rollback
   // - START TRANSACTION, COMMIT, ROLLBACK
   
   // IF transactions are found, preserve them:
   // Example pattern to look for:
   await db.beginTransaction();
   await db.query('INSERT...'); // Direct SQL
   await db.query('UPDATE...'); // Direct SQL
   await db.commit();
   
   // IF NO transactions found, skip this complexity
   // Most operations may not need explicit transaction management
   ```

4. **Refactor service to use repository exclusively**:
   - Replace direct SQL with repository methods
   - Maintain transaction boundaries
   - Ensure atomic operations remain atomic

5. **Add missing repository methods** if needed:
   - Follow existing patterns in BaseRepository
   - Ensure transaction support in new methods
   - Add proper error handling

### Validation
- Service layer contains ZERO direct SQL queries
- All database operations go through repository
- Existing functionality remains intact

## Phase 3: Kill the Shadow API

**Persona**: `--persona-analyzer` with `--persona-security`  
**Thinking**: `--think` to trace all field usage patterns
**Focus**: `--focus security` to prevent data integrity issues

### Critical Instructions
- **THIS IS THE ROOT CAUSE** - The shadow API enables all domain confusion
- This is a BREAKING CHANGE by design - we want to break incorrect usage
- Error messages must be EDUCATIONAL, not just rejecting
- Search for ALL variations of the shadow pattern
- **DECISION POINT**: Only add gradual rollout if you have evidence of high risk (many endpoints affected, no test coverage, critical production system)
- **DEFAULT**: Use strict validation immediately - clean breaks are often better
- **No new files** - Add validation to existing service or middleware

### Actions
1. Find ALL occurrences of the shadow API pattern:
   ```
   Search for:
   - "thread_form || thread_type"
   - "thread_type || thread_form"
   - Similar patterns with parentheses
   ```

2. Implement strict validation function with **robust error handling**:
   ```javascript
   // LOCATION: Add to gaugeService.js (before repository calls)
   // This validates at the service layer, not in repository
   // IMPORTANT: Use lowercase for comparison as per consensus
   const VALID_THREAD_TYPES = ['standard', 'metric', 'acme', 'npt', 'sti', 'spiralock'];
   const THREAD_FORMS = {
     'standard': ['UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ'],
     'npt': ['NPT', 'NPTF']
   };
   const METRIC_THREAD_SIZES = ['M1', 'M1.6', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'];
   
   function validateThreadFields(data) {
     // Robust null/empty handling
     const threadType = (data.thread_type || '').toString().toLowerCase().trim();
     
     // Validate thread_type is a category
     if (!threadType || !VALID_THREAD_TYPES.includes(threadType)) {
       throw new ValidationError({
         code: 'INVALID_THREAD_TYPE',
         message: `Invalid thread_type "${data.thread_type}". Valid types: ${VALID_THREAD_TYPES.join(', ')}`,
         field: 'thread_type',
         validValues: VALID_THREAD_TYPES
       });
     }
     
     // Check for metric thread size confusion
     if (METRIC_THREAD_SIZES.includes(data.thread_type?.toUpperCase())) {
       throw new ValidationError({
         code: 'THREAD_SIZE_AS_TYPE',
         message: `You sent thread_type="${data.thread_type}" but this appears to be a thread size. ` +
                  `For metric threads, use thread_type="metric" and include size in thread_size field.`,
         field: 'thread_type',
         correctUsage: { thread_type: 'metric', thread_size: data.thread_type }
       });
     }
     
     // Validate thread_form based on type
     if (threadType === 'standard' || threadType === 'npt') {
       if (!data.thread_form) {
         throw new ValidationError({
           code: 'MISSING_THREAD_FORM',
           message: `thread_form is required for ${threadType} thread gauges`,
           field: 'thread_form',
           validValues: THREAD_FORMS[threadType]
         });
       }
       if (!THREAD_FORMS[threadType].includes(data.thread_form)) {
         throw new ValidationError({
           code: 'INVALID_THREAD_FORM',
           message: `Invalid thread_form "${data.thread_form}" for ${threadType}`,
           field: 'thread_form',
           validValues: THREAD_FORMS[threadType]
         });
       }
     } else {
       if (data.thread_form) {
         throw new ValidationError({
           code: 'UNEXPECTED_THREAD_FORM',
           message: `thread_form must be NULL for ${threadType} thread gauges`,
           field: 'thread_form',
           expectedValue: null
         });
       }
     }
     
     // Educational check for common mistake
     const upperThreadType = (data.thread_type || '').toUpperCase();
     if (THREAD_FORMS['standard'].includes(upperThreadType) || 
         THREAD_FORMS['npt'].includes(upperThreadType)) {
       throw new ValidationError({
         code: 'FORM_AS_TYPE',
         message: `You sent thread_type="${data.thread_type}" but this appears to be a thread_form value. ` +
                  `For ${upperThreadType} threads, use thread_type="standard" or "npt" and thread_form="${upperThreadType}"`,
         field: 'thread_type',
         correctUsage: { 
           thread_type: THREAD_FORMS['standard'].includes(upperThreadType) ? 'standard' : 'npt',
           thread_form: upperThreadType 
         }
       });
     }
   }
   ```

3. Replace ALL shadow API occurrences with strict validation
   - Remove `thread_form || thread_type` patterns
   - Remove `gaugeData.thread_form || gaugeData.thread_type` (line ~965)
   - Add validation before any thread gauge operations
   - Ensure educational error messages

4. **(OPTIONAL - Only if High Risk)** Gradual Rollout:
   ```javascript
   // Only add this complexity if:
   // - Many endpoints affected (>10)
   // - Poor test coverage (<50%)
   // - Critical production system
   // - No staging environment
   
   // Otherwise, skip to step 5 - clean break is often better
   const validationMode = process.env.THREAD_VALIDATION_MODE || 'strict';
   
   if (validationMode === 'warn') {
     // Log warnings but allow requests temporarily
     console.warn('Shadow API deprecation warning', { endpoint, data });
   } else {
     // Default: strict validation
     validateThreadFields(data);
   }
   ```

5. Fix the specific shadow API in gaugeService.js line ~965:
   ```javascript
   // OLD - DANGEROUS shadow API
   gaugeData.thread_form || gaugeData.thread_type  // Accepts EITHER field!
   
   // NEW - Strict validation
   if (gaugeData.equipment_type === 'thread_gauge' && !gaugeData.thread_form) {
     throw new ValidationError('thread_form is required for thread gauges');
   }
   ```

### Consistent Error Response Format
```javascript
// CRITICAL: Add error handler middleware
// This MUST be added AFTER all route definitions but BEFORE the default error handler

// In the main Express app file:
// 1. First, all your routes
app.use('/api/gauges', gaugeRoutes);
app.use('/api/auth', authRoutes);
// ... other routes

// 2. THEN add the validation error handler
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: err.code || 'VALIDATION_ERROR',
        message: err.message,
        field: err.field,
        validValues: err.validValues,
        correctUsage: err.correctUsage
      }
    });
  } else {
    // Pass to default error handler
    next(err);
  }
});

// 3. Finally, the default error handler (if you have one)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});
```

### Validation
- No shadow API patterns remain in codebase
- Invalid requests return 400 with educational messages
- Error responses follow consistent format
- Valid requests process normally

## Phase 4: Implement DTO Transformation

**Persona**: `--persona-backend` with `--persona-performance`  
**Thinking**: `--think` for implementation details
**Focus**: `--focus performance` to eliminate frontend transformation overhead

### Critical Instructions
- **PERFORMANCE WIN**: Eliminates 1,000+ operations per 100 gauges
- DTO transformation happens in REPOSITORY layer, not service
- Maintain snake_case - NO camelCase conversions
- Transform ALL boolean fields from 0/1 to true/false
- Transform ALL ID fields from number to string
- **VERIFY NEED**: Check if the API has write operations that need transformFromDTO - if it's read-only or read-heavy, you might only need transformToDTO
- **ID DECISION**: Use 'id' only - no gauge_id to eliminate confusion
- **No new files** - Enhance existing repository

### Actions
1. Add transformation methods to `GaugeRepository.js`:
   ```javascript
   // NOTE: Keeping DTO logic in repository to avoid creating new files
   // In a greenfield project, separate DTO classes would be cleaner,
   // but we're working within existing patterns
   class GaugeRepository extends BaseRepository {
     // Override base methods to add transformation
     async findById(id) {
       const rawGauge = await super.findById(id);
       return this.transformToDTO(rawGauge);
     }
     
     async findAll(criteria) {
       const rawGauges = await super.findAll(criteria);
       return rawGauges.map(gauge => this.transformToDTO(gauge));
     }
     
     transformToDTO(dbGauge) {
       if (!dbGauge) return null;
       
       return {
         ...dbGauge,
         // ID transformations - CRITICAL: Pick ONE approach
         // Decision: Use 'id' as the primary identifier everywhere
         id: String(dbGauge.id),
         
         // User ID transformations to string
         checked_out_by_user_id: dbGauge.checked_out_by_user_id ? String(dbGauge.checked_out_by_user_id) : null,
         pending_transfer_id: dbGauge.pending_transfer_id ? String(dbGauge.pending_transfer_id) : null,
         transfer_to_user_id: dbGauge.transfer_to_user_id ? String(dbGauge.transfer_to_user_id) : null,
         transfer_from_user_id: dbGauge.transfer_from_user_id ? String(dbGauge.transfer_from_user_id) : null,
         
         // Boolean transformations (0/1 → true/false)
         is_sealed: Boolean(dbGauge.is_sealed),
         is_spare: Boolean(dbGauge.is_spare),
         has_pending_transfer: Boolean(dbGauge.has_pending_transfer),
         has_pending_unseal_request: Boolean(dbGauge.has_pending_unseal_request),
         
         // Ensure correct field names (no mapping needed if using correct names)
         thread_type: dbGauge.thread_type,
         thread_form: dbGauge.thread_form,
         
         // Handle any nested objects if they exist
         // specifications: dbGauge.specifications ? JSON.parse(dbGauge.specifications) : null
       };
     }
     
     // Transform input data from API to database format
     transformFromDTO(apiGauge) {
       return {
         ...apiGauge,
         // Convert string IDs to numbers for database
         // CRITICAL: Only use 'id' - no gauge_id per architectural decision
         id: apiGauge.id ? parseInt(apiGauge.id) : undefined,
         
         // Convert other user IDs from string to number
         checked_out_by_user_id: apiGauge.checked_out_by_user_id ? parseInt(apiGauge.checked_out_by_user_id) : null,
         pending_transfer_id: apiGauge.pending_transfer_id ? parseInt(apiGauge.pending_transfer_id) : null,
         transfer_to_user_id: apiGauge.transfer_to_user_id ? parseInt(apiGauge.transfer_to_user_id) : null,
         transfer_from_user_id: apiGauge.transfer_from_user_id ? parseInt(apiGauge.transfer_from_user_id) : null,
         
         // Convert boolean strings to 0/1 for database
         is_sealed: apiGauge.is_sealed ? 1 : 0,
         is_spare: apiGauge.is_spare ? 1 : 0,
         has_pending_transfer: apiGauge.has_pending_transfer ? 1 : 0,
         has_pending_unseal_request: apiGauge.has_pending_unseal_request ? 1 : 0
       };
     }
   }
   ```

2. Update repository methods that write data:
   - Add `transformFromDTO` for create/update operations
   - Ensure consistent transformation both ways

3. Remove any transformation logic from service layer
   - Service should pass data through without transformation
   - All transformation happens at repository boundary

### Validation
- API returns properly formatted data (strings for IDs, booleans for flags)
- Frontend can remove `normalizeGauge()` function
- Performance improvement measurable

## Phase 5: Testing Strategy

**Persona**: `--persona-qa` with `--persona-analyzer`  
**Thinking**: `--think` for comprehensive test coverage
**Focus**: `--focus quality` for test effectiveness

### Critical Instructions
- **NON-NEGOTIABLE**: Must test all changes thoroughly
- Existing tests that use shadow API WILL break - this is intentional
- Breaking tests indicate incorrect usage that needs fixing
- Create new tests to validate correct behavior
- **No new test directories** - Use existing test structure
- **Test files go in**: backend/tests/modules/gauge/
- Document which tests break and why in comments

### Actions
1. **Identify Breaking Tests**:
   ```javascript
   // Run test suite and document failures
   // Tests that break are likely using:
   // - thread_form || thread_type pattern
   // - Incorrect field values (UN as thread_type)
   // - Missing thread_form for standard/npt
   ```

2. **Create Validation Test Suite**:
   ```javascript
   // backend/tests/modules/gauge/thread-validation.test.js
   describe('Thread Field Validation', () => {
     describe('Valid Cases', () => {
       it('accepts standard thread with form', async () => {
         const data = { thread_type: 'standard', thread_form: 'UN' };
         expect(() => validateThreadFields(data)).not.toThrow();
       });
       
       it('accepts metric thread without form', async () => {
         const data = { thread_type: 'metric', thread_form: null };
         expect(() => validateThreadFields(data)).not.toThrow();
       });
     });
     
     describe('Educational Errors', () => {
       it('rejects form value as type', async () => {
         const data = { thread_type: 'UN' };
         expect(() => validateThreadFields(data)).toThrow(/appears to be a thread_form value/);
       });
       
       it('rejects metric size as type', async () => {
         const data = { thread_type: 'M6' };
         expect(() => validateThreadFields(data)).toThrow(/appears to be a thread size/);
       });
     });
   });
   ```

3. **Create Repository Pattern Tests**:
   ```javascript
   describe('Repository Pattern Enforcement', () => {
     it('service uses repository for all operations', async () => {
       // Mock repository methods
       const mockRepo = {
         findById: jest.fn(),
         create: jest.fn(),
         update: jest.fn()
       };
       
       // Test service methods use repository
       await gaugeService.getGauge(1);
       expect(mockRepo.findById).toHaveBeenCalled();
     });
   });
   ```

4. **Performance Benchmark Tests**:
   ```javascript
   describe('Performance Improvements', () => {
     it('eliminates normalizeGauge operations', async () => {
       const start = performance.now();
       const gauges = await gaugeService.getGauges();
       const end = performance.now();
       
       // Should return already-transformed data
       expect(gauges[0].is_sealed).toBe(true); // boolean, not 1
       expect(gauges[0].id).toBe('123'); // string, not number
       expect(end - start).toBeLessThan(100); // Fast without transformation
     });
   });
   ```

### Validation
- All new tests pass
- Breaking tests documented with migration path
- Performance benchmarks show improvement
- Educational errors properly tested

## Phase 6: Documentation and Domain Model Clarification

**Persona**: `--persona-scribe=en` with `--persona-mentor`  
**Thinking**: `--think` for clear explanations
**Focus**: `--focus quality` for comprehensive documentation

### Critical Instructions
- **ESSENTIAL**: Prevents regression and confusion
- Create documentation ONLY if it doesn't exist
- Update existing documentation rather than creating new files
- Focus on domain model clarification
- **Preferred locations**: 
  - Update existing API docs if they exist
  - Add to code comments in validation functions
  - Update README only if gauge-specific section exists
- **Do NOT create new markdown files** unless explicitly requested

### Actions
1. Document the thread type/form relationship clearly:
   ```markdown
   ## Thread Gauge Domain Model
   
   ### thread_type (Category)
   - Represents the general category of thread
   - Valid values: 'standard', 'metric', 'acme', 'npt', 'sti', 'spiralock'
   - Required for all thread gauges
   
   ### thread_form (Specification)
   - Represents the specific form within a category
   - ONLY used for 'standard' and 'npt' types
   - Must be NULL for all other types
   - Valid values:
     - For 'standard': UN, UNF, UNEF, UNS, UNR, UNJ
     - For 'npt': NPT, NPTF
   
   ### Common Confusion
   - Metric threads (M6, M8) - the 'M6' is part of thread_size, NOT thread_form
   - thread_form is NULL for metric gauges
   ```

2. Add inline documentation to validation functions
3. Update API documentation if it exists

### Validation
- Domain model is clearly documented
- Validation functions have clear comments
- No ambiguity about field usage

## Critical Success Factors

1. **Architectural Integrity**: Repository pattern properly enforced
2. **Domain Clarity**: No confusion between thread_type and thread_form
3. **Performance**: Frontend no longer needs normalizeGauge()
4. **Education**: Clear error messages guide proper usage
5. **Quality**: All changes maintain production quality standards
6. **Database Constraint**: The existing constraint is CORRECT (only standard/npt have forms)
7. **Memory Optimization**: Eliminate 100+ object allocations from spread operator in normalizeGauge()
8. **ID Consistency**: Use 'id' field only - no gauge_id confusion
9. **Transaction Integrity**: Maintain atomic operations when moving to repository

## Implementation Notes

- Each phase builds on the previous one
- Do NOT skip phases or combine them
- Test thoroughly after each phase
- If blockers arise, document them clearly
- Maintain backward compatibility except for the shadow API (intentional break)
- The database constraint is CORRECT - do not modify it
- Focus on fixing the service layer violations, not creating new patterns
- Educational error messages are critical for frontend developer understanding
- During migration, some endpoints may have double transformation (backend DTO + frontend normalizeGauge) temporarily
- Monitor performance during transition - this is expected and temporary

## Avoiding Unnecessary Complexity

**Key Principle**: An unnecessary step can be worse than the problem it claims to fix.

**Before adding complexity, verify**:
1. Does the current code actually use this pattern? (e.g., transactions)
2. Is the risk high enough to justify gradual rollout?
3. Do we need bidirectional transformation or just one direction?
4. Can we solve this with existing patterns instead of new ones?

**Simplify when possible**:
- If no transactions exist, don't add transaction handling
- If test coverage is good, skip gradual rollout
- If API is read-heavy, maybe only transformToDTO is needed
- Use existing repository methods before creating new ones

## Post-Implementation Verification

After all phases:
1. **Run Comprehensive Test Suite**:
   ```bash
   npm test -- --testPathPattern=gauge
   npm test -- --testPathPattern=thread-validation
   ```

2. **Verify Architecture Compliance**:
   ```javascript
   // Search for any remaining direct SQL in services
   grep -r "INSERT INTO\|UPDATE\|SELECT\|DELETE" backend/src/modules/gauge/services/
   ```

3. **Validate API Responses**:
   ```javascript
   // Test endpoint to verify DTO transformation
   const response = await fetch('/api/gauges/v2/123');
   const gauge = await response.json();
   
   // Verify correct data types
   console.assert(typeof gauge.id === 'string', 'ID should be string');
   console.assert(typeof gauge.is_sealed === 'boolean', 'is_sealed should be boolean');
   console.assert(!gauge.hasOwnProperty('gauge_id'), 'gauge_id should not exist');
   ```

4. **Test Educational Errors**:
   ```javascript
   // Test invalid request
   const errorResponse = await fetch('/api/gauges/v2', {
     method: 'POST',
     body: JSON.stringify({ thread_type: 'UN' })
   });
   
   const error = await errorResponse.json();
   console.assert(error.error.code === 'FORM_AS_TYPE', 'Should return educational error');
   console.assert(error.error.correctUsage, 'Should provide correct usage');
   ```

5. **Measure Performance Gains**:
   ```javascript
   // Benchmark before/after elimination of normalizeGauge
   console.time('Fetch 100 gauges');
   const gauges = await gaugeService.getGauges({ limit: 100 });
   console.timeEnd('Fetch 100 gauges');
   // Should be significantly faster without normalizeGauge
   ```