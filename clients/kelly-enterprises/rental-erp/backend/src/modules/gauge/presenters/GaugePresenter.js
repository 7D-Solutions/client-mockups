/**
 * GaugePresenter
 *
 * Presentation layer for gauge display formatting.
 * Single source of truth for all name generation logic.
 *
 * Responsibilities:
 * - Format gauge display names from specifications
 * - Convert thread sizes to decimal format
 * - Handle different equipment types (thread_gauge, hand_tool, etc.)
 * - Enrich DTOs with display-ready fields
 */

class GaugePresenter {
  // Standard numbered thread sizes (ANSI B1.1)
  static NUMBER_SIZES = {
    '0': '.060', '1': '.073', '2': '.086', '3': '.099',
    '4': '.112', '5': '.125', '6': '.138', '8': '.164',
    '10': '.190', '12': '.216'
  };

  /**
   * Enrich gauge entity with display fields
   * @param {object} gauge - Gauge entity with specifications
   * @returns {object} DTO with displayName added
   */
  static toDTO(gauge) {
    if (!gauge) return null;

    return {
      ...gauge,
      displayName: this.formatDisplayName(gauge)
    };
  }

  /**
   * Format display name based on equipment type
   * @param {object} gauge - Gauge entity
   * @returns {string} Formatted display name
   */
  static formatDisplayName(gauge) {
    switch (gauge.equipmentType) {
      case 'thread_gauge':
        return this.formatThreadGaugeName(gauge);
      case 'hand_tool':
        return this.formatHandToolName(gauge);
      case 'large_equipment':
        return this.formatLargeEquipmentName(gauge);
      case 'calibration_standard':
        return this.formatCalibrationStandardName(gauge);
      default:
        return gauge.name; // Fallback to user-entered name
    }
  }

  /**
   * Format thread gauge display name
   * @param {object} gauge - Gauge with thread specifications
   * @returns {string} Formatted name (e.g., ".250 UN 2A Thread Plug Gauge GO")
   */
  static formatThreadGaugeName(gauge) {
    if (!gauge.specifications) {
      return gauge.name; // Fallback for incomplete data
    }

    const { threadSize, threadForm, threadClass, gaugeType } = gauge.specifications;

    // Convert fractions and numbered sizes to decimal
    const size = this.convertToDecimal(threadSize);

    // Build name from parts
    const parts = [
      size,
      threadForm,
      threadClass,
      'Thread',
      gaugeType,
      'Gauge'
    ].filter(Boolean); // Remove any undefined/null values

    let name = parts.join(' ');

    // Add GO/NO GO suffix based on gauge_suffix
    if (gauge.gaugeSuffix === 'A') name += ' GO';
    if (gauge.gaugeSuffix === 'B') name += ' NO GO';

    return name;
  }

  /**
   * Format hand tool display name
   * @param {object} gauge - Gauge with hand tool specifications
   * @returns {string} Formatted name
   */
  static formatHandToolName(gauge) {
    if (!gauge.specifications) return gauge.name;

    const { toolType, format, rangeMin, rangeMax, rangeUnit } = gauge.specifications;
    return `${toolType} (${format}) ${rangeMin}-${rangeMax} ${rangeUnit}`;
  }

  /**
   * Format large equipment display name
   * @param {object} gauge - Gauge with large equipment specifications
   * @returns {string} Formatted name
   */
  static formatLargeEquipmentName(gauge) {
    if (!gauge.specifications) return gauge.name;

    const { equipmentType, capacity } = gauge.specifications;
    return capacity ? `${equipmentType} (${capacity})` : equipmentType;
  }

  /**
   * Format calibration standard display name
   * @param {object} gauge - Gauge with calibration standard specifications
   * @returns {string} Formatted name
   */
  static formatCalibrationStandardName(gauge) {
    if (!gauge.specifications) return gauge.name;

    const { standardType, nominalValue, uncertaintyUnits } = gauge.specifications;
    return `${standardType} ${nominalValue} ${uncertaintyUnits}`;
  }

  /**
   * Convert thread size to decimal format
   * @param {string} size - Thread size (e.g., "1/4-20", "10", ".250")
   * @returns {string} Decimal representation
   */
  static convertToDecimal(size) {
    if (!size) return size;

    // Handle fractions: "1/4-20" → ".250-20"
    if (size.includes('/')) {
      const parts = size.split('-');
      const fraction = parts[0];
      const [numerator, denominator] = fraction.split('/').map(Number);

      if (denominator > 0) {
        const decimal = '.' + Math.floor(numerator / denominator * 1000).toString().padStart(3, '0');
        return parts[1] ? `${decimal}-${parts[1]}` : decimal;
      }
    }

    // Handle numbered sizes (ANSI B1.1)
    return this.NUMBER_SIZES[size] || size;
  }
}

module.exports = GaugePresenter;
