# Frontend Module Structure - Backend Alignment

**Purpose**: Define the frontend modular structure that aligns with the new backend architecture.

**Last Updated**: After backend structure analysis - corrected core/infrastructure naming and module organization.

## Module Structure Overview

### Infrastructure (Cross-cutting concerns - matches backend)
```
frontend/src/infrastructure/
├── auth/                    # Auth utilities, hooks, permission helpers
├── api/                     # Axios setup, interceptors, base client
├── events/                  # Event bus for cross-module communication
└── notifications/           # Toast/alert system, user messages
```

### Business Modules
```
frontend/src/modules/
├── gauge/                   # MEGA MODULE - All gauge-related functionality
│   ├── index.ts            # Module descriptor
│   ├── routes/             # Organized sub-routes (matches backend)
│   │   ├── index.tsx       # Route aggregator
│   │   ├── operations.tsx  # Basic gauge operations
│   │   ├── tracking.tsx    # Tracking sub-routes
│   │   └── reports.tsx     # Reporting routes
│   ├── components/         # Organized by operation type
│   │   ├── operations/     # Basic operations
│   │   │   ├── GaugeList.tsx
│   │   │   ├── GaugeDetail.tsx
│   │   │   └── GaugeRow.tsx
│   │   ├── tracking/       # Tracking operations
│   │   │   ├── GaugeCheckout.tsx
│   │   │   ├── GaugeReturn.tsx
│   │   │   ├── GaugeTransfer.tsx
│   │   │   └── GaugeUnseal.tsx
│   │   ├── calibration/    # Calibration operations
│   │   │   ├── CalibrationSchedule.tsx
│   │   │   └── CalibrationComplete.tsx
│   │   └── reports/        # Reporting components
│   │       ├── GaugeReports.tsx
│   │       └── QCReports.tsx
│   ├── services/           # API integration organized by backend service
│   │   └── gaugeApi.ts     # Organized by operation type
│   ├── stores/             # State management
│   │   └── gaugeStore.ts
│   └── types/              # TypeScript definitions
│       └── gauge.types.ts
│
├── admin/                   # Admin module (matches backend structure)
│   ├── index.ts
│   ├── routes/
│   │   ├── index.tsx
│   │   ├── maintenance.tsx
│   │   ├── statistics.tsx
│   │   ├── system-recovery.tsx
│   │   └── user-management.tsx
│   ├── components/
│   │   ├── maintenance/
│   │   │   └── SystemMaintenance.tsx
│   │   ├── stats/
│   │   │   └── SystemStats.tsx
│   │   ├── recovery/
│   │   │   └── SystemRecovery.tsx
│   │   └── users/
│   │       └── UserManagement.tsx
│   ├── services/
│   │   └── adminApi.ts
│   └── types/
│       └── admin.types.ts
│
└── auth/                    # Auth UI module
    ├── index.ts
    ├── components/
    │   ├── LoginForm.tsx
    │   ├── UserProfile.tsx
    │   └── PasswordReset.tsx
    └── services/
        └── authApi.ts
```

## Module Descriptor Pattern

```typescript
// modules/gauge/index.ts
import { gaugeRoutes } from './routes';

export default {
  id: 'gauge',
  name: 'Gauge Tracking',
  routes: gaugeRoutes, // Imported from routes/index.tsx
  navigation: [
    { label: 'Gauges', path: '/gauges', permission: 'gauge.view' },
    { label: 'Gauge Reports', path: '/gauges/tracking/reports', permission: 'gauge.reports' },
    { label: 'Transfers', path: '/gauges/tracking/transfers', permission: 'gauge.transfer' }
  ]
};

// modules/gauge/routes/index.tsx
export const gaugeRoutes = [
  // Basic operations
  { path: '/gauges', component: GaugeList },
  { path: '/gauges/:id', component: GaugeDetail },
  
  // Tracking sub-routes (matches backend structure)
  { path: '/gauges/tracking/reports', component: GaugeReports },
  { path: '/gauges/tracking/transfers', component: GaugeTransfers },
  { path: '/gauges/tracking/unseals', component: GaugeUnseals },
  { path: '/gauges/tracking/qc', component: GaugeQC },
  
  // Operations (must be last due to :gaugeId param)
  { path: '/gauges/:gaugeId/checkout', component: GaugeCheckout },
  { path: '/gauges/:gaugeId/return', component: GaugeReturn }
];
```

