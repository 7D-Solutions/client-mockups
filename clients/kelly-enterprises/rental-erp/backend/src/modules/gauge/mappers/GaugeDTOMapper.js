const logger = require('../../../infrastructure/utils/logger');
const GaugePresenter = require('../presenters/GaugePresenter');

class GaugeDTOMapper {
  static transformToDTO(dbGauge) {
    if (!dbGauge) return null;

    // Structure thread specifications from JOINed columns if present
    let specifications = dbGauge.specifications || null;
    if (!specifications && dbGauge.thread_size) {
      specifications = {
        threadSize: dbGauge.thread_size,
        threadType: dbGauge.thread_type,
        threadForm: dbGauge.thread_form,
        threadClass: dbGauge.thread_class,
        gaugeType: dbGauge.gauge_type,
        threadHand: dbGauge.thread_hand,
        acmeStarts: dbGauge.acme_starts,
        is_go_gauge: dbGauge.is_go_gauge !== undefined ? Boolean(dbGauge.is_go_gauge) : null
      };
    }

    const dto = {
      id: dbGauge.id != null ? String(dbGauge.id) : null,
      gauge_id: dbGauge.gauge_id,
      gaugeId: dbGauge.gauge_id, // Camelcase alias
      set_id: dbGauge.set_id || null,
      setId: dbGauge.set_id || null, // Camelcase alias

      name: dbGauge.name,
      manufacturer: dbGauge.manufacturer,
      model_number: dbGauge.model_number,
      equipmentType: dbGauge.equipment_type,
      equipment_type: dbGauge.equipment_type,
      status: dbGauge.status,
      ownership_type: dbGauge.ownership_type,
      storage_location: dbGauge.storage_location || null,
      category_id: dbGauge.category_id != null ? String(dbGauge.category_id) : null,

      checked_out_to: dbGauge.checked_out_to ? String(dbGauge.checked_out_to) : null,
      checkout_date: dbGauge.checkout_date || null,
      expected_return: dbGauge.expected_return || null,
      assigned_to_user_name: dbGauge.assigned_to_user_name || null,
      returned_by_user_name: dbGauge.returned_by_user_name || null,

      thread_type: dbGauge.thread_type,
      thread_form: dbGauge.thread_form,
      thread_size: dbGauge.thread_size,
      thread_class: dbGauge.thread_class,

      measurement_range_min: dbGauge.measurement_range_min,
      measurement_range_max: dbGauge.measurement_range_max,
      measurement_unit: dbGauge.measurement_unit,
      resolution_value: dbGauge.resolution_value,
      accuracy_value: dbGauge.accuracy_value,

      is_sealed: Boolean(dbGauge.is_sealed),
      is_spare: Boolean(dbGauge.is_spare),
      is_active: Boolean(dbGauge.is_active),
      is_deleted: Boolean(dbGauge.is_deleted),
      has_pending_transfer: Boolean(dbGauge.has_pending_transfer),
      has_pending_unseal_request: Boolean(dbGauge.has_pending_unseal_request),

      created_by: dbGauge.created_by ? String(dbGauge.created_by) : null,
      updated_by: dbGauge.updated_by ? String(dbGauge.updated_by) : null,
      employee_owner_id: dbGauge.employee_owner_id ? String(dbGauge.employee_owner_id) : null,
      customer_id: dbGauge.customer_id ? Number(dbGauge.customer_id) : null,
      pending_transfer_id: dbGauge.pending_transfer_id ? String(dbGauge.pending_transfer_id) : null,
      transfer_to_user_id: dbGauge.transfer_to_user_id ? String(dbGauge.transfer_to_user_id) : null,
      transfer_from_user_id: dbGauge.transfer_from_user_id ? String(dbGauge.transfer_from_user_id) : null,

      created_at: dbGauge.created_at,
      updated_at: dbGauge.updated_at,
      calibration_date: dbGauge.calibration_date,
      calibration_due_date: dbGauge.calibration_due_date,
      last_calibration_date: dbGauge.last_calibration_date,

      calibration_frequency_days: dbGauge.calibration_frequency_days,
      calibration_status: dbGauge.calibration_status,

      specifications
    };

    // Enrich with displayName using GaugePresenter
    const enriched = GaugePresenter.toDTO(dto);

    return enriched;
  }

