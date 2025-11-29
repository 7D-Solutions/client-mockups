-- Add calibration permission for gauge module
-- This permission allows users to record internal calibrations

INSERT INTO core_permissions (module_id, resource, action, description)
VALUES ('gauge', 'calibration', 'record_internal', 'Record internal calibration measurements and generate certificates')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Grant calibration permission to QA and Admin roles by default
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
CROSS JOIN core_permissions p
WHERE r.name IN ('Admin', 'QA')
  AND p.module_id = 'gauge'
  AND p.resource = 'calibration'
  AND p.action = 'record_internal'
  AND NOT EXISTS (
    SELECT 1 FROM core_role_permissions crp
    WHERE crp.role_id = r.id AND crp.permission_id = p.id
  );
