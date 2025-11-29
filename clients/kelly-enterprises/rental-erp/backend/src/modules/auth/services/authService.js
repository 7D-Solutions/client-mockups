/**
 * Authentication Service - Refactored to use AuthRepository
 * Handles all authentication business logic including login, lockout, and session management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../../infrastructure/config/config');
const BaseService = require('../../../infrastructure/services/BaseService');
const AuthRepository = require('../repositories/AuthRepository');
const logger = require('../../../infrastructure/utils/logger');

class AuthService extends BaseService {
    constructor(authRepository) {
        super(authRepository);
        this.authRepository = authRepository || new AuthRepository();
    }

    /**
     * Record a login attempt in the database
     */
    async recordLoginAttempt(email, userId, ipAddress, userAgent, success, failureReason = null) {
        try {
            await this.authRepository.recordLoginAttempt(
                email, 
                ipAddress, 
                success, 
                failureReason
            );
        } catch (error) {
            logger.error('Failed to record login attempt', { error: error.message });
        }
    }

    /**
     * Check if account should be locked based on failed attempts
     * @param {string} identifier - Email or username
     */
    async checkAccountLockout(identifier) {
        try {
            // First check if user exists and get current lock status
            const user = await this.authRepository.findByIdentifierWithRoles(identifier);

            if (!user) {
                return { locked: false };
            }

            // Check if currently locked
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                return {
                    locked: true,
                    lockedUntil: user.locked_until
                };
            }

            // Check recent failed attempts (last 30 minutes)
            const failedCount = await this.authRepository.getRecentFailedAttempts(user.email);

            // If 5 or more failed attempts, lock the account
            if (failedCount >= 5) {
                const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

                await this.authRepository.updateLockStatus(user.id, failedCount, lockUntil);

                return {
                    locked: true,
                    lockedUntil: lockUntil
                };
            }

            return { locked: false };
        } catch (error) {
            logger.error('Error checking account lockout', { error: error.message });
            return { locked: false };
        }
    }

    /**
     * Authenticate user with identifier (email or username) and password
     * @param {string} identifier - Email or username
     * @param {string} password - User password
     */
    async authenticateUser(identifier, password) {
        try {
            const user = await this.authRepository.findByIdentifierWithRoles(identifier);

            if (!user) {
                return {
                    success: false,
                    error: 'Invalid credentials',
                    failureReason: 'User not found'
                };
            }

            // Check if account is locked
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                return {
                    success: false,
                    error: 'Account temporarily locked due to multiple failed attempts',
                    lockedUntil: user.locked_until,
                    statusCode: 423
                };
            }

            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                try {
                    // Increment failed login count
                    await this.authRepository.incrementFailedLoginCount(user.id);
                } catch (updateError) {
                    logger.error('Failed to update failed login count', {
                        identifier,
                        error: updateError.message
                    });
                }

                return {
                    success: false,
                    error: 'Invalid credentials',
                    failureReason: 'Invalid password'
                };
            }

            // Update last_login and reset failed attempts on successful login
            try {
                await this.authRepository.updateSuccessfulLogin(user.id);
            } catch (updateError) {
                logger.error('Failed to update successful login', {
                    identifier,
                    userId: user.id,
                    error: updateError.message
                });
            }

            // Get user permissions from database
            const permissions = await this.getUserPermissions(user.id);

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: user.roles,
                    permissions: permissions,
                    mustChangePassword: user.must_change_password === 1
                }
            };
        } catch (error) {
            logger.error('Failed to authenticate user', { identifier, error: error.message });
            throw new Error(`Failed to authenticate user: ${error.message}`);
        }
    }

    /**
     * Create JWT token for authenticated user
     */
    createToken(user) {
        return jwt.sign(
            {
                user_id: user.id,
                email: user.email,
                roles: user.roles,
                permissions: user.permissions || [],
                name: user.name
            },
            config.security.jwtSecret,
            { expiresIn: '8h' }
        );
    }

    /**
     * Create a new session for the user
     */
    async createSession(userId, token, ipAddress, userAgent) {
        try {
            const result = await this.authRepository.createSession(
                userId, 
                token, 
                ipAddress, 
                userAgent
            );
            
            return result.success;
        } catch (error) {
            logger.error('Failed to create session', { error: error.message });
            return false;
        }
    }

    /**
     * Get user by ID with roles
     */
    async getUserById(userId) {
        try {
            return await this.authRepository.findByIdWithRoles(userId);
        } catch (error) {
            logger.error('Failed to get user by ID', { userId, error: error.message });
            throw new Error(`Failed to get user by ID: ${error.message}`);
        }
    }

    /**
     * Invalidate user session by token
     */
    async invalidateSession(token) {
        try {
            return await this.authRepository.invalidateSession(token);
        } catch (error) {
            logger.error('Failed to invalidate session', { error: error.message });
            return false;
        }
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        try {
            const cleanedCount = await this.authRepository.cleanupExpiredSessions();
            return cleanedCount;
        } catch (error) {
            logger.error('Failed to cleanup expired sessions', { error: error.message });
            return 0;
        }
    }
    
    /**
     * Get user permissions from database
     */
    async getUserPermissions(userId) {
        try {
            const pool = require('../../../infrastructure/database/connection').getPool();
            if (!pool) {
                logger.warn('Database pool not available for permissions check');
                return [];
            }
            const [permissions] = await pool.execute(`
                SELECT DISTINCT CONCAT(p.module_id, '.', p.resource, '.', p.action) AS permission
                FROM core_user_permissions up
                JOIN core_permissions p ON up.permission_id = p.id
                WHERE up.user_id = ?
                ORDER BY permission
            `, [userId]);

            return permissions.map(row => row.permission);
        } catch (error) {
            logger.error('Failed to get user permissions', { userId, error: error.message });
            return [];
        }
    }

    /**
     * Change user password and clear must_change_password flag
     */
    async changeUserPassword(userId, passwordHash) {
        try {
            const result = await this.authRepository.changeUserPassword(userId, passwordHash);
            if (!result) {
                throw new Error('User not found');
            }
            return true;
        } catch (error) {
            logger.error('Failed to change user password', { userId, error: error.message });
            throw error;
        }
    }
}

module.exports = new AuthService();