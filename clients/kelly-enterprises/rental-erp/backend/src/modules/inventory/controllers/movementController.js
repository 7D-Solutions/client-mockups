const MovementService = require('../services/MovementService');
const logger = require('../../../infrastructure/utils/logger');

const movementService = new MovementService();

/**
 * POST /api/inventory/move
 * Move an item to a new location
 */
const moveItem = async (req, res) => {
  try {
    const {
      itemType,
      itemIdentifier,
      toLocation,
      reason,
      notes,
      quantity,
      orderNumber,
      jobNumber
    } = req.body;

    // Validation
    if (!itemType || !itemIdentifier || !toLocation) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: itemType, itemIdentifier, toLocation'
      });
    }

    // Validate item type
    const validItemTypes = ['gauge', 'tool', 'part', 'equipment', 'material'];
    if (!validItemTypes.includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid itemType. Must be one of: ${validItemTypes.join(', ')}`
      });
    }

    // Move the item
    const result = await movementService.moveItem({
      itemType,
      itemIdentifier,
      toLocation,
      movedBy: req.user.id,
      reason,
      notes,
      quantity,
      orderNumber,
      jobNumber
    });

    if (!result.success) {
      return res.status(200).json(result); // Item already in location - not an error
    }

    res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to move item:', {
      error: error.message,
      user: req.user?.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Failed to move item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/inventory/location/:itemType/:itemIdentifier
 * Get current location for an item
 */
const getCurrentLocation = async (req, res) => {
  try {
    const { itemType, itemIdentifier } = req.params;

    // Validation
    const validItemTypes = ['gauge', 'tool', 'part', 'equipment', 'material'];
    if (!validItemTypes.includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid itemType. Must be one of: ${validItemTypes.join(', ')}`
      });
    }

    const location = await movementService.getCurrentLocation(itemType, itemIdentifier);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Location not found for ${itemType} ${itemIdentifier}`
      });
    }

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    logger.error('Failed to get current location:', {
      error: error.message,
      params: req.params
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get current location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * DELETE /api/inventory/location/:itemType/:itemIdentifier
 * Remove item from inventory (when item is deleted)
 */
const removeItem = async (req, res) => {
  try {
    const { itemType, itemIdentifier } = req.params;
    const { reason } = req.body;

    // Validation
    const validItemTypes = ['gauge', 'tool', 'part', 'equipment', 'material'];
    if (!validItemTypes.includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid itemType. Must be one of: ${validItemTypes.join(', ')}`
      });
    }

    const result = await movementService.removeItem(
      itemType,
      itemIdentifier,
      req.user.id,
      reason
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to remove item:', {
      error: error.message,
      params: req.params,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to remove item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/inventory/movements/:itemType/:itemIdentifier
 * Get movement history for an item
 */
const getMovementHistory = async (req, res) => {
  try {
    const { itemType, itemIdentifier } = req.params;
    const { limit, offset } = req.query;

    // Validation
    const validItemTypes = ['gauge', 'tool', 'part', 'equipment', 'material'];
    if (!validItemTypes.includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid itemType. Must be one of: ${validItemTypes.join(', ')}`
      });
    }

    const options = {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };

    const movements = await movementService.getMovementHistory(
      itemType,
      itemIdentifier,
      options
    );

    res.status(200).json({
      success: true,
      data: movements,
      pagination: {
        limit: options.limit,
        offset: options.offset
      }
    });
  } catch (error) {
    logger.error('Failed to get movement history:', {
      error: error.message,
      params: req.params
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get movement history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  moveItem,
  getCurrentLocation,
  removeItem,
  getMovementHistory
};
