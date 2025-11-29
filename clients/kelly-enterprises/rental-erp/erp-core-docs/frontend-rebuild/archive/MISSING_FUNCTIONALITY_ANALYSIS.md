# Missing Functionality Analysis

## System Recovery Tool

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/SystemRecoveryTool.tsx`  
**Backend API:** Available at `/api/admin/system-recovery/gauge/`  
**Complexity:** HIGH

Features:
- Super admin tool for fixing gauges stuck in invalid states
- Gauge search with autocomplete suggestions
- Identifies issues: pending transfers, unseals, orphaned assignments
- Two-stage confirmation with audit trail
- Requires super admin role

## Health Status Component

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/HealthStatus.tsx`  
**Backend API:** Available at `/api/health`, `/api/health/detailed`  
**Complexity:** LOW

Features:
- System health monitoring display
- 30-second polling interval
- Shows database/redis connection status
- Currently disabled in legacy (returns null)

## User Dashboard

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/UserDashboard.tsx`  
**Backend API:** Uses existing gauge APIs  
**Complexity:** LOW

Features:
- Three tabs: Personal Tools, Checked Out Items, Pending Transfers
- Filters gauges by ownership and status
- Reuses existing gauge display components

## Add User Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/AddUserModal.tsx`  
**Backend API:** Partial - `/api/admin/user-management/register` exists, missing role assignment  
**Complexity:** MODERATE

Features:
- Create/edit users with username, email, password, role
- Validation for required fields and email format
- Admin only feature

## Password Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/PasswordModal.tsx`  
**Backend API:** Available at `/api/admin/user-management/change-password`  
**Complexity:** LOW

Features:
- Current user password change
- Validation for password requirements
- Confirmation field

## Reset Password Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/ResetPasswordModal.tsx`  
**Backend API:** Missing endpoint for admin password reset  
**Complexity:** MODERATE

Features:
- Admin reset password for other users
- Different from user self-password change
- Requires admin privileges

## User Details Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/UserDetailsModal.tsx`  
**Backend API:** Missing user profile endpoints  
**Complexity:** MODERATE

Features:
- View/edit user profile details
- Role assignment/removal
- User activation/deactivation

## Bulk Update Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/BulkUpdateModal.tsx`  
**Backend API:** Missing bulk update endpoints  
**Complexity:** HIGH

Features:
- Update multiple gauges simultaneously
- Field selection: location, department, status
- Admin only feature

## Checkin Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/CheckinModal.tsx`  
**Backend API:** Available at `/api/gauges/tracking/:gaugeId/return`  
**Complexity:** LOW

Features:
- Return gauge with condition tracking
- Pass/fail status selection
- Comment field for notes

## Reject Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/RejectModal.tsx`  
**Backend API:** Available (transfers and unseals have reject endpoints)  
**Complexity:** LOW

Features:
- Generic rejection interface
- Reason code selection
- Comment field

## Review Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/ReviewModal.tsx`  
**Backend API:** Available for QC verify at `/api/gauges/tracking/:gaugeId/qc-verify`  
**Complexity:** MODERATE

Features:
- QC approval workflow
- Review returned items and unseal requests
- Pass/fail decision with comments

## Unseal Confirm Modal

**Status:** Partially exists as UnsealRequestModal  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/UnsealConfirmModal.tsx`  
**Backend API:** Available at `/api/gauges/tracking/unseal-requests/`  
**Complexity:** LOW

Features:
- Multi-stage unseal approval
- Already partially implemented in modular frontend

## Transfer Cancel Confirm Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/modals/TransferCancelConfirmModal.tsx`  
**Backend API:** Needs verification if cancel endpoint exists  
**Complexity:** LOW

Features:
- Confirmation dialog for transfer cancellation
- Simple yes/no confirmation

## Create Gauge Modal

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/components/AppExtracted/CreateGaugeModal.tsx`  
**Backend API:** Available at `POST /api/gauges`  
**Complexity:** MODERATE

Features:
- Comprehensive gauge creation form
- All gauge fields including calibration data
- Field validation

## Tab State Service

**Status:** Already exists in erp-core  
**Location:** `/erp-core/src/core/navigation/TabStateService.ts`  
**Complexity:** NONE

## Advanced Navigation States

**Status:** Partially missing  
**Complexity:** MODERATE

Missing features:
- Dashboard sub-tabs (personal, team views)
- Thread gauge sub-tabs (ring, plug)
- Admin panel sub-tabs
- Complex state persistence

## API Service Extensions

### UserAPI Service

**Status:** Missing  
**Legacy Location:** `Fireproof Gauge System/frontend/src/services/UserAPI.ts`  
**Backend API:** Partial implementation exists  
**Complexity:** MODERATE

Missing endpoints:
- GET /api/admin/users
- GET /api/admin/users/:id
- PUT /api/admin/users/:id
- DELETE /api/admin/users/:id
- POST /api/admin/users/:id/reset-password
- GET /api/admin/roles
- POST /api/admin/users/:id/roles

### GaugeAPI Service Extensions

**Status:** Mostly complete  
**Complexity:** LOW

Potential missing features:
- Bulk operations
- Advanced search filters

## Summary by Implementation Status

### Ready to Implement (Backend API exists)
- SystemRecoveryTool
- HealthStatus
- UserDashboard  
- PasswordModal
- CheckinModal
- RejectModal
- ReviewModal
- CreateGaugeModal

### Needs Backend Work
- AddUserModal (partial backend)
- ResetPasswordModal (missing endpoint)
- UserDetailsModal (missing endpoints)
- BulkUpdateModal (missing endpoints)
- UserAPI Service (multiple missing endpoints)

### Already Available
- TabStateService (in erp-core)
- UnsealConfirmModal (partially as UnsealRequestModal)