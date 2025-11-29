# ERP Core Integration

**Version**: 1.0.0
**Last Updated**: 2025-11-07

## Overview

The ERP Core (`/erp-core/src/core/`) provides **frontend-focused shared services** that frontend modules must import and use. This ensures consistency in authentication, API communication, navigation, and notifications across the platform.

## Critical Distinction

**Frontend vs Backend Services**:
- **ERP Core** (`/erp-core/src/core/`): Frontend-focused shared utilities
- **Backend Infrastructure** (`/backend/src/infrastructure/`): Server-side services

**Never duplicate functionality between frontend and backend layers.**

## ERP Core Structure

```
/erp-core/src/core/
├── auth/                  # Client-side authentication
│   ├── authService.ts    # Auth utilities
│   ├── constants.ts      # Auth constants
│   ├── types.ts          # Auth types
│   └── useAuth.ts        # Auth hook
├── data/                  # API client and data management
│   ├── apiClient.ts      # HTTP client (legacy - use infrastructure/api/client.ts)
│   ├── CacheManager.ts   # Client-side cache
│   └── EventBus.ts       # Frontend event bus
├── navigation/            # Frontend navigation
│   └── ...
└── notifications/         # Frontend notifications
    └── ...
```

## 1. Authentication Service

**Location**: `/erp-core/src/core/auth/authService.ts`

### Purpose
Client-side authentication utilities using **httpOnly cookies** for session management.

### Key Functions

```typescript
import {
  isAuthenticated,
  getAuthHeaders,
  getCurrentUser,
  setCurrentUser,
  clearAuth
} from '../../erp-core/src/core/auth/authService';

// Check if user is authenticated
if (isAuthenticated()) {
  // User is logged in
}

// Get current user from session storage
const user = getCurrentUser();
console.log(user?.name, user?.email);

// Store user after login
setCurrentUser({
  id: '123',
  email: 'user@example.com',
  name: 'John Doe',
  role: 'admin'
});

// Clear authentication (logout)
clearAuth();

// Get auth headers (for manual API calls - usually not needed)
const headers = getAuthHeaders();
// Returns: { 'credentials': 'include' }
```

### Usage Examples

#### Check Authentication Status

```typescript
import { isAuthenticated } from '../../erp-core/src/core/auth/authService';

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  return children;
}
```

#### Get Current User

```typescript
import { getCurrentUser } from '../../erp-core/src/core/auth/authService';

function UserProfile() {
  const user = getCurrentUser();

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <Badge>{user.role}</Badge>
    </div>
  );
}
```

#### Login Handler

```typescript
import { setCurrentUser } from '../../erp-core/src/core/auth/authService';
import { apiClient } from '../../infrastructure/api/client';

async function handleLogin(credentials) {
  try {
    const response = await apiClient.post('/auth/login', credentials);

    // Store user in session storage
    setCurrentUser(response.user);

    // httpOnly cookie is set automatically by server
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

#### Logout Handler

```typescript
import { clearAuth } from '../../erp-core/src/core/auth/authService';
import { apiClient } from '../../infrastructure/api/client';

