# Permission-Based Authorization - Correct Implementation

**Analysis Date**: October 28, 2025
**Status**: Deep analysis complete
**Approach**: Minimal viable change, no fluff

---

## Analysis Results

### Current Role Usage

**Backend** (3 files use roles):
- `admin.js` - 2 role checks in user management
- `gauges-v2.js` - 1 role check for audit logging
- `auth.js` - Loads roles for all users

**Frontend** (8 role checks):
- `permissionRules.ts` - Centralized role checking utility (38-59)
- `UserManagement.tsx` - Super admin check (292)
- `RoleManagement.tsx` - UI filtering only (80-81)

### Database State

System has:
- `core_permissions` table ✓
- `core_role_permissions` table ✓
- `core_user_roles` table ✓
- Users have roles assigned ✓

Missing:
- `core_user_permissions` table ✗

---

## What Actually Needs to Happen

### 1. Database - ONE TABLE

```sql
CREATE TABLE core_user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES core_permissions(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Copy existing role permissions to user permissions
INSERT INTO core_user_permissions (user_id, permission_id)
SELECT ur.user_id, rp.permission_id
FROM core_user_roles ur
JOIN core_role_permissions rp ON ur.role_id = rp.role_id;
```

**Why this schema**:
- No `granted_by` - Don't need it. We know it came from role migration.
- No extra indexes - Only query by user_id.
- No `granted_at` needed but costs nothing, keep for basic audit.

### 2. Backend - TWO FILE CHANGES

**File 1**: `backend/src/infrastructure/middleware/auth.js`

Change the query (lines 51-77):

```javascript
const [users] = await pool.execute(`
  SELECT
    u.id, u.email, u.is_active, u.name,
    GROUP_CONCAT(DISTINCT CONCAT(p.module_id, '.', p.resource, '.', p.action)) as permissions
  FROM core_users u
  LEFT JOIN core_user_permissions up ON u.id = up.user_id
  LEFT JOIN core_permissions p ON up.permission_id = p.id
  WHERE u.id = ? AND u.is_active = 1
  GROUP BY u.id
`, [verified.user_id]);

const user = users[0];

req.user = {
  id: user.id,
  email: user.email,
  name: user.name,
  permissions: user.permissions ? user.permissions.split(',') : []
};
```

**File 2**: `backend/src/infrastructure/middleware/checkPermission.js`

Simplify both functions:

```javascript
const checkPermission = (module, resource, action) => {
  return (req, res, next) => {
    const required = `${module}.${resource}.${action}`;
    if (req.user?.permissions?.includes(required)) {
      return next();
    }
    return res.status(403).json({ error: `Permission denied: ${required}` });
  };
};

const checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    const userPerms = req.user?.permissions || [];
    const hasAny = permissions.some(p =>
      userPerms.includes(`${p.module}.${p.resource}.${p.action}`)
    );
    if (hasAny) return next();
    return res.status(403).json({ error: 'Permission denied' });
  };
};
```

**File 3**: Delete `backend/src/infrastructure/middleware/rbacMiddleware.js`

**File 4-6**: Fix 3 role checks:
- `admin.js` lines 250, 327 - Change to permission check
- `gauges-v2.js` line 390 - Remove role from audit log

### 3. Frontend - ONE FILE + UPDATES

**New File**: `frontend/src/infrastructure/permissions/index.ts`

```typescript
export const PERMISSIONS = {
  ADMIN: {
    MANAGE_USERS: 'admin.users.manage',
    VIEW_AUDIT: 'auth.audit.view',
  }
} as const;

export const hasPermission = (perms: string[] | undefined, perm: string) =>
  perms?.includes(perm) ?? false;
```

**Update File**: `frontend/src/infrastructure/business/permissionRules.ts`

Replace role checks with permission checks:

```typescript
// OLD (lines 33-42)
isAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    user.roles?.includes('admin') ||
    user.roles?.includes('super_admin') ||
    false
  );
}

// NEW
isAdmin(user: any): boolean {
  return user?.permissions?.includes('admin.system.manage') ?? false;
}
```

**Update File**: `frontend/src/modules/admin/pages/UserManagement.tsx` line 292

```typescript
// OLD
const currentUserIsSuperAdmin = currentUser?.roles?.includes('super_admin');

// NEW
const currentUserIsSuperAdmin = hasPermission(currentUser?.permissions, PERMISSIONS.ADMIN.MANAGE_USERS);
```

**Skip**: RoleManagement.tsx lines 80-81 - Just UI filtering, not auth

---

## Implementation Steps

### Step 1: Database (10 min)

