# Permission-Based Auth - Streamlined Plan

**Goal**: Users have permissions. Roles are optional templates.

---

## What Actually Needs to Change

### Database (10 minutes)

```sql
-- 1. New table
CREATE TABLE core_user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES core_permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. Migrate existing data
INSERT INTO core_user_permissions (user_id, permission_id)
SELECT ur.user_id, rp.permission_id
FROM core_user_roles ur
JOIN core_role_permissions rp ON ur.role_id = rp.role_id;
```

**That's it for database.**

---

### Backend (1 hour)

**File**: `backend/src/infrastructure/middleware/auth.js`

Replace the user query (lines 51-86):

```javascript
const [users] = await pool.execute(`
  SELECT
    u.id, u.email, u.is_active, u.name,
    GROUP_CONCAT(CONCAT(p.module_id, '.', p.resource, '.', p.action)) as permissions
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

**File**: `backend/src/infrastructure/middleware/checkPermission.js`

Replace both functions:

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

**Done with backend auth.**

---

### Frontend (2 hours)

**File**: `frontend/src/infrastructure/permissions/index.ts` (NEW)

```typescript
export const PERMISSIONS = {
  GAUGE: {
    UPDATE: 'gauge.gauges.update',
    DELETE: 'gauge.gauges.delete',
    // Add others as needed
  },
  ADMIN: {
    MANAGE_USERS: 'admin.users.manage',
  }
};

export const hasPermission = (permissions: string[], permission: string) =>
  permissions?.includes(permission) ?? false;
```

**Find/Replace** across frontend:

```bash
# Find role checks
grep -r "user?.role\|roles?.includes" frontend/src/

# Replace with
hasPermission(permissions, PERMISSIONS.GAUGE.UPDATE)
```

**Done with frontend.**

---

### Admin UI (Optional - can do later)

Add permission management page. But users can function with existing role UI by treating roles as templates.

---

## Over-Engineering Analysis

### ❌ REMOVE from plan:

1. **core_user_permission_overrides** - Don't need it. Just use core_user_permissions.
2. **notes field** - Don't need migration notes. Who cares where permission came from.
3. **granted_by field** - Optional. Can add later if audit trail needed.
4. **granted_at field** - Has default. Keep for audit.
5. **Helper functions** `hasAnyPermission`, `hasAllPermissions` - Add only if actually needed.
6. **UserPermissionEditor component** - Not needed for MVP. Edit via SQL or add later.
7. **RoleTemplateSelector component** - Not needed. Can manually copy permissions.
8. **New API endpoints** - Not needed for auth to work. Add when building UI.
9. **Permission discovery endpoints** - Not needed. We know what permissions exist.
10. **Migration verification script** - Just run SQL and test login.

### ✅ KEEP (minimal):

1. `core_user_permissions` table (simple version)
2. Migration SQL to copy role permissions
3. Updated auth.js query
4. Simplified checkPermission middleware
5. Frontend permission constants
6. Find/replace role checks → permission checks

---

## Actual Implementation Steps

### 1. Database (5 min)
```bash
mysql -u root -p fai_db_sandbox < migration.sql
```

### 2. Backend (30 min)
- Update auth.js
- Update checkPermission.js
- Test login works

### 3. Frontend (1 hour)
- Create permissions/index.ts
- Replace role checks in 5-10 files
- Test features work

### 4. Deploy (15 min)
- Restart containers
- Test production

**Total: 2 hours**

---

## Simplified Database Schema

```sql
CREATE TABLE core_user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES core_permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

**Fields removed**:
- ❌ granted_by - Who cares. Can add later.
- ❌ notes - Don't need.
- ✅ granted_at - Keep for basic audit.

---

## What About Roles?

**Keep `core_roles` table exactly as is.**

When you want to give user "Admin" permissions:
1. Get all permissions for Admin role from `core_role_permissions`
2. Copy them to `core_user_permissions`
3. Done

Role is just a template. User gets actual permissions.

---

## Migration SQL (Complete)

```sql
-- 1. Create table
CREATE TABLE IF NOT EXISTS core_user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES core_permissions(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Copy existing role-based permissions to direct permissions
INSERT IGNORE INTO core_user_permissions (user_id, permission_id)
SELECT DISTINCT ur.user_id, rp.permission_id
FROM core_user_roles ur
JOIN core_role_permissions rp ON ur.role_id = rp.role_id;

-- 3. Verify
SELECT COUNT(*) FROM core_user_permissions;
```

**That's it.**

---

## Testing

```bash
# 1. Login as any user
# 2. Check req.user.permissions is populated
# 3. Try accessing a feature
# 4. If 403, add permission to that user
# 5. Try again
```

---

## Rollback

```sql
DROP TABLE core_user_permissions;
```

Revert code changes. Done.

---

## Admin UI (Future - Not Now)

Later, add simple page:

```
User: john@example.com

Current Permissions:
☑ gauge.gauges.update
☑ gauge.gauges.delete
☐ admin.users.manage

[Save]
```

Just checkboxes. Update `core_user_permissions` table.

---

## Summary

**Over-engineered items removed**:
- Permission override table (use main table)
- Migration notes/metadata
- Helper utilities we don't need yet
- Admin UI components (do later)
- API endpoints (do later)
- Verification scripts (just test)

**What remains**:
- 1 new table
- 1 SQL migration
- 2 backend files updated
- 1 frontend constants file
- Find/replace role checks
- Test & deploy

**Time**: 2 hours, not 1 week.

**Result**: Clean permission system. No roles required. Simple.
