# Permission-Based Authorization - Simplified Long-Term Solution

**Date**: October 28, 2025
**Objective**: Clean, simple permission-based auth. Roles are optional templates only.
**Approach**: No backward compatibility. Clean break. Long-term solution.

---

## Executive Summary

**Current State**: Auth checks use `req.user.roles` (role-based)
**Target State**: Auth checks use `req.user.permissions` (permission-based)
**Role Purpose**: Optional template to bulk-assign permissions to new users
**Implementation**: Direct, clean, no migration complexity

---

## Core Principle

**Users have PERMISSIONS, not ROLES.**

- ✅ User must have specific permission to access feature
- ✅ Roles are optional groupings of permissions (templates)
- ✅ Assigning a role = copying its permissions to the user
- ✅ Removing a role does NOT remove user's permissions
- ✅ Users can have permissions without any role

---

## Database Changes

### 1. Create Direct Permission Table

```sql
-- New table for direct user permissions
CREATE TABLE core_user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_by INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255) DEFAULT NULL,

  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES core_permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES core_users(id),

  INDEX idx_user (user_id),
  INDEX idx_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COMMENT='Direct permission grants to users (not role-based)';
```

### 2. Update Existing Tables

```sql
-- Make role assignment optional
ALTER TABLE core_user_roles
  COMMENT='Optional role templates - for organizational purposes and bulk permission assignment';

-- Keep but clarify purpose
ALTER TABLE core_role_permissions
  COMMENT='Permission templates grouped by role - used when applying role to user';

-- Rename for clarity
ALTER TABLE core_user_permission_overrides
  COMMENT='Manual permission overrides - grants (1) or explicit denials (0)';
```

### 3. Populate User Permissions from Roles

```sql
-- One-time migration: Copy all role-based permissions to direct permissions
INSERT INTO core_user_permissions (user_id, permission_id, granted_by, notes)
SELECT DISTINCT
  ur.user_id,
  rp.permission_id,
  1, -- System user ID
  CONCAT('Migrated from role: ', r.name)
FROM core_user_roles ur
JOIN core_role_permissions rp ON ur.role_id = rp.role_id
JOIN core_roles r ON ur.role_id = r.id
ON DUPLICATE KEY UPDATE notes = VALUES(notes);
```

**Result**: All users keep their current permissions, but now stored directly.

---

## Backend Changes

### 1. Auth Middleware - Load Permissions

**File**: `backend/src/infrastructure/middleware/auth.js`

**Replace lines 51-86**:

```javascript
// Load user with ALL their permissions (direct + override grants - revokes)
const [users] = await pool.execute(`
  SELECT
    u.id,
    u.email,
    u.is_active,
    u.name,
    GROUP_CONCAT(DISTINCT CONCAT(p.module_id, '.', p.resource, '.', p.action)) as permissions
  FROM core_users u
  LEFT JOIN (
    -- Direct permissions
    SELECT user_id, permission_id FROM core_user_permissions

    UNION

    -- Override grants (not revocations)
    SELECT user_id, permission_id
    FROM core_user_permission_overrides
    WHERE granted = 1
  ) up ON u.id = up.user_id
  LEFT JOIN core_permissions p ON up.permission_id = p.id
  WHERE u.id = ? AND u.is_active = 1
  GROUP BY u.id
`, [verified.user_id]);

if (users.length === 0) {
  return res.status(401).json({
    success: false,
    error: 'Invalid token - user not found or inactive.'
  });
}

const user = users[0];
const permissionsArray = user.permissions ? user.permissions.split(',') : [];

// Simple, clean user object
req.user = {
  id: user.id,
  user_id: user.id, // Backward compat for existing code
  email: user.email,
  name: user.name || user.email,
  permissions: permissionsArray // PRIMARY authorization
};

console.log('[AUTH]', {
  userId: req.user.id,
  email: req.user.email,
  permissionCount: permissionsArray.length,
  path: req.path
});

next();
```

**Remove** (lines 77-84): All `roles` and `role` logic

### 2. Permission Middleware - Simplify

**File**: `backend/src/infrastructure/middleware/checkPermission.js`

**Replace** `checkPermission` function (lines 16-86):

```javascript
const checkPermission = (module, resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const requiredPermission = `${module}.${resource}.${action}`;

      // Simple check: does user have the permission?
      if (req.user.permissions?.includes(requiredPermission)) {
        return next();
      }

      // Not authorized
      return res.status(403).json({
        success: false,
        error: `Permission denied: ${requiredPermission} required`
      });

    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};
```