async function handleLogout() {
  try {
    // Call backend logout to clear httpOnly cookie
    await apiClient.post('/auth/logout');

    // Clear local session data
    clearAuth();

    navigate('/login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

### Authentication Types

```typescript
// /erp-core/src/core/auth/types.ts

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user: User;
  message?: string;
}

interface AuthHeaders {
  'credentials': 'include';
  [key: string]: string;
}
```

### Important Notes

1. **httpOnly Cookies**: Authentication tokens are stored in httpOnly cookies managed by the server
2. **Session Storage**: User data is stored in `sessionStorage` for quick access
3. **No Client-Side Tokens**: Never store JWT tokens in localStorage or sessionStorage
4. **Automatic Logout**: The `apiClient` automatically handles 401 responses and triggers logout

## 2. API Client (Legacy)

**Note**: The ERP Core API client is deprecated. Use the infrastructure API client instead.

**Use This**: `/frontend/src/infrastructure/api/client.ts`
**Not This**: `/erp-core/src/core/data/apiClient.ts`

```typescript
// ✅ Correct: Use infrastructure API client
import { apiClient } from '../../infrastructure/api/client';

// ❌ Wrong: Don't use ERP core API client (deprecated)
import { apiClient } from '../../erp-core/src/core/data/apiClient';
```

See [API Client documentation](#api-client-integration) below for details.

## 3. Cache Manager

**Location**: `/erp-core/src/core/data/CacheManager.ts`

### Purpose
Client-side caching for frequently accessed data.

### Usage Example

```typescript
import { CacheManager } from '../../erp-core/src/core/data/CacheManager';

const cache = new CacheManager<Gauge[]>('gauges', 60000); // 1 minute TTL

// Get cached data
const cachedGauges = cache.get();

if (!cachedGauges) {
  // Fetch fresh data
  const gauges = await gaugeService.getGauges();
  cache.set(gauges);
}

// Clear cache
cache.clear();
```

## 4. Event Bus

**Location**: `/erp-core/src/core/data/EventBus.ts`

### Purpose
Frontend event communication between modules.

### Usage Example

```typescript
import { EventBus } from '../../erp-core/src/core/data/EventBus';

// Create event bus instance
const eventBus = new EventBus();

// Subscribe to events
eventBus.on('gauge:updated', (gauge) => {
  console.log('Gauge updated:', gauge);
  // Refresh data
});

// Emit events
eventBus.emit('gauge:updated', updatedGauge);

// Unsubscribe
const unsubscribe = eventBus.on('gauge:updated', handler);
unsubscribe();
```

### Common Events

```typescript
// Auth events
eventBus.emit('auth:login', user);
eventBus.emit('auth:logout');

// Data events
eventBus.emit('gauge:created', gauge);
eventBus.emit('gauge:updated', gauge);
eventBus.emit('gauge:deleted', gaugeId);

// UI events
eventBus.emit('modal:open', modalId);
eventBus.emit('modal:close', modalId);
```

## API Client Integration

**Location**: `/frontend/src/infrastructure/api/client.ts`

### Purpose
Centralized HTTP client for all API requests with automatic authentication.

### Features
- Automatic httpOnly cookie inclusion
- 401 redirect handling
- Consistent error handling
- FormData support
- Type-safe responses

### Usage Examples

#### GET Request

```typescript
import { apiClient } from '../../infrastructure/api/client';

// Fetch data
const response = await apiClient.get<Gauge[]>('/gauges/v2');
console.log(response); // Gauge[]

// With query parameters
const users = await apiClient.get<User[]>('/admin/users?page=1&limit=50');
```

#### POST Request

```typescript
import { apiClient } from '../../infrastructure/api/client';

// Create resource
const newGauge = await apiClient.post<Gauge>('/gauges/v2', {
  serialNumber: 'SN-12345',
  category: 'pressure',
  manufacturer: 'Acme Corp'
});

// Login
const loginResponse = await apiClient.post<LoginResponse>('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});
```

#### PUT Request

```typescript
import { apiClient } from '../../infrastructure/api/client';

// Update resource
const updatedGauge = await apiClient.put<Gauge>(`/gauges/v2/${gaugeId}`, {
  status: 'active',
  location: 'Warehouse A'
});
```

#### DELETE Request

```typescript
import { apiClient } from '../../infrastructure/api/client';

// Delete resource
await apiClient.delete(`/gauges/v2/${gaugeId}`);
```

#### FormData Upload

```typescript
import { apiClient } from '../../infrastructure/api/client';

// Upload file
const formData = new FormData();
formData.append('file', file);
formData.append('description', 'Calibration certificate');

const response = await apiClient.post('/gauges/upload', formData);
```

### Error Handling

```typescript
import { apiClient, APIError } from '../../infrastructure/api/client';

try {
  const gauge = await apiClient.get<Gauge>(`/gauges/v2/${gaugeId}`);
  console.log(gauge);
} catch (error) {
  if (error instanceof APIError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status);
    console.error('Data:', error.data);

    if (error.status === 404) {
      // Handle not found
    } else if (error.status === 401) {
      // Handled automatically - user redirected to login
    }
  }
}
```

### Automatic 401 Handling

The API client automatically:
1. Detects authentication failures (401 status)
2. Dispatches `auth:logout` event
3. Clears session data
4. Redirects to login page

```typescript
// This is handled automatically - no code needed
window.addEventListener('auth:logout', (event) => {
  // Triggered automatically on 401
  console.log('Session expired:', event.detail.reason);
});
```

## Integration Patterns

### Module Service Pattern

```typescript
// /frontend/src/modules/gauge/services/gaugeService.ts
import { apiClient } from '../../../infrastructure/api/client';
import type { Gauge, CreateGaugeData } from '../types';

export const gaugeService = {
  async getGauges(): Promise<Gauge[]> {
    return apiClient.get<Gauge[]>('/gauges/v2');
  },

  async getGauge(id: string): Promise<Gauge> {
    return apiClient.get<Gauge>(`/gauges/v2/${id}`);
  },

  async createGauge(data: CreateGaugeData): Promise<Gauge> {
    return apiClient.post<Gauge>('/gauges/v2', data);
  },

  async updateGauge(id: string, data: Partial<Gauge>): Promise<Gauge> {
    return apiClient.put<Gauge>(`/gauges/v2/${id}`, data);
  },

  async deleteGauge(id: string): Promise<void> {
    return apiClient.delete(`/gauges/v2/${id}`);
  }
};
```

### Component Usage Pattern

```typescript
import { gaugeService } from '../services/gaugeService';
import { useGaugeState, useGaugeActions } from '../../../infrastructure/store';
import { Button, LoadingSpinner } from '../../../infrastructure/components';

function GaugeList() {
  const [loading, setLoading] = useState(true);
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const { addNotification } = useSharedActions();

  useEffect(() => {
    loadGauges();
  }, []);

  async function loadGauges() {
    try {
      setLoading(true);
      const data = await gaugeService.getGauges();
      setGauges(data);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load gauges',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {gauges.map(gauge => (
        <div key={gauge.id}>{gauge.name}</div>
      ))}
    </div>
  );
}
```

## Best Practices

### 1. Import from ERP Core

```typescript
// ✅ Correct: Import from ERP core
import { isAuthenticated, getCurrentUser } from '../../erp-core/src/core/auth/authService';

// ❌ Wrong: Create custom auth utilities
const isLoggedIn = () => !!localStorage.getItem('user');
```

### 2. Use API Client

```typescript
// ✅ Correct: Use apiClient
import { apiClient } from '../../infrastructure/api/client';
const data = await apiClient.get('/gauges/v2');

// ❌ Wrong: Direct fetch calls
const response = await fetch('/api/gauges/v2');
```

### 3. Handle Errors Consistently

```typescript
// ✅ Correct: Consistent error handling
try {
  const data = await apiClient.get('/gauges/v2');
} catch (error) {
  addNotification({
    type: 'error',
    title: 'Failed to load data',
    message: error instanceof Error ? error.message : 'Unknown error'
  });
}

// ❌ Wrong: Silent failures
try {
  const data = await apiClient.get('/gauges/v2');
} catch (error) {
  console.log(error); // User sees nothing
}
```

### 4. Clear Auth on Logout

```typescript
// ✅ Correct: Clear all auth data
import { clearAuth } from '../../erp-core/src/core/auth/authService';
import { apiClient } from '../../infrastructure/api/client';

async function logout() {
  await apiClient.post('/auth/logout');
  clearAuth();
  navigate('/login');
}

// ❌ Wrong: Incomplete cleanup
async function logout() {
  navigate('/login'); // Cookie and session still active
}
```

## Common Mistakes

### ❌ Wrong: Duplicating Auth Logic

```typescript
// Don't create custom auth utilities
const checkAuth = () => {
  const token = localStorage.getItem('token');
  return !!token;
};
```

### ✅ Correct: Use ERP Core

```typescript
import { isAuthenticated } from '../../erp-core/src/core/auth/authService';

if (isAuthenticated()) {
  // User is logged in
}
```

### ❌ Wrong: Direct Fetch Calls

```typescript
// Don't bypass apiClient
const response = await fetch('/api/gauges/v2', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### ✅ Correct: Use API Client

```typescript
import { apiClient } from '../../infrastructure/api/client';

const response = await apiClient.post('/gauges/v2', data);
```

### ❌ Wrong: Manual Token Management

```typescript
// Don't manually manage tokens
localStorage.setItem('token', 'jwt-token-here');
```

### ✅ Correct: Server-Managed Cookies

```typescript
// Tokens are managed via httpOnly cookies
// Just call login endpoint
await apiClient.post('/auth/login', credentials);
// Cookie is set automatically by server
```

## Real-World Examples

See actual usage in:
- `/frontend/src/modules/admin/pages/UserManagement.tsx`
- `/frontend/src/modules/gauge/services/gaugeService.ts`
- `/frontend/src/infrastructure/auth/AuthProvider.tsx`

## Security Considerations

### 1. httpOnly Cookies
- JWT tokens stored in httpOnly cookies (cannot be accessed by JavaScript)
- Automatic inclusion with all API requests
- Secure against XSS attacks

### 2. CSRF Protection
- API client includes credentials with all requests
- Server validates origin and referer headers

### 3. Session Management
- User data stored in sessionStorage (cleared on tab close)
- Automatic logout on 401 responses
- Clean session cleanup on logout

### 4. Never Store Sensitive Data
```typescript
// ❌ Never do this
localStorage.setItem('token', 'jwt-token');
localStorage.setItem('password', userPassword);

// ✅ Only store non-sensitive user data
sessionStorage.setItem('user', JSON.stringify({
  id: user.id,
  email: user.email,
  name: user.name
}));
```

## Related Documentation
- [UI Components System](./01-UI-Components-System.md)
- [State Management](./02-State-Management.md)
- [Component Usage Examples](./05-Component-Usage-Examples.md)
