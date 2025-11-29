# Missing Functionality List

## Critical System Components

**SystemRecoveryTool**
- Status: Missing
- Backend: Ready
- Complexity: HIGH
- Super admin gauge recovery operations

**HealthStatus**
- Status: Missing
- Backend: Ready
- Complexity: LOW
- System health monitoring display

## User Management

**UserDashboard**
- Status: Missing
- Backend: Ready
- Complexity: LOW
- Personal tools and assignments view

**AddUserModal**
- Status: Missing
- Backend: Partial
- Complexity: MODERATE
- User creation with role assignment

**PasswordModal**
- Status: Missing
- Backend: Ready
- Complexity: LOW
- Current user password change

**ResetPasswordModal**
- Status: Missing
- Backend: Missing
- Complexity: MODERATE
- Admin reset for other users

**UserDetailsModal**
- Status: Missing
- Backend: Missing
- Complexity: MODERATE
- User profile management

## Gauge Operations

**BulkUpdateModal**
- Status: Missing
- Backend: Missing
- Complexity: HIGH
- Mass gauge updates

**CheckinModal**
- Status: Missing
- Backend: Ready
- Complexity: LOW
- Gauge return with condition

**RejectModal**
- Status: Missing
- Backend: Ready
- Complexity: LOW
- Generic rejection workflow

**ReviewModal**
- Status: Missing
- Backend: Ready
- Complexity: MODERATE
- QC approval process

**CreateGaugeModal**
- Status: Missing
- Backend: Ready
- Complexity: MODERATE
- New gauge creation form

**TransferCancelConfirmModal**
- Status: Missing
- Backend: Unknown
- Complexity: LOW
- Transfer cancellation confirmation

## Services

**UserAPI Service**
- Status: Missing
- Backend: Partial
- Complexity: MODERATE
- User management API layer

**Missing User Endpoints:**
- GET /api/admin/users
- GET /api/admin/users/:id
- PUT /api/admin/users/:id
- DELETE /api/admin/users/:id
- POST /api/admin/users/:id/reset-password
- GET /api/admin/roles
- POST /api/admin/users/:id/roles

**Missing Bulk Endpoints:**
- POST /api/gauges/bulk/update
- POST /api/gauges/bulk/checkout
- POST /api/gauges/bulk/return
- POST /api/gauges/bulk/transfer

## Navigation Features

**Advanced Tab States**
- Status: Partially missing
- Backend: N/A
- Complexity: MODERATE
- Dashboard sub-tabs, admin sub-tabs, complex state persistence

## Already Available

**TabStateService**
- Location: erp-core/src/core/navigation/TabStateService.ts

**UnsealConfirmModal**
- Status: Partially exists as UnsealRequestModal