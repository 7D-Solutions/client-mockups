# User Module Troubleshooting Guide

**Project**: Fire-Proof ERP Sandbox
**Purpose**: Common issues, solutions, and debugging strategies

---

## Quick Diagnostic Checklist

When encountering user module issues, check these in order:

```
□ Is the backend running? (docker ps)
□ Is the database migration applied? (Check user_preferences table)
□ Are backend endpoints responding? (Check network tab)
□ Is the user logged in? (Check AuthProvider state)
□ Is Zustand store updated? (Check browser DevTools)
□ Are events being emitted? (Check console logs)
□ Is React Query cache valid? (Check React Query DevTools)
□ Are there console errors? (Check browser console)
```

---

## Problem Category 1: Profile Not Loading

### Symptom: Profile is null after login

**Possible Causes**:
1. USER_LOGGED_IN event not emitted
2. UserProvider not listening to event
3. API endpoint failing
4. Zustand not updating
5. Network error

**Diagnostic Steps**:

1. **Check if user is actually logged in**:
```javascript
// Browser console
const auth = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.getFiberRoots?.(1)?.[0]?.current?.child?.memoizedState;
console.log('Auth user:', auth);
```

2. **Check if LOGIN event was emitted**:
```javascript
// Add to AuthProvider login() method temporarily
console.log('[AuthProvider] Emitting USER_LOGGED_IN', userData);
moduleEventManager.emitUserLoggedIn(userData.id, userData);
```

3. **Check if UserProvider is listening**:
```javascript
// Add to UserProvider
useEventBus(EVENTS.USER_LOGGED_IN, (data) => {
  console.log('[UserProvider] USER_LOGGED_IN received', data);
  loadProfile();
});
```

4. **Check API response**:
```bash
# Check network tab or use curl
curl -X GET http://localhost:8000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

5. **Check Zustand state**:
```javascript
// Browser console
import { useAppStore } from './infrastructure/store';
console.log('User state:', useAppStore.getState().user);
```

**Solutions**:

**Solution 1: Event not emitted**
```typescript
// File: /frontend/src/infrastructure/auth/index.tsx
// Add after setUser(userData)

moduleEventManager.emitUserLoggedIn(
  userData.id,
  {
    id: userData.id,
    username: userData.username,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    isActive: true,
    createdAt: userData.created_at || '',
    updatedAt: userData.updated_at || '',
  }
);
```

**Solution 2: UserProvider not mounted**
```typescript
// Check that UserProvider wraps routes in App.tsx
<Route
  path="/user/*"
  element={
    <ErrorBoundary name="UserModule">
      <UserProvider>
        <UserRoutes />
      </UserProvider>
    </ErrorBoundary>
  }
/>
```

**Solution 3: API endpoint missing**
```bash
# Check backend routes
cd backend
grep -r "router.get('/profile'" src/modules/user/routes/
```

**Solution 4: Zustand placeholder**
```typescript
// Verify real implementation in /infrastructure/store/index.ts
// Should NOT have this pattern:
const userStore = { profile: null }; // ❌ BAD

// Should have this pattern:
export const useAppStore = create<AppState>()((set) => ({
  user: initialUserState,
  setProfile: (profile) => set((state) => ({
    user: { ...state.user, profile }
  })),
}));
```

---

## Problem Category 2: Preferences Not Persisting

### Symptom: Settings save but don't persist after reload

**Possible Causes**:
1. Database table not created
2. Backend endpoint not implemented
3. Frontend calling wrong endpoint
4. Zustand updating but not saving to database
5. React Query cache not invalidating

**Diagnostic Steps**:

1. **Check database table exists**:
```sql
USE fai_db_sandbox;
SHOW TABLES LIKE 'user_preferences';
DESCRIBE user_preferences;
```

2. **Check backend endpoint**:
```bash
curl -X PUT http://localhost:8000/api/user/preferences \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark"}'
```

3. **Check network request**:
```javascript
// Browser DevTools → Network tab
// Filter by: preferences
// Look for: PUT /api/user/preferences
// Check response: Should be 200 with updated preferences
```

4. **Check database record**:
```sql
SELECT * FROM user_preferences WHERE user_id = YOUR_USER_ID;
```

**Solutions**:

**Solution 1: Run migration**
```bash
cd backend
node apply-migration-007.js
```

**Solution 2: Implement backend endpoint**
```javascript
// File: /backend/src/modules/user/routes/user.js
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const preferences = req.body;

    const updated = await UserService.updateUserPreferences(userId, preferences);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

