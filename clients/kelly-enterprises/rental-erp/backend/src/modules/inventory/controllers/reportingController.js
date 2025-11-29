const InventoryReportingService = require('../services/InventoryReportingService');
const logger = require('../../../infrastructure/utils/logger');

const reportingService = new InventoryReportingService();

/**
 * GET /api/inventory/reports/overview
 * Get inventory dashboard overview
 */
const getOverview = async (req, res) => {
  try {
    const locations = await reportingService.getInventoryOverview();

    res.status(200).json({
      success: true,
      data: {
        locations
      }
    });
  } catch (error) {
    logger.error('Failed to get inventory overview:', {
      error: error.message,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get inventory overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/inventory/reports/by-location/:locationCode
 * Get all items in a specific location
 */
const getLocationDetails = async (req, res) => {
  try {
    const { locationCode } = req.params;

    const details = await reportingService.getLocationDetails(locationCode);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: `Location ${locationCode} not found`
      });
    }

    res.status(200).json({
      success: true,
      data: details
    });
  } catch (error) {
    logger.error('Failed to get location details:', {
      error: error.message,
      locationCode: req.params.locationCode,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get location details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/inventory/reports/movements
 * Get movement history with filters
 */
const getMovements = async (req, res) => {
  try {
    const {
      itemType,
      movementType,
      fromDate,
      toDate,
      limit,
      offset
    } = req.query;

    const filters = {
      itemType,
      movementType,
      fromDate,
      toDate,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };

    const result = await reportingService.getMovementHistory(filters);

    res.status(200).json({
      success: true,
      data: result.movements,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Failed to get movements:', {
      error: error.message,
      query: req.query,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get movements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/inventory/reports/statistics
 * Get inventory statistics summary
 */
const getStatistics = async (req, res) => {
  try {
    const stats = await reportingService.getInventoryStatistics();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get statistics:', {
      error: error.message,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/inventory/reports/search
 * Search inventory items
 */
const searchInventory = async (req, res) => {
  try {
    const { type, term } = req.query;

    if (!term) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const searchType = type || 'all';
    const validTypes = ['all', 'id', 'name', 'location'];

    if (!validTypes.includes(searchType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid search type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const results = await reportingService.searchInventory(searchType, term);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Failed to search inventory:', {
      error: error.message,
      query: req.query,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to search inventory',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getOverview,
  getLocationDetails,
  getMovements,
  getStatistics,
  searchInventory
};
