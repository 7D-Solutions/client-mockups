# Phase 2: Set Management Operations

**Date**: 2025-10-26
**Status**: Not Started
**Dependencies**: Phase 0, Phase 1
**Architectural Approach**: CREATE simple modals

---

## Overview

Two simple modals for unpair and replace operations. Called from SetDetailsPage.

**Simplicity First**: Simple modals with local state. No store needed.

---

## 1. Unpair Set Modal

**Location**: `/frontend/src/modules/gauge/components/UnpairSetModal.tsx` (**CREATE**)

```typescript
import { useState } from 'react';
import { gaugeService } from '../services/gaugeService';
import { Modal, FormTextarea, ConfirmButton, CancelButton } from '../../../infrastructure/components';

interface Props {
  isOpen: boolean;
  setId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const UnpairSetModal = ({ isOpen, setId, onClose, onSuccess }: Props) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await gaugeService.unpairSet(setId, reason || undefined);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to unpair set');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unpair Gauge Set">
      <p>Set: {setId}</p>
      <p>⚠️ Both gauges will become spare/unpaired gauges</p>

      <FormTextarea
        label="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <div className="modal-actions">
        <ConfirmButton onClick={handleConfirm} disabled={isSubmitting}>
          Confirm Unpair
        </ConfirmButton>
        <CancelButton onClick={onClose} />
      </div>
    </Modal>
  );
};
```

---

## 2. Replace Gauge Modal

**Location**: `/frontend/src/modules/gauge/components/ReplaceGaugeModal.tsx` (**CREATE**)

```typescript
import { useState, useEffect } from 'react';
import { gaugeService } from '../services/gaugeService';
import { Modal, ConfirmButton, CancelButton } from '../../../infrastructure/components';

interface Props {
  isOpen: boolean;
  setId: string;
  gaugeType: 'GO' | 'NOGO';
  currentGauge: Gauge;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReplaceGaugeModal = ({
  isOpen,
  setId,
  gaugeType,
  currentGauge,
  onClose,
  onSuccess
}: Props) => {
  const [compatibleSpares, setCompatibleSpares] = useState<Gauge[]>([]);
  const [selectedSpare, setSelectedSpare] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch compatible spares
  useEffect(() => {
    if (!isOpen) return;

    const fetchSpares = async () => {
      const spares = await gaugeService.getSpareGauges({
        threadSize: currentGauge.threadSize,
        threadClass: currentGauge.threadClass,
        gaugeType
      });
      setCompatibleSpares(spares);
    };

    fetchSpares();
  }, [isOpen, currentGauge, gaugeType]);

  const handleConfirm = async () => {
    if (!selectedSpare) return;

    setIsSubmitting(true);
    try {
      await gaugeService.replaceGauge(setId, gaugeType, selectedSpare);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to replace gauge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Replace ${gaugeType} Gauge`}>
      <p>Current: {currentGauge.gaugeId}</p>

      <h4>Select Replacement:</h4>
      {compatibleSpares.length === 0 ? (
        <p>No compatible spare gauges available</p>
      ) : (
        <div className="spare-list">
          {compatibleSpares.map(spare => (
            <div
              key={spare.id}
              className={selectedSpare === spare.id ? 'selected' : ''}
              onClick={() => setSelectedSpare(spare.id)}
            >
              <div>{spare.gaugeId}</div>
              <div>{spare.storageLocation}</div>
            </div>
          ))}
        </div>
      )}

      <div className="modal-actions">
        <ConfirmButton onClick={handleConfirm} disabled={!selectedSpare || isSubmitting}>
          Replace Gauge
        </ConfirmButton>
        <CancelButton onClick={onClose} />
      </div>
    </Modal>
  );
};
```

---

## Usage in SetDetailsPage

```typescript
// SetDetailsPage.tsx - Add modal state
const [showUnpairModal, setShowUnpairModal] = useState(false);
const [showReplaceModal, setShowReplaceModal] = useState(false);
const [replaceGaugeType, setReplaceGaugeType] = useState<'GO' | 'NOGO' | null>(null);

// Actions menu - Note: Import Button from infrastructure
import { Button } from '../../../infrastructure/components';

<div className="actions">
  <Button onClick={() => setShowUnpairModal(true)}>Unpair Set</Button>
  <Button onClick={() => {
    setReplaceGaugeType('GO');
    setShowReplaceModal(true);
  }}>Replace GO Gauge</Button>
  <Button onClick={() => {
    setReplaceGaugeType('NOGO');
    setShowReplaceModal(true);
  }}>Replace NO GO Gauge</Button>
</div>

{/* Modals */}
<UnpairSetModal
  isOpen={showUnpairModal}
  setId={setId}
  onClose={() => setShowUnpairModal(false)}
  onSuccess={() => navigate('/gauges')}
/>

{replaceGaugeType && (
  <ReplaceGaugeModal
    isOpen={showReplaceModal}
    setId={setId}
    gaugeType={replaceGaugeType}
    currentGauge={replaceGaugeType === 'GO' ? goGauge : nogoGauge}
    onClose={() => {
      setShowReplaceModal(false);
      setReplaceGaugeType(null);
    }}
    onSuccess={() => window.location.reload()}
  />
)}
```

---

## Implementation Checklist

- [ ] Create UnpairSetModal.tsx
- [ ] Create ReplaceGaugeModal.tsx
- [ ] Integrate with SetDetailsPage
- [ ] Test unpair workflow
- [ ] Test replace workflow

---

## File Count

**Files Created**: 2
- `components/UnpairSetModal.tsx` - CREATE
- `components/ReplaceGaugeModal.tsx` - CREATE

**Total**: 2 files (simple modals, no store)

**Estimated LOC**: ~150 lines total

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
