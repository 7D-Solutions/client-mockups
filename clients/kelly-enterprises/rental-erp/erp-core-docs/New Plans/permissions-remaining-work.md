# Permissions System - Remaining Work

**Status**: Core migration complete (backend + frontend)
**Date**: October 28, 2025
**Migration**: Role-based → Permission-based authorization

---

## ✅ Completed Work

### Database Layer
- ✅ Created `core_user_permissions` table
- ✅ Migrated 90 permissions for active admin users from role assignments
- ✅ Foreign key constraints and indexes in place

### Backend Implementation
- ✅ `auth.js` - Loads permissions instead of roles on authentication
- ✅ `checkPermission.js` - Simplified to array-based permission checks
- ✅ `authService.js` - Updated to query `core_user_permissions` directly
- ✅ `admin.js` - Removed role hierarchy checks (2 locations)
- ✅ `gauges-v2.js` - Changed role logging to user ID
- ✅ `rbacMiddleware.js` - Moved to review-for-delete

### Frontend Implementation
- ✅ Created `infrastructure/permissions/index.ts` with constants and helpers
- ✅ Updated `permissionRules.ts` to use permission-based checks
- ✅ Updated `UserManagement.tsx` to use permission checks

---

## 🚧 Remaining Work

### 1. Admin UI for Permission Management

**Priority**: High
**Effort**: 2-3 days
**Description**: Build user interface for managing user permissions

#### Backend APIs Needed

**Location**: `backend/src/modules/admin/routes/permissions.js` (NEW)

```javascript
// GET /api/admin/users/:id/permissions
// List all permissions for a user

// POST /api/admin/users/:id/permissions
// Grant a permission to a user
// Body: { permissionId: number }

// DELETE /api/admin/users/:userId/permissions/:permissionId
// Revoke a permission from a user

// GET /api/admin/permissions
// List all available permissions in the system

// POST /api/admin/users/:id/permissions/bulk
// Grant multiple permissions at once (apply role template)
// Body: { permissionIds: number[] }
```

#### Frontend Components Needed

**Location**: `frontend/src/modules/admin/components/PermissionManager.tsx` (NEW)

Features:
- Display user's current permissions
- Add/remove individual permissions
- Apply role templates (bulk grant)
- Permission search/filter
- Audit trail view (who granted, when)

**Location**: `frontend/src/modules/admin/pages/PermissionManagement.tsx` (NEW)

Features:
- System-wide permission overview
- Permission usage statistics
- Bulk permission operations
- Permission health checks

---

### 2. Role Template System

**Priority**: Medium
**Effort**: 1-2 days
**Description**: UI to use roles as templates for bulk permission assignment

#### Features Needed

**Location**: `frontend/src/modules/admin/components/RoleTemplateSelector.tsx` (NEW)

```typescript
// Component to:
// 1. Select a role template (Admin, QC, Operator, etc.)
// 2. Preview permissions that will be granted
// 3. Apply role template to user
// 4. Option to customize permissions before applying
```

**Backend Support**: No new APIs needed - use existing permission APIs

**SQL for applying role template**:
```sql
INSERT INTO core_user_permissions (user_id, permission_id)
SELECT :userId, rp.permission_id
FROM core_role_permissions rp
WHERE rp.role_id = :roleId
ON DUPLICATE KEY UPDATE user_id = user_id;
```

---

### 3. Missing Permissions in Database

**Priority**: High
**Effort**: 1-2 hours
**Description**: Ensure all required permissions exist in `core_permissions` table

#### Required Permissions Audit

Run this query to check what exists:
```sql
SELECT module_id, resource, action, description
FROM core_permissions
ORDER BY module_id, resource, action;
```

#### Potentially Missing Permissions

Based on code analysis, verify these permissions exist:

**Admin Module**:
- `admin.system.manage` - Full system administration
- `admin.users.manage` - Manage user accounts
- `auth.audit.view` - View audit logs

**Gauge Module**:
- `gauge.gauges.read` - View gauges
- `gauge.gauges.create` - Create gauges
- `gauge.gauges.update` - Edit gauges
- `gauge.gauges.delete` - Delete gauges
- `gauge.checkout.execute` - Check out gauges
- `gauge.checkin.execute` - Check in gauges
- `gauge.transfer.execute` - Transfer gauges
- `gauge.calibration.record_internal` - Record calibration
- `gauge.qc.approve` - QC approval
- `gauge.unseal.request` - Request unseal
- `gauge.unseal.approve` - Approve unseal

