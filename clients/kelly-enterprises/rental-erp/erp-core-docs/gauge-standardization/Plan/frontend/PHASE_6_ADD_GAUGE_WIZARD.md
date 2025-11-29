# Phase 6: "Add Gauge" Wizard

**Date**: 2025-10-26
**Status**: Not Started
**Dependencies**: Phase 0 (state management), Phase 5 (SpareInventoryPage for "Pair Spares" option)

---

## Overview

2-step modal wizard for creating new gauges and sets.

**Workflow**:
- Step 1: Select equipment type (Thread Gauge, Hand Tool, Large Equipment, Cal Standard)
- Step 2a: Thread Gauge options (Single, New Set, Pair Spares)
- Step 2b: Other equipment types (Single gauge form only)

---

## AddGaugeWizard Component

**Location**: `/frontend/src/modules/gauge/components/AddGaugeWizard.tsx` (CREATE NEW)

**Button Label**: "Add Gauge" (in Gauge List header)

### Step 1: Equipment Type Selection

```
┌─────────────────────────────────────────────────────┐
│ Add Gauge                                     [×]   │
├─────────────────────────────────────────────────────┤
│ What type of equipment are you adding?              │
│                                                      │
│ ┌──────────────┐  ┌──────────────┐                 │
│ │ Thread Gauge │  │  Hand Tool   │                 │
│ │    🔩        │  │    🔧        │                 │
│ └──────────────┘  └──────────────┘                 │
│                                                      │
│ ┌──────────────┐  ┌──────────────┐                 │
│ │Large Equip.  │  │ Cal Standard │                 │
│ │    📦        │  │    📏        │                 │
│ └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

### Step 2a: Thread Gauge Options

```
┌─────────────────────────────────────────────────────┐
│ Add Thread Gauge                   [← Back]   [×]   │
├─────────────────────────────────────────────────────┤
│ What do you want to create?                         │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ Single Gauge                                   │  │
│ │ Add one thread gauge (GO or NO GO)             │  │
│ │                                      [Select →]│  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ New Gauge Set                                  │  │
│ │ Create GO + NO GO pair with new specs          │  │
│ │                                      [Select →]│  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ Pair Existing Spares                           │  │
│ │ Combine spare GO + NO GO into set              │  │
│ │                                      [Select →]│  │
│ └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Implementation

```typescript
import React, { useState } from 'react';
import { Modal, Button, BackButton } from '../../../infrastructure/components';
import { useNavigate } from 'react-router-dom';

type EquipmentType = 'thread_gauge' | 'hand_tool' | 'large_equipment' | 'cal_standard';
type ThreadGaugeOption = 'single' | 'new_set' | 'pair_spares';
type WizardStep = 'equipment-type' | 'thread-options' | 'form';

interface AddGaugeWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddGaugeWizard: React.FC<AddGaugeWizardProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('equipment-type');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<EquipmentType | null>(null);

  const handleEquipmentTypeSelect = (type: EquipmentType) => {
    setSelectedEquipmentType(type);

    if (type === 'thread_gauge') {
      setStep('thread-options');
    } else {
      // Other equipment types go directly to single gauge form
      setStep('form');
    }
  };

  const handleThreadOptionSelect = (option: ThreadGaugeOption) => {
    if (option === 'pair_spares') {
      // Navigate to Spare Inventory page
      navigate('/admin/gauge-management/spare-inventory');
      onClose();
    } else if (option === 'new_set') {
      // Navigate to create new set form
      navigate('/gauges/create-set');
      onClose();
    } else {
      // Single gauge - navigate to create gauge form
      navigate('/gauges/create');
      onClose();
    }
  };

  const handleBack = () => {
    if (step === 'thread-options') {
      setStep('equipment-type');
      setSelectedEquipmentType(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 'equipment-type' ? 'Add Gauge' : 'Add Thread Gauge'}>
      {step === 'equipment-type' && (
        <div className="equipment-type-selection">
          <p>What type of equipment are you adding?</p>

          <div className="equipment-grid">
            <Button
              variant="secondary"
              onClick={() => handleEquipmentTypeSelect('thread_gauge')}
            >
              <div className="icon">🔩</div>
              <div className="label">Thread Gauge</div>
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleEquipmentTypeSelect('hand_tool')}
            >
              <div className="icon">🔧</div>
              <div className="label">Hand Tool</div>
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleEquipmentTypeSelect('large_equipment')}
            >
              <div className="icon">📦</div>
              <div className="label">Large Equip.</div>
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleEquipmentTypeSelect('cal_standard')}
            >
              <div className="icon">📏</div>
              <div className="label">Cal Standard</div>
            </Button>
          </div>
        </div>
      )}

      {step === 'thread-options' && (
        <div className="thread-options-selection">
          <BackButton onClick={handleBack} />

          <p>What do you want to create?</p>

          <div className="options-list">
            <Button
              variant="secondary"
              onClick={() => handleThreadOptionSelect('single')}
            >
              <div>
                <div className="option-title">Single Gauge</div>
                <div className="option-description">Add one thread gauge (GO or NO GO)</div>
              </div>
              <span className="select-arrow">Select →</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleThreadOptionSelect('new_set')}
            >
              <div>
                <div className="option-title">New Gauge Set</div>
                <div className="option-description">Create GO + NO GO pair with new specs</div>
              </div>
              <span className="select-arrow">Select →</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleThreadOptionSelect('pair_spares')}
            >
              <div>
                <div className="option-title">Pair Existing Spares</div>
                <div className="option-description">Combine spare GO + NO GO into set</div>
              </div>
              <span className="select-arrow">Select →</span>
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
```

### Integration

**Gauge List Page** (header):
```typescript
import { AddGaugeWizard } from '../components/AddGaugeWizard';
import { Button } from '../../../infrastructure/components';

const [showAddWizard, setShowAddWizard] = useState(false);

<Button variant="primary" onClick={() => setShowAddWizard(true)}>
  Add Gauge
</Button>

<AddGaugeWizard
  isOpen={showAddWizard}
  onClose={() => setShowAddWizard(false)}
/>
```

---

## Completion Checklist

- [ ] AddGaugeWizard component created
- [ ] Equipment type selection step implemented
- [ ] Thread gauge options step implemented
- [ ] Navigation to Spare Inventory (Pair Spares) implemented
- [ ] Navigation to create set form implemented
- [ ] Navigation to create gauge form implemented
- [ ] Back button functionality implemented
- [ ] Integration with Gauge List page complete
- [ ] Component tests written

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
