/**
 * Admin Service
 * Handles all administrative business logic including user management
 */

const bcrypt = require('bcryptjs');
const BaseService = require('../../../infrastructure/services/BaseService');
const logger = require('../../../infrastructure/utils/logger');
// const { generateUniqueUsername } = require('../utils/usernameGenerator'); // Not needed until username field exists in DB

class AdminService extends BaseService {
    constructor(adminRepository, options = {}) {
        super(adminRepository, options);
    }

    /**
     * Get all users with their roles
     */
    async getAllUsers(page = 1, limit = 50, search = '', sortBy = 'name', sortOrder = 'asc') {
        try {
            const offset = (page - 1) * limit;
            const result = await this.repository.getUsers({ limit, offset, includeDeleted: false, search, sortBy, sortOrder });
            
            // Format users with roles array and transform data model to match frontend expectations
            const formattedUsers = result.users.map(user => {
                // Transform stored name into firstName and lastName for frontend compatibility
                const nameParts = user.name.trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                return {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    firstName,
                    lastName,
                    isActive: user.is_active === 1,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at,
                    lastLogin: user.last_login || null,
                    roles: user.roles
                };
            });
            
            return {
                users: formattedUsers,
                total: result.total,
                page: result.page,
                limit,
                totalPages: result.totalPages
            };
        } catch (error) {
            logger.error('Failed to get all users', { page, limit, search, error: error.message });
            throw new Error(`Failed to get all users: ${error.message}`);
        }
    }

    /**
     * Get user by ID with roles and permissions
     */
    async getUserById(userId) {
        try {
            const user = await this.repository.findByIdWithRoles(userId);
            
            if (!user) {
                return null;
            }
            
            // Transform data model to match frontend expectations
            const nameParts = user.name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            return {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName,
                lastName,
                isActive: user.is_active === 1,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                lastLogin: user.last_login || null,
                roles: user.roles,
                permissions: user.permissions || []
            };
        } catch (error) {
            logger.error('Failed to get user by ID', { userId, error: error.message });
            throw new Error(`Failed to get user by ID: ${error.message}`);
        }
    }

    /**
     * Create a new user
     */
    async createUser(userData) {
        return this.executeInTransaction(async (conn) => {

            const { email, firstName, lastName, username, department, phone, password, roleNames = [] } = userData;

            // Preserve user's capitalization for names (handles LaDonna, McDonald, O'Brien, etc.)
            // Just trim whitespace
            const trimmedFirstName = (firstName || '').trim();
            const trimmedLastName = (lastName || '').trim();

            // Combine firstName and lastName into name for database storage
            const name = `${trimmedFirstName} ${trimmedLastName}`.trim() || username || email || 'User';

            // Check if email already exists (only if email is provided)
            if (email) {
                const emailExists = await this.repository.emailExists(email, null, conn);
                if (emailExists) {
                    throw new Error('Email already exists');
                }
            }

            // Generate username in first.last format
            let finalUsername;
            if (username) {
                // Use provided username
                finalUsername = username.toLowerCase();
            } else {
                // Always generate from firstName.lastName: "LaDonna" "Smith" -> "ladonna.smith"
                finalUsername = `${trimmedFirstName}.${trimmedLastName}`.toLowerCase();
            }

            // Ensure username is unique - if it exists, append a number
            let usernameCounter = 1;
            let testUsername = finalUsername;
            while (await this.repository.usernameExists(testUsername, null, conn)) {
                testUsername = `${finalUsername}${usernameCounter}`;
                usernameCounter++;
            }
            finalUsername = testUsername;

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Create user - include username, department, phone if provided
            const userResult = await this.repository.create({
                email: email || null, // Allow NULL email
                password_hash: passwordHash,
                must_change_password: 1, // Require password change on first login
                name,
                username: finalUsername,
                department: department || null,
                phone: phone || null,
                is_active: 1,
                is_deleted: 0,
                created_at: new Date(),
                updated_at: new Date()
            }, conn);
            
            const userId = userResult.id;
            
            // Assign role if provided (only 1 role allowed)
            if (roleNames.length > 0) {
                // Validate: user can only have 1 role
                if (roleNames.length > 1) {
                    throw new Error('A user can only have one role');
                }
                await this.repository.assignUserRoles(userId, roleNames, conn);
            }
            
            // Return user data - audit logging will be handled by executeInTransaction
            return {
                id: userId,
                email,
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                username: finalUsername,
                department: department || '',
                phone: phone || '',
                is_active: 1,
                roles: roleNames
            };
        }, {
            module: 'admin',
            action: 'user_created',
            entity_type: 'user',
            entity_id: null, // Will be set by executeInTransaction
            user_id: null, // System action
            ip_address: '127.0.0.1',
            details: {
                email: userData.email,
                username: userData.username,
                roles: userData.roleNames || []
            }
        }); // End of executeInTransaction
    }

