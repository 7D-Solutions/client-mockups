# Modular Frontend Implementation Plan

## Executive Summary

Build a truly modular enterprise frontend that mirrors the backend's proven architecture, integrates with ERP-core from day one, and scales elegantly as new modules are added.

**Key Principles**:
- Mirror backend's modular architecture
- Infrastructure layer handles all shared services
- Clear module boundaries with no cross-imports
- ERP-core integration from the start
- ~9,000 lines of well-architected code (no artificial constraints)

## Target Architecture

```typescript
frontend/
  src/
    modules/
      gauge/                 # Self-contained gauge module
        components/          # Module-specific UI components
        pages/              # Page components
        hooks/              # Business logic hooks
        services/           # API service layer
        routes/             # Route definitions
        types/              # TypeScript interfaces
        store/              # Module-specific state
        index.tsx           # Module bootstrap
      admin/                # Admin module (Phase 2)
        components/
        pages/
        services/
        routes/
        types/
        store/
        index.tsx
      shared/               # Shared within frontend modules
        components/        # Shared UI components
        hooks/            # Shared hooks
        types/            # Shared types
    infrastructure/         # Core integration layer
      auth/                # ERP-core auth integration
      navigation/          # ERP-core navigation integration
      api/                 # Centralized API client
      events/              # Frontend EventBus
      store/               # Global state management (Zustand)
      components/          # Design system components
      utils/               # Shared utilities
    App.tsx                # Module orchestrator
    main.tsx              # Application entry point
```

## Implementation Phases

### Phase 1: Infrastructure Foundation (Week 1)

**Objective**: Build the core infrastructure layer that all modules will use.

#### 1.1 Project Setup
```bash
npm create vite@latest frontend-modular -- --template react-ts
cd frontend-modular
npm install react-router-dom zustand @tanstack/react-query axios
npm install -D @types/react @types/react-dom vitest @testing-library/react
```

#### 1.2 Infrastructure Layer
Create the foundational services:

```typescript
// src/infrastructure/api/client.ts
import axios from 'axios';
import { authService } from '../auth/authService';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
});

apiClient.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// src/infrastructure/auth/authService.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (credentials) => {
        // Implementation
      },
      logout: () => {
        set({ user: null, token: null });
      }
    }),
    { name: 'erp-auth' }
  )
);

// src/infrastructure/events/EventBus.ts
type EventHandler = (data: any) => void;

class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map();
  
  on(event: string, handler: EventHandler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }
  
  off(event: string, handler: EventHandler) {
    this.events.get(event)?.delete(handler);
  }
  
  emit(event: string, data: any) {
    this.events.get(event)?.forEach(handler => handler(data));
  }
}

export const eventBus = new EventBus();

// src/infrastructure/navigation/NavigationProvider.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ModuleRegistry } from './ModuleRegistry';

export const NavigationProvider: React.FC = () => {
  const modules = ModuleRegistry.getModules();
  
  return (
    <BrowserRouter>
      <Routes>
        {modules.map(module => (
          <Route key={module.name} path={module.path} element={module.routes} />
        ))}
      </Routes>
    </BrowserRouter>
  );
};
```

#### 1.3 Module Registry Pattern
```typescript
// src/infrastructure/modules/ModuleRegistry.ts
interface Module {
  name: string;
  path: string;
  routes: React.ReactElement;
  navigation?: NavigationItem[];
  permissions?: string[];
}

class ModuleRegistryClass {
  private modules: Map<string, Module> = new Map();
  
  register(module: Module) {
    this.modules.set(module.name, module);
  }
  
  getModules(): Module[] {
    return Array.from(this.modules.values());
  }
  
  getNavigation(): NavigationItem[] {
    return this.getModules()
      .filter(m => m.navigation)
      .flatMap(m => m.navigation!);
  }
}

export const ModuleRegistry = new ModuleRegistryClass();
```

#### 1.4 Testing Infrastructure
```typescript
// src/infrastructure/testing/test-utils.tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

### Phase 2: Gauge Module Implementation (Week 2-3)

**Objective**: Build the gauge module following enterprise patterns.

#### 2.1 Module Structure
```typescript
// src/modules/gauge/index.tsx
import { ModuleRegistry } from '@/infrastructure/modules/ModuleRegistry';
import { gaugeRoutes } from './routes';
import { gaugeNavigation } from './navigation';

ModuleRegistry.register({
  name: 'gauge',
  path: '/gauges/*',
  routes: gaugeRoutes,
  navigation: gaugeNavigation,
  permissions: ['gauge.view', 'gauge.manage']
});

// src/modules/gauge/routes/index.tsx
import { Routes, Route } from 'react-router-dom';
import { GaugeListPage } from '../pages/GaugeListPage';
import { GaugeDetailPage } from '../pages/GaugeDetailPage';

export const gaugeRoutes = (
  <Routes>
    <Route index element={<GaugeListPage />} />
    <Route path=":id" element={<GaugeDetailPage />} />
  </Routes>
);
```

#### 2.2 Service Layer
```typescript
// src/modules/gauge/services/gaugeService.ts
import { apiClient } from '@/infrastructure/api/client';
import { Gauge, GaugeFilter } from '../types';

export const gaugeService = {
  async getGauges(filters?: GaugeFilter): Promise<Gauge[]> {
    const { data } = await apiClient.get('/v2/gauges', { params: filters });
    return data;
  },
  
  async getGauge(id: string): Promise<Gauge> {
    const { data } = await apiClient.get(`/v2/gauges/${id}`);
    return data;
  },
  
  async updateGauge(id: string, updates: Partial<Gauge>): Promise<Gauge> {
    const { data } = await apiClient.patch(`/v2/gauges/${id}`, updates);
    return data;
  }
};
```

#### 2.3 Module State Management
```typescript
// src/modules/gauge/store/gaugeStore.ts
import { create } from 'zustand';
import { gaugeService } from '../services/gaugeService';