**SQL to add missing permissions**:
```sql
INSERT INTO core_permissions (module_id, resource, action, description) VALUES
('admin', 'system', 'manage', 'Full system administration'),
('admin', 'users', 'manage', 'Manage user accounts'),
('auth', 'audit', 'view', 'View audit logs'),
('gauge', 'gauges', 'read', 'View gauge information'),
('gauge', 'gauges', 'create', 'Create new gauges'),
('gauge', 'gauges', 'update', 'Edit gauge information'),
('gauge', 'gauges', 'delete', 'Delete gauges'),
('gauge', 'checkout', 'execute', 'Check out gauges'),
('gauge', 'checkin', 'execute', 'Check in gauges'),
('gauge', 'transfer', 'execute', 'Transfer gauges between users'),
('gauge', 'calibration', 'record_internal', 'Record internal calibration'),
('gauge', 'qc', 'approve', 'QC approval of calibration'),
('gauge', 'unseal', 'request', 'Request gauge unseal'),
('gauge', 'unseal', 'approve', 'Approve gauge unseal request')
ON DUPLICATE KEY UPDATE description = VALUES(description);
```

---

### 4. User Registration/Creation Flow

**Priority**: High
**Effort**: 1 day
**Description**: Update user creation to work without mandatory roles

#### Current State
- User creation likely still requires role assignment
- Migration ensures existing users have permissions

#### Changes Needed

**Location**: `backend/src/modules/admin/services/adminService.js`

**Update `createUser()` function**:
```javascript
// BEFORE: Required role assignment
const user = await createUser({ email, password, roleId: required });

// AFTER: Optional role as template
const user = await createUser({
  email,
  password,
  roleTemplateId: optional // If provided, copy permissions from role
});

// If roleTemplateId provided, copy permissions:
if (roleTemplateId) {
  await copyPermissionsFromRole(newUserId, roleTemplateId);
}
```

**Location**: `frontend/src/modules/admin/components/CreateUserModal.tsx`

- Make role selection optional
- Add permission selector as alternative
- Show permission preview before creation

---

### 5. Frontend Auth Type Definitions

**Priority**: Medium
**Effort**: 1 hour
**Description**: Update TypeScript types to reflect permission-based auth

#### Files to Update

**Location**: `erp-core/src/core/auth/types.ts`

```typescript
// BEFORE
export interface User {
  id: number;
  email: string;
  name: string;
  role?: string;
  roles?: string[];
}

// AFTER
export interface User {
  id: number;
  email: string;
  name: string;
  permissions: string[];
  // roles field can remain for backward compatibility with UI display
  roles?: string[]; // Optional - for display only, not used in auth
}
```

**Update all components** that reference `user.role` or `user.roles` for authorization:
- Search: `grep -r "user\.roles?" frontend/src/`
- Replace with: `user.permissions.includes('...')`

---

### 6. Testing & Validation

**Priority**: High
**Effort**: 1-2 days
**Description**: Comprehensive testing of new permission system

#### Manual Testing Checklist

**Authentication Tests**:
- ✅ Login as existing admin user → permissions loaded
- ⏳ Login shows correct permissions in dev console
- ⏳ JWT token includes user.id (not user.role)
- ⏳ Session persists correctly with permissions

**Authorization Tests**:
- ⏳ Admin features accessible with `admin.system.manage`
- ⏳ User management accessible with `admin.users.manage`
- ⏳ Gauge operations work with gauge permissions
- ⏳ Permission denied (403) when lacking permissions
- ⏳ Unauthorized (401) when not logged in

**User Management Tests**:
- ⏳ Create user without role → user can login
- ⏳ Grant individual permission → user gains access
- ⏳ Revoke permission → user loses access
- ⏳ Apply role template → user gets all role permissions

**Edge Cases**:
- ⏳ User with no permissions → limited access only
- ⏳ Delete user → permissions cascade delete
- ⏳ Invalid permission → gracefully denied
- ⏳ Permission check when permissions array is empty

#### Automated Testing

**Backend Integration Tests** (`backend/tests/integration/permissions.test.js`):
```javascript
describe('Permission System', () => {
  test('User login loads permissions from core_user_permissions');
  test('checkPermission middleware allows with permission');
  test('checkPermission middleware denies without permission');
  test('checkAnyPermission works with multiple permissions');
  test('Permission grant/revoke APIs work correctly');
});
```

**Frontend Unit Tests** (`frontend/tests/unit/permissions.test.ts`):
```typescript
describe('Permission Helpers', () => {
  test('hasPermission returns true when permission exists');
  test('hasPermission returns false when permission missing');
  test('hasAnyPermission checks multiple permissions');
  test('hasAllPermissions validates all required');
});
```

---

### 7. Migration Verification

**Priority**: High
**Effort**: 1 hour
**Description**: Verify all users have correct permissions post-migration

#### Verification Queries

