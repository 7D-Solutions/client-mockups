const BaseService = require('../../../infrastructure/services/BaseService');
const logger = require('../../../infrastructure/utils/logger');

// Custom ValidationError class for field validation
class ValidationError extends Error {
  constructor(details) {
    super(details.message);
    this.name = 'ValidationError';
    this.code = details.code;
    this.field = details.field;
    this.validValues = details.validValues;
    this.correctUsage = details.correctUsage;
    this.expectedValue = details.expectedValue;
    this.details = details;
  }
}

const VALID_THREAD_TYPES = ['standard', 'metric', 'acme', 'npt', 'sti', 'spiralock'];
const THREAD_FORMS = {
  'standard': ['UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ'],
  'npt': ['NPT', 'NPTF']
};
const METRIC_THREAD_SIZES = ['M1', 'M1.6', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'];

/**
 * GaugeValidationService - Focused on validation logic for gauge data
 * Handles thread validation, field validation, and data normalization
 */
class GaugeValidationService extends BaseService {
  constructor(options = {}) {
    super(null, options); // No repository needed for validation
  }

  /**
   * Validates thread type and form fields according to domain model rules
   * Enforces proper categorization and provides educational error messages
   * @param {Object} data - The gauge data containing thread_type and thread_form
   * @throws {ValidationError} If validation fails with educational guidance
   */
  validateThreadFields(data) {
    // Robust null/empty handling
    const threadType = (data.thread_type || '').toString().toLowerCase().trim();
    
    // Check for uppercase form values BEFORE converting to lowercase for validation
    const originalThreadType = data.thread_type || '';
    const upperThreadType = originalThreadType.toString().toUpperCase();
    
    // Special handling for NPT/NPTF - these are forms, not types
    // Even though 'npt' is a valid type, 'NPT' uppercase should be treated as a form
    if ((upperThreadType === 'NPT' || upperThreadType === 'NPTF') && originalThreadType === upperThreadType) {
      throw new ValidationError({
        code: 'FORM_AS_TYPE',
        message: `You sent thread_type="${data.thread_type}" but this appears to be a thread_form value. ` +
                 `For ${upperThreadType} threads, use thread_type="npt" and thread_form="${upperThreadType}"`,
        field: 'thread_type',
        correctUsage: { 
          thread_type: 'npt',
          thread_form: upperThreadType 
        }
      });
    }
    
    // Check for other standard form values
    if (THREAD_FORMS['standard'].includes(upperThreadType)) {
      throw new ValidationError({
        code: 'FORM_AS_TYPE',
        message: `You sent thread_type="${data.thread_type}" but this appears to be a thread_form value. ` +
                 `For ${upperThreadType} threads, use thread_type="standard" and thread_form="${upperThreadType}"`,
        field: 'thread_type',
        correctUsage: { 
          thread_type: 'standard',
          thread_form: upperThreadType 
        }
      });
    }
    
    // NOW validate thread_type is a valid category
    if (!threadType || !VALID_THREAD_TYPES.includes(threadType)) {
      
      // Check if they sent a metric size as type
      if (METRIC_THREAD_SIZES.includes(data.thread_type?.toString().toUpperCase())) {
        throw new ValidationError({
          code: 'THREAD_SIZE_AS_TYPE',
          message: `You sent thread_type="${data.thread_type}" but this appears to be a thread size. ` +
                   `For metric threads, use thread_type="metric" and include size in thread_size field.`,
          field: 'thread_type',
          correctUsage: { thread_type: 'metric', thread_size: data.thread_type }
        });
      }
      
      // Generic invalid type error
      throw new ValidationError({
        code: 'INVALID_THREAD_TYPE',
        message: `Invalid thread_type "${data.thread_type}". Valid types: ${VALID_THREAD_TYPES.join(', ')}`,
        field: 'thread_type',
        validValues: VALID_THREAD_TYPES
      });
    }
    
    // Validate thread_form based on type
    if (threadType === 'standard' || threadType === 'npt') {
      if (!data.thread_form) {
        throw new ValidationError({
          code: 'MISSING_THREAD_FORM',
          message: `thread_form is required for ${threadType} thread gauges`,
          field: 'thread_form',
          validValues: THREAD_FORMS[threadType]
        });
      }
      if (!THREAD_FORMS[threadType].includes(data.thread_form)) {
        throw new ValidationError({
          code: 'INVALID_THREAD_FORM',
          message: `Invalid thread_form "${data.thread_form}" for ${threadType}`,
          field: 'thread_form',
          validValues: THREAD_FORMS[threadType]
        });
      }
    } else {
      if (data.thread_form) {
        throw new ValidationError({
          code: 'UNEXPECTED_THREAD_FORM',
          message: `thread_form must be NULL for ${threadType} thread gauges`,
          field: 'thread_form',
          expectedValue: null
        });
      }
    }
  }

  /**
   * Normalize thread fields: if thread_type is actually a form (UN, UNF, UNEF, UNS, UNR, UNJ, NPT, NPTF),
   * move it to thread_form and set thread_type to the correct category (standard or npt).
   * This runs BEFORE validation to avoid user-facing errors for simple mislabeling.
   */
  normalizeThreadData(data) {
    if (!data || !data.thread_type) return data;
    const raw = String(data.thread_type).trim().toUpperCase();
    const standardForms = THREAD_FORMS['standard'];
    const nptForms = THREAD_FORMS['npt'];

    if (standardForms.includes(raw)) {
      return {
        ...data,
        thread_type: 'standard',
        thread_form: raw
      };
    }

    if (nptForms.includes(raw)) {
      return {
        ...data,
        thread_type: 'npt',
        thread_form: raw
      };
    }

    return data;
  }

  /**
   * Validate gauge data before creation or update
   * @param {Object} data - Gauge data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @throws {ValidationError} If validation fails
   */
  validateGaugeData(data, isUpdate = false) {
    logger.info('Starting gauge data validation', { 
      isUpdate, 
      hasThreadType: !!data.thread_type 
    });

    // Normalize thread data first
    const normalizedData = this.normalizeThreadData(data);
    
    // Validate thread fields
    if (normalizedData.thread_type) {
      this.validateThreadFields(normalizedData);
    }

    logger.info('Gauge data validation completed successfully');
    return normalizedData;
  }
}

// Export the ValidationError class as well
GaugeValidationService.ValidationError = ValidationError;

module.exports = GaugeValidationService;