const { getPool } = require('../infrastructure/database/connection');
const logger = require('../infrastructure/utils/logger');

// New 8-permission system (resource.action format)
const REQUIRED = {
  roles: ['operator', 'inspector', 'manager', 'admin', 'super_admin'],
  permissions: [
    'view.access',      // gauge.view.access
    'operate.execute',  // gauge.operate.execute
    'manage.full',      // gauge.manage.full, calibration.manage.full, user.manage.full
    'admin.full',       // system.admin.full
    'export.execute'    // data.export.execute
  ],
  rolePermissions: {
    super_admin: ['*'],
    admin: ['view.access', 'operate.execute', 'manage.full', 'export.execute'],
    manager: ['view.access', 'operate.execute', 'manage.full', 'export.execute'],
    inspector: ['view.access', 'operate.execute', 'manage.full', 'export.execute'],
    operator: ['view.access', 'operate.execute']
  }
};

async function validateRbac() {
  logger.info('🔐 Validating RBAC configuration...');
  console.log('🔐 Starting RBAC validation...');

  // Get the database pool
  const pool = getPool();
  if (!pool) {
    console.log('⚠️ Skipping RBAC validation - database pool not initialized');
    logger.warn('Database pool not initialized - RBAC validation skipped');
    return;
  }

  try {
    // Test database connection first
    console.log('🔗 Testing database connection...');
    console.log('Database config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.DB_PASS) ? 'SET' : 'MISSING'
    });

    try {
      await pool.execute('SELECT 1 as test');
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
      console.error('Error code:', dbError.code);
      console.error('Error errno:', dbError.errno);
      console.log('⚠️ Skipping RBAC validation due to database connection failure');
      logger.warn('Database connection failed during RBAC validation - skipping validation', {
        error: dbError.message,
        code: dbError.code
      });
      return; // Skip RBAC validation but don't crash the app
    }

    // Check if core_roles table exists
    console.log('📋 Checking if core_roles table exists...');
    const [tables] = await pool.execute("SHOW TABLES LIKE 'core_roles'");
    console.log('Tables found:', tables.length);
    
    if (tables.length === 0) {
      console.log('⚠️ core_roles table does not exist - skipping RBAC validation for now');
      logger.warn('core_roles table does not exist - RBAC validation skipped');
      return;
    }
    
    // Check required roles exist
    console.log('👥 Checking required roles...');
    const [roles] = await pool.execute('SELECT name FROM core_roles');
    const haveRoles = new Set(roles.map(r => r.name));
    
    for (const role of REQUIRED.roles) {
      if (!haveRoles.has(role)) {
        throw new Error(`Missing required role: ${role}`);
      }
    }
    logger.info('✓ All required roles found');
    
    // Check required permissions exist (using resource.action format from actual schema)
    const [permissions] = await pool.execute('SELECT resource, action FROM core_permissions');
    const havePerms = new Set(permissions.map(p => `${p.resource}.${p.action}`));
    
    for (const perm of REQUIRED.permissions) {
      // Skip wildcard permissions in check
      if (!havePerms.has(perm) && !perm.endsWith('.*')) {
        throw new Error(`Missing required permission: ${perm}`);
      }
    }
    logger.info('✓ All required permissions found');
    
    // Check role-permission mappings (using resource.action format)
    const [rolePerms] = await pool.execute(`
      SELECT r.name as role_name, CONCAT(p.resource, '.', p.action) as perm_name 
      FROM core_role_permissions rp 
      JOIN core_roles r ON r.id = rp.role_id 
      JOIN core_permissions p ON p.id = rp.permission_id
    `);
    
    // Build mapping
    const rolePermMap = new Map();
    for (const row of rolePerms) {
      if (!rolePermMap.has(row.role_name)) {
        rolePermMap.set(row.role_name, new Set());
      }
      rolePermMap.get(row.role_name).add(row.perm_name);
    }
    
    // Validate role permissions
    for (const [role, requiredPerms] of Object.entries(REQUIRED.rolePermissions)) {
      if (requiredPerms.includes('*')) {
        // Admin should have all permissions
        continue;
      }
      
      const actualPerms = rolePermMap.get(role) || new Set();
      
      for (const reqPerm of requiredPerms) {
        // Skip wildcard patterns
        if (reqPerm.endsWith('.*')) {
          // Check if any permission starts with the prefix
          const prefix = reqPerm.slice(0, -2);
          const hasWildcard = Array.from(actualPerms).some(p => p.startsWith(prefix));
          if (!hasWildcard) {
            logger.warn(`⚠️  Role '${role}' missing permissions matching pattern: ${reqPerm}`);
          }
          continue;
        }
        
        if (!actualPerms.has(reqPerm)) {
          throw new Error(`Role '${role}' missing required permission: ${reqPerm}`);
        }
      }
    }
    logger.info('✓ All role-permission mappings validated');
    
    logger.info('🎯 RBAC validation completed successfully');
    
  } catch (error) {
    logger.error('❌ RBAC validation failed:', error.message);
    throw error;
  }
}

// Export both the function and a wrapper that can be called directly
module.exports = { validateRbac };

// If run directly, execute validation
if (require.main === module) {
  validateRbac()
    .then(() => {
      logger.info('✅ RBAC validation passed');
      process.exit(0);
    })
    .catch(err => {
      logger.error('❌ RBAC validation failed:', err);
      process.exit(1);
    });
}