# 🚨 CRITICAL SECURITY ADDENDUM - LIMIT/OFFSET SQL Injection Prevention

## IMMEDIATE ACTION REQUIRED

This addendum addresses a critical security vulnerability identified in the current implementation that was NOT covered by the original Gold Standard Plan.

## The Vulnerability

The following pattern creates a SQL injection vulnerability:

```javascript
// ❌ VULNERABLE CODE - FOUND IN CURRENT IMPLEMENTATION
const query = `
  SELECT * FROM gauges 
  WHERE user_id = ?
  LIMIT ${limitValue} OFFSET ${offsetValue}
`;
```

**Why this is vulnerable**: Even though the WHERE clause uses parameterized queries, the LIMIT and OFFSET values are directly interpolated into the SQL string, allowing SQL injection.

## The Fix

### 1. Secure Pattern for LIMIT/OFFSET

```javascript
// ✅ SECURE PATTERN - MUST BE USED
const query = `
  SELECT * FROM gauges 
  WHERE user_id = ?
  LIMIT ? OFFSET ?
`;
const results = await pool.execute(query, [userId, limitValue, offsetValue]);
```

### 2. Complete Implementation Example

```javascript
// In GaugeRepository.searchGauges() or any pagination method
if (filters.limit) {
  const limitValue = parseInt(filters.limit);
  if (isNaN(limitValue) || limitValue < 1 || limitValue > 1000) {
    throw new Error(`Invalid limit value: must be 1-1000`);
  }

  // Use parameterized queries - MySQL2 v3.x fully supports this
  query += ' LIMIT ?';
  params.push(limitValue);

  if (filters.offset !== undefined) {
    const offsetValue = parseInt(filters.offset);
    if (isNaN(offsetValue) || offsetValue < 0) {
      throw new Error(`Invalid offset value: must be >= 0`);
    }
    query += ' OFFSET ?';
    params.push(offsetValue);
  }
}
```

### 3. Reusable Validation Pattern

```javascript
// Always validate pagination inputs
function validatePagination(page, limit) {
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 10), 1000);
  const offset = (safePage - 1) * safeLimit;
  
  return { limit: safeLimit, offset };
}
```

## MySQL2 Capability Clarification

**CRITICAL CORRECTION**: MySQL2 DOES support parameterized LIMIT/OFFSET queries. Any code comment stating otherwise is incorrect and must be removed.

```javascript
// This works perfectly with MySQL2:
const [rows] = await pool.execute(
  'SELECT * FROM users LIMIT ? OFFSET ?',
  [10, 20]
);
```

## Required Updates to BaseRepository

The BaseRepository class MUST include these security measures:

```javascript
class BaseRepository {
  // ... existing code ...
  
  async findPaginated(filters = {}, page = 1, limit = 10, conn) {
    // CRITICAL: Sanitize pagination inputs
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 10), 100);
    const safePage = Math.max(1, parseInt(page) || 1);
    const offset = (safePage - 1) * safeLimit;
    
    // Build query with parameterized LIMIT/OFFSET
    let query = `SELECT * FROM \`${this.tableName}\` WHERE 1=1`;
    const params = [];
    
    // Add filters...
    
    // CRITICAL: Use placeholders for LIMIT/OFFSET
    query += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, offset);
    
    return this.executeQuery(query, params, conn);
  }
  
  // Add query validation
  validateQuery(query) {
    // Detect template literal usage for LIMIT/OFFSET
    const dangerousPatterns = [
      /LIMIT\s*\$\{/i,
      /OFFSET\s*\$\{/i,
      /LIMIT\s*\`/i,
      /OFFSET\s*\`/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error('SQL Injection detected: LIMIT/OFFSET must use parameterized queries');
      }
    }
  }
}
```

## Required Security Tests

Add these tests to `/backend/tests/security/BaseRepository.security.test.js`:

```javascript
describe('LIMIT/OFFSET Security', () => {
  test('should prevent LIMIT injection', async () => {
    const repo = new BaseRepository('core_users');
    const maliciousLimit = "10; DROP TABLE users; --";
    
    // This should safely handle the malicious input
    const result = await repo.findPaginated({}, 1, maliciousLimit);
    
    // Verify the limit was sanitized to a safe value
    expect(result.length).toBeLessThanOrEqual(100);
  });
  
  test('should detect template literal LIMIT/OFFSET', () => {
    const repo = new BaseRepository('core_users');
    const dangerousQuery = 'SELECT * FROM users LIMIT ${limit}';
    
    expect(() => repo.validateQuery(dangerousQuery))
      .toThrow('SQL Injection detected');
  });
  
  test('should use parameterized queries for pagination', async () => {
    const repo = new BaseRepository('core_users');
    
    // Spy on executeQuery to verify params are passed
    const spy = jest.spyOn(repo, 'executeQuery');
    
    await repo.findPaginated({}, 2, 20);
    
    // Verify LIMIT and OFFSET were passed as parameters
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT ? OFFSET ?'),
      expect.arrayContaining([20, 20]), // limit=20, offset=20
      undefined
    );
  });
});
```

## Test Coverage Requirements

The original plan's lack of test coverage requirements allowed this vulnerability to slip through:

### Minimum Coverage Standards
- **Overall Coverage**: ≥ 80%
- **Security-Critical Code**: ≥ 95%
- **Repository Layer**: ≥ 90%
- **SQL Query Methods**: 100%

### Coverage Enforcement
```json
// Add to package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      },
      "src/infrastructure/repositories/*.js": {
        "branches": 90,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

## Implementation Checklist

- [ ] Update BaseRepository with secure pagination method
- [ ] Add query validation to detect template literal usage
- [ ] Fix ALL existing LIMIT/OFFSET queries to use parameters
- [ ] Add comprehensive security tests
- [ ] Remove misleading MySQL2 comments
- [ ] Set up test coverage thresholds
- [ ] Audit all repositories for this vulnerability
- [ ] Review and update the Gold Standard Plan

## Immediate Actions Required

1. **STOP** all development until this is fixed
2. **AUDIT** all code for LIMIT/OFFSET template literals:
   ```bash
   grep -r "LIMIT.*\${" src/
   grep -r "OFFSET.*\${" src/
   ```
3. **FIX** all vulnerable queries immediately
4. **TEST** with malicious inputs
5. **VERIFY** test coverage meets minimums

## Conclusion

This vulnerability demonstrates that:
1. The Gold Standard Plan had critical gaps
2. Test coverage requirements are essential
3. Security patterns must be explicitly documented
4. All SQL operations need parameterization, not just WHERE clauses

This addendum is now part of the mandatory implementation requirements.