**Solution 3: Fix frontend service**
```typescript
// File: /frontend/src/modules/user/services/userService.ts
async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
  // REMOVE hardcoded return
  // return Promise.resolve({ theme: 'light', ... });

  // ADD real API call
  const response = await apiClient.request('/user/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences)
  });
  return response.data || response;
}
```

---

## Problem Category 3: Theme Not Applying

### Symptom: User selects theme but UI doesn't change

**Possible Causes**:
1. Preferences not saving (see Category 2)
2. Theme not syncing to shared state
3. CSS not applied
4. React effect not running

**Diagnostic Steps**:

1. **Check Zustand user preferences**:
```javascript
// Browser console
console.log(useAppStore.getState().user.preferences.theme);
```

2. **Check shared theme state**:
```javascript
console.log(useAppStore.getState().shared.theme);
```

3. **Check HTML attribute**:
```javascript
console.log(document.documentElement.getAttribute('data-theme'));
```

4. **Check CSS variables**:
```javascript
const styles = getComputedStyle(document.documentElement);
console.log('Background:', styles.getPropertyValue('--bg-color'));
```

**Solutions**:

**Solution 1: Add theme sync to ModuleSync**
```typescript
// File: /frontend/src/infrastructure/store/moduleSync.ts
const unsubPreferencesUpdated = eventBus.on('user:preferences:updated', (data) => {
  const store = useAppStore.getState();

  if (data.theme) {
    const theme = data.theme === 'auto' ? 'light' : data.theme;
    store.setTheme(theme);
  }
});
```

**Solution 2: Add effect in App.tsx**
```typescript
// File: /frontend/src/App.tsx
import { useUserState, useSharedState, useSharedActions } from './infrastructure/store';

export function App() {
  const userState = useUserState();
  const sharedState = useSharedState();
  const { setTheme } = useSharedActions();

  // Sync user theme to shared theme
  useEffect(() => {
    if (userState.preferences.theme) {
      const theme = userState.preferences.theme === 'auto'
        ? 'light'
        : userState.preferences.theme;

      if (theme !== sharedState.theme) {
        setTheme(theme);
      }
    }
  }, [userState.preferences.theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', sharedState.theme);
  }, [sharedState.theme]);
}
```

**Solution 3: Add CSS theme variables**
```css
/* File: /frontend/src/index.css */
:root,
[data-theme="light"] {
  --bg-color: #ffffff;
  --text-color: #000000;
  --border-color: #e0e0e0;
}

[data-theme="dark"] {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
  --border-color: #333333;
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
}
```

---

## Problem Category 4: State Lost on Page Reload

### Symptom: Profile loads on login but lost after F5 refresh

**Possible Causes**:
1. Session validation not triggering profile load
2. USER_LOGGED_IN event not emitted on validation
3. Cookie not persisting
4. Zustand not reactive

**Diagnostic Steps**:

1. **Check session cookie exists**:
```javascript
// Browser console
document.cookie.split(';').find(c => c.includes('token'));
```

2. **Check /auth/me is called on mount**:
```javascript
// Network tab: Should see GET /auth/me on page load
```

3. **Check USER_LOGGED_IN event on validation**:
```javascript
// Add log to AuthProvider validateSession()
console.log('[AuthProvider] Session valid, emitting USER_LOGGED_IN');
```

4. **Check UserProvider receives event**:
```javascript
// Should see log from UserProvider useEventBus listener
```

**Solutions**:

**Solution 1: Emit event on session validation**
```typescript
// File: /frontend/src/infrastructure/auth/index.tsx
useEffect(() => {
  const validateSession = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      let userData = response.user || response.data || (response.id ? response : null);

      if (userData && userData.id && userData.email) {
        setUser(userData);

        // ← ADD THIS
        moduleEventManager.emitUserLoggedIn(
          userData.id,
          {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            isActive: true,
            createdAt: userData.created_at || '',
            updatedAt: userData.updated_at || '',
          }
        );
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  validateSession();
}, []);
```

