# Frontend Pages Index - Documentation Guide

This directory contains comprehensive documentation of all frontend pages, routing, and module structure for the Fire-Proof ERP Sandbox application.

## Documentation Files

### 1. **FRONTEND_PAGES_INDEX.md** (8.8 KB)
**Comprehensive overview of all pages organized by module.**

- Complete listing of all active pages (23 pages)
- Route paths and file locations
- Purpose descriptions for each page
- Module organization patterns
- Deprecated pages reference
- Navigation and entry points
- Statistics and summary

**Use this for**: Understanding what pages exist and where they are

### 2. **FRONTEND_ROUTES_HIERARCHY.txt** (2.4 KB)
**Visual ASCII tree of the complete routing hierarchy.**

```
App Root
├── /gauges/* ─── Gauge Module
│   ├── / (GaugeList)
│   ├── /my-gauges (MyGauges)
│   └── ... (8 routes total)
├── /admin/* ──── Admin Module
│   ├── / (AdminDashboard)
│   └── ... (10 routes total)
├── /inventory/* ─ Inventory Module
├── /user/* ────── User Module
└── /test/* ────── Test Routes
```

**Use this for**: Quick visual reference of route structure

### 3. **FRONTEND_MODULES_REFERENCE.md** (14 KB)
**Detailed reference for each module's structure, components, and patterns.**

- Individual module deep-dives:
  - Admin Module (9 pages)
  - Gauge Module (8 pages with phases)
  - Inventory Module (4 pages)
  - User Module (2 pages)
- File structure templates
- Key features and workflows
- Shared infrastructure integration
- Development workflow and best practices
- File size guidelines

**Use this for**: Understanding module architecture and development patterns

### 4. **FRONTEND_PAGES_QUICK_REFERENCE.md** (9.1 KB)
**Quick lookup guide with direct file paths and route mappings.**

- Quick file paths (all pages listed)
- Route-to-file mappings
- Page statistics
- Find pages by purpose
- File organization rules
- Common page patterns
- Navigation shortcuts
- Troubleshooting guide

**Use this for**: Quick lookups and finding specific pages/routes

---

## Quick Start

### Find a Page
```bash
# Look up by route
grep "/admin/users" FRONTEND_ROUTES_HIERARCHY.txt
# Result: /admin/users (UserManagement.tsx)

# Look up by purpose
grep -i "user management" FRONTEND_PAGES_INDEX.md

# Look up by file
grep "UserManagement.tsx" FRONTEND_PAGES_QUICK_REFERENCE.md
```

### Understand Module Structure
1. Read the module section in FRONTEND_PAGES_INDEX.md
2. Check detailed info in FRONTEND_MODULES_REFERENCE.md
3. Review actual route file: `frontend/src/modules/{module}/routes.tsx`

### Add a New Page
1. Check file size guidelines in FRONTEND_MODULES_REFERENCE.md
2. Review page patterns in FRONTEND_PAGES_QUICK_REFERENCE.md
3. Follow the "Adding New Pages" checklist
4. Update the index files (or request re-generation)

---

## Key Findings

### Frontend Structure
- **4 Main Modules**: Admin, Gauge, Inventory, User
- **23 Active Pages**: Core functionality pages
- **5 Test Pages**: Development and testing utilities
- **30+ Routes**: Including redirects and aliases

### Route Organization
| Module | Base Path | Pages | Context Provider |
|--------|-----------|-------|------------------|
| Admin | `/admin/*` | 9 | None |
| Gauge | `/gauges/*` | 8 | GaugeProvider |
| Inventory | `/inventory/*` | 4 | None |
| User | `/user/*` | 2 | UserProvider |
| Test | `/test/*` | 4 | None (dev only) |

### Default Routes
- Root `/` → redirects to `/gauges/list` (main gauge inventory)
- Dashboard `/dashboard` → redirects to `/gauges/my-gauges`
- Catch-all `*` → redirects to `/gauges/list`

### Entry Points
- **Primary**: `/gauges/list` - Main gauge inventory with DataTable
- **User Dashboard**: `/gauges/my-gauges` - Personal gauge view
- **Admin**: `/admin/` - System administration hub
- **User Settings**: `/user/profile` - User profile and preferences

---

## Module Features

### Admin Module (`/admin/*`)
- User and role management
- System settings and configuration
- Audit logging
- Location hierarchy (Facility → Building → Zone)
- Gauge type management

### Gauge Module (`/gauges/*`)
- Main inventory management (DataTable-based)
- Personal gauge dashboard
- Quality control workflows
- Phase-based features:
  - Phase 1: Set details view
  - Phase 3: Calibration management
  - Phase 4: Customer return handling
  - Phase 5: Spare gauge pairing
- Modal-based operations with context management

### Inventory Module (`/inventory/*`)
- Storage location browsing
- Location detail views
- Movement history tracking
- Hierarchical location management

### User Module (`/user/*`)
- Personal profile management
- User preferences and settings

---

## Architecture Highlights

### Centralized Infrastructure
All pages use shared infrastructure from `/frontend/src/infrastructure/`:
- Centralized UI components (Button, FormInput, Modal, DataTable, etc.)
- Shared API client (`apiClient`)
- Authentication service (`authService`)
- Event bus for cross-module communication
- Toast notification system

