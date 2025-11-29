const express = require('express');
const router = express.Router();

// Import audit routes
const auditRoutes = require('./routes/index');

// Mount all audit routes
router.use('/', auditRoutes);

module.exports = router;