**Solution 2: Ensure httpOnly cookies persist**
```javascript
// Backend: Set cookie with proper options
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});
```

---

## Problem Category 5: Zustand State Not Updating

### Symptom: Actions called but useUserState() returns old data

**Possible Causes**:
1. Using placeholder implementation
2. Not using Zustand set() function
3. Direct mutation instead of immutable update
4. Wrong selector usage

**Diagnostic Steps**:

1. **Check store implementation**:
```javascript
// Look at /infrastructure/store/index.ts lines 494-546
// Should be real Zustand, not placeholder
```

2. **Check action calls**:
```javascript
// Add logging
export const useUserActions = () => useAppStore((state) => ({
  setProfile: (profile) => {
    console.log('[Action] setProfile called', profile);
    return state.setProfile(profile);
  },
}));
```

3. **Check Zustand DevTools**:
```javascript
// Install Zustand DevTools extension
// Watch for state changes when actions called
```

**Solutions**:

**Solution 1: Implement real Zustand store**
```typescript
// REMOVE placeholder (lines 494-546)
// ADD real implementation

export const useAppStore = create<AppState>()((set) => ({
  user: initialUserState,

  setProfile: (profile) => {
    set((state) => ({
      ...state,
      user: {
        ...state.user,
        profile,
        profileError: null,
        lastProfileFetch: Date.now()
      }
    }));
  },

  // ... other actions
}));

export const useUserState = () => useAppStore((state) => state.user);
export const useUserActions = () => useAppStore((state) => ({
  setProfile: state.setProfile,
  // ... other actions
}));
```

**Solution 2: Use immutable updates**
```typescript
// ❌ BAD - Direct mutation
const userStore = { profile: null };
Object.assign(userStore, { profile: newProfile });

// ✅ GOOD - Immutable update
set((state) => ({
  ...state,
  user: {
    ...state.user,
    profile: newProfile
  }
}));
```

---

## Problem Category 6: React Query Not Syncing

### Symptom: useUserProfile() works but Zustand not updated

**Possible Causes**:
1. onSuccess callback not implemented
2. Zustand actions not called
3. Import issues

**Diagnostic Steps**:

1. **Check onSuccess callback exists**:
```typescript
// File: /frontend/src/modules/user/hooks/useUserProfile.ts
const profileQuery = useQuery({
  queryKey: ['user', 'profile'],
  queryFn: userService.getProfile,
  onSuccess: (data) => {
    console.log('[Query] Profile loaded, syncing to Zustand', data);
    userActions.updateProfileCache(data);
  },
});
```

2. **Check imports**:
```typescript
import { useUserActions } from '../../../infrastructure/store';
```

3. **Check action implementation**:
```typescript
updateProfileCache: (profile) => {
  console.log('[Store] updateProfileCache called', profile);
  set((state) => ({
    ...state,
    user: {
      ...state.user,
      profile,
      lastProfileFetch: Date.now(),
      profileError: null
    }
  }));
},
```

**Solutions**:

**Solution 1: Add onSuccess callbacks**
```typescript
// File: /frontend/src/modules/user/hooks/useUserProfile.ts
import { useUserActions } from '../../../infrastructure/store';

export const useUserProfile = () => {
  const userActions = useUserActions();

  const profileQuery = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: userService.getProfile,
    onSuccess: (data) => {
      userActions.updateProfileCache(data);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => userService.updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['user', 'profile'], updatedProfile);
      userActions.updateProfileCache(updatedProfile);
      emitUserEvent('user:profile:updated', updatedProfile);
    },
    onError: (error: any) => {
      userActions.setProfileError(error.message);
    }
  });
};
```

---

## Problem Category 7: Events Not Firing

### Symptom: Event emitted but listener not triggered

**Possible Causes**:
1. Event name mismatch
2. Listener registered after event emitted
3. Event bus import issue
4. Listener cleanup removing handler

**Diagnostic Steps**:

