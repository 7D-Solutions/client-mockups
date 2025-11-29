# Frontend Modules Reference

**Generated**: 2025-11-06  
**Project**: Fire-Proof ERP Sandbox  
**Frontend Root**: `/frontend/src/modules/`

## Overview

The frontend is organized into four main functional modules, each with its own routing, components, and state management:

1. **Admin Module** - System administration and configuration
2. **Gauge Module** - Core gauge inventory and management
3. **Inventory Module** - Storage locations and movements
4. **User Module** - User profile and settings

---

## Module Structure Template

Each module follows this organizational pattern:

```
module/
├── pages/
│   ├── PageComponent.tsx     (Individual page components)
│   ├── AnotherPage.tsx
│   └── index.ts              (Export all pages)
├── components/               (Module-specific components)
│   ├── ModalComponent.tsx
│   └── FormComponent.tsx
├── hooks/                    (Module-specific hooks)
│   ├── useCustomLogic.ts
│   └── useDataFetching.ts
├── context/                  (State management)
│   └── ModuleContext.tsx
├── types/                    (TypeScript definitions)
│   └── index.ts
├── services/                 (API & business logic)
│   └── apiService.ts
├── routes.tsx                (Route definitions)
├── index.ts                  (Module exports)
└── constants.ts              (Module constants)
```

---

## 1. Admin Module

**Location**: `/frontend/src/modules/admin/`  
**Base Route**: `/admin/*`  
**Context**: None (direct routing)  
**Purpose**: System administration, user management, and configuration

### File Structure
```
admin/
├── pages/
│   ├── AdminDashboard.tsx
│   ├── UserManagement.tsx
│   ├── RoleManagement.tsx
│   ├── SystemSettings.tsx
│   ├── AuditLogs.tsx
│   ├── GaugeManagement.tsx
│   ├── FacilityManagementPage.tsx
│   ├── BuildingManagementPage.tsx
│   ├── ZoneManagementPage.tsx
│   ├── UserManagement.old.tsx (deprecated)
│   └── index.ts
├── components/
├── hooks/
├── types/
├── services/
├── routes.tsx
└── navigation.ts
```

### Pages Overview

| Page | Route | Purpose |
|------|-------|---------|
| AdminDashboard | `/admin/` `/admin/dashboard` | Hub for all admin functions |
| UserManagement | `/admin/users` | Create, edit, deactivate users and manage permissions |
| RoleManagement | `/admin/roles` | Define roles and assign permissions |
| SystemSettings | `/admin/settings` | Global system configuration |
| AuditLogs | `/admin/audit` | View system audit trail |
| GaugeManagement | `/admin/gauges` | Configure gauge types and categories |
| FacilityManagement | `/admin/facilities` | Manage facilities (location hierarchy level 1) |
| BuildingManagement | `/admin/buildings` | Manage buildings (location hierarchy level 2) |
| ZoneManagement | `/admin/zones` | Manage zones (location hierarchy level 3) |

### Key Features
- Three-tier location hierarchy management
- User and role management with RBAC
- Audit logging view
- System configuration interface

---

## 2. Gauge Module

**Location**: `/frontend/src/modules/gauge/`  
**Base Route**: `/gauges/*`  
**Context Provider**: `GaugeProvider`  
**Purpose**: Core gauge inventory management and workflows

### File Structure
```
gauge/
├── pages/
│   ├── GaugeList.tsx              (Main inventory)
│   ├── MyGauges.tsx               (User's personal gauges)
│   ├── QCPage.tsx                 (Quality control)
│   ├── SetDetailsPage.tsx          (Phase 1: Set details)
│   ├── CalibrationManagementPage.tsx (Phase 3: Calibration)
│   ├── ReturnedCustomerGaugesPage.tsx (Phase 4: Returns)
│   ├── SpareInventoryPage.tsx      (Phase 5: Spares)
│   ├── CreateGaugePage.tsx         (New gauge form)
│   ├── GaugeList.old.tsx           (deprecated)
│   ├── MyGauges.old.tsx            (deprecated)
│   └── index.ts
├── components/
│   ├── GaugeModalManager.tsx       (Modal orchestration)
│   ├── AddGaugeWizard.tsx          (Multi-step creation)
│   ├── SetDetail.tsx               (Set details component)
│   └── ... (workflow modals)
├── hooks/
│   ├── useGauges.ts                (Fetch gauge data)
│   ├── useGaugeOperations.ts       (CRUD operations)
│   └── useAdminAlerts.ts
├── context/
│   └── GaugeContext.tsx            (Module state)
├── types/
│   └── index.ts
├── services/
│   └── gaugeService.ts
├── routes.tsx
├── constants/
└── utils/
    └── threadSizeNormalizer.js
```

