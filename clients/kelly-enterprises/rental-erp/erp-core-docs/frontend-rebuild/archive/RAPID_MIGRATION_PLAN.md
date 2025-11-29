# Rapid Frontend Migration Plan (Development Mode)

## Context
- **No working app to preserve** - We can move fast and break things
- **Tests go in** `/frontend/tests/` (not `__tests__` folders)
- **Development branch** - Full freedom to restructure

## Immediate Action Plan

### Step 1: Create New Frontend Structure (30 minutes)
```bash
# Create the new frontend at root level
mkdir -p /frontend/src/modules/gauge/{components,services,stores,types}
mkdir -p /frontend/tests/{unit,integration,e2e}
mkdir -p /frontend/tests/modules/gauge

# Copy essential config files
cp "Fireproof Gauge System/frontend/package.json" /frontend/
cp "Fireproof Gauge System/frontend/vite.config.ts" /frontend/
cp "Fireproof Gauge System/frontend/tsconfig.json" /frontend/
```

### Step 2: Set Up Module Structure (1 hour)

#### Create Module Descriptor
```typescript
// /frontend/src/modules/gauge/index.ts
export const gaugeModule = {
  id: 'gauge-tracking',
  name: 'Gauge Tracking',
  routes: [
    { path: '/gauges', component: GaugeList },
    { path: '/gauges/:id', component: GaugeDetail }
  ],
  navigation: [
    { label: 'Gauges', path: '/gauges', icon: 'gauge' }
  ],
  dependencies: [] // No dependencies on other business modules!
};
```

#### Main App.tsx (Pure Orchestration)
```typescript
// /frontend/src/App.tsx
import { useAuth } from '@fireproof/erp-core/auth';
import { useModuleConfig } from '@fireproof/erp-core/navigation';
import { gaugeModule } from './modules/gauge';

export function App() {
  const { currentUser } = useAuth();
  const { enabledModules } = useModuleConfig();
  
  if (!currentUser) return <LoginScreen />;
  
  return (
    <AppLayout>
      <Navigation modules={[gaugeModule]} />
      <Routes>
        {gaugeModule.routes.map(route => (
          <Route key={route.path} {...route} />
        ))}
      </Routes>
    </AppLayout>
  );
}
```

### Step 3: Migrate Components (2-3 hours)

#### Split Large Components
**FROM**: `GaugeInventory.tsx` (500+ lines)
**TO**: Multiple focused files

```typescript
// /frontend/src/modules/gauge/components/GaugeList.tsx (60 lines)
export function GaugeList() {
  const { gauges, loading } = useGaugeStore();
  const { hasPermission } = useAuth();
  
  if (!hasPermission('gauge.view')) {
    return <AccessDenied />;
  }
  
  if (loading) return <Loading />;
  
  return (
    <div className="gauge-list">
      {gauges.map(gauge => (
        <GaugeCard key={gauge.id} gauge={gauge} />
      ))}
    </div>
  );
}

// /frontend/src/modules/gauge/components/GaugeCard.tsx (40 lines)
export function GaugeCard({ gauge }: { gauge: Gauge }) {
  const navigate = useNavigate();
  
  return (
    <div className="gauge-card" onClick={() => navigate(`/gauges/${gauge.id}`)}>
      <h3>{gauge.name}</h3>
      <span className={`status ${gauge.status}`}>{gauge.status}</span>
    </div>
  );
}
```

### Step 4: Create Module Services (1 hour)

```typescript
// /frontend/src/modules/gauge/services/gaugeApi.ts (100 lines)
import { apiClient } from '@fireproof/erp-core/data';

export const gaugeApi = {
  async getGauges(filters?: GaugeFilters) {
    return apiClient.get('/api/gauges', { params: filters });
  },
  
  async getGauge(id: string) {
    return apiClient.get(`/api/gauges/${id}`);
  },
  
  async createGauge(data: CreateGaugeDto) {
    return apiClient.post('/api/gauges', data);
  },
  
  async updateGauge(id: string, data: UpdateGaugeDto) {
    return apiClient.put(`/api/gauges/${id}`, data);
  }
};
```

### Step 5: Implement State Management (1 hour)

