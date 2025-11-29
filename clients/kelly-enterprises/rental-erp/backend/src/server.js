const app = require('./app');
const config = require('./infrastructure/config/config');
const logger = require('./infrastructure/utils/logger');
const { performanceMonitor } = require('./infrastructure/utils/performanceMonitor');
const { validateRbac } = require('./bootstrap/validateRbac');
const { registerServices } = require('./bootstrap/registerServices');
const { initializeDatabase } = require('./infrastructure/database/connection');

const PORT = config.server.port || process.env.PORT || 8000;

// Perform boot-time validations before starting server
async function startServer() {
  try {
    console.log('🚀 Starting server...');
    console.log('PORT:', PORT);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DB_HOST:', process.env.DB_HOST);

    // Initialize database pool and wait for it to be ready
    console.log('🔌 Initializing database connection...');
    await initializeDatabase();
    console.log('✅ Database ready!');

    // Validate RBAC configuration
    console.log('🔐 Validating RBAC...');
    await validateRbac();
    logger.info('RBAC validation completed successfully');
    
    // Register services for cross-module communication
    console.log('📋 Registering services...');
    await registerServices();
    logger.info('Service registration completed successfully');
    
    // Start the server
    console.log('🌐 Starting HTTP server on port', PORT);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('✅ Server listening successfully!');
      logger.info(`Gauge Tracking API server running on port ${PORT}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);
      logger.info(`Log level: ${config.server.logLevel}`);
      
      // Start performance monitoring
      performanceMonitor.start(10000); // Monitor every 10 seconds
      logger.info('Performance monitoring started');
    });
    
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      logger.error('Server error:', error);
    });
    
    return server;
  } catch (error) {
    logger.error('Boot-time validation failed:', error);
    process.exit(1);
  }
}

// Start the server with validation
const serverPromise = startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  try {
    logger.info('SIGTERM received, shutting down gracefully...');
    performanceMonitor.stop();
    const server = await serverPromise;
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during SIGTERM shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  try {
    logger.info('SIGINT received, shutting down gracefully...');
    performanceMonitor.stop();
    const server = await serverPromise;
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during SIGINT shutdown:', error);
    process.exit(1);
  }
});

module.exports = serverPromise;