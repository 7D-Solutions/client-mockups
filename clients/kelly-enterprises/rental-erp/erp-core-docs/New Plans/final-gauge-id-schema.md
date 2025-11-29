# Final Gauge ID Schema Design

**Date:** 2025-01-28
**Status:** Approved for Implementation
**Priority:** High - Foundation Improvement

---

## Executive Summary

**Problem:** Current schema has redundant columns (`system_gauge_id`, `serial_number`) causing confusion and maintenance burden.

**Solution:** Unified schema using `gauge_id` as universal public identifier + `set_id` for thread gauge pairing.

**Benefits:**
- ✅ Single source of truth (`gauge_id`)
- ✅ No data redundancy
- ✅ Clear purpose for each column
- ✅ Simpler lookup logic
- ✅ Semantic URLs for all equipment

---

## Final Schema

```sql
CREATE TABLE gauges (
  -- Primary Keys & Identifiers
  id                INT PRIMARY KEY AUTO_INCREMENT,      -- Internal DB relationships only
  gauge_id          VARCHAR(50) UNIQUE NOT NULL,        -- Public identifier (universal)
  set_id            VARCHAR(50) NULL,                   -- Thread gauge set grouping ONLY

  -- Equipment Classification
  equipment_type    ENUM('thread_gauge','hand_tool','large_equipment','calibration_standard') NOT NULL,
  category_id       INT NOT NULL,

  -- Core Fields
  name              VARCHAR(255) NOT NULL,
  status            ENUM('available','checked_out','calibration_due','pending_qc',
                         'out_of_service','pending_unseal','retired',
                         'out_for_calibration','pending_certificate','returned') DEFAULT 'available',
  storage_location  VARCHAR(255),

  -- Metadata
  is_spare          BOOLEAN DEFAULT FALSE,
  is_sealed         BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  is_deleted        BOOLEAN DEFAULT FALSE,
  created_by        INT NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_set_id_thread_only
    CHECK (set_id IS NULL OR equipment_type = 'thread_gauge'),

  -- Foreign Keys
  CONSTRAINT fk_gauge_category
    FOREIGN KEY (category_id) REFERENCES gauge_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_gauge_created_by
    FOREIGN KEY (created_by) REFERENCES core_users(id) ON DELETE RESTRICT,

  -- Indexes
  UNIQUE INDEX idx_gauge_id (gauge_id),
  INDEX idx_set_id (set_id),
  INDEX idx_equipment_type (equipment_type),
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  INDEX idx_is_deleted (is_deleted)

) ENGINE=InnoDB COMMENT='Unified gauge tracking - gauge_id is public identifier, set_id groups thread gauge pairs';
```

---

## Field Definitions

### gauge_id (VARCHAR(50) UNIQUE NOT NULL)

**Purpose:** Universal public identifier for all equipment types

**Format by Equipment Type:**

| Equipment Type | Format | Example | Source |
|----------------|--------|---------|--------|
| Thread Gauge | Serial number | "12345", "ABC123", "GO-98765" | User enters |
| Hand Tool | Prefix + Sequence | "CA0001", "MI0023" | System generates |
| Large Equipment | Prefix + Sequence | "CMM0001", "OC0005" | System generates |
| Calibration Standard | Prefix + Sequence | "GB0001", "MR0012" | System generates |

**Key Points:**
- Used in URLs: `/gauges/12345`, `/gauges/CA0001`
- Displayed to users as primary identifier
- Permanent - does not change during gauge lifecycle
- For thread gauges: Tracks the **physical gauge** (serial number)
- For other equipment: Tracks the **system position**

### set_id (VARCHAR(50) NULL)

**Purpose:** Groups thread gauge pairs (GO/NO GO sets)

**Usage:**
- **Thread Gauges Only** - CHECK constraint enforces this
- Format: Prefix + Sequence (e.g., "SP1001", "MR0042")
- Generated from `gauge_id_config` table using category prefix
- User can override suggested value
- Used to find companion gauges: `WHERE set_id = 'SP1001'`

**Examples:**
```sql
-- Unpaired thread gauge
gauge_id: "12345", set_id: NULL

-- Paired thread gauge set
gauge_id: "12345", set_id: "SP1001"  -- Go gauge
gauge_id: "12346", set_id: "SP1001"  -- No Go gauge

-- Hand tool (cannot have set_id)
gauge_id: "CA0001", set_id: NULL  -- Enforced by CHECK constraint
```

