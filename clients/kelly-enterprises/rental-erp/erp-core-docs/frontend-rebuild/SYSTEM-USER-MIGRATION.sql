-- Migration: Add System User (Ultimate Super Admin)
-- Purpose: Create protected system account to prevent lockout scenarios
-- Date: 2025-10-29

-- Step 1: Add is_system_user column to core_users table
ALTER TABLE core_users
ADD COLUMN IF NOT EXISTS is_system_user BOOLEAN DEFAULT FALSE;

-- Step 2: Create the system user
-- NOTE: Replace the password_hash with a securely hashed password
-- Generate using: bcrypt.hash('your-secure-password', 10)
INSERT INTO core_users (
    username,
    email,
    password_hash,
    first_name,
    last_name,
    is_system_user,
    is_active,
    created_at,
    updated_at
)
SELECT
    'system',
    'system@fireproof.local',
    '$2b$10$REPLACE_WITH_ACTUAL_BCRYPT_HASH', -- IMPORTANT: Generate secure hash
    'System',
    'Administrator',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM core_users WHERE username = 'system'
);

-- Step 3: Grant ALL permissions to system user
-- This ensures system user always has full access
INSERT INTO core_user_permissions (user_id, permission_id, granted_at, granted_by)
SELECT
    u.id AS user_id,
    p.id AS permission_id,
    NOW() AS granted_at,
    u.id AS granted_by  -- System user grants to itself
FROM core_users u
CROSS JOIN core_permissions p
WHERE u.username = 'system'
  AND NOT EXISTS (
      SELECT 1
      FROM core_user_permissions up
      WHERE up.user_id = u.id
        AND up.permission_id = p.id
  );

-- Step 4: Verify system user setup
SELECT
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.is_system_user,
    u.is_active,
    COUNT(up.permission_id) AS permission_count
FROM core_users u
LEFT JOIN core_user_permissions up ON u.id = up.user_id
WHERE u.username = 'system'
GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.is_system_user, u.is_active;

-- Expected result: permission_count should equal total number of permissions (8)

-- Step 5: Create audit log entry for system user creation
INSERT INTO audit_log (
    user_id,
    action,
    details,
    created_at
)
SELECT
    u.id,
    'system.user.created',
    JSON_OBJECT(
        'username', 'system',
        'permissions_granted', (SELECT COUNT(*) FROM core_permissions)
    ),
    NOW()
FROM core_users u
WHERE u.username = 'system'
  AND NOT EXISTS (
      SELECT 1
      FROM audit_log
      WHERE action = 'system.user.created'
  );

-- IMPORTANT SECURITY NOTES:
-- 1. Change the default password immediately after first login
-- 2. Store system user credentials in secure vault (1Password, etc.)
-- 3. Use system account only for emergency recovery
-- 4. Monitor system user login attempts in audit logs
-- 5. Enable 2FA for system user if available

-- Rollback Instructions (USE WITH EXTREME CAUTION):
-- To remove system user (only if migration failed):
-- DELETE FROM core_user_permissions WHERE user_id IN (SELECT id FROM core_users WHERE username = 'system');
-- DELETE FROM core_users WHERE username = 'system';
-- ALTER TABLE core_users DROP COLUMN is_system_user;
