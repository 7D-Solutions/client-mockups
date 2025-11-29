# Frontend Migration Plan - Development Mode

## Context
- **No working app to preserve** - Full freedom to restructure
- **Tests location**: `/frontend/tests/` (not `__tests__` folders)
- **Development branch** - Clean slate approach

## Target Architecture

```
/frontend/
├── src/
│   ├── modules/
│   │   └── gauge/                    # Gauge tracking module
│   │       ├── index.ts             # Module registration
│   │       ├── routes.tsx           # Route definitions
│   │       ├── components/          # UI components (30-80 lines each)
│   │       ├── services/            # Business logic (60-120 lines each)
│   │       ├── stores/              # State management (80-150 lines each)
│   │       └── types/               # TypeScript definitions
│   ├── App.tsx                      # Pure orchestration only
│   └── main.tsx                     # Entry point
├── tests/                           # ALL tests go here
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── modules/
│       └── gauge/
└── package.json
```

## Migration Strategy

### Create New Structure
```bash
# Set up directories
mkdir -p /frontend/src/modules/gauge/{components,services,stores,types}
mkdir -p /frontend/tests/{unit,integration,e2e}
mkdir -p /frontend/tests/modules/gauge
```

### Module Registration Pattern
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
  dependencies: [] // MUST be empty - no cross-module deps
};
```

### Pure Orchestration App
```typescript
// /frontend/src/App.tsx (< 50 lines)
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

## Component Migration Rules

### Split Large Files
**FROM**: Monolithic components (500+ lines)  
**TO**: Focused components (30-80 lines each)

Example breakdown:
```
GaugeInventory.tsx (500+ lines) splits into:
├── GaugeList.tsx (60 lines) - List rendering
├── GaugeCard.tsx (40 lines) - Card UI
├── GaugeFilters.tsx (50 lines) - Filter controls
├── GaugeActions.tsx (40 lines) - Action buttons
└── gaugeStore.ts (120 lines) - State management
```

### Component Example
```typescript
// /frontend/src/modules/gauge/components/GaugeCard.tsx
interface GaugeCardProps {
  gauge: Gauge;
  onSelect: (id: string) => void;
}

export function GaugeCard({ gauge, onSelect }: GaugeCardProps) {
  const statusClass = `status-${gauge.status}`;
  
  return (
    <div 
      className="gauge-card" 
      onClick={() => onSelect(gauge.id)}
      data-testid={`gauge-card-${gauge.id}`}
    >
      <h3>{gauge.name}</h3>
      <span className={statusClass}>{gauge.status}</span>
      <p>{gauge.location}</p>
    </div>
  );
}
```

## State Management

### Module Store Pattern
```typescript
// /frontend/src/modules/gauge/stores/gaugeStore.ts
import { create } from 'zustand';
import { gaugeApi } from '../services/gaugeApi';

interface GaugeStore {
  // State
  gauges: Gauge[];
  filters: GaugeFilters;
  loading: boolean;
  
  // Actions
  fetchGauges: () => Promise<void>;
  updateFilters: (filters: Partial<GaugeFilters>) => void;
  checkoutGauge: (id: string) => Promise<void>;
}

export const useGaugeStore = create<GaugeStore>((set, get) => ({
  // Implementation here
}));
```

## Service Layer

### API Service Pattern
```typescript
// /frontend/src/modules/gauge/services/gaugeApi.ts
import { apiClient } from '@fireproof/erp-core/data';

export const gaugeApi = {
  getGauges: (filters?: GaugeFilters) => 
    apiClient.get('/api/gauges', { params: filters }),
    
  getGauge: (id: string) => 
    apiClient.get(`/api/gauges/${id}`),
    
  createGauge: (data: CreateGaugeDto) => 
    apiClient.post('/api/gauges', data),
    
  checkoutGauge: (id: string, userId: string) => 
    apiClient.post(`/api/gauges/${id}/checkout`, { userId })
};
```

## Testing Structure

### Unit Tests
```typescript
// /frontend/tests/modules/gauge/components/GaugeCard.test.tsx
import { render, screen } from '@testing-library/react';
import { GaugeCard } from '@/modules/gauge/components/GaugeCard';

describe('GaugeCard', () => {
  const mockGauge = {
    id: 'SP001A',
    name: 'Thread Plug Gauge',
    status: 'available'
  };
  
  it('renders gauge information', () => {
    render(<GaugeCard gauge={mockGauge} onSelect={vi.fn()} />);
    expect(screen.getByText('Thread Plug Gauge')).toBeInTheDocument();
  });
});
```

### E2E Tests
```typescript
// /frontend/tests/e2e/gauge-checkout.spec.ts
import { test, expect } from '@playwright/test';

test('gauge checkout workflow', async ({ page }) => {
  await page.goto('/gauges');
  await page.click('[data-testid="gauge-card-SP001A"]');
  await page.click('[data-testid="checkout-button"]');
  await expect(page.locator('.success-toast')).toBeVisible();
});
```

## Import Rules

### ✅ Allowed Imports
```typescript
import { useAuth } from '@fireproof/erp-core/auth';
import { GaugeCard } from '../components/GaugeCard';
import type { Gauge } from '../types/gauge.types';
```

### ❌ Forbidden Imports
```typescript
import { Something } from '../../other-module/components';
import { globalStore } from '../../../store';
import { helper } from 'some-business-module';
```

## Migration Checklist

### Setup
- [ ] Create /frontend directory structure
- [ ] Set up package.json with dependencies
- [ ] Configure Vite and TypeScript
- [ ] Create test directories

### Core Integration
- [ ] Create erp-core service wrappers
- [ ] Set up authentication flow
- [ ] Implement navigation system
- [ ] Configure API client

### Module Migration
- [ ] Create gauge module structure
- [ ] Split large components into smaller ones
- [ ] Implement Zustand stores
- [ ] Create API service layer
- [ ] Add TypeScript types

### Testing
- [ ] Unit tests in /frontend/tests/modules/gauge/
- [ ] Integration tests for API calls
- [ ] E2E tests for critical workflows
- [ ] Verify module isolation

### Cleanup
- [ ] Remove legacy code references
- [ ] Verify no cross-module imports
- [ ] Check all files meet size guidelines
- [ ] Document any deviations

## Success Criteria
1. All gauge operations work correctly
2. No imports between business modules
3. All files within 30-200 line guideline
4. Tests located in /frontend/tests/
5. Module can be toggled without breaking system
6. Clean separation from legacy code