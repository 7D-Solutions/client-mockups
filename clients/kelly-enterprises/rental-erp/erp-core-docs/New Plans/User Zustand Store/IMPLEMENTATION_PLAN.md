# User Module - SIMPLE Fix (45 Minutes)

**Date**: 2025-01-26
**Status**: Simplified approach - MUCH simpler than original plan

---

## 🎯 The Actual Problem

The user module has a **placeholder Zustand store** that doesn't actually work. That's it. Everything else already exists:

- ✅ UserContext exists with all business logic
- ✅ UserService exists and calls API
- ✅ Event bus integration exists
- ✅ The pattern is already defined

**The placeholder problem:**
```typescript
// Current placeholder (NOT REACTIVE)
const userStore = {
  profile: null,
  preferences: { /* hardcoded */ }
};

Object.assign(userStore, updates); // ❌ Not reactive!
```

---

## ❌ What We DON'T Need (Over-Engineering)

Looking at my original plan, I way over-complicated this:

1. ❌ **Separate `user_preferences` table** - Just add columns to `users` table
2. ❌ **4 separate endpoints** - Just need 1-2 endpoints total
3. ❌ **13 Zustand actions** - Only need 3 (already defined)
4. ❌ **React Query integration** - UserContext already handles API calls
5. ❌ **Complex state sync** - Not needed
6. ❌ **Extensive migration scripts** - Just ALTER TABLE
7. ❌ **Comprehensive testing suite** - Basic tests are fine

---

## ✅ The SIMPLE Solution (45 minutes total)

### Step 1: Backend (30 minutes)

**Add preference columns to users table:**

```sql
-- File: backend/migrations/007_user_preferences_simple.sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS theme ENUM('light', 'dark') DEFAULT 'light',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS gauge_alerts BOOLEAN DEFAULT TRUE;
```

**Add 1 endpoint to get user profile + preferences:**

```javascript
// File: backend/src/modules/user/routes/user.js
// Add after existing routes:

// GET /api/users/me - Get current user (profile + preferences)
router.get('/me', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;

  const [users] = await pool.execute(
    `SELECT id, username, name, email, phone, department, position, role,
            theme, language, timezone, email_notifications, gauge_alerts,
            created_at, updated_at, last_login
     FROM users WHERE id = ?`,
    [userId]
  );

  if (users.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const user = users[0];
  res.json({
    success: true,
    data: {
      // Profile
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      position: user.position,
      role: user.role,
      // Preferences
      preferences: {
        theme: user.theme,
        language: user.language,
        timezone: user.timezone,
        emailNotifications: user.email_notifications,
        gaugeAlerts: user.gauge_alerts,
      },
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login
    }
  });
}));

// PUT /api/users/me - Update user (profile + preferences)
router.put('/me', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;
  const { name, email, phone, theme, language, timezone, emailNotifications, gaugeAlerts } = req.body;

  await pool.execute(
    `UPDATE users
     SET name = ?, email = ?, phone = ?,
         theme = ?, language = ?, timezone = ?,
         email_notifications = ?, gauge_alerts = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [name, email, phone || null, theme, language, timezone,
     emailNotifications, gaugeAlerts, userId]
  );

  // Return updated user
  const [users] = await pool.execute(
    `SELECT id, username, name, email, phone, department, position, role,
            theme, language, timezone, email_notifications, gauge_alerts,
            created_at, updated_at, last_login
     FROM users WHERE id = ?`,
    [userId]
  );

  const user = users[0];
  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      position: user.position,
      role: user.role,
      preferences: {
        theme: user.theme,
        language: user.language,
        timezone: user.timezone,
        emailNotifications: user.email_notifications,
        gaugeAlerts: user.gauge_alerts,
      },
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login
    }
  });
}));
```

### Step 2: Frontend Service (5 minutes)

Update userService to use new endpoint:

```typescript
// File: frontend/src/modules/user/services/userService.ts
import { apiClient } from '../../../erp-core/src/core/data/apiClient';

