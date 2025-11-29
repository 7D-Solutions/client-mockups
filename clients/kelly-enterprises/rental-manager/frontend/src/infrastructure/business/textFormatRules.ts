/**
 * Text Formatting Rules - Centralized text formatting logic
 * 
 * Usage Examples:
 * - TextFormatRules.formatEquipmentType('hand_tool') → 'Hand Tool'
 * - TextFormatRules.formatActionText('checkout_action') → 'Checkout Action'
 * - TextFormatRules.formatStatusText('out_of_service') → 'Out Of Service'
 * - TextFormatRules.formatSettingKey('max_checkout_days') → 'Max Checkout Days'
 * 
 * @note This consolidates scattered text formatting patterns from 8+ files
 * @note Provides null-safe operations and consistent formatting
 */

export interface TextFormatConfig {
  text?: string;
  equipment_type?: string;
  status?: string;
  action?: string;
  setting_key?: string;
  [key: string]: any;
}

export const TextFormatRules = {
  
  // ===== CORE TEXT FORMATTING METHODS =====
  
  /**
   * Convert underscore-separated text to space-separated text
   * @param text - Text with underscores to convert
   * @returns Text with underscores replaced by spaces
   * @example formatUnderscoreToSpace('equipment_type') → 'equipment type'
   */
  formatUnderscoreToSpace(text: string): string {
    if (!text) return '';
    return text.replace(/_/g, ' ');
  },

  /**
   * Convert text to title case (every word capitalized)
   * @param text - Text to convert to title case
   * @returns Text in title case format
   * @example formatToTitleCase('equipment type') → 'Equipment Type'
   */
  formatToTitleCase(text: string): string {
    if (!text) return '';
    return text.replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Convert text to sentence case (first letter capitalized)
   * @param text - Text to convert to sentence case
   * @returns Text in sentence case format
   * @example formatToSentenceCase('equipment type') → 'Equipment type'
   */
  formatToSentenceCase(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  },

  /**
   * Format snake_case to Title Case
   * @param text - Snake case text to format
   * @returns Formatted title case text
   * @example formatSnakeCaseToTitleCase('equipment_type') → 'Equipment Type'
   */
  formatSnakeCaseToTitleCase(text: string): string {
    if (!text) return '';
    return this.formatToTitleCase(this.formatUnderscoreToSpace(text));
  },

  // ===== EQUIPMENT-SPECIFIC FORMATTING =====

  /**
   * Format equipment type for display (already uses EquipmentRules.getDisplayName)
   * Enhanced with title case conversion when needed
   * @param equipment_type - Equipment type string
   * @returns Formatted equipment type display text
   */
  formatEquipmentType(equipment_type: string): string {
    if (!equipment_type) return 'Unknown';
    // Note: EquipmentRules.getDisplayName already handles underscore conversion
    // This method provides title case enhancement when needed
    return this.formatSnakeCaseToTitleCase(equipment_type);
  },

  // ===== STATUS TEXT FORMATTING =====

  /**
   * Format status text for display with proper capitalization
   * @param status - Status string to format
   * @returns Formatted status display text
   * @example formatStatusText('out_of_service') → 'Out Of Service'
   */
  formatStatusText(status: string): string {
    if (!status) return '';
    // Special handling for QC status
    let formatted = this.formatSnakeCaseToTitleCase(status);
    return formatted.replace(/\bQc\b/g, 'QC');
  },

  // ===== ACTION TEXT FORMATTING =====

  /**
   * Format action text for display
   * @param action - Action string to format  
   * @returns Formatted action display text
   * @example formatActionText('checkout_action') → 'Checkout Action'
   */
  formatActionText(action: string): string {
    if (!action) return '';
    
    // Handle special cases first
    switch (action) {
      case 'checkout':
        return 'Checked Out';
      case 'return':
        return 'Returned';
      case 'transfer_out':
        return 'Transferred Out';
      case 'transfer_in':
        return 'Transferred In';
      default:
        // Default formatting: convert underscores and capitalize first letter
        return this.formatToSentenceCase(this.formatUnderscoreToSpace(action));
    }
  },

  /**
   * Format action text for complex display (handles arrays and complex logic)
   * @param action - Action string to format
   * @returns Formatted action display text with full title case
   */
  formatActionTextComplex(action: string): string {
    if (!action) return '';
    
    // Handle special cases first
    switch (action) {
      case 'checkout':
        return 'Checked Out';
      case 'return': 
        return 'Returned';
      case 'transfer_out':
        return 'Transferred Out';
      case 'transfer_in':
        return 'Transferred In';
      default:
        // Split by underscores and capitalize each word
        return action.split('_')
          .map(word => this.formatToSentenceCase(word))
          .join(' ');
    }
  },

  // ===== SYSTEM SETTINGS FORMATTING =====

  /**
   * Format system setting keys for display
   * @param setting_key - Setting key to format
   * @returns Formatted setting display text
   * @example formatSettingKey('max_checkout_days') → 'Max Checkout Days'
   */
  formatSettingKey(setting_key: string): string {
    if (!setting_key) return '';
    return setting_key.split('_')
      .map(word => this.formatToSentenceCase(word))
      .join(' ');
  },

  // ===== ADVANCED FORMATTING METHODS =====

  /**
   * Format camelCase to Title Case
   * @param text - CamelCase text to format
   * @returns Formatted title case text
   * @example formatCamelCaseToWords('equipmentType') → 'Equipment Type'
   */
  formatCamelCaseToWords(text: string): string {
    if (!text) return '';
    return text.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Format kebab-case to Title Case
   * @param text - Kebab case text to format
   * @returns Formatted title case text
   * @example formatKebabCaseToWords('equipment-type') → 'Equipment Type'
   */
  formatKebabCaseToWords(text: string): string {
    if (!text) return '';
    return text.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Capitalize the first letter of a string
   * @param text - Text to capitalize
   * @returns Text with first letter capitalized
   * @example capitalizeFirstLetter('word') → 'Word'
   */
  capitalizeFirstLetter(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  },

  /**
   * Capitalize every word in a string
   * @param text - Text to capitalize words
   * @returns Text with every word capitalized
   * @example capitalizeWords('some words') → 'Some Words'
   */
  capitalizeWords(text: string): string {
    if (!text) return '';
    return text.replace(/\b\w/g, l => l.toUpperCase());
  },

  // ===== SAFE FORMATTING WRAPPER =====

  /**
   * Safe formatting wrapper that handles null/undefined inputs
   * @param text - Text to format (can be null/undefined)
   * @param formatter - Formatting function to apply
   * @returns Formatted text or empty string if input is null/undefined
   */
  safeFormat(text: string | null | undefined, formatter: (text: string) => string): string {
    if (!text) return '';
    try {
      return formatter(text);
    } catch (error) {
      console.warn('TextFormatRules: Error formatting text:', error);
      return text;
    }
  }
};