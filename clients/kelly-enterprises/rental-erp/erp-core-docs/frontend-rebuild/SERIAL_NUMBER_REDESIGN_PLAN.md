# Thread Gauge Serial Number System - Complete Redesign Plan

**Date**: 2025-10-28
**Status**: APPROVED - Real Fix, No Compromises
**Breaking Changes**: YES - Complete system redesign
**Test Data**: Will be wiped and recreated

---

## Philosophy

**NO SHORTCUTS. NO PATCHES. PROPER ARCHITECTURE.**

- Serial number IS the identifier for spare thread gauges
- `gauge_id` becomes nullable for thread gauges
- Database, backend, and frontend redesigned for dual identifier support
- All 232 tests will be rewritten to match new architecture

---

## Core Architecture Changes

### Database: Dual Identifier System

**Principle**: Support both `gauge_id` (for sets and non-thread gauges) and `serial_number` (for spare thread gauges)

```sql
-- Make gauge_id nullable
ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) UNIQUE;

-- Add constraint: serial number REQUIRED for thread gauges
ALTER TABLE gauges
  ADD CONSTRAINT chk_thread_serial_required
  CHECK (
    (equipment_type != 'thread_gauge')
    OR (equipment_type = 'thread_gauge' AND serial_number IS NOT NULL)
  );

-- Add constraint: thread gauges must have EITHER gauge_id OR be spare
ALTER TABLE gauges
  ADD CONSTRAINT chk_thread_identifier
  CHECK (
    (equipment_type != 'thread_gauge')
    OR (equipment_type = 'thread_gauge' AND (gauge_id IS NOT NULL OR companion_gauge_id IS NULL))
  );

-- Unique constraint on serial number for thread gauges only
CREATE UNIQUE INDEX idx_thread_serial_unique
  ON gauges(serial_number)
  WHERE equipment_type = 'thread_gauge';

-- Index for finding spare thread gauges efficiently
CREATE INDEX idx_spare_thread_gauges
  ON gauges(equipment_type, serial_number)
  WHERE gauge_id IS NULL AND equipment_type = 'thread_gauge';

-- Composite index for identifier lookups
CREATE INDEX idx_gauge_identifier_lookup
  ON gauges(gauge_id, serial_number, equipment_type);
```

### Backend: Repository Pattern Redesign

**Core Change**: All repository methods must support dual identifier lookup

**New Base Pattern**:
```javascript
class GaugeRepository {
  // Primary lookup method - smart identifier resolution
  async findByIdentifier(identifier, equipmentType = null) {
    // For thread gauges, try serial number first
    if (equipmentType === 'thread_gauge' || !equipmentType) {
      const bySerial = await this.findBySerialNumber(identifier);
      if (bySerial) return bySerial;
    }

    // Fall back to gauge_id
    return await this.findByGaugeId(identifier);
  }

  async findByGaugeId(gaugeId) {
    const query = `${GAUGE_WITH_RELATIONS} WHERE g.gauge_id = ?`;
    const [rows] = await pool.query(query, [gaugeId]);
    return rows.length > 0 ? GaugeDTOMapper.transformToDTO(rows[0]) : null;
  }

  async findBySerialNumber(serialNumber) {
    const query = `${GAUGE_WITH_RELATIONS} WHERE g.serial_number = ?`;
    const [rows] = await pool.query(query, [serialNumber]);
    return rows.length > 0 ? GaugeDTOMapper.transformToDTO(rows[0]) : null;
  }

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

    if (filters.gauge_type) {
      query += ` AND gt.gauge_type = ?`;
      params.push(filters.gauge_type);
    }

    const [rows] = await pool.query(query, params);
    return rows.map(GaugeDTOMapper.transformToDTO);
  }
}
```

### Backend: Service Layer Redesign