```typescript
// /frontend/src/modules/gauge/stores/gaugeStore.ts (120 lines)
import { create } from 'zustand';
import { gaugeApi } from '../services/gaugeApi';

interface GaugeStore {
  // State
  gauges: Gauge[];
  selectedGauge: Gauge | null;
  filters: GaugeFilters;
  loading: boolean;
  
  // Actions
  fetchGauges: () => Promise<void>;
  selectGauge: (id: string) => void;
  updateFilters: (filters: Partial<GaugeFilters>) => void;
}

export const useGaugeStore = create<GaugeStore>((set, get) => ({
  gauges: [],
  selectedGauge: null,
  filters: {},
  loading: false,
  
  fetchGauges: async () => {
    set({ loading: true });
    try {
      const gauges = await gaugeApi.getGauges(get().filters);
      set({ gauges, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  
  selectGauge: (id) => {
    const gauge = get().gauges.find(g => g.id === id);
    set({ selectedGauge: gauge });
  },
  
  updateFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().fetchGauges();
  }
}));
```

### Step 6: Set Up Tests (1 hour)

```typescript
// /frontend/tests/modules/gauge/GaugeList.test.tsx
import { render, screen } from '@testing-library/react';
import { GaugeList } from '@/modules/gauge/components/GaugeList';

describe('GaugeList', () => {
  it('renders gauge list when user has permission', () => {
    mockAuth({ hasPermission: () => true });
    render(<GaugeList />);
    expect(screen.getByTestId('gauge-list')).toBeInTheDocument();
  });
  
  it('shows access denied when user lacks permission', () => {
    mockAuth({ hasPermission: () => false });
    render(<GaugeList />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});

// /frontend/tests/e2e/gauge-workflow.spec.ts
test('complete gauge checkout workflow', async ({ page }) => {
  await page.goto('/gauges');
  await page.click('[data-testid="gauge-card-SP001A"]');
  await page.click('[data-testid="checkout-button"]');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

## Quick Migration Checklist

### Day 1 - Structure & Core Integration
- [ ] Create /frontend directory structure
- [ ] Copy and update package.json, vite.config.ts
- [ ] Set up App.tsx as pure orchestrator
- [ ] Create gauge module structure
- [ ] Connect to erp-core services

### Day 2 - Component Migration
- [ ] Split GaugeInventory into smaller components
- [ ] Migrate modals to module/components/modals/
- [ ] Create type definitions in module/types/
- [ ] Ensure all components < 200 lines

### Day 3 - Services & State
- [ ] Create gaugeApi service
- [ ] Implement Zustand stores
- [ ] Remove global AppContext usage
- [ ] Set up module-specific hooks

### Day 4 - Testing & Cleanup
- [ ] Create unit tests in /frontend/tests/modules/gauge/
- [ ] Add integration tests
- [ ] Write e2e tests for critical paths
- [ ] Remove legacy code

## File Organization

```
/frontend/
├── src/
│   ├── modules/
│   │   └── gauge/
│   │       ├── index.ts              # Module descriptor
│   │       ├── routes.tsx            # Route definitions
│   │       ├── components/
│   │       │   ├── GaugeList.tsx
│   │       │   ├── GaugeCard.tsx
│   │       │   ├── GaugeDetail.tsx
│   │       │   └── modals/
│   │       │       ├── CreateGaugeModal.tsx
│   │       │       └── CheckoutModal.tsx
│   │       ├── services/
│   │       │   └── gaugeApi.ts
│   │       ├── stores/
│   │       │   └── gaugeStore.ts
│   │       └── types/
│   │           └── gauge.types.ts
│   ├── App.tsx
│   └── main.tsx
├── tests/                            # All tests go here!
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── modules/
│       └── gauge/                    # Gauge module tests
│           ├── components/
│           ├── services/
│           └── stores/
└── package.json
```

## Key Differences from Previous Plan

1. **No gradual migration** - Direct cutover
2. **No backwards compatibility** - Clean break
3. **Aggressive timeline** - 4 days vs 14 days
4. **Tests in dedicated folder** - `/frontend/tests/`
5. **No Docker updates needed** - Already pointed to `/frontend`

## Success Metrics
- [ ] All files < 200 lines
- [ ] No imports between business modules
- [ ] Tests in `/frontend/tests/`
- [ ] Module can be toggled on/off
- [ ] Clean separation from legacy code