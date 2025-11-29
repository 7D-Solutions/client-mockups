-- Migration 015: Implement 8-Permission System
-- Clean implementation - no backward compatibility needed (development phase)
-- Based on: Permissions_Complete_v2.0.md
-- Date: 2025-10-29

-- ============================================
-- STEP 1: Clean Slate - Remove Old Permissions
-- ============================================

-- First, clear navigation permission links (foreign key dependency)
UPDATE core_navigation SET required_permission_id = NULL WHERE required_permission_id IS NOT NULL;

-- Now disable foreign key checks and truncate everything
SET FOREIGN_KEY_CHECKS = 0;

-- Truncate all permission tables (TRUNCATE bypasses DELETE triggers and is faster)
TRUNCATE TABLE core_user_permission_overrides;
TRUNCATE TABLE core_user_permissions;
TRUNCATE TABLE core_role_permissions;
TRUNCATE TABLE core_permissions;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- STEP 2: Create 8 Core Permissions
-- ============================================

INSERT INTO core_permissions (module_id, resource, action, description) VALUES
-- Gauge Module (3 permissions)
('gauge', 'view', 'access', 'View gauges and details'),
('gauge', 'operate', 'execute', 'Checkout, return, transfer gauges'),
('gauge', 'manage', 'full', 'Create, edit, retire gauges'),

-- Calibration (1 permission)
('calibration', 'manage', 'full', 'Record calibration results, manage calibration'),

-- User Management (1 permission)
('user', 'manage', 'full', 'Create/edit users, assign roles'),

-- System Administration (1 permission)
('system', 'admin', 'full', 'System configuration, recovery tools'),

-- Audit (1 permission)
('audit', 'view', 'access', 'View audit logs'),

-- Data Export (1 permission)
('data', 'export', 'execute', 'Export reports');

-- ============================================
-- STEP 3: Get Permission IDs
-- ============================================

SET @perm_gauge_view = (SELECT id FROM core_permissions WHERE module_id = 'gauge' AND resource = 'view');
SET @perm_gauge_operate = (SELECT id FROM core_permissions WHERE module_id = 'gauge' AND resource = 'operate');
SET @perm_gauge_manage = (SELECT id FROM core_permissions WHERE module_id = 'gauge' AND resource = 'manage');
SET @perm_calibration_manage = (SELECT id FROM core_permissions WHERE module_id = 'calibration' AND resource = 'manage');
SET @perm_user_manage = (SELECT id FROM core_permissions WHERE module_id = 'user' AND resource = 'manage');
SET @perm_system_admin = (SELECT id FROM core_permissions WHERE module_id = 'system' AND resource = 'admin');
SET @perm_audit_view = (SELECT id FROM core_permissions WHERE module_id = 'audit' AND resource = 'view');
SET @perm_data_export = (SELECT id FROM core_permissions WHERE module_id = 'data' AND resource = 'export');

-- ============================================
-- STEP 4: Grant Baseline Permissions to All Active Users
-- ============================================

-- All active users get gauge.view and gauge.operate (baseline access)
INSERT IGNORE INTO core_user_permissions (user_id, permission_id)
SELECT u.id, @perm_gauge_view
FROM core_users u
WHERE u.is_active = 1;

INSERT IGNORE INTO core_user_permissions (user_id, permission_id)
SELECT u.id, @perm_gauge_operate
FROM core_users u
WHERE u.is_active = 1;

-- ============================================
-- STEP 5: Grant Admin Permissions to Specific Users
-- ============================================

-- Grant full permissions to admin users (adjust emails as needed)
INSERT IGNORE INTO core_user_permissions (user_id, permission_id)
SELECT u.id, p.id
FROM core_users u
CROSS JOIN core_permissions p
WHERE u.email IN (
    'admin@fireprooferp.com',
    'james@7dmanufacturing.com',
    'test@test.com'
)
AND u.is_active = 1;

-- Grant gauge management + calibration to specific power users
INSERT IGNORE INTO core_user_permissions (user_id, permission_id)
SELECT u.id, p.id
FROM core_users u
CROSS JOIN core_permissions p
WHERE u.email IN (
    'joshua.smith@7dmanufacturing.com'
)
AND p.id IN (@perm_gauge_manage, @perm_calibration_manage, @perm_audit_view, @perm_data_export)
AND u.is_active = 1;

