# Phase 4: Customer Return Workflow

**Date**: 2025-10-26
**Status**: Not Started
**Dependencies**: Phase 0, Phase 1
**Architectural Approach**: CREATE simple modal + page

---

## Overview

Return customer gauges with companion awareness. Returned gauges visible only to Admin/QC.

**Simplicity First**: Simple modal with local state. Self-contained page for viewing returned gauges.

---

## 1. Return Customer Gauge Modal

**Location**: `/frontend/src/modules/gauge/components/ReturnCustomerGaugeModal.tsx` (**CREATE**)

```typescript
import { useState } from 'react';
import { gaugeService } from '../services/gaugeService';
import {
  Modal,
  FormCheckbox,
  FormTextarea,
  ConfirmButton,
  CancelButton
} from '../../../infrastructure/components';

interface Props {
  isOpen: boolean;
  gauge: Gauge;
  companionGauge?: Gauge | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReturnCustomerGaugeModal = ({
  isOpen,
  gauge,
  companionGauge,
  onClose,
  onSuccess
}: Props) => {
  const [returnCompanion, setReturnCompanion] = useState(!!companionGauge);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Return primary gauge
      await gaugeService.returnCustomerGauge(gauge.id, notes);

      // Return companion if selected
      if (returnCompanion && companionGauge) {
        await gaugeService.returnCustomerGauge(companionGauge.id, notes);
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to return gauge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return Customer Gauge">
      <p>Customer: {gauge.customerName}</p>
      <p>Gauge: {gauge.gaugeId}</p>

      {companionGauge && (
        <>
          <p>Part of Set: {gauge.gaugeId.replace(/[AB]$/, '')}</p>
          <FormCheckbox
            checked={returnCompanion}
            onChange={(e) => setReturnCompanion(e.target.checked)}
            label={`Also return companion gauge (${companionGauge.gaugeId})`}
          />
          {!returnCompanion && (
            <p className="warning">
              ⚠️ Companion will become a spare gauge
            </p>
          )}
        </>
      )}

      <FormTextarea
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <p className="info">
        ℹ️ Returned gauges will be removed from active inventory
        and visible only to Admin/QC
      </p>

      <div className="modal-actions">
        <ConfirmButton onClick={handleConfirm} disabled={isSubmitting}>
          Confirm Return
        </ConfirmButton>
        <CancelButton onClick={onClose} />
      </div>
    </Modal>
  );
};
```

---

## 2. Returned Customer Gauges Page

**Location**: `/frontend/src/modules/gauge/pages/ReturnedCustomerGaugesPage.tsx` (**CREATE**)

```typescript
import { useState, useEffect } from 'react';
import { gaugeService } from '../services/gaugeService';
import { usePermissions } from '../hooks/usePermissions';
import { Button, Pagination } from '../../../infrastructure/components';

const ReturnedCustomerGaugesPage = () => {
  const { isAdminOrQC } = usePermissions();
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAdminOrQC) return;

    const fetchReturned = async () => {
      const response = await gaugeService.getReturnedCustomerGauges({
        customerId: selectedCustomer,
        search,
        page,
        limit: 20
      });

      setGauges(response.data || []);
      setTotalPages(Math.ceil(response.pagination.total / 20));
    };

    fetchReturned();
  }, [search, selectedCustomer, page, isAdminOrQC]);

  if (!isAdminOrQC) {
    return <div>Access denied - Admin/QC only</div>;
  }

  return (
    <div className="returned-customer-gauges-page">
      <h1>Returned Customer Gauges</h1>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        {/* Customer filter dropdown */}
      </div>

      {/* Gauge list (read-only) */}
      <div className="gauge-list">
        {gauges.map(gauge => (
          <div key={gauge.id} className="gauge-row">
            <div>{gauge.gaugeId}</div>
            <div>{gauge.customerName}</div>
            <div>{gauge.threadSize} - {gauge.threadClass}</div>
            <div>Returned: {gauge.returnedDate}</div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};

export default ReturnedCustomerGaugesPage;
```

---

## Implementation Checklist

- [ ] Create ReturnCustomerGaugeModal.tsx
- [ ] Create ReturnedCustomerGaugesPage.tsx
- [ ] Test companion checkbox logic
- [ ] Test permission enforcement
- [ ] Test pagination

---

## File Count

**Files Created**: 2
- `components/ReturnCustomerGaugeModal.tsx` - CREATE
- `pages/ReturnedCustomerGaugesPage.tsx` - CREATE

**Total**: 2 files (simple, no store)

**Estimated LOC**: ~200 lines total

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
