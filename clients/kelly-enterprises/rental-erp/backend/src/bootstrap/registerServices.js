/**
 * Service Registration Bootstrap
 * Registers services in the ServiceRegistry for cross-module communication
 */

const serviceRegistry = require('../infrastructure/services/ServiceRegistry');
const logger = require('../infrastructure/utils/logger');
const dbConnection = require('../infrastructure/database/connection');

// Import repositories
const AuthRepository = require('../modules/auth/repositories/AuthRepository');
const UserRepository = require('../modules/user/repositories/UserRepository');
const AdminRepository = require('../modules/admin/repositories/AdminRepository');
const GaugeRepository = require('../modules/gauge/repositories/GaugeRepository');
const GaugeQueryRepository = require('../modules/gauge/repositories/GaugeQueryRepository');
const GaugeReferenceRepository = require('../modules/gauge/repositories/GaugeReferenceRepository');
const CalibrationRepository = require('../modules/gauge/repositories/CalibrationRepository');
const RejectionRepository = require('../modules/gauge/repositories/RejectionRepository');
const AccountLockoutRepository = require('../modules/auth/repositories/AccountLockoutRepository');
const GaugeStatusRepository = require('../modules/gauge/repositories/GaugeStatusRepository');
const TrackingRepository = require('../modules/gauge/repositories/TrackingRepository');
const ReportsRepository = require('../modules/gauge/repositories/ReportsRepository');
const GaugeIdRepository = require('../modules/gauge/repositories/GaugeIdRepository');

// Import services
const AuthService = require('../modules/auth/services/authService');
const UserService = require('../modules/user/services/UserService');
const AdminService = require('../modules/admin/services/adminService');
const GaugeService = require('../modules/gauge/services/GaugeServiceCoordinator');
const GaugeValidationService = require('../modules/gauge/services/GaugeValidationService');
const GaugeCreationService = require('../modules/gauge/services/GaugeCreationService');
const GaugeSetService = require('../modules/gauge/services/GaugeSetService');
const GaugeQueryService = require('../modules/gauge/services/GaugeQueryService');
const GaugeOperationsService = require('../modules/gauge/services/GaugeOperationsService');
const GaugeCalibrationService = require('../modules/gauge/services/gaugeCalibrationService');
const GaugeRejectionService = require('../modules/gauge/services/GaugeRejectionService');
const AccountLockoutService = require('../modules/gauge/services/accountLockoutService');
// const GaugeSearchService = require('../modules/gauge/services/GaugeSearchService');
const GaugeStatusService = require('../modules/gauge/services/GaugeStatusService');
const GaugeTrackingService = require('../modules/gauge/services/GaugeTrackingService');
const GaugeHistoryService = require('../modules/gauge/services/GaugeHistoryService');
const GaugeCheckoutService = require('../modules/gauge/services/GaugeCheckoutService');
const GaugeIdService = require('../modules/gauge/services/GaugeIdService');
const ReportsService = require('../modules/gauge/services/ReportsService');
const TransfersService = require('../modules/gauge/services/TransfersService');
const UnsealsService = require('../modules/gauge/services/UnsealsService');
const OperationsService = require('../modules/gauge/services/OperationsService');
const SealService = require('../modules/gauge/services/sealService');
const AdminMaintenanceService = require('../modules/admin/services/AdminMaintenanceService');
const SecurityAuditService = require('../modules/gauge/services/securityAuditService');
const CalibrationBatchManagementService = require('../modules/gauge/services/CalibrationBatchManagementService');
const CalibrationWorkflowService = require('../modules/gauge/services/CalibrationWorkflowService');

/**
 * Register all services that need to be available for cross-module communication
 */