**Replace** `checkAnyPermission` function (lines 89-158):

```javascript
const checkAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userPermissions = req.user.permissions || [];

      // Check if user has ANY of the required permissions
      const hasPermission = permissions.some(p => {
        const required = `${p.module}.${p.resource}.${p.action}`;
        return userPermissions.includes(required);
      });

      if (hasPermission) {
        return next();
      }

      // Not authorized
      const permissionList = permissions
        .map(p => `${p.module}.${p.resource}.${p.action}`)
        .join(' OR ');

      return res.status(403).json({
        success: false,
        error: `Permission denied: ${permissionList} required`
      });

    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};
```

**Delete entirely**: `rbacMiddleware.js` (role-based middleware)

### 3. Remove All Role-Based Checks

**Find and remove/replace**:

```bash
# Find all role-based checks
grep -r "requireRole\|requireAnyRole\|req.user.role\|req.user.roles" backend/src/

# Replace with permission checks
requireRole('Admin') → checkPermission('admin', 'system', 'manage')
req.user.roles.includes('Admin') → req.user.permissions.includes('admin.system.manage')
```

---

## Frontend Changes

### 1. Remove Role Logic

**File**: `erp-core/src/core/auth/types.ts`

**Update User interface**:

```typescript
export interface User {
  id: number;
  email: string;
  name: string;
  permissions: string[]; // ONLY permissions, no roles
  [key: string]: any; // For extensibility
}
```

**Remove** `role` and `roles` fields entirely.

### 2. Update Auth Hook

**File**: `frontend/src/infrastructure/hooks/useAuth.tsx`

Remove all role-related returns:

```typescript
// OLD
return { user, permissions, roles, isAuthenticated, login, logout };

// NEW
return { user, permissions, isAuthenticated, login, logout };
```

### 3. Create Permission Constants

**File**: `frontend/src/infrastructure/permissions/index.ts` (NEW)

```typescript
/**
 * Centralized permission constants
 * MUST match database permissions exactly
 */
export const PERMISSIONS = {
  // Gauge Module
  GAUGE: {
    VIEW: 'gauge.gauges.read',
    CREATE: 'gauge.gauges.create',
    UPDATE: 'gauge.gauges.update',
    DELETE: 'gauge.gauges.delete',
    CHECKOUT: 'gauge.checkout.execute',
    CHECKIN: 'gauge.checkin.execute',
    TRANSFER: 'gauge.transfer.execute',
    CALIBRATE: 'gauge.calibration.record_internal',
    QC_APPROVE: 'gauge.qc.approve',
    UNSEAL_REQUEST: 'gauge.unseal.request',
    UNSEAL_APPROVE: 'gauge.unseal.approve',
  },

  // Admin Module
  ADMIN: {
    USERS_MANAGE: 'admin.users.manage',
    AUDIT_VIEW: 'auth.audit.view',
    SYSTEM_MANAGE: 'admin.system.manage',
  }
} as const;

// Helper functions
export function hasPermission(
  permissions: string[] | undefined,
  permission: string
): boolean {
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  permissions: string[] | undefined,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(p => permissions?.includes(p)) ?? false;
}

export function hasAllPermissions(
  permissions: string[] | undefined,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(p => permissions?.includes(p)) ?? false;
}
```

### 4. Update All Permission Checks

**Find and replace** across frontend:

```typescript
// ❌ OLD - Role checks
if (user?.role === 'Admin') { ... }
if (roles?.includes('QA')) { ... }
const isAdmin = roles?.includes('Admin');

// ✅ NEW - Permission checks
import { PERMISSIONS, hasPermission } from '@/infrastructure/permissions';

if (hasPermission(permissions, PERMISSIONS.ADMIN.SYSTEM_MANAGE)) { ... }
if (hasPermission(permissions, PERMISSIONS.GAUGE.QC_APPROVE)) { ... }
const canEdit = hasPermission(permissions, PERMISSIONS.GAUGE.UPDATE);
```

**Example files to update**:
- `GaugeDetail.tsx`: Change `canEdit` check
- `GaugeModalManager.tsx`: Remove role checks
- All admin pages
- All module pages

---

## Admin UI Changes

### 1. User Management - Add Permission Editor

**New Component**: `UserPermissionEditor.tsx`

```typescript
interface UserPermissionEditorProps {
  userId: number;
  currentPermissions: string[];
  onUpdate: (permissions: string[]) => void;
}

// Features:
- List all available permissions by module
- Checkbox interface to grant/revoke
- Search/filter permissions
- "Apply Role Template" button to bulk-add
- Shows what each permission allows
```

