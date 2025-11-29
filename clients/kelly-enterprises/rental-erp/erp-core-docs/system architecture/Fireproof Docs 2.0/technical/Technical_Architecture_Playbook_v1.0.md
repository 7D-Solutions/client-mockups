# Technical Architecture Playbook v1.0

**Version:** 1.0  
**Date:** 2025-09-15  
**Purpose:** Defines system architecture, module boundaries, folder structure, events, and coding standards

> **IMPORTANT FRONTEND UPDATE**: The frontend has transitioned from CSS modules to infrastructure-based styling. Use infrastructure components for all visual styling. This supersedes any CSS-related guidance in this document.

## Table of Contents

1. [Prime Directives](#1-prime-directives)
2. [Architecture Overview](#architecture-overview)
   - 2.1 [Layers](#layers)
   - 2.2 [Rules](#rules)
3. [Core Modules](#3-core-modules)
   - 3.1 [Auth Module](#auth-module)
   - 3.2 [Navigation Module](#navigation-module)
   - 3.3 [Data Module](#data-module)
   - 3.4 [Notifications Module](#notifications-module)
4. [Business Module Template](#business-module-template)
5. [Event System](#event-system)
   - 5.1 [Canonical Events](#51-canonical-events)
   - 5.2 [Usage](#usage)
6. [Folder Structure Standard](#folder-structure-standard)
7. [MainApp Pattern](#mainapp-pattern)
8. [Testing Strategy](#testing-strategy)
   - 8.1 [Unit & Integration](#81-unit--integration)
   - 8.2 [End-to-End](#82-end-to-end)
   - 8.3 [CI/CD](#cicd)
9. [Documentation Deliverables](#documentation-deliverables)
10. [Handover Checklist](#handover-checklist)

---

## 1. Prime Directives
1. **Modules are independent** — no direct imports across business modules. Use **event bus** + core services only.  
2. **MainApp = orchestration only** — never contain business logic.  
3. **File size limits** — 30–200 lines; split if mixing concerns.  
4. **Core modules are stable** — business modules plug into them.  
5. **Toggle modules via config** — `enabled-modules.json`.  
6. **Write tests in isolation** — every module runs standalone.  
7. **Audit all state changes** (leverages DB/Permissions Reference).  

---

## 2. Architecture Overview

### 2.1 Layers
- **Core Layer** (under `/src/core/`)  
  - auth, navigation, data (API client + event bus), notifications  
- **Business Modules** (under `/src/modules/`)  
  - gauge-tracking, inventory, crm, etc.  
- **App Shell** (under `/src/app/`)  
  - MainApp, routing, global providers

### 2.2 Rules
- Business modules never import each other.  
- All cross-module communication is via **event bus** or **core services**.  
- Each module must be independently toggleable.  
- Use configuration files to enable/disable modules.

---

## 3. Core Modules

### 3.1 Auth Module
- Manages login, tokens, role/permission checks.  
- Exports hooks: `useAuth()`, `usePermission(name)`  

### 3.2 Navigation Module
- Provides tabbed navigation + routing context.  
- Exports `<NavTabs/>` and `<RouteGuard/>`  

### 3.3 Data Module
- API client wrapper (axios/fetch).  
- Event bus implementation (`publish(event, payload)`, `subscribe(event, handler)`).  
- Global error handler.  

### 3.4 Notifications Module
- Centralized notification service (success, error, info).  
- Components: `<NotificationCenter/>`.  

---

## 4. Business Module Template

**Location:** `/src/modules/<module-name>/`

**Subfolders:**
- `components/` (React UI, 30–80 lines each)  
- `services/` (business logic, 60–120 lines each)  
- `stores/` (Zustand/Redux stores, 80–150 lines each)  
- `pages/` (entry screens)  
- `tests/` (unit + integration)  

**File Guidelines:**
- Components = dumb views (props in, events out) using infrastructure components for ALL visual styling.  
- Services = logic only, no UI.  
- Stores = state mgmt, no API calls directly.  
- Keep 30–200 lines per file; split if mixing concerns.  
- **NO CSS FILES** - Use infrastructure components from `/src/infrastructure/components/`  

---

## 5. Event System

### 5.1 Canonical Events
- `asset.created`  
- `asset.updated`  
- `asset.deleted`  
- `asset.checked_out`  
- `asset.returned`  
- `asset.calibration_changed`  
- `asset.status_changed`  

### 5.2 Usage
- Business modules publish domain events.  
- Other modules subscribe via event bus.  
- No direct coupling.  

**Example:**
```ts
// In gauge-tracking/services/checkout.ts
publish("asset.checked_out", { id: gaugeId, user: currentUser.id });

// In notifications/service.ts
subscribe("asset.checked_out", payload => {
  notify.success(`Gauge ${payload.id} checked out by ${payload.user}`);
});
```

---

## 6. Folder Structure Standard

```
/src
 ├── app/                 # MainApp, routing
 ├── core/                # Core modules
 │    ├── auth/
 │    ├── navigation/
 │    ├── data/
 │    └── notifications/
 ├── infrastructure/      # Infrastructure components (ALL visual styling)
 │    └── components/     # Button, Modal, FormInput, etc.
 ├── modules/             # Business modules
 │    ├── gauge-tracking/
 │    │    ├── components/   # NO CSS files - use infrastructure
 │    │    ├── services/
 │    │    ├── stores/
 │    │    └── pages/
 │    ├── inventory/
 │    └── crm/
 └── shared/              # Shared hooks, utils (NO visual components)
```

---

## 7. MainApp Pattern

- Imports enabled modules from config.  
- Wraps providers (AuthProvider, NotificationProvider, Router).  
- No business logic allowed.  
- Delegates rendering to modules.

**Example:**
```ts
// src/app/MainApp.tsx
import enabled from "./enabled-modules.json";
import { AuthProvider } from "../core/auth";
import { NotificationProvider } from "../core/notifications";

export default function MainApp(){
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          {enabled.includes("gauge-tracking") && <GaugeTrackingModule/>}
          {enabled.includes("inventory") && <InventoryModule/>}
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
```

---

## 8. Testing Strategy

### 8.1 Unit & Integration
- Services tested with mock API + stores.  
- Components tested with React Testing Library.  
- Modules tested in isolation.  

### 8.2 End-to-End
- Validate complete workflows: checkout → return → QC accept.  
- Ensure navigation + permissions enforced.  

### 8.3 CI/CD
- Run lint, unit, integration on PRs.  
- Run e2e nightly or before releases.  

---

## 9. Documentation Deliverables

Each module must include:  
- `README.md` (purpose, usage)  
- `ARCHITECTURE.md` (events published/consumed, services, stores)  
- Example:  
  - `/src/modules/gauge-tracking/README.md`  
  - `/src/modules/gauge-tracking/ARCHITECTURE.md`

---

## 10. Handover Checklist
- [ ] Module folder created with standard subfolders.  
- [ ] All files respect size guidelines.  
- [ ] Events published/consumed documented in ARCHITECTURE.md.  
- [ ] Tests run in isolation.  
- [ ] MainApp imports module only via config.  
- [ ] No cross-module imports.  

---

## 11. Frontend Styling Architecture

### Infrastructure-Based Approach
- **NO CSS FILES**: Never create `.css` or `.module.css` files in business modules
- **Visual Styling**: Use infrastructure components for ALL visual needs
- **Layout Only**: Inline styles allowed ONLY for layout properties (display, flex, margin, padding)
- **Component Location**: `/src/infrastructure/components/`

### Example Implementation
```tsx
// ✅ CORRECT - Using infrastructure components
import { Button, FormInput, Card } from '../../infrastructure/components';

export function GaugeComponent() {
  return (
    <Card>
      <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
        <FormInput label="Gauge ID" />
        <Button variant="primary">Submit</Button>
      </div>
    </Card>
  );
}

// ❌ WRONG - Using CSS modules
import styles from './GaugeComponent.module.css';  // NEVER DO THIS
```

### Migration Notes
- Modal components have been migrated as reference implementation
- Follow Visual_Style_Guide_v1.0.md for migration patterns
- New development MUST follow infrastructure approach

---

**End of Technical Architecture Playbook (v1.0)**
