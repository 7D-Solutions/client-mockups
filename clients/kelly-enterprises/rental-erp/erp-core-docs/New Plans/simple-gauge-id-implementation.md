# Simple Gauge ID Implementation

**Date:** 2025-01-28
**Status:** Final - Simple Long-Term Solution
**Effort:** 2-3K tokens

---

## The Simple Model

### Schema (2 columns only)

```sql
gauges:
  gauge_id   VARCHAR(50) UNIQUE NOT NULL  -- Serial OR generated ID
  set_id     VARCHAR(50) NULL             -- Thread gauge sets only
```

**That's it. Nothing else.**

### All 4 Equipment Types

| Equipment Type | gauge_id Source | gauge_id Example | set_id | Can Have Set? |
|----------------|----------------|------------------|--------|---------------|
| Thread Gauge | User enters serial | "12345", "ABC123" | Can be assigned | ✅ YES |
| Hand Tool | System generates | "CA0001", "MI0023" | Always NULL | ❌ NO (blocked) |
| Large Equipment | System generates | "CMM0001", "OC0005" | Always NULL | ❌ NO (blocked) |
| Calibration Standard | System generates | "GB0001", "MR0012" | Always NULL | ❌ NO (blocked) |

**Constraint enforces:** `CHECK (set_id IS NULL OR equipment_type = 'thread_gauge')`

### Data Examples - All 4 Equipment Types

```sql
-- THREAD GAUGE (unpaired spare)
gauge_id: "12345"              -- Serial number (user enters)
set_id: NULL
equipment_type: 'thread_gauge'

-- THREAD GAUGES (paired in set)
gauge_id: "12345", set_id: "SP1001"  -- GO gauge (serial number)
gauge_id: "12346", set_id: "SP1001"  -- NO GO gauge (serial number)
equipment_type: 'thread_gauge'

-- HAND TOOL
gauge_id: "CA0001"             -- System-generated from prefix config
set_id: NULL                   -- Cannot have set_id (constraint blocks)
equipment_type: 'hand_tool'

-- LARGE EQUIPMENT
gauge_id: "CMM0001"            -- System-generated from prefix config
set_id: NULL                   -- Cannot have set_id (constraint blocks)
equipment_type: 'large_equipment'

-- CALIBRATION STANDARD
gauge_id: "GB0001"             -- System-generated from prefix config
set_id: NULL                   -- Cannot have set_id (constraint blocks)
equipment_type: 'calibration_standard'

-- When damaged thread gauge replaced:
-- Remove old: UPDATE gauges SET set_id = NULL WHERE gauge_id = '12345'
-- Add new:    UPDATE gauges SET set_id = 'SP1001' WHERE gauge_id = '98765'
```

### Display Logic (Computed, Not Stored)

```javascript
function getDisplayId(gauge) {
  if (!gauge.set_id) {
    return gauge.gauge_id; // "12345" or "CA0001"
  }

  // Thread gauge in a set - add suffix
  const isGo = gauge.specifications?.is_go_gauge;
  const suffix = getUserPreference(); // "GO"/"NG" or "A"/"B"

  if (suffix === 'letter') {
    return `${gauge.set_id}${isGo ? 'A' : 'B'}`; // "SP1001A"
  } else {
    return `${gauge.set_id} ${isGo ? 'GO' : 'NG'}`; // "SP1001 GO"
  }
}
```

**User sees:** "SP1001 GO" or "SP1001A" (configurable in settings)
**Database stores:** gauge_id="12345", set_id="SP1001"
**GO/NO GO tracking:** is_go_gauge boolean in gauge_thread_specifications table

---

## Migration Script

```sql
-- ============================================================================
-- Simple Gauge ID Migration - Clean Sheet Approach
-- ============================================================================
-- Note: Test data will be deleted and recreated, no data migration needed

-- Step 1: Add set_id column
ALTER TABLE gauges ADD COLUMN set_id VARCHAR(50) NULL
  COMMENT 'Thread gauge set identifier';

-- Step 2: Index it
CREATE INDEX idx_set_id ON gauges(set_id);

-- Step 3: Add constraint (thread gauges only)
ALTER TABLE gauges
  ADD CONSTRAINT chk_set_id_thread_only
    CHECK (set_id IS NULL OR equipment_type = 'thread_gauge');

-- Step 4: Add is_go_gauge to thread specifications
ALTER TABLE gauge_thread_specifications
  ADD COLUMN is_go_gauge BOOLEAN NULL
  COMMENT 'True for GO gauge, False for NO GO gauge';

-- Step 5: Drop redundant columns
ALTER TABLE gauges DROP COLUMN IF EXISTS system_gauge_id;
ALTER TABLE gauges DROP COLUMN IF EXISTS serial_number;
ALTER TABLE gauges DROP COLUMN IF EXISTS companion_gauge_id;
ALTER TABLE gauges DROP COLUMN IF EXISTS gauge_suffix;

-- Step 6: Ensure gauge_id is required
ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) NOT NULL;

-- Done!
```

**Total:** 6 SQL statements

---

## Code Changes

### 1. GaugeRepository.js

**Remove methods:**
```javascript
// DELETE these entire methods:
async findBySystemGaugeId() { ... }
async findBySerialNumber() { ... }
```

**Update createGauge:**
```javascript
// Remove references to system_gauge_id, serial_number, companion_gauge_id
INSERT INTO gauges (gauge_id, set_id, name, equipment_type, ...)
VALUES (?, ?, ?, ?, ...)
```

