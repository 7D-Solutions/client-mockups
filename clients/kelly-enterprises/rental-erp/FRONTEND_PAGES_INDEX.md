# Frontend Pages Index

**Generated**: 2025-11-06  
**Project**: Fire-Proof ERP Sandbox  
**Frontend Root**: `/frontend/src/`

## Table of Contents
1. [Admin Module](#admin-module)
2. [Gauge Module](#gauge-module)
3. [Inventory Module](#inventory-module)
4. [User Module](#user-module)
5. [Test Pages](#test-pages)
6. [App Structure](#app-structure)

---

## Admin Module

**Base Route**: `/admin/*`  
**Location**: `/frontend/src/modules/admin/`

### Pages

| Page Name | Route | File Location | Purpose |
|-----------|-------|---------------|---------|
| Admin Dashboard | `/admin/` or `/admin/dashboard` | `pages/AdminDashboard.tsx` | Main admin hub with quick access to all admin functions |
| User Management | `/admin/users` | `pages/UserManagement.tsx` | Manage user accounts, roles, permissions, and access levels |
| Role Management | `/admin/roles` | `pages/RoleManagement.tsx` | Configure roles and their associated permissions |
| System Settings | `/admin/settings` | `pages/SystemSettings.tsx` | Configure system-wide settings and configurations |
| Audit Logs | `/admin/audit` | `pages/AuditLogs.tsx` | View audit trail of system activities and changes |
| Gauge Management | `/admin/gauges` | `pages/GaugeManagement.tsx` | Manage gauge types, categories, and specifications |
| Facility Management | `/admin/facilities` | `pages/FacilityManagementPage.tsx` | Create and manage facilities in the location hierarchy |
| Building Management | `/admin/buildings` | `pages/BuildingManagementPage.tsx` | Create and manage buildings within facilities |
| Zone Management | `/admin/zones` | `pages/ZoneManagementPage.tsx` | Create and manage zones within buildings |

**Note**: `UserManagement.old.tsx` is deprecated (see deprecated pages below)

---

## Gauge Module

**Base Route**: `/gauges/*`  
**Location**: `/frontend/src/modules/gauge/`  
**Note**: Wrapped with `GaugeProvider` context

### Pages

| Page Name | Route | File Location | Purpose |
|-----------|-------|---------------|---------|
| Gauge List | `/gauges/` or `/gauges/list` | `pages/GaugeList.tsx` | Main gauge inventory view with table, search, and modal-based operations |
| My Gauges | `/gauges/my-gauges` | `pages/MyGauges.tsx` | User's personal gauge dashboard and quick access list |
| QC Page | `/gauges/qc` | `pages/QCPage.tsx` | Quality control review and approval interface |
| Set Details | `/gauges/sets/:setId` | `pages/SetDetailsPage.tsx` | Detailed view of a gauge set (Phase 1) |
| Calibration Management | `/gauges/calibration-management` | `pages/CalibrationManagementPage.tsx` | Calibration workflow and scheduling interface (Phase 3) |
| Returned Customer Gauges | `/gauges/returned-customer-gauges` | `pages/ReturnedCustomerGaugesPage.tsx` | Handle and process customer returned gauges (Phase 4) |
| Spare Inventory | `/gauges/spare-inventory` | `pages/SpareInventoryPage.tsx` | Spare gauge pairing and inventory interface (Phase 5) |
| Create Gauge | `/gauges/create` | `pages/CreateGaugePage.tsx` | Form for creating new gauge records |
| Legacy Detail Redirect | `/gauges/detail/:id` | N/A (redirect) | Redirects legacy routes to modal-based view: `/gauges?open={id}` |
| Legacy Inventory | `/gauges/inventory` | N/A (redirect) | Redirects to `/gauges/list` (legacy route) |

**Special Features**:
- Modal-based gauge details (opened via `?open=` query parameter)
- Search and filter capabilities
- Multiple workflow management modals (Unseal requests, QC approvals, Out of service review)
- Phase-based implementation (Phases 1-5)

**Deprecated**: `GaugeList.old.tsx`, `MyGauges.old.tsx` (legacy versions in review-for-delete)

---

## Inventory Module

**Base Route**: `/inventory/*`  
**Location**: `/frontend/src/modules/inventory/`

### Pages

| Page Name | Route | File Location | Purpose |
|-----------|-------|---------------|---------|
| Inventory Dashboard | `/inventory/` | `pages/InventoryDashboard.tsx` | Main inventory overview with location summary and statistics |
| Storage Locations | `/inventory/locations` | `pages/StorageLocationsPage.tsx` | Browse and manage all storage locations in the hierarchy |
| Location Details | `/inventory/location/:locationCode` | `pages/LocationDetailPage.tsx` | Detailed view of a specific storage location |
| Movement History | `/inventory/movements` | `pages/MovementHistoryPage.tsx` | View history of all inventory movements and transactions |

**Related**: Location hierarchy management (Buildings, Facilities, Zones) is in Admin module

**Deprecated**: `LocationDetailPage.old.tsx`, `StorageLocationsPage.old.tsx` (legacy versions in review-for-delete)

---

## User Module

**Base Route**: `/user/*`  
**Location**: `/frontend/src/modules/user/`  
**Note**: Wrapped with `UserProvider` context

### Pages

| Page Name | Route | File Location | Purpose |
|-----------|-------|---------------|---------|
| User Profile | `/user/` or `/user/profile` | `pages/UserProfile.tsx` | View and edit personal user profile information |
| User Settings | `/user/settings` | `pages/UserSettings.tsx` | Configure personal user settings and preferences |

---

## Test Pages

**Location**: `/frontend/src/pages/`  
**Note**: Test routes only - should be removed in production

| Page Name | Route | File Location | Purpose |
|-----------|-------|---------------|---------|
| Button Test | `/test/buttons` | `pages/ButtonTest.tsx` | Test and showcase button component variants |
| CSS Test | `/test/css` | `pages/CSSTest.tsx` | Test CSS styling and layouts |
| Error Boundary Test | `/test/error-boundary` | `pages/ErrorBoundaryTest.tsx` | Test error boundary error handling |
| Icon Test | `/test/icons` | `pages/IconTest.tsx` | Test and showcase icon components |
| Component Showcase | `pages/ComponentShowcase.tsx` | Comprehensive component showcase (not routed) |

---

## App Structure

### Root App Configuration
**File**: `/frontend/src/App.tsx`

**Key Features**:
- BrowserRouter with React Router v7 compatibility flags
- Query client setup for React Query
- Provider stack: QueryClientProvider → AuthProvider → NavigationProvider → MainLayout → ErrorBoundary
- Module state sync initialization and cleanup
- Global error boundaries for each module
- Toast notification container

### Route Priority
1. Root redirect: `/` → `/gauges/list` (default entry point)
2. Dashboard shortcut: `/dashboard` → `/gauges/my-gauges`
3. Module routes: `/gauges/*`, `/admin/*`, `/inventory/*`, `/user/*`
4. Test routes: `/test/*` (development only)
5. Catch-all: `*` → `/gauges/list`

### Main Layout Structure
```
App
├── MainLayout (provides header, navigation, sidebar)
│   ├── Gauge Module Routes
│   ├── Admin Module Routes
│   ├── Inventory Module Routes
│   ├── User Module Routes
│   └── Test Routes
├── ConnectedToastContainer (global notifications)
└── Error Boundaries (per module)
```

---

## Module Organization Pattern

Each module follows a consistent structure:

```
module/
├── pages/
│   ├── PageComponent.tsx
│   └── index.ts (exports all pages)
├── routes.tsx (defines module routes)
├── components/ (module-specific components)
├── hooks/ (module-specific hooks)
├── context/ (module context providers)
├── types/ (TypeScript types)
└── services/ (API and business logic)
```

---

## Navigation & Entry Points

### Primary Entry Points
- **Default**: `/gauges/list` - Main gauge inventory
- **Dashboard**: `/gauges/my-gauges` - User's personal gauges
- **Admin**: `/admin/` - Admin dashboard

### Quick Navigation Links
- Admin Dashboard: `/admin/` or `/admin/dashboard`
- User Profile: `/user/` or `/user/profile`
- Inventory: `/inventory/`

---

## Deprecated Pages (Review for Deletion)

Located in `/review-for-delete/` directory:

- `UserManagement.old.tsx` - Old user management page
- `GaugeList.old.tsx` - Old gauge list version
- `MyGauges.old.tsx` - Old my gauges version
- `LocationDetailPage.old.tsx` - Old location detail version
- `StorageLocationsPage.old.tsx` - Old storage locations version
- `GaugeInventoryPage.tsx` - Removed legacy component

---

## Notes

1. **Modal-Based Operations**: Gauge details and many operations use modals rather than dedicated pages
2. **Location Hierarchy**: Three-level hierarchy: Facilities → Buildings → Zones
3. **Phase-Based Implementation**: Gauge module features are implemented in phases (1-5)
4. **Infrastructure Services**: All pages use centralized components and services from `/infrastructure/`
5. **Error Handling**: Each module is wrapped in ErrorBoundary for isolation
6. **State Management**: Zustand (through context providers) for module state
7. **API Pattern**: RESTful `/api/` endpoints

---

## Statistics

- **Total Active Pages**: 24
- **Total Modules**: 4 (Admin, Gauge, Inventory, User)
- **Test Pages**: 4
- **Deprecated Pages**: 5
- **Routes**: 30+
