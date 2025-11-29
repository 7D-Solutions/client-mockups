-- Migration 015: Simplified Permission System
-- Reduces 109 permissions to 5 core permissions
-- Date: 2025-10-29

-- ============================================
-- STEP 1: Create New Simplified Permissions
-- ============================================

INSERT INTO core_permissions (module_id, resource, action, description) VALUES
-- Gauge Module (3 permissions)
('gauge', 'manage', 'execute', 'Create, edit, and delete gauge inventory records'),
('gauge', 'certificates', 'manage', 'Record calibration data, manage batches, upload certificates'),
('gauge', 'inspection', 'perform', 'Perform QC inspections, approve/reject gauges, handle unseals'),

-- Admin Module (2 permissions)
('admin', 'users', 'manage', 'Manage user accounts, reset passwords, assign permissions'),
('admin', 'system', 'manage', 'System settings, maintenance, audit logs, rejection reasons')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================
-- STEP 2: Get New Permission IDs
-- ============================================

SET @perm_gauge_manage = (SELECT id FROM core_permissions WHERE module_id = 'gauge' AND resource = 'manage' AND action = 'execute');
SET @perm_gauge_certificates = (SELECT id FROM core_permissions WHERE module_id = 'gauge' AND resource = 'certificates' AND action = 'manage');
SET @perm_gauge_inspection = (SELECT id FROM core_permissions WHERE module_id = 'gauge' AND resource = 'inspection' AND action = 'perform');
SET @perm_admin_users = (SELECT id FROM core_permissions WHERE module_id = 'admin' AND resource = 'users' AND action = 'manage');
SET @perm_admin_system = (SELECT id FROM core_permissions WHERE module_id = 'admin' AND resource = 'system' AND action = 'manage');

-- ============================================
-- STEP 3: Map Old Permissions to New Ones
-- ============================================

-- Create temporary table for permission mapping
CREATE TEMPORARY TABLE permission_mapping (
    old_permission VARCHAR(255),
    new_permission_id INT,
    INDEX(old_permission)
);

-- Map gauge management permissions → gauge.manage
INSERT INTO permission_mapping (old_permission, new_permission_id)
SELECT CONCAT(p.module_id, '.', p.resource, '.', p.action), @perm_gauge_manage
FROM core_permissions p
WHERE CONCAT(p.module_id, '.', p.resource, '.', p.action) IN (
    'gauge.gauges.create',
    'gauge.gauges.update',
    'gauge.gauges.edit',
    'gauge.gauges.delete',
    'gauge.gauge.create',
    'gauge.gauge.update',
    'gauge.gauge.edit',
    'gauge.gauge.delete',
    'gauges.create.permission',
    'gauges.update.permission',
    'gauges.delete.permission',
    'gauge.sets.create',
    'gauge.sets.update',
    'gauge.sets.delete',
    'gauge.sets.manage',
    'gauge.set.assign',
    'gauge.set.remove'
);

-- Map calibration administrative permissions → gauge.certificates
INSERT INTO permission_mapping (old_permission, new_permission_id)
SELECT CONCAT(p.module_id, '.', p.resource, '.', p.action), @perm_gauge_certificates
FROM core_permissions p
WHERE CONCAT(p.module_id, '.', p.resource, '.', p.action) IN (
    'gauge.calibration.record_internal',
    'gauge.calibration.record_external',
    'gauge.calibration.edit_cert',
    'gauge.calibration.create',
    'gauge.calibration.update',
    'calibration.record.',
    'calibration.edit.'
);

-- Map QC and inspection permissions → gauge.inspection
INSERT INTO permission_mapping (old_permission, new_permission_id)
SELECT CONCAT(p.module_id, '.', p.resource, '.', p.action), @perm_gauge_inspection
FROM core_permissions p
WHERE CONCAT(p.module_id, '.', p.resource, '.', p.action) IN (
    'gauge.qc.perform',
    'gauge.qc.approve',
    'gauge.qc.verify',
    'qc.perform.',
    'qc.approve.'
);

-- Map admin user permissions → admin.users
INSERT INTO permission_mapping (old_permission, new_permission_id)
SELECT CONCAT(p.module_id, '.', p.resource, '.', p.action), @perm_admin_users
FROM core_permissions p
WHERE CONCAT(p.module_id, '.', p.resource, '.', p.action) IN (
    'admin.users.manage',
    'admin.users.create',
    'admin.users.read',
    'admin.users.update',
    'admin.users.delete',
    'users.users.read',
    'users.users.create',
    'users.users.update',
    'users.users.delete'
);

-- Map admin system permissions → admin.system
INSERT INTO permission_mapping (old_permission, new_permission_id)
SELECT CONCAT(p.module_id, '.', p.resource, '.', p.action), @perm_admin_system
FROM core_permissions p
WHERE CONCAT(p.module_id, '.', p.resource, '.', p.action) IN (
    'admin.system.manage',
    'admin.system.read',
    'admin.maintenance.*',
    'admin.recovery.*',
    'auth.audit.view',
    'admin.audit.manage'
);

-- ============================================
-- STEP 4: Migrate User Permissions
-- ============================================

-- Grant new permissions based on old permissions
INSERT IGNORE INTO core_user_permissions (user_id, permission_id)
SELECT DISTINCT
    up.user_id,
    pm.new_permission_id
FROM core_user_permissions up
INNER JOIN core_permissions p ON up.permission_id = p.id
INNER JOIN permission_mapping pm ON CONCAT(p.module_id, '.', p.resource, '.', p.action) = pm.old_permission
WHERE pm.new_permission_id IS NOT NULL;

-- ============================================
-- STEP 5: Migrate Role Permissions
-- ============================================