**GaugeCreationService** - Thread gauge creation logic:
```javascript
async createGauge(gaugeData, userId) {
  // Validate serial number for thread gauges
  if (gaugeData.equipment_type === 'thread_gauge') {
    if (!gaugeData.serial_number) {
      throw new ValidationError('Serial number is required for thread gauges');
    }

    // Check for duplicate serial number
    const existing = await GaugeRepository.findBySerialNumber(gaugeData.serial_number);
    if (existing) {
      throw new ValidationError(`Serial number ${gaugeData.serial_number} already exists`);
    }
  }

  // Thread gauges start with NO gauge_id (spare state)
  let gaugeId = null;

  // Only non-thread gauges get immediate gauge_id
  if (gaugeData.equipment_type !== 'thread_gauge') {
    gaugeId = await GaugeIdService.generateSystemId(
      gaugeData.category_id,
      gaugeData.equipment_type
    );
  }

  await transaction(async (conn) => {
    const gauge = await GaugeRepository.create(conn, {
      ...gaugeData,
      gauge_id: gaugeId,
      created_by: userId
    });

    await AuditService.log(conn, {
      entity_type: 'gauge',
      entity_id: gauge.id,
      action: 'create',
      details: gaugeId
        ? `Created ${gaugeData.equipment_type} with ID ${gaugeId}`
        : `Created spare thread gauge with S/N ${gaugeData.serial_number}`,
      user_id: userId
    });

    return gauge;
  });
}
```

**GaugeSetService** - Pairing logic redesigned:
```javascript
async createSet(goSerialNumber, noGoSerialNumber, sharedData, userId) {
  await transaction(async (conn) => {
    // 1. Find both gauges by serial number
    const goGauge = await GaugeRepository.findBySerialNumber(goSerialNumber);
    const noGoGauge = await GaugeRepository.findBySerialNumber(noGoSerialNumber);

    if (!goGauge || !noGoGauge) {
      throw new NotFoundError('One or both gauges not found');
    }

    // 2. Validate both are unpaired spares (gauge_id IS NULL)
    if (goGauge.gauge_id !== null || noGoGauge.gauge_id !== null) {
      throw new ValidationError('Both gauges must be unpaired spares');
    }

    // 3. Validate compatibility
    await this.validatePairingCompatibility(goGauge, noGoGauge);

    // 4. Generate new SET ID (SP####)
    const setId = await GaugeIdService.generateSetId(goGauge.category_id);

    // 5. Update GO gauge
    await GaugeRepository.update(conn, goGauge.id, {
      gauge_id: setId,
      gauge_suffix: 'A',
      companion_gauge_id: noGoGauge.id,
      storage_location: sharedData.storage_location,
      is_spare: false
    });

    // 6. Update NO GO gauge
    await GaugeRepository.update(conn, noGoGauge.id, {
      gauge_id: setId,
      gauge_suffix: 'B',
      companion_gauge_id: goGauge.id,
      storage_location: sharedData.storage_location,
      is_spare: false
    });

    // 7. Audit log
    await AuditService.log(conn, {
      entity_type: 'gauge_set',
      entity_id: setId,
      action: 'create',
      details: `Created set ${setId} from spares S/N ${goSerialNumber} and ${noGoSerialNumber}`,
      user_id: userId
    });

    return { setId, goGauge, noGoGauge };
  });
}

async unpairSet(setId, userId) {
  await transaction(async (conn) => {
    // Find both gauges in the set
    const gauges = await GaugeRepository.findByGaugeId(setId);

    if (gauges.length !== 2) {
      throw new ValidationError(`Set ${setId} does not have exactly 2 gauges`);
    }

    // Return both to spare state
    for (const gauge of gauges) {
      await GaugeRepository.update(conn, gauge.id, {
        gauge_id: null,           // ← KEY CHANGE: Remove gauge_id
        gauge_suffix: null,
        companion_gauge_id: null,
        is_spare: true
      });
    }

    await AuditService.log(conn, {
      entity_type: 'gauge_set',
      entity_id: setId,
      action: 'unpair',
      details: `Unpaired set ${setId}, gauges returned to spare inventory`,
      user_id: userId
    });
  });
}

async replaceGaugeInSet(setId, oldSerialNumber, newSerialNumber, userId) {
  await transaction(async (conn) => {
    const oldGauge = await GaugeRepository.findBySerialNumber(oldSerialNumber);
    const newGauge = await GaugeRepository.findBySerialNumber(newSerialNumber);

    // Validate
    if (oldGauge.gauge_id !== setId) {
      throw new ValidationError('Old gauge is not part of this set');
    }
    if (newGauge.gauge_id !== null) {
      throw new ValidationError('New gauge must be an unpaired spare');
    }

    // Validate compatibility
    await this.validatePairingCompatibility(oldGauge, newGauge);

    const companionId = oldGauge.companion_gauge_id;

    // Return old gauge to spare state
    await GaugeRepository.update(conn, oldGauge.id, {
      gauge_id: null,           // ← Remove gauge_id
      gauge_suffix: null,
      companion_gauge_id: null,
      is_spare: true
    });

    // Add new gauge to set
    await GaugeRepository.update(conn, newGauge.id, {
      gauge_id: setId,
      gauge_suffix: oldGauge.gauge_suffix,
      companion_gauge_id: companionId,
      storage_location: oldGauge.storage_location,
      is_spare: false
    });

    // Update companion's reference
    await GaugeRepository.update(conn, companionId, {
      companion_gauge_id: newGauge.id
    });

    await AuditService.log(conn, {
      entity_type: 'gauge_set',
      entity_id: setId,
      action: 'replace_gauge',
      details: `Replaced S/N ${oldSerialNumber} with S/N ${newSerialNumber} in set ${setId}`,
      user_id: userId
    });
  });
}
```

