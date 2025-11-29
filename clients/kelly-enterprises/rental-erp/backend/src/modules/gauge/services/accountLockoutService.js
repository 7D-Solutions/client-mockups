const BaseService = require('../../../infrastructure/services/BaseService');
const AccountLockoutRepository = require('../../auth/repositories/AccountLockoutRepository');
const logger = require('../../../infrastructure/utils/logger');

const LOCKOUT_CONFIG = {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    ATTEMPT_WINDOW_MINUTES: 30
};

class AccountLockoutService extends BaseService {
    constructor(accountLockoutRepository) {
        super(accountLockoutRepository);
        this.accountLockoutRepository = accountLockoutRepository || new AccountLockoutRepository();
    }
    
    // Record a login attempt
    async recordLoginAttempt(email, userId, ipAddress, userAgent, result, failureReason = null) {
        logger.info('🔍 recordLoginAttempt called', { email, userId, result });
        try {
            await this.accountLockoutRepository.recordLoginAttempt(
                email, userId, ipAddress, userAgent, result, failureReason
            );
            
            logger.info('✅ Login attempt recorded successfully', { email, result });
            logger.info(`Login attempt recorded: ${email} - ${result}`);
        } catch (error) {
            logger.error('❌ Failed to record login attempt:', { error: error.message });
            logger.error('Failed to record login attempt:', error);
        }
    }

    // Check if account should be locked based on recent failed attempts
    async checkAndLockAccount(email, userId) {
        try {
            // Count recent failed attempts
            const failedCount = await this.accountLockoutRepository.countRecentFailedAttempts(
                email, 
                LOCKOUT_CONFIG.ATTEMPT_WINDOW_MINUTES
            );
            
            if (failedCount >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
                // Lock the account
                const lockUntil = new Date(Date.now() + (LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000));
                
                await this.accountLockoutRepository.createOrUpdateLockout(
                    userId, email, failedCount, lockUntil
                );
                
                logger.warn(`Account locked: ${email} - ${failedCount} failed attempts`);
                return true;
            }
            
            return false;
        } catch (error) {
            logger.error('Failed to check/lock account:', error);
            throw error;
        }
    }

    // Get all active lockouts
    async getActiveLockouts() {
        try {
            const lockouts = await this.accountLockoutRepository.getActiveLockouts();
            
            return lockouts.map(lockout => ({
                ...lockout,
                locked_until_formatted: lockout.locked_until ? new Date(lockout.locked_until).toLocaleString() : null
            }));
        } catch (error) {
            logger.error('Failed to get active lockouts:', error);
            throw error;
        }
    }

    // Unlock a specific account
    async unlockAccount(userId) {
        try {
            const result = await this.accountLockoutRepository.unlockAccount(userId);
            
            if (result.affected > 0) {
                logger.info(`Account unlocked: userId=${userId}`);
                return true;
            }
            
            return false;
        } catch (error) {
            logger.error('Failed to unlock account:', error);
            throw error;
        }
    }

    // Get lockout statistics
    async getLockoutStats() {
        try {
            const stats = await this.accountLockoutRepository.getLockoutStats();
            return stats;
        } catch (error) {
            logger.error('Failed to get lockout stats:', error);
            throw error;
        }
    }

    // Check if an account is currently locked
    async isAccountLocked(email) {
        try {
            const lockStatus = await this.accountLockoutRepository.isAccountLocked(email);
            return lockStatus;
        } catch (error) {
            logger.error('Failed to check lock status:', error);
            throw error;
        }
    }
}

module.exports = AccountLockoutService;