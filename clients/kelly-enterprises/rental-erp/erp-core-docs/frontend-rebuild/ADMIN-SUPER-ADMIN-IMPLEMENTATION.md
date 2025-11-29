# Admin vs Super Admin Implementation Guide

## Overview

This guide details how to implement the 4-tier role hierarchy with proper security enforcement to distinguish between Admin and Super Admin roles.

## Role Hierarchy (8 Core Permissions)

### 1. Operator (2 permissions)
- `gauge.view.access` - View gauge inventory and details
- `gauge.operate.execute` - Use gauges in production

### 2. Manager (6 permissions)
All Operator permissions plus:
- `gauge.manage.full` - Create, edit, retire gauges
- `calibration.manage.full` - Manage calibration records
- `data.export.execute` - Export reports and data
- `audit.view.access` - View system audit logs

### 3. Admin (7 permissions)
All Manager permissions plus:
- `user.manage.full` - Manage regular users (Operators & Managers)

**KEY RESTRICTION**: Admin can create/edit users but backend prevents managing users who have `system.admin.full` permission.

### 4. Super Admin (8 permissions - ALL)
All Admin permissions plus:
- `system.admin.full` - Full system control, manage all users including other admins

## Backend Implementation

### 1. Permission Check Middleware

```javascript
// backend/src/infrastructure/middleware/auth.js

/**
 * Check if user can manage a target user based on role hierarchy
 */
function canManageUser(requestingUser, targetUser) {
  const isSuperAdmin = requestingUser.permissions.includes('system.admin.full');
  const targetIsSuperAdmin = targetUser.permissions &&
                             targetUser.permissions.includes('system.admin.full');

  // Super Admin can manage anyone
  if (isSuperAdmin) {
    return true;
  }

  // Admin with user.manage.full can only manage non-super-admin users
  const hasUserManagement = requestingUser.permissions.includes('user.manage.full');
  if (hasUserManagement && !targetIsSuperAdmin) {
    return true;
  }

  return false;
}

module.exports = {
  // ... existing exports
  canManageUser
};
```

### 2. User Management Endpoints

#### Update User Endpoint
```javascript
// backend/src/modules/admin/routes/adminRoutes.js

router.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    // Get target user
    const [targetUser] = await pool.query(
      `SELECT u.*, GROUP_CONCAT(p.permission_key) as permissions
       FROM core_users u
       LEFT JOIN core_user_permissions up ON u.id = up.user_id
       LEFT JOIN core_permissions p ON up.permission_id = p.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.params.id]
    );

    if (!targetUser[0]) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Parse permissions
    targetUser[0].permissions = targetUser[0].permissions
      ? targetUser[0].permissions.split(',')
      : [];

    // Check if requesting user can manage target user
    const { canManageUser } = require('../../../infrastructure/middleware/auth');
    if (!canManageUser(req.user, targetUser[0])) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage this user'
      });
    }

    // Proceed with update
    // ... update logic here

    res.json({ success: true, message: 'User updated successfully' });

  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});
```

#### Grant Permission Endpoint
```javascript
// backend/src/modules/admin/routes/adminRoutes.js

