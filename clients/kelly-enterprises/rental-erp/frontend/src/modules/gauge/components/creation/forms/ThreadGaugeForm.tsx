// For Claude: Example of using centralized Form components instead of raw HTML inputs
// Use FormInput instead of <input>, FormSelect instead of <select>, FormTextarea instead of <textarea>
// This provides consistent validation, styling, and accessibility
import React, { useEffect, useState } from 'react';
import { FormInput, FormSelect, FormTextarea, FormCheckbox, StorageLocationSelect, FormSection, TooltipToggle } from '../../../../../infrastructure/components';
import { useGaugeState, useGaugeActions } from '../../../../../infrastructure/store';

// These are thread FORMS (specific thread patterns), not types!
const THREAD_FORMS = [
  { value: 'UN', label: 'UN (Unified National)' },
  { value: 'UNF', label: 'UNF (Unified Fine)' },
  { value: 'UNS', label: 'UNS (Unified Special)' },
  { value: 'UNEF', label: 'UNEF (Unified Extra Fine)' },
  { value: 'ACME', label: 'ACME' },
  { value: 'STUB ACME', label: 'STUB ACME' },
  { value: 'NPT', label: 'NPT (National Pipe Thread)' },
  { value: 'NPTF', label: 'NPTF (National Pipe Thread Fuel)' },
  { value: 'M', label: 'M (ISO Metric)' },
  { value: 'STI', label: 'STI' },
  { value: 'SPIRALOCK', label: 'Spiralock' },
  { value: 'BUTTRESS', label: 'BUTTRESS' },
  { value: 'OTHER', label: 'OTHER' }
];

const CREATE_OPTIONS = [
  { value: 'GO', label: 'GO Only' },
  { value: 'NO GO', label: 'NO GO Only' },
  { value: 'Both', label: 'Both (GO & NO GO Set)' }
];

const GAUGE_TYPES = [
  { value: 'plug', label: 'Plug Gauge' },
  { value: 'ring', label: 'Ring Gauge' }
];

// Thread class grade options (just the number for standard threads)
const THREAD_CLASS_GRADES: Record<string, Array<{ value: string; label: string }>> = {
  'standard': [
    { value: '1', label: 'Class 1 (Loose fit)' },
    { value: '2', label: 'Class 2 (Normal fit)' },
    { value: '3', label: 'Class 3 (Close fit)' }
  ],
  'metric': [
    { value: '4g', label: '4g (Fine tolerance)' },
    { value: '4h', label: '4h (Medium tolerance)' },
    { value: '5g', label: '5g (Fine tolerance)' },
    { value: '5h', label: '5h (Medium tolerance)' },
    { value: '6g', label: '6g (Coarse tolerance)' },
    { value: '6h', label: '6h (Coarse tolerance)' },
    { value: '6e', label: '6e' },
    { value: '6f', label: '6f' }
  ],
  'acme': [
    { value: '2G', label: '2G (General purpose)' },
    { value: '3G', label: '3G (General purpose)' },
    { value: '4G', label: '4G (General purpose)' },
    { value: '5G', label: '5G (General purpose)' },
    { value: '2C', label: '2C (Centralizing)' },
    { value: '3C', label: '3C (Centralizing)' },
    { value: '4C', label: '4C (Centralizing)' },
    { value: '5C', label: '5C (Centralizing)' }
  ],
  'npt': [
    { value: 'L1', label: 'L1 (Hand tight)' },
    { value: 'L2', label: 'L2 (Wrench tight)' },
    { value: 'L3', label: 'L3 (Wrench tight - dry seal)' }
  ]
};

// Map category names to thread TYPES (the threading system category)
const CATEGORY_TO_THREAD_TYPE: Record<string, string> = {
  'Standard': 'standard',    // lowercase type
  'Metric': 'metric',        // lowercase
  'ACME': 'acme',           // lowercase
  'NPT': 'npt',             // lowercase
  'STI': 'sti',             // lowercase
  'Spiralock': 'spiralock'  // lowercase
};

