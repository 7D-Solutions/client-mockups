# User Module Zustand Migration - Quick Reference Guide

**Project**: Fire-Proof ERP Sandbox
**Purpose**: Developer quick reference for user module implementation

---

## At-a-Glance: What Changed

### Before (Broken)
```typescript
// Placeholder that doesn't work
export const useUserState = () => ({
  profile: null,  // Always null
  preferences: { theme: 'light' }, // Hardcoded
  isProfileLoading: false,
});

// Non-reactive fake actions
export const useUserActions = () => ({
  setProfile: (profile) => {
    Object.assign(userStore, { profile }); // Not reactive!
  },
});
```

### After (Working)
```typescript
// Real Zustand store
export const useUserState = () => useAppStore((state) => state.user);

// Real reactive actions
export const useUserActions = () => useAppStore((state) => ({
  setProfile: state.setProfile,
  updatePreferences: state.updatePreferences,
  // ... all working actions
}));
```

---

## Critical Files Changed

### Backend (7 files)
1. `/backend/migrations/007_user_preferences.sql` - NEW
2. `/backend/apply-migration-007.js` - NEW
3. `/backend/src/modules/user/routes/user.js` - MODIFIED (4 new routes)
4. `/backend/src/modules/user/services/UserService.js` - MODIFIED (4 new methods)
5. `/backend/tests/modules/user/integration/UserProfile.integration.test.js` - NEW

### Frontend (6 files)
1. `/frontend/src/infrastructure/store/index.ts` - MAJOR CHANGES (lines 80-546)
2. `/frontend/src/infrastructure/store/moduleSync.ts` - MODIFIED (new user sync)
3. `/frontend/src/infrastructure/auth/index.tsx` - MODIFIED (event emission)
4. `/frontend/src/modules/user/context/index.tsx` - MODIFIED (Zustand sync)
5. `/frontend/src/modules/user/hooks/useUserProfile.ts` - MODIFIED (Zustand sync)
6. `/frontend/src/modules/user/services/userService.ts` - MODIFIED (remove hardcoded)

---

## Backend Endpoint Reference

### Profile Endpoints

**GET /api/user/profile**
```javascript
// Request
Authorization: Bearer <token>

// Response
{
  "success": true,
  "data": {
    "id": "123",
    "username": "johndoe",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "department": "Engineering",
    "position": "Developer",
    "role": "Admin",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T00:00:00Z",
    "lastLogin": "2024-01-20T00:00:00Z"
  }
}
```

**PUT /api/user/profile**
```javascript
// Request
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.new@example.com",
  "phone": "555-9999",
  "department": "Product",
  "position": "Senior Developer"
}

// Response
{
  "success": true,
  "data": {
    // Updated UserProfile object
  }
}

// Errors
{
  "success": false,
  "message": "Email already in use"
}
```

### Preferences Endpoints

**GET /api/user/preferences**
```javascript
// Request
Authorization: Bearer <token>

// Response
{
  "success": true,
  "data": {
    "theme": "dark",
    "language": "en",
    "timezone": "America/New_York",
    "emailNotifications": true,
    "pushNotifications": false,
    "gaugeAlerts": true,
    "maintenanceReminders": true,
    "defaultView": "list",
    "itemsPerPage": 50
  }
}
```

**PUT /api/user/preferences**
```javascript
// Request
Authorization: Bearer <token>
Content-Type: application/json

{
  "theme": "dark",
  "language": "es",
  "emailNotifications": false,
  "itemsPerPage": 100
}

// Response
{
  "success": true,
  "data": {
    // Complete UserPreferences object with updates merged
  }
}
```

---

## Frontend Usage Patterns

### Pattern 1: Read User State
```typescript
import { useUserState } from '../../../infrastructure/store';

function MyComponent() {
  const { profile, preferences, isProfileLoading } = useUserState();

  if (isProfileLoading) return <LoadingSpinner />;
  if (!profile) return <NotLoggedIn />;

  return (
    <div>
      <h1>Welcome, {profile.name}!</h1>
      <p>Theme: {preferences.theme}</p>
    </div>
  );
}
```

### Pattern 2: Update User State (Direct)
```typescript
import { useUserActions } from '../../../infrastructure/store';

function DirectUpdate() {
  const { setProfile, updatePreferences } = useUserActions();

  const handleUpdate = () => {
    // Direct state update (no API call)
    updatePreferences({ theme: 'dark' });
  };

  return <button onClick={handleUpdate}>Toggle Theme</button>;
}
```