router.post('/users/:userId/permissions/:permissionId', authenticateToken, async (req, res) => {
  try {
    const { userId, permissionId } = req.params;

    // Get target user
    const [targetUser] = await pool.query(
      `SELECT u.*, GROUP_CONCAT(p.permission_key) as permissions
       FROM core_users u
       LEFT JOIN core_user_permissions up ON u.id = up.user_id
       LEFT JOIN core_permissions p ON up.permission_id = p.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [userId]
    );

    if (!targetUser[0]) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    targetUser[0].permissions = targetUser[0].permissions
      ? targetUser[0].permissions.split(',')
      : [];

    // Get permission being granted
    const [permission] = await pool.query(
      'SELECT permission_key FROM core_permissions WHERE id = ?',
      [permissionId]
    );

    if (!permission[0]) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    // Special check: Only Super Admin can grant system.admin.full
    if (permission[0].permission_key === 'system.admin.full') {
      const isSuperAdmin = req.user.permissions.includes('system.admin.full');
      if (!isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can grant System Admin permission'
        });
      }
    }

    // Check if requesting user can manage target user
    const { canManageUser } = require('../../../infrastructure/middleware/auth');
    if (!canManageUser(req.user, targetUser[0])) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage this user'
      });
    }

    // Grant permission
    await pool.query(
      'INSERT INTO core_user_permissions (user_id, permission_id) VALUES (?, ?)',
      [userId, permissionId]
    );

    // Audit log
    await auditService.log(req.user.id, 'user.permission.granted', {
      target_user_id: userId,
      permission_id: permissionId,
      permission_key: permission[0].permission_key
    });

    res.json({ success: true, message: 'Permission granted successfully' });

  } catch (error) {
    logger.error('Error granting permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant permission'
    });
  }
});
```

### 3. User List Filtering

```javascript
// backend/src/modules/admin/routes/adminRoutes.js

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.permissions.includes('system.admin.full');

    let query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.created_at,
        GROUP_CONCAT(DISTINCT p.permission_key) as permissions
      FROM core_users u
      LEFT JOIN core_user_permissions up ON u.id = up.user_id
      LEFT JOIN core_permissions p ON up.permission_id = p.id
      WHERE u.id != ?
    `;

    const params = [req.user.id];

    // If not Super Admin, exclude users with system.admin.full
    if (!isSuperAdmin) {
      query += `
        AND u.id NOT IN (
          SELECT up2.user_id
          FROM core_user_permissions up2
          JOIN core_permissions p2 ON up2.permission_id = p2.id
          WHERE p2.permission_key = 'system.admin.full'
        )
      `;
    }

    query += ' GROUP BY u.id ORDER BY u.username';

    const [users] = await pool.query(query, params);

    // Parse permissions
    users.forEach(user => {
      user.permissions = user.permissions ? user.permissions.split(',') : [];
    });

    res.json({ success: true, users });

  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});
```

## Frontend Implementation

### 1. Permission Management Modal

Update `PermissionManagementModal.tsx` to implement role templates:

```typescript
const roleTemplates = {
  operator: [
    'gauge.view.access',
    'gauge.operate.execute'
  ],
  manager: [
    'gauge.view.access',
    'gauge.operate.execute',
    'gauge.manage.full',
    'calibration.manage.full',
    'data.export.execute',
    'audit.view.access'
  ],
  admin: [
    'gauge.view.access',
    'gauge.operate.execute',
    'gauge.manage.full',
    'calibration.manage.full',
    'user.manage.full',
    'audit.view.access',
    'data.export.execute'
  ],
  superadmin: [
    'gauge.view.access',
    'gauge.operate.execute',
    'gauge.manage.full',
    'calibration.manage.full',
    'user.manage.full',
    'system.admin.full',
    'audit.view.access',
    'data.export.execute'
  ]
};

const applyRoleTemplate = (role: keyof typeof roleTemplates) => {
  const permissionKeys = roleTemplates[role];
  const permissionIds = allPermissions
    .filter(p => permissionKeys.includes(p.module_id + '.' + p.resource + '.' + p.action))
    .map(p => p.id);

  // Clear pending changes
  setPendingChanges({ toAdd: new Set(), toRemove: new Set() });

  // Apply new state
  // ... implementation
};
```

### 2. User List Component

Add visual indicators for user roles:

```typescript
const getUserRole = (permissions: string[]): string => {
  if (permissions.includes('system.admin.full')) return 'Super Admin';
  if (permissions.includes('user.manage.full')) return 'Admin';
  if (permissions.includes('gauge.manage.full')) return 'Manager';
  return 'Operator';
};

// In user list rendering
<Badge variant={
  role === 'Super Admin' ? 'danger' :
  role === 'Admin' ? 'warning' :
  role === 'Manager' ? 'info' :
  'secondary'
}>
  {role}
</Badge>
```

## Security Considerations

### 1. System User (Ultimate Super Admin)
**Critical**: Implement a protected system account to prevent lockout scenarios.

#### Database Schema
```sql
-- Add system user flag
ALTER TABLE core_users ADD COLUMN is_system_user BOOLEAN DEFAULT FALSE;

-- Create the system user (run once during installation)
INSERT INTO core_users (username, email, password_hash, first_name, last_name, is_system_user, is_active)
VALUES ('system', 'system@fireproof.local', '$2b$10$...', 'System', 'Administrator', TRUE, TRUE);

-- Grant ALL permissions to system user permanently
INSERT INTO core_user_permissions (user_id, permission_id)
SELECT u.id, p.id
FROM core_users u
CROSS JOIN core_permissions p
WHERE u.username = 'system';
```

#### Backend Protection
```javascript
// In update/delete user endpoints
if (targetUser.is_system_user && req.user.username !== 'system') {
  return res.status(403).json({
    success: false,
    message: 'Only the system user can modify the system account'
  });
}

// Prevent system user from being deactivated
if (req.body.is_active === false && targetUser.is_system_user) {
  return res.status(403).json({
    success: false,
    message: 'System user cannot be deactivated'
  });
}
```

#### Frontend Handling
```typescript
// In user list component
{user.is_system_user && (
  <Badge variant="danger">
    🔒 SYSTEM
  </Badge>
)}

// In permission modal
{userId === systemUserId && currentUser.username !== 'system' && (
  <div className="alert alert-warning">
    This is the protected system account. Only the system user can modify this account.
  </div>
)}

// Disable edit button for system user unless you ARE system user
<Button
  onClick={() => openPermissionModal(user.id)}
  disabled={user.is_system_user && currentUser.username !== 'system'}
>
  Manage Permissions
</Button>
```

#### Security Benefits
- **Lockout Prevention**: If admins lock themselves out, system account can restore access
- **Ultimate Recovery**: System user always has full permissions
- **Audit Trail**: All modifications to system user are logged and attributed to system account
- **Transparent Security**: Visible in user list but clearly marked and protected

### 2. Prevent Privilege Escalation
- Users cannot grant themselves permissions
- Admins cannot grant `system.admin.full` permission
- Only Super Admins can create other Super Admins
- System user cannot be modified by non-system accounts

### 3. Audit All Permission Changes
- Log who granted/revoked permissions
- Log timestamp and target user
- Include before/after states
- Special logging for system user actions

### 4. Session Management
- Regenerate JWT when permissions change
- Force re-authentication for sensitive operations
- Implement session timeout for admin operations
- System user session timeout: 30 minutes (stricter than regular users)

### 5. UI Security
- Hide Super Admin users from Admin view
- Disable permission checkboxes that cannot be granted
- Show warning when granting sensitive permissions
- Mark system user with 🔒 badge and show protection status

## Testing Checklist

### Backend Tests
- [ ] System user is visible in user list
- [ ] Non-system users cannot edit system user
- [ ] System user can edit itself
- [ ] System user cannot be deactivated
- [ ] System user always has all 8 permissions
- [ ] Admin cannot view Super Admin users (except system user)
- [ ] Admin cannot edit Super Admin users
- [ ] Admin cannot grant `system.admin.full`
- [ ] Super Admin can manage all users (except system user)
- [ ] Super Admin can grant `system.admin.full`
- [ ] Regular users cannot access admin endpoints

### Frontend Tests
- [ ] System user displays 🔒 SYSTEM badge
- [ ] Edit button disabled for system user (non-system users)
- [ ] System user can edit itself when logged in as system
- [ ] Warning shown when non-system user views system permissions
- [ ] Role template buttons apply correct permissions
- [ ] Super Admin users hidden from Admin view (except system)
- [ ] Permission modal disables unavailable permissions
- [ ] Change summary shows accurate counts
- [ ] Save button only enabled with changes
- [ ] Permission dependencies auto-check correctly
- [ ] Dependency removal prevention works

## Database Schema Validation

Ensure these tables exist:

```sql
-- Core permissions table
SELECT * FROM core_permissions
WHERE permission_key IN (
  'gauge.view.access',
  'gauge.operate.execute',
  'gauge.manage.full',
  'calibration.manage.full',
  'user.manage.full',
  'system.admin.full',
  'audit.view.access',
  'data.export.execute'
);

-- User permissions junction table
DESCRIBE core_user_permissions;

-- Should have: user_id, permission_id, granted_at, granted_by
```

## Migration Script

If needed, create migration to add permission descriptions:

```sql
-- Migration: 015_update_permission_descriptions.sql

UPDATE core_permissions
SET description = 'View gauge inventory and details'
WHERE permission_key = 'gauge.view.access';

UPDATE core_permissions
SET description = 'Use gauges in production workflows'
WHERE permission_key = 'gauge.operate.execute';

UPDATE core_permissions
SET description = 'Create, edit, and retire gauges'
WHERE permission_key = 'gauge.manage.full';

UPDATE core_permissions
SET description = 'Manage calibration records and schedules'
WHERE permission_key = 'calibration.manage.full';

UPDATE core_permissions
SET description = 'Create and manage regular user accounts (Operators & Managers)'
WHERE permission_key = 'user.manage.full';

UPDATE core_permissions
SET description = 'Full system control - manage all users including other admins'
WHERE permission_key = 'system.admin.full';

UPDATE core_permissions
SET description = 'View system audit logs and activity history'
WHERE permission_key = 'audit.view.access';

UPDATE core_permissions
SET description = 'Export data, reports, and audit logs'
WHERE permission_key = 'data.export.execute';
```

## Summary

**Key Points**:
1. **8 permissions are sufficient** - No additional permissions needed
2. **Backend enforcement** - `canManageUser()` function enforces restrictions
3. **Super Admin distinction** - `system.admin.full` permission is the key differentiator
4. **Security model** - Follows Principle of Least Privilege and Segregation of Duties
5. **Frontend guidance** - Hide Super Admins from Admin view, implement role templates
6. **Audit trail** - Log all permission changes for compliance and security

This implementation ensures proper separation between Admin and Super Admin roles while maintaining a simple 8-permission system.
