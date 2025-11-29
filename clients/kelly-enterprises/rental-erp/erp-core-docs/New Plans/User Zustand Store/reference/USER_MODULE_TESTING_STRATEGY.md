# User Module Testing Strategy

**Project**: Fire-Proof ERP Sandbox
**Purpose**: Comprehensive testing approach for user module Zustand migration

---

## Testing Pyramid

```
                    E2E (6 tests)
                   /           \
              Integration (5)   Manual (5)
             /                          \
        Unit Tests (20+)              API (8)
```

**Coverage Goals**:
- Unit Tests: >95%
- Integration Tests: >90%
- E2E Tests: Critical user paths
- API Tests: 100% endpoint coverage

---

## Layer 1: Unit Tests

### 1.1 Zustand Store Tests

**File**: `/frontend/src/infrastructure/store/userStore.test.ts`

**Test Cases** (15 tests):

#### State Initialization
```typescript
describe('Initial State', () => {
  it('should have null profile', () => {
    expect(useUserState().profile).toBeNull();
  });

  it('should have default preferences', () => {
    const prefs = useUserState().preferences;
    expect(prefs.theme).toBe('light');
    expect(prefs.language).toBe('en');
    expect(prefs.emailNotifications).toBe(true);
  });

  it('should have false loading states', () => {
    const state = useUserState();
    expect(state.isProfileLoading).toBe(false);
    expect(state.isPreferencesLoading).toBe(false);
  });

  it('should have null error states', () => {
    const state = useUserState();
    expect(state.profileError).toBeNull();
    expect(state.preferencesError).toBeNull();
  });

  it('should have empty activity and sessions', () => {
    const state = useUserState();
    expect(state.activity).toEqual([]);
    expect(state.sessions).toEqual([]);
  });
});
```

#### Profile Actions
```typescript
describe('Profile Actions', () => {
  it('should set profile', () => {
    const actions = useUserActions();
    const profile = createMockProfile();

    actions.setProfile(profile);

    expect(useUserState().profile).toEqual(profile);
  });

  it('should clear profile', () => {
    const actions = useUserActions();

    actions.setProfile(createMockProfile());
    actions.setProfile(null);

    expect(useUserState().profile).toBeNull();
  });

  it('should update cache timestamp on setProfile', () => {
    const actions = useUserActions();
    const before = Date.now();

    actions.setProfile(createMockProfile());

    const timestamp = useUserState().lastProfileFetch;
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should clear profile error on setProfile', () => {
    const actions = useUserActions();

    actions.setProfileError('Test error');
    actions.setProfile(createMockProfile());

    expect(useUserState().profileError).toBeNull();
  });
});
```

#### Preferences Actions
```typescript
describe('Preferences Actions', () => {
  it('should set preferences', () => {
    const actions = useUserActions();
    const prefs = createMockPreferences();

    actions.setPreferences(prefs);

    expect(useUserState().preferences).toEqual(prefs);
  });

  it('should update preferences partially', () => {
    const actions = useUserActions();

    actions.updatePreferences({ theme: 'dark' });
    expect(useUserState().preferences.theme).toBe('dark');
    expect(useUserState().preferences.language).toBe('en'); // Unchanged

    actions.updatePreferences({ language: 'es', emailNotifications: false });
    expect(useUserState().preferences.language).toBe('es');
    expect(useUserState().preferences.emailNotifications).toBe(false);
    expect(useUserState().preferences.theme).toBe('dark'); // Still dark
  });

  it('should update cache timestamp on setPreferences', () => {
    const actions = useUserActions();
    const before = Date.now();

    actions.setPreferences(createMockPreferences());

    expect(useUserState().lastPreferencesFetch).toBeGreaterThanOrEqual(before);
  });

  it('should clear preferences error on setPreferences', () => {
    const actions = useUserActions();

    actions.setPreferencesError('Test error');
    actions.setPreferences(createMockPreferences());

    expect(useUserState().preferencesError).toBeNull();
  });
});
```