**Check migration completeness**:
```sql
-- Users with permissions
SELECT
  u.id, u.email, u.is_active,
  COUNT(up.permission_id) as permission_count
FROM core_users u
LEFT JOIN core_user_permissions up ON u.id = up.user_id
WHERE u.is_active = 1 AND u.is_deleted = 0
GROUP BY u.id, u.email
ORDER BY permission_count DESC;

-- Users without permissions (potential issue)
SELECT u.id, u.email, u.created_at
FROM core_users u
LEFT JOIN core_user_permissions up ON u.id = up.user_id
WHERE u.is_active = 1
  AND u.is_deleted = 0
  AND up.user_id IS NULL;

-- Permission distribution
SELECT
  CONCAT(p.module_id, '.', p.resource, '.', p.action) as permission,
  COUNT(up.user_id) as user_count
FROM core_permissions p
LEFT JOIN core_user_permissions up ON p.id = up.permission_id
GROUP BY p.id, permission
ORDER BY user_count DESC, permission;
```

**Fix orphaned users** (if found):
```sql
-- Grant basic permissions to users without any
INSERT INTO core_user_permissions (user_id, permission_id)
SELECT u.id, p.id
FROM core_users u
CROSS JOIN core_permissions p
LEFT JOIN core_user_permissions up ON u.id = up.user_id
WHERE u.is_active = 1
  AND up.user_id IS NULL
  AND p.module_id = 'gauge'
  AND p.resource = 'gauges'
  AND p.action = 'read';
```

---

### 8. Documentation Updates

**Priority**: Medium
**Effort**: 2-3 hours
**Description**: Update system documentation to reflect permission-based auth

#### Documentation to Update

**User Guide** (`erp-core-docs/user-guide/permissions.md`):
- How permissions work
- What permissions exist
- How to request permissions
- Permission vs role concepts

**Admin Guide** (`erp-core-docs/admin-guide/user-management.md`):
- How to grant/revoke permissions
- Using role templates
- Permission auditing
- Troubleshooting permission issues

**Developer Guide** (`erp-core-docs/developer-guide/authorization.md`):
- How to check permissions in code
- How to add new permissions
- Permission naming conventions
- Testing permission logic

**API Documentation** (`erp-core-docs/api/permissions.md`):
- Permission management endpoints
- Request/response formats
- Permission constants reference

---

## 📊 Effort Summary

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Admin UI for permissions | High | 2-3 days | Not Started |
| Role template system | Medium | 1-2 days | Not Started |
| Missing permissions audit | High | 1-2 hours | Not Started |
| User creation flow | High | 1 day | Not Started |
| Frontend type definitions | Medium | 1 hour | Not Started |
| Testing & validation | High | 1-2 days | Not Started |
| Migration verification | High | 1 hour | Not Started |
| Documentation updates | Medium | 2-3 hours | Not Started |

**Total Remaining Effort**: 5-8 days

---

## 🎯 Recommended Priority Order

### Phase 1: Critical Foundation (1-2 days)
1. Missing permissions audit - verify all permissions exist
2. Migration verification - ensure all users have permissions
3. Manual testing - validate core auth flows work
4. User creation flow - unblock creating new users

### Phase 2: Admin Capabilities (2-3 days)
5. Backend permission APIs - enable permission management
6. Admin UI for permissions - build management interface
7. Role template system - enable bulk permission grants

### Phase 3: Polish & Documentation (1-2 days)
8. Frontend type definitions - clean up TypeScript
9. Automated testing - prevent regressions
10. Documentation updates - enable team adoption

---

## 🚨 Known Issues / Tech Debt

### Issue 1: Role Fields Still Present
**Description**: User objects still have `roles` fields in database and responses
**Impact**: Low - fields ignored for authorization but visible in UI
**Resolution**: Remove role fields in Phase 4 (breaking change)

### Issue 2: Legacy Route Protection
**Description**: Some routes may still use role-based middleware
**Impact**: Medium - could cause authorization failures
**Resolution**: Audit all routes, replace with permission middleware

### Issue 3: No Permission Audit Trail
**Description**: Permission grants/revokes not logged
**Impact**: Medium - no audit history for security review
**Resolution**: Add audit logging in permission APIs

### Issue 4: No Permission Expiration
**Description**: Permissions don't expire or require renewal
**Impact**: Low - acceptable for most use cases
**Resolution**: Add expiration feature if needed (future)

---

## 💡 Future Enhancements (Not Required Now)

1. **Permission Groups** - Bundle related permissions for easier management
2. **Conditional Permissions** - Permissions that depend on context (time, location)
3. **Permission Requests** - Users can request permissions, admins approve
4. **Permission Analytics** - Track which permissions are actually used
5. **Permission Inheritance** - Hierarchical permission structures
6. **Permission Policies** - Policy-based access control (PBAC)

---

## 📝 Notes

- Roles remain in database as templates - this is by design
- Users can function with zero roles assigned - permissions are independent
- Permission system is backward compatible with existing user base
- Migration was non-destructive - no data lost
- System is production-ready pending manual testing validation

---

**Next Immediate Action**: Run missing permissions audit and grant permissions to any orphaned users.
