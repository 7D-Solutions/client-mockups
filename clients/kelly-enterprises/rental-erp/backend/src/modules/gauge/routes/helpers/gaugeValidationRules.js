const { body, param, query } = require('express-validator');

/**
 * Validation Rules for Gauge Routes
 */

// Common validation rules
const validateGaugeId = param('id').trim().notEmpty().withMessage('Gauge ID is required');

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
];

// Gauge creation validation
const createGaugeValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('equipment_type').isIn(['thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard']).withMessage('Invalid equipment type'),
  body('gauge_id').trim().notEmpty().withMessage('Gauge ID is required'),
  body('manufacturer').optional().trim(),
  body('model_number').optional().trim(),
  body('measurement_range_min').optional().isNumeric().withMessage('Minimum range must be numeric'),
  body('measurement_range_max').optional().isNumeric().withMessage('Maximum range must be numeric'),
  body('ownership_type').optional().isIn(['company_owned', 'customer_owned', 'rental']),
  body('is_sealed').optional().isBoolean(),
  body('is_spare').optional().isBoolean().custom((value, { req }) => {
    // Only thread gauges can be marked as spares
    if (value === true && req.body.equipment_type !== 'thread_gauge') {
      throw new Error('Only thread gauges can be marked as spares');
    }
    return true;
  })
];

// Gauge update validation
// IMMUTABILITY ENFORCEMENT: Locked fields are rejected if present in update request
const updateGaugeValidation = [
  // Operational fields (allowed)
  body('status').optional().isIn(['available', 'checked_out', 'calibration_due', 'out_of_service', 'retired', 'pending_qc', 'out_for_calibration', 'pending_certificate', 'pending_release', 'returned']).withMessage('Invalid status value'),
  body('is_sealed').optional().isBoolean().withMessage('is_sealed must be boolean'),
  body('storage_location').optional().trim().notEmpty().withMessage('Storage location cannot be empty'),

  // Non-locked metadata fields (allowed)
  body('manufacturer').optional().trim().notEmpty().withMessage('Manufacturer cannot be empty'),
  body('model_number').optional().trim(),
  body('measurement_range_min').optional().isNumeric().withMessage('Minimum range must be numeric'),
  body('measurement_range_max').optional().isNumeric().withMessage('Maximum range must be numeric'),

  // LOCKED fields - reject if present (ADDENDUM lines 315-352)
  body('name').custom((value, { req }) => {
    if (req.body.hasOwnProperty('name')) {
      throw new Error('Field "name" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  body('equipment_type').custom((value, { req }) => {
    if (req.body.hasOwnProperty('equipment_type')) {
      throw new Error('Field "equipment_type" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  body('ownership_type').custom((value, { req }) => {
    if (req.body.hasOwnProperty('ownership_type')) {
      throw new Error('Field "ownership_type" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  // Note: serial_number column has been removed - replaced by gauge_id system
  body('gauge_id').custom((value, { req }) => {
    if (req.body.hasOwnProperty('gauge_id')) {
      throw new Error('Field "gauge_id" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  // Note: system_gauge_id column has been removed - gauge_id is now the universal public identifier
  body('custom_id').custom((value, { req }) => {
    if (req.body.hasOwnProperty('custom_id')) {
      throw new Error('Field "custom_id" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  body('category_id').custom((value, { req }) => {
    if (req.body.hasOwnProperty('category_id')) {
      throw new Error('Field "category_id" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  body('employee_owner_id').custom((value, { req }) => {
    if (req.body.hasOwnProperty('employee_owner_id')) {
      throw new Error('Field "employee_owner_id" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  body('customer_id').custom((value, { req }) => {
    if (req.body.hasOwnProperty('customer_id')) {
      throw new Error('Field "customer_id" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  body('purchase_info').custom((value, { req }) => {
    if (req.body.hasOwnProperty('purchase_info')) {
      throw new Error('Field "purchase_info" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  body('created_by').custom((value, { req }) => {
    if (req.body.hasOwnProperty('created_by')) {
      throw new Error('Field "created_by" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  }),
  body('created_at').custom((value, { req }) => {
    if (req.body.hasOwnProperty('created_at')) {
      throw new Error('Field "created_at" is immutable and cannot be updated after creation (ADDENDUM Immutability Rules)');
    }
    return true;
  })
];

// Calibration validation
const calibrationSendValidation = [
  body('gauge_ids').isArray().withMessage('Gauge IDs must be an array'),
  body('gauge_ids.*').trim().notEmpty().withMessage('Each gauge ID must be provided')
];

const calibrationReceiveValidation = [
  body('gauge_id').trim().notEmpty().withMessage('Gauge ID is required'),
  body('passed').isBoolean().withMessage('Passed status must be boolean'),
  body('document_path').optional().trim(),
  body('notes').optional().trim(),
  body('performed_at').isISO8601().withMessage('Performed at must be valid date')
];

// Reset/recovery validation
const resetGaugeValidation = [
  body('reason').trim().notEmpty().withMessage('Reason for reset is required')
];

// Bulk update validation
const bulkUpdateValidation = [
  body('gauge_ids').isArray().withMessage('Gauge IDs must be an array'),
  body('gauge_ids.*').trim().notEmpty().withMessage('Each gauge ID must be provided'),
  body('updates').isObject().withMessage('Updates must be an object')
];

// Allowed fields for different operations
// IMMUTABILITY RULES (ADDENDUM lines 315-375):
// LOCKED fields (cannot be updated after creation):
//   - Identity: gauge_id, custom_id
//   - Classification: equipment_type, category_id
//   - Thread Specs: All fields in gauge_thread_specifications table
//   - Descriptive: name (displayName is computed from specifications)
//   - Ownership: ownership_type, employee_owner_id, purchase_info, customer_id
//   - Audit: created_by, created_at
// OPERATIONAL fields (can be updated):
//   - Workflow: status, storage_location, is_sealed
//   - System-managed: set_id, is_spare, is_deleted, is_active, updated_at
// Rationale: Physical gauges don't change specs. Mistakes → Delete + recreate.
// Note: serial_number and system_gauge_id columns removed - gauge_id is now universal identifier
const ALLOWED_UPDATE_FIELDS = [
  // Operational fields (ADDENDUM lines 358-373)
  'status',             // Workflow state transitions
  'is_sealed',          // Unsealed on checkout, sealed on calibration return
  'storage_location',   // Location changes (with cascade rules)

  // Non-locked metadata fields (not mentioned in ADDENDUM locked list)
  'manufacturer',           // Manufacturer info can be corrected
  'model_number',           // Model info can be corrected
  'measurement_range_min',  // Range can be refined/corrected
  'measurement_range_max'   // Range can be refined/corrected
];

const ALLOWED_BULK_UPDATE_FIELDS = [
  // Only operational and non-locked fields allowed in bulk operations
  'status',                 // Bulk status changes
  'is_sealed',              // Bulk seal operations
  'storage_location',       // Bulk location moves
  'manufacturer',           // Bulk metadata corrections
  'model_number',           // Bulk metadata corrections
  'measurement_range_min',  // Bulk range corrections
  'measurement_range_max'   // Bulk range corrections
];

module.exports = {
  validateGaugeId,
  validatePagination,
  createGaugeValidation,
  updateGaugeValidation,
  calibrationSendValidation,
  calibrationReceiveValidation,
  resetGaugeValidation,
  bulkUpdateValidation,
  ALLOWED_UPDATE_FIELDS,
  ALLOWED_BULK_UPDATE_FIELDS
};