#### Loading States
```typescript
describe('Loading State Actions', () => {
  it('should set profile loading', () => {
    const actions = useUserActions();

    actions.setProfileLoading(true);
    expect(useUserState().isProfileLoading).toBe(true);

    actions.setProfileLoading(false);
    expect(useUserState().isProfileLoading).toBe(false);
  });

  it('should set preferences loading', () => {
    const actions = useUserActions();

    actions.setPreferencesLoading(true);
    expect(useUserState().isPreferencesLoading).toBe(true);

    actions.setPreferencesLoading(false);
    expect(useUserState().isPreferencesLoading).toBe(false);
  });

  it('should set saving states independently', () => {
    const actions = useUserActions();

    actions.setSavingProfile(true);
    actions.setSavingPreferences(false);

    expect(useUserState().isSavingProfile).toBe(true);
    expect(useUserState().isSavingPreferences).toBe(false);
  });
});
```

#### Error States
```typescript
describe('Error State Actions', () => {
  it('should set profile error', () => {
    const actions = useUserActions();

    actions.setProfileError('Profile error');
    expect(useUserState().profileError).toBe('Profile error');
  });

  it('should clear profile error', () => {
    const actions = useUserActions();

    actions.setProfileError('Error');
    actions.setProfileError(null);

    expect(useUserState().profileError).toBeNull();
  });

  it('should set preferences error independently', () => {
    const actions = useUserActions();

    actions.setProfileError('Profile error');
    actions.setPreferencesError('Preferences error');

    expect(useUserState().profileError).toBe('Profile error');
    expect(useUserState().preferencesError).toBe('Preferences error');
  });
});
```

#### Clear User Data
```typescript
describe('Clear User Data', () => {
  it('should reset all state to initial values', () => {
    const actions = useUserActions();

    // Set some data
    actions.setProfile(createMockProfile());
    actions.updatePreferences({ theme: 'dark' });
    actions.setProfileError('Error');
    actions.setUserActivity([createMockActivity()]);

    // Clear
    actions.clearUserData();

    // Verify complete reset
    const state = useUserState();
    expect(state.profile).toBeNull();
    expect(state.preferences.theme).toBe('light');
    expect(state.profileError).toBeNull();
    expect(state.activity).toEqual([]);
    expect(state.lastProfileFetch).toBe(0);
  });
});
```

#### Cache Management
```typescript
describe('Cache Management', () => {
  it('should update profile cache with timestamp', () => {
    const actions = useUserActions();
    const before = Date.now();

    actions.updateProfileCache(createMockProfile());

    const state = useUserState();
    expect(state.profile).not.toBeNull();
    expect(state.lastProfileFetch).toBeGreaterThanOrEqual(before);
    expect(state.profileError).toBeNull();
  });

  it('should update preferences cache with timestamp', () => {
    const actions = useUserActions();
    const before = Date.now();

    actions.updatePreferencesCache(createMockPreferences());

    const state = useUserState();
    expect(state.lastPreferencesFetch).toBeGreaterThanOrEqual(before);
    expect(state.preferencesError).toBeNull();
  });
});
```

### 1.2 Service Layer Tests

**File**: `/frontend/src/modules/user/services/userService.test.ts`

**Test Cases** (5 tests):