-- ============================================
-- STEP 6: Setup Role Templates
-- ============================================

-- Get or create role IDs
INSERT IGNORE INTO core_roles (name, description) VALUES
('operator', 'Basic user - view and operate gauges'),
('inspector', 'QC inspector - calibration and inspection'),
('manager', 'Manager - full gauge management'),
('admin', 'Administrator - user management'),
('super_admin', 'Super Admin - full system access');

SET @role_operator = (SELECT id FROM core_roles WHERE name = 'operator');
SET @role_inspector = (SELECT id FROM core_roles WHERE name = 'inspector');
SET @role_manager = (SELECT id FROM core_roles WHERE name = 'manager');
SET @role_admin = (SELECT id FROM core_roles WHERE name = 'admin');
SET @role_super_admin = (SELECT id FROM core_roles WHERE name = 'super_admin');

-- Operator Role: gauge.view, gauge.operate (baseline)
INSERT INTO core_role_permissions (role_id, permission_id) VALUES
(@role_operator, @perm_gauge_view),
(@role_operator, @perm_gauge_operate);

-- Inspector Role: baseline + calibration + manage + export + audit
INSERT INTO core_role_permissions (role_id, permission_id) VALUES
(@role_inspector, @perm_gauge_view),
(@role_inspector, @perm_gauge_operate),
(@role_inspector, @perm_gauge_manage),
(@role_inspector, @perm_calibration_manage),
(@role_inspector, @perm_audit_view),
(@role_inspector, @perm_data_export);

-- Manager Role: everything inspector has
INSERT INTO core_role_permissions (role_id, permission_id) VALUES
(@role_manager, @perm_gauge_view),
(@role_manager, @perm_gauge_operate),
(@role_manager, @perm_gauge_manage),
(@role_manager, @perm_calibration_manage),
(@role_manager, @perm_audit_view),
(@role_manager, @perm_data_export);

-- Admin Role: everything except system.admin
INSERT INTO core_role_permissions (role_id, permission_id) VALUES
(@role_admin, @perm_gauge_view),
(@role_admin, @perm_gauge_operate),
(@role_admin, @perm_gauge_manage),
(@role_admin, @perm_calibration_manage),
(@role_admin, @perm_audit_view),
(@role_admin, @perm_data_export),
(@role_admin, @perm_user_manage);

-- Super Admin Role: all 8 permissions
INSERT INTO core_role_permissions (role_id, permission_id) VALUES
(@role_super_admin, @perm_gauge_view),
(@role_super_admin, @perm_gauge_operate),
(@role_super_admin, @perm_gauge_manage),
(@role_super_admin, @perm_calibration_manage),
(@role_super_admin, @perm_audit_view),
(@role_super_admin, @perm_data_export),
(@role_super_admin, @perm_user_manage),
(@role_super_admin, @perm_system_admin);

-- ============================================
-- STEP 7: Verification
-- ============================================

SELECT '=== 8 CORE PERMISSIONS ===' as info;
SELECT
    id,
    CONCAT(module_id, '.', resource) as permission,
    description
FROM core_permissions
ORDER BY module_id, resource;

SELECT '=== USER PERMISSIONS ===' as info;
SELECT
    u.email,
    u.name,
    COUNT(up.permission_id) as permission_count,
    GROUP_CONCAT(CONCAT(p.module_id, '.', p.resource) ORDER BY p.module_id, p.resource SEPARATOR ', ') as permissions
FROM core_users u
LEFT JOIN core_user_permissions up ON u.id = up.user_id
LEFT JOIN core_permissions p ON up.permission_id = p.id
WHERE u.is_active = 1
GROUP BY u.id, u.email, u.name
ORDER BY permission_count DESC, u.email;

SELECT '=== ROLE TEMPLATES ===' as info;
SELECT
    r.name,
    r.description,
    COUNT(rp.permission_id) as permission_count,
    GROUP_CONCAT(CONCAT(p.module_id, '.', p.resource) ORDER BY p.module_id, p.resource SEPARATOR ', ') as permissions
FROM core_roles r
LEFT JOIN core_role_permissions rp ON r.id = rp.role_id
LEFT JOIN core_permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name, r.description
ORDER BY permission_count;

SELECT '=== MIGRATION COMPLETE ===' as status;
SELECT 'All users must log out and log back in for permissions to take effect' as important_note;
