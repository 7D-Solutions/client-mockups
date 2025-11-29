# Frontend Migration Plan V2 - Pure Action Steps

**LIVING DOCUMENT**: This plan can be changed if necessary, but any deviations require stopping, presenting new direction, and receiving approval before proceeding.

**DISCOVERED**: 
- New frontend has empty structure at `/frontend/src/modules/gauge/`
- Legacy frontend at `/Fireproof Gauge System/frontend/` has full implementation with:
  - Complete module system with `gauge-tracking` module
  - Existing ModuleRegistry pattern
  - Full components, services, stores, hooks
  - Tests already written

---

## Deviation Protocol

**CRITICAL**: If any step cannot be completed as written or major issues are discovered:

1. [ ] **STOP** execution immediately
2. [ ] **DOCUMENT** the specific issue encountered
3. [ ] **PROPOSE** alternative approach or plan modification
4. [ ] **PRESENT** new direction for approval
5. [ ] **WAIT** for explicit approval before proceeding
6. [ ] **UPDATE** this document with approved changes

**No unauthorized deviations from this plan are permitted.**

---

## CRITICAL ERRORS IDENTIFIED - PLAN UNUSABLE

**❌ DEPENDENCY PATH ERROR**: Line 67 uses wrong relative path - will cause build failures
**❌ MISSING DEPENDENCIES**: zustand, lucide-react not included - components will fail
**❌ CIRCULAR DEPENDENCY**: Module descriptor imports non-existent components (Lines 137-138 vs 172-181)
**❌ UNDEFINED FUNCTIONALITY**: App.tsx creation mentioned but no implementation (Lines 129, 195-197)
**❌ ORPHANED CONFIG**: enabled-modules.json created but never used (Line 127)
**❌ FUNDAMENTAL CONTRADICTION**: Says no complex loading but requires module mapping
**❌ INVALID TESTS**: Testing functionality that doesn't exist (Lines 207-211)

**VERDICT**: This plan has structural flaws and cannot be executed. See V3 for corrected version.

**WAITING FOR DIRECTION ON REFACTORING APPROACH**

---

## Phase 1: Assessment & Analysis