---

## Removed Columns

### system_gauge_id (REMOVED)
**Reason:** 95% redundant with `gauge_id`
**Replacement:** Use `gauge_id` for all lookups

### serial_number (REMOVED)
**Reason:** Merged into `gauge_id` for thread gauges
**Replacement:**
- Thread gauges: `gauge_id` stores serial number
- Other equipment: `gauge_id` stores system-generated ID

### companion_gauge_id (REMOVED)
**Reason:** Replaced by `set_id` query pattern
**Replacement:** Find companions with `WHERE set_id = ? AND id != current_id`

---

## Data Examples

### Thread Gauge Lifecycle

```sql
-- 1. Created as unpaired spare
INSERT INTO gauges (gauge_id, set_id, equipment_type, category_id, name, created_by)
VALUES ('12345', NULL, 'thread_gauge', 31, '.500-20 UN 2A Thread Plug Gauge GO', 1);

-- 2. Paired into set SP1001
UPDATE gauges SET set_id = 'SP1001' WHERE gauge_id = '12345';
UPDATE gauges SET set_id = 'SP1001' WHERE gauge_id = '12346';

-- 3. Find all gauges in set
SELECT * FROM gauges WHERE set_id = 'SP1001';
-- Returns: gauge_id "12345" and "12346"

-- 4. Find companion gauge
SELECT * FROM gauges
WHERE set_id = (SELECT set_id FROM gauges WHERE gauge_id = '12345')
  AND gauge_id != '12345';
-- Returns: gauge_id "12346"

-- 5. Unpair (break the set)
UPDATE gauges SET set_id = NULL WHERE gauge_id IN ('12345', '12346');
```

### Hand Tool Lifecycle

```sql
-- 1. Created with system-generated gauge_id
-- System calls GaugeIdService.generateSystemId(category_id=7)
-- Returns: "CA0001"

INSERT INTO gauges (gauge_id, set_id, equipment_type, category_id, name, created_by)
VALUES ('CA0001', NULL, 'hand_tool', 7, '0-6inches Digital Caliper', 1);

-- 2. Lookup by gauge_id
SELECT * FROM gauges WHERE gauge_id = 'CA0001';

-- 3. Cannot create set (constraint violation)
UPDATE gauges SET set_id = 'INVALID' WHERE gauge_id = 'CA0001';
-- ERROR: Check constraint 'chk_set_id_thread_only' is violated
```

---

## URL Routing

### Frontend Routes

```javascript
// Individual gauge detail
/gauges/12345           → Thread gauge (serial number)
/gauges/CA0001          → Hand tool (generated ID)

// Set view
/gauges/sets/SP1001     → Shows all gauges where set_id = 'SP1001'
```

### Backend Routes

```javascript
// GET /api/gauges/:gaugeId
router.get('/:gaugeId', async (req, res) => {
  const { gaugeId } = req.params;

  // Single universal lookup
  const gauge = await gaugeRepository.findByGaugeId(gaugeId);

  if (!gauge) {
    return res.status(404).json({ error: 'Gauge not found' });
  }

  res.json({ success: true, data: gauge });
});

// GET /api/gauges/sets/:setId
router.get('/sets/:setId', async (req, res) => {
  const { setId } = req.params;

  // Find all gauges in set
  const gauges = await gaugeRepository.findBySetId(setId);

  res.json({ success: true, data: gauges });
});
```

---

## Migration Script