### Backend: API Endpoints Redesign

**Key Principle**: All endpoints must accept BOTH `gauge_id` and `serial_number`

```javascript
// GET gauge by identifier (auto-detect)
router.get('/api/gauges/:identifier',
  authenticateToken,
  async (req, res) => {
    const gauge = await GaugeRepository.findByIdentifier(req.params.identifier);

    if (!gauge) {
      return res.status(404).json({
        success: false,
        message: 'Gauge not found'
      });
    }

    res.json({ success: true, data: gauge });
  }
);

// GET spare thread gauges (for pairing interface)
router.get('/api/gauges/spare-thread-gauges',
  authenticateToken,
  async (req, res) => {
    const filters = {
      thread_size: req.query.thread_size,
      thread_class: req.query.thread_class,
      gauge_type: req.query.gauge_type
    };

    const spares = await GaugeRepository.findSpareThreadGauges(filters);
    res.json({ success: true, data: spares });
  }
);

// POST create spare thread gauge
router.post('/api/gauges',
  authenticateToken,
  validateGaugeCreation,
  async (req, res) => {
    const gauge = await GaugeCreationService.createGauge(req.body, req.user.id);
    res.json({ success: true, data: gauge });
  }
);

// POST pair two spare thread gauges
router.post('/api/gauges/pair-spares',
  authenticateToken,
  body('go_serial_number').notEmpty(),
  body('nogo_serial_number').notEmpty(),
  async (req, res) => {
    const { go_serial_number, nogo_serial_number, ...sharedData } = req.body;

    const result = await GaugeSetService.createSet(
      go_serial_number,
      nogo_serial_number,
      sharedData,
      req.user.id
    );

    res.json({ success: true, data: result });
  }
);

// POST unpair a set
router.post('/api/gauges/unpair-set/:setId',
  authenticateToken,
  async (req, res) => {
    await GaugeSetService.unpairSet(req.params.setId, req.user.id);
    res.json({ success: true, message: 'Set unpaired successfully' });
  }
);

// POST replace gauge in set
router.post('/api/gauges/replace-in-set/:setId',
  authenticateToken,
  body('old_serial_number').notEmpty(),
  body('new_serial_number').notEmpty(),
  async (req, res) => {
    const { old_serial_number, new_serial_number } = req.body;

    await GaugeSetService.replaceGaugeInSet(
      req.params.setId,
      old_serial_number,
      new_serial_number,
      req.user.id
    );

    res.json({ success: true, message: 'Gauge replaced successfully' });
  }
);

// POST send to calibration (support both identifier types)
router.post('/api/calibration/send',
  authenticateToken,
  async (req, res) => {
    const { identifiers } = req.body; // Array of gauge_id or serial_number

    const gauges = await Promise.all(
      identifiers.map(id => GaugeRepository.findByIdentifier(id))
    );

    const result = await CalibrationWorkflowService.sendToCalibration(
      gauges.filter(Boolean),
      req.user.id
    );

    res.json({ success: true, data: result });
  }
);

// POST checkout set (by gauge_id only - sets always have gauge_id)
router.post('/api/gauges/checkout/:setId',
  authenticateToken,
  async (req, res) => {
    // Verify it's a set (has gauge_id)
    const gauges = await GaugeRepository.findByGaugeId(req.params.setId);

    if (gauges.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Only complete sets can be checked out'
      });
    }

    const result = await GaugeCheckoutService.checkoutSet(
      req.params.setId,
      req.body,
      req.user.id
    );

    res.json({ success: true, data: result });
  }
);
```

