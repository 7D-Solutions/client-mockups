# Frontend Migration Plan V3 - CORRECTED

**LIVING DOCUMENT**: This plan can be changed if necessary, but any deviations require stopping, presenting new direction, and receiving approval before proceeding.

**FIXES APPLIED**: 
- ✅ Fixed dependency paths (absolute vs relative)
- ✅ Added missing dependencies (zustand, lucide-react)
- ✅ Resolved circular dependencies (components before module descriptor)
- ✅ Defined core App.tsx functionality
- ✅ Removed orphaned enabled-modules.json
- ✅ Resolved contradiction (direct imports, no module loading)
- ✅ Fixed test criteria to match actual implementation

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

## Phase 1: Assessment & Analysis

### Phase 1A: Document Current State
- [ ] Check if `/frontend/package.json` exists
- [ ] Check if `/frontend/src/App.tsx` exists (currently doesn't)
- [ ] Document that `/frontend/src/modules/gauge/` has empty subdirectories only
- [ ] Document legacy gauge module at `/Fireproof Gauge System/frontend/src/modules/gauge-tracking/`
- [ ] Document that legacy uses complex ModuleRegistry pattern

### Phase 1B: Package Setup
- [ ] Copy these dependencies to `/frontend/package.json` (CORRECTED PATHS):
  ```json
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@fireproof/erp-core": "file:/erp-core",
    "axios": "^1.6.2",
    "zustand": "^5.0.7",
    "lucide-react": "^0.294.0"
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

### Phase 2B: Create Components First (FIXES CIRCULAR DEPENDENCY)
- [ ] Create `/frontend/src/modules/gauge/types/gauge.types.ts`:
  ```typescript
  export interface Gauge {
    id: number;
    gauge_number: string;
    description: string;
    status: 'available' | 'checked_out' | 'maintenance';
    location?: string;
    last_calibration?: string;
  }
  ```

### Phase 2C: API Service
- [ ] Create `/frontend/src/modules/gauge/services/gaugeApi.ts`:
  ```typescript
  import axios from 'axios';
  import { Gauge } from '../types/gauge.types';
  
  const api = axios.create({
    baseURL: '/api',
    withCredentials: true
  });
  
  export const gaugeApi = {
    async getGauges(): Promise<Gauge[]> {
      const response = await api.get('/gauges');
      return response.data;
    },
    
    async getGauge(id: string): Promise<Gauge> {
      const response = await api.get(`/gauges/${id}`);
      return response.data;
    },
    
    async checkoutGauge(gaugeId: string, userId: string): Promise<void> {
      await api.post(`/gauges/${gaugeId}/checkout`, { userId });
    }
  };
  ```

### Phase 2D: List Component
- [ ] Create `/frontend/src/modules/gauge/components/GaugeList.tsx`:
  ```typescript
  import React, { useState, useEffect } from 'react';
  import { Link } from 'react-router-dom';
  import { gaugeApi } from '../services/gaugeApi';
  import { Gauge } from '../types/gauge.types';
  
  export const GaugeList: React.FC = () => {
    const [gauges, setGauges] = useState<Gauge[]>([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const loadGauges = async () => {
        try {
          const data = await gaugeApi.getGauges();
          setGauges(data);
        } catch (error) {
          console.error('Failed to load gauges:', error);
        } finally {
          setLoading(false);
        }
      };
      loadGauges();
    }, []);
  
    if (loading) return <div>Loading...</div>;
  
    return (
      <div>
        <h1>Gauges</h1>
        <div>
          {gauges.map(gauge => (
            <div key={gauge.id}>
              <Link to={`/gauges/${gauge.id}`}>
                {gauge.gauge_number} - {gauge.description}
              </Link>
              <span>Status: {gauge.status}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  ```

### Phase 2E: Detail Component
- [ ] Create `/frontend/src/modules/gauge/components/GaugeDetail.tsx`:
  ```typescript
  import React, { useState, useEffect } from 'react';
  import { useParams } from 'react-router-dom';
  import { gaugeApi } from '../services/gaugeApi';
  import { Gauge } from '../types/gauge.types';
  
  export const GaugeDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [gauge, setGauge] = useState<Gauge | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const loadGauge = async () => {
        if (!id) return;
        try {
          const data = await gaugeApi.getGauge(id);
          setGauge(data);
        } catch (error) {
          console.error('Failed to load gauge:', error);
        } finally {
          setLoading(false);
        }
      };
      loadGauge();
    }, [id]);
  
    if (loading) return <div>Loading...</div>;
    if (!gauge) return <div>Gauge not found</div>;
  
    return (
      <div>
        <h1>{gauge.gauge_number}</h1>
        <p>Description: {gauge.description}</p>
        <p>Status: {gauge.status}</p>
        {gauge.location && <p>Location: {gauge.location}</p>}
        {gauge.last_calibration && <p>Last Calibration: {gauge.last_calibration}</p>}
      </div>
    );
  };
  ```

### Phase 2F: Module Descriptor (AFTER COMPONENTS EXIST)
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
      { label: 'Gauges', path: '/gauges' }
    ]
  };
  ```

---

## Phase 3: Main App Component (DEFINES CORE FUNCTIONALITY)

### Phase 3A: App Component with Direct Integration
- [ ] Create `/frontend/src/App.tsx`:
  ```typescript
  import React from 'react';
  import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
  import gaugeModule from './modules/gauge';
  
  export const App: React.FC = () => {
    return (
      <Router>
        <div className="app">
          <nav>
            <ul>
              {gaugeModule.navigation.map(nav => (
                <li key={nav.path}>
                  <Link to={nav.path}>{nav.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <main>
            <Routes>
              {gaugeModule.routes.map(route => (
                <Route 
                  key={route.path}
                  path={route.path} 
                  element={<route.component />} 
                />
              ))}
              <Route path="/" element={<div>Welcome to Fireproof ERP</div>} />
            </Routes>
          </main>
        </div>
      </Router>
    );
  };
  ```

---

## Phase 4: Integration & Testing

### Phase 4A: API Connection Testing
- [ ] Start backend server on port 8000
- [ ] Start frontend dev server on port 3000
- [ ] Verify proxy forwards `/api` calls to backend
- [ ] Test gauge list loads data from `/api/gauges`
- [ ] Test gauge detail loads specific gauge from `/api/gauges/:id`

### Phase 4B: Navigation Testing
- [ ] Test navigation menu appears
- [ ] Test clicking "Gauges" navigates to `/gauges`
- [ ] Test gauge list displays
- [ ] Test clicking gauge navigates to detail page
- [ ] Test all routes work correctly

### Phase 4C: Error Handling Testing
- [ ] Test with backend stopped (should show error, not crash)
- [ ] Test invalid gauge ID (should show "not found")
- [ ] Test all API error cases display appropriately

---

## Phase 5: Final Setup

### Phase 5A: Test Directory Setup
- [ ] Create `/frontend/tests/modules/gauge/` directory
- [ ] Create placeholder test files for future implementation
- [ ] Ensure NO `__tests__` folders exist anywhere

### Phase 5B: Docker Integration
- [ ] Verify `/frontend/Dockerfile` exists and is correct
- [ ] Test frontend builds with Docker
- [ ] Update docker-compose.yml if needed

### Phase 5C: Documentation & Cleanup
- [ ] Document any deviations from plan
- [ ] Document any discovered issues
- [ ] Move old frontend to `/review-for-delete/legacy-frontend/`

---

## Success Criteria

All checkboxes must be completed for migration success:
- [ ] Frontend starts without errors
- [ ] Can navigate to gauge list at `/gauges`
- [ ] Gauge list displays data from backend
- [ ] Can click gauge to view detail at `/gauges/:id`
- [ ] Gauge detail displays specific gauge data
- [ ] API calls work through proxy to backend
- [ ] No console errors in browser
- [ ] Build completes successfully

---

## Architecture Notes

**DIRECT INTEGRATION APPROACH**:
- No module loading system - direct imports only
- No enabled-modules.json - modules imported directly in App.tsx
- No complex abstractions - simple React components
- No erp-core providers initially - direct API calls
- Routes defined in module descriptor, used directly in App.tsx

**SIMPLICITY ENFORCED**:
- ✅ Module descriptor: Simple object with id, name, routes, navigation
- ✅ Components: Standard React functional components
- ✅ API: Direct axios calls, no complex service layer
- ✅ Routing: Standard react-router-dom
- ✅ State: useState/useEffect only

**COMPLIANCE WITH MODULAR-VISION.TXT**:
- Simple module descriptor pattern
- Direct component imports
- No complex module registry
- File size guidelines followed
- Clean separation of concerns

---

## Notes

- **Dependencies**: All required dependencies included with correct paths
- **No Circular Dependencies**: Components created before module descriptor
- **Working Implementation**: Complete App.tsx with actual functionality
- **No Contradictions**: Direct imports, no complex loading
- **Realistic Tests**: Test actual implemented functionality only