```typescript
import { userService } from './userService';
import { apiClient } from '../../../infrastructure/api/client';

jest.mock('../../../infrastructure/api/client');

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should fetch and transform profile data', async () => {
      const mockResponse = {
        id: '123',
        username: 'johndoe',
        name: 'John Doe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      apiClient.request.mockResolvedValue({ data: mockResponse });

      const profile = await userService.getProfile();

      expect(apiClient.request).toHaveBeenCalledWith('/auth/me');
      expect(profile.id).toBe('123');
      expect(profile.createdAt).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle response without data wrapper', async () => {
      const mockResponse = {
        id: '123',
        email: 'test@test.com',
      };

      apiClient.request.mockResolvedValue(mockResponse);

      const profile = await userService.getProfile();

      expect(profile.id).toBe('123');
    });
  });

  describe('updateProfile', () => {
    it('should send PUT request with profile data', async () => {
      const updates = { name: 'New Name', phone: '555-1234' };
      const mockResponse = { data: { id: '123', ...updates } };

      apiClient.request.mockResolvedValue(mockResponse);

      const result = await userService.updateProfile(updates);

      expect(apiClient.request).toHaveBeenCalledWith('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      expect(result.name).toBe('New Name');
    });
  });

  describe('getPreferences', () => {
    it('should fetch preferences from API', async () => {
      const mockPrefs = {
        theme: 'dark',
        language: 'es',
        emailNotifications: false,
      };

      apiClient.request.mockResolvedValue({ data: mockPrefs });

      const prefs = await userService.getPreferences();

      expect(apiClient.request).toHaveBeenCalledWith('/user/preferences');
      expect(prefs.theme).toBe('dark');
      expect(prefs.language).toBe('es');
    });

    it('should provide defaults for missing fields', async () => {
      apiClient.request.mockResolvedValue({ data: { theme: 'dark' } });

      const prefs = await userService.getPreferences();

      expect(prefs.theme).toBe('dark');
      expect(prefs.language).toBe('en'); // Default
      expect(prefs.timezone).toBe('UTC'); // Default
    });
  });

  describe('updatePreferences', () => {
    it('should send PUT request with preferences', async () => {
      const updates = { theme: 'dark', itemsPerPage: 100 };
      const mockResponse = { data: updates };

      apiClient.request.mockResolvedValue(mockResponse);

      await userService.updatePreferences(updates);

      expect(apiClient.request).toHaveBeenCalledWith('/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    });
  });
});
```

---

## Layer 2: Integration Tests

### 2.1 Auth → User State Sync

**File**: `/frontend/tests/integration/auth-user-sync.test.tsx`

**Test Cases** (5 tests):

```typescript
describe('Auth → User State Integration', () => {
  it('should initialize user state on login event', async () => {
    // Mock API responses
    mockApiClient.post('/auth/login').resolves({ user: mockUser });
    mockApiClient.request('/auth/me').resolves({ data: mockProfile });

    // Login
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login({ identifier: 'test@test.com', password: 'test' });
    });

    // Verify event emitted
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      EVENTS.USER_LOGGED_IN,
      expect.objectContaining({ id: mockUser.id })
    );

    // Verify user state updated
    await waitFor(() => {
      const userState = useUserState();
      expect(userState.profile).not.toBeNull();
    });
  });

  it('should clear user state on logout event', async () => {
    // Setup: Login first
    const actions = useUserActions();
    actions.setProfile(mockProfile);

    // Logout
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });

    // Verify event emitted
    expect(mockEventBus.emit).toHaveBeenCalledWith(EVENTS.USER_LOGGED_OUT, expect.any(String));

    // Verify state cleared
    await waitFor(() => {
      expect(useUserState().profile).toBeNull();
    });
  });

  it('should reload profile on permission change event', async () => {
    // Setup
    const { result } = renderHook(() => useUser());

    // Emit permission change
    act(() => {
      eventBus.emit(EVENTS.USER_PERMISSIONS_CHANGED, { userId: '123' });
    });

    // Verify loadProfile called
    await waitFor(() => {
      expect(mockApiClient.request).toHaveBeenCalledWith('/auth/me');
    });
  });

  it('should persist session across page reload', async () => {
    // Mock session validation
    mockApiClient.request('/auth/me').resolves({ data: mockProfile });

    // Render AuthProvider
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    // Wait for session validation
    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    // Verify USER_LOGGED_IN emitted on validation
    expect(mockEventBus.emit).toHaveBeenCalledWith(EVENTS.USER_LOGGED_IN, expect.any(Object));
  });

  it('should handle failed session validation gracefully', async () => {
    // Mock failed validation
    mockApiClient.request('/auth/me').rejects(new Error('Unauthorized'));

    // Render AuthProvider
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    // Wait for validation attempt
    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    // Verify no event emitted
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(EVENTS.USER_LOGGED_IN, expect.any(Object));
  });
});
```

