# State Management

**Version**: 1.0.0
**Last Updated**: 2025-11-07

## Overview

The Fire-Proof ERP Platform uses **Zustand** for state management with a modular, namespaced architecture. Each module maintains its own state slice within a centralized store.

## Architecture

### Centralized Store

**Location**: `/frontend/src/infrastructure/store/index.ts`

The application uses a single Zustand store with namespaced module states:
```typescript
interface AppState {
  // Shared state (global)
  shared: SharedState;

  // Module states (namespaced)
  gauge: GaugeModuleState;
  admin: AdminModuleState;
  user: UserModuleState;
  navigation: NavigationModuleState;

  // Actions for each namespace
  // ...
}
```

### Store Organization

```
/frontend/src/infrastructure/store/
├── index.ts           # Main store definition
└── moduleSync.ts      # Module synchronization utilities
```

## State Structure

### 1. Shared State (Global)

Used for application-wide concerns:
```typescript
interface SharedState {
  theme: 'light' | 'dark';
  notifications: Notification[];
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}
```

**Usage**:
```typescript
import { useSharedState, useSharedActions } from '../../infrastructure/store';

function MyComponent() {
  const { theme, notifications } = useSharedState();
  const { setTheme, addNotification } = useSharedActions();

  return (
    <div>
      <Button onClick={() => setTheme('dark')}>
        Switch to Dark Mode
      </Button>
    </div>
  );
}
```

### 2. Module States (Namespaced)

Each module has its own namespaced state:

#### Gauge Module State
```typescript
interface GaugeModuleState {
  selectedGaugeId: string | null;
  filters: {
    status?: string;
    category?: string;
    location?: string;
    search?: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  cache: {
    gauges: Record<string, Gauge>;
    lastFetch: number;
  };
  createGauge: {
    currentStep: number;
    isSubmitting: boolean;
    equipmentType: string;
    categoryId: string;
    categoryName: string;
    formData: Partial<GaugeCreationData>;
    categoriesCache: Record<string, GaugeCategory[]>;
  };
}
```

**Usage**:
```typescript
import { useGaugeState, useGaugeActions } from '../../infrastructure/store';

function GaugeList() {
  const { selectedGaugeId, filters, viewMode } = useGaugeState();
  const { setSelectedGauge, updateGaugeFilters } = useGaugeActions();

  return (
    <div>
      <Button onClick={() => setSelectedGauge('123')}>
        Select Gauge
      </Button>
    </div>
  );
}
```

#### Admin Module State
```typescript
interface AdminModuleState {
  selectedUserId: string | null;
  userFilters: {
    role?: string;
    status?: string;
    search?: string;
  };
  systemSettings: Record<string, SystemSettings>;
  auditLog: {
    page: number;
    filters: Partial<{
      userId: string;
      action: string;
      resource: string;
      startDate: string;
      endDate: string;
    }>;
  };
}
```

**Usage**:
```typescript
import { useAdminState, useAdminActions } from '../../infrastructure/store';

function UserManagement() {
  const { selectedUserId, userFilters } = useAdminState();
  const { setSelectedUser, updateUserFilters } = useAdminActions();

  return (
    <div>
      <FormInput
        value={userFilters.search || ''}
        onChange={(e) => updateUserFilters({ search: e.target.value })}
      />
    </div>
  );
}
```

#### User Module State
```typescript
interface UserModuleState {
  profile: UserProfile | null;
  preferences: UserPreferences;
  isProfileLoading: boolean;
}
```

**Usage**:
```typescript
import { useUserState, useUserActions } from '../../infrastructure/store';

function ProfilePage() {
  const { profile, preferences } = useUserState();
  const { setProfile, updatePreferences } = useUserActions();

  return (
    <div>
      <FormCheckbox
        label="Email Notifications"
        checked={preferences.emailNotifications}
        onChange={(e) => updatePreferences({ emailNotifications: e.target.checked })}
      />
    </div>
  );
}
```

## Zustand Patterns

### 1. Selector Pattern (Performance)

**Use specific selectors to prevent unnecessary re-renders**:

```typescript
// ❌ Wrong: Re-renders on any gauge state change
const gaugeState = useGaugeState();

// ✅ Correct: Only re-renders when selectedGaugeId changes
const selectedGaugeId = useAppStore((state) => state.gauge.selectedGaugeId);

// ✅ Best: Use provided selectors
import { useGaugeState, useGaugeActions } from '../../infrastructure/store';
const { selectedGaugeId } = useGaugeState();
```

### 2. Action Pattern