### Pattern 3: Update with API Call (Business Logic)
```typescript
import { useUser } from '../context';

function ProfileEditor() {
  const { profile, updateProfile, isProfileLoading } = useUser();

  const handleSave = async (formData) => {
    try {
      // Calls API + updates Zustand + emits events
      await updateProfile(formData);
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <input name="name" defaultValue={profile?.name} />
      <button type="submit" disabled={isProfileLoading}>
        Save
      </button>
    </form>
  );
}
```

### Pattern 4: React Query Integration
```typescript
import { useUserProfile } from '../hooks/useUserProfile';

function ProfileWithQuery() {
  const {
    profile,
    isProfileLoading,
    updateProfile,
    isUpdatingProfile,
    profileError,
  } = useUserProfile();

  // React Query automatically syncs to Zustand
  // Use this for components that need fine-grained loading/error states

  return (
    <div>
      {isProfileLoading && <Spinner />}
      {profileError && <Error message={profileError.message} />}
      {profile && <ProfileDisplay data={profile} />}
    </div>
  );
}
```

---

## Event Flow Reference

### Login Flow
```
1. User submits login form
2. AuthProvider.login() → POST /api/auth/login
3. AuthProvider.setUser(userData)
4. moduleEventManager.emitUserLoggedIn(userId, userInfo)
5. UserProvider receives USER_LOGGED_IN event
6. UserProvider.loadProfile() → GET /api/user/profile
7. userActions.setProfile(profile) → Updates Zustand
8. UserProvider.loadPreferences() → GET /api/user/preferences
9. userActions.setPreferences(preferences) → Updates Zustand
10. sharedActions.setTheme(preferences.theme) → Applies theme
11. UI re-renders with user data
```

### Profile Update Flow
```
1. User edits profile form and clicks Save
2. Component calls updateProfile(formData)
3. UserProvider.updateProfile() → PUT /api/user/profile
4. Backend validates, updates database, returns updated profile
5. userActions.setProfile(updatedProfile) → Updates Zustand
6. queryClient.setQueryData() → Updates React Query cache
7. eventBus.emit('user:profile:updated', updatedProfile)
8. ModuleSync receives event, broadcasts to other modules
9. addNotification({ type: 'success', title: 'Profile Updated' })
10. UI re-renders with new data
```

### Logout Flow
```
1. User clicks logout
2. AuthProvider.logout() → POST /api/auth/logout
3. AuthProvider.setUser(null)
4. moduleEventManager.emitUserLoggedOut(userId)
5. ModuleSync receives USER_LOGGED_OUT event
6. userActions.clearUserData() → Resets Zustand to initial state
7. gaugeActions.updateGaugeCache({}) → Clears gauge cache
8. sharedActions.clearNotifications() → Clears notifications
9. Navigate to /login
10. UI shows logged out state
```

### Preference Update Flow
```
1. User changes settings and clicks Save
2. Component calls savePreferences(updates)
3. UserProvider.savePreferences() → PUT /api/user/preferences
4. Backend updates user_preferences table
5. userActions.setPreferences(updatedPrefs) → Updates Zustand
6. eventBus.emit('user:preferences:updated', updatedPrefs)
7. ModuleSync receives event
8. If theme changed: sharedActions.setTheme(newTheme)
9. document.documentElement.setAttribute('data-theme', newTheme)
10. UI re-renders with new theme/preferences
```

---

## State Structure Reference

### Zustand User State
```typescript
{
  user: {
    // Profile
    profile: {
      id: "123",
      username: "johndoe",
      name: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      department: "Engineering",
      position: "Developer",
      role: "Admin",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
      lastLogin: "2024-01-20T00:00:00Z"
    },

    // Preferences
    preferences: {
      theme: "dark",
      language: "en",
      timezone: "America/New_York",
      emailNotifications: true,
      pushNotifications: false,
      gaugeAlerts: true,
      maintenanceReminders: true,
      defaultView: "list",
      itemsPerPage: 50
    },

    // Loading states
    isProfileLoading: false,
    isPreferencesLoading: false,
    isSavingProfile: false,
    isSavingPreferences: false,

    // Error states
    profileError: null,
    preferencesError: null,

    // Activity & sessions (future)
    activity: [],
    sessions: [],

    // Cache metadata
    lastProfileFetch: 1706127600000,
    lastPreferencesFetch: 1706127700000
  }
}
```

