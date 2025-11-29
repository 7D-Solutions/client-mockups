# Thread Gauge Identifier System - CRITICAL ARCHITECTURE REVIEW

**Status**: ⚠️ **CONFLICT IDENTIFIED** - Needs User Decision
**Impact**: Database, Backend (232 tests), Frontend
**Breaking Changes**: Yes - Major system redesign
**Data**: All test data - can be wiped/recreated

---

## 🚨 CRITICAL CONFLICT DISCOVERED

### Documentation Review Findings

After reviewing `/erp-core-docs/gauge-standardization/Plan/`, I found that:

1. **Backend is 100% complete** with 232/232 passing integration tests
2. **Existing system uses `gauge_id` as PRIMARY identifier** for all gauges (paired and unpaired)
3. **All workflows depend on `gauge_id`**: pairing, calibration, checkout, replacement
4. **Database constraint**: `gauge_id` is UNIQUE and NOT NULL
5. **Unpaired gauges currently**: `gauge_id = "TG0456A"` (full ID with suffix)

### User's New Requirement

- **Spare thread gauges**: `gauge_id = NULL`, identified by SERIAL NUMBER ONLY
- **Thread gauge sets**: `gauge_id = SP####A/B` assigned ONLY when paired
- Serial number becomes REQUIRED for thread gauges

### The Fundamental Conflict

**This is NOT a simple display change** - it's a complete architectural redesign:

| System Component | Current (Existing Backend) | User's New Requirement | Impact |
|------------------|---------------------------|------------------------|--------|
| Primary Key | `gauge_id` (NOT NULL) | `serial_number` or nullable `gauge_id` | Breaking change |
| Unpaired Gauge ID | `TG0456A` | `NULL` (use serial instead) | All queries break |
| API Responses | `{ gauge_id: "TG0456A" }` | `{ gauge_id: null, serial: "KZF123" }` | Frontend breaks |
| Database Queries | `WHERE gauge_id = ?` | `WHERE serial_number = ?` OR `gauge_id = ?` | Backend rewrites |
| Integration Tests | 232 passing tests | All tests need rewrite | Massive effort |
| Existing Workflows | Calibration, pairing, checkout all use `gauge_id` | Need dual identifier support | Complex refactor |

---

## Decision Required: Choose Implementation Approach

### Option A: Full System Redesign (CORRECT but MASSIVE)

**Align with user's requirement completely**

**Changes**:
- Make `gauge_id` nullable in database
- Rewrite all backend services to use `(gauge_id OR serial_number)` logic
- Update all 232 integration tests
- Modify all API endpoints
- Rewrite frontend components
- Update calibration, checkout, pairing workflows

**Impact**:
- ✅ Clean architecture aligned with user's vision
- ✅ Serial number is truly the identifier for spares
- ❌ 50+ backend files need modification
- ❌ All 232 tests need rewriting
- ❌ Weeks of development work
- ❌ High risk of breaking existing functionality

**Estimated Effort**: 3-4 weeks full-time development

---

### Option B: Hybrid Approach (PRACTICAL but COMPROMISE)

**Keep existing backend, change only display logic**

**Changes**:
- Keep `gauge_id` as NOT NULL primary identifier
- For unpaired thread gauges: Auto-generate `gauge_id = "SN-{serial_number}"`
- On pairing: Replace with `SP####A/B`
- **Frontend displays serial number**, backend uses `gauge_id` internally
- Minimal backend changes, existing tests continue passing

**Impact**:
- ✅ Minimal disruption to existing backend
- ✅ 232 tests continue passing
- ✅ Quick implementation (3-5 days)
- ✅ Low risk
- ❌ Database still has `gauge_id` for spares (hidden from user)
- ❌ Not truly nullable `gauge_id`
- ❌ Compromise on architectural purity

**Estimated Effort**: 3-5 days

---

### Option C: New Parallel System (CLEAN SLATE)

**Build new serial-based system alongside existing gauge_id system**

**Changes**:
- Add new `serial_number_index` system
- Create new API endpoints (`/api/gauges/v3/`) for serial-based operations
- Gradually migrate frontend to use new endpoints
- Deprecate `gauge_id` for thread gauges over time
- Support both systems during transition

**Impact**:
- ✅ Clean architecture for new features
- ✅ Existing functionality unaffected
- ✅ Gradual migration path
- ❌ Dual system complexity
- ❌ More code to maintain
- ❌ Eventual cleanup needed

**Estimated Effort**: 2-3 weeks with transition period

---

