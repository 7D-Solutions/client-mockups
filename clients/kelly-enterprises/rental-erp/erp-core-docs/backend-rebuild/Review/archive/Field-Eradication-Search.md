# Field Eradication Search Plan

## Objective: Complete Removal of 'location' and 'job_number' Fields

Since `location` no longer exists in the database and `job_number` is an unused placeholder, we need to completely eradicate ALL references to these fields from the codebase.

## Search Strategy

### Phase 1: Comprehensive Search

```bash
# 1. Search for 'location' field references (case-sensitive to avoid false positives)
grep -rn "location['\"]" backend/src/ --include="*.js" --include="*.ts"
grep -rn "\.location" backend/src/ --include="*.js" --include="*.ts"
grep -rn "location:" backend/src/ --include="*.js" --include="*.ts"

# 2. Search for 'job_number' field references
grep -rn "job_number" backend/src/ --include="*.js" --include="*.ts"

# 3. Search in SQL queries
grep -rn "location" backend/src/ --include="*.js" | grep -i "select\|insert\|update"
grep -rn "job_number" backend/src/ --include="*.js" | grep -i "select\|insert\|update"

# 4. Search in test files
grep -rn "location" backend/tests/ --include="*.js"
grep -rn "job_number" backend/tests/ --include="*.js"

# 5. Search in migrations
grep -rn "location\|job_number" backend/migrations/
```

### Phase 2: Frontend Search

```bash
# Check if frontend also has references
grep -rn "location['\"]" frontend/src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
grep -rn "job_number" frontend/src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
```

## Expected Locations to Check

### Backend Files
1. **Repositories**
   - `CheckoutRepository.js` - Remove from checkout/return methods
   - `GaugeRepository.js` - Remove from DTOs and queries
   - `OperationsRepository.js` - Check for any references

2. **Services**
   - `OperationsService.js` - Remove from checkout logic
   - `GaugeService.js` - Remove from any validation

3. **Routes**
   - Check all route handlers for these fields

4. **Tests**
   - Update/remove any tests expecting these fields

### Frontend Files
1. **Types**
   - Remove from TypeScript interfaces
   
2. **Components**
   - Remove from forms and displays
   
3. **Services**
   - Remove from API calls

## Replacement Strategy

### For 'location' references:
- If it's meant to be a physical location → Use `storage_location` (gauge entity only)
- If it's in checkout context → REMOVE completely (checkouts don't track location)
- If it's in tests → Update tests to not expect this field

### For 'job_number' references:
- REMOVE completely - it's an unused placeholder
- Don't replace with anything
- Update tests to not send or expect this field

## Validation After Eradication

1. **No build errors** - Code compiles successfully
2. **No runtime errors** - Application runs without field reference errors  
3. **Tests pass** - All tests updated to not use these fields
4. **No database errors** - No SQL referencing non-existent columns
5. **Strict validation active** - Fields are rejected if sent by client

## Code Patterns to Remove

```javascript
// REMOVE patterns like these:
location: checkoutData.location
opts.location
data.location
{ location: 'somevalue' }
.location

// REMOVE patterns like these:
job_number: data.job_number
opts.job_number
{ job_number: 'somevalue' }
.job_number
```

## Final Verification

After eradication, run:
```bash
# Should return NO results
grep -rn "\.location\|location:\|location\[" backend/src/ --include="*.js"
grep -rn "job_number" backend/src/ --include="*.js"

# Run tests to ensure nothing broke
npm test
```