### 2.2 UserProvider → Zustand Sync

**File**: `/frontend/tests/integration/user-provider-zustand.test.tsx`

```typescript
describe('UserProvider → Zustand Integration', () => {
  it('should sync loadProfile to Zustand', async () => {
    mockApiClient.request('/auth/me').resolves({ data: mockProfile });

    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
    });

    await act(async () => {
      await result.current.loadProfile();
    });

    // Verify Zustand updated
    const userState = useUserState();
    expect(userState.profile).toEqual(mockProfile);
    expect(userState.isProfileLoading).toBe(false);
  });

  it('should sync updateProfile to Zustand', async () => {
    const updates = { name: 'Updated Name' };
    mockApiClient.request('/user/profile', { method: 'PUT' })
      .resolves({ data: { ...mockProfile, ...updates } });

    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
    });

    await act(async () => {
      await result.current.updateProfile(updates);
    });

    // Verify Zustand updated
    expect(useUserState().profile.name).toBe('Updated Name');
  });

  it('should sync savePreferences to Zustand', async () => {
    const updates = { theme: 'dark' };
    mockApiClient.request('/user/preferences', { method: 'PUT' })
      .resolves({ data: { ...mockPreferences, ...updates } });

    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
    });

    await act(async () => {
      await result.current.savePreferences(updates);
    });

    // Verify Zustand updated
    expect(useUserState().preferences.theme).toBe('dark');
  });

  it('should handle errors and update Zustand error state', async () => {
    mockApiClient.request('/user/profile', { method: 'PUT' })
      .rejects(new Error('Update failed'));

    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
    });

    await act(async () => {
      try {
        await result.current.updateProfile({ name: 'Test' });
      } catch (error) {
        // Expected
      }
    });

    // Verify error in Zustand
    expect(useUserState().profileError).toBe('Update failed');
  });
});
```

### 2.3 React Query → Zustand Sync

**File**: `/frontend/tests/integration/react-query-zustand.test.tsx`

```typescript
describe('React Query → Zustand Integration', () => {
  it('should sync query success to Zustand', async () => {
    mockApiClient.request('/auth/me').resolves({ data: mockProfile });

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    // Wait for query to complete
    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });

    // Verify Zustand cache updated
    const userState = useUserState();
    expect(userState.profile).toEqual(mockProfile);
    expect(userState.lastProfileFetch).toBeGreaterThan(0);
  });

  it('should sync mutation success to Zustand', async () => {
    const updatedProfile = { ...mockProfile, name: 'Updated' };
    mockApiClient.request('/user/profile', { method: 'PUT' })
      .resolves({ data: updatedProfile });

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    // Trigger mutation
    await act(async () => {
      result.current.updateProfile({ name: 'Updated' });
    });

    // Wait for mutation
    await waitFor(() => {
      expect(result.current.isUpdatingProfile).toBe(false);
    });

    // Verify Zustand updated
    expect(useUserState().profile.name).toBe('Updated');
  });

  it('should sync mutation errors to Zustand', async () => {
    mockApiClient.request('/user/profile', { method: 'PUT' })
      .rejects(new Error('Validation failed'));

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    // Trigger mutation
    await act(async () => {
      result.current.updateProfile({ name: '' });
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.updateProfileError).not.toBeNull();
    });

    // Verify Zustand error state
    expect(useUserState().profileError).toBe('Validation failed');
  });
});
```

---

## Layer 3: Backend API Tests

### 3.1 Profile Endpoints

**File**: `/backend/tests/modules/user/integration/UserProfile.integration.test.js`

**Test Cases** (8 tests):