## CRITICAL QUESTIONS FOR USER

**Before proceeding, I need answers to**:

1. **Are you aware the existing gauge set backend is 100% complete with 232 passing tests?**
   - This system already supports: creating sets, pairing spares, unpairing, replacing gauges, calibration workflows

2. **Should we redesign the complete backend (Option A) or use a hybrid approach (Option B)?**
   - Option A = Correct architecture but weeks of work
   - Option B = Quick solution but compromise on purity

3. **Is the goal to REPLACE the existing system or ADD serial number support to it?**
   - Replace = Start over with serial-based architecture
   - Add = Enhance existing gauge_id system with serial number display

4. **Are the 232 passing backend integration tests expendable?**
   - Yes = We can rewrite everything
   - No = We need to preserve existing functionality

5. **Do frontend workflows already exist that depend on the existing backend?**
   - If yes, changing backend breaks them
   - If no, we have more flexibility

---

## Recommended Path Forward

**My recommendation**: **STOP and clarify requirements before proceeding**

1. Review existing gauge set backend implementation
2. Decide if we're replacing or enhancing
3. Choose Option A, B, or C based on:
   - Time available
   - Risk tolerance
   - Architectural purity vs. pragmatism
   - Existing frontend dependencies

**Only then** should we proceed with implementation.

---

## Overview (Original Plan - May Need Revision)

Change thread gauge identification from gauge_id-based to serial number-based for spare/unpaired gauges.

**IMPORTANT**: This plan was created before discovering the existing backend implementation. Needs revision based on user's decision above.

