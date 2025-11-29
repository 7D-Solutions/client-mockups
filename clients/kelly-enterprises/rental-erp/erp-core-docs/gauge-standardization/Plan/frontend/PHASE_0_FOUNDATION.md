# Phase 0: Foundation & Architecture

**Date**: 2025-10-26
**Status**: Not Started
**Dependencies**: None (must be completed first)
**Architectural Approach**: EXTEND existing patterns

---

## Overview

Minimal foundation layer - extend existing types and service. No new state management, no new services.

**Why First**: Need to add 4 new statuses to type system and companion methods to existing service.

**Simplicity First**: Use existing patterns (React hooks, existing gaugeService class). Only extend what exists.

---

## 1. Type System Extensions

### 1.1 Extend GaugeStatus Enum

**Location**: `/frontend/src/modules/gauge/types/index.ts` (**EXTEND**)

**Action**: Add 4 new statuses to existing enum

```typescript
// types/index.ts - EXTEND existing enum
export type GaugeStatus =
  | 'available'
  | 'checked_out'
  | 'in_transit'
  | 'in_use'
  | 'returned'
  | 'awaiting_qc'
  | 'out_of_service'
  | 'calibration_due'
  | 'sealed'
  | 'out_for_calibration'    // ➕ ADD
  | 'pending_certificate'     // ➕ ADD
  | 'pending_release'         // ➕ ADD
  | 'returned_customer';      // ➕ ADD (customer gauge returned to archive)
```

**Status Definitions**:
- `out_for_calibration` - Gauge sent to calibration lab
- `pending_certificate` - Returned from calibration, awaiting certificate upload
- `pending_release` - Certificate uploaded, awaiting location verification
- `returned_customer` - Customer-owned gauge returned to archive (Admin/QC only)

**Note**: Existing Gauge type already has companion fields:
```typescript
// Already exists in types/index.ts - no changes needed
export interface Gauge {
  id: number;
  gaugeId: string;
  gauge_suffix?: 'A' | 'B' | null;        // Already exists!
  companion_gauge_id?: string;            // Already exists!
  is_spare: boolean;                      // Already exists!
  // ... other fields ...
}
```

---

## 2. Service Layer Extension

### 2.1 Extend GaugeService

**Location**: `/frontend/src/modules/gauge/services/gaugeService.ts` (**EXTEND**)

**Action**: Add companion and workflow methods to existing GaugeService class