export const userService = {
  async getProfile(): Promise<any> {
    const response = await apiClient.request('/users/me');
    return response.data;
  },

  async updateProfile(data: any): Promise<any> {
    return apiClient.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async updatePreferences(preferences: any): Promise<any> {
    // Same endpoint - just send preferences fields
    return apiClient.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  },

  async changePassword(data: any): Promise<void> {
    await apiClient.request('/users/password', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
};
```

### Step 3: Fix Zustand Store (10 minutes)

Replace placeholder with real Zustand store:

```typescript
// File: frontend/src/infrastructure/store/index.ts
// Find lines 494-546 and REPLACE with:

// User module state (add to AppState interface)
interface UserModuleState {
  profile: UserProfile | null;
  preferences: UserPreferences;
  isProfileLoading: boolean;
}

// Update AppState interface to include:
interface AppState {
  shared: SharedState;
  gauge: GaugeModuleState;
  admin: AdminModuleState;
  user: UserModuleState;  // ← ADD THIS

  // ... existing actions ...

  // User actions (add these 3)
  setProfile: (profile: UserProfile | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setProfileLoading: (loading: boolean) => void;
}

// In useAppStore create() call, add user state:
export const useAppStore = create<AppState>((set) => ({
  // ... existing gauge and admin states ...

  // User state
  user: {
    profile: null,
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      emailNotifications: true,
      gaugeAlerts: true,
    },
    isProfileLoading: false,
  },

  // User actions
  setProfile: (profile) =>
    set((state) => ({
      user: { ...state.user, profile }
    })),

  updatePreferences: (updates) =>
    set((state) => ({
      user: {
        ...state.user,
        preferences: { ...state.user.preferences, ...updates }
      }
    })),

  setProfileLoading: (loading) =>
    set((state) => ({
      user: { ...state.user, isProfileLoading: loading }
    })),
}));

// Selectors
export const useUserState = () => useAppStore((state) => state.user);

export const useUserActions = () => useAppStore((state) => ({
  setProfile: state.setProfile,
  updatePreferences: state.updatePreferences,
  setProfileLoading: state.setProfileLoading,
}));
```

---

## ✅ That's It!

Total changes:
- **Backend**: 1 migration (5 columns) + 2 routes (50 lines)
- **Frontend**: Update service (15 lines) + Fix Zustand (25 lines)
- **Total**: ~100 lines of code

### Testing (5 minutes)

```bash
# 1. Run migration
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < backend/migrations/007_user_preferences_simple.sql

# 2. Restart backend
docker-compose restart backend

# 3. Test in browser
# Login → Profile should load automatically
# Go to Settings → Changes should persist
# Reload page → State should survive
```

---

## 🚨 Why This is Better

**Original Plan:**
- New database table with foreign keys
- 4 separate endpoints (profile GET/PUT, preferences GET/PUT)
- 13 Zustand actions with complex state management
- React Query integration layer
- Separate backend service methods
- 100+ tests
- **Estimated time**: 15-20 hours

**Simple Plan:**
- 5 columns added to existing table
- 2 endpoints (GET/PUT /me)
- 3 Zustand actions (already defined in placeholder)
- Use existing UserContext business logic
- Simple direct queries
- Basic tests
- **Estimated time**: 45 minutes

**Why it works:**
- UserContext already has ALL the business logic
- userService already exists and makes API calls
- Event bus integration already exists
- We just need to make Zustand reactive and add backend endpoints
- Everything else already works!

---

## 📝 Migration Script

**File**: `backend/migrations/007_user_preferences_simple.sql`

```sql
-- Add preference columns to users table (idempotent)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS theme ENUM('light', 'dark') DEFAULT 'light',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS gauge_alerts BOOLEAN DEFAULT TRUE;

-- Set defaults for existing users
UPDATE users
SET theme = 'light',
    language = 'en',
    timezone = 'UTC',
    email_notifications = TRUE,
    gauge_alerts = TRUE
WHERE theme IS NULL;
```

Apply it:
```bash
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < backend/migrations/007_user_preferences_simple.sql
```

---

## 🎯 Key Insight

**The problem wasn't missing architecture - it was a non-reactive placeholder.**

Everything else (UserContext, userService, events, patterns) already exists and works correctly. We just need to:
1. Make Zustand reactive (replace Object.assign with real create())
2. Add backend endpoints for the API calls that already exist in userService
3. Done!

**Total time: 45 minutes vs. 15-20 hours**

---

## Next Steps

Want me to implement this simple version instead of the complex one?