```javascript
describe('User Profile API', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'test@example.com', password: 'Test123!' });

    authToken = loginResponse.body.token;
    testUserId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/user/profile', () => {
    it('should return user profile with valid auth', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        name: expect.any(String),
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/user/profile');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should update user profile successfully', async () => {
      const updates = {
        name: 'Updated Name',
        phone: '555-1234',
        department: 'Engineering',
        position: 'Developer',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.phone).toBe('555-1234');
    });

    it('should reject update without required fields', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: '555-1234' }); // Missing name and email

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      // Create second user
      const conn = await pool.getConnection();
      await conn.execute(
        `INSERT INTO users (username, email, password, name)
         VALUES (?, ?, ?, ?)`,
        ['testuser2', 'test2@example.com', 'hashed', 'Test User 2']
      );
      conn.release();

      // Try to update with existing email
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', email: 'test2@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already in use');
    });

    it('should create audit log entry on profile update', async () => {
      await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Audit Test', email: 'audit@test.com' });

      // Check audit log
      const conn = await pool.getConnection();
      const [logs] = await conn.execute(
        `SELECT * FROM audit_logs
         WHERE user_id = ? AND action = 'user.profile.updated'
         ORDER BY timestamp DESC LIMIT 1`,
        [testUserId]
      );
      conn.release();

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('user.profile.updated');
    });
  });

  describe('GET /api/user/preferences', () => {
    it('should return user preferences', async () => {
      const response = await request(app)
        .get('/api/user/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        theme: expect.stringMatching(/light|dark|auto/),
        language: expect.any(String),
        emailNotifications: expect.any(Boolean),
      });
    });

    it('should create default preferences if not exist', async () => {
      // Delete preferences for test user
      const conn = await pool.getConnection();
      await conn.execute('DELETE FROM user_preferences WHERE user_id = ?', [testUserId]);
      conn.release();

      const response = await request(app)
        .get('/api/user/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.theme).toBe('light'); // Default
    });
  });

  describe('PUT /api/user/preferences', () => {
    it('should update user preferences', async () => {
      const updates = {
        theme: 'dark',
        language: 'es',
        emailNotifications: false,
        itemsPerPage: 100,
      };

      const response = await request(app)
        .put('/api/user/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.data.theme).toBe('dark');
      expect(response.body.data.language).toBe('es');
      expect(response.body.data.emailNotifications).toBe(false);
    });

    it('should ignore invalid preference keys', async () => {
      const response = await request(app)
        .put('/api/user/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ theme: 'dark', invalidKey: 'shouldBeIgnored' });

      expect(response.status).toBe(200);
      expect(response.body.data).not.toHaveProperty('invalidKey');
    });

    it('should update only specified preferences', async () => {
      // Get current preferences
      const current = await request(app)
        .get('/api/user/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      // Update only theme
      await request(app)
        .put('/api/user/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ theme: 'dark' });

      // Get updated preferences
      const updated = await request(app)
        .get('/api/user/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      // Theme changed, others unchanged
      expect(updated.body.data.theme).toBe('dark');
      expect(updated.body.data.language).toBe(current.body.data.language);
      expect(updated.body.data.emailNotifications).toBe(current.body.data.emailNotifications);
    });
  });
});
```

---

## Layer 4: E2E Tests

### 4.1 User Profile E2E

**File**: `/frontend/tests/e2e/user-profile.spec.ts`