interface GaugeState {
  gauges: Gauge[];
  selectedGauge: Gauge | null;
  filters: GaugeFilter;
  loading: boolean;
  fetchGauges: () => Promise<void>;
  selectGauge: (id: string) => Promise<void>;
  updateFilters: (filters: Partial<GaugeFilter>) => void;
}

export const useGaugeStore = create<GaugeState>((set, get) => ({
  gauges: [],
  selectedGauge: null,
  filters: {},
  loading: false,
  
  fetchGauges: async () => {
    set({ loading: true });
    try {
      const gauges = await gaugeService.getGauges(get().filters);
      set({ gauges, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  
  selectGauge: async (id: string) => {
    const gauge = await gaugeService.getGauge(id);
    set({ selectedGauge: gauge });
  },
  
  updateFilters: (filters) => {
    set(state => ({ filters: { ...state.filters, ...filters } }));
    get().fetchGauges();
  }
}));
```

#### 2.4 Component Library
```typescript
// src/modules/gauge/components/GaugeList/GaugeList.tsx
export const GaugeList: React.FC<GaugeListProps> = ({ gauges, onSelect }) => {
  return (
    <div className="gauge-list">
      {gauges.map(gauge => (
        <GaugeListItem 
          key={gauge.id} 
          gauge={gauge} 
          onClick={() => onSelect(gauge.id)}
        />
      ))}
    </div>
  );
};

// src/modules/gauge/components/modals/TransferModal.tsx
export const TransferModal: React.FC<TransferModalProps> = ({ gauge, onClose }) => {
  // Reuse logic from existing modular frontend
  // But properly integrated with module structure
};
```

### Phase 3: Admin Module Foundation (Week 4)

**Objective**: Build admin module with user management capabilities.

#### 3.1 Admin Module Structure
```typescript
// src/modules/admin/index.tsx
import { ModuleRegistry } from '@/infrastructure/modules/ModuleRegistry';

ModuleRegistry.register({
  name: 'admin',
  path: '/admin/*',
  routes: adminRoutes,
  navigation: adminNavigation,
  permissions: ['admin.access']
});
```

#### 3.2 User Management Components
- UserList with search/filter
- UserDetailsModal
- AddUserModal
- PasswordResetModal
- RoleManagement component

### Phase 4: Shared Component Library (Week 5)

**Objective**: Build reusable components across modules.

#### 4.1 Design System Components
```typescript
// src/infrastructure/components/Button/Button.tsx
// src/infrastructure/components/Modal/Modal.tsx
// src/infrastructure/components/Table/Table.tsx
// src/infrastructure/components/Form/Form.tsx
```

#### 4.2 Layout Components
```typescript
// src/infrastructure/components/Layout/MainLayout.tsx
// src/infrastructure/components/Navigation/MainNav.tsx
// src/infrastructure/components/Navigation/Breadcrumbs.tsx
```

### Phase 5: Testing & Production Readiness (Week 6)

**Objective**: Comprehensive testing and production preparation.

#### 5.1 Testing Strategy
- Unit tests for all services and hooks
- Integration tests for module interactions
- E2E tests for critical workflows
- Performance testing

#### 5.2 Production Optimizations
- Code splitting by module
- Lazy loading routes
- Bundle optimization
- Error boundaries
- Performance monitoring

## Migration Strategy (From Existing Code)

### Cherry-Pick Approach
1. **From Legacy Frontend**:
   - 16 working modal components
   - AdminPanel components
   - Business validation logic
   - Tested UI patterns

2. **From Current Modular**:
   - React Query patterns
   - Toast notification system
   - API integration patterns
   - Component structure

3. **Build New**:
   - Module architecture
   - Infrastructure layer
   - ERP-core integration
   - Testing framework

### No Migration Complexity
- No Phase 0 migration needed
- Direct implementation with proper architecture
- Copy useful code, adapt to new structure
- Test as you build

## Success Metrics

### Technical Metrics
- [ ] All modules follow consistent architecture
- [ ] Zero cross-module imports
- [ ] 80% test coverage minimum
- [ ] <3 second initial load time
- [ ] All API calls through infrastructure layer

### Business Metrics
- [ ] Feature parity with legacy system
- [ ] Multi-user support enabled
- [ ] Admin panel fully functional
- [ ] All 16 modals working
- [ ] Transfer workflows complete

### Architecture Metrics
- [ ] Clean module boundaries
- [ ] Infrastructure layer complete
- [ ] ERP-core integration working
- [ ] Event-driven communication
- [ ] Service registry pattern implemented

## Key Decisions

1. **React Router** - For true multi-page navigation
2. **Zustand** - For state management with module isolation
3. **Module Registry** - For dynamic module loading
4. **EventBus** - For decoupled module communication
5. **Infrastructure Layer** - For all shared services

## What We're NOT Doing

- ❌ Building a minimal standalone app
- ❌ Creating migration bridges
- ❌ Counting lines of code
- ❌ Making monolithic decisions
- ❌ Ignoring backend patterns

## Next Steps

1. **Set up project** with correct structure
2. **Build infrastructure layer** completely
3. **Implement gauge module** with all features
4. **Add admin module** for user management
5. **Complete testing** and optimization

Focus on building it right from the start with proper enterprise modular architecture.