### Pages Overview

| Page | Route | Purpose | Phase |
|------|-------|---------|-------|
| GaugeList | `/gauges/` `/gauges/list` | Main inventory table with search, filters, modals | Core |
| MyGauges | `/gauges/my-gauges` | Personal gauge dashboard | Core |
| QCPage | `/gauges/qc` | Quality control review and approval | Core |
| CreateGaugePage | `/gauges/create` | Wizard for creating new gauges | Core |
| SetDetailsPage | `/gauges/sets/:setId` | Detailed view of gauge sets | Phase 1 |
| CalibrationManagementPage | `/gauges/calibration-management` | Calibration workflow and scheduling | Phase 3 |
| ReturnedCustomerGaugesPage | `/gauges/returned-customer-gauges` | Handle customer returns | Phase 4 |
| SpareInventoryPage | `/gauges/spare-inventory` | Spare gauge pairing | Phase 5 |

### Special Features
- **Modal-Based Operations**: Gauge details opened via modal with query parameter `?open={gaugeId}`
- **Context Provider**: All pages wrapped with `GaugeProvider` for shared state
- **Phase-Based Implementation**: Features organized by implementation phase
- **Workflow Management**: Multiple specialized modals:
  - `GaugeModalManager` - Orchestrates modal display
  - `UnsealRequestsManagerModal` - Handles unseal requests
  - `QCApprovalsModal` - Quality control approvals
  - `OutOfServiceReviewModal` - Out of service reviews
- **Search & Filters**: Session-persisted search state
- **Data Table**: Standardized table with sorting, pagination

### Key Workflows
1. **Gauge Creation**: Multi-step wizard with validation
2. **Gauge Details**: Modal-based view from table row click
3. **QC Workflow**: Review and approve gauges
4. **Calibration**: Schedule and track calibration
5. **Customer Returns**: Process returned gauges
6. **Spare Management**: Pair spare gauges for sets

---

## 3. Inventory Module

**Location**: `/frontend/src/modules/inventory/`  
**Base Route**: `/inventory/*`  
**Context Provider**: None  
**Purpose**: Storage location and inventory movement management

### File Structure
```
inventory/
├── pages/
│   ├── InventoryDashboard.tsx     (Main overview)
│   ├── StorageLocationsPage.tsx    (Locations browse)
│   ├── LocationDetailPage.tsx      (Location detail)
│   ├── MovementHistoryPage.tsx     (Movement log)
│   ├── LocationDetailPage.old.tsx  (deprecated)
│   ├── StorageLocationsPage.old.tsx (deprecated)
│   └── index.ts
├── components/
│   ├── LocationDetailModal.tsx
│   ├── AddLocationModal.tsx
│   └── ... (location components)
├── hooks/
│   └── useInventory.ts
├── types/
│   └── index.ts
├── services/
│   └── inventoryService.ts
├── permissions/
│   └── index.ts
├── routes.tsx
└── constants/
```

### Pages Overview

| Page | Route | Purpose |
|------|-------|---------|
| InventoryDashboard | `/inventory/` | Overview with location summary and statistics |
| StorageLocationsPage | `/inventory/locations` | Browse all storage locations in hierarchy |
| LocationDetailPage | `/inventory/location/:locationCode` | Detailed location information and contents |
| MovementHistoryPage | `/inventory/movements` | Log of all inventory movements |

### Key Features
- **Hierarchical Locations**: Three-level structure (Facility → Building → Zone)
- **Location Management**: Create, edit, delete storage locations
- **Movement Tracking**: Complete history of inventory movements
- **DataTable Integration**: Standardized table component for displays
- **Modal Operations**: Location details in modals

### Data Model
```typescript
interface LocationData {
  location_code: string;
  building_name?: string;
  zone_name?: string;
  facility_name?: string;
  location_type: string | null;
  display_order: number;
  total_items: number;
  items: InventoryItem[];
}
```

---

## 4. User Module

**Location**: `/frontend/src/modules/user/`  
**Base Route**: `/user/*`  
**Context Provider**: `UserProvider`  
**Purpose**: User-specific profile and settings

### File Structure
```
user/
├── pages/
│   ├── UserProfile.tsx
│   ├── UserSettings.tsx
│   └── index.ts
├── components/
├── context/
│   └── UserContext.tsx
├── hooks/
├── types/
│   └── index.ts
├── services/
│   └── userService.ts
├── routes.tsx
└── index.ts
```

### Pages Overview

| Page | Route | Purpose |
|------|-------|---------|
| UserProfile | `/user/` `/user/profile` | View and edit profile information |
| UserSettings | `/user/settings` | Personal settings and preferences |

