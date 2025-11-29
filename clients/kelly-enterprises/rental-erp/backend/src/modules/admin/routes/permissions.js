const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const { getPool } = require('../../../infrastructure/database/connection');
const logger = require('../../../infrastructure/utils/logger');

/**
 * Helper function to check if database pool is ready
 * Returns pool or sends 503 error response
 */
function checkPool(res) {
  const pool = getPool(); // Get current pool value dynamically
  if (!pool) {
    res.status(503).json({
      success: false,
      error: 'Database connection not ready. Please try again in a moment.'
    });
    return null;
  }
  return pool;
}

/**
 * GET /api/admin/permissions
 * Get all available permissions grouped by module
 * Admin only
 */
router.get('/',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const dbPool = checkPool(res);
    if (!dbPool) return;

    const connection = await dbPool.getConnection();

    try {
      const [permissions] = await connection.query(`
        SELECT
          id,
          module_id,
          resource,
          action,
          description,
          created_at
        FROM core_permissions
        ORDER BY module_id, resource, action
      `);

      // Return flat array for frontend
      const permissionList = permissions.map(perm => ({
        id: perm.id,
        module_id: perm.module_id,
        resource: perm.resource,
        action: perm.action,
        description: perm.description
      }));

      res.json({
        success: true,
        data: permissionList
      });
    } catch (error) {
      logger.error('Failed to fetch permissions', { error: error.message });
      throw error;
    } finally {
      connection.release();
    }
  })
);

/**
 * GET /api/admin/users/:userId/permissions
 * Get all permissions for a specific user
 * Admin only
 */
router.get('/users/:userId',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const { userId } = req.params;
    const dbPool = checkPool(res);
    if (!dbPool) return;

    const connection = await dbPool.getConnection();

    try {
      const [permissions] = await connection.query(`
        SELECT
          p.id,
          p.module_id,
          p.resource,
          p.action,
          p.description,
          up.granted_at
        FROM core_user_permissions up
        INNER JOIN core_permissions p ON up.permission_id = p.id
        WHERE up.user_id = ?
        ORDER BY p.module_id, p.resource, p.action
      `, [userId]);

      // Return flat array for frontend
      const permissionList = permissions.map(perm => ({
        id: perm.id,
        module_id: perm.module_id,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        grantedAt: perm.granted_at
      }));

      res.json({
        success: true,
        data: permissionList
      });
    } catch (error) {
      logger.error('Failed to fetch user permissions', {
        userId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  })
);

/**
 * POST /api/admin/users/:userId/permissions
 * Grant a single permission to a user
 * Admin only
 */
router.post('/users/:userId',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const { userId } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
      return res.status(400).json({
        success: false,
        error: 'permissionId is required'
      });
    }

    const dbPool = checkPool(res);
    if (!dbPool) return;

    const connection = await dbPool.getConnection();

    try {
      // Check if user exists
      const [users] = await connection.query(
        'SELECT id, email, name FROM core_users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if permission exists
      const [permissions] = await connection.query(
        'SELECT id, module_id, resource, action FROM core_permissions WHERE id = ?',
        [permissionId]
      );

      if (permissions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Permission not found'
        });
      }

      // Check if user already has this permission
      const [existing] = await connection.query(
        'SELECT id FROM core_user_permissions WHERE user_id = ? AND permission_id = ?',
        [userId, permissionId]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'User already has this permission'
        });
      }

      // Grant the permission
      await connection.query(
        'INSERT INTO core_user_permissions (user_id, permission_id) VALUES (?, ?)',
        [userId, permissionId]
      );

      const permission = permissions[0];
      const fullPermission = `${permission.module_id}.${permission.resource}.${permission.action}`;

      logger.info('Permission granted to user', {
        adminId: req.user.id,
        userId,
        permissionId,
        permission: fullPermission
      });

      res.json({
        success: true,
        message: 'Permission granted successfully',
        permission: fullPermission
      });
    } catch (error) {
      logger.error('Failed to grant permission', {
        userId,
        permissionId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  })
);