```bash
# Create migration file
cat > backend/src/infrastructure/database/migrations/013-add-user-permissions.sql << 'EOF'
CREATE TABLE IF NOT EXISTS core_user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES core_permissions(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

INSERT INTO core_user_permissions (user_id, permission_id)
SELECT DISTINCT ur.user_id, rp.permission_id
FROM core_user_roles ur
JOIN core_role_permissions rp ON ur.role_id = rp.role_id
ON DUPLICATE KEY UPDATE granted_at = granted_at;
EOF

# Run it
mysql -h host.docker.internal -P 3307 -u fai_user -pfai_password_secure fai_db_sandbox < backend/src/infrastructure/database/migrations/013-add-user-permissions.sql
```

### Step 2: Backend (30 min)

1. Update `auth.js` - change query
2. Update `checkPermission.js` - simplify functions
3. Delete `rbacMiddleware.js`
4. Fix 3 role checks in routes
5. Test login still works

### Step 3: Frontend (30 min)

1. Create `permissions/index.ts`
2. Update `permissionRules.ts`
3. Update `UserManagement.tsx`
4. Test admin access works

### Step 4: Verify (15 min)

1. Login as user
2. Check can access features
3. Try creating user without role
4. Grant permission directly (via SQL for now)
5. Verify access works

**Total: 90 minutes**

---

## What About Admin UI?

**Not now. Do later when needed.**

To manage permissions temporarily:

```sql
-- Grant permission to user
INSERT INTO core_user_permissions (user_id, permission_id)
VALUES (123, 45);

-- Revoke permission
DELETE FROM core_user_permissions
WHERE user_id = 123 AND permission_id = 45;

-- See user's permissions
SELECT p.module_id, p.resource, p.action
FROM core_user_permissions up
JOIN core_permissions p ON up.permission_id = p.id
WHERE up.user_id = 123;
```

Build UI when you actually need it.

---

## What About Roles?

**Keep them. Use as templates.**

To apply "Admin" role template to user:

```sql
INSERT INTO core_user_permissions (user_id, permission_id)
SELECT 123, rp.permission_id
FROM core_role_permissions rp
WHERE rp.role_id = (SELECT id FROM core_roles WHERE name = 'Admin');
```

Role just copies permissions to user. That's it.

---

## Rollback

```sql
DROP TABLE core_user_permissions;
```

Revert code changes. Done.

---

## Files Changed Summary

**Database**:
- 1 new table
- 1 migration query

**Backend** (6 files):
- `auth.js` - Change 1 query
- `checkPermission.js` - Simplify 2 functions
- `rbacMiddleware.js` - DELETE
- `admin.js` - Fix 2 role checks
- `gauges-v2.js` - Fix 1 role check

**Frontend** (3 files):
- `permissions/index.ts` - CREATE
- `permissionRules.ts` - Fix 2 functions
- `UserManagement.tsx` - Fix 1 check

**Total**: 10 file changes, 90 minutes

---

## Missing Permissions Analysis

Need to ensure these permissions exist in database:

```sql
-- Check what permissions exist
SELECT module_id, resource, action FROM core_permissions ORDER BY module_id, resource, action;

-- If missing, add:
INSERT INTO core_permissions (module_id, resource, action, description) VALUES
('admin', 'system', 'manage', 'Full system administration'),
('admin', 'users', 'manage', 'Manage user accounts'),
('auth', 'audit', 'view', 'View audit logs');
```

---

## No Premature Features

**NOT doing**:
- ❌ Admin UI for permissions (do later)
- ❌ API endpoints (do later)
- ❌ Automated tests (test manually first)
- ❌ Permission discovery (we know what exists)
- ❌ Helper functions we don't use
- ❌ Extra audit fields
- ❌ Extra indexes

**ONLY doing**:
- ✅ Make auth use permissions not roles
- ✅ Allow users without roles
- ✅ Keep roles as templates

---

## Actual Timeline

**Hour 1**: Database + Backend
- 0:00-0:10 Run migration
- 0:10-0:40 Update auth.js and checkPermission.js
- 0:40-0:50 Delete rbacMiddleware, fix route checks
- 0:50-1:00 Test backend

**Hour 2**: Frontend + Test
- 1:00-1:15 Create permissions constants
- 1:15-1:30 Update permissionRules.ts and UserManagement.tsx
- 1:30-1:45 Test all features work
- 1:45-2:00 Buffer for issues

**Total: 2 hours**

---

## Success = 3 Things Work

1. ✅ User can login and permissions are loaded
2. ✅ Permission checks allow/deny access correctly
3. ✅ User can function without a role assigned

That's it. Everything else is future work.

---

**THIS is the right plan. No bloat. Just what's needed.**
