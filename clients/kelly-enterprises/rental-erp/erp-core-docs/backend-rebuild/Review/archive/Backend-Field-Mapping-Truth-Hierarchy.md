# Backend Field Mapping - Truth Hierarchy

## The Correct Hierarchy

```
Database Schema (Source of Truth)
    ↓
Backend (Must conform to database)
    ↓
Frontend (Must conform to backend API)
```

## What This Means for Our Investigation

### 1. Database Defines Reality

The database schema dictates:
- Field names (thread_type, thread_form)
- Field types (boolean as 0/1, IDs as integers)
- Constraints (only standard/npt can have thread_form values)

The backend CANNOT change these without database migrations.

### 2. Backend's Role is Translation

The backend must:
1. **Accept what database requires**: Send 0/1 for booleans, integers for IDs
2. **Transform for API consumers**: Convert to true/false, strings
3. **Validate business rules**: Enforce constraints before database errors occur

### 3. Current State Analysis

Based on investigation:
- **Database** has fields: thread_type, thread_form
- **Database** constraint: thread_form only valid for standard/npt types
- **Backend** appears to follow repository pattern (good)
- **Frontend** sends wrong field mappings (but this is frontend's problem)

### 4. What Backend Must Do

#### A. Respect Database Schema
```javascript
// TO database: conform to schema
const dbData = {
  thread_type: data.thread_type,          // varchar
  thread_form: data.thread_form || null,  // varchar, nullable
  is_sealed: data.is_sealed ? 1 : 0,     // tinyint
  id: parseInt(data.id)                   // int
};
```

#### B. Transform FROM Database
```javascript
// FROM database: transform for API
const apiData = {
  thread_type: dbRow.thread_type,
  thread_form: dbRow.thread_form,
  is_sealed: Boolean(dbRow.is_sealed),   // 0/1 → true/false
  id: String(dbRow.id)                   // int → string
};
```

#### C. Validate Before Database
```javascript
// Validate BEFORE sending to database
if (data.thread_type === 'metric' && data.thread_form) {
  // Fail fast - don't wait for database constraint
  throw new Error('thread_form must be NULL for metric type');
}
```

### 5. The Real Question

If the backend is correctly following the database schema (which my investigation suggests), then:

1. **Where is the actual problem?**
   - Is it only in the frontend sending wrong data?
   - Is there a mismatch between what database expects and what backend sends?

2. **What needs to be fixed?**
   - Backend validation (even if following database correctly)
   - Backend transformation consistency
   - Clear API documentation

### 6. Architectural Truth

The backend CANNOT and SHOULD NOT try to "fix" database design through clever workarounds. If the database has thread_type and thread_form as separate fields, the backend must work with that reality.

Options are:
1. Work with existing schema (add validation/transformation)
2. Migrate database schema (if fundamentally broken)
3. Create views (if need different representation)

But the backend cannot pretend the database is different than it is.

## Conclusion

The investigation should focus on:
1. **Does backend correctly map to database?** (appears yes)
2. **Does backend correctly transform for API?** (needs verification)
3. **Does backend validate before database constraints?** (appears no)

The backend's job is to be a faithful translator between database reality and API contracts, not to create its own reality.