**Separate actions from state**:

```typescript
// ✅ Correct: Separate state and actions
const { selectedGaugeId, filters } = useGaugeState();
const { setSelectedGauge, updateGaugeFilters } = useGaugeActions();

// Component logic
const handleFilterChange = (newFilters) => {
  updateGaugeFilters(newFilters);
};
```

### 3. Immutable Updates

**Zustand requires immutable state updates**:

```typescript
// Inside store definition
updateGaugeFilters: (filters) => {
  set((state) => ({
    ...state,
    gauge: {
      ...state.gauge,
      filters: { ...state.gauge.filters, ...filters }
    }
  }));
}
```

### 4. Derived State

**Compute derived state in selectors or components**:

```typescript
// ✅ Correct: Compute in component
const { filters } = useGaugeState();
const hasActiveFilters = Object.keys(filters).length > 0;

// ✅ Correct: Custom selector
const hasActiveFilters = useAppStore((state) =>
  Object.keys(state.gauge.filters).length > 0
);
```

### 5. Cache Management

**Use cache patterns for API data**:

```typescript
interface GaugeModuleState {
  cache: {
    gauges: Record<string, Gauge>;
    lastFetch: number;
  };
}

// In component
const { cache } = useGaugeState();
const { updateGaugeCache } = useGaugeActions();

// Check cache freshness
const isCacheFresh = Date.now() - cache.lastFetch < 60000; // 1 minute

if (!isCacheFresh) {
  // Fetch new data
  const gauges = await gaugeService.getGauges();
  updateGaugeCache(gauges);
}
```

## Store Actions

### Shared Actions

```typescript
// Theme management
setTheme: (theme: 'light' | 'dark') => void;

// Notification management
addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
markNotificationRead: (id: string) => void;
markAllNotificationsRead: () => void;
clearNotifications: () => void;
removeNotification: (id: string) => void;

// Loading/error management
setLoading: (key: string, loading: boolean) => void;
setError: (key: string, error: string | null) => void;
```

**Example**:
```typescript
const { addNotification, setLoading, setError } = useSharedActions();

async function handleSave() {
  try {
    setLoading('save-gauge', true);
    setError('save-gauge', null);

    await gaugeService.saveGauge(data);

    addNotification({
      type: 'success',
      title: 'Gauge saved',
      message: 'Your gauge has been saved successfully'
    });
  } catch (error) {
    setError('save-gauge', error.message);
    addNotification({
      type: 'error',
      title: 'Save failed',
      message: error.message
    });
  } finally {
    setLoading('save-gauge', false);
  }
}
```

### Gauge Actions

```typescript
// Selection
setSelectedGauge: (id: string | null) => void;

// Filtering and sorting
updateGaugeFilters: (filters: Partial<GaugeModuleState['filters']>) => void;
setGaugeSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
setGaugeViewMode: (mode: 'grid' | 'list') => void;

// Cache management
updateGaugeCache: (gauges: Record<string, Gauge>) => void;

// Gauge creation workflow
setCreateGaugeStep: (step: number) => void;
setEquipmentType: (type: string) => void;
setGaugeCategory: (id: string, name: string) => void;
updateGaugeFormData: (data: Partial<GaugeCreationData>) => void;
resetGaugeForm: () => void;
setGaugeSubmitting: (isSubmitting: boolean) => void;
```

### Admin Actions

```typescript
// User management
setSelectedUser: (id: string | null) => void;
updateUserFilters: (filters: Partial<AdminModuleState['userFilters']>) => void;

// System settings
updateSystemSettings: (settings: Record<string, SystemSettings>) => void;

// Audit log
updateAuditLogPage: (page: number) => void;
```

### User Actions

```typescript
setProfile: (profile: UserProfile | null) => void;
updatePreferences: (preferences: Partial<UserPreferences>) => void;
setProfileLoading: (loading: boolean) => void;
```

## Notification System

### Notification Types

```typescript
interface Notification {
  id: string;                    // Auto-generated
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: number;             // Auto-generated
  read: boolean;                 // Auto-set to false
  duration?: number;             // Optional custom duration
}
```

### Adding Notifications

```typescript
const { addNotification } = useSharedActions();

// Simple notification
addNotification({
  type: 'success',
  title: 'Operation successful'
});

// Detailed notification
addNotification({
  type: 'error',
  title: 'Failed to save',
  message: 'The server returned an error. Please try again.',
  duration: 5000  // 5 seconds
});

// Info notification
addNotification({
  type: 'info',
  title: 'Processing',
  message: 'Your request is being processed...'
});
```

