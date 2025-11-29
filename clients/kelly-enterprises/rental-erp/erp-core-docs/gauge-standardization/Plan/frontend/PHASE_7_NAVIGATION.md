# Phase 7: Navigation & Routing

**Date**: 2025-10-26
**Status**: Not Started
**Dependencies**: All previous phases (routes for new pages)

---

## Overview

Update routing configuration and navigation menu to include all new pages with permission checks.

**Scope**:
- 4 new routes
- Navigation menu updates
- Permission-based rendering

---

## 1. Route Configuration

**Location**: `/frontend/src/App.tsx` or routing configuration file (MODIFY EXISTING)

### New Routes

```typescript
import { SetDetailsPage } from './modules/gauge/pages/SetDetailsPage';
import { CalibrationManagementPage } from './modules/gauge/pages/CalibrationManagementPage';
import { ReturnedCustomerGaugesPage } from './modules/gauge/pages/ReturnedCustomerGaugesPage';
import { SpareInventoryPage } from './modules/gauge/pages/SpareInventoryPage';

// Add to route configuration
const routes = [
  // ... existing routes

  // Gauge Set Routes
  {
    path: '/gauges/sets/:setId',
    element: <SetDetailsPage />,
    meta: { requiresAuth: true }
  },

  // Admin/QC Routes
  {
    path: '/admin/gauge-management/calibration',
    element: <CalibrationManagementPage />,
    meta: { requiresAuth: true, requiredRoles: ['admin', 'qc'] }
  },
  {
    path: '/admin/gauge-management/returned-customer-gauges',
    element: <ReturnedCustomerGaugesPage />,
    meta: { requiresAuth: true, requiredRoles: ['admin', 'qc'] }
  },
  {
    path: '/admin/gauge-management/spare-inventory',
    element: <SpareInventoryPage />,
    meta: { requiresAuth: true, requiredRoles: ['admin', 'qc'] }
  }
];
```

---

## 2. Navigation Menu Updates

**Location**: Navigation component (MODIFY EXISTING)

### 2.1 User Navigation (All Roles)

```typescript
// Existing gauge navigation
<nav>
  <NavLink to="/gauges">Gauge Inventory</NavLink>
  {/* Existing links */}
</nav>
```

### 2.2 Admin/QC Navigation

**Location**: Admin navigation menu (MODIFY EXISTING)

```typescript
import { usePermissions } from '../hooks/usePermissions';

const { canManageCalibration, canViewReturnedGauges } = usePermissions();

<nav className="admin-nav">
  <div className="nav-section">
    <h3>Admin Gauge Management</h3>

    {canManageCalibration && (
      <>
        <NavLink to="/admin/gauge-management/calibration">
          Calibration Management
        </NavLink>
        <NavLink to="/admin/gauge-management/spare-inventory">
          Spare Inventory
        </NavLink>
      </>
    )}

    {canViewReturnedGauges && (
      <NavLink to="/admin/gauge-management/returned-customer-gauges">
        Returned Customer Gauges
      </NavLink>
    )}
  </div>
</nav>
```

### 2.3 Navigation Structure

```
Gauge Inventory                    (all users)
├── Gauge List                     (all users)
├── Set Details                    (all users, dynamic route)
└── Individual Gauge Details       (all users, dynamic route)

Admin Gauge Management             (admin/qc only)
├── Active Gauges                  (admin/qc, existing)
├── Spare Inventory                (admin/qc, NEW)
├── Returned Customer Gauges       (admin/qc, NEW)
└── Calibration Management         (admin/qc, NEW)
    ├── Send to Calibration
    ├── Pending Certificate
    └── Pending Release
```

---

## 3. Permission-Based Rendering

### 3.1 ProtectedRoute Component

**Location**: Create or update existing ProtectedRoute component

```typescript
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles
}) => {
  const { isAdmin, isQC, isAdminOrQC } = usePermissions();

  if (!requiredRoles || requiredRoles.length === 0) {
    return <>{children}</>;
  }

  const hasRequiredRole = requiredRoles.some(role => {
    if (role === 'admin') return isAdmin;
    if (role === 'qc') return isQC;
    if (role === 'admin_or_qc') return isAdminOrQC;
    return false;
  });

  return hasRequiredRole ? <>{children}</> : <Navigate to="/access-denied" replace />;
};
```

### 3.2 Usage in Routes

```typescript
{
  path: '/admin/gauge-management/calibration',
  element: (
    <ProtectedRoute requiredRoles={['admin', 'qc']}>
      <CalibrationManagementPage />
    </ProtectedRoute>
  )
}
```

---

## 4. Breadcrumb Navigation

**Add breadcrumbs for deep navigation**:

```typescript
// Set Details Page
<Breadcrumbs>
  <NavLink to="/gauges">Gauge Inventory</NavLink>
  <span>Set TG0123</span>
</Breadcrumbs>

// Individual Gauge Details (Paired)
<Breadcrumbs>
  <NavLink to="/gauges">Gauge Inventory</NavLink>
  <NavLink to={`/gauges/sets/${baseSetId}`}>Set {baseSetId}</NavLink>
  <span>Gauge {gauge.gaugeId}</span>
</Breadcrumbs>

// Calibration Management
<Breadcrumbs>
  <NavLink to="/admin">Admin</NavLink>
  <NavLink to="/admin/gauge-management">Gauge Management</NavLink>
  <span>Calibration</span>
</Breadcrumbs>
```

---

## 5. Status Badge in Navigation

**Show pending counts in navigation**:

```typescript
import { useCalibrationStore } from '../stores/CalibrationStore';

const { getPendingCertificateCount, getPendingReleaseCount } = useCalibrationStore();

<NavLink to="/admin/gauge-management/calibration">
  Calibration Management
  {(getPendingCertificateCount() + getPendingReleaseCount()) > 0 && (
    <span className="badge">
      {getPendingCertificateCount() + getPendingReleaseCount()}
    </span>
  )}
</NavLink>
```

---

## Completion Checklist

- [ ] SetDetailsPage route configured
- [ ] CalibrationManagementPage route configured
- [ ] ReturnedCustomerGaugesPage route configured
- [ ] SpareInventoryPage route configured
- [ ] ProtectedRoute component created/updated
- [ ] Permission checks implemented on all admin routes
- [ ] Navigation menu updated with new links
- [ ] Permission-based navigation rendering implemented
- [ ] Breadcrumb navigation added to new pages
- [ ] Status badges added to navigation (pending counts)
- [ ] Route tests written

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
