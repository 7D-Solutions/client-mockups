# Gauge Identifier System Redesign - Implementation Plan

**Date**: October 28, 2025
**Status**: Planning Phase
**Impact**: High - Affects database, backend, frontend, and existing data

---

## Executive Summary

This document outlines the complete redesign of the gauge identification system to better align with business operations and simplify the management of thread gauge sets.

### Current System Problems
1. Thread gauges get permanent gauge_ids (SP####A/B) even when unpaired/spare
2. Serial number is optional, making spare tracking difficult
3. Confusion between "gauge identity" and "set membership"
4. Cannot easily identify spare vs paired thread gauges

### Proposed Solution
- **Spare thread gauges**: Identified by serial number only (`gauge_id` = NULL)
- **Thread gauge sets**: `gauge_id` = SP#### (set identifier)
- **Non-thread gauges**: Keep existing system (BG####, HT####, etc.)
- **Serial number**: REQUIRED for all thread gauges

---

## System Changes Overview

### New Identifier Rules

| Gauge Type | State | Primary ID | gauge_id Field | Serial Number |
|------------|-------|-----------|----------------|---------------|
| Thread Gauge | Spare/Orphaned | Serial Number | NULL | REQUIRED |
| Thread Gauge | In Set | Set ID (SP####) | SP#### | REQUIRED |
| Bore Gauge | Any | Gauge ID | BG#### | Optional |
| Hand Tool | Any | Gauge ID | HT#### | Optional |
| Large Equipment | Any | Gauge ID | LE#### | Optional |
| Cal Standard | Any | Gauge ID | CS#### | Optional |

### Business Rules

1. **Thread Gauge Creation**:
   - Serial number is REQUIRED
   - `gauge_id` starts as NULL
   - Status = 'spare'
   - Can be individually created or created as a set

2. **Set Creation**:
   - Generates new SP#### identifier
   - Both GO and NO GO gauges get the same `gauge_id` (SP####)
   - `companion_gauge_id` links them bidirectionally
   - `gauge_suffix` field distinguishes 'A' (GO) vs 'B' (NO GO)
   - Status changes from 'spare' to 'available' (or appropriate status)

3. **Set Unpairing**:
   - `gauge_id` returns to NULL for both gauges
   - `companion_gauge_id` cleared
   - Status returns to 'spare'
   - Gauges revert to serial number identification

4. **Gauge Replacement in Set**:
   - Old gauge: `gauge_id` → NULL, `companion_gauge_id` → NULL, status → 'spare'
   - New gauge: `gauge_id` → SP####, `companion_gauge_id` → companion ID, status → 'available'
   - Set ID (SP####) remains the same

---

## Database Changes

### Schema Modifications

**File**: `backend/src/modules/gauge/migrations/XXX_thread_gauge_identifier_redesign.sql`

```sql
-- PHASE 1: Add constraints and indexes

-- Make serial_number required for thread gauges
ALTER TABLE gauges
  ADD CONSTRAINT chk_thread_serial_required
  CHECK (
    (equipment_type != 'thread_gauge')
    OR
    (equipment_type = 'thread_gauge' AND serial_number IS NOT NULL AND serial_number != '')
  );

-- Add unique constraint on serial_number for thread gauges
CREATE UNIQUE INDEX idx_thread_serial_unique
  ON gauges(serial_number)
  WHERE equipment_type = 'thread_gauge';

-- Add index for finding spare thread gauges (gauge_id IS NULL)
CREATE INDEX idx_spare_thread_gauges
  ON gauges(equipment_type, serial_number)
  WHERE gauge_id IS NULL AND equipment_type = 'thread_gauge';

-- Add index for set lookups
CREATE INDEX idx_thread_sets
  ON gauges(gauge_id, gauge_suffix)
  WHERE equipment_type = 'thread_gauge' AND gauge_id IS NOT NULL;

-- PHASE 2: Update gauge_id_config for set-only generation
-- Thread gauge prefix 'SP' will only be used for sets, not individual gauges
UPDATE gauge_id_config
SET description = 'Thread Gauge SET identifier (SP####)'
WHERE prefix = 'SP';

-- PHASE 3: Data migration for existing thread gauges
-- Existing paired thread gauges keep their gauge_id
-- Existing unpaired thread gauges: gauge_id → NULL (if they have serial numbers)

-- Find unpaired thread gauges with serial numbers and clear their gauge_id
UPDATE gauges
SET gauge_id = NULL
WHERE equipment_type = 'thread_gauge'
  AND companion_gauge_id IS NULL
  AND serial_number IS NOT NULL
  AND serial_number != '';

-- For unpaired thread gauges WITHOUT serial numbers, generate placeholder serials
-- This requires manual review - may need to assign actual serial numbers
UPDATE gauges
SET serial_number = CONCAT('LEGACY-', id)
WHERE equipment_type = 'thread_gauge'
  AND companion_gauge_id IS NULL
  AND (serial_number IS NULL OR serial_number = '');

-- PHASE 4: Update companion relationships for sets
-- Ensure both gauges in a set have the same gauge_id (base without A/B suffix)
-- Current: SP0018A and SP0018B
-- New: Both have gauge_id = 'SP0018', distinguished by gauge_suffix

-- Extract base ID from gauge_id for paired thread gauges
UPDATE gauges
SET gauge_id = REGEXP_REPLACE(gauge_id, '[AB]$', '')
WHERE equipment_type = 'thread_gauge'
  AND companion_gauge_id IS NOT NULL
  AND gauge_id REGEXP '[AB]$';
```

### Affected Tables (FK relationships)

All these tables reference `gauges.id` (numeric PK), NOT `gauge_id` string, so they're not directly affected. However, queries that filter/join by `gauge_id` need review:

1. `gauge_thread_specifications` - FK on gauges.id
2. `gauge_calibrations` - FK on gauges.id
3. `gauge_active_checkouts` - FK on gauges.id
4. `gauge_transfers` - FK on gauges.id
5. `gauge_unseal_requests` - FK on gauges.id
6. `gauge_companion_history` - FK on gauges.id (tracks pairing changes - CRITICAL)
7. `gauge_location_history` - FK on gauges.id
8. `gauge_transactions` - FK on gauges.id

**Action Required**: Audit all queries in repositories that use `gauge_id` for filtering/joins.

---

## Backend Changes

### 1. GaugeIdService.js - ID Generation Logic

**File**: `backend/src/modules/gauge/services/GaugeIdService.js`

**Changes**:
```javascript
// BEFORE: Generated gauge_id for all thread gauges
async generateSystemId(categoryId, gaugeType, isGoGauge) {
  // Always generated SP####A or SP####B
}

// AFTER: Only generate gauge_id for thread gauge SETS
async generateSetId(categoryId) {
  // Generate SP#### (no suffix) for the SET
  // Individual spare thread gauges get NO gauge_id
}

// NEW: No longer assign gauge_id to individual thread gauges
async createThreadGauge(gaugeData) {
  // gauge_id remains NULL for spares
  // serial_number is REQUIRED
}
```

**Specific Changes**:
- Add `generateSetId()` method - returns SP#### without suffix
- Modify `generateSystemId()` to skip thread gauges (return NULL)
- Add validation: thread gauges must have serial_number
- Remove suffix logic for individual gauges

### 2. GaugeCreationService.js - Creation Flow

**File**: `backend/src/modules/gauge/services/GaugeCreationService.js`

**Changes**:
```javascript
// BEFORE:
async createGauge(gaugeData, userId) {
  const systemId = await GaugeIdService.generateSystemId(...);
  // Always assigned gauge_id
}

// AFTER:
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

  // Insert with gaugeId (NULL for thread gauges)
}
```

**Validation Updates**:
- Add required validation for `serial_number` when `equipment_type = 'thread_gauge'`
- Remove `gauge_id` from thread gauge creation payload
- Update immutability rules to allow `gauge_id` changes during set operations

### 3. GaugeSetService.js - Set Creation & Management

**File**: `backend/src/modules/gauge/services/GaugeSetService.js`

**Changes**:
```javascript
// NEW METHOD: Create set from two existing spare gauges
async createSetFromSpares(goSerialNumber, noGoSerialNumber, userId) {
  // 1. Find both gauges by serial number
  const goGauge = await GaugeRepository.findBySerialNumber(goSerialNumber);
  const noGoGauge = await GaugeRepository.findBySerialNumber(noGoSerialNumber);

  // 2. Validate both are spare thread gauges (gauge_id IS NULL)
  if (goGauge.gauge_id !== null || noGoGauge.gauge_id !== null) {
    throw new ValidationError('Both gauges must be unpaired spares');
  }

  // 3. Validate specifications match
  validateSpecificationsMatch(goGauge, noGoGauge);

  // 4. Generate new SET ID (SP####)
  const setId = await GaugeIdService.generateSetId(goGauge.category_id);

  // 5. Update both gauges within transaction
  await transaction(async (conn) => {
    // Update GO gauge
    await GaugeRepository.update(conn, goGauge.id, {
      gauge_id: setId,
      gauge_suffix: 'A',
      companion_gauge_id: noGoGauge.id,
      status: 'available',
      is_spare: false
    });

    // Update NO GO gauge
    await GaugeRepository.update(conn, noGoGauge.id, {
      gauge_id: setId,
      gauge_suffix: 'B',
      companion_gauge_id: goGauge.id,
      status: 'available',
      is_spare: false
    });

    // Log companion history
    await CompanionHistoryRepository.create(conn, {
      gauge_id: goGauge.id,
      companion_gauge_id: noGoGauge.id,
      action: 'paired',
      user_id: userId
    });
  });

  return setId;
}

// NEW METHOD: Unpair a set (return to spares)
async unpairSet(setId, userId) {
  await transaction(async (conn) => {
    // Find both gauges in the set
    const gauges = await GaugeRepository.findByGaugeId(conn, setId);

    if (gauges.length !== 2) {
      throw new ValidationError('Invalid set: must have exactly 2 gauges');
    }

    // Clear gauge_id for both, revert to spare status
    for (const gauge of gauges) {
      await GaugeRepository.update(conn, gauge.id, {
        gauge_id: null,
        gauge_suffix: null,
        companion_gauge_id: null,
        status: 'spare',
        is_spare: true
      });
    }

    // Log companion history
    await CompanionHistoryRepository.create(conn, {
      gauge_id: gauges[0].id,
      companion_gauge_id: gauges[1].id,
      action: 'unpaired',
      user_id: userId
    });
  });
}

// NEW METHOD: Replace one gauge in a set
async replaceGaugeInSet(setId, oldSerialNumber, newSerialNumber, userId) {
  await transaction(async (conn) => {
    // 1. Find the gauge being replaced
    const oldGauge = await GaugeRepository.findBySerialNumber(oldSerialNumber);

    // Validate it's part of this set
    if (oldGauge.gauge_id !== setId) {
      throw new ValidationError('Gauge is not part of this set');
    }

    // 2. Find the replacement gauge (must be spare)
    const newGauge = await GaugeRepository.findBySerialNumber(newSerialNumber);

    if (newGauge.gauge_id !== null) {
      throw new ValidationError('Replacement gauge must be an unpaired spare');
    }

    // 3. Validate specifications match
    const companionId = oldGauge.companion_gauge_id;
    const companion = await GaugeRepository.findById(conn, companionId);
    validateSpecificationsMatch(newGauge, companion);

    // 4. Update old gauge (return to spare)
    await GaugeRepository.update(conn, oldGauge.id, {
      gauge_id: null,
      gauge_suffix: null,
      companion_gauge_id: null,
      status: 'spare',
      is_spare: true
    });

    // 5. Update new gauge (join set)
    await GaugeRepository.update(conn, newGauge.id, {
      gauge_id: setId,
      gauge_suffix: oldGauge.gauge_suffix, // Keep same suffix (A or B)
      companion_gauge_id: companionId,
      status: 'available',
      is_spare: false
    });

    // 6. Update companion's link
    await GaugeRepository.update(conn, companionId, {
      companion_gauge_id: newGauge.id
    });

    // 7. Log replacement
    await CompanionHistoryRepository.create(conn, {
      gauge_id: newGauge.id,
      companion_gauge_id: companionId,
      action: 'replaced',
      replaced_gauge_id: oldGauge.id,
      user_id: userId
    });
  });
}
```

### 4. GaugeRepository.js - Query Methods

**File**: `backend/src/modules/gauge/repositories/GaugeRepository.js`

**New Methods**:
```javascript
// Find gauge by serial number
async findBySerialNumber(serialNumber) {
  const query = `
    ${GAUGE_WITH_RELATIONS}
    WHERE g.serial_number = ?
  `;
  const [rows] = await pool.query(query, [serialNumber]);
  if (rows.length === 0) return null;
  return GaugeDTOMapper.transformToDTO(rows[0]);
}

// Find all gauges in a set by set ID
async findByGaugeId(connection, gaugeId) {
  const query = `
    ${GAUGE_WITH_RELATIONS}
    WHERE g.gauge_id = ?
    ORDER BY g.gauge_suffix
  `;
  const [rows] = await (connection || pool).query(query, [gaugeId]);
  return rows.map(GaugeDTOMapper.transformToDTO);
}

// Find spare thread gauges (gauge_id IS NULL)
async findSpareThreadGauges(filters = {}) {
  let query = `
    ${GAUGE_WITH_RELATIONS}
    WHERE g.equipment_type = 'thread_gauge'
      AND g.gauge_id IS NULL
      AND g.is_spare = true
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

  query += ` ORDER BY g.serial_number`;

  const [rows] = await pool.query(query, params);
  return rows.map(GaugeDTOMapper.transformToDTO);
}
```

**Modified Methods**:
```javascript
// Update findByGaugeId to handle set IDs (multiple results)
async findByGaugeId(gaugeId) {
  const query = `
    ${GAUGE_WITH_RELATIONS}
    WHERE g.gauge_id = ?
  `;
  const [rows] = await pool.query(query, [gaugeId]);

  // If it's a set (multiple gauges), return array
  // If it's a single gauge, return single object
  return rows.length > 1
    ? rows.map(GaugeDTOMapper.transformToDTO)
    : (rows.length === 1 ? GaugeDTOMapper.transformToDTO(rows[0]) : null);
}
```

### 5. API Routes - New Endpoints

**File**: `backend/src/modules/gauge/routes/gauges-v2.js`

**New Routes**:
```javascript
// Create set from existing spare gauges
router.post('/api/gauges/v2/create-set-from-spares',
  authenticateToken,
  validateBody({
    go_serial_number: 'required|string',
    nogo_serial_number: 'required|string'
  }),
  async (req, res) => {
    const { go_serial_number, nogo_serial_number } = req.body;
    const setId = await GaugeSetService.createSetFromSpares(
      go_serial_number,
      nogo_serial_number,
      req.user.id
    );
    res.json({ success: true, setId });
  }
);

// Unpair a set (return to spares)
router.post('/api/gauges/v2/unpair-set',
  authenticateToken,
  validateBody({ set_id: 'required|string' }),
  async (req, res) => {
    await GaugeSetService.unpairSet(req.body.set_id, req.user.id);
    res.json({ success: true });
  }
);

// Replace gauge in set
router.post('/api/gauges/v2/replace-gauge-in-set',
  authenticateToken,
  validateBody({
    set_id: 'required|string',
    old_serial_number: 'required|string',
    new_serial_number: 'required|string'
  }),
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

// Get gauge by serial number
router.get('/api/gauges/v2/by-serial/:serialNumber',
  authenticateToken,
  async (req, res) => {
    const gauge = await GaugeRepository.findBySerialNumber(req.params.serialNumber);
    if (!gauge) {
      return res.status(404).json({ success: false, message: 'Gauge not found' });
    }
    res.json({ success: true, data: gauge });
  }
);
```

**Modified Routes**:
```javascript
// Update POST /api/gauges/v2/create to handle thread gauges differently
router.post('/api/gauges/v2/create',
  authenticateToken,
  validateCreateGauge, // Add serial_number requirement for thread gauges
  async (req, res) => {
    const gaugeData = req.body;

    // Validate serial number for thread gauges
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

### 6. Validation Rules Updates

**File**: `backend/src/modules/gauge/routes/helpers/gaugeValidationRules.js`

```javascript
// Add thread gauge specific validation
const createThreadGaugeValidation = [
  body('serial_number')
    .notEmpty()
    .withMessage('Serial number is required for thread gauges'),
  body('thread_size')
    .notEmpty()
    .withMessage('Thread size is required'),
  body('thread_class')
    .notEmpty()
    .withMessage('Thread class is required'),
  // gauge_id should NOT be provided (will be NULL)
];

// Update general creation validation
const createGaugeValidation = [
  body('equipment_type')
    .isIn(['thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'])
    .withMessage('Invalid equipment type'),
  // Conditional serial number requirement
  body('serial_number').custom((value, { req }) => {
    if (req.body.equipment_type === 'thread_gauge' && !value) {
      throw new Error('Serial number is required for thread gauges');
    }
    return true;
  })
];
```

---

## Frontend Changes

### 1. Types Update

**File**: `frontend/src/modules/gauge/types/index.ts`

```typescript
// Update Gauge interface
interface Gauge {
  id: string;                       // numeric DB ID
  gauge_id: string | null;          // NULL for spare thread gauges, SP#### for sets, BG#### for others
  serial_number: string;            // REQUIRED for thread gauges
  gauge_suffix?: 'A' | 'B' | null; // GO (A) or NO GO (B) for paired thread gauges
  companion_gauge_id?: string | null;
  is_spare: boolean;
  equipment_type: EquipmentType;
  status: GaugeStatus;
  displayName?: string;

  // Thread gauge specific
  thread_size?: string;
  thread_class?: string;
  thread_type?: string;
  thread_form?: string;

  // ... other fields
}

// Add helper type for display purposes
type GaugeIdentifier = {
  type: 'gauge_id' | 'serial_number' | 'set_id';
  value: string;
};

// Helper function to get primary identifier
function getPrimaryIdentifier(gauge: Gauge): GaugeIdentifier {
  if (gauge.equipment_type === 'thread_gauge') {
    if (gauge.gauge_id) {
      // Part of a set
      return { type: 'set_id', value: gauge.gauge_id };
    } else {
      // Spare, identified by serial number
      return { type: 'serial_number', value: gauge.serial_number };
    }
  } else {
    // Non-thread gauge
    return { type: 'gauge_id', value: gauge.gauge_id };
  }
}
```

### 2. Service Updates

**File**: `frontend/src/modules/gauge/services/gaugeService.ts`

```typescript
// Add new methods
const gaugeService = {
  // ... existing methods

  // Get gauge by serial number
  getBySerialNumber: async (serialNumber: string) => {
    const response = await apiClient.get(`/gauges/v2/by-serial/${serialNumber}`);
    return response.data;
  },

  // Get spare thread gauges with filters
  getSpareThreadGauges: async (filters?: { thread_size?: string; thread_class?: string }) => {
    const params = new URLSearchParams();
    if (filters?.thread_size) params.append('thread_size', filters.thread_size);
    if (filters?.thread_class) params.append('thread_class', filters.thread_class);

    const response = await apiClient.get(`/gauges/v2/spare-thread-gauges?${params}`);
    return response.data;
  },

  // Create set from existing spares
  createSetFromSpares: async (goSerialNumber: string, noGoSerialNumber: string) => {
    const response = await apiClient.post('/gauges/v2/create-set-from-spares', {
      go_serial_number: goSerialNumber,
      nogo_serial_number: noGoSerialNumber
    });
    return response.data;
  },

  // Unpair a set
  unpairSet: async (setId: string) => {
    const response = await apiClient.post('/gauges/v2/unpair-set', { set_id: setId });
    return response.data;
  },

  // Replace gauge in set
  replaceGaugeInSet: async (setId: string, oldSerialNumber: string, newSerialNumber: string) => {
    const response = await apiClient.post('/gauges/v2/replace-gauge-in-set', {
      set_id: setId,
      old_serial_number: oldSerialNumber,
      new_serial_number: newSerialNumber
    });
    return response.data;
  }
};
```

### 3. Component Updates - Creation Forms

**File**: `frontend/src/modules/gauge/components/creation/forms/ThreadGaugeForm.tsx`

```tsx
// Update to make serial number REQUIRED
<FormInput
  label="Serial Number"
  value={formData.serial_number || ''}
  onChange={(value) => handleChange('serial_number', value)}
  required={true}  // ← Change from optional to required
  placeholder="Enter serial number"
/>

// Add helper text
<p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', marginTop: 'var(--space-1)' }}>
  Serial number is required for thread gauges. This will be the primary identifier until the gauge is paired into a set.
</p>

// For paired creation (Both option), require both serial numbers
{formData.create_option === 'Both' && (
  <>
    <FormInput
      label="GO Gauge Serial Number"
      value={formData.go_serial_number || ''}
      onChange={(value) => handleChange('go_serial_number', value)}
      required={true}
      placeholder="Serial number for GO gauge"
    />
    <FormInput
      label="NO GO Gauge Serial Number"
      value={formData.nogo_serial_number || ''}
      onChange={(value) => handleChange('nogo_serial_number', value)}
      required={true}
      placeholder="Serial number for NO GO gauge"
    />
  </>
)}
```

### 4. Component Updates - Display

**File**: `frontend/src/modules/gauge/components/GaugeRow.tsx`

```tsx
// Update to show appropriate identifier
function GaugeRow({ gauge }) {
  const primaryId = getPrimaryIdentifier(gauge);

  return (
    <div className="gauge-row">
      {/* Primary identifier display */}
      <div className="gauge-id">
        {primaryId.type === 'serial_number' && (
          <span className="serial-badge">S/N: {primaryId.value}</span>
        )}
        {primaryId.type === 'gauge_id' && (
          <span className="gauge-badge">{primaryId.value}</span>
        )}
        {primaryId.type === 'set_id' && (
          <span className="set-badge">
            {primaryId.value} ({gauge.gauge_suffix})
          </span>
        )}
      </div>

      {/* Display name */}
      <div className="gauge-name">{gauge.displayName}</div>

      {/* Status, calibration, etc. */}
      {/* ... */}
    </div>
  );
}
```

**File**: `frontend/src/modules/gauge/components/GaugeDetail.tsx`

```tsx
// Update to handle navigation by serial number for spare thread gauges
// Modal title should show displayName
<Modal.Header>
  <h2>{gauge.displayName}</h2>
</Modal.Header>

// In Basic Information section
<div className="info-row">
  <span className="info-label">
    {gauge.equipment_type === 'thread_gauge' && !gauge.gauge_id
      ? 'Serial Number:'
      : 'Gauge ID:'}
  </span>
  <span className="info-value bold">
    {gauge.equipment_type === 'thread_gauge' && !gauge.gauge_id
      ? gauge.serial_number
      : gauge.gauge_id}
  </span>
</div>

{/* For thread gauges in sets, show both */}
{gauge.equipment_type === 'thread_gauge' && gauge.gauge_id && (
  <div className="info-row">
    <span className="info-label">Serial Number:</span>
    <span className="info-value">{gauge.serial_number}</span>
  </div>
)}

{/* Show set info if part of a set */}
{gauge.gauge_id && gauge.companion_gauge_id && (
  <>
    <div className="info-row">
      <span className="info-label">Part of Set:</span>
      <Link to={`/gauges/sets/${gauge.gauge_id}`}>
        {gauge.gauge_id}
      </Link>
    </div>
    <div className="info-row">
      <span className="info-label">Companion Gauge:</span>
      <Link to={`/gauges/by-serial/${companionSerialNumber}`}>
        {companionSerialNumber}
      </Link>
    </div>
  </>
)}
```

### 5. Component Updates - Set Details Page

**File**: `frontend/src/modules/gauge/pages/SetDetailsPage.tsx`

```tsx
// Update to show serial numbers in Gauge Members section
function SetDetailsPage() {
  const { setId } = useParams();
  const { data: gauges, isLoading } = useQuery(
    ['gauge-set', setId],
    () => gaugeService.getByGaugeId(setId)  // Returns array of 2 gauges
  );

  if (isLoading) return <LoadingSpinner />;

  const goGauge = gauges.find(g => g.gauge_suffix === 'A');
  const noGoGauge = gauges.find(g => g.gauge_suffix === 'B');

  return (
    <Modal>
      <Modal.Header>
        {/* Show specs, not set ID */}
        <h2>{goGauge.displayName.replace(' GO ', ' ')}</h2>
      </Modal.Header>

      <Modal.Body>
        {/* ... Basic Information ... */}

        {/* Gauge Members section */}
        <div className="section">
          <h3>Gauge Members</h3>
          <div className="info-row">
            <span className="info-label">GO Gauge (A):</span>
            <Link to={`/gauges/by-serial/${goGauge.serial_number}`}>
              {goGauge.serial_number}
            </Link>
          </div>
          <div className="info-row">
            <span className="info-label">NO GO Gauge (B):</span>
            <Link to={`/gauges/by-serial/${noGoGauge.serial_number}`}>
              {noGoGauge.serial_number}
            </Link>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={() => handleReplaceGauge()}>Replace Gauge</Button>
        <Button onClick={() => handleUnpairSet()}>Unpair Set</Button>
        <Button onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
```

### 6. Component Updates - Spare Inventory

**File**: `frontend/src/modules/gauge/pages/SpareInventoryPage.tsx`

```tsx
// Update to use serial numbers instead of gauge IDs
function SpareInventoryPage() {
  const { data: spareGauges, isLoading } = useQuery(
    ['spare-thread-gauges'],
    () => gaugeService.getSpareThreadGauges()
  );

  // Group by specifications instead of gauge_id base
  const groupedGauges = useMemo(() => {
    const groups = {};

    spareGauges?.forEach(gauge => {
      // Create spec key: "1/4-20 2A"
      const specKey = `${gauge.thread_size} ${gauge.thread_class}`;

      if (!groups[specKey]) {
        groups[specKey] = { goGauges: [], noGoGauges: [] };
      }

      // Determine if GO or NO GO by gauge type field
      if (gauge.gauge_type === 'go' || gauge.gauge_type?.toLowerCase().includes('go')) {
        groups[specKey].goGauges.push(gauge);
      } else {
        groups[specKey].noGoGauges.push(gauge);
      }
    });

    return groups;
  }, [spareGauges]);

  return (
    <div>
      {Object.entries(groupedGauges).map(([spec, { goGauges, noGoGauges }]) => (
        <div key={spec} className="spec-group">
          <h3>{spec}</h3>

          <div className="pairing-interface">
            {/* GO Gauges column */}
            <div className="go-column">
              <h4>GO Gauges</h4>
              {goGauges.map(gauge => (
                <div key={gauge.serial_number} className="spare-gauge-card">
                  <strong>S/N: {gauge.serial_number}</strong>
                  <span>{gauge.displayName}</span>
                  <Button onClick={() => selectForPairing(gauge)}>Select</Button>
                </div>
              ))}
            </div>

            {/* NO GO Gauges column */}
            <div className="nogo-column">
              <h4>NO GO Gauges</h4>
              {noGoGauges.map(gauge => (
                <div key={gauge.serial_number} className="spare-gauge-card">
                  <strong>S/N: {gauge.serial_number}</strong>
                  <span>{gauge.displayName}</span>
                  <Button onClick={() => selectForPairing(gauge)}>Select</Button>
                </div>
              ))}
            </div>
          </div>

          {/* Pairing button */}
          {selectedGo && selectedNoGo && selectedGo.thread_size === spec && (
            <Button onClick={() => handlePairGauges(selectedGo, selectedNoGo)}>
              Create Set
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

async function handlePairGauges(goGauge, noGoGauge) {
  try {
    const result = await gaugeService.createSetFromSpares(
      goGauge.serial_number,
      noGoGauge.serial_number
    );

    toast.success(`Set ${result.setId} created successfully!`);
    // Refresh spares list
    queryClient.invalidateQueries(['spare-thread-gauges']);
  } catch (error) {
    toast.error('Failed to create set: ' + error.message);
  }
}
```

### 7. Routing Updates

**File**: `frontend/src/modules/gauge/routes.tsx`

```tsx
// Add new route for serial number lookup
<Route path="/by-serial/:serialNumber" element={<GaugeDetailBySerial />} />

// GaugeDetailBySerial component wrapper
function GaugeDetailBySerial() {
  const { serialNumber } = useParams();
  const { data: gauge, isLoading } = useQuery(
    ['gauge-by-serial', serialNumber],
    () => gaugeService.getBySerialNumber(serialNumber)
  );

  if (isLoading) return <LoadingSpinner />;
  if (!gauge) return <NotFound />;

  // Redirect to standard detail page using numeric ID
  return <Navigate to={`/gauges/detail/${gauge.id}`} replace />;
}
```

---

## Implementation Phases

### Phase 1: Database & Backend Foundation (Week 1)
**Goal**: Prepare database and core backend services

1. Create migration file with schema changes
2. Update GaugeIdService to handle new logic
3. Add serial number validation
4. Update GaugeRepository with new query methods
5. Write comprehensive unit tests

**Deliverables**:
- Migration file ready for review
- Backend services updated and tested
- Unit test coverage ≥80%

### Phase 2: Backend Set Operations (Week 2)
**Goal**: Implement set creation, pairing, and unpairing

1. Update GaugeSetService with new methods
2. Create new API endpoints
3. Update validation rules
4. Write integration tests
5. Update API documentation

**Deliverables**:
- All set operations working
- API endpoints tested
- Postman collection updated

### Phase 3: Frontend Types & Services (Week 3)
**Goal**: Update frontend foundation

1. Update TypeScript types
2. Add new service methods
3. Create helper functions
4. Update hooks if needed

**Deliverables**:
- Type safety maintained
- Service layer complete
- Helper utilities tested

### Phase 4: Frontend Components - Creation (Week 4)
**Goal**: Update gauge creation workflows

1. Update ThreadGaugeForm (required serial number)
2. Update AddGaugeWizard
3. Add validation and error handling
4. Test creation flows

**Deliverables**:
- Can create spare thread gauges with serial numbers
- Can create thread gauge sets
- Validation working

### Phase 5: Frontend Components - Display (Week 5)
**Goal**: Update display components

1. Update GaugeRow component
2. Update GaugeDetail component
3. Update SetDetailsPage
4. Add routing for serial number lookup

**Deliverables**:
- Spare gauges show serial numbers
- Sets show correctly
- Navigation works

### Phase 6: Frontend Components - Spare Pairing (Week 6)
**Goal**: Update spare inventory and pairing

1. Update SpareInventoryPage
2. Implement pairing interface
3. Add unpair and replace functionality
4. Test all workflows

**Deliverables**:
- Can pair spares into sets
- Can unpair sets
- Can replace gauges in sets

### Phase 7: Data Migration (Week 7)
**Goal**: Migrate existing data

1. Backup production database
2. Run migration on staging
3. Validate data integrity
4. Run migration on production
5. Monitor for issues

**Deliverables**:
- All existing data migrated
- No data loss
- System functioning normally

### Phase 8: Testing & Documentation (Week 8)
**Goal**: Comprehensive testing and docs

1. End-to-end testing
2. User acceptance testing
3. Update user documentation
4. Create training materials

**Deliverables**:
- All tests passing
- Documentation complete
- Team trained

---

## Testing Strategy

### Unit Tests
- GaugeIdService: ID generation logic
- GaugeSetService: Set operations
- GaugeRepository: Query methods
- Validation: Serial number requirements

### Integration Tests
- API endpoints for set operations
- Database transactions
- Error handling

### End-to-End Tests
- Create spare thread gauge with serial number
- Pair two spares into a set
- Unpair a set
- Replace a gauge in a set
- Navigation by serial number

### Manual Testing Checklist
- [ ] Create spare GO thread gauge
- [ ] Create spare NO GO thread gauge
- [ ] View spare inventory
- [ ] Pair two compatible spares
- [ ] View set details
- [ ] Click on serial number links
- [ ] Replace gauge in set
- [ ] Unpair set
- [ ] Verify gauges return to spare status
- [ ] Create thread gauge set directly
- [ ] Verify non-thread gauges unaffected

---

## Data Migration Notes

### Pre-Migration Validation
1. Count all thread gauges: `SELECT COUNT(*) FROM gauges WHERE equipment_type = 'thread_gauge'`
2. Count paired thread gauges: `SELECT COUNT(*) FROM gauges WHERE equipment_type = 'thread_gauge' AND companion_gauge_id IS NOT NULL`
3. Count unpaired thread gauges: `SELECT COUNT(*) FROM gauges WHERE equipment_type = 'thread_gauge' AND companion_gauge_id IS NULL`
4. Find thread gauges without serial numbers: `SELECT * FROM gauges WHERE equipment_type = 'thread_gauge' AND (serial_number IS NULL OR serial_number = '')`

### Migration Steps
1. **Backup**: Full database backup before migration
2. **Dry Run**: Test migration on staging environment
3. **Serial Number Assignment**: Manually review gauges without serial numbers and assign real values
4. **Execute Migration**: Run migration script
5. **Validation**: Verify all constraints are satisfied
6. **Rollback Plan**: Keep backup ready in case of issues

### Post-Migration Validation
1. Verify constraint is working: Try inserting thread gauge without serial number (should fail)
2. Verify unique constraint: Try inserting duplicate serial number (should fail)
3. Verify paired gauges: Check all sets have matching gauge_id
4. Verify spare gauges: Check all unpaired thread gauges have gauge_id = NULL
5. Count validation: Ensure counts match pre-migration

---

## Risks & Mitigation

### Risk 1: Data Loss During Migration
**Mitigation**:
- Full database backup before migration
- Test on staging first
- Gradual rollout with monitoring

### Risk 2: Existing Integrations Break
**Mitigation**:
- Maintain backward compatibility where possible
- Version API endpoints (v2)
- Comprehensive testing

### Risk 3: Users Enter Duplicate Serial Numbers
**Mitigation**:
- Database unique constraint
- Frontend validation
- Clear error messages

### Risk 4: Complex Set Operations Cause Data Inconsistency
**Mitigation**:
- Use database transactions
- Add constraint checks
- Audit logging via gauge_companion_history

### Risk 5: Performance Impact from NULL Checks
**Mitigation**:
- Add appropriate indexes
- Monitor query performance
- Optimize queries if needed

---

## Success Criteria

- [ ] All thread gauges have serial numbers
- [ ] Spare thread gauges have gauge_id = NULL
- [ ] Paired thread gauges have same gauge_id (set ID)
- [ ] Can create spare thread gauges
- [ ] Can pair spares into sets
- [ ] Can unpair sets
- [ ] Can replace gauges in sets
- [ ] Non-thread gauges unaffected
- [ ] No data loss during migration
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Team trained and ready

---

## Rollback Plan

If critical issues arise:

1. **Immediate**: Stop new gauge creation
2. **Restore Database**: Restore from pre-migration backup
3. **Revert Code**: Rollback backend and frontend to previous version
4. **Investigate**: Analyze what went wrong
5. **Fix**: Address issues in development environment
6. **Retry**: Plan new migration date after fixes validated

---

## Next Steps

1. **Review this document** with the development team
2. **Estimate effort** for each phase
3. **Create tickets** in project management system
4. **Schedule phases** based on team capacity
5. **Begin Phase 1** with database changes

---

## Questions & Decisions Needed

1. **Serial Number Format**: Any specific format requirements? (e.g., alphanumeric, length)
2. **Legacy Data**: How to handle existing thread gauges without serial numbers?
3. **Timeline**: What's the target completion date?
4. **Testing Window**: How much time for UAT before production deployment?
5. **Rollback Threshold**: What error rate triggers rollback? (e.g., >5% failures)

---

**Document Version**: 1.0
**Last Updated**: October 28, 2025
**Author**: Development Team
**Status**: Awaiting Review & Approval
