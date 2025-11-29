# Permission-Based Authorization Migration Plan

**Date**: October 28, 2025
**Objective**: Migrate from role-based to permission-based authorization while keeping roles as optional templates

## Current System Analysis

### Database Schema (ALREADY IN PLACE)

The system already has the complete infrastructure for permission-based auth:

```sql
-- Core tables
core_users (id, email, name, password_hash, is_active, is_deleted...)
core_roles (id, name, description, is_system, is_active)
core_permissions (id, module_id, resource, action, description)

-- Junction tables
core_user_roles (user_id, role_id, assigned_by, assigned_at)
core_role_permissions (role_id, permission_id, granted_at)
core_user_permission_overrides (user_id, permission_id, granted, reason, granted_by)
```

**Key Finding**: The database already supports:
- ✅ Direct user-permission assignments via `core_user_permission_overrides`
- ✅ Role-based permission templates via `core_role_permissions`
- ✅ Three-level permission structure (`module_id.resource.action`)

### Backend Infrastructure (ALREADY IMPLEMENTED)

**Auth Middleware** (`infrastructure/middleware/auth.js`):
- Currently loads `roles` array from `core_user_roles` → `core_roles`
- Attaches to `req.user.roles` and `req.user.role`

**Permission Middleware** (`infrastructure/middleware/checkPermission.js`):
- ✅ `checkPermission(module, resource, action)` - Check single permission
- ✅ `checkAnyPermission([{module, resource, action}])` - Check multiple permissions
- ✅ Already queries BOTH `core_role_permissions` AND `core_user_permission_overrides`
- ✅ Perfect implementation for permission-based auth!

### Frontend Infrastructure

**Auth Service** (`erp-core/src/core/auth/authService.ts`):
- `getCurrentUser()` returns User object
- User type includes `permissions?: string[]` field (already defined!)

**Auth Hook** (`infrastructure/hooks/useAuth.tsx`):
- Currently provides: `{ user, permissions, roles, isAuthenticated, login, logout }`
- Permissions are already available!

## What Needs to Change

### 1. Database Changes

#### Option A: Direct User Permissions (Recommended)
**Create new table**: `core_user_permissions`
```sql
CREATE TABLE core_user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_by INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES core_permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES core_users(id),
  INDEX idx_user (user_id),
  INDEX idx_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Why not use `core_user_permission_overrides`?**
- It's designed for *overrides* (granted=1 means grant, granted=0 means revoke)
- We want direct permissions without the "override" semantics
- Cleaner separation: `core_user_permissions` = direct grants, `overrides` = exceptions

#### Option B: Use Existing Override Table
**Repurpose**: `core_user_permission_overrides`
- Rename to `core_user_permissions`
- Remove `granted` column (all records = granted)
- Simpler but loses override functionality

**Recommendation**: Use Option A - keep both tables for flexibility

#### Make Roles Optional
```sql
ALTER TABLE core_user_roles
  COMMENT 'Optional role assignments for bulk permission templates';

-- No schema changes needed! Already nullable by design
```

### 2. Backend Changes

#### A. Auth Middleware (`infrastructure/middleware/auth.js`)

**Current** (lines 51-86):
```javascript
const [users] = await pool.execute(`
  SELECT u.id, u.email, u.is_active, u.name,
    GROUP_CONCAT(r.name) as roles
  FROM core_users u
  LEFT JOIN core_user_roles ur ON u.id = ur.user_id
  LEFT JOIN core_roles r ON ur.role_id = r.id
  WHERE u.id = ? AND u.is_active = 1
  GROUP BY u.id`, [verified.user_id]);

req.user = {
  user_id: user.id,
  id: user.id,
  email: user.email,
  roles: rolesArray,
  role: rolesArray[0],
  name: user.name || user.email
};
```

**New**:
```javascript
const [users] = await pool.execute(`
  SELECT u.id, u.email, u.is_active, u.name,
    GROUP_CONCAT(DISTINCT r.name) as roles,
    GROUP_CONCAT(DISTINCT CONCAT(p.module_id, '.', p.resource, '.', p.action)) as permissions
  FROM core_users u
  LEFT JOIN core_user_roles ur ON u.id = ur.user_id
  LEFT JOIN core_roles r ON ur.role_id = r.id
  LEFT JOIN core_user_permissions up ON u.id = up.user_id
  LEFT JOIN core_permissions p ON up.permission_id = p.id
  WHERE u.id = ? AND u.is_active = 1
  GROUP BY u.id`, [verified.user_id]);