```sql
-- Migration: Unified Gauge ID System
-- Date: 2025-01-28
-- Purpose: Remove redundant columns, establish gauge_id as universal identifier

-- ============================================================================
-- STEP 1: Add set_id column for thread gauge pairing
-- ============================================================================

ALTER TABLE gauges
  ADD COLUMN set_id VARCHAR(50) NULL
    COMMENT 'Thread gauge set identifier - NULL for all non-thread gauges';

CREATE INDEX idx_set_id ON gauges(set_id);

-- ============================================================================
-- STEP 2: Migrate existing data
-- ============================================================================

-- For thread gauges: Ensure gauge_id contains the serial number
-- (Assuming current data already has this - verify first!)

-- Option A: If gauge_id already contains serial numbers
-- No migration needed for gauge_id

-- Option B: If serial_number is separate column and needs to be copied
-- UPDATE gauges
-- SET gauge_id = serial_number
-- WHERE equipment_type = 'thread_gauge'
--   AND serial_number IS NOT NULL;

-- For hand tools: gauge_id should already be system-generated (CA0001, MI0023)
-- Verify this is correct before proceeding

-- ============================================================================
-- STEP 3: Add set_id constraint (thread gauges only)
-- ============================================================================

ALTER TABLE gauges
  ADD CONSTRAINT chk_set_id_thread_only
    CHECK (set_id IS NULL OR equipment_type = 'thread_gauge');

-- ============================================================================
-- STEP 4: Ensure gauge_id is NOT NULL and UNIQUE
-- ============================================================================

-- Verify no NULL gauge_ids exist
SELECT COUNT(*) FROM gauges WHERE gauge_id IS NULL;
-- Should return 0

ALTER TABLE gauges
  MODIFY COLUMN gauge_id VARCHAR(50) NOT NULL;

-- Add unique constraint if not exists
ALTER TABLE gauges
  ADD UNIQUE INDEX idx_gauge_id_unique (gauge_id);

-- ============================================================================
-- STEP 5: Drop redundant columns
-- ============================================================================

ALTER TABLE gauges DROP COLUMN IF EXISTS system_gauge_id;
ALTER TABLE gauges DROP COLUMN IF EXISTS serial_number;
ALTER TABLE gauges DROP COLUMN IF EXISTS companion_gauge_id;

-- ============================================================================
-- STEP 6: Update table comment
-- ============================================================================

ALTER TABLE gauges
  COMMENT = 'Unified gauge tracking - gauge_id is public identifier, set_id groups thread gauge pairs';

-- ============================================================================
-- STEP 7: Verification queries
-- ============================================================================

-- Verify gauge_id is unique and not null
SELECT COUNT(*) as total, COUNT(DISTINCT gauge_id) as unique_ids
FROM gauges;
-- total should equal unique_ids

-- Verify set_id only on thread gauges
SELECT COUNT(*) FROM gauges
WHERE set_id IS NOT NULL AND equipment_type != 'thread_gauge';
-- Should return 0

-- Verify no orphaned sets (sets with only 1 gauge)
SELECT set_id, COUNT(*) as gauge_count
FROM gauges
WHERE set_id IS NOT NULL
GROUP BY set_id
HAVING COUNT(*) = 1;
-- Review any results - may indicate incomplete sets

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'Migration completed successfully!' as status,
       'gauge_id is now universal identifier, set_id groups thread gauge pairs' as message;
```

---

## Repository Changes

### GaugeRepository.js

```javascript
class GaugeRepository extends BaseRepository {

  /**
   * Find gauge by gauge_id (universal public identifier)
   */
  async findByGaugeId(gaugeId, connection = null) {
    return await this._fetchGaugeByField('gauge_id', gaugeId, connection);
  }

  /**
   * Find all gauges in a set
   */
  async findBySetId(setId, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const { sql, params } = buildGaugeQuery(
        `WHERE g.set_id = ? AND g.is_deleted = 0`,
        [setId]
      );
      const gauges = await this.executeQuery(sql, params, conn);

      return gauges.map(gauge => GaugeDTOMapper.transformToDTO(gauge));
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Find companion gauge(s) in same set
   */
  async findCompanionGauges(gaugeId, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      // First get the gauge's set_id
      const [gauges] = await conn.execute(
        'SELECT set_id FROM gauges WHERE gauge_id = ?',
        [gaugeId]
      );

      if (!gauges.length || !gauges[0].set_id) {
        return []; // No set or unpaired
      }

      const setId = gauges[0].set_id;

      // Find all other gauges in same set
      const { sql, params } = buildGaugeQuery(
        `WHERE g.set_id = ? AND g.gauge_id != ? AND g.is_deleted = 0`,
        [setId, gaugeId]
      );
      const companions = await this.executeQuery(sql, params, conn);

      return companions.map(gauge => GaugeDTOMapper.transformToDTO(gauge));
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Create gauge with gauge_id
   */
  async createGauge(gaugeData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      const dbData = GaugeDTOMapper.transformFromDTO(gaugeData);

      const res = await this.executeQuery(
        `INSERT INTO gauges (
          gauge_id, set_id, name, equipment_type, category_id,
          status, storage_location, is_spare, is_sealed, is_active,
          is_deleted, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          dbData.gauge_id,          // Required - either serial or generated
          dbData.set_id || null,    // NULL for unpaired/non-thread
          dbData.name,
          dbData.equipment_type,
          dbData.category_id,
          dbData.status || 'available',
          dbData.storage_location,
          dbData.is_spare ? 1 : 0,
          dbData.is_sealed ? 1 : 0,
          1, // is_active
          0, // is_deleted
          dbData.created_by
        ],
        connection
      );

      const gaugeId = res.insertId;

      if (shouldCommit) await connection.commit();

      return await this.findById(gaugeId, connection);
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  // REMOVE these methods:
  // - findBySystemGaugeId() - no longer needed
  // - findBySerialNumber() - merged into findByGaugeId()
}
```

---

## Service Changes

### GaugeSetService.js

```javascript
class GaugeSetService extends BaseService {