    /**
     * Update user details
     */
    async updateUser(userId, updateData) {
        return this.executeInTransaction(async (conn) => {
            
            // Get existing user
            const existing = await this.getUserById(userId);
            if (!existing) {
                throw new Error('User not found');
            }
            
            const { email, firstName, lastName, username, department, phone, roleNames } = updateData;
            
            // Check email uniqueness if changed
            if (email && email !== existing.email) {
                const emailExists = await this.repository.emailExists(email, userId, conn);
                if (emailExists) {
                    throw new Error('Email already exists');
                }
            }
            
            // Skip username check since field doesn't exist in DB
            
            // Build update data
            const updates = {};
            if (email !== undefined) updates.email = email;
            if (firstName !== undefined || lastName !== undefined) {
                const newFirstName = firstName !== undefined ? firstName : existing.firstName;
                const newLastName = lastName !== undefined ? lastName : existing.lastName;
                updates.name = `${newFirstName || ''} ${newLastName || ''}`.trim() || email || existing.email;
            }
            // Skip fields that don't exist in core_users table
            // if (username !== undefined) updates.username = username;
            // if (department !== undefined) updates.department = department || null;
            // if (phone !== undefined) updates.phone = phone || null;
            
            // Update user if there are changes
            if (Object.keys(updates).length > 0) {
                await this.repository.update(userId, updates, conn);
            }
            
            // Update roles if provided
            if (roleNames !== undefined) {
                // Validate: user can only have 1 role
                if (roleNames.length > 1) {
                    throw new Error('A user can only have one role');
                }

                // Remove existing roles
                await this.repository.removeUserRoles(userId, conn);

                // Add new role (only 1 allowed)
                if (roleNames.length > 0) {
                    await this.repository.assignUserRoles(userId, roleNames, conn);
                }
            }
            
            return await this.getUserById(userId);
        }, {
            module: 'admin',
            action: 'user_updated',
            entity_type: 'user',
            entity_id: userId,
            user_id: null, // System action
            ip_address: '127.0.0.1',
            details: {
                updated: Object.keys(updateData),
                rolesUpdated: updateData.roleNames !== undefined
            }
        }); // End of executeInTransaction
    }