```typescript
// gaugeService.ts - EXTEND existing class
export class GaugeService {
  // ... KEEP all existing methods unchanged ...

  // ➕ ADD: Set relationship operations
  async unpairSet(setId: string, reason?: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/gauges/sets/${setId}/unpair`, { reason });
  }

  async replaceGauge(
    setId: string,
    gaugeType: 'GO' | 'NOGO',
    replacementGaugeId: number
  ): Promise<ApiResponse<void>> {
    return apiClient.post(`/gauges/sets/${setId}/replace`, {
      gauge_type: gaugeType,
      replacement_gauge_id: replacementGaugeId
    });
  }

  async pairSpares(
    goGaugeId: number,
    nogoGaugeId: number,
    storageLocation: string
  ): Promise<ApiResponse<{ setId: string }>> {
    return apiClient.post('/gauges/sets/pair', {
      go_gauge_id: goGaugeId,
      nogo_gauge_id: nogoGaugeId,
      storage_location: storageLocation
    });
  }

  async getSpareGauges(filters?: {
    threadSize?: string;
    threadClass?: string;
    gaugeType?: 'GO' | 'NOGO';
  }): Promise<Gauge[]> {
    const params = new URLSearchParams();
    params.append('is_spare', 'true');
    if (filters?.threadSize) params.append('thread_size', filters.threadSize);
    if (filters?.threadClass) params.append('thread_class', filters.threadClass);
    if (filters?.gaugeType) params.append('gauge_type', filters.gaugeType);

    const response = await apiClient.get<GaugeListResponse>(`/gauges?${params}`);
    return response.data || [];
  }

  // ➕ ADD: Calibration workflow operations
  async sendToCalibration(gaugeIds: number[]): Promise<ApiResponse<void>> {
    return apiClient.post('/gauges/calibration/send', { gauge_ids: gaugeIds });
  }

  async uploadCertificate(gaugeId: number, certificateFile: File): Promise<ApiResponse<void>> {
    const formData = new FormData();
    formData.append('certificate', certificateFile);
    return apiClient.post(`/gauges/${gaugeId}/certificate`, formData);
  }

  async releaseFromCalibration(
    setId: string,
    storageLocation: string
  ): Promise<ApiResponse<void>> {
    return apiClient.post(`/gauges/sets/${setId}/release`, {
      storage_location: storageLocation
    });
  }

  // ➕ ADD: Customer return operations
  async returnCustomerGauge(
    gaugeId: number,
    reason: string
  ): Promise<ApiResponse<void>> {
    return apiClient.post(`/gauges/${gaugeId}/return-customer`, { reason });
  }

  async getReturnedCustomerGauges(params?: {
    customerId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<GaugeListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('status', 'returned_customer');

    if (params?.customerId) searchParams.append('customer_id', params.customerId.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return apiClient.get<GaugeListResponse>(`/gauges?${searchParams}`);
  }

  // ➕ ADD: Helper to get companion gauge
  async getCompanionGauge(gaugeId: number): Promise<Gauge | null> {
    const gauge = await this.getById(gaugeId.toString());
    if (!gauge.companion_gauge_id) return null;
    return this.getById(gauge.companion_gauge_id);
  }
}

// Singleton instance - already exists
export const gaugeService = new GaugeService();
```

---

## 3. Infrastructure Components

### 3.1 Enhance GaugeStatusBadge

**Location**: `/frontend/src/infrastructure/components/GaugeStatusBadge.tsx` (**ENHANCE**)

**Action**: Add 4 new status variants to existing component

```typescript
// GaugeStatusBadge.tsx - ENHANCE existing component
const statusConfig = {
  // ... existing statuses (keep unchanged) ...

  // ➕ ADD: New statuses
  out_for_calibration: {
    label: 'Out for Calibration',
    color: 'blue',
    icon: '📊'
  },
  pending_certificate: {
    label: 'Pending Certificate',
    color: 'orange',
    icon: '📜'
  },
  pending_release: {
    label: 'Pending Release',
    color: 'yellow',
    icon: '⏳'
  },
  returned_customer: {
    label: 'Returned (Customer)',
    color: 'gray',
    icon: '📦'
  }
};
```

**That's it** - no other infrastructure components needed. Everything else inline in pages/modals.

---

## 4. Permission Hooks

### 4.1 Enhance usePermissions

**Location**: `/frontend/src/modules/gauge/hooks/usePermissions.ts` (**ENHANCE** if exists, **CREATE** if not)

**Action**: Add Admin/QC role checks

```typescript
// usePermissions.ts
import { useAuth } from '../../../erp-core/src/core/auth/authService';

export const usePermissions = () => {
  const { user } = useAuth();

  return {
    isAdmin: user?.role === 'admin',
    isQC: user?.role === 'qc',
    isAdminOrQC: user?.role === 'admin' || user?.role === 'qc',
    canManageCalibration: user?.role === 'admin' || user?.role === 'qc',
    canViewReturnedCustomer: user?.role === 'admin' || user?.role === 'qc',
    canManageSets: user?.role === 'admin' || user?.role === 'qc'
  };
};
```

---

## Implementation Checklist

### Type System
- [ ] Add 4 new statuses to GaugeStatus type
- [ ] Verify existing Gauge type has companion fields (gauge_suffix, companion_gauge_id, is_spare)

### Service Layer
- [ ] Add set relationship methods to GaugeService
- [ ] Add calibration workflow methods to GaugeService
- [ ] Add customer return methods to GaugeService
- [ ] Add helper methods to GaugeService

### Infrastructure
- [ ] Add 4 new status variants to GaugeStatusBadge
- [ ] Create or enhance usePermissions hook

### Testing
- [ ] Unit tests for new service methods
- [ ] Visual tests for new status badges

---

## File Count

**Files Modified**: 3
- `types/index.ts` - EXTEND enum
- `services/gaugeService.ts` - EXTEND class
- `infrastructure/components/GaugeStatusBadge.tsx` - ENHANCE

**Files Created**: 0-1
- `hooks/usePermissions.ts` - CREATE (if doesn't exist)

**Total**: 3-4 files (vs. original plan: 14 files)

---

## Key Principles

1. **Extend, Don't Replace**: Add to existing gaugeService, don't create new services
2. **Use Existing Patterns**: React hooks, existing service class
3. **No New Dependencies**: No Zustand, no additional libraries
4. **YAGNI**: Don't create abstractions until needed 5+ times
5. **Simplicity**: Inline first, extract later

---

**Estimated LOC**: ~200 lines (vs. original plan: ~2,000 lines)

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
