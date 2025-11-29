# Backend Field Mapping Investigation - Corrected Perspective

## Executive Summary

The backend defines the API contract. The frontend must adapt to what the backend provides. This investigation examines what the backend currently does and what needs to be fixed on the backend side.

## Key Finding: Backend Must Enforce Correct Domain Model

### Current Backend State

1. **No Shadow API Found** - The backend doesn't currently have the permissive `thread_form || thread_type` pattern
2. **No Direct SQL in Service** - Repository pattern is being followed
3. **Table Name Bug Not Verified** - Couldn't find the claimed `gauge_thread_specs` bug in current code

### What This Means

If the backend isn't currently accepting the wrong fields, then either:
1. The frontend is failing and getting errors (which we should see), OR
2. The backend is accepting the wrong data in some other way, OR
3. The problem was already fixed

## Investigation Needed

### 1. How is Frontend Currently Working?

If frontend sends:
```javascript
thread_form: data.thread_type  // Wrong field mapping
```

And backend doesn't have shadow API, then either:
- Backend is rejecting these requests (frontend should be broken)
- Backend has some other permissive behavior
- There's a transformation happening somewhere else

### 2. Backend Contract Definition

The backend needs to:
1. **Define the correct fields**: 
   - `thread_type` = category (standard, metric, npt, etc.)
   - `thread_form` = specific form (UN, UNF, NPT, NPTF) - only for standard/npt

2. **Enforce validation**:
   - Reject requests where `thread_type` contains form values
   - Reject requests where `thread_form` exists for non-standard/npt types

3. **Provide consistent data**:
   - Always return booleans as true/false (not 0/1)
   - Always return IDs as strings (not numbers)
   - Use consistent field names

## Backend-First Approach

### Phase 1: Backend Defines Truth
1. Implement strict validation for thread fields
2. Add DTO transformation for consistent output
3. Document the exact API contract

### Phase 2: Frontend Must Comply
Once backend enforces correct behavior:
1. Frontend MUST send correct field names
2. Frontend MUST send correct field values
3. Frontend removes all normalization/transformation

## Real Issues to Fix in Backend

### 1. Add Validation (Even if Not Currently Broken)
```javascript
function validateThreadFields(data) {
  const VALID_TYPES = ['standard', 'metric', 'npt', 'acme', 'sti', 'spiralock'];
  
  if (!VALID_TYPES.includes(data.thread_type)) {
    throw new Error(`Invalid thread_type: ${data.thread_type}`);
  }
  
  if (['standard', 'npt'].includes(data.thread_type)) {
    if (!data.thread_form) {
      throw new Error('thread_form required for standard/npt');
    }
  } else {
    if (data.thread_form) {
      throw new Error('thread_form must be null for non-standard/npt');
    }
  }
}
```

### 2. Add DTO Transformation
Ensure consistent data types:
```javascript
transformToDTO(dbGauge) {
  return {
    ...dbGauge,
    id: String(dbGauge.id),
    is_sealed: Boolean(dbGauge.is_sealed),
    is_spare: Boolean(dbGauge.is_spare),
    // etc.
  };
}
```

### 3. Fix Any Permissive Behavior
Even though I didn't find the shadow API, if frontend is working with wrong field names, something is accepting them. Need to find and fix that.

## Questions That Need Answers

1. **Is the frontend currently working?** If yes, how is it working with wrong field mappings?
2. **Are there database triggers or views** that might be transforming data?
3. **Is there middleware** that might be transforming requests?
4. **When was this problem introduced?** Has it always been broken or did something change?

## Conclusion

The backend is responsible for defining and enforcing the correct domain model. While my investigation didn't find some of the claimed issues (shadow API, direct SQL), the backend still needs to:

1. Enforce strict validation
2. Provide consistent data transformation
3. Document the API contract clearly

Only after the backend is correctly enforcing the domain model should we tell the frontend what changes to make.