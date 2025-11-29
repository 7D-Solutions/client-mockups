-- Update 'admin' role to 'Admin' for consistency
UPDATE core_roles
SET name = 'Admin'
WHERE name = 'admin';
