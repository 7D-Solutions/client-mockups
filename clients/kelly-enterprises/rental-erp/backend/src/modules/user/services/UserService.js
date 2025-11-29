const BaseService = require('../../../infrastructure/services/BaseService');
const logger = require('../../../infrastructure/utils/logger');

class UserService extends BaseService {
  constructor(userRepository, options = {}) {
    super(userRepository, options);
  }

  /**
   * Get user's gauge assignments
   */
  async getUserAssignments(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const assignments = await this.repository.getUserAssignments(userId);
      
      return {
        success: true,
        data: assignments
      };
    } catch (error) {
      logger.error('Failed to get user assignments:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get user's pending transfers
   */
  async getUserPendingTransfers(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const transfers = await this.repository.getUserPendingTransfers(userId);
      
      return {
        success: true,
        data: transfers
      };
    } catch (error) {
      logger.error('Failed to get user pending transfers:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get all active users
   */
  async getAllActiveUsers() {
    try {
      const users = await this.repository.getAllActiveUsers();

      return {
        success: true,
        data: users
      };
    } catch (error) {
      logger.error('Failed to get all active users:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user profile with preferences
   */
  async getUserProfile(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const profile = await this.repository.getUserProfile(userId);

      if (!profile) {
        throw new Error('User not found');
      }

      // Format response with proper structure
      return {
        success: true,
        data: {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          email: profile.email,
          phone: profile.phone || '',
          department: profile.department || '',
          position: profile.position || '',
          role: profile.roles ? profile.roles.split(',')[0] : 'User',
          roles: profile.roles ? profile.roles.split(',') : ['User'],
          preferences: {
            theme: profile.theme || 'light',
            language: profile.language || 'en',
            timezone: profile.timezone || 'UTC',
            emailNotifications: profile.email_notifications !== null ? Boolean(profile.email_notifications) : true,
            pushNotifications: profile.push_notifications !== null ? Boolean(profile.push_notifications) : false,
            gaugeAlerts: profile.gauge_alerts !== null ? Boolean(profile.gauge_alerts) : true,
            maintenanceReminders: profile.maintenance_reminders !== null ? Boolean(profile.maintenance_reminders) : true,
            defaultView: profile.default_view || 'list',
            itemsPerPage: profile.items_per_page || 50
          },
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          lastLogin: profile.last_login
        }
      };
    } catch (error) {
      logger.error('Failed to get user profile:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Update user profile and preferences with validation
   */
  async updateUserProfile(userId, data) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate input data
      const validatedData = this._validateProfileUpdate(data);

      // Update profile
      const updatedProfile = await this.repository.updateUserProfile(userId, validatedData);

      if (!updatedProfile) {
        throw new Error('Failed to update user profile');
      }

      // Format and return response (same as getUserProfile)
      return {
        success: true,
        data: {
          id: updatedProfile.id,
          username: updatedProfile.username,
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone || '',
          department: updatedProfile.department || '',
          position: updatedProfile.position || '',
          role: updatedProfile.roles ? updatedProfile.roles.split(',')[0] : 'User',
          roles: updatedProfile.roles ? updatedProfile.roles.split(',') : ['User'],
          preferences: {
            theme: updatedProfile.theme || 'light',
            language: updatedProfile.language || 'en',
            timezone: updatedProfile.timezone || 'UTC',
            emailNotifications: updatedProfile.email_notifications !== null ? Boolean(updatedProfile.email_notifications) : true,
            pushNotifications: updatedProfile.push_notifications !== null ? Boolean(updatedProfile.push_notifications) : false,
            gaugeAlerts: updatedProfile.gauge_alerts !== null ? Boolean(updatedProfile.gauge_alerts) : true,
            maintenanceReminders: updatedProfile.maintenance_reminders !== null ? Boolean(updatedProfile.maintenance_reminders) : true,
            defaultView: updatedProfile.default_view || 'list',
            itemsPerPage: updatedProfile.items_per_page || 50
          },
          createdAt: updatedProfile.created_at,
          updatedAt: updatedProfile.updated_at,
          lastLogin: updatedProfile.last_login
        },
        message: 'Profile updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update user profile:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Validate profile update data
   * @private
   */
  _validateProfileUpdate(data) {
    const validated = {};

    // Validate theme
    if (data.theme !== undefined) {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(data.theme)) {
        throw new Error(`Invalid theme. Must be one of: ${validThemes.join(', ')}`);
      }
      validated.theme = data.theme;
    }

    // Validate language (basic ISO 639-1 format)
    if (data.language !== undefined) {
      if (typeof data.language !== 'string' || !/^[a-z]{2}(-[A-Z]{2})?$/.test(data.language)) {
        throw new Error('Invalid language format. Use ISO 639-1 format (e.g., "en", "en-US")');
      }
      validated.language = data.language;
    }

    // Validate timezone
    if (data.timezone !== undefined) {
      if (typeof data.timezone !== 'string' || data.timezone.length === 0) {
        throw new Error('Invalid timezone');
      }
      validated.timezone = data.timezone;
    }

    // Validate boolean preferences
    const booleanFields = [
      'emailNotifications',
      'pushNotifications',
      'gaugeAlerts',
      'maintenanceReminders'
    ];

    booleanFields.forEach(field => {
      if (data[field] !== undefined) {
        if (typeof data[field] !== 'boolean') {
          throw new Error(`${field} must be a boolean`);
        }
        validated[field] = data[field];
      }
    });

    // Validate defaultView
    if (data.defaultView !== undefined) {
      const validViews = ['list', 'grid', 'table'];
      if (!validViews.includes(data.defaultView)) {
        throw new Error(`Invalid defaultView. Must be one of: ${validViews.join(', ')}`);
      }
      validated.defaultView = data.defaultView;
    }

    // Validate itemsPerPage
    if (data.itemsPerPage !== undefined) {
      const value = parseInt(data.itemsPerPage, 10);
      if (isNaN(value) || value < 10 || value > 100) {
        throw new Error('itemsPerPage must be between 10 and 100');
      }
      validated.itemsPerPage = value;
    }

    // Validate profile fields
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        throw new Error('Name is required');
      }
      validated.name = data.name.trim();
    }

    if (data.email !== undefined) {
      // Basic email validation
      if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error('Invalid email format');
      }
      validated.email = data.email.toLowerCase().trim();
    }

    if (data.phone !== undefined) {
      if (data.phone !== null && typeof data.phone !== 'string') {
        throw new Error('Invalid phone format');
      }
      validated.phone = data.phone;
    }

    return validated;
  }
}

module.exports = UserService;