### React Query Cache
```typescript
{
  queries: {
    ['user', 'profile']: {
      data: UserProfile,
      dataUpdatedAt: 1706127600000,
      error: null,
      status: 'success',
      fetchStatus: 'idle'
    },
    ['user', 'preferences']: {
      data: UserPreferences,
      dataUpdatedAt: 1706127700000,
      error: null,
      status: 'success',
      fetchStatus: 'idle'
    }
  }
}
```

---

## Database Schema Reference

### user_preferences Table
```sql
CREATE TABLE user_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT FALSE,
  gauge_alerts BOOLEAN DEFAULT TRUE,
  maintenance_reminders BOOLEAN DEFAULT TRUE,
  default_view VARCHAR(20) DEFAULT 'list',
  items_per_page INT DEFAULT 50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_preferences (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE KEY on `user_id`
- FOREIGN KEY on `user_id` → `users(id)`

---

## Common Debugging Commands

### Check Zustand State
```javascript
// In browser console
console.log(window.zustandStore?.getState?.().user);
```

### Check React Query Cache
```javascript
// In browser console
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
console.log(queryClient.getQueryData(['user', 'profile']));
console.log(queryClient.getQueryData(['user', 'preferences']));
```

### Monitor Events
```javascript
// In browser console
import { eventBus } from './infrastructure/events';
eventBus.on('user:profile:loaded', (data) => console.log('Profile loaded:', data));
eventBus.on('user:preferences:updated', (data) => console.log('Preferences updated:', data));
```

### Check Database
```sql
-- MySQL console
USE fai_db_sandbox;

-- Check user preferences
SELECT * FROM user_preferences WHERE user_id = 123;

-- Check user profile
SELECT id, username, name, email, phone, department, position, role
FROM users WHERE id = 123;

-- Check recent audit logs
SELECT * FROM audit_logs
WHERE user_id = 123
  AND action LIKE 'user.%'
ORDER BY timestamp DESC
LIMIT 10;
```

---

## Testing Commands

### Backend Tests
```bash
cd backend

# Run all user module tests
npm test -- tests/modules/user/

# Run specific test file
npm test -- tests/modules/user/integration/UserProfile.integration.test.js

# Run with coverage
npm test -- --coverage tests/modules/user/
```

### Frontend Tests
```bash
cd frontend

# Run Zustand store tests
npm test -- src/infrastructure/store/userStore.test.ts

# Run integration tests
npm test -- tests/integration/auth-user-sync.integration.test.tsx

# Run E2E tests
npm run test:e2e -- tests/e2e/user-profile.spec.ts

# Run all user-related tests
npm test -- --testPathPattern=user
```

### Manual Testing
```bash
# Start dev environment
docker-compose -f docker-compose.dev.yml up -d

# Check backend logs
docker logs fireproof-erp-modular-backend-dev -f | grep user

# Check frontend logs
docker logs fireproof-erp-modular-frontend-dev -f
```

---

## Migration Checklist

### Phase 1: Backend ✅
- [ ] Create database migration file
- [ ] Run migration (apply-migration-007.js)
- [ ] Implement UserService methods
- [ ] Add routes to user.js
- [ ] Write integration tests
- [ ] Test endpoints with Postman/curl

### Phase 2: Zustand ✅
- [ ] Define UserModuleState interface
- [ ] Add user to AppState
- [ ] Create initialUserState
- [ ] Implement all user actions
- [ ] Replace placeholder selectors
- [ ] Write unit tests

### Phase 3: Synchronization ✅
- [ ] Update UserContext to sync Zustand
- [ ] Add event emission in AuthProvider
- [ ] Sync React Query to Zustand
- [ ] Remove hardcoded service defaults
- [ ] Test login/logout flow

### Phase 4: Integration ✅
- [ ] Update moduleSync for user state
- [ ] Add theme synchronization
- [ ] Implement permission sync
- [ ] Test cross-module events
- [ ] Verify state cleanup on logout

### Phase 5: Testing ✅
- [ ] Backend integration tests passing
- [ ] Frontend unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Manual test scenarios complete

### Phase 6: Cleanup ✅
- [ ] Remove all TODO comments
- [ ] Update CLAUDE.md
- [ ] Create migration documentation
- [ ] Run linters (no errors)
- [ ] Type check (no errors)
- [ ] Check bundle size

---

## Performance Optimization Tips

### Cache Strategy
```typescript
// Profile: 5-minute cache (frequently changing)
staleTime: 5 * 60 * 1000,

