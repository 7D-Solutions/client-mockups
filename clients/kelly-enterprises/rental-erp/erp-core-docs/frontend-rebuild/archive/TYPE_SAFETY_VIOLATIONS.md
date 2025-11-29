# Type Safety Violations Report

**Date:** 2025-09-09  
**Purpose:** Document all TypeScript type safety issues

## Critical Type Violations

### 1. Any Types in Core Files

#### /modules/gauge/types/index.ts
```typescript
pending_transfer?: any;              // Line 34
```

#### /infrastructure/store/index.ts
```typescript
cache: Record<string, any>;          // Line 36
systemSettings: Record<string, any>; // Line 49
filters: Record<string, any>;        // Line 52
updateGaugeCache: (gauges: Record<string, any>) => void; // Line 78
updateSystemSettings: (settings: Record<string, any>) => void; // Line 83
```

#### /modules/gauge/services/gaugeService.ts
```typescript
private normalizeGauge(gauge: any): any {  // Line 17
confirmUnseal(requestId: string): Promise<ApiResponse<any>> // Line 108
sendToCalibration(gaugeIds: string[]): Promise<ApiResponse<any>> // Line 113
getGaugeHistory(gaugeId: string): Promise<ApiResponse<any[]>> // Line 134
```

### 2. Duplicate Type Definitions

**Gauge Interface Defined In:**
1. `/hooks/useGauges.ts`
2. `/modules/gauge/components/GaugeInventory.tsx`
3. `/modules/gauge/components/ThreadSubNavigation.tsx`
4. `/modules/gauge/types/index.ts` (48 fields - official)

**Each with different fields!**

### 3. Type Assertion Issues

#### /infrastructure/api/client.ts
```typescript
return response.text() as unknown as T;  // Line 58
```

### 4. Missing Type Exports

Many files define interfaces but don't export them properly:
```typescript
interface GaugeCategories { ... }  // Not exported
interface CheckoutInfo { ... }     // Local only
```

### 5. Optional Everything Problem

#### Gauge Interface (48 fields, 35 optional!)
```typescript
export interface Gauge {
  id: string;
  system_gauge_id?: string;      // Optional
  gauge_suffix?: 'A' | 'B' | null;
  companion_gauge_id?: string;   // Optional
  is_sealed?: number | boolean;  // Mixed types!
  seal_status?: 'sealed' | 'unsealed';
  unsealed_at?: string;          // Optional
  // ... 30+ more optional fields
}
```

### 6. Mixed Type Unions
```typescript
is_sealed?: number | boolean;  // Backend returns 0/1, frontend wants boolean
has_pending_unseal_request?: boolean | number;  // Same issue
```

## Impact

1. **No Type Safety**: `any` defeats TypeScript
2. **Runtime Errors**: Type mismatches not caught
3. **Refactoring Danger**: Can't safely change types
4. **IDE Features Lost**: No autocomplete/IntelliSense

## Required Fixes

### 1. Eliminate All `any` Types
```typescript
// Before
pending_transfer?: any;

// After  
pending_transfer?: PendingTransfer | null;
```

### 2. Single Source of Truth
```typescript
// Create proper type structure
modules/gauge/types/
├── api/
│   └── responses.ts    // Backend response types
├── domain/
│   └── gauge.ts       // Core business types
└── ui/
    └── components.ts  // UI-specific types
```

### 3. Fix Optional Overuse
```typescript
// Make required fields actually required
export interface Gauge {
  id: string;
  gauge_id: string;
  name: string;
  status: GaugeStatus;
  // Optional only when truly optional
  calibration_due_date?: string;
}
```

### 4. Type Guards for Mixed Types
```typescript
// Handle backend type differences
function normalizeGauge(raw: RawGaugeResponse): Gauge {
  return {
    ...raw,
    is_sealed: Boolean(raw.is_sealed),
    has_pending_unseal_request: Boolean(raw.has_pending_unseal_request)
  };
}
```

## Priority Fixes

1. **Remove all `any` types** (17 instances)
2. **Delete duplicate interfaces** (4 Gauge definitions)
3. **Fix mixed type unions** (boolean | number)
4. **Export all interfaces properly**
5. **Create type-safe normalizers**