### Phase 1A: Document Current State
- [ ] Check if `/frontend/package.json` exists
- [ ] Check if `/frontend/src/App.tsx` exists (currently doesn't)
- [ ] Document that `/frontend/src/modules/gauge/` has empty subdirectories only
- [ ] Document legacy gauge module has:
  - `index.ts` with ModuleRegistry pattern
  - `components/` with GaugeListView, GaugeManagement, etc.
  - `services/` with gaugeService.ts
  - `store/` with gaugeStore.ts and uiStore.ts
  - `contexts/` with GaugePageContext
  - `hooks/` with custom hooks
  - `providers/` with multiple providers
  - Full test coverage in `/tests/`
- [ ] Document that legacy uses `@/core/modules/ModuleRegistry` (complex pattern)
- [ ] Compare to Modular-Vision.txt which wants simple module descriptors

### Phase 1B: Package Setup
- [ ] Copy these dependencies to `/frontend/package.json`:
  ```json
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.0.0",
    "@fireproof/erp-core": "file:../erp-core",
    "axios": "^1.6.0"
  }
  ```
- [ ] Copy these dev dependencies:
  ```json
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
  ```
- [ ] Run `npm install` in `/frontend/` directory
- [ ] Document any dependency conflicts

### Phase 1C: Basic Configuration
- [ ] Create `/frontend/vite.config.ts` with proxy to backend:
  ```typescript
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  
  export default defineConfig({
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': 'http://localhost:8000'
      }
    }
  });
  ```
- [ ] Create `/frontend/tsconfig.json` with path mappings
- [ ] Test that `npm run dev` starts without errors

---

## Phase 2: Core Application Structure

### Phase 2A: Entry Point
- [ ] Create `/frontend/src/index.tsx`:
  ```typescript
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import { App } from './App';
  import './index.css';
  
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  ```
- [ ] Create `/frontend/public/index.html` with root div
- [ ] Create `/frontend/src/index.css` (copy from legacy if exists)

### Phase 2B: Main App Component
- [ ] Create `/frontend/src/enabled-modules.json`:
  ```json
  ["gauge"]
  ```
- [ ] Create `/frontend/src/App.tsx` with providers and routes
- [ ] Import AuthProvider from `@fireproof/erp-core/auth`
- [ ] Import NotificationProvider from `@fireproof/erp-core/notifications`
- [ ] Add basic routing structure

### Phase 2C: Module Descriptor
- [ ] Create `/frontend/src/modules/gauge/index.ts`:
  ```typescript
  import { GaugeList } from './components/GaugeList';
  import { GaugeDetail } from './components/GaugeDetail';
  
  export default {
    id: 'gauge',
    name: 'Gauge Tracking',
    routes: [
      { path: '/gauges', component: GaugeList },
      { path: '/gauges/:id', component: GaugeDetail }
    ],
    navigation: [
      { label: 'Gauges', path: '/gauges', permission: 'gauge.view' }
    ]
  };
  ```

---

## Phase 3: Gauge Module Implementation

### Phase 3A: Types Definition
- [ ] Create `/frontend/src/modules/gauge/types/gauge.types.ts`
- [ ] Define Gauge interface matching backend schema
- [ ] Define GaugeCheckout interface
- [ ] Define GaugeReturn interface

### Phase 3B: API Service
- [ ] Create `/frontend/src/modules/gauge/services/gaugeApi.ts`
- [ ] Import apiClient from `@fireproof/erp-core/data`
- [ ] Implement `getGauges()` function
- [ ] Implement `getGauge(id)` function
- [ ] Implement `checkoutGauge(data)` function
- [ ] Implement `returnGauge(gaugeId, condition)` function

### Phase 3C: List Component
- [ ] Create `/frontend/src/modules/gauge/components/GaugeList.tsx`
- [ ] Import useState, useEffect from React
- [ ] Import gaugeApi service
- [ ] Import useAuth from `@fireproof/erp-core/auth`
- [ ] Implement permission check for 'gauge.view'
- [ ] Implement gauge loading and display
- [ ] Add Link to gauge detail using `/gauges/${gauge.id}`

### Phase 3D: Detail Component
- [ ] Create `/frontend/src/modules/gauge/components/GaugeDetail.tsx`
- [ ] Import useParams from react-router-dom
- [ ] Import gaugeApi service
- [ ] Import useAuth for permissions
- [ ] Import showNotification from `@fireproof/erp-core/notifications`
- [ ] Implement gauge loading by ID
- [ ] Implement checkout button (if gauge available and user has 'gauge.operate')
- [ ] Do NOT emit events for internal operations

---

## Phase 4: Integration & Testing

### Phase 4A: Connect Module to App
- [ ] Update `/frontend/src/App.tsx` to import gauge module
- [ ] Add gauge module to modules object
- [ ] Map enabled modules to routes
- [ ] Test navigation to `/gauges`

### Phase 4B: API Connection Testing
- [ ] Start backend server on port 8000
- [ ] Start frontend dev server on port 3000
- [ ] Verify proxy forwards `/api` calls to backend
- [ ] Test gauge list loads data
- [ ] Test gauge detail loads specific gauge

### Phase 4C: Permission Testing
- [ ] Test user without 'gauge.view' sees permission denied
- [ ] Test user with 'gauge.view' can see list
- [ ] Test checkout button only shows with 'gauge.operate'
- [ ] Test all API error cases show notifications

---

## Phase 5: Final Migration Steps

### Phase 5A: Test Directory Setup
- [ ] Create `/frontend/tests/modules/gauge/` directory
- [ ] Create placeholder test files (implementation later)
- [ ] Ensure NO `__tests__` folders exist anywhere

### Phase 5B: Docker Integration
- [ ] Verify `/frontend/Dockerfile` exists and is correct
- [ ] Test frontend builds with Docker
- [ ] Update docker-compose.yml if needed

### Phase 5C: Documentation & Cleanup
- [ ] Document any deviations from plan
- [ ] Document any discovered issues
- [ ] Move old frontend to `/review-for-delete/legacy-frontend/`
- [ ] Update CLAUDE.md if structure changed

---

## Success Criteria

All checkboxes must be completed for migration success:
- [ ] Frontend starts without errors
- [ ] Can navigate to gauge list
- [ ] Can view gauge details
- [ ] Permissions are enforced
- [ ] API calls work through proxy
- [ ] No console errors in browser
- [ ] Build completes successfully

---

## Notes

- **Do NOT** create complex module loading system
- **Do NOT** implement dynamic imports initially
- **Do NOT** emit events for internal gauge operations
- **Do NOT** create `__tests__` folders
- **Use** existing erp-core services for auth, data, notifications
- **Keep** module descriptor simple (id, name, routes, navigation only)