### Frontend: Complete TypeScript Redesign

**Type Definitions**:
```typescript
// frontend/src/modules/gauge/types/index.ts

interface Gauge {
  id: number;
  gauge_id: string | null;          // NULL for spare thread gauges
  serial_number: string;             // REQUIRED for thread gauges
  gauge_suffix: 'A' | 'B' | null;
  companion_gauge_id: number | null;
  equipment_type: EquipmentType;
  thread_size?: string;
  thread_class?: string;
  gauge_type?: string;
  status: GaugeStatus;
  storage_location: string;
  is_spare: boolean;
  // ... other fields
}

// Helper functions
export function getGaugeIdentifier(gauge: Gauge): string {
  // For spare thread gauges, use serial number
  if (gauge.equipment_type === 'thread_gauge' && !gauge.gauge_id) {
    return gauge.serial_number;
  }

  // For sets and non-thread gauges, use gauge_id
  return gauge.gauge_id || gauge.serial_number;
}

export function getGaugeDisplayName(gauge: Gauge): string {
  if (gauge.equipment_type === 'thread_gauge') {
    if (!gauge.gauge_id) {
      return `S/N ${gauge.serial_number}`;
    }
    return `${gauge.gauge_id} (S/N ${gauge.serial_number})`;
  }

  return gauge.gauge_id || `S/N ${gauge.serial_number}`;
}

export function isSpareThreadGauge(gauge: Gauge): boolean {
  return gauge.equipment_type === 'thread_gauge' && gauge.gauge_id === null;
}

export function isThreadGaugeSet(gauge: Gauge): boolean {
  return gauge.equipment_type === 'thread_gauge'
    && gauge.gauge_id !== null
    && gauge.companion_gauge_id !== null;
}
```

**Service Layer**:
```typescript
// frontend/src/modules/gauge/services/gaugeService.ts

const gaugeService = {
  // Get by identifier (auto-detects gauge_id vs serial_number)
  getByIdentifier: async (identifier: string) => {
    const response = await apiClient.get(`/gauges/${identifier}`);
    return response.data;
  },

  // Get spare thread gauges for pairing
  getSpareThreadGauges: async (filters?: {
    thread_size?: string;
    thread_class?: string;
    gauge_type?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.thread_size) params.append('thread_size', filters.thread_size);
    if (filters?.thread_class) params.append('thread_class', filters.thread_class);
    if (filters?.gauge_type) params.append('gauge_type', filters.gauge_type);

    const response = await apiClient.get(`/gauges/spare-thread-gauges?${params}`);
    return response.data;
  },

  // Create spare thread gauge
  createSpareThreadGauge: async (data: CreateThreadGaugeRequest) => {
    const response = await apiClient.post('/gauges', data);
    return response.data;
  },

  // Pair two spare thread gauges
  pairSpares: async (goSerialNumber: string, noGoSerialNumber: string, sharedData: any) => {
    const response = await apiClient.post('/gauges/pair-spares', {
      go_serial_number: goSerialNumber,
      nogo_serial_number: noGoSerialNumber,
      ...sharedData
    });
    return response.data;
  },

  // Unpair a set
  unpairSet: async (setId: string) => {
    const response = await apiClient.post(`/gauges/unpair-set/${setId}`);
    return response.data;
  },

  // Replace gauge in set
  replaceGaugeInSet: async (setId: string, oldSerial: string, newSerial: string) => {
    const response = await apiClient.post(`/gauges/replace-in-set/${setId}`, {
      old_serial_number: oldSerial,
      new_serial_number: newSerial
    });
    return response.data;
  }
};
```

### Frontend: Component Updates

