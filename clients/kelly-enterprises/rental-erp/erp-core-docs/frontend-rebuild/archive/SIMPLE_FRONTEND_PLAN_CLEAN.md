# Frontend Implementation Plan - Enterprise Modular Architecture

## Current State Assessment
**Implementation**: 22% complete (22 files, 1,611 LOC)
**Production Ready**: NO - Missing modular architecture and enterprise infrastructure

### Completed Features
- ✅ Basic authentication flow
- ✅ Simple gauge listing  
- ✅ 7 core modals implemented
- ✅ Basic checkout/return operations
- ✅ Toast notifications

### Critical Gaps
- ❌ No modular architecture (not a true ERP module)
- ❌ No ERP-core integration
- ❌ No infrastructure layer
- ❌ No module boundaries
- ❌ No admin module
- ❌ No shared services layer
- ❌ No testing infrastructure

## Assets Available (No Production System)
- **Legacy Frontend**: 84 files, 9,480 LOC - Complete features, never deployed
- **Modular Frontend**: 22 files, 1,611 LOC - Basic prototype
- **Backend**: Excellent modular architecture to mirror

## Cherry-Pick Strategy
```typescript
// From Legacy: Take working business logic
- 16 functional modals
- AdminPanel components  
- Business validation rules
- Tested workflows

// From Modular: Keep clean patterns
- React Query setup
- Component structure
- Modern tooling

// Build New: Proper modular foundation
- Module architecture
- Infrastructure layer
- ERP-core integration
```

## Target Architecture (Mirror Backend Structure)
```
frontend/src/
  modules/
    gauge/                # Self-contained gauge module
      components/         # Module-specific UI
      pages/             # Module pages
      hooks/             # Business logic hooks
      services/          # API integration
      routes/            # Route definitions
      types/             # TypeScript interfaces
      index.tsx          # Module bootstrap
    admin/               # Admin module
    shared/              # Shared within frontend
  infrastructure/        # Core integration layer
    auth/               # ERP-core auth wrapper
    navigation/         # ERP-core navigation
    api/                # Centralized API client
    events/             # Frontend EventBus
    components/         # Shared UI library
    store/              # Zustand with modules
  App.tsx               # Module orchestrator
```

## Phase 1: Infrastructure Layer (Foundation)

### 1.1 Project Setup
```bash
npm install react-router-dom zustand @fireproof/erp-core
```

### 1.2 Infrastructure Layer Setup
```typescript
// infrastructure/auth/index.ts
import { useERPAuth } from '@fireproof/erp-core/auth';

export const useAuth = () => {
  const erpAuth = useERPAuth();
  // Wrapper for ERP-core auth
  return {
    user: erpAuth.user,
    login: erpAuth.login,
    logout: erpAuth.logout,
    permissions: erpAuth.permissions
  };
};

// infrastructure/api/client.ts
export const apiClient = {
  async request(path: string, options?: RequestInit) {
    const response = await fetch(`/api/v2${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    });
    
    if (!response.ok) throw await response.json();
    return response.json();
  }
};

// infrastructure/events/index.ts
export class EventBus {
  private events = new Map<string, Set<Function>>();
  
  emit(event: string, data: any) {
    this.events.get(event)?.forEach(handler => handler(data));
  }
  
  on(event: string, handler: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }
}

export const eventBus = new EventBus();
```

### 1.3 Module Store Pattern
```typescript
// infrastructure/store/index.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Module states will be namespaced
  gauge: GaugeModuleState;
  admin: AdminModuleState;
  shared: SharedState;
}

export const useAppStore = create<AppState>()(persist(
  (set) => ({
    gauge: initialGaugeState,
    admin: initialAdminState,
    shared: initialSharedState
  }),
  { name: 'erp-app-storage' }
));
```

### 1.4 Shared Component Library
```typescript
// infrastructure/components/index.ts
export { Button } from './Button';
export { Modal } from './Modal';
export { LoadingSpinner } from './LoadingSpinner';
export { Toast } from './Toast';
export { DataTable } from './DataTable';
// Consistent UI components across all modules
```

## Phase 2: Gauge Module Structure

### 2.1 Module Setup
```typescript
// modules/gauge/index.tsx
import { GaugeRoutes } from './routes';
import { GaugeProvider } from './context';

export const GaugeModule = () => {
  return (
    <GaugeProvider>
      <GaugeRoutes />
    </GaugeProvider>
  );
};

