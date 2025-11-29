# Permission-Based Auth - Long-Term Production Solution

**Goal**: Production-ready permission system that won't need rework.

---

## Analysis: What's Actually Over-Engineering vs Long-Term Necessity

### ✅ KEEP - Production Requirements

**Database Fields**:
- `user_id`, `permission_id` - Core requirement
- `granted_by` - **KEEP** - Audit requirement. Who gave this permission?
- `granted_at` - **KEEP** - Audit requirement. When was it granted?
- ~~`notes`~~ - **REMOVE** - Can add later if needed

**Why keep audit fields**: You're building an ERP system. Compliance, security audits, and troubleshooting require knowing who granted permissions and when. This isn't over-engineering, it's basic audit trail.

### ❌ REMOVE - Actual Over-Engineering

1. **`core_user_permission_overrides` table** - Don't use this. Just use `core_user_permissions`. The "override" concept adds complexity for no benefit.

2. **Helper functions `hasAllPermissions`, `hasAnyPermission`** - Add only when you actually need them. Start with just `hasPermission`.

3. **Elaborate admin UI components** - Build when needed, not upfront.

4. **Permission discovery APIs** - Not needed initially. Add when building admin UI.

5. **Migration verification scripts** - Just test the app works.

6. **Backward compatibility** - You already said no.

---

## Production-Ready Schema

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
  INDEX idx_permission (permission_id),
  INDEX idx_granted_by (granted_by),
  INDEX idx_granted_at (granted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COMMENT='Direct user permissions with audit trail';
```

**Why this is right**:
- Clean primary key (user, permission)
- Audit trail (who, when) for compliance
- Proper foreign keys maintain referential integrity
- Indexes for performance
- No unnecessary fields

---

## Backend Implementation

### Auth Middleware - Proper Query

```javascript
const [users] = await pool.execute(`
  SELECT
    u.id,
    u.email,
    u.is_active,
    u.name,
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

**Why this is right**:
- Single query, performant
- LEFT JOIN handles users with no permissions
- GROUP_CONCAT creates array we need
- No complex UNION needed

### Permission Check - Keep It Simple

```javascript
const checkPermission = (module, resource, action) => {
  return (req, res, next) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const required = `${module}.${resource}.${action}`;

    if (req.user.permissions?.includes(required)) {
      return next();
    }

    logger.warn('Permission denied', {
      userId: req.user.id,
      required,
      userPermissions: req.user.permissions
    });

    return res.status(403).json({
      success: false,
      error: `Permission denied: ${required} required`
    });
  };
};
```

**Why this is right**:
- Simple array check (fast)
- Proper logging for debugging
- Clear error messages
- No database queries on every request (permissions already loaded)

---

## Frontend Implementation

### Permission Constants - Comprehensive

```typescript
/**
 * Permission constants matching database exactly
 * Update this file when adding new permissions to database
 */
export const PERMISSIONS = {
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
  ADMIN: {
    USERS_MANAGE: 'admin.users.manage',
    AUDIT_VIEW: 'auth.audit.view',
  }
} as const;

export const hasPermission = (
  permissions: string[] | undefined,
  permission: string
): boolean => {
  return permissions?.includes(permission) ?? false;
};
```

**Why this is right**:
- Single source of truth for permission strings
- TypeScript const assertions for type safety
- Simple helper function
- Easy to maintain and update

---

## Migration Strategy

### Step 1: Database Migration

```sql
-- Create table with audit fields
CREATE TABLE IF NOT EXISTS core_user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_by INT NOT NULL DEFAULT 1,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES core_permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES core_users(id),
  INDEX idx_user (user_id),
  INDEX idx_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrate existing role-based permissions
INSERT IGNORE INTO core_user_permissions (user_id, permission_id, granted_by)
SELECT DISTINCT
  ur.user_id,
  rp.permission_id,
  1  -- System user ID
FROM core_user_roles ur
JOIN core_role_permissions rp ON ur.role_id = rp.role_id;

-- Verify migration
SELECT
  u.email,
  COUNT(up.permission_id) as permission_count
FROM core_users u
LEFT JOIN core_user_permissions up ON u.id = up.user_id
WHERE u.is_active = 1
GROUP BY u.id, u.email;
```

### Step 2: Backend Changes

**Update these files** (in order):

1. `backend/src/infrastructure/middleware/auth.js` - Update user query
2. `backend/src/infrastructure/middleware/checkPermission.js` - Simplify checks
3. Find all `req.user.roles` and replace with permission checks
4. Delete `backend/src/infrastructure/middleware/rbacMiddleware.js`

### Step 3: Frontend Changes

**Update these files** (in order):

1. Create `frontend/src/infrastructure/permissions/index.ts`
2. Update `erp-core/src/core/auth/types.ts` - Remove role fields
3. Find all role checks and replace with permission checks
4. Update `GaugeDetail.tsx` and `GaugeModalManager.tsx` (already started)

### Step 4: Admin APIs (Build When Needed)

Create simple CRUD for permissions:

```javascript
// GET /api/admin/users/:id/permissions
router.get('/:id/permissions',
  authenticateToken,
  checkPermission('admin', 'users', 'manage'),
  async (req, res) => {
    const [permissions] = await pool.execute(`
      SELECT p.id, p.module_id, p.resource, p.action, p.description,
             up.granted_at, u.name as granted_by_name
      FROM core_user_permissions up
      JOIN core_permissions p ON up.permission_id = p.id
      JOIN core_users u ON up.granted_by = u.id
      WHERE up.user_id = ?
      ORDER BY p.module_id, p.resource, p.action
    `, [req.params.id]);

    res.json({ success: true, permissions });
  }
);

// POST /api/admin/users/:id/permissions
router.post('/:id/permissions',
  authenticateToken,
  checkPermission('admin', 'users', 'manage'),
  async (req, res) => {
    const { permissionId } = req.body;

    await pool.execute(
      'INSERT INTO core_user_permissions (user_id, permission_id, granted_by) VALUES (?, ?, ?)',
      [req.params.id, permissionId, req.user.id]
    );

    res.json({ success: true });
  }
);

// DELETE /api/admin/users/:userId/permissions/:permissionId
router.delete('/:userId/permissions/:permissionId',
  authenticateToken,
  checkPermission('admin', 'users', 'manage'),
  async (req, res) => {
    await pool.execute(
      'DELETE FROM core_user_permissions WHERE user_id = ? AND permission_id = ?',
      [req.params.userId, req.params.permissionId]
    );

    res.json({ success: true });
  }
);
```

---

## What About Roles?

**Roles stay exactly as they are.**

When admin wants to give user "Admin" permissions:
```sql
-- Apply role template to user
INSERT IGNORE INTO core_user_permissions (user_id, permission_id, granted_by)
SELECT :userId, rp.permission_id, :adminUserId
FROM core_role_permissions rp
WHERE rp.role_id = :roleId;
```

Role is a template. Copying permissions is a one-time operation. User owns the permissions after that.

---

## Testing Approach

### Manual Testing
1. Run database migration
2. Login as existing user
3. Verify can access existing features
4. Create new user without role
5. Grant specific permissions
6. Verify new user can access only those features

### Automated Testing
```javascript
describe('Permission System', () => {
  it('loads user permissions on login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'test' });

    expect(response.body.user.permissions).toBeInstanceOf(Array);
    expect(response.body.user.permissions.length).toBeGreaterThan(0);
  });

  it('denies access without permission', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Cookie', userWithoutAdminPermCookie);

    expect(response.status).toBe(403);
  });

  it('grants access with permission', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Cookie', userWithAdminPermCookie);

    expect(response.status).toBe(200);
  });
});
```

---

## Rollback Plan

If something goes wrong:

```sql
-- Rollback database
DROP TABLE core_user_permissions;

