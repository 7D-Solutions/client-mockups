# Phase 5: Spare Pairing Interface

**Date**: 2025-10-26
**Status**: Not Started
**Dependencies**: Phase 0
**Architectural Approach**: CREATE self-contained page

---

## Overview

Single self-contained page with two-column pairing interface. All logic inline.

**Simplicity First**: One file with internal components. No store needed.

---

## Spare Inventory Page

**Location**: `/frontend/src/modules/gauge/pages/SpareInventoryPage.tsx` (**CREATE**)

```typescript
import { useState, useEffect, useMemo } from 'react';
import { gaugeService } from '../services/gaugeService';
import {
  Modal,
  Button,
  FormSelect,
  ConfirmButton,
  CancelButton
} from '../../../infrastructure/components';

const SpareInventoryPage = () => {
  const [spares, setSpares] = useState<Gauge[]>([]);
  const [selectedGO, setSelectedGO] = useState<Gauge | null>(null);
  const [selectedNOGO, setSelectedNOGO] = useState<Gauge | null>(null);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Fetch spares
  useEffect(() => {
    const fetchSpares = async () => {
      const response = await gaugeService.getSpareGauges();
      setSpares(response);
    };

    fetchSpares();
  }, []);

  // Filter spares
  const filteredSpares = useMemo(() => {
    return spares.filter(spare =>
      spare.gaugeId.toLowerCase().includes(search.toLowerCase())
    );
  }, [spares, search]);

  // Split into GO and NO GO
  const goSpares = filteredSpares.filter(s => s.gaugeType === 'GO');
  const nogoSpares = filteredSpares.filter(s => s.gaugeType === 'NOGO');

  // Get compatible spares
  const compatibleNOGO = useMemo(() => {
    if (!selectedGO) return nogoSpares;

    return nogoSpares.filter(nogo =>
      nogo.threadSize === selectedGO.threadSize &&
      nogo.threadClass === selectedGO.threadClass &&
      nogo.equipmentType === selectedGO.equipmentType &&
      nogo.categoryId === selectedGO.categoryId &&
      nogo.ownershipType === selectedGO.ownershipType &&
      nogo.customerId === selectedGO.customerId
    );
  }, [selectedGO, nogoSpares]);

  const compatibleGO = useMemo(() => {
    if (!selectedNOGO) return goSpares;

    return goSpares.filter(go =>
      go.threadSize === selectedNOGO.threadSize &&
      go.threadClass === selectedNOGO.threadClass &&
      go.equipmentType === selectedNOGO.equipmentType &&
      go.categoryId === selectedNOGO.categoryId &&
      go.ownershipType === selectedNOGO.ownershipType &&
      go.customerId === selectedNOGO.customerId
    );
  }, [selectedNOGO, goSpares]);

  // Handle selection
  const handleSelectGO = (gauge: Gauge) => {
    setSelectedGO(gauge);
    setSelectedNOGO(null); // Clear NO GO selection
  };

  const handleSelectNOGO = (gauge: Gauge) => {
    setSelectedNOGO(gauge);
    setSelectedGO(null); // Clear GO selection
  };

  // Create set
  const handleCreateSet = async () => {
    if (!selectedGO || !selectedNOGO || !location) return;

    try {
      await gaugeService.pairSpares(selectedGO.id, selectedNOGO.id, location);
      
      // Refresh spares
      const response = await gaugeService.getSpareGauges();
      setSpares(response);
      
      // Clear selections
      setSelectedGO(null);
      setSelectedNOGO(null);
      setLocation('');
      setShowLocationModal(false);
    } catch (error) {
      console.error('Failed to create set', error);
    }
  };

  return (
    <div className="spare-inventory-page">
      <h1>Spare Inventory</h1>

      {/* Search */}
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div>Total Spares: {filteredSpares.length}</div>

      {/* Two columns */}
      <div className="two-columns">
        {/* GO Column */}
        <div className="column">
          <h2>GO Gauges (A)</h2>
          {(selectedNOGO ? compatibleGO : goSpares).map(gauge => (
            <div
              key={gauge.id}
              className={`gauge-card ${selectedGO?.id === gauge.id ? 'selected' : ''} ${
                selectedNOGO && !compatibleGO.includes(gauge) ? 'incompatible' : ''
              }`}
              onClick={() => handleSelectGO(gauge)}
            >
              <div>{gauge.gaugeId}</div>
              <div>{gauge.threadSize} - {gauge.threadClass}</div>
              <div>{gauge.storageLocation}</div>
            </div>
          ))}
        </div>

        {/* NO GO Column */}
        <div className="column">
          <h2>NO GO Gauges (B)</h2>
          {(selectedGO ? compatibleNOGO : nogoSpares).map(gauge => (
            <div
              key={gauge.id}
              className={`gauge-card ${selectedNOGO?.id === gauge.id ? 'selected' : ''} ${
                selectedGO && !compatibleNOGO.includes(gauge) ? 'incompatible' : ''
              }`}
              onClick={() => handleSelectNOGO(gauge)}
            >
              <div>{gauge.gaugeId}</div>
              <div>{gauge.threadSize} - {gauge.threadClass}</div>
              <div>{gauge.storageLocation}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Set button */}
      {selectedGO && selectedNOGO && (
        <Button onClick={() => setShowLocationModal(true)}>
          Create Set
        </Button>
      )}

      {/* Location Modal */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="Create Set"
      >
        <p>GO: {selectedGO?.gaugeId}</p>
        <p>NO GO: {selectedNOGO?.gaugeId}</p>

        <FormSelect
          label="Storage Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          options={[
            { value: '', label: 'Select...' },
            { value: 'Shelf A1', label: 'Shelf A1' },
            { value: 'Shelf A2', label: 'Shelf A2' }
            // ... more options ...
          ]}
        />

        <div className="modal-actions">
          <ConfirmButton onClick={handleCreateSet} disabled={!location}>
            Create Set
          </ConfirmButton>
          <CancelButton onClick={() => setShowLocationModal(false)} />
        </div>
      </Modal>
    </div>
  );
};

export default SpareInventoryPage;
```

---

## Implementation Checklist

- [ ] Create SpareInventoryPage.tsx
- [ ] Test two-column layout
- [ ] Test selection and filtering
- [ ] Test compatibility logic
- [ ] Test set creation

---

## File Count

**Files Created**: 1
- `pages/SpareInventoryPage.tsx` - CREATE (self-contained)

**Total**: 1 file (vs. original plan: 5 files + store)

**Estimated LOC**: ~200 lines (vs. original plan: ~1,000 lines)

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