### Current System
- All thread gauges get gauge_id (SP####A/B) immediately
- Serial number is optional
- Spares are identified by gauge_id

### New System
- **Spare thread gauges**: Identified by serial number, `gauge_id = NULL`
- **Thread gauge sets**: Both gauges share `gauge_id = SP####`
- **Non-thread gauges**: No change (BG####, HT####, etc.)
- **Serial number**: REQUIRED for thread gauges

---

## Database Changes

### Single Migration File

**File**: `backend/src/modules/gauge/migrations/XXX_thread_gauge_serial_required.sql`

**Note**: Since all data is test data and no backward compatibility is needed, this is a clean break.

```sql
-- OPTION 1: Clean slate approach (recommended for test data)
-- Delete all existing thread gauges and start fresh
DELETE FROM gauges WHERE equipment_type = 'thread_gauge';

-- OPTION 2: Keep test data approach
-- Only use if you want to preserve existing test gauges

-- Clear gauge_id for unpaired thread gauges
UPDATE gauges
SET gauge_id = NULL
WHERE equipment_type = 'thread_gauge'
  AND companion_gauge_id IS NULL;

-- Update paired gauges to share same gauge_id (remove A/B suffix)
UPDATE gauges
SET gauge_id = REGEXP_REPLACE(gauge_id, '[AB]$', '')
WHERE equipment_type = 'thread_gauge'
  AND companion_gauge_id IS NOT NULL
  AND gauge_id REGEXP '[AB]$';

-- Assign test serial numbers to any gauges missing them
UPDATE gauges
SET serial_number = CONCAT('TEST-', id)
WHERE equipment_type = 'thread_gauge'
  AND (serial_number IS NULL OR serial_number = '');

-- END OPTION 2

-- Add constraints (same for both options)
ALTER TABLE gauges
  ADD CONSTRAINT chk_thread_serial_required
  CHECK (
    (equipment_type != 'thread_gauge')
    OR (equipment_type = 'thread_gauge' AND serial_number IS NOT NULL)
  );

CREATE UNIQUE INDEX idx_thread_serial_unique
  ON gauges(serial_number)
  WHERE equipment_type = 'thread_gauge';

CREATE INDEX idx_spare_thread_gauges
  ON gauges(equipment_type, serial_number)
  WHERE gauge_id IS NULL AND equipment_type = 'thread_gauge';
```

---

## Backend Changes

### 1. GaugeCreationService.js

**File**: `backend/src/modules/gauge/services/GaugeCreationService.js`

**Changes**:
```javascript
async createGauge(gaugeData, userId) {
  let gaugeId = null;

  // Only non-thread gauges get immediate gauge_id
  if (gaugeData.equipment_type !== 'thread_gauge') {
    gaugeId = await GaugeIdService.generateSystemId(...);
  } else {
    // Thread gauges: validate serial_number is present
    if (!gaugeData.serial_number) {
      throw new ValidationError('Serial number is required for thread gauges');
    }
    // gauge_id stays NULL (spare state)
  }

  // Continue with creation...
}
```

### 2. GaugeSetService.js

**File**: `backend/src/modules/gauge/services/GaugeSetService.js`

**Add new methods**:
```javascript
// Create set from two existing spare gauges
async pairSpares(goSerialNumber, noGoSerialNumber, userId) {
  await transaction(async (conn) => {
    // 1. Find gauges by serial number
    const goGauge = await GaugeRepository.findBySerialNumber(conn, goSerialNumber);
    const noGoGauge = await GaugeRepository.findBySerialNumber(conn, noGoSerialNumber);

    // 2. Validate both are spares (gauge_id IS NULL)
    if (goGauge.gauge_id || noGoGauge.gauge_id) {
      throw new ValidationError('Both gauges must be unpaired spares');
    }

    // 3. Generate new SET ID (SP####)
    const setId = await GaugeIdService.generateSetId(goGauge.category_id);

    // 4. Update both gauges
    await GaugeRepository.update(conn, goGauge.id, {
      gauge_id: setId,
      gauge_suffix: 'A',
      companion_gauge_id: noGoGauge.id,
      is_spare: false
    });

    await GaugeRepository.update(conn, noGoGauge.id, {
      gauge_id: setId,
      gauge_suffix: 'B',
      companion_gauge_id: goGauge.id,
      is_spare: false
    });

    return setId;
  });
}

// Unpair a set
async unpairSet(setId, userId) {
  await transaction(async (conn) => {
    const gauges = await GaugeRepository.findByGaugeId(conn, setId);

    for (const gauge of gauges) {
      await GaugeRepository.update(conn, gauge.id, {
        gauge_id: null,
        gauge_suffix: null,
        companion_gauge_id: null,
        is_spare: true
      });
    }
  });
}

// Replace one gauge in a set
async replaceGaugeInSet(setId, oldSerialNumber, newSerialNumber, userId) {
  await transaction(async (conn) => {
    const oldGauge = await GaugeRepository.findBySerialNumber(conn, oldSerialNumber);
    const newGauge = await GaugeRepository.findBySerialNumber(conn, newSerialNumber);

    // Validate
    if (oldGauge.gauge_id !== setId) {
      throw new ValidationError('Old gauge is not part of this set');
    }
    if (newGauge.gauge_id !== null) {
      throw new ValidationError('New gauge must be an unpaired spare');
    }

    // Update old gauge (return to spare)
    await GaugeRepository.update(conn, oldGauge.id, {
      gauge_id: null,
      gauge_suffix: null,
      companion_gauge_id: null,
      is_spare: true
    });

    // Update new gauge (join set)
    await GaugeRepository.update(conn, newGauge.id, {
      gauge_id: setId,
      gauge_suffix: oldGauge.gauge_suffix,
      companion_gauge_id: oldGauge.companion_gauge_id,
      is_spare: false
    });

    // Update companion
    await GaugeRepository.update(conn, oldGauge.companion_gauge_id, {
      companion_gauge_id: newGauge.id
    });
  });
}
```

### 3. GaugeRepository.js

**File**: `backend/src/modules/gauge/repositories/GaugeRepository.js`

**Add new methods**:
```javascript
// Find gauge by serial number
async findBySerialNumber(connection, serialNumber) {
  const query = `
    ${GAUGE_WITH_RELATIONS}
    WHERE g.serial_number = ?
  `;
  const [rows] = await (connection || pool).query(query, [serialNumber]);
  return rows.length > 0 ? GaugeDTOMapper.transformToDTO(rows[0]) : null;
}

// Find spare thread gauges
async findSpareThreadGauges(filters = {}) {
  let query = `
    ${GAUGE_WITH_RELATIONS}
    WHERE g.equipment_type = 'thread_gauge'
      AND g.gauge_id IS NULL
  `;

  const params = [];

  if (filters.thread_size) {
    query += ` AND ts.thread_size = ?`;
    params.push(filters.thread_size);
  }

  if (filters.thread_class) {
    query += ` AND ts.thread_class = ?`;
    params.push(filters.thread_class);
  }

  const [rows] = await pool.query(query, params);
  return rows.map(GaugeDTOMapper.transformToDTO);
}
```

### 4. GaugeIdService.js

**File**: `backend/src/modules/gauge/services/GaugeIdService.js`

**Add method**:
```javascript
// Generate set ID (SP#### without suffix)
async generateSetId(categoryId) {
  const config = await GaugeIdRepository.getSequenceConfig(categoryId, 'thread_gauge');
  const nextSequence = await GaugeIdRepository.generateSequence(categoryId, 'thread_gauge');

  // Format: SP0001 (no A/B suffix for sets)
  return `${config.prefix}${String(nextSequence).padStart(4, '0')}`;
}
```

### 5. API Routes

**File**: `backend/src/modules/gauge/routes/gauges-v2.js` (or modify existing routes directly)

**Breaking Changes - Modify existing endpoints directly (no v2 needed)**:
```javascript
// Get gauge by serial number
router.get('/api/gauges/v2/by-serial/:serialNumber',
  authenticateToken,
  async (req, res) => {
    const gauge = await GaugeRepository.findBySerialNumber(null, req.params.serialNumber);
    if (!gauge) {
      return res.status(404).json({ success: false, message: 'Gauge not found' });
    }
    res.json({ success: true, data: gauge });
  }
);

// Get spare thread gauges
router.get('/api/gauges/v2/spare-thread-gauges',
  authenticateToken,
  async (req, res) => {
    const filters = {
      thread_size: req.query.thread_size,
      thread_class: req.query.thread_class
    };
    const spares = await GaugeRepository.findSpareThreadGauges(filters);
    res.json({ success: true, data: spares });
  }
);

// Pair two spare gauges
router.post('/api/gauges/v2/pair-spares',
  authenticateToken,
  async (req, res) => {
    const { go_serial_number, nogo_serial_number } = req.body;
    const setId = await GaugeSetService.pairSpares(
      go_serial_number,
      nogo_serial_number,
      req.user.id
    );
    res.json({ success: true, setId });
  }
);

// Unpair a set
router.post('/api/gauges/v2/unpair-set',
  authenticateToken,
  async (req, res) => {
    await GaugeSetService.unpairSet(req.body.set_id, req.user.id);
    res.json({ success: true });
  }
);

// Replace gauge in set
router.post('/api/gauges/v2/replace-gauge',
  authenticateToken,
  async (req, res) => {
    const { set_id, old_serial_number, new_serial_number } = req.body;
    await GaugeSetService.replaceGaugeInSet(
      set_id,
      old_serial_number,
      new_serial_number,
      req.user.id
    );
    res.json({ success: true });
  }
);

// Modify create endpoint to validate serial number for thread gauges
router.post('/api/gauges/v2/create',
  authenticateToken,
  async (req, res) => {
    const gaugeData = req.body;

    if (gaugeData.equipment_type === 'thread_gauge' && !gaugeData.serial_number) {
      return res.status(400).json({
        success: false,
        message: 'Serial number is required for thread gauges'
      });
    }

    const gauge = await GaugeCreationService.createGauge(gaugeData, req.user.id);
    res.json({ success: true, data: gauge });
  }
);
```

### 6. Validation Rules

**File**: `backend/src/modules/gauge/routes/helpers/gaugeValidationRules.js`

**Add validation**:
```javascript
// Thread gauge specific validation
const createThreadGaugeValidation = [
  body('serial_number')
    .notEmpty()
    .withMessage('Serial number is required for thread gauges'),
  body('thread_size')
    .notEmpty()
    .withMessage('Thread size is required'),
  body('thread_class')
    .notEmpty()
    .withMessage('Thread class is required')
];
```

---

## Frontend Changes

### 1. Types

**File**: `frontend/src/modules/gauge/types/index.ts`

**Update interface**:
```typescript
interface Gauge {
  id: string;
  gauge_id: string | null;          // NULL for spare thread gauges
  serial_number: string;            // REQUIRED for thread gauges
  gauge_suffix?: 'A' | 'B' | null;
  companion_gauge_id?: string | null;
  equipment_type: EquipmentType;
  // ... other fields
}

// Helper to get display identifier
function getDisplayIdentifier(gauge: Gauge): string {
  if (gauge.equipment_type === 'thread_gauge' && !gauge.gauge_id) {
    return `S/N: ${gauge.serial_number}`;
  }
  return gauge.gauge_id || gauge.serial_number;
}
```

### 2. Service Layer

**File**: `frontend/src/modules/gauge/services/gaugeService.ts`

**Add methods**:
```typescript
const gaugeService = {
  // ... existing methods

  getBySerialNumber: async (serialNumber: string) => {
    const response = await apiClient.get(`/gauges/v2/by-serial/${serialNumber}`);
    return response.data;
  },

  getSpareThreadGauges: async (filters?: { thread_size?: string; thread_class?: string }) => {
    const params = new URLSearchParams();
    if (filters?.thread_size) params.append('thread_size', filters.thread_size);
    if (filters?.thread_class) params.append('thread_class', filters.thread_class);

    const response = await apiClient.get(`/gauges/v2/spare-thread-gauges?${params}`);
    return response.data;
  },

  pairSpares: async (goSerialNumber: string, noGoSerialNumber: string) => {
    const response = await apiClient.post('/gauges/v2/pair-spares', {
      go_serial_number: goSerialNumber,
      nogo_serial_number: noGoSerialNumber
    });
    return response.data;
  },

  unpairSet: async (setId: string) => {
    const response = await apiClient.post('/gauges/v2/unpair-set', { set_id: setId });
    return response.data;
  },

  replaceGaugeInSet: async (setId: string, oldSerial: string, newSerial: string) => {
    const response = await apiClient.post('/gauges/v2/replace-gauge', {
      set_id: setId,
      old_serial_number: oldSerial,
      new_serial_number: newSerial
    });
    return response.data;
  }
};
```

### 3. Thread Gauge Form

**File**: `frontend/src/modules/gauge/components/creation/forms/ThreadGaugeForm.tsx`

**Change serial number to required**:
```tsx
<FormInput
  label="Serial Number"
  value={formData.serial_number || ''}
  onChange={(value) => handleChange('serial_number', value)}
  required={true}  // ← Changed from optional
  placeholder="Enter serial number"
/>
```

### 4. Gauge Detail Component

**File**: `frontend/src/modules/gauge/components/GaugeDetail.tsx`

**Update to show serial number for spares**:
```tsx
{/* Basic Information section */}
<div className="info-row">
  <span className="info-label">
    {gauge.equipment_type === 'thread_gauge' && !gauge.gauge_id
      ? 'Serial Number:'
      : gauge.gauge_id ? 'Set ID:' : 'Gauge ID:'}
  </span>
  <span className="info-value bold">
    {gauge.equipment_type === 'thread_gauge' && !gauge.gauge_id
      ? gauge.serial_number
      : gauge.gauge_id}
  </span>
</div>

{/* Show serial number for paired thread gauges */}
{gauge.equipment_type === 'thread_gauge' && gauge.gauge_id && (
  <div className="info-row">
    <span className="info-label">Serial Number:</span>
    <span className="info-value">{gauge.serial_number}</span>
  </div>
)}
```

### 5. Set Details Page

**File**: `frontend/src/modules/gauge/pages/SetDetailsPage.tsx`

**Show serial numbers in Gauge Members**:
```tsx
{/* Gauge Members section */}
<div className="section">
  <h3 className="section-title">Gauge Members</h3>
  <div className="info-row">
    <span className="info-label">GO Gauge (A):</span>
    <a href="#" className="info-link" onClick={() => navigateToGauge(goGauge.serial_number)}>
      {goGauge.serial_number}
    </a>
  </div>
  <div className="info-row">
    <span className="info-label">NO GO Gauge (B):</span>
    <a href="#" className="info-link" onClick={() => navigateToGauge(noGoGauge.serial_number)}>
      {noGoGauge.serial_number}
    </a>
  </div>
</div>
```

### 6. Spare Inventory Page

**File**: `frontend/src/modules/gauge/pages/SpareInventoryPage.tsx`

**Use serial numbers for pairing**:
```tsx
function SpareInventoryPage() {
  const { data: spareGauges } = useQuery(
    ['spare-thread-gauges'],
    () => gaugeService.getSpareThreadGauges()
  );

  // Group by specifications
  const grouped = useMemo(() => {
    const groups = {};
    spareGauges?.forEach(gauge => {
      const key = `${gauge.thread_size} ${gauge.thread_class}`;
      if (!groups[key]) {
        groups[key] = { goGauges: [], noGoGauges: [] };
      }

      if (gauge.gauge_type?.toLowerCase().includes('go')) {
        groups[key].goGauges.push(gauge);
      } else {
        groups[key].noGoGauges.push(gauge);
      }
    });
    return groups;
  }, [spareGauges]);

  const handlePair = async (goGauge, noGoGauge) => {
    try {
      const result = await gaugeService.pairSpares(
        goGauge.serial_number,
        noGoGauge.serial_number
      );
      toast.success(`Set ${result.setId} created`);
      queryClient.invalidateQueries(['spare-thread-gauges']);
    } catch (error) {
      toast.error('Failed to create set');
    }
  };

  return (
    <div>
      {Object.entries(grouped).map(([spec, { goGauges, noGoGauges }]) => (
        <div key={spec}>
          <h3>{spec}</h3>
          {/* Display gauges with serial numbers */}
          {goGauges.map(g => (
            <div key={g.serial_number}>S/N: {g.serial_number}</div>
          ))}
          {/* Pairing UI */}
        </div>
      ))}
    </div>
  );
}
```

### 7. Routes

**File**: `frontend/src/modules/gauge/routes.tsx`

**Add serial number route**:
```tsx
<Route path="/by-serial/:serialNumber" element={<GaugeDetailBySerial />} />

function GaugeDetailBySerial() {
  const { serialNumber } = useParams();
  const { data: gauge } = useQuery(
    ['gauge-by-serial', serialNumber],
    () => gaugeService.getBySerialNumber(serialNumber)
  );

  if (!gauge) return <NotFound />;

  // Redirect to standard detail page using numeric ID
  return <Navigate to={`/gauges/detail/${gauge.id}`} replace />;
}
```

---

## Implementation Checklist

### Database
- [ ] Create migration file
- [ ] Test migration on local database
- [ ] Verify constraints work (try inserting thread gauge without serial number)
- [ ] Verify unique constraint (try duplicate serial number)
- [ ] Check existing data after migration

### Backend
- [ ] Update GaugeCreationService
- [ ] Update GaugeSetService (add 3 new methods)
- [ ] Update GaugeRepository (add 2 new methods)
- [ ] Update GaugeIdService (add generateSetId)
- [ ] Update API routes (add 5 endpoints, modify 1)
- [ ] Update validation rules
- [ ] Test all endpoints with Postman

### Frontend
- [ ] Update TypeScript types
- [ ] Update gaugeService (add 5 methods)
- [ ] Update ThreadGaugeForm (make serial required)
- [ ] Update GaugeDetail component
- [ ] Update SetDetailsPage component
- [ ] Update SpareInventoryPage component
- [ ] Add route for serial number lookup
- [ ] Test all workflows in browser

### Testing
- [ ] Create spare thread gauge with serial number
- [ ] Verify gauge_id is NULL in database
- [ ] Pair two spare gauges
- [ ] Verify both get same gauge_id (SP####)
- [ ] View set details
- [ ] Click serial number links
- [ ] Replace gauge in set
- [ ] Unpair set
- [ ] Verify gauges return to spare status
- [ ] Verify non-thread gauges still work normally

### Data Migration
- [ ] Backup production database
- [ ] Run migration on staging
- [ ] Validate staging data
- [ ] Document any gauges that need manual serial number assignment
- [ ] Run migration on production
- [ ] Validate production data

---

## Pre-Migration Validation Queries

```sql
-- Count thread gauges
SELECT COUNT(*) FROM gauges WHERE equipment_type = 'thread_gauge';

-- Count paired thread gauges
SELECT COUNT(*) FROM gauges
WHERE equipment_type = 'thread_gauge' AND companion_gauge_id IS NOT NULL;

-- Count unpaired thread gauges
SELECT COUNT(*) FROM gauges
WHERE equipment_type = 'thread_gauge' AND companion_gauge_id IS NULL;

-- Find thread gauges without serial numbers (need manual review)
SELECT id, gauge_id, system_gauge_id, status
FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND (serial_number IS NULL OR serial_number = '');
```

## Post-Migration Validation Queries

```sql
-- Verify all thread gauges have serial numbers
SELECT COUNT(*) FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND (serial_number IS NULL OR serial_number = '');
-- Should return 0

-- Verify unpaired thread gauges have NULL gauge_id
SELECT COUNT(*) FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND companion_gauge_id IS NULL
  AND gauge_id IS NOT NULL;
-- Should return 0

-- Verify paired thread gauges have same gauge_id
SELECT g1.gauge_id, g2.gauge_id
FROM gauges g1
JOIN gauges g2 ON g1.companion_gauge_id = g2.id
WHERE g1.equipment_type = 'thread_gauge'
  AND g1.gauge_id != g2.gauge_id;
-- Should return 0 rows
```

---

## Summary

**Files to Change**:
- **Database**: 1 migration file
- **Backend**: 6 files
- **Frontend**: 6 files

**Key Changes**:
- Serial number becomes required for thread gauges
- Spare thread gauges have `gauge_id = NULL`
- Sets share single `gauge_id` (SP####)
- Non-thread gauges unchanged

**New Capabilities**:
- Pair spares by serial number
- Unpair sets
- Replace gauges in sets
- Find gauges by serial number
