# Real Database Test Plan - Simple Approach

## Core Rule
**Every test hits the real database. No exceptions.**

## Test Structure
```javascript
// Every test follows this pattern
test('what it does', async () => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  
  try {
    // Do the thing
    // Check it worked
  } finally {
    await conn.rollback();
    conn.release();
  }
});
```

## What to Test

### 1. Routes (All 51)
Test each endpoint with real requests:
- Valid request → Success
- Invalid request → Proper error
- Missing auth → 401
- Wrong permission → 403

### 2. Database Operations
Test each query works:
- INSERT → Record exists
- UPDATE → Record changed
- DELETE → Record gone/soft deleted
- SELECT → Correct data returned

### 3. Constraints
Test database protects us:
- Foreign keys → Reject invalid references
- Unique keys → Reject duplicates
- Required fields → Reject nulls
- Check constraints → Reject invalid data

### 4. Business Rules
Test logic with real data:
- Can't checkout calibration-due gauge
- Can't use sealed gauge
- Audit logs get created
- Permissions are enforced

## Priority Order

1. **Fix the 0% coverage files first**
   - auth.js
   - errorHandler.js
   - rbacMiddleware.js

2. **Fix the <10% coverage files**
   - GaugeCalibrationService.js (7%)
   - sealService.js (6%)
   - GaugeStatusService.js (11%)

3. **Test all routes**
   - One test per endpoint minimum
   - Success + main error case

4. **Test remaining services**
   - Focus on complex logic
   - Skip simple getters

## Simple Rules

1. Delete all mocks
2. Use transactions for cleanup
3. Test the SQL, not the ORM
4. One assertion per test
5. Real data only

## Done When
- 0 mocks in codebase
- 90%+ real coverage
- All routes tested
- All constraints tested
- No surprises in production