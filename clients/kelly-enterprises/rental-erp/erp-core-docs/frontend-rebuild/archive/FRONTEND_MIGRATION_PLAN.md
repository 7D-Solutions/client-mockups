# Simple Boring Frontend Plan - V3.33 Aligned

## What We're Building
A boring React app that imports modules and shows them. That's it.

## Directory Structure (Exactly from V3.33)
```
/frontend/
├── src/
│   ├── modules/
│   │   └── gauge/                 # Just "gauge" not "gauge-tracking"
│   │       ├── components/
│   │       │   ├── GaugeList.tsx
│   │       │   └── GaugeDetail.tsx
│   │       ├── services/
│   │       │   └── gaugeApi.ts
│   │       └── types/
│   │           └── gauge.types.ts
│   ├── App.tsx                    # Main app
│   └── index.tsx                  # Entry point
├── tests/                         # Tests go here (not __tests__)
│   └── modules/
│       └── gauge/
└── package.json
```

## App.tsx - The Whole Thing
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@fireproof/erp-core/auth';
import GaugeList from './modules/gauge/components/GaugeList';
import GaugeDetail from './modules/gauge/components/GaugeDetail';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/gauges" element={<GaugeList />} />
          <Route path="/gauges/:id" element={<GaugeDetail />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

## A Component - modules/gauge/components/GaugeList.tsx
```typescript
import { useEffect, useState } from 'react';
import { gaugeApi } from '../services/gaugeApi';

export function GaugeList() {
  // Just normal React component
  const [gauges, setGauges] = useState([]);
  
  useEffect(() => {
    gaugeApi.getGauges().then(setGauges);
  }, []);
  
  return (
    <div>
      <h1>Gauges</h1>
      {gauges.map(gauge => (
        <div key={gauge.id}>{gauge.name}</div>
      ))}
    </div>
  );
}
```

## Using Core Services
```typescript
// In any component
import { useAuth } from '@fireproof/erp-core/auth';
import { apiClient } from '@fireproof/erp-core/data';
import { showNotification } from '@fireproof/erp-core/notifications';

function GaugeList() {
  const { hasPermission } = useAuth();
  
  if (!hasPermission('gauge.view')) {
    return <div>No access</div>;
  }
  
  // etc
}
```

## API Service - modules/gauge/services/gaugeApi.ts
```typescript
import { apiClient } from '@fireproof/erp-core/data';

export const gaugeApi = {
  getGauges: () => apiClient.get('/api/gauges'),
  getGauge: (id: string) => apiClient.get(`/api/gauges/${id}`),
  createGauge: (data: any) => apiClient.post('/api/gauges', data),
  updateGauge: (id: string, data: any) => apiClient.put(`/api/gauges/${id}`, data)
};
```

## Backend Connection
The frontend connects to backend via the apiClient from erp-core:
- Backend runs on port 8000 (from docker-compose)
- Frontend dev server proxies API calls to backend
- In production, nginx handles routing

### Vite Config for Dev
```typescript
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
}
```

## Using Events (from erp-core)
```typescript
import { eventBus, EVENTS } from '@fireproof/erp-core/data';

// When gauge is checked out
eventBus.emit(EVENTS.ASSET_CHECKOUT, { 
  assetId: gauge.id, 
  userId: user.id 
});
```

## State Management
If a component needs state, just use React state or context. No need for stores unless complexity demands it.

## That's It

No framework. No abstractions. No clever architecture.

Just:
1. Import components directly in App.tsx
2. Add routes
3. Components handle their own stuff
4. Use erp-core services directly

## What V3.33 Says
- "modules/ folders are just organization - no special loading"
- "No manifest files - the code IS the documentation"
- "No dependency injection - use normal imports"
- "No module discovery - just require/import what you need"

This plan follows that exactly.

## What We're NOT Doing
- ❌ No module index files
- ❌ No dynamic imports
- ❌ No shared infrastructure
- ❌ No manifest files
- ❌ No runtime loading
- ❌ No framework

Just boring, working code in organized folders.

## Docker Integration
The frontend and backend are already connected in docker-compose.yml:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Database: localhost:3307 (external MySQL)

No changes needed to Docker setup - it already works!