  /**
   * Suggest set_id for pairing thread gauges
   */
  async suggestSetId(categoryId, gaugeType) {
    const gaugeIdService = serviceRegistry.get('GaugeIdService');

    // Generate next set_id from prefix config
    const setId = await gaugeIdService.generateSystemId(
      categoryId,
      gaugeType,
      null  // No suffix for set_id
    );

    return setId; // e.g., "SP1001"
  }

  /**
   * Pair two thread gauges into a set
   */
  async pairGauges(goGaugeId, noGoGaugeId, setId = null) {
    return this.executeInTransaction(async (connection) => {
      // Get both gauges
      const goGauge = await this.repository.findByGaugeId(goGaugeId, connection);
      const noGoGauge = await this.repository.findByGaugeId(noGoGaugeId, connection);

      if (!goGauge || !noGoGauge) {
        throw new Error('One or both gauges not found');
      }

      // Validate both are thread gauges
      if (goGauge.equipment_type !== 'thread_gauge' ||
          noGoGauge.equipment_type !== 'thread_gauge') {
        throw new Error('Both gauges must be thread gauges');
      }

      // Validate neither is already in a set
      if (goGauge.set_id || noGoGauge.set_id) {
        throw new Error('One or both gauges already paired');
      }

      // Generate set_id if not provided
      if (!setId) {
        setId = await this.suggestSetId(
          goGauge.category_id,
          goGauge.specifications?.gauge_type
        );
      }

      // Update both gauges with set_id
      await connection.execute(
        'UPDATE gauges SET set_id = ? WHERE gauge_id IN (?, ?)',
        [setId, goGaugeId, noGoGaugeId]
      );

      // Return both gauges
      return {
        setId,
        gauges: [
          await this.repository.findByGaugeId(goGaugeId, connection),
          await this.repository.findByGaugeId(noGoGaugeId, connection)
        ]
      };
    });
  }

  /**
   * Unpair gauges (break the set)
   */
  async unpairGauges(setId) {
    return this.executeInTransaction(async (connection) => {
      // Clear set_id from all gauges in set
      await connection.execute(
        'UPDATE gauges SET set_id = NULL WHERE set_id = ?',
        [setId]
      );

      return { success: true, message: 'Gauges unpaired successfully' };
    });
  }
}
```

---

## Frontend Changes

### Minimal Updates Required

**Current code already uses `gauge_id`!** ✅

```typescript
// GaugeRow.tsx - Already correct
<Link to={`/gauges/${gauge.gauge_id}`}>

// gaugeService.ts - Already correct
async getById(id: string): Promise<Gauge> {
  const response = await apiClient.get<{ data: Gauge }>(`/gauges/${id}`);
  return response.data || response;
}

// Routes - Already correct
<Route path="/detail/:id" element={<GaugeDetail />} />
```

**New additions needed:**

```typescript
// Add set view route
<Route path="/sets/:setId" element={<SetDetailPage />} />