1. **Check event names match**:
```typescript
// Emitter
eventBus.emit(EVENTS.USER_LOGGED_IN, data);

// Listener
useEventBus(EVENTS.USER_LOGGED_IN, handler);

// Verify constant
console.log(EVENTS.USER_LOGGED_IN); // Should be 'user:logged_in'
```

2. **Check timing**:
```javascript
// Add logs
eventBus.emit(EVENTS.USER_LOGGED_IN, data);
console.log('[EventBus] Emitted USER_LOGGED_IN');

useEventBus(EVENTS.USER_LOGGED_IN, (data) => {
  console.log('[Listener] Received USER_LOGGED_IN', data);
});
```

3. **Check event bus instance**:
```typescript
// Should be same instance
import { eventBus } from './infrastructure/events';
```

**Solutions**:

**Solution 1: Use EVENTS constants**
```typescript
import { EVENTS } from '../../../infrastructure/events';

// ❌ BAD
eventBus.emit('USER_LOGGED_IN', data);

// ✅ GOOD
eventBus.emit(EVENTS.USER_LOGGED_IN, data);
```

**Solution 2: Ensure listener registered before event**
```typescript
// UserProvider should be mounted before login
<UserProvider>
  <Routes>
    <Route path="/login" element={<Login />} />
  </Routes>
</UserProvider>
```

**Solution 3: Check cleanup**
```typescript
useEffect(() => {
  const unsubscribe = eventBus.on(EVENTS.USER_LOGGED_IN, handler);

  return () => {
    unsubscribe(); // Only cleanup on unmount
  };
}, []); // Empty deps - register once
```

---

## Problem Category 8: Database Errors

### Symptom: Backend returns 500 error for user endpoints

**Possible Causes**:
1. Migration not applied
2. Foreign key constraint violation
3. Column name mismatch
4. Connection issue

**Diagnostic Steps**:

1. **Check table exists**:
```sql
SHOW TABLES LIKE 'user_preferences';
```

2. **Check table structure**:
```sql
DESCRIBE user_preferences;
```

3. **Check backend logs**:
```bash
docker logs fireproof-erp-modular-backend-dev -f | grep user
```

4. **Test query directly**:
```sql
SELECT * FROM user_preferences WHERE user_id = 1;
```

**Solutions**:

**Solution 1: Apply migration**
```bash
cd backend
node apply-migration-007.js
```

**Solution 2: Fix column names**
```javascript
// Snake case in database
email_notifications BOOLEAN

// Camel case in code
const { email_notifications } = row;
return {
  emailNotifications: Boolean(email_notifications)
};
```

**Solution 3: Create default preferences**
```javascript
// In UserService.getPreferences()
const [prefs] = await connection.execute(
  'SELECT * FROM user_preferences WHERE user_id = ?',
  [userId]
);

if (prefs.length === 0) {
  // Create defaults
  await connection.execute(
    'INSERT INTO user_preferences (user_id) VALUES (?)',
    [userId]
  );

  return getDefaultPreferences();
}
```

---

## Debugging Tools & Commands

### Frontend Debugging

**React DevTools**:
```bash
# Install extension in browser
# View component tree and props
```

**Zustand DevTools**:
```bash
# Install redux-devtools extension
# View Zustand state changes
```

**React Query DevTools**:
```javascript
// Add to App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Console Commands**:
```javascript
// Get Zustand state
import { useAppStore } from './infrastructure/store';
console.log('User:', useAppStore.getState().user);

// Get React Query cache
import { queryClient } from './App';
console.log('Profile:', queryClient.getQueryData(['user', 'profile']));

// Monitor events
import { eventBus } from './infrastructure/events';
eventBus.on('user:profile:loaded', (data) => console.log('Profile loaded:', data));
```

### Backend Debugging

**Check Backend Logs**:
```bash
docker logs fireproof-erp-modular-backend-dev -f
```

**Test Endpoints**:
```bash
# Get profile
curl -X GET http://localhost:8000/api/user/profile \
  -H "Authorization: Bearer TOKEN"

# Update profile
curl -X PUT http://localhost:8000/api/user/profile \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com"}'

# Get preferences
curl -X GET http://localhost:8000/api/user/preferences \
  -H "Authorization: Bearer TOKEN"