**GaugeDetail Component**:
```tsx
// frontend/src/modules/gauge/components/GaugeDetail.tsx

export function GaugeDetail({ gaugeId }: { gaugeId: string }) {
  const { data: gauge } = useQuery(
    ['gauge', gaugeId],
    () => gaugeService.getByIdentifier(gaugeId)
  );

  if (!gauge) return <LoadingSpinner />;

  const isSpare = isSpareThreadGauge(gauge);
  const isSet = isThreadGaugeSet(gauge);

  return (
    <Modal title={getGaugeDisplayName(gauge)} onClose={onClose}>
      <div className="two-columns">
        <div>
          {/* Basic Information */}
          <section>
            <h3>Basic Information</h3>

            {/* Show appropriate identifier */}
            {isSpare ? (
              <InfoRow
                label="Serial Number"
                value={gauge.serial_number}
                bold
              />
            ) : (
              <>
                <InfoRow
                  label={isSet ? "Set ID" : "Gauge ID"}
                  value={gauge.gauge_id}
                  bold
                />
                <InfoRow
                  label="Serial Number"
                  value={gauge.serial_number}
                />
              </>
            )}

            {/* Thread gauge specs */}
            {gauge.equipment_type === 'thread_gauge' && (
              <>
                <InfoRow label="Thread Size" value={gauge.thread_size} />
                <InfoRow label="Thread Class" value={gauge.thread_class} />
                <InfoRow label="Type" value={gauge.gauge_type} />
              </>
            )}
          </section>

          {/* Status */}
          <section>
            <h3>Status Information</h3>
            <InfoRow label="Status">
              <Badge variant={getStatusVariant(gauge.status)}>
                {gauge.status}
              </Badge>
            </InfoRow>
            <InfoRow label="Location" value={gauge.storage_location} />
            {isSpare && <InfoRow label="State" value="Spare (Unpaired)" />}
          </section>
        </div>

        <div>
          {/* For sets, show companion */}
          {isSet && gauge.companion && (
            <section>
              <h3>Set Information</h3>
              <InfoRow
                label={`${gauge.gauge_suffix === 'A' ? 'NO GO' : 'GO'} Gauge`}
              >
                <Link to={`/gauges/${gauge.companion.serial_number}`}>
                  S/N {gauge.companion.serial_number}
                </Link>
              </InfoRow>
            </section>
          )}
        </div>
      </div>

      {/* Actions */}
      <ModalFooter>
        {isSet && (
          <>
            <Button onClick={() => handleReplaceGauge()}>
              Replace Gauge
            </Button>
            <Button onClick={() => handleUnpair()}>
              Unpair Set
            </Button>
          </>
        )}
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}
```

**Set Details Page**:
```tsx
// frontend/src/modules/gauge/pages/SetDetailsPage.tsx

export function SetDetailsPage({ setId }: { setId: string }) {
  const { data: setData } = useQuery(
    ['gauge-set', setId],
    () => gaugeService.getByIdentifier(setId)
  );

  if (!setData) return <LoadingSpinner />;

  const goGauge = setData.gauge_suffix === 'A' ? setData : setData.companion;
  const noGoGauge = setData.gauge_suffix === 'B' ? setData : setData.companion;

  return (
    <Modal
      title={`${setId} - ${setData.thread_size} ${setData.thread_class}`}
      onClose={onClose}
    >
      {/* Set Information */}
      <section>
        <h3>Basic Information</h3>
        <InfoRow label="Set ID" value={setId} bold />
        <InfoRow label="Thread Size" value={setData.thread_size} />
        <InfoRow label="Thread Class" value={setData.thread_class} />
      </section>

      <section>
        <h3>Status Information</h3>
        <InfoRow label="Status">
          <Badge variant={getStatusVariant(setData.status)}>
            {setData.status}
          </Badge>
        </InfoRow>
        <InfoRow label="Location" value={setData.storage_location} />
      </section>

      {/* Gauge Members - Serial Numbers */}
      <section>
        <h3>Gauge Members</h3>
        <InfoRow label="GO Gauge (A)">
          <Link to={`/gauges/${goGauge.serial_number}`}>
            {goGauge.serial_number}
          </Link>
        </InfoRow>
        <InfoRow label="NO GO Gauge (B)">
          <Link to={`/gauges/${noGoGauge.serial_number}`}>
            {noGoGauge.serial_number}
          </Link>
        </InfoRow>
      </section>

      {/* Actions */}
      <ModalFooter>
        <Button onClick={() => handleReplaceGauge()}>
          Replace Gauge
        </Button>
        <Button onClick={() => handleUnpair()}>
          Unpair Set
        </Button>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}
```