-- Revert code changes
git revert <commit-hash>

-- Deploy
```

System falls back to role-based auth.

---

## What's NOT Over-Engineering

1. **Audit fields** (`granted_by`, `granted_at`) - Required for compliance and troubleshooting
2. **Foreign key constraints** - Data integrity is not optional
3. **Indexes** - Performance is not optional
4. **Permission constants** - Single source of truth prevents typos
5. **Logging** - Debugging auth issues requires logs
6. **Simple CRUD APIs** - You'll need these to manage permissions

## What IS Over-Engineering

1. ~~Permission override table~~ - Use main table
2. ~~Complex migration verification~~ - Just test
3. ~~Elaborate UI components upfront~~ - Build when needed
4. ~~Helper functions you don't use yet~~ - Add when needed
5. ~~Backward compatibility~~ - Clean break

---

## Implementation Timeline

**Day 1**: Database + Backend
- Morning: Run migration, update auth.js
- Afternoon: Update checkPermission.js, test backend
- Evening: Deploy backend, verify login works

**Day 2**: Frontend
- Morning: Create permission constants
- Afternoon: Replace role checks in components
- Evening: Test all features, fix issues

**Day 3**: Admin APIs + UI
- Morning: Build permission CRUD APIs
- Afternoon: Build simple permission editor
- Evening: Test permission management

**Total: 3 days** (not 2 hours, not 1 week)

---

## Success Criteria

1. ✅ All auth checks use permissions, not roles
2. ✅ User can have permissions without role
3. ✅ Audit trail shows who granted what permission when
4. ✅ Admin can grant/revoke individual permissions
5. ✅ No role-based checks in codebase
6. ✅ System maintains data integrity (FK constraints)
7. ✅ Performance is acceptable (<100ms auth checks)
8. ✅ System is debuggable (proper logging)

---

## Summary

**This is the right balance**:
- Not over-engineered (no unnecessary features)
- Not under-engineered (has proper audit trail, constraints, indexes)
- Production-ready (won't need rework later)
- Maintainable (clear code, good logging)
- Testable (can verify it works)

**Long-term solution, not patchwork.**
