/**
 * User Preferences Routes
 *
 * API endpoints for managing user preferences (column configs, UI settings, etc.)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const UserPreferencesService = require('../services/UserPreferencesService');
const logger = require('../../../infrastructure/utils/logger');

/**
 * GET /api/user/preferences
 * Get all preferences for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await UserPreferencesService.getAllUserPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error fetching user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/user/preferences/:key
 * Get a specific preference by key
 */
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { key } = req.params;

    const preference = await UserPreferencesService.getUserPreference(userId, key);

    if (preference === null) {
      return res.status(404).json({
        success: false,
        message: 'Preference not found'
      });
    }

    res.json({
      success: true,
      data: preference
    });
  } catch (error) {
    logger.error('Error fetching user preference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch preference',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/user/preferences/:key
 * Save or update a preference
 */
router.put('/:key', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Preference value is required'
      });
    }

    // Validate preference key format (alphanumeric, hyphens, underscores, dots)
    if (!/^[a-zA-Z0-9-_.]+$/.test(key)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid preference key format'
      });
    }

    await UserPreferencesService.saveUserPreference(userId, key, value);

    res.json({
      success: true,
      message: 'Preference saved successfully'
    });
  } catch (error) {
    logger.error('Error saving user preference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save preference',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/user/preferences/:key
 * Delete a specific preference
 */
router.delete('/:key', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { key } = req.params;

    const deleted = await UserPreferencesService.deleteUserPreference(userId, key);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Preference not found'
      });
    }

    res.json({
      success: true,
      message: 'Preference deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user preference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete preference',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
