# Rollback Plan

**Purpose**: Emergency procedure to restore `standardized_name` functionality if critical issues are discovered.

**Warning**: This should only be used if critical production issues occur. The refactor is well-tested and rollback should be unnecessary.

---

## When to Rollback

Rollback ONLY if:
- ✅ Critical production bug discovered
- ✅ Performance degradation > 100ms
- ✅ Data integrity issues detected
- ✅ Unable to fix forward in < 1 hour

Do NOT rollback for:
- ❌ Minor UI issues (fix forward)
- ❌ Missing features (implement them)
- ❌ Preference changes (not critical)

---

## Quick Rollback (Emergency)

### Step 1: Restore Database

```bash
# Find backup file
ls -lh backup_before_migration_*.sql

# Restore from backup
mysql -h localhost -P 3307 -u root -p'fireproof2024' fai_db_sandbox < backup_before_migration_20251028.sql

# Verify column restored
mysql -h localhost -P 3307 -u root -p'fireproof2024' -D fai_db_sandbox -e "DESCRIBE gauges;" | grep standardized_name
```

### Step 2: Revert Code Changes

```bash
# Revert last commit
git revert HEAD

# Or revert to specific commit
git log --oneline -5  # Find commit before refactor
git revert <commit-hash>

# Push revert
git push origin development-core
```

### Step 3: Restart Services

```bash
docker-compose restart backend frontend
```

### Step 4: Verify Rollback

```bash
# Test API
curl http://localhost:8000/api/gauges/v2/1 | jq '.standardized_name'

# Should return the old field name
```

**Total Time**: ~5 minutes

---

## Detailed Rollback (If Database Backup Not Available)

### Step 1: Re-add standardized_name Column

```sql
-- Add column back
ALTER TABLE gauges
ADD COLUMN standardized_name VARCHAR(255) NOT NULL DEFAULT ''
AFTER name;

-- Add index
CREATE INDEX idx_standardized_name ON gauges(standardized_name);

-- Re-add FULLTEXT index
CREATE FULLTEXT INDEX idx_search
ON gauges(gauge_id, custom_id, name, standardized_name, serial_number);
```

### Step 2: Backfill Data

```sql
-- Regenerate standardized names from specifications
UPDATE gauges g
INNER JOIN gauge_thread_specifications ts ON g.id = ts.gauge_id
SET g.standardized_name = CONCAT(
  -- Convert fractions to decimals (simplified - may need adjustment)
  CASE
    WHEN ts.thread_size LIKE '%/%' THEN
      CONCAT('.', LPAD(FLOOR((SUBSTRING_INDEX(ts.thread_size, '/', 1) / SUBSTRING_INDEX(SUBSTRING_INDEX(ts.thread_size, '/', -1), '-', 1)) * 1000), 3, '0'))
    ELSE ts.thread_size
  END,
  ' ',
  IFNULL(ts.thread_form, ''),
  ' ',
  ts.thread_class,
  ' Thread ',
  ts.gauge_type,
  ' Gauge',
  CASE g.gauge_suffix
    WHEN 'A' THEN ' GO'
    WHEN 'B' THEN ' NO GO'
    ELSE ''
  END
)
WHERE g.equipment_type = 'thread_gauge';

-- For non-thread gauges, use the name field
UPDATE gauges
SET standardized_name = name
WHERE equipment_type != 'thread_gauge' AND standardized_name = '';
```

### Step 3: Verify Data

```sql
-- Check for any empty standardized_name values
SELECT COUNT(*) FROM gauges WHERE standardized_name = '';

-- Sample check
SELECT gauge_id, standardized_name, name
FROM gauges
LIMIT 10;
```

### Step 4: Restore Backend Code

**Option A**: Revert Git commits (preferred)
```bash
git revert HEAD
```

**Option B**: Manual code restoration

Restore these methods to `GaugeCreationService.js`:
```javascript
generateStandardizedName(gaugeData) {
  const { equipment_type, thread_size, thread_form, thread_class, gauge_type } = gaugeData;

  if (equipment_type === 'thread_gauge') {
    const size = this.convertToDecimal(thread_size);
    let name = `${size} ${thread_form === undefined ? '' : thread_form} ${thread_class} Thread ${gauge_type} Gauge`.trim();

    const GaugeIdService = require('./GaugeIdService');
    const suffix = GaugeIdService.getGaugeSuffix(gaugeData.system_gauge_id);
    if (suffix === 'A') name += ' GO';
    else if (suffix === 'B') name += ' NO GO';

    return name;
  }

  return gaugeData.name || gaugeData.standardized_name;
}

convertToDecimal(size) {
  if (!size) return size;

  if (size.includes('/')) {
    const [numerator, denominator] = size.split('/').map(Number);
    if (denominator > 0) {
      return '.' + Math.floor(numerator / denominator * 1000).toString().padStart(3, '0');
    }
  }

  const NUMBER_SIZES = {
    '0': '.060', '1': '.073', '2': '.086', '3': '.099',
    '4': '.112', '5': '.125', '6': '.138', '8': '.164',
    '10': '.190', '12': '.216'
  };

  return NUMBER_SIZES[size] || size;
}
```

### Step 5: Restore Frontend Code

```bash
cd frontend/src

# Replace displayName with standardized_name
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/displayName/standardized_name/g' {} +
```