const user = users[0];
const rolesArray = user.roles ? user.roles.split(',').map(r => r === 'admin' ? 'Admin' : r) : [];
const permissionsArray = user.permissions ? user.permissions.split(',') : [];

req.user = {
  user_id: user.id,
  id: user.id,
  email: user.email,
  roles: rolesArray, // Optional, for display only
  role: rolesArray[0], // Backward compatibility
  permissions: permissionsArray, // PRIMARY authorization source
  name: user.name || user.email
};
```

#### B. Permission Middleware (`infrastructure/middleware/checkPermission.js`)

**Current**: Already perfect! Just needs to include `core_user_permissions` table

**Update** (lines 36-48):
```javascript
// OLD: Only checks role-based + overrides
const [permissions] = await pool.execute(`
  SELECT COUNT(*) as has_permission
  FROM core_users u
  JOIN core_user_roles ur ON u.id = ur.user_id
  JOIN core_role_permissions rp ON ur.role_id = rp.role_id
  JOIN core_permissions p ON rp.permission_id = p.id
  WHERE u.id = ? AND p.module_id = ? AND p.resource = ? AND p.action = ?
    AND u.is_active = 1 AND u.is_deleted = 0
`, [req.user.user_id, module, resource, action]);

// NEW: Check direct permissions + role-based + overrides
const [permissions] = await pool.execute(`
  SELECT COUNT(*) as has_permission
  FROM core_users u
  LEFT JOIN (
    -- Direct user permissions
    SELECT up.user_id, p.module_id, p.resource, p.action
    FROM core_user_permissions up
    JOIN core_permissions p ON up.permission_id = p.id

    UNION

    -- Role-based permissions
    SELECT ur.user_id, p.module_id, p.resource, p.action
    FROM core_user_roles ur
    JOIN core_role_permissions rp ON ur.role_id = rp.role_id
    JOIN core_permissions p ON rp.permission_id = p.id

    UNION

    -- Permission overrides (grants)
    SELECT upo.user_id, p.module_id, p.resource, p.action
    FROM core_user_permission_overrides upo
    JOIN core_permissions p ON upo.permission_id = p.id
    WHERE upo.granted = 1
  ) perms ON u.id = perms.user_id
  WHERE u.id = ?
    AND perms.module_id = ?
    AND perms.resource = ?
    AND perms.action = ?
    AND u.is_active = 1
    AND u.is_deleted = 0
`, [req.user.user_id, module, resource, action]);
```

#### C. Role-Based Checks (DEPRECATE)

**Find and replace** in all route files:
```javascript
// OLD - Role-based checks (DEPRECATE)
requireRole('Admin')
requireAnyRole(['Admin', 'QA'])

// NEW - Permission-based checks (PREFER)
checkPermission('gauge', 'gauges', 'edit')
checkAnyPermission([
  {module: 'gauge', resource: 'gauges', action: 'edit'},
  {module: 'gauge', resource: 'gauges', action: 'admin'}
])
```

### 3. Frontend Changes

#### A. Auth Hook (ALREADY DONE!)

The `useAuth` hook already returns `permissions` array! No changes needed.

#### B. Permission Checks

**Current practice** (needs to change everywhere):
```typescript
// ❌ WRONG - Role-based
if (user?.role === 'Admin') { ... }
if (roles?.includes('Admin')) { ... }

// ✅ CORRECT - Permission-based
if (permissions?.includes('gauge.gauges.edit')) { ... }
```

**Example Updates Needed**:

`GaugeDetail.tsx` (line 79-80):
```typescript
// OLD
const canEdit = permissions?.includes(GAUGE_PERMISSIONS.EDIT);

// ISSUE: GAUGE_PERMISSIONS.EDIT = 'gauge.edit' but permission doesn't exist in DB
// FIX: Either create the permission OR use correct format

// OPTION 1: Create gauge.edit permission
// Migration: INSERT INTO core_permissions (module_id, resource, action, description)
//            VALUES ('gauge', 'gauges', 'edit', 'Edit gauge details');

// OPTION 2: Use existing permission pattern
const canEdit = permissions?.includes('gauge.gauges.update');
```

#### C. Permission Constants

**Create**: `frontend/src/infrastructure/permissions/index.ts`
```typescript
// Centralized permission constants matching DB structure
export const PERMISSIONS = {
  // Gauge Module
  GAUGE: {
    VIEW: 'gauge.gauges.read',
    CREATE: 'gauge.gauges.create',
    EDIT: 'gauge.gauges.update',
    DELETE: 'gauge.gauges.delete',
    CHECKOUT: 'gauge.checkout.execute',
    CHECKIN: 'gauge.checkin.execute',
    CALIBRATE: 'gauge.calibration.record_internal',
    QC_APPROVE: 'gauge.qc.approve',
    UNSEAL: 'gauge.unseal.approve',
  },
  // Admin Module
  ADMIN: {
    USERS_MANAGE: 'admin.users.manage',
    AUDIT_VIEW: 'auth.audit.view',
  }
} as const;

