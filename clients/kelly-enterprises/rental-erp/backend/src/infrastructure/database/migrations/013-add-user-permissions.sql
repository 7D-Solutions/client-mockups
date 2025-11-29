-- Migration: Add direct user permissions table
-- Date: 2025-10-28
-- Purpose: Enable permission-based authorization (users have permissions, not roles)

-- Create core_user_permissions table
CREATE TABLE IF NOT EXISTS core_user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES core_permissions(id) ON DELETE CASCADE,

  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COMMENT='Direct user permissions - users own permissions, roles are templates';

-- Migrate existing role-based permissions to direct user permissions
-- This copies all permissions from user roles to direct user permissions
-- Only for active users (filters out orphaned role assignments)
INSERT INTO core_user_permissions (user_id, permission_id)
SELECT DISTINCT ur.user_id, rp.permission_id
FROM core_user_roles ur
JOIN core_users u ON ur.user_id = u.id
JOIN core_role_permissions rp ON ur.role_id = rp.role_id
WHERE u.is_active = 1 AND u.is_deleted = 0
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

-- Verification query (run manually to verify migration)
-- SELECT
--   u.email,
--   COUNT(up.permission_id) as permission_count
-- FROM core_users u
-- LEFT JOIN core_user_permissions up ON u.id = up.user_id
-- WHERE u.is_active = 1
-- GROUP BY u.id, u.email
-- ORDER BY u.email;