### 2. GaugeSetService.js

**Update pairing logic:**
```javascript
async pairSpareGauges(goGaugeId, noGoGaugeId, setId, ...) {
  // OLD: UPDATE companion_gauge_id
  // NEW:
  await connection.execute(
    'UPDATE gauges SET set_id = ? WHERE gauge_id IN (?, ?)',
    [setId, goGaugeId, noGoGaugeId]
  );
}

async unpairGauges(gaugeId, ...) {
  // Get set_id first
  const gauge = await this.repository.findByGaugeId(gaugeId);

  // Clear set_id for all gauges in set
  await connection.execute(
    'UPDATE gauges SET set_id = NULL WHERE set_id = ?',
    [gauge.set_id]
  );
}
```

### 3. Remove Fallback Logic (~10 files)

**Find and replace:**
```javascript
// OLD:
const gaugeId = gauge.gauge_id || gauge.system_gauge_id;

// NEW:
const gaugeId = gauge.gauge_id;
```

**Files to update:**
- CertificateService.js
- gauge-certificates.js (routes)
- ReportsRepository.js
- Any other files with `|| gauge.system_gauge_id`

### 4. Display Helper (Frontend)

**Add to gauge types:**
```typescript
// frontend/src/modules/gauge/types/index.ts

export function getGaugeDisplayId(gauge: Gauge): string {
  if (!gauge.set_id) {
    return gauge.gauge_id; // Unpaired or hand tool
  }

  // Thread gauge in set - compute suffix from is_go_gauge boolean
  const isGo = gauge.specifications?.is_go_gauge;

  // Get user preference from settings (default to letters for now)
  const useLetter = true; // TODO: Get from user settings

  if (useLetter) {
    return `${gauge.set_id}${isGo ? 'A' : 'B'}`;
  } else {
    return `${gauge.set_id} ${isGo ? 'GO' : 'NG'}`;
  }
}
```

**Use in components:**
```typescript
// Instead of: {gauge.gauge_id}
// Use:        {getGaugeDisplayId(gauge)}
```

---

## Settings Configuration (Future)

Add user preference for display format:

```javascript
// System settings table
gauge_display_format: ENUM('letter', 'word') DEFAULT 'letter'

// Results:
'letter' → "SP1001A", "SP1001B"
'word'   → "SP1001 GO", "SP1001 NG"
```

---

## Testing Checklist

**Thread Gauges:**
- [ ] Create unpaired thread gauge: gauge_id="12345" (user enters serial), set_id=NULL
- [ ] Pair into set: both get set_id="SP1001"
- [ ] Display shows: "SP1001 GO" and "SP1001 NG" (or "SP1001A"/"SP1001B")
- [ ] Unpair: set_id becomes NULL for both
- [ ] Replace damaged gauge: remove old from set, add new to set
- [ ] Query by set_id returns all gauges in set

**Hand Tools:**
- [ ] Create hand tool: gauge_id="CA0001" (system generates), set_id=NULL
- [ ] Hand tool CANNOT have set_id (constraint blocks with error)

**Large Equipment:**
- [ ] Create large equipment: gauge_id="CMM0001" (system generates), set_id=NULL
- [ ] Large equipment CANNOT have set_id (constraint blocks with error)

**Calibration Standards:**
- [ ] Create calibration standard: gauge_id="GB0001" (system generates), set_id=NULL
- [ ] Calibration standard CANNOT have set_id (constraint blocks with error)

---

## Implementation Steps

1. **Run migration** (6 SQL statements)
   - Add set_id column to gauges
   - Add is_go_gauge column to gauge_thread_specifications
   - Drop redundant columns (system_gauge_id, serial_number, companion_gauge_id, gauge_suffix)
   - Note: Test data will be deleted and recreated, no data migration needed
2. **Remove 2 repository methods** (findBySystemGaugeId, findBySerialNumber)
3. **Update GaugeSetService** (use set_id instead of companion_gauge_id)
4. **Remove fallback logic** (search for `|| gauge.system_gauge_id`)
5. **Add display helper** (getGaugeDisplayId function using is_go_gauge)
6. **Delete test data and recreate** with new schema
7. **Test all workflows** (including GO/NO GO display)

**Total effort:** 2-3K tokens, 1 session

---

## Why This Is Simple Long-Term

**✅ Minimal columns** - Only 2 identifiers: gauge_id + set_id
**✅ Clear purpose** - gauge_id tracks item, set_id groups thread gauge pairs
**✅ Universal gauge_id** - Works for all 4 equipment types (serial OR generated)
**✅ Flexible display** - Suffix (GO/NG vs A/B) computed, not stored
**✅ Easy replacement** - Thread gauge damaged? Change set_id assignment, gauge_id stays with physical item
**✅ No complex logic** - Simple queries: WHERE gauge_id = ? or WHERE set_id = ?
**✅ Future-proof** - User settings change display format without schema migration
**✅ Database enforced** - Constraint prevents non-thread gauges from having set_id

---

## What We're NOT Doing

❌ No generated columns
❌ No gauge_suffix in gauges table (moved to is_go_gauge boolean in specifications)
❌ No companion_gauge_id FKs
❌ No system_gauge_id redundancy
❌ No complex computed fields
❌ No suffix parsing logic
❌ No hardcoded GO/NO GO values

**Just:** gauge_id + set_id + is_go_gauge boolean + display logic

---

**This is the simple long-term solution.**
