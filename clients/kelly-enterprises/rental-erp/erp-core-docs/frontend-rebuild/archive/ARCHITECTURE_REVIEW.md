# Frontend Migration Plan - Architecture Review

## Critical Issues Identified

### 1. **Module Loading Paradox**
The plan violates its own "pure orchestration" principle:
```typescript
// App.tsx directly imports business module - NOT pure orchestration!
import { gaugeModule } from './modules/gauge';
```

**Resolution**: App.tsx should read enabled modules from configuration and conditionally load them:
```typescript
// App.tsx - True pure orchestration
const enabledModules = await loadEnabledModules(); // From API or config
const modules = await Promise.all(
  enabledModules.map(id => import(`./modules/${id}`))
);
```

### 2. **Missing Shared Infrastructure**
The plan references components that don't exist:
- `LoginScreen` - Where does this live?
- `AppLayout` - Not defined anywhere
- `Navigation` - Assumed to exist but not specified

**Resolution**: Need a `shared/` directory for common UI components:
```
frontend/src/
├── shared/
│   ├── components/
│   │   ├── AppLayout.tsx
│   │   ├── Navigation.tsx
│   │   └── LoginScreen.tsx
│   └── styles/
│       └── design-system.css
```

### 3. **Module Communication Gap**
Plan mentions "use event bus from erp-core/data" but provides no implementation details.

**Resolution**: Define clear event patterns:
```typescript
// Module A publishes
eventBus.publish('gauge.checked_out', { gaugeId, userId });

// Module B subscribes (if enabled)
eventBus.subscribe('gauge.checked_out', (data) => {
  // React to gauge checkout
});
```

### 4. **Path Inconsistencies**
Bash commands use `/frontend/` instead of full paths:
```bash
# Wrong
mkdir -p /frontend/src/modules/gauge/

# Correct
mkdir -p /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge/
```

### 5. **Module Toggling Mechanism**
Plan states "Module can be toggled" but doesn't explain HOW.

**Resolution**: 
```typescript
// frontend/src/config/modules.ts
export async function loadEnabledModules() {
  const response = await apiClient.get('/api/core/enabled-modules');
  return response.data; // ['gauge-tracking', 'inventory']
}
```

### 6. **Missing Error Boundaries**
No module isolation strategy for runtime errors.

**Resolution**:
```typescript
// Each module wrapped in error boundary
<ErrorBoundary fallback={<ModuleError module="gauge" />}>
  <GaugeModule />
</ErrorBoundary>
```

### 7. **Modal System Architecture**
Multiple modals exist but no cross-module modal strategy.

**Resolution**: Central modal service:
```typescript
// shared/services/modalService.ts
export const modalService = {
  open: (modalId: string, props?: any) => {
    eventBus.publish('modal.open', { modalId, props });
  }
};
```

### 8. **Build Configuration Missing**
No TypeScript paths, Vite config, or ESLint rules to enforce architecture.

**Resolution**: Add configuration files:
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./src/shared/*"],
      "@fireproof/erp-core/*": ["../erp-core/src/core/*"]
    }
  }
}
```

### 9. **Permission Pattern Unclear**
Shows `hasPermission` usage but not implementation.

**Resolution**:
```typescript
// Every protected component
function GaugeList() {
  const { hasPermission } = useAuth();
  
  if (!hasPermission('gauge.view')) {
    return <AccessDenied />;
  }
  // ... rest of component
}
```

### 10. **Design System Integration**
No mention of existing styles from legacy system.

**Resolution**: 
- Copy design tokens from legacy `styles/` directory
- Create shared design system in `frontend/src/shared/styles/`
- Ensure visual consistency during migration

## Architectural Recommendations

### 1. **True Module Independence**
```typescript
// modules/gauge/index.ts
export default {
  id: 'gauge-tracking',
  name: 'Gauge Tracking',
  // Lazy load component only when module is enabled
  component: () => import('./GaugeModule'),
  routes: [
    { 
      path: '/gauges', 
      component: () => import('./components/GaugeList')
    }
  ]
};
```

### 2. **Module Registry Pattern**
```typescript
// App.tsx
const moduleRegistry = new Map();

// Dynamic module loading based on enabled list
for (const moduleId of enabledModules) {
  const module = await import(`./modules/${moduleId}`);
  moduleRegistry.set(moduleId, module.default);
}
```

### 3. **Strict Architectural Rules**
- Each module must export a default configuration object
- No direct imports between modules (enforce with ESLint)
- All cross-module communication via event bus
- Shared UI only from `@shared/*` imports

### 4. **Testing Strategy Enhancement**
```
frontend/tests/
├── architecture/        # New! Test module isolation
│   └── no-cross-imports.test.ts
├── modules/
│   └── gauge/
└── shared/             # Test shared components
```

## Missing Documentation

The plan should include:
1. How to add a new module (step-by-step guide)
2. Event bus communication patterns
3. Shared component usage guidelines
4. Build and deployment configuration
5. Performance optimization strategies

## Conclusion

The current plan provides a good foundation but needs significant enhancements to be truly implementable. The core issue is balancing the "simple folder structure" vision with the requirement for module toggling and independence. The solution is to keep the folder structure simple while using dynamic imports and configuration-based module loading.