/**
 * POST /api/admin/users/:userId/permissions/bulk
 * Grant multiple permissions to a user
 * Admin only
 */
router.post('/users/:userId/bulk',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const { userId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'permissionIds array is required'
      });
    }

    const dbPool = checkPool(res);
    if (!dbPool) return;

    const connection = await dbPool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if user exists
      const [users] = await connection.query(
        'SELECT id, email, name FROM core_users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get all requested permissions
      const placeholders = permissionIds.map(() => '?').join(',');
      const [permissions] = await connection.query(
        `SELECT id, module_id, resource, action
         FROM core_permissions
         WHERE id IN (${placeholders})`,
        permissionIds
      );

      if (permissions.length !== permissionIds.length) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'One or more permissions not found'
        });
      }

      // Get existing permissions for this user
      const [existing] = await connection.query(
        `SELECT permission_id FROM core_user_permissions WHERE user_id = ?`,
        [userId]
      );

      const existingIds = new Set(existing.map(row => row.permission_id));
      const newPermissions = permissionIds.filter(id => !existingIds.has(id));

      if (newPermissions.length === 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: 'User already has all these permissions'
        });
      }

      // Bulk insert new permissions
      const values = newPermissions.map(permId => [userId, permId]);
      await connection.query(
        'INSERT INTO core_user_permissions (user_id, permission_id) VALUES ?',
        [values]
      );

      await connection.commit();

      logger.info('Bulk permissions granted to user', {
        adminId: req.user.id,
        userId,
        count: newPermissions.length,
        skipped: permissionIds.length - newPermissions.length
      });

      res.json({
        success: true,
        message: `Granted ${newPermissions.length} permission(s)`,
        granted: newPermissions.length,
        skipped: permissionIds.length - newPermissions.length
      });
    } catch (error) {
      await connection.rollback();
      logger.error('Failed to grant bulk permissions', {
        userId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  })
);

/**
 * DELETE /api/admin/users/:userId/permissions/bulk
 * Revoke multiple permissions from a user
 * Admin only
 */
router.delete('/users/:userId/bulk',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const { userId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'permissionIds array is required'
      });
    }

    const dbPool = checkPool(res);
    if (!dbPool) return;

    const connection = await dbPool.getConnection();

    try {
      // Build placeholders for IN clause
      const placeholders = permissionIds.map(() => '?').join(',');

      // Delete the permissions
      const [result] = await connection.query(
        `DELETE FROM core_user_permissions
         WHERE user_id = ? AND permission_id IN (${placeholders})`,
        [userId, ...permissionIds]
      );

      logger.info('Bulk permissions revoked from user', {
        adminId: req.user.id,
        userId,
        count: result.affectedRows
      });

      res.json({
        success: true,
        message: `Revoked ${result.affectedRows} permission(s)`,
        revoked: result.affectedRows
      });
    } catch (error) {
      logger.error('Failed to revoke bulk permissions', {
        userId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  })
);

/**
 * DELETE /api/admin/users/:userId/permissions/:permissionId
 * Revoke a permission from a user
 * Admin only
 */
router.delete('/users/:userId/:permissionId',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const { userId, permissionId } = req.params;
    const dbPool = checkPool(res);
    if (!dbPool) return;

    const connection = await dbPool.getConnection();

    try {
      // Check if user has this permission
      const [existing] = await connection.query(
        `SELECT p.module_id, p.resource, p.action
         FROM core_user_permissions up
         INNER JOIN core_permissions p ON up.permission_id = p.id
         WHERE up.user_id = ? AND up.permission_id = ?`,
        [userId, permissionId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User does not have this permission'
        });
      }

      // Revoke the permission
      await connection.query(
        'DELETE FROM core_user_permissions WHERE user_id = ? AND permission_id = ?',
        [userId, permissionId]
      );

      const permission = existing[0];
      const fullPermission = `${permission.module_id}.${permission.resource}.${permission.action}`;

      logger.info('Permission revoked from user', {
        adminId: req.user.id,
        userId,
        permissionId,
        permission: fullPermission
      });

      res.json({
        success: true,
        message: 'Permission revoked successfully',
        permission: fullPermission
      });
    } catch (error) {
      logger.error('Failed to revoke permission', {
        userId,
        permissionId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  })
);

