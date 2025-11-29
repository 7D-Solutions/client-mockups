# Thread Gauge Serial Number System - SIMPLIFIED Plan

**Date**: 2025-10-28
**Status**: Simplified Approach - Real Fix Without Over-Engineering
**Breaking Changes**: YES - But minimal scope
**Test Data**: Will be wiped and recreated

---

## Core Principle

**SIMPLE AND DIRECT:**
- Spare thread gauges: `gauge_id = NULL`, identified by `serial_number`
- Thread gauge sets: `gauge_id = SP####` (shared), both have `serial_number`
- Frontend uses serial numbers for spares, gauge_id for sets
- Backend has dedicated methods - no "smart" dual lookup

---

## What Actually Needs to Change

### Database Changes (MINIMAL)

**Single Migration File**:
```sql
-- 1. Make gauge_id nullable
ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) UNIQUE;

-- 2. Require serial number for thread gauges
ALTER TABLE gauges
  ADD CONSTRAINT chk_thread_serial_required
  CHECK (
    (equipment_type != 'thread_gauge')
    OR (equipment_type = 'thread_gauge' AND serial_number IS NOT NULL)
  );

-- 3. ONE index for spare lookups (only if needed)
CREATE INDEX idx_spare_thread_gauges
  ON gauges(equipment_type, serial_number)
  WHERE gauge_id IS NULL AND equipment_type = 'thread_gauge';

-- 4. Clear existing test data
DELETE FROM gauges WHERE equipment_type = 'thread_gauge';
```

**That's it. No complex constraints, no multiple indexes.**

---

## Backend Changes

### 1. GaugeRepository - Add TWO Methods Only

```javascript
// Find by serial number (for spares)
async findBySerialNumber(serialNumber) {
  const query = `${GAUGE_WITH_RELATIONS} WHERE g.serial_number = ?`;
  const [rows] = await pool.query(query, [serialNumber]);
  return rows.length > 0 ? GaugeDTOMapper.transformToDTO(rows[0]) : null;
}

// Find spare thread gauges (for pairing interface)
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

**No "smart" identifier resolution. Frontend knows which method to call.**

---

### 2. GaugeCreationService - Update ONE Method

```javascript
async createGauge(gaugeData, userId) {
  // Thread gauge validation
  if (gaugeData.equipment_type === 'thread_gauge') {
    if (!gaugeData.serial_number) {
      throw new ValidationError('Serial number is required for thread gauges');
    }
  }

  // Thread gauges start as spares (gauge_id = NULL)
  let gaugeId = null;

  if (gaugeData.equipment_type !== 'thread_gauge') {
    gaugeId = await GaugeIdService.generateSystemId(
      gaugeData.category_id,
      gaugeData.equipment_type
    );
  }

  return await transaction(async (conn) => {
    const gauge = await GaugeRepository.create(conn, {
      ...gaugeData,
      gauge_id: gaugeId,
      created_by: userId
    });

    await AuditService.log(conn, {
      entity_type: 'gauge',
      entity_id: gauge.id,
      action: 'create',
      details: gaugeId || `Spare S/N ${gaugeData.serial_number}`,
      user_id: userId
    });

    return gauge;
  });
}
```

---

### 3. GaugeSetService - THREE New Methods

**These are NEW operations, not rewrites:**

```javascript
// Pair two spares
async pairSpares(goSerialNumber, noGoSerialNumber, sharedData, userId) {
  return await transaction(async (conn) => {
    const goGauge = await GaugeRepository.findBySerialNumber(goSerialNumber);
    const noGoGauge = await GaugeRepository.findBySerialNumber(noGoSerialNumber);

    if (!goGauge || !noGoGauge) {
      throw new NotFoundError('Gauge not found');
    }

    if (goGauge.gauge_id || noGoGauge.gauge_id) {
      throw new ValidationError('Both must be unpaired spares');
    }

    const setId = await GaugeIdService.generateSetId(goGauge.category_id);

    await GaugeRepository.update(conn, goGauge.id, {
      gauge_id: setId,
      gauge_suffix: 'A',
      companion_gauge_id: noGoGauge.id,
      ...sharedData
    });

    await GaugeRepository.update(conn, noGoGauge.id, {
      gauge_id: setId,
      gauge_suffix: 'B',
      companion_gauge_id: goGauge.id,
      ...sharedData
    });

    return setId;
  });
}

