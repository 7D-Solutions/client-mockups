-- Migration 021: Add Inventory Module Permissions
-- Purpose: Enable permission-based access control for inventory module
-- Date: 2025-10-30
-- Based on: 8-permission system pattern

-- ============================================
-- STEP 1: Create Inventory Permissions
-- ============================================

-- Insert inventory permissions into core_permissions table
INSERT INTO core_permissions (module_id, resource, action, description) VALUES
-- Inventory Module (2 permissions)
('inventory', 'view', 'access', 'View inventory dashboard, locations, and movement history'),
('inventory', 'manage', 'full', 'Move items between locations, manage inventory');

-- ============================================
-- STEP 2: Get Permission IDs
-- ============================================

SET @perm_inventory_view = (SELECT id FROM core_permissions WHERE module_id = 'inventory' AND resource = 'view');
SET @perm_inventory_manage = (SELECT id FROM core_permissions WHERE module_id = 'inventory' AND resource = 'manage');

-- ============================================
-- STEP 3: Grant Baseline Permissions
-- ============================================

-- All active users get inventory.view (baseline access)
INSERT IGNORE INTO core_user_permissions (user_id, permission_id)
SELECT u.id, @perm_inventory_view
FROM core_users u
WHERE u.is_active = 1;

-- ============================================
-- STEP 4: Grant Management Permissions to Admin Users
-- ============================================

-- Grant inventory management to admin, super_admin roles (via role templates)
INSERT IGNORE INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
CROSS JOIN core_permissions p
WHERE r.name IN ('admin', 'super_admin', 'manager')
AND p.id IN (@perm_inventory_view, @perm_inventory_manage);

-- Grant inventory management directly to admin users
INSERT IGNORE INTO core_user_permissions (user_id, permission_id)
SELECT u.id, @perm_inventory_manage
FROM core_users u
WHERE u.email IN (
    'admin@fireprooferp.com',
    'james@7dmanufacturing.com',
    'test@test.com'
)
AND u.is_active = 1;

-- ============================================
-- STEP 5: Update Inspector/QC Role Template
-- ============================================

-- Grant inventory permissions to inspector role
INSERT IGNORE INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
CROSS JOIN core_permissions p
WHERE r.name = 'inspector'
AND p.id IN (@perm_inventory_view, @perm_inventory_manage);

-- ============================================
-- STEP 6: Verification
-- ============================================

SELECT '=== INVENTORY PERMISSIONS ===' as info;
SELECT
    id,
    CONCAT(module_id, '.', resource) as permission,
    description
FROM core_permissions
WHERE module_id = 'inventory'
ORDER BY resource;

SELECT '=== USERS WITH INVENTORY PERMISSIONS ===' as info;
SELECT
    u.email,
    u.name,
    GROUP_CONCAT(CONCAT(p.module_id, '.', p.resource) ORDER BY p.resource SEPARATOR ', ') as inventory_permissions
FROM core_users u
JOIN core_user_permissions up ON u.id = up.user_id
JOIN core_permissions p ON up.permission_id = p.id
WHERE u.is_active = 1
AND p.module_id = 'inventory'
GROUP BY u.id, u.email, u.name
ORDER BY u.email;

SELECT '=== ROLE TEMPLATES WITH INVENTORY PERMISSIONS ===' as info;
SELECT
    r.name,
    GROUP_CONCAT(CONCAT(p.module_id, '.', p.resource) ORDER BY p.resource SEPARATOR ', ') as inventory_permissions
FROM core_roles r
JOIN core_role_permissions rp ON r.id = rp.role_id
JOIN core_permissions p ON rp.permission_id = p.id
WHERE p.module_id = 'inventory'
GROUP BY r.id, r.name
ORDER BY r.name;

SELECT '=== MIGRATION COMPLETE ===' as status;
SELECT 'Users must log out and log back in for new permissions to take effect' as important_note;