## Backend Alignment Mapping

### Module Mapping
| Backend Module | Frontend Module | Purpose |
|----------------|-----------------|---------|
| `/backend/src/modules/gauge/` | `/frontend/src/modules/gauge/` | Gauge tracking and management |
| `/backend/src/modules/admin/` | `/frontend/src/modules/admin/` | System administration |
| `/backend/src/modules/auth/` | `/frontend/src/modules/auth/` | Authentication UI |

### Service Mapping
| Backend Service | Frontend Service | Endpoints |
|-----------------|------------------|-----------|
| `GaugeTrackingService.js` | `gaugeApi.ts` | `/api/gauges/*` |
| `adminService.js` | `adminApi.ts` | `/api/admin/*` |
| `authService.js` | `authApi.ts` | `/api/auth/*` |

### Repository to UI Mapping
| Backend Repository | Frontend Component | Data Flow |
|-------------------|-------------------|-----------|
| `GaugesRepo.js` | `GaugeList.tsx` | List all gauges |
| `CheckoutsRepo.js` | `GaugeCheckout.tsx` | Checkout operations |
| `TransfersRepo.js` | `GaugeTransfer.tsx` | Transfer operations |

## Component Guidelines

### File Size Guidelines
- **Components**: 30-80 lines (focused UI logic)
- **Services**: 60-120 lines (API integration)
- **Stores**: 80-150 lines (state management)
- **Main Component**: 60-100 lines (orchestration)

### Component Structure Example
```typescript
// components/GaugeList.tsx (60-80 lines)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gaugeApi } from '../services/gaugeApi';
import { Gauge } from '../types/gauge.types';

export const GaugeList: React.FC = () => {
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGauges();
  }, []);

  const loadGauges = async () => {
    try {
      setLoading(true);
      const data = await gaugeApi.getGauges();
      setGauges(data);
      setError(null);
    } catch (err) {
      setError('Failed to load gauges');
      console.error('Error loading gauges:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading gauges...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="gauge-list">
      <h1>Gauge Inventory</h1>
      <div className="gauge-grid">
        {gauges.map(gauge => (
          <div key={gauge.id} className="gauge-item">
            <Link to={`/gauges/${gauge.id}`}>
              <h3>{gauge.gauge_number}</h3>
              <p>{gauge.description}</p>
              <span className={`status ${gauge.status}`}>
                {gauge.status}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## API Service Pattern

```typescript
// services/gaugeApi.ts - Organized by backend service mapping
import { apiClient } from '@/infrastructure/api';
import { Gauge, GaugeCheckout, GaugeTransfer } from '../types/gauge.types';

export const gaugeApi = {
  // Basic operations (maps to GaugeTrackingService.js)
  gauges: {
    list: () => apiClient.get<Gauge[]>('/api/gauges/v2'),
    get: (id: string) => apiClient.get<Gauge>(`/api/gauges/v2/${id}`),
    search: (query: string) => apiClient.get<Gauge[]>('/api/gauges/v2/search', { params: { q: query } })
  },
  
  // Checkout operations (maps to CheckoutsRepo.js + OperationsService.js)
  checkouts: {
    checkout: (gaugeId: string, data: GaugeCheckout) => 
      apiClient.post(`/api/gauges/tracking/${gaugeId}/checkout`, data),
    return: (gaugeId: string) => 
      apiClient.post(`/api/gauges/tracking/${gaugeId}/return`),
    active: () => apiClient.get('/api/gauges/tracking/checkouts/active')
  },
  
  // Transfer operations (maps to TransfersService.js)
  transfers: {
    create: (data: GaugeTransfer) => 
      apiClient.post('/api/gauges/tracking/transfers', data),
    list: () => apiClient.get('/api/gauges/tracking/transfers'),
    approve: (transferId: string) => 
      apiClient.put(`/api/gauges/tracking/transfers/${transferId}/approve`)
  },
  
  // Calibration operations (maps to GaugeCalibrationService.js)
  calibrations: {
    schedule: (gaugeId: string, data: any) => 
      apiClient.post(`/api/gauges/tracking/${gaugeId}/calibrations`, data),
    complete: (calibrationId: string, data: any) => 
      apiClient.put(`/api/gauges/tracking/calibrations/${calibrationId}/complete`, data),
    getDue: () => apiClient.get('/api/gauges/tracking/calibrations/due')
  },
  
  // Unseal operations (maps to UnsealsService.js)
  unseals: {
    request: (gaugeId: string, reason: string) => 
      apiClient.post(`/api/gauges/tracking/${gaugeId}/unseal`, { reason }),
    list: () => apiClient.get('/api/gauges/tracking/unseals'),
    approve: (unsealId: string) => 
      apiClient.put(`/api/gauges/tracking/unseals/${unsealId}/approve`)
  },
  
  // Reports (maps to ReportsService.js)
  reports: {
    tracking: (params: any) => 
      apiClient.get('/api/gauges/tracking/reports', { params }),
    qc: () => apiClient.get('/api/gauges/tracking/qc/reports')
  }
};
```

## State Management Pattern

```typescript
// stores/gaugeStore.ts (80-150 lines)
import { create } from 'zustand';
import { Gauge } from '../types/gauge.types';