/**
 * GET /api/admin/roles/:roleId/permissions
 * Get all permissions for a role (for role templates)
 * Admin only
 */
router.get('/roles/:roleId',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const { roleId } = req.params;
    const dbPool = checkPool(res);
    if (!dbPool) return;

    const connection = await dbPool.getConnection();

    try {
      // Get role info
      const [roles] = await connection.query(
        'SELECT id, name, description FROM core_roles WHERE id = ?',
        [roleId]
      );

      if (roles.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }

      // Get role permissions
      const [permissions] = await connection.query(`
        SELECT
          p.id,
          p.module_id,
          p.resource,
          p.action,
          p.description,
          CONCAT(p.module_id, '.', p.resource, '.', p.action) as full_permission
        FROM core_role_permissions rp
        INNER JOIN core_permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ?
        ORDER BY p.module_id, p.resource, p.action
      `, [roleId]);

      res.json({
        success: true,
        role: roles[0],
        permissions: permissions.map(p => ({
          id: p.id,
          fullPermission: p.full_permission,
          description: p.description
        })),
        total: permissions.length
      });
    } catch (error) {
      logger.error('Failed to fetch role permissions', {
        roleId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  })
);

/**
 * POST /api/admin/users/:userId/permissions/apply-role-template
 * Apply all permissions from a role to a user
 * Admin only
 */
router.post('/users/:userId/apply-role-template',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: 'roleId is required'
      });
    }

    const dbPool = checkPool(res);
    if (!dbPool) return;

    const connection = await dbPool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if user exists
      const [users] = await connection.query(
        'SELECT id, email, name FROM core_users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if role exists
      const [roles] = await connection.query(
        'SELECT id, name FROM core_roles WHERE id = ?',
        [roleId]
      );

      if (roles.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }

      // Get all permissions for this role
      const [rolePermissions] = await connection.query(
        'SELECT permission_id FROM core_role_permissions WHERE role_id = ?',
        [roleId]
      );

      if (rolePermissions.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'Role has no permissions assigned'
        });
      }

      // Get existing user permissions
      const [existing] = await connection.query(
        'SELECT permission_id FROM core_user_permissions WHERE user_id = ?',
        [userId]
      );

      const existingIds = new Set(existing.map(row => row.permission_id));
      const newPermissions = rolePermissions
        .map(row => row.permission_id)
        .filter(id => !existingIds.has(id));

      if (newPermissions.length === 0) {
        await connection.rollback();
        return res.status(200).json({
          success: true,
          message: 'User already has all permissions from this role',
          granted: 0,
          skipped: rolePermissions.length
        });
      }

      // Bulk insert new permissions
      const values = newPermissions.map(permId => [userId, permId]);
      await connection.query(
        'INSERT INTO core_user_permissions (user_id, permission_id) VALUES ?',
        [values]
      );

      await connection.commit();

      logger.info('Role template applied to user', {
        adminId: req.user.id,
        userId,
        roleId,
        roleName: roles[0].name,
        granted: newPermissions.length,
        skipped: rolePermissions.length - newPermissions.length
      });

      res.json({
        success: true,
        message: `Applied ${roles[0].name} template: granted ${newPermissions.length} permission(s)`,
        granted: newPermissions.length,
        skipped: rolePermissions.length - newPermissions.length
      });
    } catch (error) {
      await connection.rollback();
      logger.error('Failed to apply role template', {
        userId,
        roleId,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  })
);

module.exports = router;
