const express = require('express');
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const FavoritesService = require('../services/FavoritesService');
const FavoritesRepository = require('../repositories/FavoritesRepository');

const router = express.Router();

// Initialize service
const favoritesRepository = new FavoritesRepository();
const favoritesService = new FavoritesService(favoritesRepository);

// GET /api/users/me/favorites - Get user's favorites (sorted by position)
router.get('/', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;

  const result = await favoritesService.getUserFavorites(userId);
  res.json(result);
}));

// POST /api/users/me/favorites - Add a favorite
router.post('/', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;
  const { itemId } = req.body;

  if (!itemId) {
    return res.status(400).json({
      success: false,
      message: 'Item ID is required'
    });
  }

  try {
    const result = await favoritesService.addFavorite(userId, itemId);
    res.json(result);
  } catch (error) {
    if (error.code === 'INVALID_ITEM_ID') {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    throw error;
  }
}));

// DELETE /api/users/me/favorites/:itemId - Remove a favorite
router.delete('/:itemId', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;
  const { itemId } = req.params;

  if (!itemId) {
    return res.status(400).json({
      success: false,
      message: 'Item ID is required'
    });
  }

  const result = await favoritesService.removeFavorite(userId, itemId);
  res.json(result);
}));

// PUT /api/users/me/favorites/reorder - Reorder favorites
router.put('/reorder', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;
  const { order } = req.body;

  if (!order || !Array.isArray(order)) {
    return res.status(400).json({
      success: false,
      message: 'Order must be an array'
    });
  }

  if (order.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Order array cannot be empty'
    });
  }

  try {
    const result = await favoritesService.reorderFavorites(userId, order);
    res.json(result);
  } catch (error) {
    if (error.code === 'INVALID_ITEM_ID') {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID in order array',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    throw error;
  }
}));

module.exports = router;
