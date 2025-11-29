# Simple Boring Frontend Migration Plan - V3.33 Aligned

## Overview
Migrate the legacy Fireproof Gauge System frontend to the new modular structure. Following V3.33: "modules/ folders are just organization - no special loading"

## Current State
- Legacy app: `Fireproof Gauge System/frontend/` (port 3000)
- New location: `/frontend/` (root level)
- Backend API: `http://localhost:8000/api`

## New Directory Structure (Matching Backend)
```
/frontend/
├── src/
│   ├── modules/
│   │   └── gauge/                     # Match backend folder name
│   │       ├── index.ts               # Simple module descriptor
│   │       ├── components/
│   │       │   ├── GaugeList.tsx      # List all gauges
│   │       │   ├── GaugeDetail.tsx    # Single gauge details
│   │       │   ├── GaugeCheckout.tsx  # Checkout form
│   │       │   └── GaugeReturn.tsx    # Return form
│   │       ├── services/
│   │       │   └── gaugeApi.ts        # API calls
│   │       └── types/
│   │           └── gauge.types.ts     # TypeScript types
│   ├── App.tsx                        # Import components, add routes
│   ├── index.tsx                      # ReactDOM.render
│   └── enabled-modules.json           # Module enable/disable configuration
├── public/
│   └── index.html
├── tests/                             # Tests go here (NOT __tests__)
│   └── modules/
│       └── gauge/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Step-by-Step Migration

### Step 1: Create New Frontend Structure
```bash
# From project root
mkdir -p frontend/src/modules/gauge/{components,services,types}
mkdir -p frontend/public
mkdir -p frontend/tests/modules/gauge
```

### Step 2: Basic Setup Files

**package.json**
```json
{
  "name": "fireproof-erp-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.0.0",
    "@fireproof/erp-core": "file:../erp-core",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

**vite.config.ts**
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

**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@fireproof/erp-core/*": ["../erp-core/src/core/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**src/enabled-modules.json**
```json
["gauge"]
```

### Step 3: Main Application Files

**src/index.tsx**
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

**src/App.tsx** (Simple module loading)
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@fireproof/erp-core/auth';
import { NotificationProvider } from '@fireproof/erp-core/notifications';
import enabledModules from './enabled-modules.json';

// Simple imports - no dynamic loading
import gaugeModule from './modules/gauge';

const modules = {
  gauge: gaugeModule
};

function AppRoutes() {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    // Login handled by auth module
    return <div>Please login</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<div>Welcome to ERP</div>} />
      {enabledModules.map(moduleId => {
        const module = modules[moduleId];
        if (!module) return null;
        
        return module.routes.map(route => (
          <Route 
            key={route.path} 
            path={route.path} 
            element={<route.component />} 
          />
        ));
      })}
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
```

### Step 4: Gauge Module Implementation

**src/modules/gauge/index.ts** (Simple module descriptor)
```typescript
import { GaugeList } from './components/GaugeList';
import { GaugeDetail } from './components/GaugeDetail';

// Simple module descriptor - not a complex manifest
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

**src/modules/gauge/types/gauge.types.ts**
```typescript
export interface Gauge {
  id: number;
  gauge_id: string;
  custom_id?: string;
  name: string;
  equipment_type: 'thread_gauge' | 'hand_tool' | 'large_equipment' | 'calibration_standard';
  serial_number: string;
  status: 'available' | 'checked_out' | 'calibration_due' | 'pending_qc' | 'out_of_service';
  is_sealed: boolean;
  companion_gauge_id?: number;
}

export interface GaugeCheckout {
  gauge_id: number;
  location: string;
  department?: string;
  notes?: string;
}
```

**src/modules/gauge/services/gaugeApi.ts**
```typescript
import { apiClient } from '@fireproof/erp-core/data';

export const gaugeApi = {
  getGauges: () => apiClient.get('/api/gauges'),
  getGauge: (id: string) => apiClient.get(`/api/gauges/${id}`),
  checkoutGauge: (data: any) => apiClient.post('/api/gauges/checkout', data),
  returnGauge: (gaugeId: number, condition: string) => 
    apiClient.post('/api/gauges/return', { gauge_id: gaugeId, condition })
};
```

**src/modules/gauge/components/GaugeList.tsx**
```typescript
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gaugeApi } from '../services/gaugeApi';
import { showNotification } from '@fireproof/erp-core/notifications';
import type { Gauge } from '../types/gauge.types';

export function GaugeList() {
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGauges();
  }, []);

  const loadGauges = async () => {
    try {
      const data = await gaugeApi.getGauges();
      setGauges(data);
    } catch (error) {
      showNotification('Failed to load gauges', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Gauges</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {gauges.map(gauge => (
            <tr key={gauge.id}>
              <td>{gauge.gauge_id}</td>
              <td>{gauge.name}</td>
              <td>{gauge.status}</td>
              <td>
                <Link to={`/gauges/${gauge.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**src/modules/gauge/components/GaugeDetail.tsx**
```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { gaugeApi } from '../services/gaugeApi';
import { eventBus, EVENTS } from '@fireproof/erp-core/data';
import { useAuth } from '@fireproof/erp-core/auth';
import { showNotification } from '@fireproof/erp-core/notifications';
import type { Gauge } from '../types/gauge.types';

export function GaugeDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentUser, hasPermission } = useAuth();
  const [gauge, setGauge] = useState<Gauge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadGauge(id);
  }, [id]);

  const loadGauge = async (gaugeId: string) => {
    try {
      const data = await gaugeApi.getGauge(gaugeId);
      setGauge(data);
    } catch (error) {
      showNotification('Failed to load gauge', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!gauge || !currentUser) return;
    
    try {
      await gaugeApi.checkoutGauge({
        gauge_id: gauge.id,
        location: 'Shop Floor'
      });
      
      // No event emission for internal operations
      // Events are only for cross-module communication
      
      showNotification('Gauge checked out successfully', 'success');
      loadGauge(id!);
    } catch (error) {
      showNotification('Failed to checkout gauge', 'error');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!gauge) return <div>Gauge not found</div>;

  return (
    <div>
      <h2>{gauge.name}</h2>
      <dl>
        <dt>ID</dt>
        <dd>{gauge.gauge_id}</dd>
        <dt>Serial</dt>
        <dd>{gauge.serial_number}</dd>
        <dt>Status</dt>
        <dd>{gauge.status}</dd>
      </dl>
      
      {gauge.status === 'available' && hasPermission('gauge.operate') && (
        <button onClick={handleCheckout}>Checkout</button>
      )}
    </div>
  );
}
```

## Migration Steps

### Phase 1: Setup
1. Create new frontend directory structure
2. Copy package.json, vite.config.ts, tsconfig.json
3. Run `npm install`
4. Verify erp-core is accessible

### Phase 2: Create App.tsx
1. Create App.tsx with direct component imports
2. Add auth and notification providers
3. Add routes for /gauges and /gauges/:id
4. Test it runs

### Phase 3: Gauge Components
1. Create types/gauge.types.ts
2. Create services/gaugeApi.ts (simple API wrapper)
3. Create components/GaugeList.tsx
4. Create components/GaugeDetail.tsx
5. Add event bus integration where needed

### Phase 4: Connect & Test
1. Verify proxy to backend works
2. Test gauge list loads
3. Test navigation to detail view
4. Test permissions work
5. Test checkout/return flow

### Phase 5: Cleanup
1. Move old frontend to review-for-delete/
2. Update any references in docs
3. Commit working code

## API Integration

All API calls go through the erp-core data module:
```typescript
import { apiClient } from '@fireproof/erp-core/data';

// apiClient is pre-configured with:
// - Base URL: http://localhost:8000/api
// - Auth headers from auth module
// - Error handling
```

## Event Integration

Use the 7 defined events ONLY for cross-module communication:
```typescript
import { eventBus, EVENTS } from '@fireproof/erp-core/data';

// Example: When inventory module needs to know about gauge updates
eventBus.on(EVENTS.ASSET_UPDATED, (data) => {
  // Only if another module needs to react
  // NOT for internal gauge operations
});

// Events are for:
// - Notifying other modules of important changes
// - System-wide notifications
// - NOT for internal module operations (use direct function calls)
```

## What This Accomplishes

1. ✅ Simple folder structure - just modules/ for organization
2. ✅ Direct imports in App.tsx - no dynamic loading
3. ✅ Uses core modules correctly (auth, data, notifications)
4. ✅ Implements the 7 domain events where needed
5. ✅ Pure orchestration in App.tsx (just routes and providers)
6. ✅ All files under 100 lines (most under 50)
7. ✅ No framework, no abstractions, no clever code
8. ✅ Works with existing backend and Docker setup

## Next Module Pattern

When we need inventory management:
1. Create `/modules/inventory/` folder
2. Add components there
3. Import in App.tsx: `import { InventoryList } from './modules/inventory/components/InventoryList'`
4. Add route: `<Route path="/inventory" element={<InventoryList />} />`

That's it. No framework to learn or configure.

## Summary

This is the simplest possible approach that still provides:
- Organization (modules/ folders)
- Type safety (TypeScript)
- Authentication (erp-core/auth)
- API calls (erp-core/data)
- Notifications (erp-core/notifications)
- Events (erp-core/data events)

Just boring React code that works.