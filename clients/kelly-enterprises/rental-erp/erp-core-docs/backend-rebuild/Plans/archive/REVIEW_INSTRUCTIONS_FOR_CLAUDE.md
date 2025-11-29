# Review Instructions for Claude Code

## Overview
You are reviewing a backend standardization plan that transforms a mixed-pattern codebase into a consistent, secure architecture. A critical SQL injection vulnerability was found in the original plan, so careful security review is essential.

## How to Think

<claude-instructions>
Activate these capabilities:
- Use `--persona-backend` for backend architectural analysis
- Use `--persona-security` for security vulnerability assessment  
- Use `--persona-architect` for system-wide impact analysis
- Use `--think-hard` flag for deep analysis of complex patterns
- Use `--seq` for systematic review of implementation steps
</claude-instructions>

## What to Investigate

### 1. Security Review (CRITICAL)
```bash
# First, check for SQL injection vulnerabilities
grep -r "INSERT INTO.*\${" erp-core-docs/backend-rebuild/Plans/
grep -r "UPDATE.*SET.*\${" erp-core-docs/backend-rebuild/Plans/
grep -r "DELETE FROM.*\${" erp-core-docs/backend-rebuild/Plans/

# Look for string interpolation in SQL
grep -r '\`.*\${.*}\`' erp-core-docs/backend-rebuild/Plans/ --include="*.md"
```

**Key Questions**:
- Are table names properly validated against a whitelist?
- Are column names sanitized before use in queries?
- Are all values using parameterized queries (?) not string interpolation?
- Is there protection against connection pool exhaustion?

### 2. Implementation Order Verification
```bash
# Check if directories exist
ls -la backend/src/infrastructure/repositories 2>/dev/null || echo "Directory missing"
ls -la backend/src/infrastructure/services 2>/dev/null || echo "Directory missing"

# Check for circular dependencies
grep -r "require.*gauge.*services" backend/src/infrastructure/
```

**Key Questions**:
- Do all required directories exist before files are created?
- Are there circular dependencies between infrastructure and modules?
- Does each phase depend only on completed previous phases?
- Is the service registry updated AFTER services exist?

### 3. Database Schema Assumptions
```bash
# Check if all tables have assumed columns
mysql -h localhost -P 3307 -u $DB_USER -p$DB_PASS fai_db_sandbox -e "
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'is_deleted' 
AND table_schema = 'fai_db_sandbox';"
```

**Key Questions**:
- Does the code assume all tables have `is_deleted` column?
- Does it assume all tables have `updated_at` column?
- Are primary key names verified or assumed to be 'id'?
- How does it handle tables with different structures?

### 4. Test Coverage Analysis
```bash
# Check if test paths match actual structure
find backend/tests -type d -name "repositories"
find backend/tests -type d -name "services"

# Verify test commands work
cd backend && npm test -- --version
```

**Key Questions**:
- Do test file paths match the actual test directory structure?
- Are security tests included (SQL injection, connection exhaustion)?
- Is there transaction rollback testing?
- Are there tests for schema detection?

### 5. Pattern Consistency
```bash
# Check existing patterns
grep -r "class.*extends.*BaseRepository" backend/src/
grep -r "class.*extends.*BaseService" backend/src/

# Look for transaction patterns
grep -r "beginTransaction\|commit\|rollback" backend/src/modules/gauge/services/
```

**Key Questions**:
- Do proposed patterns match existing gold standards?
- Is transaction handling consistent?
- Is error handling comprehensive?
- Are connections always released?

## Systematic Review Process

### Step 1: Security Audit
1. Read `/erp-core-docs/backend-rebuild/Plans/critical-issues-found.md` FIRST
2. Verify the secure BaseRepository fixes all identified vulnerabilities
3. Check for any new security issues introduced
4. Test SQL injection prevention with actual attack vectors

### Step 2: Dependency Analysis
1. Map all file dependencies
2. Identify circular dependency risks
3. Verify infrastructure doesn't depend on modules
4. Check service registry initialization order

### Step 3: Implementation Feasibility
1. Try creating the first repository following the plan
2. Verify all imports resolve correctly
3. Check that database connections work
4. Ensure tests can actually run

### Step 4: Risk Assessment
```yaml
High Risk Areas:
- SQL injection in dynamic queries
- Connection pool exhaustion
- Transaction deadlocks
- Breaking existing functionality
- Circular dependencies

For each risk:
- Probability: How likely?
- Impact: How severe?
- Mitigation: How prevented?
- Detection: How monitored?
```

### Step 5: Completeness Check
- [ ] All SQL removed from routes?
- [ ] All SQL removed from services?
- [ ] Transaction support everywhere?
- [ ] Audit trail complete?
- [ ] Error handling consistent?
- [ ] Tests comprehensive?

## Red Flags to Watch For

### Critical Issues
1. **Any string interpolation in SQL**: `${tableName}`, `${column}`
2. **Missing validation**: No whitelist for tables/columns
3. **Connection leaks**: No `finally` blocks releasing connections
4. **Assumed schemas**: Hardcoded column names without checking
5. **Test gaps**: No security or failure testing

### Design Issues
1. **Tight coupling**: Infrastructure depending on specific modules
2. **Missing abstractions**: Direct database access outside repositories
3. **Inconsistent patterns**: Different transaction handling in different places
4. **No rollback strategy**: Can't undo changes if something fails

## What to Test

### Quick Smoke Tests
```javascript
// 1. Test SQL injection prevention
const repo = new BaseRepository('users; DROP TABLE users;--');
// Should throw error

// 2. Test connection timeout
// Exhaust connection pool and verify timeout works

// 3. Test schema detection
// Create repo for table without is_deleted column

// 4. Test transaction rollback
// Force error in middle of transaction
```

### Integration Tests
1. Create a test module following the pattern
2. Verify all layers work together
3. Test cross-module communication
4. Verify audit trail completeness

## Reporting Format

After review, create: `/erp-core-docs/backend-rebuild/Plans/SECURITY_REVIEW_RESULTS.md`

Include:
1. **Security Issues Found** (with severity: CRITICAL/HIGH/MEDIUM/LOW)
2. **Implementation Blockers** (must fix before starting)
3. **Risk Assessment** (probability vs impact matrix)
4. **Recommendations** (specific fixes needed)
5. **Approval Status** (APPROVED/REJECTED/CONDITIONAL)

## Final Checklist

Before approving the plan:
- [ ] No SQL injection vulnerabilities
- [ ] No circular dependencies  
- [ ] All assumptions validated
- [ ] Test strategy comprehensive
- [ ] Rollback plan exists
- [ ] Performance impact assessed
- [ ] Security tests included
- [ ] Documentation accurate

## Remember

1. **Security First**: One SQL injection vulnerability can compromise everything
2. **Test Everything**: Untested code is broken code
3. **Question Assumptions**: Verify every assumed database schema
4. **Think Systemically**: Consider ripple effects across the system
5. **Be Thorough**: Better to find issues now than in production

Good luck with the review! The original plan had critical vulnerabilities, so vigilance is essential.