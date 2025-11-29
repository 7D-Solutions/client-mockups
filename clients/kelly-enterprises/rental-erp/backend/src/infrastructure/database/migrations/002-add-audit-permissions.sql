-- Migration: Add audit.view permission for audit log access
-- Date: 2025-08-20
-- Purpose: Fix missing audit permissions that prevent audit system access

-- Step 1: Add audit.view permission
INSERT INTO core_permissions (module_id, resource, action, description) 
VALUES ('auth', 'audit', 'view', 'View system audit logs and reports');

-- Step 2: Get the permission ID and role IDs for assignment
-- Assign audit.view permission to admin and super_admin roles
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r
CROSS JOIN core_permissions p
WHERE r.name IN ('admin', 'super_admin') 
  AND p.module_id = 'auth'
  AND p.resource = 'audit' 
  AND p.action = 'view'
  AND NOT EXISTS (
    SELECT 1 FROM core_role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Step 3: Verify the permission was created and assigned
SELECT 
    p.id as permission_id,
    CONCAT(p.module_id, '.', p.resource, '.', p.action) as permission,
    p.description,
    GROUP_CONCAT(r.name ORDER BY r.name) as assigned_to_roles
FROM core_permissions p
LEFT JOIN core_role_permissions rp ON p.id = rp.permission_id
LEFT JOIN core_roles r ON rp.role_id = r.id
WHERE p.resource = 'audit'
GROUP BY p.id, p.module_id, p.resource, p.action, p.description;