### 2. User Management - Role Template Applicator

**New Component**: `RoleTemplateSelector.tsx`

```typescript
// When creating/editing user:
1. Select role template (optional)
2. Shows preview of permissions role would grant
3. "Apply Template" copies permissions to user
4. User can then customize individual permissions
5. Removing template does NOT remove permissions
```

### 3. Update Existing Permission Lists

**Files to update**:
- `GaugeManagement.tsx`: Check permissions not roles
- `UserManagement.tsx`: Show permissions not roles
- Any admin pages with access control

---

## API Changes

### New Endpoints

```javascript
// User Permission Management
GET    /api/admin/users/:id/permissions        // Get user's permissions
POST   /api/admin/users/:id/permissions        // Add permission
DELETE /api/admin/users/:id/permissions/:pid   // Remove permission
POST   /api/admin/users/:id/apply-role/:roleId // Copy role permissions to user

// Permission Discovery
GET    /api/permissions                        // List all permissions
GET    /api/permissions/by-module/:module      // Filter by module
GET    /api/roles/:id/permissions              // Get role's permission template
```

### Example Implementation

```javascript
// POST /api/admin/users/:userId/permissions
router.post('/:userId/permissions',
  authenticateToken,
  checkPermission('admin', 'users', 'manage'),
  async (req, res) => {
    const { userId } = req.params;
    const { permissionId } = req.body;

    await pool.execute(
      'INSERT INTO core_user_permissions (user_id, permission_id, granted_by) VALUES (?, ?, ?)',
      [userId, permissionId, req.user.id]
    );

    res.json({ success: true });
  }
);
```

---

## Migration Steps

### Step 1: Database (1 day)
```bash
# Run migration script
node scripts/migrate-to-permissions.js

# Verifies:
1. core_user_permissions table created
2. All users have permissions copied from roles
3. All users can still access what they could before
```

### Step 2: Backend (2 days)
```bash
# Update files:
1. infrastructure/middleware/auth.js
2. infrastructure/middleware/checkPermission.js
3. Delete infrastructure/middleware/rbacMiddleware.js
4. Find/replace all requireRole calls
5. Add new permission management APIs
6. Test all endpoints
```

### Step 3: Frontend (2 days)
```bash
# Update files:
1. Create infrastructure/permissions/index.ts
2. Update erp-core/src/core/auth/types.ts
3. Update infrastructure/hooks/useAuth.tsx
4. Find/replace all role checks → permission checks
5. Create UserPermissionEditor component
6. Update UserManagement page
7. Test all UI flows
```

### Step 4: Testing (1 day)
```bash
# Test scenarios:
1. Create user without role ✓
2. Assign individual permissions ✓
3. Verify feature access ✓
4. Apply role template ✓
5. Remove permissions ✓
6. Permission overrides ✓
```

### Step 5: Deploy (1 day)
```bash
# Deployment:
1. Run database migration
2. Deploy backend
3. Deploy frontend
4. Monitor logs
5. Verify all users can login
6. Verify all features work
```

---

## Clean Breaks (No Backward Compatibility)

### What Gets Removed

✂️ `req.user.roles` → REMOVED
✂️ `req.user.role` → REMOVED
✂️ `requireRole()` → REMOVED
✂️ `requireAnyRole()` → REMOVED
✂️ `rbacMiddleware.js` → DELETED
✂️ All role-based UI checks → REPLACED

### What Stays

✅ `core_roles` table → Kept as permission templates
✅ `core_role_permissions` → Kept as permission templates
✅ `core_user_roles` → Kept for organizational display
✅ Role CRUD UI → Updated to show "template" purpose

---

## Success Criteria

1. ✅ User can be created without any role
2. ✅ User with permissions but no role can access features
3. ✅ Assigning role copies permissions (doesn't link)
4. ✅ Removing role keeps user's permissions
5. ✅ All auth checks use `permissions` not `roles`
6. ✅ Admin can manage individual permissions
7. ✅ Zero role-based checks in codebase
8. ✅ Clean, simple permission system

---

## Timeline

**Total**: 1 week

- Day 1: Database migration
- Day 2-3: Backend implementation
- Day 4-5: Frontend implementation
- Day 6: Testing
- Day 7: Deploy & verify

**No complexity. No backward compatibility. Just clean, simple permissions.**

---

## Next Action

Ready to implement? Let's start with:

1. Create database migration script
2. Update backend auth middleware
3. Create permission constants
4. Update one module (gauge) as proof of concept
5. Extend to all modules

**Simple. Clean. Long-term.**