### Key Features
- **User Context Provider**: Manages user-specific state
- **Profile Management**: View and update user information
- **Settings**: Configure personal preferences
- **Integration**: Works with authentication system

---

## Shared Infrastructure

All modules rely on centralized infrastructure from `/frontend/src/infrastructure/`:

### Key Services
- **Auth Service** (`auth/authService.ts`) - JWT authentication, RBAC
- **API Client** (`data/apiClient.ts`) - Centralized API requests
- **Navigation** (`navigation/`) - App-wide navigation
- **Notifications** (`notifications/`) - Toast system
- **Components** (`components/`) - UI component library
- **Hooks** (`hooks/`) - Shared React hooks
- **Store** (`store/`) - Module state sync

### Centralized Components Used
- Button, FormInput, FormCheckbox, FormTextarea
- Modal, DataTable, Badge, LoadingSpinner
- Icon, LocationDisplay
- Toast, Tabs, Card, etc.

### Key Hooks Used Across Modules
- `useToast()` - Notification handling
- `useEventBus()` - Event communication
- `usePermissions()` - Permission checking
- `useNavigate()` - React Router navigation
- `useSearchParams()` - URL query management

---

## Module Integration Points

### Cross-Module Communication
1. **Event Bus**: Modules emit/listen to events via `useEventBus()`
2. **Navigation**: Routes linked between modules (e.g., Admin → Gauge)
3. **Shared Context**: Infrastructure providers wrap all modules
4. **API**: Common backend via centralized `apiClient`

### Example: Admin Creates User
1. Admin module calls `inventoryService.createUser()`
2. Event bus emits `user-created` event
3. User module context updates
4. Gauge module refreshes if user list is visible

---

## Development Workflow

### Adding a New Page
1. Create page component in `module/pages/`
2. Export from `module/pages/index.ts`
3. Import and add route in `module/routes.tsx`
4. Test at module base route

### Adding Module-Specific Logic
1. Create hook in `module/hooks/`
2. Create service in `module/services/` if needed
3. Share via `useContext()` if module-wide state needed
4. Use in page components

### Using Shared Infrastructure
```typescript
import { useToast, Button, DataTable } from '../../../infrastructure';
import { apiClient } from '../../../infrastructure/data/apiClient';
import { usePermissions } from '../../../infrastructure/auth/usePermissions';
```

---

## Configuration Files

### Module Routes (`routes.tsx`)
Defines all routes for the module using React Router v6.

### Type Definitions (`types/index.ts`)
All TypeScript interfaces for the module.

### Constants (`constants.ts` or `constants/`)
Module-specific constants and configuration.

### Permissions (`permissions/index.ts`)
RBAC permissions required by the module.

---

## Best Practices

1. **Keep Pages Focused**: Each page handles one main view/workflow
2. **Use Modals for Details**: Don't create new pages for detail views
3. **Centralized Components**: Always use infrastructure components
4. **Error Boundaries**: Wrap module routes with ErrorBoundary
5. **Context for Module State**: Use context for cross-page state
6. **Hooks for Logic**: Extract reusable logic into custom hooks
7. **API Service Layer**: Keep API calls in service files, not components
8. **Type Safety**: Define all interfaces in `types/index.ts`
9. **Event Communication**: Use event bus for cross-module updates
10. **Lazy Load**: Split code at module boundaries

---

## File Size Guidelines

**Target Limits per CLAUDE.md**:
- **Functions**: 10-20 lines (ideal), 200 lines (maximum)
- **Files/Classes**: 200-300 lines (target), 500 lines (absolute maximum)

**Refactoring Triggers**:
- ≥300 lines: Refactor immediately
- ≥500 lines: Production blocker

All module files should maintain these standards for maintainability.

---

## Statistics

**Module Breakdown**:
- Admin: 9 pages
- Gauge: 8 pages (including 3 phases)
- Inventory: 4 pages
- User: 2 pages
- **Total**: 23 active pages

**Deprecated Pages**: 5 (in review-for-delete)

**Test Pages**: 4 (development only, in `/frontend/src/pages/`)

---

## Quick Navigation

| Need | Location | Command |
|------|----------|---------|
| Module routes | `module/routes.tsx` | `cat module/routes.tsx` |
| Page components | `module/pages/` | `ls module/pages/` |
| Module types | `module/types/` | `cat module/types/index.ts` |
| Module context | `module/context/` | `cat module/context/*.tsx` |
| Module hooks | `module/hooks/` | `ls module/hooks/` |
| API endpoints | `module/services/` | `cat module/services/*.ts` |
| Shared components | `/infrastructure/components/` | See infrastructure docs |