Update TypeScript types:
```typescript
export interface Gauge {
  standardized_name: string;  // Restored
  // ...
}
```

### Step 6: Remove New Code

```bash
# Remove presenter (if it was added)
rm backend/src/modules/gauge/presenters/GaugePresenter.js
rm backend/tests/modules/gauge/presenters/GaugePresenter.test.js
```

### Step 7: Test Rollback

```bash
# Backend tests
cd backend && npm test

# Frontend build
cd frontend && npm run build

# Manual verification
# - List gauges
# - View gauge detail
# - Search gauges
# - Create new gauge
```

---

## Partial Rollback (Keep Presenter, Restore Column)

If you want to keep the new architecture but restore backward compatibility:

### Step 1: Add Column Without Removing Presenter

```sql
ALTER TABLE gauges
ADD COLUMN standardized_name VARCHAR(255) GENERATED ALWAYS AS (
  -- Would need complex expression here, not practical
) VIRTUAL;
```

**Not Recommended**: MySQL generated columns can't use subqueries, making this impractical.

### Step 2: Use Trigger to Maintain Compatibility

```sql
DELIMITER $$

CREATE TRIGGER sync_standardized_name_on_insert
AFTER INSERT ON gauge_thread_specifications
FOR EACH ROW
BEGIN
  UPDATE gauges
  SET standardized_name = (
    SELECT CONCAT(
      NEW.thread_size, ' ',
      IFNULL(NEW.thread_form, ''), ' ',
      NEW.thread_class, ' Thread ',
      NEW.gauge_type, ' Gauge',
      CASE g.gauge_suffix
        WHEN 'A' THEN ' GO'
        WHEN 'B' THEN ' NO GO'
        ELSE ''
      END
    )
    FROM gauges g
    WHERE g.id = NEW.gauge_id
  )
  WHERE id = NEW.gauge_id;
END$$

CREATE TRIGGER sync_standardized_name_on_update
AFTER UPDATE ON gauge_thread_specifications
FOR EACH ROW
BEGIN
  UPDATE gauges
  SET standardized_name = (
    SELECT CONCAT(
      NEW.thread_size, ' ',
      IFNULL(NEW.thread_form, ''), ' ',
      NEW.thread_class, ' Thread ',
      NEW.gauge_type, ' Gauge',
      CASE g.gauge_suffix
        WHEN 'A' THEN ' GO'
        WHEN 'B' THEN ' NO GO'
        ELSE ''
      END
    )
    FROM gauges g
    WHERE g.id = NEW.gauge_id
  )
  WHERE id = NEW.gauge_id;
END$$

DELIMITER ;
```

**Not Recommended**: Creates technical debt we're trying to avoid.

---

## Post-Rollback Actions

### Step 1: Document What Went Wrong

Create incident report:
```markdown
# Rollback Incident Report

**Date**: [Date]
**Rolled Back By**: [Name]
**Reason**: [Detailed reason for rollback]

## Issues Encountered
- [Issue 1]
- [Issue 2]

## Root Cause
[Analysis of what caused the issues]

## Lessons Learned
[What we learned]

## Future Prevention
[How to prevent similar issues]
```

### Step 2: Analyze Root Cause

- Was it a code bug? → Fix and re-deploy
- Was it a performance issue? → Add indexes or caching
- Was it a misunderstanding? → Improve documentation
- Was it an edge case? → Add tests and fix

### Step 3: Plan Re-Attempt

If rollback was necessary, plan how to successfully implement the refactor:
1. Identify gaps in testing
2. Add missing test cases
3. Implement fixes
4. Re-test thoroughly
5. Re-attempt deployment

---

## Prevention Checklist

To avoid needing rollback, ensure:

- [ ] All tests pass (unit, integration, E2E)
- [ ] Manual testing completed
- [ ] Performance benchmarks run
- [ ] Database backup created
- [ ] Rollback plan reviewed and understood
- [ ] Team trained on changes
- [ ] Monitoring in place to detect issues early

---

## Rollback Decision Tree

```
Issue Detected
├─ Is it critical? (production down, data loss, security)
│  ├─ YES → Immediate rollback
│  └─ NO → Can we fix forward in < 1 hour?
│     ├─ YES → Fix forward
│     └─ NO → Rollback
│
├─ Is it performance? (> 100ms degradation)
│  ├─ YES → Can we add index or cache?
│     ├─ YES → Try optimization first
│     └─ NO → Rollback
│  └─ NO → Fix forward
│
└─ Is it a feature gap?
   └─ → Fix forward (don't rollback for missing features)
```

---

## Communication Template

If rollback is necessary, notify team:

```
Subject: URGENT: Standardized Name Refactor Rolled Back

Team,

We've rolled back the standardized_name removal due to [REASON].

Status: [Database restored / Code reverted / Services restarted]

Impact: [What users experienced]

Next Steps:
1. [Fix identified issues]
2. [Add missing tests]
3. [Re-attempt deployment on DATE]

Questions? Contact [NAME]
```

---

## Success Criteria (No Rollback Needed)

If these are all true, NO rollback needed:
- ✅ All gauges display correctly
- ✅ Search works as expected
- ✅ Performance within acceptable range (< 10ms degradation)
- ✅ No data integrity issues
- ✅ No critical bugs reported within 24 hours

---

**Document Version**: 1.0
**Last Updated**: 2025-10-28
**Status**: Emergency Procedures Only