  static transformFromDTO(apiGauge) {
    if (!apiGauge) return null;

    logger.debug('🔍 transformFromDTO input:', JSON.stringify(apiGauge, null, 2));

    const transformed = { ...apiGauge };

    if (apiGauge.id !== undefined) {
      transformed.id = apiGauge.id ? parseInt(apiGauge.id) : null;
    }

    const idFields = [
      'checked_out_to', 'pending_transfer_id',
      'transfer_to_user_id', 'transfer_from_user_id', 'created_by',
      'updated_by', 'category_id', 'employee_owner_id', 'customer_id'
    ];

    idFields.forEach(field => {
      if (apiGauge[field] !== undefined) {
        transformed[field] = apiGauge[field] ? parseInt(apiGauge[field]) : null;
      }
    });

    const booleanFields = [
      'is_sealed', 'is_spare', 'is_active', 'is_deleted',
      'has_pending_transfer', 'has_pending_unseal_request'
    ];

    booleanFields.forEach(field => {
      if (apiGauge[field] !== undefined) {
        transformed[field] = apiGauge[field] ? 1 : 0;
      }
    });

    // Map serial_number to custom_id (for calibration standards and other equipment)
    if (apiGauge.serial_number !== undefined) {
      transformed.custom_id = apiGauge.serial_number;
    }

    // Map storage_location to location (for inventory system integration)
    if (apiGauge.storage_location !== undefined) {
      transformed.location = apiGauge.storage_location;
    }

    // Build specifications object for thread gauges from individual fields
    // This allows the repository to insert into gauge_thread_specifications table
    if (apiGauge.equipment_type === 'thread_gauge') {
      const hasSpecFields = apiGauge.thread_size || apiGauge.thread_class || apiGauge.thread_type ||
                           apiGauge.thread_form || apiGauge.gauge_type || apiGauge.spec;

      if (hasSpecFields) {
        // Check if specifications already provided as object
        if (apiGauge.spec && typeof apiGauge.spec === 'object') {
          // Use spec object and map to snake_case for database
          transformed.specifications = {
            thread_size: apiGauge.spec.thread_size || apiGauge.spec.threadSize || apiGauge.thread_size,
            thread_class: apiGauge.spec.thread_class || apiGauge.spec.threadClass || apiGauge.thread_class,
            thread_type: apiGauge.spec.thread_type || apiGauge.spec.threadType || apiGauge.thread_type,
            thread_form: apiGauge.spec.thread_form || apiGauge.spec.threadForm || apiGauge.thread_form,
            gauge_type: apiGauge.spec.gauge_type || apiGauge.spec.gaugeType || apiGauge.gauge_type,
            thread_hand: apiGauge.spec.thread_hand || apiGauge.spec.threadHand || apiGauge.thread_hand,
            acme_starts: apiGauge.spec.acme_starts || apiGauge.spec.acmeStarts || apiGauge.acme_starts,
            is_go_gauge: apiGauge.spec.is_go_gauge !== undefined ? apiGauge.spec.is_go_gauge :
                        (apiGauge.spec.isGoGauge !== undefined ? apiGauge.spec.isGoGauge : null)
          };
        } else {
          // Build from individual fields
          transformed.specifications = {
            thread_size: apiGauge.thread_size,
            thread_class: apiGauge.thread_class,
            thread_type: apiGauge.thread_type,
            thread_form: apiGauge.thread_form,
            gauge_type: apiGauge.gauge_type,
            thread_hand: apiGauge.thread_hand,
            acme_starts: apiGauge.acme_starts,
            is_go_gauge: apiGauge.is_go_gauge !== undefined ? apiGauge.is_go_gauge : null
          };
        }

        // Remove null/undefined values to avoid inserting empty columns
        Object.keys(transformed.specifications).forEach(key => {
          if (transformed.specifications[key] === null || transformed.specifications[key] === undefined) {
            delete transformed.specifications[key];
          }
        });

        logger.debug('✅ Built specifications object:', JSON.stringify(transformed.specifications, null, 2));
      } else {
        logger.debug('⚠️ No specifications built - hasSpecFields was false');
      }
    }

    // Build specifications object for calibration standards
    if (apiGauge.equipment_type === 'calibration_standard') {
      const hasSpecFields = apiGauge.standard_type || apiGauge.nominal_value ||
                           apiGauge.certification_number || apiGauge.actual_value ||
                           apiGauge.accuracy_value || apiGauge.temperature_requirements ||
                           apiGauge.traceability_info;

      if (hasSpecFields) {
        transformed.specifications = {
          standard_type: apiGauge.standard_type,
          nominal_value: apiGauge.nominal_value,
          uncertainty: apiGauge.accuracy_value, // Frontend: accuracy_value → DB: uncertainty
          uncertainty_units: apiGauge.measurement_unit || 'inches',
          certification_number: apiGauge.certification_number,
          actual_certified_value: apiGauge.actual_value, // Frontend: actual_value → DB: actual_certified_value
          temperature_requirements: apiGauge.temperature_requirements,
          traceability_organization: apiGauge.traceability_organization,
          traceability_certificate: apiGauge.traceability_certificate,
          access_restricted: apiGauge.access_restricted !== undefined ? apiGauge.access_restricted : true
        };

        // If traceability_info is provided as a combined field, use it for traceability_certificate
        if (apiGauge.traceability_info && !transformed.specifications.traceability_certificate) {
          transformed.specifications.traceability_certificate = apiGauge.traceability_info;
        }

        // Remove null/undefined values to avoid inserting empty columns
        Object.keys(transformed.specifications).forEach(key => {
          if (transformed.specifications[key] === null || transformed.specifications[key] === undefined) {
            delete transformed.specifications[key];
          }
        });

        logger.debug('✅ Built calibration standard specifications:', JSON.stringify(transformed.specifications, null, 2));
      } else {
        logger.debug('⚠️ No calibration standard specifications built - hasSpecFields was false');
      }
    }

    // Clean up undefined values - MySQL2 requires null instead of undefined
    let undefinedCount = 0;
    Object.keys(transformed).forEach(key => {
      if (transformed[key] === undefined) {
        logger.warn(`🔧 Converting undefined to null for key: ${key}`);
        transformed[key] = null;
        undefinedCount++;
      }
    });

    if (undefinedCount > 0) {
      logger.warn(`🔧 Converted ${undefinedCount} undefined values to null`);
    }

    logger.debug('🔍 transformFromDTO output:', JSON.stringify(transformed, null, 2));
    return transformed;
  }
}

module.exports = GaugeDTOMapper;