-- Grant new permissions to roles based on old permissions
INSERT IGNORE INTO core_role_permissions (role_id, permission_id)
SELECT DISTINCT
    rp.role_id,
    pm.new_permission_id
FROM core_role_permissions rp
INNER JOIN core_permissions p ON rp.permission_id = p.id
INNER JOIN permission_mapping pm ON CONCAT(p.module_id, '.', p.resource, '.', p.action) = pm.old_permission
WHERE pm.new_permission_id IS NOT NULL;

-- ============================================
-- STEP 6: Update Role Templates
-- ============================================

-- Get role IDs
SET @role_admin = (SELECT id FROM core_roles WHERE name = 'admin' LIMIT 1);
SET @role_manager = (SELECT id FROM core_roles WHERE name = 'manager' LIMIT 1);
SET @role_operator = (SELECT id FROM core_roles WHERE name = 'operator' LIMIT 1);
SET @role_inspector = (SELECT id FROM core_roles WHERE name = 'inspector' LIMIT 1);
SET @role_quality_manager = (SELECT id FROM core_roles WHERE name = 'quality_manager' LIMIT 1);

-- Admin Role Template (all permissions)
INSERT IGNORE INTO core_role_permissions (role_id, permission_id) VALUES
(@role_admin, @perm_gauge_manage),
(@role_admin, @perm_gauge_certificates),
(@role_admin, @perm_gauge_inspection),
(@role_admin, @perm_admin_users),
(@role_admin, @perm_admin_system);

-- Manager Role Template (all gauge operations)
INSERT IGNORE INTO core_role_permissions (role_id, permission_id) VALUES
(@role_manager, @perm_gauge_manage),
(@role_manager, @perm_gauge_certificates),
(@role_manager, @perm_gauge_inspection);

-- Inspector Role Template (inspection only)
INSERT IGNORE INTO core_role_permissions (role_id, permission_id) VALUES
(@role_inspector, @perm_gauge_inspection);

-- Quality Manager Role Template (certificates + inspection)
INSERT IGNORE INTO core_role_permissions (role_id, permission_id) VALUES
(@role_quality_manager, @perm_gauge_certificates),
(@role_quality_manager, @perm_gauge_inspection);

-- Operator Role Template (baseline only - no special permissions needed)
-- Operators can view and checkout/return by default

-- ============================================
-- STEP 7: Cleanup (Optional - run separately)
-- ============================================

-- Uncomment these lines after verifying the migration works correctly:

-- Delete old user permissions (keep only new simplified ones)
-- DELETE up FROM core_user_permissions up
-- INNER JOIN core_permissions p ON up.permission_id = p.id
-- WHERE p.id NOT IN (@perm_gauge_manage, @perm_gauge_certificates, @perm_gauge_inspection, @perm_admin_users, @perm_admin_system);

-- Delete old role permissions (keep only new simplified ones)
-- DELETE rp FROM core_role_permissions rp
-- INNER JOIN core_permissions p ON rp.permission_id = p.id
-- WHERE p.id NOT IN (@perm_gauge_manage, @perm_gauge_certificates, @perm_gauge_inspection, @perm_admin_users, @perm_admin_system);

-- Delete old permission definitions (keep only new simplified ones)
-- DELETE FROM core_permissions
-- WHERE id NOT IN (@perm_gauge_manage, @perm_gauge_certificates, @perm_gauge_inspection, @perm_admin_users, @perm_admin_system);

-- ============================================
-- STEP 8: Verification Queries
-- ============================================

-- Verify new permissions created
SELECT 'New Permissions Created:' as status;
SELECT id, CONCAT(module_id, '.', resource, '.', action) as permission, description
FROM core_permissions
WHERE id IN (@perm_gauge_manage, @perm_gauge_certificates, @perm_gauge_inspection, @perm_admin_users, @perm_admin_system);

-- Verify user permissions migrated
SELECT 'User Permission Counts:' as status;
SELECT
    u.id,
    u.email,
    COUNT(DISTINCT up.permission_id) as permission_count,
    GROUP_CONCAT(DISTINCT CONCAT(p.module_id, '.', p.resource, '.', p.action)) as permissions
FROM core_users u
LEFT JOIN core_user_permissions up ON u.id = up.user_id
LEFT JOIN core_permissions p ON up.permission_id = p.id
WHERE u.is_active = 1
  AND p.id IN (@perm_gauge_manage, @perm_gauge_certificates, @perm_gauge_inspection, @perm_admin_users, @perm_admin_system)
GROUP BY u.id, u.email;

-- Verify role templates
SELECT 'Role Permission Templates:' as status;
SELECT
    r.name as role_name,
    COUNT(DISTINCT rp.permission_id) as permission_count,
    GROUP_CONCAT(DISTINCT CONCAT(p.module_id, '.', p.resource, '.', p.action)) as permissions
FROM core_roles r
LEFT JOIN core_role_permissions rp ON r.id = rp.role_id
LEFT JOIN core_permissions p ON rp.permission_id = p.id
WHERE p.id IN (@perm_gauge_manage, @perm_gauge_certificates, @perm_gauge_inspection, @perm_admin_users, @perm_admin_system)
GROUP BY r.id, r.name;

-- Check for users without any new permissions
SELECT 'Users Without New Permissions (should investigate):' as status;
SELECT u.id, u.email, u.name
FROM core_users u
WHERE u.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM core_user_permissions up
    WHERE up.user_id = u.id
      AND up.permission_id IN (@perm_gauge_manage, @perm_gauge_certificates, @perm_gauge_inspection, @perm_admin_users, @perm_admin_system)
  );

-- Drop temporary table
DROP TEMPORARY TABLE IF EXISTS permission_mapping;
