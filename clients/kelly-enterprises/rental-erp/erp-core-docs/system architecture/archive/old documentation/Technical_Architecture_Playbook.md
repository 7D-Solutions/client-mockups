# Fireproof ERP — Technical Architecture Playbook
**Version:** 1.0  
**Date:** 2025‑08‑23  
**Scope:** Defines *how the system is built* — module boundaries, folder structure, events, coding standards.  
**Sources:** Modular-Vision.txt, folder-structure V3.33.md

---

## 0) Prime Directives (for AI & Devs)
1. **Modules are independent** — no direct imports across business modules. Use **event bus** + core services only.  
2. **MainApp = orchestration only** — never contain business logic.  
3. **File size limits** — 30–200 lines; split if mixing concerns.  
4. **Core modules are stable** — business modules plug into them.  
5. **Toggle modules via config** — `enabled-modules.json`.  
6. **Write tests in isolation** — every module runs standalone.  
7. **Audit all state changes** (leverages DB/Permissions Reference).  

---

## 1) Architecture Overview

### 1.1 Layers
- **Core Layer** (under `/src/core/`)  
  - auth, navigation, data (API client + event bus), notifications  
- **Business Modules** (under `/src/modules/`)  
  - gauge-tracking, inventory, crm, etc.  
- **App Shell** (under `/src/app/`)  
  - MainApp, routing, global providers

### 1.2 Rules
- Business modules never import each other.  
- All cross-module communication is via **event bus** or **core services**.  
- Each module must be independently toggleable.  
- Use configuration files to enable/disable modules.

---

## 2) Core Modules (stable, mandatory)

### 2.1 Auth Module
- Manages login, tokens, role/permission checks.  
- Exports hooks: `useAuth()`, `usePermission(name)`  

### 2.2 Navigation Module
- Provides tabbed navigation + routing context.  
- Exports `<NavTabs/>` and `<RouteGuard/>`  

### 2.3 Data Module
- API client wrapper (axios/fetch).  
- Event bus implementation (`publish(event, payload)`, `subscribe(event, handler)`).  
- Global error handler.  

### 2.4 Notifications Module
- Centralized notification service (success, error, info).  
- Components: `<NotificationCenter/>`.  

---

## 3) Business Module Template

**Location:** `/src/modules/<module-name>/`

**Subfolders:**
- `components/` (React UI, 30–80 lines each)  
- `services/` (business logic, 60–120 lines each)  
- `stores/` (Zustand/Redux stores, 80–150 lines each)  
- `pages/` (entry screens)  
- `tests/` (unit + integration)  

**File Guidelines:**
- Components = dumb views (props in, events out).  
- Services = logic only, no UI.  
- Stores = state mgmt, no API calls directly.  
- Keep 30–200 lines per file; split if mixing concerns.  

---

## 4) Event System

### 4.1 Canonical Events (7)
- `asset.created`  
- `asset.updated`  
- `asset.deleted`  
- `asset.checked_out`  
- `asset.returned`  
- `asset.calibration_changed`  
- `asset.status_changed`  

### 4.2 Usage
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

## 5) Folder Structure Standard

```
/src
 ├── app/                 # MainApp, routing
 ├── core/                # Core modules
 │    ├── auth/
 │    ├── navigation/
 │    ├── data/
 │    └── notifications/
 ├── modules/             # Business modules
 │    ├── gauge-tracking/
 │    │    ├── components/
 │    │    ├── services/
 │    │    ├── stores/
 │    │    └── pages/
 │    ├── inventory/
 │    └── crm/
 └── shared/              # Shared UI primitives, hooks, utils
```

---

## 6) MainApp Pattern

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

## 7) Testing Strategy

### 7.1 Unit & Integration (Jest)
- Services tested with mock API + stores.  
- Components tested with React Testing Library.  
- Modules tested in isolation.  

### 7.2 End-to-End (Playwright)
- Validate complete workflows: checkout → return → QC accept.  
- Ensure navigation + permissions enforced.  

### 7.3 CI/CD
- Run lint, unit, integration on PRs.  
- Run e2e nightly or before releases.  

---

## 8) Documentation Deliverables

Each module must include:  
- `README.md` (purpose, usage)  
- `ARCHITECTURE.md` (events published/consumed, services, stores)  
- Example:  
  - `/src/modules/gauge-tracking/README.md`  
  - `/src/modules/gauge-tracking/ARCHITECTURE.md`

---

## 9) Handover Checklist
- [ ] Module folder created with standard subfolders.  
- [ ] All files respect size guidelines.  
- [ ] Events published/consumed documented in ARCHITECTURE.md.  
- [ ] Tests run in isolation.  
- [ ] MainApp imports module only via config.  
- [ ] No cross-module imports.  

---

**End of Technical Architecture Playbook (v1.0)**
