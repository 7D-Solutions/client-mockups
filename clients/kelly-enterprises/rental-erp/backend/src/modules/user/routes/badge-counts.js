const express = require('express');
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const BadgeCountsService = require('../services/BadgeCountsService');
const BadgeCountsRepository = require('../repositories/BadgeCountsRepository');

const router = express.Router();

// Initialize service
const badgeCountsRepository = new BadgeCountsRepository();
const badgeCountsService = new BadgeCountsService(badgeCountsRepository);

// GET /api/users/me/badge-counts - Get all badge counts for current user
router.get('/', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;

  const result = await badgeCountsService.getAllBadgeCounts(userId);
  res.json(result);
}));

// GET /api/users/me/badge-counts/gauges - Get gauge-specific badge counts
router.get('/gauges', authenticateToken, asyncErrorHandler(async (req, res) => {
  const result = await badgeCountsService.getGaugeBadgeCounts();
  res.json(result);
}));

// GET /api/users/me/badge-counts/dashboard - Get dashboard-specific badge counts
router.get('/dashboard', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;

  const result = await badgeCountsService.getDashboardBadgeCounts(userId);
  res.json(result);
}));

module.exports = router;
