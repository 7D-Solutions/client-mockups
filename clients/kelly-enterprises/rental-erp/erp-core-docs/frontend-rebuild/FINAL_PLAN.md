# Thread Gauge Serial Number System - Final Plan

**Stop overthinking. Just do it right.**

---

## The Change

**Spare thread gauges**: Identified by `serial_number` only (`gauge_id = NULL`)
**Thread gauge sets**: Identified by `gauge_id = SP####` (both gauges share it)
**Everything else**: No change

---

## Database

```sql
-- Make gauge_id nullable
ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) UNIQUE;

-- Require serial number for thread gauges
ALTER TABLE gauges
  ADD CONSTRAINT chk_thread_serial_required
  CHECK (
    (equipment_type != 'thread_gauge')
    OR (equipment_type = 'thread_gauge' AND serial_number IS NOT NULL)
  );

-- Add index for spare lookups
CREATE INDEX idx_spare_thread_gauges
  ON gauges(serial_number)
  WHERE gauge_id IS NULL;

-- Clear test data
DELETE FROM gauges WHERE equipment_type = 'thread_gauge';
```

Done.

---

## Backend

### GaugeRepository.js

Add these methods:

```javascript
async findBySerialNumber(serialNumber) {
  const query = `${GAUGE_WITH_RELATIONS} WHERE g.serial_number = ?`;
  const [rows] = await pool.query(query, [serialNumber]);
  return rows[0] ? GaugeDTOMapper.transformToDTO(rows[0]) : null;
}

async findSpareThreadGauges(filters = {}) {
  let query = `
    ${GAUGE_WITH_RELATIONS}
    WHERE g.gauge_id IS NULL
      AND g.equipment_type = 'thread_gauge'
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

### GaugeCreationService.js

Update `createGauge()`:

```javascript
async createGauge(gaugeData, userId) {
  if (gaugeData.equipment_type === 'thread_gauge' && !gaugeData.serial_number) {
    throw new ValidationError('Serial number required for thread gauges');
  }

  // Thread gauges start as spares (no gauge_id)
  const gaugeId = gaugeData.equipment_type === 'thread_gauge'
    ? null
    : await GaugeIdService.generateSystemId(gaugeData.category_id, gaugeData.equipment_type);

  return await transaction(async (conn) => {
    const gauge = await GaugeRepository.create(conn, {
      ...gaugeData,
      gauge_id: gaugeId,
      created_by: userId
    });

    // Audit log
    return gauge;
  });
}
```

### GaugeSetService.js

Add these methods:

```javascript
async pairSpares(goSerial, noGoSerial, sharedData, userId) {
  return await transaction(async (conn) => {
    const goGauge = await GaugeRepository.findBySerialNumber(goSerial);
    const noGoGauge = await GaugeRepository.findBySerialNumber(noGoSerial);

    if (!goGauge || !noGoGauge) throw new NotFoundError('Gauge not found');
    if (goGauge.gauge_id || noGoGauge.gauge_id) throw new ValidationError('Must be unpaired spares');

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

async replaceGaugeInSet(setId, oldSerial, newSerial, userId) {
  return await transaction(async (conn) => {
    const oldGauge = await GaugeRepository.findBySerialNumber(oldSerial);
    const newGauge = await GaugeRepository.findBySerialNumber(newSerial);

    if (oldGauge.gauge_id !== setId) throw new ValidationError('Old gauge not in set');
    if (newGauge.gauge_id) throw new ValidationError('New gauge must be spare');

    const companionId = oldGauge.companion_gauge_id;

    // Old → spare
    await GaugeRepository.update(conn, oldGauge.id, {
      gauge_id: null,
      gauge_suffix: null,
      companion_gauge_id: null
    });

    // New → set
    await GaugeRepository.update(conn, newGauge.id, {
      gauge_id: setId,
      gauge_suffix: oldGauge.gauge_suffix,
      companion_gauge_id: companionId
    });

    // Update companion
    await GaugeRepository.update(conn, companionId, {
      companion_gauge_id: newGauge.id
    });
  });
}
```

### GaugeIdService.js

Add:

```javascript
async generateSetId(categoryId) {
  const config = await GaugeIdRepository.getSequenceConfig(categoryId, 'thread_gauge');
  const nextSequence = await GaugeIdRepository.generateSequence(categoryId, 'thread_gauge');
  return `SP${String(nextSequence).padStart(4, '0')}`;
}
```

### API Routes

Add to `routes/gauges.js`:

```javascript
router.get('/api/gauges/spare-thread-gauges', authenticateToken, async (req, res) => {
  const spares = await GaugeRepository.findSpareThreadGauges(req.query);
  res.json({ success: true, data: spares });
});

router.post('/api/gauges/pair-spares', authenticateToken, async (req, res) => {
  const { go_serial_number, nogo_serial_number, ...data } = req.body;
  const setId = await GaugeSetService.pairSpares(go_serial_number, nogo_serial_number, data, req.user.id);
  res.json({ success: true, data: { setId } });
});

router.post('/api/gauges/unpair-set/:setId', authenticateToken, async (req, res) => {
  await GaugeSetService.unpairSet(req.params.setId, req.user.id);
  res.json({ success: true });
});

router.post('/api/gauges/replace-in-set/:setId', authenticateToken, async (req, res) => {
  const { old_serial_number, new_serial_number } = req.body;
  await GaugeSetService.replaceGaugeInSet(req.params.setId, old_serial_number, new_serial_number, req.user.id);
  res.json({ success: true });
});
```

Done.

---

## Frontend

### Types

```typescript
interface Gauge {
  id: number;
  gauge_id: string | null;
  serial_number: string;
  // ... rest
}

function getDisplayName(gauge: Gauge): string {
  if (gauge.equipment_type === 'thread_gauge' && !gauge.gauge_id) {
    return `S/N ${gauge.serial_number}`;
  }
  return gauge.gauge_id;
}
```

### Service

```typescript
const gaugeService = {
  getSpareThreadGauges: (filters) =>
    apiClient.get('/gauges/spare-thread-gauges', { params: filters }).then(r => r.data),

  pairSpares: (goSerial, noGoSerial, data) =>
    apiClient.post('/gauges/pair-spares', { go_serial_number: goSerial, nogo_serial_number: noGoSerial, ...data }).then(r => r.data),

  unpairSet: (setId) =>
    apiClient.post(`/gauges/unpair-set/${setId}`).then(r => r.data),

  replaceGaugeInSet: (setId, oldSerial, newSerial) =>
    apiClient.post(`/gauges/replace-in-set/${setId}`, { old_serial_number: oldSerial, new_serial_number: newSerial }).then(r => r.data),
};
```

### Components

**ThreadGaugeForm**: Make `serial_number` required

**GaugeDetail**: Use `getDisplayName(gauge)`

**SetDetailsPage**: Show serial numbers as links:
```tsx
<InfoRow label="GO Gauge (A)">
  <Link to={`/gauges/${goGauge.serial_number}`}>{goGauge.serial_number}</Link>
</InfoRow>
```

**SparePairingInterface**: New component with two columns (GO | NO GO), select and pair

**GaugeList**: Use `getDisplayName(gauge)`

Done.

---

## Implementation

1. Run database migration
2. Update backend files (5 files)
3. Update frontend files (5 files)
4. Rewrite tests that break
5. Test workflows

**Time**: 2-3 days

---

## Tests

Rewrite whatever breaks. Who cares if it's all 232 or just 20. Fix what's broken.

---

**This is it. No more planning. Just implement.**