// Unpair a set
async unpairSet(setId, userId) {
  return await transaction(async (conn) => {
    const gauges = await GaugeRepository.findByGaugeId(setId);

    for (const gauge of gauges) {
      await GaugeRepository.update(conn, gauge.id, {
        gauge_id: null,
        gauge_suffix: null,
        companion_gauge_id: null
      });
    }
  });
}

// Replace gauge in set
async replaceGaugeInSet(setId, oldSerialNumber, newSerialNumber, userId) {
  return await transaction(async (conn) => {
    const oldGauge = await GaugeRepository.findBySerialNumber(oldSerialNumber);
    const newGauge = await GaugeRepository.findBySerialNumber(newSerialNumber);

    if (oldGauge.gauge_id !== setId) {
      throw new ValidationError('Old gauge not in set');
    }
    if (newGauge.gauge_id) {
      throw new ValidationError('New gauge must be spare');
    }

    // Old gauge → spare
    await GaugeRepository.update(conn, oldGauge.id, {
      gauge_id: null,
      gauge_suffix: null,
      companion_gauge_id: null
    });

    // New gauge → set
    await GaugeRepository.update(conn, newGauge.id, {
      gauge_id: setId,
      gauge_suffix: oldGauge.gauge_suffix,
      companion_gauge_id: oldGauge.companion_gauge_id
    });

    // Update companion
    await GaugeRepository.update(conn, oldGauge.companion_gauge_id, {
      companion_gauge_id: newGauge.id
    });
  });
}
```

---

### 4. API Routes - Add FOUR Simple Endpoints

**Don't modify existing endpoints. Add new ones:**

```javascript
// Get spare thread gauges
router.get('/api/gauges/spare-thread-gauges',
  authenticateToken,
  async (req, res) => {
    const spares = await GaugeRepository.findSpareThreadGauges(req.query);
    res.json({ success: true, data: spares });
  }
);

// Pair spares
router.post('/api/gauges/pair-spares',
  authenticateToken,
  async (req, res) => {
    const { go_serial_number, nogo_serial_number, ...sharedData } = req.body;
    const setId = await GaugeSetService.pairSpares(
      go_serial_number,
      nogo_serial_number,
      sharedData,
      req.user.id
    );
    res.json({ success: true, data: { setId } });
  }
);

// Unpair set
router.post('/api/gauges/unpair-set/:setId',
  authenticateToken,
  async (req, res) => {
    await GaugeSetService.unpairSet(req.params.setId, req.user.id);
    res.json({ success: true });
  }
);

// Replace gauge
router.post('/api/gauges/replace-in-set/:setId',
  authenticateToken,
  async (req, res) => {
    await GaugeSetService.replaceGaugeInSet(
      req.params.setId,
      req.body.old_serial_number,
      req.body.new_serial_number,
      req.user.id
    );
    res.json({ success: true });
  }
);
```

**Existing endpoints stay unchanged. No "dual identifier" complexity.**

---

## Frontend Changes

### 1. Types - Simple Helpers

```typescript
interface Gauge {
  id: number;
  gauge_id: string | null;  // NULL for spares
  serial_number: string;
  // ... rest unchanged
}