**Spare Pairing Interface**:
```tsx
// frontend/src/modules/gauge/components/SparePairingInterface.tsx

export function SparePairingInterface() {
  const [selectedGO, setSelectedGO] = useState<Gauge | null>(null);
  const [selectedNOGO, setSelectedNOGO] = useState<Gauge | null>(null);
  const [filters, setFilters] = useState({});

  const { data: spares } = useQuery(
    ['spare-thread-gauges', filters],
    () => gaugeService.getSpareThreadGauges(filters)
  );

  const goGauges = spares?.filter(g => g.gauge_type?.toLowerCase().includes('go') && !g.gauge_type?.toLowerCase().includes('no')) || [];
  const noGoGauges = spares?.filter(g => g.gauge_type?.toLowerCase().includes('no go')) || [];

  const handlePair = async () => {
    if (!selectedGO || !selectedNOGO) return;

    try {
      const result = await gaugeService.pairSpares(
        selectedGO.serial_number,
        selectedNOGO.serial_number,
        {
          storage_location: selectedGO.storage_location
        }
      );

      toast.success(`Set ${result.setId} created successfully`);
      queryClient.invalidateQueries(['spare-thread-gauges']);
      onClose();
    } catch (error) {
      toast.error('Failed to create set');
    }
  };

  return (
    <div className="spare-pairing">
      <div className="two-columns">
        <div className="column">
          <h3>GO Gauges</h3>
          {goGauges.map(gauge => (
            <GaugeCard
              key={gauge.serial_number}
              gauge={gauge}
              selected={selectedGO?.serial_number === gauge.serial_number}
              onClick={() => setSelectedGO(gauge)}
              displayName={`S/N ${gauge.serial_number}`}
            />
          ))}
        </div>

        <div className="column">
          <h3>NO GO Gauges</h3>
          {noGoGauges.map(gauge => (
            <GaugeCard
              key={gauge.serial_number}
              gauge={gauge}
              selected={selectedNOGO?.serial_number === gauge.serial_number}
              onClick={() => setSelectedNOGO(gauge)}
              displayName={`S/N ${gauge.serial_number}`}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={handlePair}
        disabled={!selectedGO || !selectedNOGO}
      >
        Create Set
      </Button>
    </div>
  );
}
```

---

## Implementation Order

### Phase 1: Database Foundation
1. Create migration file with all schema changes
2. Test migration on local database
3. Verify constraints work correctly
4. Document rollback procedure

### Phase 2: Backend Core
5. Update `GaugeRepository` with dual identifier support
6. Update `GaugeCreationService` for thread gauge creation
7. Update `GaugeSetService` with pairing/unpairing logic
8. Add new API endpoints
9. Update existing endpoints to support both identifiers

### Phase 3: Backend Integration
10. Update `CalibrationWorkflowService` to support serial numbers
11. Update `GaugeCheckoutService` to validate sets only
12. Update all cascade operations (status, location changes)
13. Update audit logging with appropriate identifiers

### Phase 4: Backend Testing
14. Rewrite all 232 integration tests
15. Add new tests for spare thread gauge workflows
16. Test pairing, unpairing, replacing workflows
17. Verify cascade operations work correctly

### Phase 5: Frontend Foundation
18. Update TypeScript types and interfaces
19. Create helper functions for identifier display
20. Update `gaugeService` with new methods
21. Update all API calls to use new endpoints

### Phase 6: Frontend Components
22. Update `ThreadGaugeForm` (serial required)
23. Update `GaugeDetail` component
24. Create/update `SetDetailsPage`
25. Create `SparePairingInterface`
26. Update `GaugeList` to display appropriately
27. Update all navigation to use correct identifiers

### Phase 7: Integration Testing
28. Test complete workflows end-to-end
29. Create spare → pair → view set → unpair
30. Create spare → view → pair → replace gauge
31. Verify calibration workflow with both identifiers
32. Test checkout enforcement (sets only)