**Test Cases** (6 tests):

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Profile E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3001/login');
    await page.fill('input[name="identifier"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/gauges/**');
  });

  test('should load profile on login', async ({ page }) => {
    await page.goto('http://localhost:3001/user/profile');

    // Profile should be loaded
    await expect(page.locator('input[name="name"]')).toHaveValue(/./);
    await expect(page.locator('input[name="email"]')).toHaveValue(/@/);

    // No loading spinner
    await expect(page.locator('.loading-spinner')).not.toBeVisible();
  });

  test('should update profile successfully', async ({ page }) => {
    await page.goto('http://localhost:3001/user/profile');

    const newName = `Test User ${Date.now()}`;

    // Update fields
    await page.fill('input[name="name"]', newName);
    await page.fill('input[name="phone"]', '555-9999');

    // Save
    await page.click('button:has-text("Save")');

    // Wait for success notification
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText('Profile Updated');

    // Reload and verify persistence
    await page.reload();
    await expect(page.locator('input[name="name"]')).toHaveValue(newName);
    await expect(page.locator('input[name="phone"]')).toHaveValue('555-9999');
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('http://localhost:3001/user/profile');

    // Clear name
    await page.fill('input[name="name"]', '');

    // Try to save
    await page.click('button:has-text("Save")');

    // Should show error
    await expect(page.locator('.error-message')).toContainText('required');

    // Should not save
    await expect(page.locator('.toast-success')).not.toBeVisible();
  });

  test('should persist state across navigation', async ({ page }) => {
    await page.goto('http://localhost:3001/user/profile');

    // Get current name
    const name = await page.inputValue('input[name="name"]');

    // Navigate away
    await page.goto('http://localhost:3001/gauges/list');

    // Navigate back
    await page.goto('http://localhost:3001/user/profile');

    // Should still have profile loaded (from Zustand)
    await expect(page.locator('input[name="name"]')).toHaveValue(name);
  });

  test('should update preferences and apply theme', async ({ page }) => {
    await page.goto('http://localhost:3001/user/settings');

    // Change theme to dark
    await page.selectOption('select[name="theme"]', 'dark');

    // Save
    await page.click('button:has-text("Save")');

    // Wait for success
    await expect(page.locator('.toast-success')).toBeVisible();

    // Theme should be applied
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Reload and verify persistence
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('select[name="theme"]')).toHaveValue('dark');
  });

  test('should clear state on logout', async ({ page }) => {
    await page.goto('http://localhost:3001/user/profile');

    // Verify logged in
    await expect(page.locator('input[name="email"]')).toHaveValue(/./);

    // Logout
    await page.click('button[aria-label="User menu"]');
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await page.waitForURL('**/login');

    // Try to access profile
    await page.goto('http://localhost:3001/user/profile');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});
```

---

## Testing Infrastructure

### Test Data Factories

**File**: `/frontend/tests/factories/userFactory.ts`

```typescript
import type { UserProfile, UserPreferences, UserActivity, UserSession } from '../../src/modules/user/types';

export const createMockProfile = (overrides?: Partial<UserProfile>): UserProfile => ({
  id: '123',
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  phone: '555-1234',
  department: 'Engineering',
  position: 'Developer',
  role: 'Admin',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  lastLogin: '2024-01-20T00:00:00Z',
  ...overrides,
});

export const createMockPreferences = (overrides?: Partial<UserPreferences>): UserPreferences => ({
  theme: 'light',
  language: 'en',
  timezone: 'UTC',
  emailNotifications: true,
  pushNotifications: false,
  gaugeAlerts: true,
  maintenanceReminders: true,
  defaultView: 'list',
  itemsPerPage: 50,
  ...overrides,
});

export const createMockActivity = (overrides?: Partial<UserActivity>): UserActivity => ({
  id: '1',
  action: 'user.login',
  resource: 'auth',
  resourceId: '123',
  details: {},
  timestamp: new Date().toISOString(),
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0',
  ...overrides,
});

export const createMockSession = (overrides?: Partial<UserSession>): UserSession => ({
  id: '1',
  userId: '123',
  deviceInfo: 'Chrome on Windows',
  ipAddress: '127.0.0.1',
  location: 'New York, US',
  isActive: true,
  isCurrent: true,
  createdAt: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});
```

### Mock Setup

**File**: `/frontend/tests/setup.ts`

```typescript
import { vi } from 'vitest';

// Mock API client
export const mockApiClient = {
  request: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../src/infrastructure/api/client', () => ({
  apiClient: mockApiClient,
}));

// Mock event bus
export const mockEventBus = {
  emit: vi.fn(),
  on: vi.fn(() => vi.fn()), // Returns unsubscribe function
  off: vi.fn(),
};

