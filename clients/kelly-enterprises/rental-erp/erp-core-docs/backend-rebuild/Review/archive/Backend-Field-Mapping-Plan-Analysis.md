# Backend Field Mapping Architecture Analysis

## Executive Summary

Investigation into the gauge module architecture revealed significant code organization issues that impact any implementation approach. The core service and repository files have grown to over 1,000 and 900 lines respectively, creating maintenance challenges.

## Investigation Findings

### 1. File Size Discovery

During investigation, I discovered critical file sizes that impact implementation:
- **gaugeService.js**: 1,071 lines
- **GaugeRepository.js**: 924 lines

These files are already exhibiting "God Object" anti-pattern characteristics, which creates a conflict between the project's "prefer editing existing files" constraint and clean architecture principles.

### 2. Current Architecture State

#### Thread Type/Form Confusion
The system has two fields that are frequently confused:
- **thread_type**: Category (standard, metric, npt, acme, sti, spiralock)
- **thread_form**: Specific form within category (UN, UNF, NPT, NPTF, etc.)

A "shadow API" pattern (`thread_form || thread_type`) enables this confusion by accepting either field, leading to data integrity issues.

#### Repository Pattern Violations
The service layer contains direct SQL queries, bypassing the existing repository pattern. This creates:
- Inconsistent data access patterns
- Maintenance difficulties
- Potential for SQL injection if not careful
- Duplicate code between service and repository

#### Performance Impact
Frontend normalizeGauge() function performs 10+ transformations per gauge:
- Boolean conversions (0/1 to true/false)
- ID type conversions (number to string)
- Field mapping operations
- For 100 gauges: 1,000+ operations plus array manipulations

### 3. Technical Considerations

#### Express Middleware Ordering
Error handlers must be placed:
1. After all route definitions
2. Before the default error handler
3. Typically in app.js or server.js

#### Data Type Handling
MySQL date fields need consistent handling:
- Dates typically returned as ISO strings
- Common fields: created_at, updated_at, calibration_date, calibration_due_date
- Nested objects may need JSON parsing

#### Validation Placement
Business rule validation belongs in the service layer:
- Before repository calls
- After request parsing
- With educational error messages for incorrect usage

### 4. Architectural Trade-offs

#### File Organization Challenge
With gaugeService.js at 1,071 lines and GaugeRepository.js at 924 lines, adding more functionality creates a dilemma:

**Option 1: Add to Existing Files**
- Follows project preference for editing existing files
- Results in even larger, harder-to-maintain files
- Violates Single Responsibility Principle further

**Option 2: Create Focused Modules**
```
backend/src/modules/gauge/
├── validation/
│   ├── threadValidation.js      // ~200 lines
│   └── index.js
├── dto/
│   ├── GaugeDTO.js             // ~150 lines
│   ├── ThreadSpecDTO.js        // ~100 lines
│   └── index.js
```
- Better separation of concerns
- Easier to test and maintain
- Conflicts with "prefer existing files" guidance

### 5. Additional Findings

#### ID Field Confusion
The system currently uses both 'id' and 'gauge_id' fields inconsistently. Frontend code expects both in some places, creating confusion about the primary identifier.

#### Emergency Rollback Needs
Only the shadow API removal represents a breaking change. Other fixes (table names, repository usage, DTOs) are backwards compatible. An environment variable could enable temporary shadow API if critical issues arise:
```javascript
if (process.env.SHADOW_API_ROLLBACK === 'true') {
  return gaugeData.thread_form || gaugeData.thread_type;
}
```

#### Database Constraints
The existing database constraint correctly enforces that only 'standard' and 'npt' thread types can have thread_form values. Other types (metric, acme, sti, spiralock) must have NULL thread_form.

### 6. Performance Considerations

The current frontend normalization creates significant overhead:
- Memory: 100+ new object allocations via spread operator
- CPU: 1,000+ transformation operations for 100-gauge lists
- Network: No impact (same data transferred)

Moving transformations to the backend repository layer would:
- Eliminate frontend processing entirely
- Reduce memory pressure on client devices
- Provide consistent data format across all consumers