interface GaugeStore {
  gauges: Gauge[];
  selectedGauge: Gauge | null;
  loading: boolean;
  error: string | null;

  setGauges: (gauges: Gauge[]) => void;
  selectGauge: (gauge: Gauge | null) => void;
  updateGauge: (id: string, updates: Partial<Gauge>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGaugeStore = create<GaugeStore>((set) => ({
  gauges: [],
  selectedGauge: null,
  loading: false,
  error: null,

  setGauges: (gauges) => set({ gauges }),
  
  selectGauge: (gauge) => set({ selectedGauge: gauge }),
  
  updateGauge: (id, updates) => set((state) => ({
    gauges: state.gauges.map(g => 
      g.id === id ? { ...g, ...updates } : g
    )
  })),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error })
}));
```

## Module Independence Rules

### ✅ Modules CAN:
- Import from infrastructure (`@/infrastructure/auth`, `@/infrastructure/api`)
- Use infrastructure utilities and services
- Communicate via event bus
- Register routes and navigation
- Manage their own state internally

### ❌ Modules CANNOT:
- Import from other business modules
- Access other module's internal state
- Break if other modules are disabled
- Depend on specific module loading order
- Broadcast routine operations unnecessarily

## Integration with App.tsx

```typescript
// App.tsx - Direct module integration
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import gaugeModule from './modules/gauge';
import adminModule from './modules/admin';
import authModule from './modules/auth';

const modules = [gaugeModule, adminModule, authModule];

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app">
        <nav>
          <ul>
            {modules.flatMap(m => m.navigation).map(nav => (
              <li key={nav.path}>
                <Link to={nav.path}>{nav.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <main>
          <Routes>
            {modules.flatMap(m => m.routes).map(route => (
              <Route 
                key={route.path}
                path={route.path} 
                element={<route.component />} 
              />
            ))}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};
```

## Key Architecture Decisions (Based on Backend Analysis)

### Infrastructure vs Core
- **Backend Reality**: `infrastructure/` contains cross-cutting utilities, not modules
- **Frontend Alignment**: Use `infrastructure/` for utilities, `modules/` for business logic
- **NOT** the 4 core modules from Modular-Vision.txt (that was a misunderstanding)

### Gauge as Mega Module
- **Backend Reality**: Gauge module contains 8 repos, 10+ routes, 15+ services
- **Frontend Decision**: Keep gauge as ONE module with internal organization
- **Rejected**: ChatGPT's suggestion to split into feature-checkout, feature-calibration, etc.

### Route Organization
- **Backend Pattern**: Sub-routes under `/tracking` path
- **Frontend Mirror**: Organize routes within module, not as separate modules

## Migration Notes

### From Legacy to Modular
1. **Remove**: ModuleRegistry, complex providers, lazy loading
2. **Keep**: Business logic, UI components, API contracts
3. **Simplify**: Direct imports, standard hooks, inline permissions
4. **Test**: Each module in isolation before integration
5. **Rename**: `core/` to `infrastructure/` for backend alignment

### Critical Success Factors
- Maintain backend API compatibility
- Preserve existing functionality
- Improve developer experience
- Enable true module independence
- Follow file size guidelines (30-200 lines)
- Mirror backend's module boundaries exactly