// Add set service methods
async getGaugeSet(setId: string): Promise<Gauge[]> {
  const response = await apiClient.get<{ data: Gauge[] }>(`/gauges/sets/${setId}`);
  return response.data || response;
}
```

---

## Testing Checklist

### Schema Validation
- [ ] gauge_id is UNIQUE and NOT NULL
- [ ] set_id can be NULL
- [ ] CHECK constraint prevents non-thread gauges from having set_id
- [ ] Indexes exist on gauge_id and set_id

### Data Migration
- [ ] All existing gauges have valid gauge_id
- [ ] Thread gauges retain serial numbers as gauge_id
- [ ] Hand tools have system-generated gauge_ids
- [ ] No duplicate gauge_ids exist
- [ ] Redundant columns successfully dropped

### Functionality
- [ ] Create unpaired thread gauge (gauge_id = serial, set_id = NULL)
- [ ] Pair thread gauges (both get same set_id)
- [ ] Query gauges by set_id returns correct results
- [ ] Find companion gauge using set_id works
- [ ] Unpair gauges (set_id = NULL) works
- [ ] Create hand tool with generated gauge_id
- [ ] Hand tool cannot have set_id (constraint violation)
- [ ] URL routing works: /gauges/12345, /gauges/CA0001
- [ ] Set view works: /gauges/sets/SP1001

### Edge Cases
- [ ] Attempting to pair non-thread gauge fails
- [ ] Attempting to pair already-paired gauge fails
- [ ] Breaking set with only 1 gauge works
- [ ] gauge_id uniqueness enforced (duplicate insert fails)
- [ ] Null set_id allowed for thread gauges
- [ ] Set with 3+ gauges (if allowed)

---

## Performance Considerations

### Query Patterns

**Fast (indexed):**
```sql
-- Single gauge lookup
SELECT * FROM gauges WHERE gauge_id = 'CA0001';  -- Uses idx_gauge_id

-- Set lookup
SELECT * FROM gauges WHERE set_id = 'SP1001';    -- Uses idx_set_id

-- Find companion
SELECT * FROM gauges
WHERE set_id = (SELECT set_id FROM gauges WHERE gauge_id = '12345')
  AND gauge_id != '12345';
-- Two indexed queries
```

**Acceptable:**
```sql
-- Count gauges in set
SELECT COUNT(*) FROM gauges WHERE set_id = 'SP1001';  -- Uses idx_set_id
```

### Index Strategy

- **idx_gauge_id (UNIQUE)** - Primary lookup, very fast
- **idx_set_id** - Set queries, fast
- **idx_equipment_type** - Filter by type
- **idx_category** - Category filtering
- **idx_status** - Status filtering

---

## Rollback Plan

If issues discovered post-deployment:

```sql
-- Emergency rollback: Restore old columns temporarily

-- Add back old columns
ALTER TABLE gauges
  ADD COLUMN system_gauge_id VARCHAR(50) NULL,
  ADD COLUMN serial_number VARCHAR(50) NULL,
  ADD COLUMN companion_gauge_id INT NULL;

-- Populate from gauge_id (for thread gauges)
UPDATE gauges
SET serial_number = gauge_id
WHERE equipment_type = 'thread_gauge';

UPDATE gauges
SET system_gauge_id = gauge_id;

-- Can run dual-column system temporarily
-- Then fix issues and re-run forward migration
```

---

## Success Criteria

**Schema:**
- ✅ Single universal `gauge_id` column
- ✅ Clear purpose for `set_id` (thread gauge pairing only)
- ✅ No redundant data
- ✅ Strong constraints (CHECK, UNIQUE, NOT NULL)

**Functionality:**
- ✅ All gauge types use `gauge_id` for identification
- ✅ Thread gauges can be paired using `set_id`
- ✅ URLs are semantic and match user expectations
- ✅ No breaking changes to existing frontend code

**Performance:**
- ✅ Fast lookups via indexed `gauge_id`
- ✅ Fast set queries via indexed `set_id`
- ✅ No complex joins required

**Maintainability:**
- ✅ Simple mental model: one ID field, one grouping field
- ✅ Clear documentation
- ✅ Comprehensive test coverage

---

## Implementation Estimate

**5-8K tokens:**
- Migration script execution (1K)
- Remove `system_gauge_id` references (~10 files) (2-3K)
- Remove `serial_number` references (~5 files) (1K)
- Remove `companion_gauge_id` logic (~3 files) (1K)
- Add `set_id` pairing logic (1K)
- Update DTO mapper (500 tokens)
- Testing and validation (1-2K)

**Timeline:** 1-2 sessions

---

## Next Steps

1. **Review and approve** this design
2. **Backup database** (full dump before migration)
3. **Execute migration** on test environment
4. **Validate data integrity** (run verification queries)
5. **Update application code** (repository, services, routes)
6. **Test all gauge operations** (create, pair, unpair, lookup)
7. **Deploy to production**

---

**Document Status:** ✅ Final - Ready for Implementation