vi.mock('../src/infrastructure/events', () => ({
  eventBus: mockEventBus,
  EVENTS: {
    USER_LOGGED_IN: 'user:logged_in',
    USER_LOGGED_OUT: 'user:logged_out',
    USER_PERMISSIONS_CHANGED: 'user:permissions_changed',
  },
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## Test Coverage Goals

### Coverage Metrics

**Target Coverage**:
- Statements: >95%
- Branches: >90%
- Functions: >95%
- Lines: >95%

**Run Coverage**:
```bash
cd frontend
npm run test:coverage
```

**Coverage Report Locations**:
- HTML: `/frontend/coverage/lcov-report/index.html`
- JSON: `/frontend/coverage/coverage-final.json`
- Console: Terminal output

### Critical Paths (Must Have 100% Coverage)

1. **Zustand Store Actions**: All 13 user actions
2. **User Service**: All API methods
3. **Event Handling**: Login, logout, permission changes
4. **Error Handling**: All error paths in service/context
5. **Cache Management**: Profile and preferences cache updates

---

## Performance Testing

### Performance Benchmarks

**Metrics to Track**:
- Profile load: <1 second
- Profile update: <500ms
- Preferences update: <300ms
- Zustand state update: <1ms
- Theme switch: <100ms

**Performance Test**:
```typescript
describe('Performance', () => {
  it('should update Zustand state in <1ms', () => {
    const actions = useUserActions();
    const start = performance.now();

    actions.updatePreferences({ theme: 'dark' });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1);
  });

  it('should handle rapid state updates', async () => {
    const actions = useUserActions();

    // 1000 rapid updates
    for (let i = 0; i < 1000; i++) {
      actions.updatePreferences({ itemsPerPage: i });
    }

    // Should not crash or slow down
    expect(useUserState().preferences.itemsPerPage).toBe(999);
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: User Module Tests

on:
  push:
    paths:
      - 'backend/src/modules/user/**'
      - 'frontend/src/modules/user/**'
      - 'frontend/src/infrastructure/store/**'
  pull_request:
    paths:
      - 'backend/src/modules/user/**'
      - 'frontend/src/modules/user/**'
      - 'frontend/src/infrastructure/store/**'

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd backend && npm install
      - name: Run user module tests
        run: cd backend && npm test -- tests/modules/user/
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm install
      - name: Run unit tests
        run: cd frontend && npm run test:coverage
      - name: Run integration tests
        run: cd frontend && npm test -- tests/integration/
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Start services
        run: docker-compose -f docker-compose.dev.yml up -d
      - name: Run E2E tests
        run: cd frontend && npm run test:e2e -- tests/e2e/user-profile.spec.ts
      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results
          path: frontend/test-results/
```

---

## Quality Gates

### Pre-Commit Checks
- ✅ Unit tests pass
- ✅ Linter passes
- ✅ Type check passes
- ✅ No console.log statements

### Pre-Push Checks
- ✅ All tests pass (unit + integration)
- ✅ Coverage >95%
- ✅ No TypeScript errors
- ✅ Architecture validation passes

### Pre-Merge Checks
- ✅ E2E tests pass
- ✅ Backend integration tests pass
- ✅ Manual test scenarios complete
- ✅ Code review approved
- ✅ Documentation updated

---

## Test Maintenance

### When to Update Tests

1. **New Feature**: Add tests for new functionality
2. **Bug Fix**: Add test reproducing bug before fix
3. **Refactor**: Update tests to match new structure
4. **API Change**: Update tests for new contract
5. **Type Change**: Update type assertions

### Test Review Checklist

- [ ] Tests are isolated (no dependencies between tests)
- [ ] Tests are deterministic (same result every time)
- [ ] Tests are fast (<100ms per test)
- [ ] Tests have clear names
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] Mock data realistic

---

## Conclusion

This comprehensive testing strategy ensures the user module Zustand migration is thoroughly validated at all levels: unit, integration, API, and E2E. Following this strategy will result in high-quality, production-ready code with >95% test coverage.