// Map thread types to their available forms
const THREAD_TYPE_TO_FORMS: Record<string, string[]> = {
  'standard': ['UN', 'UNF', 'UNS', 'UNEF'],
  'npt': ['NPT', 'NPTF'],
  'acme': ['ACME', 'STUB ACME'],
  'metric': ['M'],
  'sti': ['STI'],
  'spiralock': ['SPIRALOCK'],
  'buttress': ['BUTTRESS'],
  'other': ['OTHER']
};

export const ThreadGaugeForm: React.FC = () => {
  const { createGauge } = useGaugeState();
  const { updateGaugeFormData } = useGaugeActions();
  const { formData, categoryName, _categoryId } = createGauge;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableThreadForms, setAvailableThreadForms] = useState<string[]>([]);
  const [availableThreadClasses, setAvailableThreadClasses] = useState<Array<{ value: string; label: string }>>([]);

  // Determine thread type from category
  const mappedThreadType = categoryName && CATEGORY_TO_THREAD_TYPE[categoryName];
  const isThreadTypeMapped = !!mappedThreadType;

  // Initialize form data and auto-set thread type from category
  useEffect(() => {
    if (!formData.create_option) {
      updateGaugeFormData({ create_option: 'Both' });
    }
    if (!formData.is_sealed) {
      updateGaugeFormData({ is_sealed: true });
    }

    // Auto-set thread TYPE (not form!) from category
    if (mappedThreadType && formData.thread_type !== mappedThreadType) {
      updateGaugeFormData({ thread_type: mappedThreadType });

      // Set available thread forms based on the type
      const forms = THREAD_TYPE_TO_FORMS[mappedThreadType] || [];
      setAvailableThreadForms(forms);

      // Auto-select first form if not already set
      if (!formData.thread_form && forms.length > 0) {
        updateGaugeFormData({ thread_form: forms[0] });
      }
    }
  }, [formData, updateGaugeFormData, mappedThreadType]);

  // Update available thread classes when thread_type changes
  useEffect(() => {
    if (!formData.thread_type) {
      setAvailableThreadClasses([]);
      return;
    }

    const grades = THREAD_CLASS_GRADES[formData.thread_type] || [];
    setAvailableThreadClasses(grades);

    // Auto-select Class 2 (normal fit) as default for standard threads
    if (formData.thread_type === 'standard' && !formData.thread_class) {
      updateGaugeFormData({ thread_class: '2' });
    } else if (!formData.thread_class && grades.length > 0) {
      updateGaugeFormData({ thread_class: grades[0].value });
    }
  }, [formData.thread_type, formData.thread_class, updateGaugeFormData]);

  // Auto-update thread_class when gauge_type changes (for standard threads)
  useEffect(() => {
    if (formData.thread_type === 'standard' && formData.gauge_type && formData.thread_class) {
      const grade = formData.thread_class.replace(/[AB]/g, ''); // Extract just the number
      const suffix = formData.gauge_type === 'plug' ? 'A' : 'B';
      const fullClass = `${grade}${suffix}`;

      // Only update if it's different
      if (formData.thread_class !== fullClass) {
        updateGaugeFormData({ thread_class: fullClass });
      }
    }
  }, [formData.thread_type, formData.gauge_type, formData.thread_class, updateGaugeFormData]);

  const handleFieldChange = (field: string, value: any) => {
    // Special handling for thread_class on standard threads
    if (field === 'thread_class' && formData.thread_type === 'standard' && formData.gauge_type) {
      // User selected a grade (1, 2, or 3), append A or B based on gauge type
      const suffix = formData.gauge_type === 'plug' ? 'A' : 'B';
      const fullClass = `${value}${suffix}`;
      updateGaugeFormData({ [field]: fullClass });
    } else {
      updateGaugeFormData({ [field]: value });
    }
    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const formatThreadSize = (value: string): string => {
    // Preserve original value for later
    const original = value;

    // Normalize spaces in compound fractions: "1 1/8" -> "1-1/8"
    value = value.trim().replace(/\s+/g, '-');

    // Check if it's already in the correct format (.250-20, 1.125-12, or M10x1.5)
    const correctPattern = /^(\d+\.\d{3}|\.\d{3})-\d+$|^M\d+x[\d.]+$/;
    if (correctPattern.test(value)) {
      return value;
    }

    // Common numbered screw sizes (# sizes) to decimal conversion
    const NUMBERED_SIZES: Record<string, string> = {
      '0': '.060',
      '1': '.073',
      '2': '.086',
      '3': '.099',
      '4': '.112',
      '5': '.125',
      '6': '.138',
      '8': '.164',
      '10': '.190',
      '12': '.216'
    };

    // Comprehensive pattern to match:
    // - Simple fractions: "1/2-13", "3/4-20"
    // - Compound fractions: "1-1/8-12", "2-1/4-8"
    // - Whole numbers: "1-8", "2-4"
    // - Numbered sizes: "#10-24", "10-24"
    const compoundPattern = /^#?(\d+)-(\d+\/\d+)-(\d+)$/;  // Compound: 1-1/8-12
    const simplePattern = /^#?(\d+(?:\/\d+)?)-(\d+)$/;     // Simple: 1/2-13 or 10-24

    // Try compound fraction first (e.g., "1-1/8-12")
    let match = value.match(compoundPattern);
    if (match) {
      const wholeNumber = Number(match[1]);
      const [fracNum, fracDen] = match[2].split('/').map(Number);
      const threads = match[3];

      // Calculate decimal: whole + fraction
      const decimal = (wholeNumber + (fracNum / fracDen)).toFixed(3);
      return `${decimal}-${threads}`;
    }

    // Try simple pattern (e.g., "1/2-13", "10-24", "#6-32")
    match = value.match(simplePattern);
    if (match) {
      let size = match[1];
      const threads = match[2];
      const hasHashPrefix = original.trim().startsWith('#');

      if (size.includes('/')) {
        // Handle simple fraction conversion (e.g., "1/2" -> ".500")
        const [numerator, denominator] = size.split('/').map(Number);
        const decimal = (numerator / denominator).toFixed(3);
        // Remove leading zero for sizes < 1 (0.250 -> .250)
        size = decimal.startsWith('0.') ? decimal.substring(1) : decimal;
      } else {
        // Handle whole numbers or decimals
        const numSize = Number(size);

        // Check if it's a numbered screw size (only if # prefix OR in range 3-12)
        // Note: 1 and 2 without # are treated as whole inches (1.000", 2.000")
        if (hasHashPrefix && NUMBERED_SIZES[size]) {
          size = NUMBERED_SIZES[size];
        } else if (!hasHashPrefix && numSize >= 3 && numSize <= 12 && NUMBERED_SIZES[size]) {
          // Sizes 3-12 without # are assumed to be numbered sizes for backward compatibility
          size = NUMBERED_SIZES[size];
        } else if (!isNaN(numSize)) {
          // Treat as whole inches or decimal inches
          size = numSize.toFixed(3);
          // Remove leading zero for sizes < 1 (0.250 -> .250)
          if (size.startsWith('0.')) {
            size = size.substring(1);
          }
        }
      }

      return `${size}-${threads}`;
    }

    // Return original value if we can't parse it
    return original;
  };

  const validateThreadSize = (value: string) => {
    const formattedValue = formatThreadSize(value);
    // Match database formats:
    // - Sizes < 1": .250-20 (no leading zero)
    // - Sizes >= 1": 1.125-12, 2.000-8 (with leading digit)
    // - Metric: M10x1.5
    const pattern = /^(\d+\.\d{3}|\.\d{3})-\d+$|^M\d+x[\d.]+$/;
    if (!pattern.test(formattedValue)) {
      setErrors(prev => ({
        ...prev,
        thread_size: 'Enter as size-threads (e.g., 1/4-20, 1-8, 1 1/8-12, 2-4)'
      }));
    } else {
      // Clear error if valid
      setErrors(prev => ({ ...prev, thread_size: '' }));
    }
  };

  const formatThreadClass = (value: string): string => {
    // Remove spaces and convert to uppercase
    value = value.trim().toUpperCase();

    // For standard threads: must be [1-3][AB]
    if (formData.thread_type === 'standard') {
      // If user just entered a number (1, 2, or 3), append 'A' as default
      if (/^[1-3]$/.test(value)) {
        return `${value}A`;
      }
      // If already in correct format, return as-is
      if (/^[1-3][AB]$/.test(value)) {
        return value;
      }
    }

    // For metric: must be [4-6][gGhHeEfF]
    if (formData.thread_type === 'metric') {
      if (/^[4-6]$/.test(value)) {
        return `${value}g`;
      }
      if (/^[4-6][gGhHeEfF]$/.test(value)) {
        return value;
      }
    }

    // For ACME: must be [2-5][GC]
    if (formData.thread_type === 'acme') {
      if (/^[2-5]$/.test(value)) {
        return `${value}G`;
      }
      if (/^[2-5][GC]$/.test(value)) {
        return value;
      }
    }

    // For NPT: L1, L2, L3
    if (formData.thread_type === 'npt') {
      if (/^[1-3]$/.test(value)) {
        return `L${value}`;
      }
      if (/^L[1-3]$/.test(value)) {
        return value;
      }
    }

    return value;
  };

  const _validateThreadClass = (value: string) => {
    const formattedValue = formatThreadClass(value);
    let isValid = false;
    let errorMessage = '';

    switch (formData.thread_type) {
      case 'standard':
        isValid = /^[1-3][AB]$/.test(formattedValue);
        errorMessage = 'Standard thread class must be 1A, 2A, 3A, 1B, 2B, or 3B';
        break;
      case 'metric':
        isValid = /^[4-6][gGhHeEfF]$/.test(formattedValue);
        errorMessage = 'Metric thread class must be 4g-6g, 4h-6h, 4e-6e, or 4f-6f';
        break;
      case 'acme':
        isValid = /^[2-5][GC]$/.test(formattedValue);
        errorMessage = 'ACME thread class must be 2G-5G or 2C-5C';
        break;
      case 'npt':
        isValid = /^L[1-3]$/.test(formattedValue) || value === '';
        errorMessage = 'NPT thread class must be L1, L2, or L3 (optional)';
        break;
      default:
        isValid = true; // No validation for other types
    }

    if (!isValid && value) {
      setErrors(prev => ({ ...prev, thread_class: errorMessage }));
    } else {
      setErrors(prev => ({ ...prev, thread_class: '' }));
    }
  };

  // Disable "Both" option for NPT thread types
  const createOptionsFiltered = formData.thread_type === 'npt'
    ? CREATE_OPTIONS.filter(opt => opt.value !== 'Both')
    : CREATE_OPTIONS;

  return (
    <div>
      <TooltipToggle />

      {/* Thread Specifications */}
      <FormSection title="Thread Specifications">
        <div>
          {/* Show thread type info (auto-set from category) */}
          {isThreadTypeMapped && (
            <div style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-gray-100)',
              borderRadius: 'var(--radius-default)',
              fontSize: 'var(--font-size-sm)'
            }}>
              <strong>Thread Type:</strong> {mappedThreadType} (auto-selected based on {categoryName} category)
            </div>
          )}

          {/* Thread Form - Show available forms based on thread type */}
          {availableThreadForms.length > 0 && (
            <FormSelect
              label="Thread Form"
              value={formData.thread_form || ''}
              onChange={(e) => handleFieldChange('thread_form', e.target.value)}
              required
              tooltip="Select the specific thread form or pattern (e.g., UN for Unified National threads)"
            >
              <option value="">Select thread form...</option>
              {availableThreadForms.map(form => {
                const formOption = THREAD_FORMS.find(f => f.value === form);
                return (
                  <option key={form} value={form}>
                    {formOption?.label || form}
                  </option>
                );
              })}
            </FormSelect>
          )}

          {/* Thread Size and Class - Two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormInput
              label="Thread Size"
              value={formData.thread_size || ''}
              onChange={(e) => handleFieldChange('thread_size', e.target.value)}
              onBlur={(e) => {
                const formatted = formatThreadSize(e.target.value);
                if (formatted !== e.target.value) {
                  handleFieldChange('thread_size', formatted);
                }
                validateThreadSize(formatted);
              }}
              error={errors.thread_size}
              placeholder="e.g., 1/4-20, 1-8, 1 1/8-12, 2-4"
              required
              tooltip="Enter thread diameter and threads per inch (e.g., 1/4-20 = 1/4 inch diameter with 20 threads per inch)"
            />

            <FormSelect
              label="Thread Class"
              value={
                formData.thread_type === 'standard' && formData.thread_class
                  ? formData.thread_class.replace(/[AB]/g, '') // Show just the grade number for standard threads
                  : formData.thread_class || ''
              }
              onChange={(e) => handleFieldChange('thread_class', e.target.value)}
              required
              tooltip="Thread tolerance class determines fit tightness (Class 1=loose, 2=normal, 3=close fit)"
            >
              <option value="">Select thread class...</option>
              {availableThreadClasses.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
          </div>

          {/* Show the actual value that will be stored for standard threads */}
          {formData.thread_type === 'standard' && formData.thread_class && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', marginTop: 'calc(var(--space-2) * -1)' }}>
              Will be stored as: <strong>{formData.thread_class}</strong> ({formData.gauge_type === 'plug' ? 'External' : 'Internal'})
            </div>
          )}
        </div>
      </FormSection>

      {/* Gauge Configuration */}
      <FormSection title="Gauge Configuration">
        <div>
          <FormSelect
            label="Gauge Type"
            value={formData.gauge_type || ''}
            onChange={(e) => handleFieldChange('gauge_type', e.target.value)}
            required
            tooltip="Plug gauges measure internal threads (holes), ring gauges measure external threads (bolts/studs)"
          >
            <option value="">Select gauge type...</option>
            {GAUGE_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </FormSelect>

          <FormSelect
            label="Create Option"
            value={formData.create_option || 'Both'}
            onChange={(e) => handleFieldChange('create_option', e.target.value)}
            required
            tooltip="GO gauge checks maximum material condition, NO GO checks minimum. Sets include both for complete validation."
          >
            {createOptionsFiltered.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormSelect>
        </div>
      </FormSection>

      {/* Identification */}
      <FormSection title="Identification">
        <div>
          {/* Serial Number Fields - Primary identifier for thread gauges */}
          {(formData.create_option === 'GO' || formData.create_option === 'Both') && (
            <FormInput
              label="GO Serial Number (S/N)"
              value={formData.go_serial_number || ''}
              onChange={(e) => handleFieldChange('go_serial_number', e.target.value.toUpperCase())}
              placeholder="Enter GO gauge serial number"
              required
              tooltip="Unique manufacturer serial number for the GO gauge (checks maximum material limit)"
            />
          )}

          {(formData.create_option === 'NO GO' || formData.create_option === 'Both') && (
            <FormInput
              label="NO GO Serial Number (S/N)"
              value={formData.nogo_serial_number || ''}
              onChange={(e) => handleFieldChange('nogo_serial_number', e.target.value.toUpperCase())}
              placeholder="Enter NO GO gauge serial number"
              required
              tooltip="Unique manufacturer serial number for the NO GO gauge (checks minimum material limit)"
            />
          )}
        </div>
      </FormSection>

      {/* Status & Location */}
      <FormSection title="Status & Location">
        <div>
          <FormCheckbox
            label="Sealed"
            checked={formData.is_sealed || false}
            onChange={(checked) => handleFieldChange('is_sealed', checked)}
            tooltip="Sealed gauges are restricted from checkout and require Admin/QC approval to unseal for use"
          />

          {/* Unsealed Date - only show if unsealed */}
          {!formData.is_sealed && (
            <FormInput
              type="date"
              label="Unsealed Date"
              value={formData.unsealed_date || ''}
              onChange={(e) => handleFieldChange('unsealed_date', e.target.value)}
              required
              tooltip="Date when this gauge was unsealed and made available for general use"
            />
          )}

          <StorageLocationSelect
            value={formData.storage_location || ''}
            onChange={(value) => handleFieldChange('storage_location', value)}
            required
            tooltip="Physical storage location where this gauge is kept when not in use"
          />
        </div>
      </FormSection>

      {/* Additional Information */}
      <FormSection title="Additional Information">
        <div>
          <FormInput
            label="Manufacturer"
            value={formData.manufacturer || ''}
            onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
            placeholder="e.g., Vermont Gage"
            tooltip="Name of the gauge manufacturer (e.g., Vermont Gage, Thread Check, Meyer Gage)"
          />

          <FormTextarea
            label="Notes"
            value={formData.notes || ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Additional information..."
            rows={3}
            tooltip="Any additional information about this gauge, special handling instructions, or relevant details"
          />
        </div>
      </FormSection>
    </div>
  );
};