async function registerServices() {
  try {
    // Create repositories
    const authRepository = new AuthRepository();
    const userRepository = new UserRepository();
    const adminRepository = new AdminRepository();
    const gaugeRepository = new GaugeRepository();
    const gaugeQueryRepository = new GaugeQueryRepository();
    const gaugeReferenceRepository = new GaugeReferenceRepository();
    const calibrationRepository = new CalibrationRepository();
    const rejectionRepository = new RejectionRepository();
    const accountLockoutRepository = new AccountLockoutRepository();
    const gaugeStatusRepository = new GaugeStatusRepository();
    const trackingRepository = new TrackingRepository();
    const reportsRepository = new ReportsRepository();
    const gaugeIdRepository = new GaugeIdRepository();
    const unsealRequestsRepository = require('../modules/gauge/repositories/UnsealRequestsRepository');
    const operationsRepository = require('../modules/gauge/repositories/OperationsRepository');

    // Import GaugeSetRepository and CheckoutRepository for proper separation of concerns
    const GaugeSetRepository = require('../modules/gauge/repositories/GaugeSetRepository');
    const CheckoutRepository = require('../modules/gauge/repositories/CheckoutRepository');
    const gaugeSetRepository = new GaugeSetRepository(dbConnection.pool);
    const checkoutRepository = new CheckoutRepository();
    
    logger.info('Created repository instances');

    // Register main services with their repositories
    try {
      // Auth Service with repository injection
      const authService = new AuthService(authRepository);
      serviceRegistry.register('AuthService', authService);
      logger.info('Registered AuthService with AuthRepository in ServiceRegistry');
    } catch (error) {
      logger.error('Failed to register AuthService:', error.message);
      logger.error('AuthService registration error stack:', error.stack);
    }

    try {
      // User Service with repository injection
      const userService = new UserService(userRepository);
      serviceRegistry.register('UserService', userService);
      logger.info('Registered UserService with UserRepository in ServiceRegistry');
    } catch (error) {
      logger.error('Failed to register UserService:', error.message);
    }

    try {
      // Admin Service with repository injection
      const adminService = new AdminService(adminRepository);
      serviceRegistry.register('AdminService', adminService);
      logger.info('Registered AdminService with AdminRepository in ServiceRegistry');
    } catch (error) {
      logger.error('Failed to register AdminService:', error.message);
    }

    try {
      // Register split gauge services first (as they're dependencies)
      const gaugeValidationService = new GaugeValidationService();
      serviceRegistry.register('GaugeValidationService', gaugeValidationService);
      logger.info('Registered GaugeValidationService in ServiceRegistry');
      
      const gaugeCreationService = new GaugeCreationService(gaugeRepository, gaugeSetRepository, gaugeReferenceRepository);
      serviceRegistry.register('GaugeCreationService', gaugeCreationService);
      logger.info('Registered GaugeCreationService with GaugeRepository, GaugeSetRepository, and GaugeReferenceRepository in ServiceRegistry');

      console.log('🔍 DEBUG Before creating GaugeSetService:', {
        hasPool: !!dbConnection.pool,
        poolType: typeof dbConnection.pool,
        poolConstructor: dbConnection.pool ? dbConnection.pool.constructor.name : 'null',
        hasGaugeSetRepository: !!gaugeSetRepository
      });
      const gaugeSetService = new GaugeSetService(dbConnection.pool, gaugeSetRepository);
      console.log('🔍 DEBUG After creating GaugeSetService:', {
        serviceHasPool: !!gaugeSetService.pool,
        serviceHasRepository: !!gaugeSetService.repository,
        serviceHasTransactionHelper: !!gaugeSetService.transactionHelper
      });
      serviceRegistry.register('GaugeSetService', gaugeSetService);
      logger.info('Registered GaugeSetService with pool and GaugeSetRepository in ServiceRegistry');

      const gaugeQueryService = new GaugeQueryService(gaugeRepository, gaugeQueryRepository, gaugeReferenceRepository);
      serviceRegistry.register('GaugeQueryService', gaugeQueryService);
      logger.info('Registered GaugeQueryService with GaugeRepository, GaugeQueryRepository, and GaugeReferenceRepository in ServiceRegistry');

      const gaugeOperationsService = new GaugeOperationsService(gaugeRepository, checkoutRepository);
      serviceRegistry.register('GaugeOperationsService', gaugeOperationsService);
      logger.info('Registered GaugeOperationsService with GaugeRepository and CheckoutRepository in ServiceRegistry');
      
      // Main Gauge Service with repository injection
      const gaugeService = new GaugeService(gaugeRepository);
      serviceRegistry.register('GaugeService', gaugeService);
      logger.info('Registered GaugeService with GaugeRepository in ServiceRegistry');
    } catch (error) {
      logger.error('Failed to register GaugeService and split services:', error.message);
    }

    // Register gauge-related services with proper repository injection
    try {
      const gaugeCalibrationService = new GaugeCalibrationService(calibrationRepository, gaugeRepository);
      serviceRegistry.register('GaugeCalibrationService', gaugeCalibrationService);
      logger.info('Registered GaugeCalibrationService with repositories in ServiceRegistry');
    } catch (error) {
      logger.warn('GaugeCalibrationService not available for registration:', error.message);
    }

    try {
      const gaugeRejectionService = new GaugeRejectionService(rejectionRepository, gaugeRepository);
      serviceRegistry.register('GaugeRejectionService', gaugeRejectionService);
      logger.info('Registered GaugeRejectionService with repositories in ServiceRegistry');
    } catch (error) {
      logger.warn('GaugeRejectionService not available for registration:', error.message);
    }

    try {
      const gaugeIdService = new GaugeIdService(gaugeIdRepository);
      serviceRegistry.register('GaugeIdService', gaugeIdService);
      logger.info('Registered GaugeIdService with GaugeIdRepository in ServiceRegistry');
    } catch (error) {
      logger.warn('GaugeIdService not available for registration:', error.message);
    }

    try {
      const accountLockoutService = new AccountLockoutService(accountLockoutRepository);
      serviceRegistry.register('AccountLockoutService', accountLockoutService);
      logger.info('Registered AccountLockoutService with repository in ServiceRegistry');
    } catch (error) {
      logger.warn('AccountLockoutService not available for registration:', error.message);
    }

    // try {
    //   const gaugeSearchService = new GaugeSearchService(gaugeRepository);
    //   serviceRegistry.register('GaugeSearchService', gaugeSearchService);
    //   logger.info('Registered GaugeSearchService with GaugeRepository in ServiceRegistry');
    // } catch (error) {
    //   logger.warn('GaugeSearchService not available for registration:', error.message);
    // }

    try {
      const gaugeStatusService = new GaugeStatusService(gaugeStatusRepository);
      serviceRegistry.register('GaugeStatusService', gaugeStatusService);
      logger.info('Registered GaugeStatusService with repository in ServiceRegistry');
    } catch (error) {
      logger.warn('GaugeStatusService not available for registration:', error.message);
    }

    try {
      // Register GaugeTrackingService (legacy - will be deprecated)
      const gaugeTrackingService = new GaugeTrackingService(trackingRepository, gaugeRepository);
      serviceRegistry.register('GaugeTrackingService', gaugeTrackingService);
      logger.info('Registered GaugeTrackingService (legacy) with repositories in ServiceRegistry');

      // Register GaugeHistoryService (replaces GaugeTrackingService for history queries)
      const gaugeHistoryService = new GaugeHistoryService(trackingRepository, gaugeRepository);
      serviceRegistry.register('GaugeHistoryService', gaugeHistoryService);
      logger.info('Registered GaugeHistoryService with repositories in ServiceRegistry');

      // Register GaugeCheckoutService (replaces OperationsService with transaction support)
      const gaugeCheckoutService = new GaugeCheckoutService();
      serviceRegistry.register('GaugeCheckoutService', gaugeCheckoutService);
      logger.info('Registered GaugeCheckoutService with transaction support in ServiceRegistry');
    } catch (error) {
      logger.warn('GaugeTrackingService/GaugeHistoryService/GaugeCheckoutService not available for registration:', error.message);
    }

    try {
      const reportsService = new ReportsService();
      serviceRegistry.register('ReportsService', reportsService);
      logger.info('Registered ReportsService with repository in ServiceRegistry');
    } catch (error) {
      logger.warn('ReportsService not available for registration:', error.message);
    }

    try {
      const transfersService = new TransfersService();
      serviceRegistry.register('TransfersService', transfersService);
      logger.info('Registered TransfersService with repository in ServiceRegistry');
    } catch (error) {
      logger.warn('TransfersService not available for registration:', error.message);
    }

    try {
      const unsealsService = new UnsealsService();
      serviceRegistry.register('UnsealsService', unsealsService);
      logger.info('Registered UnsealsService with repository in ServiceRegistry');
    } catch (error) {
      logger.warn('UnsealsService not available for registration:', error.message);
    }

    try {
      const operationsService = new OperationsService();
      serviceRegistry.register('OperationsService', operationsService);
      logger.info('Registered OperationsService with repository in ServiceRegistry');
    } catch (error) {
      logger.warn('OperationsService not available for registration:', error.message);
    }

    try {
      const sealService = new SealService();
      serviceRegistry.register('SealService', sealService);
      logger.info('Registered SealService with repository in ServiceRegistry');
    } catch (error) {
      logger.warn('SealService not available for registration:', error.message);
    }

    try {
      const adminMaintenanceService = new AdminMaintenanceService();
      serviceRegistry.register('AdminMaintenanceService', adminMaintenanceService);
      logger.info('Registered AdminMaintenanceService in ServiceRegistry');
    } catch (error) {
      logger.warn('AdminMaintenanceService not available for registration:', error.message);
    }

    try {
      const securityAuditService = new SecurityAuditService();
      serviceRegistry.register('SecurityAuditService', securityAuditService);
      logger.info('Registered SecurityAuditService in ServiceRegistry');
    } catch (error) {
      logger.warn('SecurityAuditService not available for registration:', error.message);
    }

    try {
      const calibrationBatchManagementService = new CalibrationBatchManagementService();
      serviceRegistry.register('CalibrationBatchManagementService', calibrationBatchManagementService);
      logger.info('Registered CalibrationBatchManagementService in ServiceRegistry');
    } catch (error) {
      logger.warn('CalibrationBatchManagementService not available for registration:', error.message);
    }

    try {
      const calibrationWorkflowService = new CalibrationWorkflowService();
      serviceRegistry.register('CalibrationWorkflowService', calibrationWorkflowService);
      logger.info('Registered CalibrationWorkflowService in ServiceRegistry');
    } catch (error) {
      logger.warn('CalibrationWorkflowService not available for registration:', error.message);
    }

    logger.info('Service registration completed', {
      registeredServices: serviceRegistry.getKeys()
    });
  } catch (error) {
    logger.error('Failed to register services:', error);
    throw error;
  }
}

module.exports = { registerServices };