# Update preferences
curl -X PUT http://localhost:8000/api/user/preferences \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark"}'
```

**Database Queries**:
```sql
-- Check user
SELECT * FROM users WHERE id = 1;

-- Check preferences
SELECT * FROM user_preferences WHERE user_id = 1;

-- Check audit logs
SELECT * FROM audit_logs
WHERE user_id = 1 AND action LIKE 'user.%'
ORDER BY timestamp DESC LIMIT 10;
```

---

## Performance Issues

### Symptom: Slow profile load or updates

**Diagnostic Steps**:

1. **Check API response time**:
```javascript
// Network tab: Look at response time
// Should be <200ms for profile
// Should be <300ms for preferences
```

2. **Check database query performance**:
```sql
EXPLAIN SELECT * FROM users WHERE id = 1;
EXPLAIN SELECT * FROM user_preferences WHERE user_id = 1;
```

3. **Check Zustand update time**:
```javascript
const start = performance.now();
userActions.setProfile(profile);
console.log('Update time:', performance.now() - start); // Should be <1ms
```

**Solutions**:

**Solution 1: Add database indexes**
```sql
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

**Solution 2: Optimize React Query cache**
```typescript
const profileQuery = useQuery({
  queryKey: ['user', 'profile'],
  queryFn: userService.getProfile,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
```

**Solution 3: Use selective Zustand selectors**
```typescript
// ❌ SLOW - Re-renders on any user state change
const user = useUserState();

// ✅ FAST - Only re-renders when profile changes
const profile = useAppStore((state) => state.user.profile);
```

---

## Common Error Messages

### "Cannot read property 'profile' of null"

**Cause**: Trying to access profile before it loads

**Solution**: Add null check
```typescript
const { profile } = useUserState();

if (!profile) {
  return <LoadingSpinner />;
}

return <div>{profile.name}</div>;
```

### "User preferences table doesn't exist"

**Cause**: Migration not applied

**Solution**: Run migration
```bash
cd backend
node apply-migration-007.js
```

### "Email already in use"

**Cause**: Trying to update to email that exists for another user

**Solution**: Show error to user
```typescript
try {
  await updateProfile({ email: 'test@test.com' });
} catch (error) {
  if (error.message.includes('already in use')) {
    setEmailError('This email is already registered');
  }
}
```

### "USER_LOGGED_IN is not defined"

**Cause**: Missing EVENTS import

**Solution**: Import EVENTS constant
```typescript
import { EVENTS } from '../../../infrastructure/events';

eventBus.emit(EVENTS.USER_LOGGED_IN, data);
```

---

## Emergency Procedures

### Complete State Reset

```javascript
// Browser console
import { useAppStore } from './infrastructure/store';
import { moduleStateSync } from './infrastructure/store/moduleSync';

// Nuclear option - clear everything
moduleStateSync.emergencyReset();
```

### Force Profile Reload

```javascript
// Browser console
import { queryClient } from './App';

queryClient.invalidateQueries(['user', 'profile']);
queryClient.invalidateQueries(['user', 'preferences']);
```

### Clear All Caches

```bash
# Frontend
cd frontend
rm -rf node_modules/.cache
npm run build

# Backend
cd backend
docker-compose restart backend

# Browser
# DevTools → Application → Clear storage
```

---

## Getting Help

### Before Asking for Help

1. Check this troubleshooting guide
2. Review implementation plan
3. Check data flow diagrams
4. Review testing strategy
5. Search for similar issues in git history

### Provide This Information

```
Problem: [Brief description]

Expected: [What should happen]

Actual: [What actually happens]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Environment:
- Branch: development-core
- Backend running: Yes/No
- Migration applied: Yes/No
- User logged in: Yes/No

Logs:
- Browser console: [Paste errors]
- Backend logs: [Paste errors]
- Network tab: [Screenshot or paste response]

Zustand State:
[Paste useAppStore.getState().user]

React Query Cache:
[Paste queryClient.getQueryData(['user', 'profile'])]
```

---

## Conclusion

This troubleshooting guide covers the most common issues encountered during and after the user module Zustand migration. Always start with the Quick Diagnostic Checklist and work systematically through the relevant problem category. Remember to check logs, state, and network requests at each step.