// Simple display helper
function getDisplayName(gauge: Gauge): string {
  if (gauge.equipment_type === 'thread_gauge' && !gauge.gauge_id) {
    return `S/N ${gauge.serial_number}`;
  }
  return gauge.gauge_id || gauge.serial_number;
}
```

---

### 2. Service - Add Four Methods

```typescript
const gaugeService = {
  // Existing methods unchanged...

  // NEW: Get spare thread gauges
  getSpareThreadGauges: async (filters?: any) => {
    const params = new URLSearchParams(filters);
    const response = await apiClient.get(`/gauges/spare-thread-gauges?${params}`);
    return response.data;
  },

  // NEW: Pair spares
  pairSpares: async (goSerial: string, noGoSerial: string, data: any) => {
    const response = await apiClient.post('/gauges/pair-spares', {
      go_serial_number: goSerial,
      nogo_serial_number: noGoSerial,
      ...data
    });
    return response.data;
  },

  // NEW: Unpair set
  unpairSet: async (setId: string) => {
    const response = await apiClient.post(`/gauges/unpair-set/${setId}`);
    return response.data;
  },

  // NEW: Replace gauge
  replaceGaugeInSet: async (setId: string, oldSerial: string, newSerial: string) => {
    const response = await apiClient.post(`/gauges/replace-in-set/${setId}`, {
      old_serial_number: oldSerial,
      new_serial_number: newSerial
    });
    return response.data;
  }
};
```

---

### 3. Components - Update Display Logic Only

**ThreadGaugeForm**: Make serial_number required
**GaugeDetail**: Use `getDisplayName()` helper
**SetDetailsPage**: Show serial numbers for members
**GaugeList**: Use `getDisplayName()` helper

**No major rewrites. Just display logic changes.**

---

## What We're NOT Doing (Avoiding Over-Engineering)

❌ **NO** "smart identifier resolution" that tries both
❌ **NO** rewriting all 232 tests - only tests for thread gauges
❌ **NO** modifying existing API endpoints - add new ones instead
❌ **NO** multiple complex indexes - one simple index
❌ **NO** dual identifier support everywhere - be explicit
❌ **NO** helper functions for every edge case
❌ **NO** elaborate validation - simple checks only

---

## Files Changed

### Database
1. `migrations/XXX_thread_serial_system.sql` - ONE migration file

### Backend (6 files)
2. `GaugeRepository.js` - Add 2 methods
3. `GaugeCreationService.js` - Update 1 method
4. `GaugeSetService.js` - Add 3 methods
5. `GaugeIdService.js` - Add 1 method (generateSetId)
6. `routes/gauges.js` - Add 4 endpoints
7. `validation/gaugeValidation.js` - Add serial validation

### Frontend (6 files)
8. `types/index.ts` - Update Gauge interface, add 1 helper
9. `services/gaugeService.ts` - Add 4 methods
10. `forms/ThreadGaugeForm.tsx` - Make serial required
11. `components/GaugeDetail.tsx` - Update display
12. `pages/SetDetailsPage.tsx` - Update display
13. `components/SparePairingInterface.tsx` - NEW component

### Tests (Only What Changed)
14. Thread gauge creation tests
15. Pairing/unpairing tests
16. Spare inventory tests

**Total: ~14 files** (not 50+ like the over-engineered plan)

---

## Implementation Steps

### Step 1: Database (30 min)
- [ ] Create migration file
- [ ] Run on local database
- [ ] Verify gauge_id is nullable
- [ ] Delete test thread gauges

### Step 2: Backend Core (2-3 hours)
- [ ] Add `findBySerialNumber()` to repository
- [ ] Add `findSpareThreadGauges()` to repository
- [ ] Update `createGauge()` in creation service
- [ ] Add `generateSetId()` to ID service

### Step 3: Backend Set Operations (2-3 hours)
- [ ] Add `pairSpares()` to set service
- [ ] Add `unpairSet()` to set service
- [ ] Add `replaceGaugeInSet()` to set service
- [ ] Test all three methods

### Step 4: Backend API (1 hour)
- [ ] Add 4 new endpoints
- [ ] Add validation rules
- [ ] Test with Postman

### Step 5: Frontend Types & Services (1 hour)
- [ ] Update Gauge interface
- [ ] Add display helper
- [ ] Add 4 service methods

### Step 6: Frontend Components (3-4 hours)
- [ ] Update ThreadGaugeForm
- [ ] Update GaugeDetail display
- [ ] Update SetDetailsPage display
- [ ] Create SparePairingInterface

### Step 7: Testing (2-3 hours)
- [ ] Write tests for new methods
- [ ] Test create spare → pair → unpair
- [ ] Test replace gauge workflow
- [ ] Verify display logic

**Total Time: 2-3 days** (not 3-4 weeks)

---

## Success Criteria

**Database**:
- [ ] gauge_id is nullable
- [ ] Thread gauges require serial_number
- [ ] Test data cleared

**Backend**:
- [ ] Create spare thread gauge → gauge_id = NULL
- [ ] Pair two spares → both get gauge_id = SP####A/B
- [ ] Unpair set → both return to gauge_id = NULL
- [ ] Replace gauge → old becomes spare, new joins set

**Frontend**:
- [ ] Spare displays as "S/N {serial}"
- [ ] Set displays as "{setId}"
- [ ] Serial numbers clickable in set details
- [ ] Pairing interface works

**Tests**:
- [ ] All affected tests passing
- [ ] New workflow tests passing

---

## What Makes This Simple

1. **Clear responsibility**: Frontend knows when to use serial vs gauge_id
2. **Additive changes**: New methods, not rewrites
3. **Minimal scope**: Only thread gauge workflows affected
4. **No dual support**: Each endpoint has ONE identifier type
5. **Direct approach**: No "smart" logic, no guessing

**This is the REAL fix without over-engineering.**

