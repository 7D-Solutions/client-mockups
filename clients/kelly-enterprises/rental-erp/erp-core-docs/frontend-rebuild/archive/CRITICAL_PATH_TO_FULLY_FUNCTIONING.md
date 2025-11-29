# Critical Path to Fully Functioning Frontend

## Current State
- ✅ Backend API endpoints verified and documented
- ✅ QC verify endpoint fixed (changed from numeric id to gauge_id)
- ✅ Rejection reasons table created

## Executable Steps

### 1. Fix Checkout Modal Sealed Gauge Logic
- Update CheckoutModal.tsx to detect sealed gauges
- Add condition to show unseal request UI when gauge.is_sealed === true
- Implement handleUnsealRequest function that calls gaugeService.createUnsealRequest

### 2. Fix Transfer Modal Implementation
- Update TransferModal.tsx to use correct payload format
- Fix transfer mutation in useGaugeOperations.ts
- Ensure gauge_id is passed correctly (not numeric id)

### 3. Fix QC Modal Implementation
- Add error handling to GaugeList.tsx onClick handler
- Add console.log statements to debug state changes
- Verify QCApprovalsModal exports match imports

### 4. Implement WebSocket Connection
- Add socket.io-client to package.json
- Create socket connection in GaugeContext.tsx
- Add event listeners for gauge:updated, gauge:checked_out, gauge:checked_in
- Implement reconnection logic

### 5. Fix Unseal Request Approval
- Update UnsealRequestsModal.tsx approve/deny handlers
- Add mutations to useGaugeOperations.ts for approveUnseal and denyUnseal
- Ensure proper error handling for already approved requests

### 6. Add Missing TypeScript Types
- Create type definitions for UnsealRequest, TransferData, CalibrationRecord
- Fix any type errors in gauge hooks
- Add proper return types to all gauge service methods

### 7. Create Database Indexes
```sql
CREATE INDEX idx_gauge_status ON gauges(status);
CREATE INDEX idx_gauge_sealed ON gauges(is_sealed);
CREATE INDEX idx_unseal_status ON gauge_unseal_requests(status);
```

### 8. Fix Inconsistent ID Usage
- Audit all components for id vs gauge_id usage
- Standardize to always use gauge_id for API calls
- Update any remaining numeric id references