### Module State Management
- **Gauge Module**: Uses `GaugeProvider` context for shared state
- **User Module**: Uses `UserProvider` context
- **Admin & Inventory**: Use component-level state with context as needed

### Error Handling
- All modules wrapped with `ErrorBoundary`
- Per-module error isolation
- Infrastructure error boundaries for safety

### Code Organization
Each module follows a consistent pattern:
```
module/
├── pages/        (page components)
├── components/   (module-specific UI)
├── hooks/        (custom hooks)
├── context/      (state management)
├── services/     (API and business logic)
├── types/        (TypeScript definitions)
└── routes.tsx    (routing configuration)
```

---

## Common Tasks

### Find a Specific Page
```bash
# By route path
grep -r "/gauges/calibration" FRONTEND_*.md

# By file name
ls /mnt/c/users/7d.vision/projects/fire-proof-erp-sandbox/frontend/src/modules/*/pages/ | grep -i calibration

# By purpose/keyword
grep -i "calibration" FRONTEND_PAGES_INDEX.md
```

### Understand a Module
1. Check FRONTEND_MODULES_REFERENCE.md section for the module
2. List all pages: `ls frontend/src/modules/{module}/pages/`
3. Review routes: `cat frontend/src/modules/{module}/routes.tsx`
4. Check types: `cat frontend/src/modules/{module}/types/index.ts`

### Add a New Page
```bash
# 1. Create the page file
touch frontend/src/modules/{module}/pages/NewPage.tsx

# 2. Export it in index.ts
echo "export { NewPage } from './NewPage';" >> frontend/src/modules/{module}/pages/index.ts

# 3. Add route to routes.tsx
# <Route path="/new-page" element={<NewPage />} />

# 4. Test at http://localhost:3001/module/new-page
```

### Find Pages by Functionality
- **User Management**: `/admin/users`, `/user/profile`, `/user/settings`
- **Gauge Operations**: `/gauges/`, `/gauges/create`, `/gauges/my-gauges`, `/gauges/qc`
- **Location Management**: `/admin/facilities`, `/admin/buildings`, `/admin/zones`, `/inventory/locations`
- **Inventory**: `/inventory/`, `/inventory/movements`
- **Workflows**: `/gauges/calibration-management`, `/gauges/returned-customer-gauges`, `/gauges/spare-inventory`

---

## Standards & Best Practices

### Code Standards
- **File Size**: 200-300 lines (target), 500 lines (max)
- **Function Size**: 10-20 lines (ideal), 200 lines (max)
- **Component Pattern**: Functional components with hooks
- **Styling**: CSS modules via infrastructure components

### Infrastructure Usage
All pages MUST use centralized infrastructure:
```typescript
// ✅ CORRECT
import { Button, FormInput, Modal } from '../../../infrastructure/components';
import { apiClient } from '../../../infrastructure/data/apiClient';
import { useToast } from '../../../infrastructure/hooks/useToast';

// ❌ WRONG - Never create custom implementations
<button>Click</button>  // Use <Button>Click</Button>
fetch('/api/...')       // Use apiClient.get('/...')
```

### Module Independence
- Each module is self-contained and independent
- Cross-module communication via event bus
- No direct imports between modules
- Shared code only in `/infrastructure/`

---

## File Locations

**Documentation files**:
- `/FRONTEND_PAGES_INDEX.md`
- `/FRONTEND_ROUTES_HIERARCHY.txt`
- `/FRONTEND_MODULES_REFERENCE.md`
- `/FRONTEND_PAGES_QUICK_REFERENCE.md`
- `/FRONTEND_INDEX_README.md` (this file)

**Source code**:
- `/frontend/src/App.tsx` - Main application routing
- `/frontend/src/modules/*/routes.tsx` - Module routing
- `/frontend/src/modules/*/pages/` - Page components
- `/frontend/src/infrastructure/` - Shared services and components

---

## Document Maintenance

These documentation files were auto-generated. To update them:

1. **Run page discovery** (find all page files)
2. **Parse routing files** (extract route definitions)
3. **Analyze module structure** (document organization)
4. **Generate documentation** (create markdown)

**Regeneration trigger**: When adding/removing pages or changing routes

---

## Related Documentation

See also:
- **CLAUDE.md** - Project constraints and standards
- **FRONTEND_PAGES_INDEX.md** - Comprehensive pages index
- **FRONTEND_ROUTES_HIERARCHY.txt** - Route tree visualization
- **FRONTEND_MODULES_REFERENCE.md** - Module deep-dives
- **FRONTEND_PAGES_QUICK_REFERENCE.md** - Quick lookup guide

---

## Quick Statistics

- **Total Pages**: 28 (23 active + 5 test)
- **Total Routes**: 30+
- **Modules**: 4
- **Page Index Entries**: 24
- **Route Definitions**: 30+
- **Module Structures**: 4
- **Code Standards**: 5

---

**Last Generated**: 2025-11-06  
**Version**: 1.0  
**Status**: Current

For questions or updates, refer to the comprehensive FRONTEND_PAGES_INDEX.md file.