### Duplicate Prevention

The notification system automatically prevents duplicates:
```typescript
// Duplicate notifications (same title + message within 30 seconds) are prevented
addNotification({ type: 'success', title: 'Saved' });
addNotification({ type: 'success', title: 'Saved' }); // Ignored
```

## Best Practices

### 1. Use Selectors for Performance

```typescript
// ❌ Wrong: Subscribes to entire module state
const gaugeState = useGaugeState();

// ✅ Correct: Only subscribes to needed fields
const { selectedGaugeId } = useGaugeState();
```

### 2. Separate State and Actions

```typescript
// ✅ Correct pattern
const { filters, sortBy } = useGaugeState();
const { updateGaugeFilters, setGaugeSort } = useGaugeActions();
```

### 3. Keep State Normalized

```typescript
// ✅ Correct: Normalized cache
cache: {
  gauges: {
    '123': { id: '123', name: 'Gauge A' },
    '456': { id: '456', name: 'Gauge B' }
  }
}

// ❌ Wrong: Array storage (harder to update)
cache: {
  gauges: [
    { id: '123', name: 'Gauge A' },
    { id: '456', name: 'Gauge B' }
  ]
}
```

### 4. Use Loading States

```typescript
const { setLoading } = useSharedActions();

async function fetchData() {
  setLoading('fetch-gauges', true);
  try {
    const data = await gaugeService.getGauges();
    // Update state
  } finally {
    setLoading('fetch-gauges', false);
  }
}
```

### 5. Clear State on Logout

```typescript
// In logout handler
const { resetGaugeForm } = useGaugeActions();
const { setProfile } = useUserActions();

function handleLogout() {
  resetGaugeForm();
  setProfile(null);
  // Clear other state as needed
}
```

## Common Patterns

### Multi-Step Form Workflow

```typescript
const { createGauge } = useGaugeState();
const {
  setCreateGaugeStep,
  setEquipmentType,
  setGaugeCategory,
  updateGaugeFormData,
  resetGaugeForm
} = useGaugeActions();

// Step 1: Select equipment type
<Button onClick={() => {
  setEquipmentType('pressure');
  setCreateGaugeStep(1);
}}>
  Pressure Gauge
</Button>

// Step 2: Select category
<Button onClick={() => {
  setGaugeCategory('cat-123', 'Digital Pressure');
  setCreateGaugeStep(2);
}}>
  Continue
</Button>

// Step 3: Fill form
<FormInput
  value={createGauge.formData.serialNumber || ''}
  onChange={(e) => updateGaugeFormData({ serialNumber: e.target.value })}
/>

// On cancel or completion
<Button onClick={resetGaugeForm}>
  Cancel
</Button>
```

### Filter Management

```typescript
const { filters } = useGaugeState();
const { updateGaugeFilters } = useGaugeActions();

<FormInput
  placeholder="Search..."
  value={filters.search || ''}
  onChange={(e) => updateGaugeFilters({ search: e.target.value })}
/>

<FormSelect
  value={filters.status || ''}
  onChange={(e) => updateGaugeFilters({ status: e.target.value })}
  options={statusOptions}
/>
```

## TypeScript Integration

### Type Safety

```typescript
// Import types from store
import type { AppState } from '../../infrastructure/store';

// Custom selector with type safety
const customSelector = (state: AppState) => ({
  gaugeCount: Object.keys(state.gauge.cache.gauges).length,
  hasFilters: Object.keys(state.gauge.filters).length > 0
});

const data = useAppStore(customSelector);
```

## Real-World Examples

See actual implementations in:
- `/frontend/src/modules/gauge/pages/GaugeList.tsx`
- `/frontend/src/modules/admin/pages/UserManagement.tsx`
- `/frontend/src/modules/gauge/pages/CreateGaugePage.tsx`

## Migration from Other State Management

### From Redux
```typescript
// Redux
const dispatch = useDispatch();
dispatch({ type: 'SET_FILTER', payload: filters });

// Zustand
const { updateGaugeFilters } = useGaugeActions();
updateGaugeFilters(filters);
```

### From Context API
```typescript
// Context API
const { state, setState } = useContext(GaugeContext);

// Zustand
const { filters } = useGaugeState();
const { updateGaugeFilters } = useGaugeActions();
```

## Related Documentation
- [UI Components System](./01-UI-Components-System.md)
- [ERP Core Integration](./04-ERP-Core-Integration.md)
- [Component Usage Examples](./05-Component-Usage-Examples.md)