    /**
     * Delete user (soft delete)
     */
    async deleteUser(userId) {
        try {
            const result = await this.repository.softDelete(userId);
            
            if (!result) {
                throw new Error('User not found or already deleted');
            }
            
            if (this.auditService) {
                await this.auditService.logAction({
                    module: 'admin',
                    action: 'user_deleted',
                    entity_type: 'user',
                    entity_id: userId,
                    user_id: null, // System action
                    ip_address: '127.0.0.1',
                    details: {}
                });
            }
            
            return true;
        } catch (error) {
            logger.error('Failed to delete user', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Reset user password
     */
    async resetUserPassword(userId, newPassword) {
        try {
            const passwordHash = await bcrypt.hash(newPassword, 10);
            const result = await this.repository.updateUserPassword(userId, passwordHash);
            
            if (!result) {
                throw new Error('User not found');
            }
            
            // Log password reset
            if (this.auditService) {
                await this.auditService.logAction({
                    module: 'admin',
                    action: 'password_reset',
                    entity_type: 'user',
                    entity_id: userId,
                    user_id: null, // System action
                    ip_address: '127.0.0.1',
                    details: {}
                });
            }
            
            return true;
        } catch (error) {
            logger.error('Failed to reset user password', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Get all available roles
     */
    async getRoles() {
        try {
            const roles = await this.repository.getRoles();
            
            return roles.map(role => ({
                id: role.id,
                name: role.name,
                description: role.description || '',
                userCount: role.user_count
            }));
        } catch (error) {
            logger.error('Failed to get roles', { error: error.message });
            throw new Error(`Failed to get roles: ${error.message}`);
        }
    }

    /**
     * Get all available roles (alias for getRoles)
     */
    async getAllRoles() {
        return this.getRoles();
    }

    /**
     * Unlock user account
     */
    async unlockUser(userId) {
        try {
            await this.repository.update(userId, {
                failed_login_count: 0,
                locked_until: null
            });
            
            // Log unlock
            if (this.auditService) {
                await this.auditService.logAction({
                    module: 'admin',
                    action: 'user_unlocked',
                    entity_type: 'user',
                    entity_id: userId,
                    user_id: null, // System action
                    ip_address: '127.0.0.1',
                    details: {}
                });
            }
            
            return true;
        } catch (error) {
            logger.error('Failed to unlock user', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Get system statistics
     */
    async getSystemStats() {
        try {
            const stats = await this.repository.getSystemStats();
            return stats;
        } catch (error) {
            logger.error('Failed to get system stats', { error: error.message });
            throw error;
        }
    }

    /**
     * Get detailed user statistics
     */
    async getDetailedUserStats() {
        try {
            const stats = await this.repository.getDetailedUserStats();
            return stats;
        } catch (error) {
            logger.error('Failed to get detailed user stats', { error: error.message });
            throw error;
        }
    }

    /**
     * Get gauge statistics
     */
    async getGaugeStats() {
        try {
            const stats = await this.repository.getGaugeStats();
            return stats;
        } catch (error) {
            logger.error('Failed to get gauge stats', { error: error.message });
            throw error;
        }
    }

    /**
     * Get system settings
     */
    async getSystemSettings() {
        try {
            const settings = await this.repository.getSystemSettings();
            return settings;
        } catch (error) {
            logger.error('Failed to get system settings', { error: error.message });
            throw error;
        }
    }

    /**
     * Update system setting
     */
    async updateSystemSetting(key, value) {
        try {
            if (!key || value === undefined) {
                throw new Error('Key and value are required');
            }

            const setting = await this.repository.updateSystemSetting(key, value);
            return setting;
        } catch (error) {
            logger.error('Failed to update system setting', { key, value, error: error.message });
            throw error;
        }
    }

    /**
     * Grant permissions to user in bulk
     */
    async grantPermissionsBulk(userId, permissionIds) {
        try {
            if (!permissionIds || permissionIds.length === 0) {
                return;
            }

            await this.repository.grantPermissionsBulk(userId, permissionIds);

            // Log permission grant
            if (this.auditService) {
                await this.auditService.logAction({
                    module: 'admin',
                    action: 'permissions_granted',
                    entity_type: 'user',
                    entity_id: userId,
                    user_id: null, // System action
                    ip_address: '127.0.0.1',
                    details: {
                        permissionIds,
                        count: permissionIds.length
                    }
                });
            }

            return true;
        } catch (error) {
            logger.error('Failed to grant permissions in bulk', { userId, permissionIds, error: error.message });
            throw error;
        }
    }

    /**
     * Revoke permissions from user in bulk
     */
    async revokePermissionsBulk(userId, permissionIds) {
        try {
            if (!permissionIds || permissionIds.length === 0) {
                return;
            }

            await this.repository.revokePermissionsBulk(userId, permissionIds);

            // Log permission revoke
            if (this.auditService) {
                await this.auditService.logAction({
                    module: 'admin',
                    action: 'permissions_revoked',
                    entity_type: 'user',
                    entity_id: userId,
                    user_id: null, // System action
                    ip_address: '127.0.0.1',
                    details: {
                        permissionIds,
                        count: permissionIds.length
                    }
                });
            }

            return true;
        } catch (error) {
            logger.error('Failed to revoke permissions in bulk', { userId, permissionIds, error: error.message });
            throw error;
        }
    }
}

module.exports = AdminService;