// Helper function
export function hasPermission(permissions: string[] | undefined, permission: string): boolean {
  return permissions?.includes(permission) ?? false;
}

// Usage
import { PERMISSIONS, hasPermission } from '../infrastructure/permissions';
const canEdit = hasPermission(permissions, PERMISSIONS.GAUGE.EDIT);
```

### 4. Admin UI Changes

#### A. User Management Page

**Add permission management interface**:
```typescript
// Components needed:
- PermissionSelector: Multi-select dropdown of all available permissions
- RoleTemplateApplier: "Apply Role Template" button to bulk-add permissions
- PermissionList: Display user's current permissions with remove buttons

// API endpoints needed:
POST   /api/admin/users/:id/permissions      // Add permission
DELETE /api/admin/users/:id/permissions/:pid // Remove permission
POST   /api/admin/users/:id/apply-role/:rid  // Copy role permissions to user
GET    /api/admin/permissions                // List all available permissions
```

#### B. Role Management Page

**Update to show roles as templates**:
```typescript
// UI changes:
- Add "Template" badge to all roles
- Show "This role serves as a permission template for new users"
- Add "Apply to User" button that copies permissions
- Keep role CRUD but emphasize template nature
```

## Migration Strategy

### Phase 1: Database Setup (Week 1)
1. Create `core_user_permissions` table
2. Create migration to populate `core_user_permissions` from existing role assignments
3. Add indexes for performance
4. Test with sample data

### Phase 2: Backend Migration (Week 2)
1. Update `auth.js` to load permissions
2. Update `checkPermission.js` to query new table
3. Create admin APIs for permission management
4. Add backward compatibility layer
5. Write integration tests

### Phase 3: Frontend Migration (Week 3)
1. Create centralized permission constants
2. Update all role checks to permission checks
3. Add permission management UI
4. Update role UI to show as templates
5. Write E2E tests

### Phase 4: Data Migration (Week 4)
1. Audit all users' role-based permissions
2. Convert to direct permissions
3. Mark roles as "template only"
4. Verify all users can still access their features
5. Update documentation

### Phase 5: Deprecation (Week 5+)
1. Add deprecation warnings to role-based checks
2. Monitor for remaining role-based code
3. Plan full removal of role requirements
4. Keep roles for organizational/display purposes only

## Backward Compatibility

During migration, support BOTH systems:
```javascript
// Backend middleware
function hasAccess(req, requiredPermission) {
  // NEW: Check direct permission
  if (req.user.permissions?.includes(requiredPermission)) {
    return true;
  }

  // OLD: Fallback to role check (TEMPORARY)
  if (PERMISSION_ROLE_MAP[requiredPermission]?.some(role => req.user.roles?.includes(role))) {
    logger.warn(`User ${req.user.id} accessing ${requiredPermission} via deprecated role check`);
    return true;
  }

  return false;
}
```

## Testing Strategy

### Unit Tests
- Permission middleware with various combinations
- Auth middleware permission loading
- Frontend permission checks

### Integration Tests
- User with direct permissions only
- User with role-based permissions only
- User with mixed permissions
- Permission override scenarios

### E2E Tests
- Create user without role
- Assign individual permissions
- Verify feature access
- Apply role template
- Remove individual permissions

## Rollback Plan

If issues arise:
1. Revert backend to query only `core_role_permissions`
2. Keep `core_user_permissions` table for future use
3. Restore role-based authorization
4. Analyze failures and retry

## Success Criteria

✅ Users can be created without assigning a role
✅ Users with permissions but no role can access features
✅ Roles still work as permission templates
✅ Admin UI allows direct permission management
✅ All existing users maintain their access levels
✅ No performance degradation in auth checks
✅ Zero downtime during migration

## Estimated Timeline

- **Analysis**: 1 day (COMPLETED)
- **Database Setup**: 2 days
- **Backend Migration**: 3 days
- **Frontend Migration**: 3 days
- **Testing**: 2 days
- **Data Migration**: 1 day
- **Buffer**: 2 days

**Total**: ~2 weeks for complete migration

## Next Steps

1. Review this plan with team
2. Create database migration script
3. Set up test environment
4. Begin Phase 1 implementation
5. Create tracking board for migration tasks