### Phase 8: Data Migration
33. Backup production database
34. Run migration script
35. Verify all thread gauges have serial numbers
36. Verify unpaired gauges have NULL gauge_id
37. Verify paired gauges share same gauge_id

---

## Files Changed

### Database
- `backend/src/modules/gauge/migrations/XXX_thread_gauge_serial_system.sql` (NEW)

### Backend (20+ files)
- `backend/src/modules/gauge/repositories/GaugeRepository.js` (MAJOR REWRITE)
- `backend/src/modules/gauge/services/GaugeCreationService.js` (MAJOR REWRITE)
- `backend/src/modules/gauge/services/GaugeSetService.js` (MAJOR REWRITE)
- `backend/src/modules/gauge/services/GaugeIdService.js` (UPDATE)
- `backend/src/modules/gauge/services/GaugeCheckoutService.js` (UPDATE)
- `backend/src/modules/gauge/services/CalibrationWorkflowService.js` (UPDATE)
- `backend/src/modules/gauge/services/GaugeOperationsService.js` (UPDATE)
- `backend/src/modules/gauge/routes/gauges.js` (UPDATE)
- `backend/src/modules/gauge/routes/helpers/gaugeValidationRules.js` (UPDATE)
- `backend/src/modules/gauge/mappers/GaugeDTOMapper.js` (UPDATE)
- All 232 integration test files (REWRITE)

### Frontend (15+ files)
- `frontend/src/modules/gauge/types/index.ts` (MAJOR REWRITE)
- `frontend/src/modules/gauge/services/gaugeService.ts` (MAJOR REWRITE)
- `frontend/src/modules/gauge/components/GaugeDetail.tsx` (MAJOR REWRITE)
- `frontend/src/modules/gauge/pages/SetDetailsPage.tsx` (MAJOR REWRITE)
- `frontend/src/modules/gauge/components/SparePairingInterface.tsx` (NEW)
- `frontend/src/modules/gauge/components/creation/forms/ThreadGaugeForm.tsx` (UPDATE)
- `frontend/src/modules/gauge/pages/GaugeList.tsx` (UPDATE)
- `frontend/src/modules/gauge/hooks/useGaugeQueries.ts` (UPDATE)
- `frontend/src/modules/gauge/routes.tsx` (UPDATE)

---

## Success Criteria

### Database
- [ ] `gauge_id` is nullable for thread gauges
- [ ] All thread gauges have serial numbers
- [ ] Unpaired thread gauges have `gauge_id = NULL`
- [ ] Paired thread gauges share same `gauge_id` (SP####)
- [ ] Unique constraints enforced correctly

### Backend
- [ ] Repository supports dual identifier lookup
- [ ] Creating spare thread gauge leaves `gauge_id = NULL`
- [ ] Pairing assigns `gauge_id = SP####A/B`
- [ ] Unpairing returns `gauge_id` to NULL
- [ ] Replacing gauge maintains set integrity
- [ ] All 232+ tests passing with new architecture

### Frontend
- [ ] Spare thread gauges display as "S/N {serial}"
- [ ] Sets display as "{setId} (S/N {serial})"
- [ ] Pairing interface works with serial numbers
- [ ] Set details show serial numbers for members
- [ ] Navigation works with both identifiers
- [ ] All components handle nullable `gauge_id`

### Workflows
- [ ] Create spare thread gauge → `gauge_id = NULL`
- [ ] Pair two spares → both get `gauge_id = SP####A/B`
- [ ] View set details → shows serial numbers
- [ ] Click serial number → navigates to gauge detail
- [ ] Replace gauge in set → old returns to spare (NULL)
- [ ] Unpair set → both return to spare (NULL)
- [ ] Checkout enforcement → sets only

---

## Timeline Estimate

**Total**: 3-4 weeks of focused development

- **Week 1**: Database + Backend Core (Phases 1-2)
- **Week 2**: Backend Integration + Testing (Phases 3-4)
- **Week 3**: Frontend Implementation (Phases 5-6)
- **Week 4**: Integration Testing + Migration (Phases 7-8)

---

**This is the REAL fix. No shortcuts. Proper architecture.**