// Preferences: 10-minute cache (rarely changing)
staleTime: 10 * 60 * 1000,

// Activity: 30-second cache (real-time)
staleTime: 30 * 1000,
```

### Selective Re-renders
```typescript
// ❌ BAD: Re-renders on any user state change
const user = useUserState();

// ✅ GOOD: Only re-renders when profile changes
const profile = useAppStore((state) => state.user.profile);

// ✅ BETTER: Use selector for specific field
const userName = useAppStore((state) => state.user.profile?.name);
```

### Lazy Loading
```typescript
// Load preferences only when needed
useEffect(() => {
  if (userState.profile && !userState.preferences.timezone) {
    loadPreferences();
  }
}, [userState.profile]);
```

---

## Troubleshooting Guide

### Problem: Profile not loading on login
**Check**:
1. Is USER_LOGGED_IN event being emitted? (console.log in AuthProvider)
2. Is UserProvider listening to event? (check useEventBus hook)
3. Is loadProfile() being called? (add console.log)
4. Is API endpoint working? (check network tab)
5. Is Zustand updating? (check DevTools)

### Problem: Preferences not persisting
**Check**:
1. Is database table created? (run migration)
2. Is PUT /api/user/preferences endpoint working?
3. Is userService.updatePreferences() calling correct endpoint?
4. Is Zustand being updated? (check store state)
5. Is page reload re-fetching? (check React Query)

### Problem: Theme not applying
**Check**:
1. Is preference.theme in Zustand? (check state)
2. Is sharedActions.setTheme() being called? (add console.log)
3. Is document.html[data-theme] attribute set? (inspect element)
4. Are theme CSS variables defined? (check styles)

### Problem: State cleared unexpectedly
**Check**:
1. Is logout being called accidentally? (check AuthProvider)
2. Is USER_LOGGED_OUT event firing? (monitor events)
3. Is moduleSync.clearAllModuleCaches() being called?
4. Is React Query cache being cleared? (check devtools)

---

## Key Differences from Gauge/Admin Modules

| Feature | Gauge/Admin | User |
|---------|-------------|------|
| **Context Wrapper** | No Context | Has UserProvider |
| **React Query** | Minimal usage | Heavy usage |
| **Event Integration** | Direct store updates | Via UserProvider |
| **Cache Strategy** | Zustand only | Zustand + React Query |
| **Business Logic** | In hooks | In UserProvider |
| **API Calls** | Direct in components | Via userService |
| **State Persistence** | Session only | Session + Database |

---

## Import Paths Reference

### Backend
```javascript
// Services
const UserService = require('../services/UserService');
const auditService = require('../../../infrastructure/audit/auditService');

// Database
const { pool } = require('../../../infrastructure/database/connection');

// Middleware
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
```

### Frontend
```typescript
// Store
import { useUserState, useUserActions } from '../../../infrastructure/store';
import { useAppStore } from '../../../infrastructure/store';

// Context
import { useUser, UserProvider } from '../context';

// Hooks
import { useUserProfile } from '../hooks/useUserProfile';

// Services
import { userService } from '../services/userService';

// Types
import type { UserProfile, UserPreferences } from '../types';

// Events
import { eventBus, EVENTS } from '../../../infrastructure/events';
import { moduleEventManager } from '../../../infrastructure/events/moduleEvents';

// Components
import { Button, FormInput, LoadingSpinner } from '../../../infrastructure/components';
```

---

## Next Steps After Migration

### Immediate Enhancements
1. Add localStorage persistence (Zustand persist middleware)
2. Implement avatar upload functionality
3. Add activity history UI
4. Implement session management UI

### Future Features
1. Two-factor authentication preferences
2. Advanced notification settings
3. Custom dashboard layouts
4. Export user data (GDPR compliance)
5. Account deletion workflow

---

## Contact & Support

**Questions**: Review main implementation plan or consult team lead
**Issues**: Check troubleshooting guide above
**Testing**: Refer to Phase 5 of implementation plan