// modules/gauge/routes/index.tsx
import { Routes, Route } from 'react-router-dom';
import { GaugeList } from '../pages/GaugeList';
import { GaugeDetail } from '../pages/GaugeDetail';

export const GaugeRoutes = () => {
  return (
    <Routes>
      <Route index element={<GaugeList />} />
      <Route path=":id" element={<GaugeDetail />} />
    </Routes>
  );
};
```

### 2.2 Module Services
```typescript
// modules/gauge/services/gaugeService.ts
import { apiClient } from '../../../infrastructure/api';

export const gaugeService = {
  getAll: () => apiClient.request('/gauges'),
  getById: (id: string) => apiClient.request(`/gauges/${id}`),
  checkout: (id: string, data: any) => 
    apiClient.request(`/gauge-tracking/${id}/checkout`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  return: (id: string, data: any) =>
    apiClient.request(`/gauge-tracking/${id}/return`, {
      method: 'POST', 
      body: JSON.stringify(data)
    })
};
```

### 2.3 Cherry-Pick Existing Components
**Actions**:
- Copy 7 working modals from current implementation
- Copy 16 modals from legacy system
- Adapt imports to new module structure
- Update to use infrastructure services

## Phase 3: Admin Module

### 3.1 Admin Module Structure
```typescript
// modules/admin/index.tsx
import { AdminRoutes } from './routes';
import { AdminProvider } from './context';
import { useAuth } from '../../infrastructure/auth';

export const AdminModule = () => {
  const { permissions } = useAuth();
  
  if (!permissions.includes('admin')) {
    return <Navigate to="/" />;
  }
  
  return (
    <AdminProvider>
      <AdminRoutes />
    </AdminProvider>
  );
};
```

### 3.2 User Management
**Actions**:
- Copy AdminPanel components from legacy
- Build user CRUD interfaces
- Implement role management
- Create permission assignment UI

## Phase 4: Module Integration

### 4.1 App Orchestrator
```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavigationProvider } from '@fireproof/erp-core/navigation';
import { AuthProvider } from '@fireproof/erp-core/auth';
import { GaugeModule } from './modules/gauge';
import { AdminModule } from './modules/admin';
import { MainLayout } from './infrastructure/components/MainLayout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NavigationProvider>
          <MainLayout>
            <Routes>
              <Route path="/gauges/*" element={<GaugeModule />} />
              <Route path="/admin/*" element={<AdminModule />} />
              <Route path="/" element={<Navigate to="/gauges" />} />
            </Routes>
          </MainLayout>
        </NavigationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 4.2 Module Communication
```typescript
// Cross-module communication via EventBus
import { eventBus } from './infrastructure/events';

// In gauge module
eventBus.emit('gauge:updated', { gaugeId, status });

// In admin module
eventBus.on('gauge:updated', (data) => {
  // Update admin dashboard metrics
});
```

## Phase 5: Testing & Production

### 5.1 Testing Structure
```
frontend/tests/
  unit/
    infrastructure/
    modules/
      gauge/
      admin/
  integration/
    module-communication.test.ts
    erp-core-integration.test.ts
  e2e/
    gauge-workflows.spec.ts
    admin-workflows.spec.ts
```

### 5.2 Quality Targets
- 80% unit test coverage
- Integration tests for module boundaries
- E2E tests for critical workflows
- Performance benchmarks met

## Success Criteria

### Phase 1 Complete When:
- Infrastructure layer operational
- ERP-core integration working
- Shared component library ready
- API client configured
- EventBus functional

### Phase 2 Complete When:
- Gauge module fully migrated
- All 23 modals integrated
- Module boundaries enforced
- Services layer complete

### Phase 3 Complete When:
- Admin module operational
- User management functional
- Permissions integrated
- Module isolated from gauge

### Phase 4 Complete When:
- Modules communicating via EventBus
- Shared state managed properly
- Navigation seamless
- No direct module imports

### Phase 5 Complete When:
- 80% test coverage achieved
- Security audit passed
- Performance targets met
- Deployed to production

## Key Principles
- **True Modularity**: Mirror backend architecture
- **Clear Boundaries**: No direct module imports
- **Shared Infrastructure**: All integration through infrastructure layer
- **Cherry-Pick Assets**: Reuse working code from both systems
- **Enterprise Ready**: Built for scale from day one