-- Grant Admin role to james@7dmanufacturing.com
-- Run this via Railway CLI: railway run mysql < scripts/grant-admin-role.sql

-- Get user ID and Admin role ID
SET @userId = (SELECT id FROM users WHERE email = 'james@7dmanufacturing.com');
SET @adminRoleId = (SELECT id FROM core_roles WHERE name = 'Admin');

-- Display current roles
SELECT 'Current roles for james@7dmanufacturing.com:' as status;
SELECT u.email, r.name as role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN core_roles r ON ur.role_id = r.id
WHERE u.email = 'james@7dmanufacturing.com';

-- Grant Admin role (skip if already exists)
INSERT IGNORE INTO user_roles (user_id, role_id)
VALUES (@userId, @adminRoleId);

-- Display updated roles
SELECT 'Updated roles for james@7dmanufacturing.com:' as status;
SELECT u.email, r.name as role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN core_roles r ON ur.role_id = r.id
WHERE u.email = 'james@7dmanufacturing.com';

-- Show all available roles for reference
SELECT 'Available roles in system:' as status;
SELECT id, name, description FROM core_roles;
