-- Grant super_admin role all existing permissions
-- This migration ensures super_admin has actual database permissions rather than hardcoded bypass logic

-- Grant all existing permissions to super_admin role
INSERT INTO core_role_permissions (role_id, permission_id, created_at)
SELECT
  (SELECT id FROM core_roles WHERE name = 'super_admin') as role_id,
  p.id as permission_id,
  NOW() as created_at
FROM core_permissions p
WHERE NOT EXISTS (
  SELECT 1
  FROM core_role_permissions rp
  WHERE rp.role_id = (SELECT id FROM core_roles WHERE name = 'super_admin')
    AND rp.permission_id = p.id
);

-- Verify: Show count of permissions granted to super_admin
SELECT
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM core_roles r
LEFT JOIN core_role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'super_admin'
GROUP BY r.id, r.name;
