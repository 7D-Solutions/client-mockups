const express = require('express');
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const UserService = require('../services/UserService');
const UserRepository = require('../repositories/UserRepository');

const router = express.Router();

// Initialize service
const userRepository = new UserRepository();
const userService = new UserService(userRepository);

// GET /api/users - Get all active users
router.get('/', authenticateToken, asyncErrorHandler(async (req, res) => {
  const result = await userService.getAllActiveUsers();
  res.json(result);
}));

// GET /api/users/assignments - Get current user's assignments
router.get('/assignments', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;
  
  const result = await userService.getUserAssignments(userId);
  res.json(result);
}));

// GET /api/users/transfers - Get current user's pending transfers
router.get('/transfers', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;

  const result = await userService.getUserPendingTransfers(userId);
  res.json(result);
}));

// GET /api/users/me - Get current user's profile and preferences
router.get('/me', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;

  const result = await userService.getUserProfile(userId);
  res.json(result);
}));

// PUT /api/users/me - Update current user's profile and preferences
router.put('/me', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.user_id || req.user.id;

  const result = await userService.updateUserProfile(userId, req.body);
  res.json(result);
}));

module.exports = router;