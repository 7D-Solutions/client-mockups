/**
 * FORM TEMPLATE
 *
 * This template provides a standardized pattern for entity forms in the Fire-Proof ERP system.
 *
 * PATTERN OVERVIEW:
 * - Centralized infrastructure form components (FormInput, FormSelect, FormSection, Button)
 * - Field rendering based on configuration
 * - Validation and error handling
 * - Auto-generation helpers (names, IDs, etc.)
 *
 * CUSTOMIZATION POINTS:
 * 1. Replace {{ENTITY_NAME}} with singular entity name (e.g., "Gauge", "User", "Order")
 * 2. Replace {{FIELDS}} with actual form fields
 * 3. Configure FormSections based on logical groupings
 * 4. Add validation rules
 * 5. Implement auto-generation logic if needed
 *
 * INFRASTRUCTURE COMPONENTS USED:
 * - FormInput: Text, number, date inputs with consistent styling
 * - FormSelect: Dropdown selects
 * - FormSection: Grouped form sections with headers
 * - Button: Form action buttons
 * - StorageLocationSelect: Location picker (if applicable)
 * - useToast: Form feedback notifications
 *
 * IMPORTANT RULES:
 * - NEVER use raw <input>, <select>, <textarea> elements
 * - ALWAYS use infrastructure form components
 * - ALWAYS use FormSection for grouping fields
 * - Field validation should provide clear error messages
 *
 * @see HandToolForm.tsx - Reference implementation
 */

import React, { useEffect, useMemo } from 'react';
import { FormInput, FormSelect, Button, FormSection, useToast } from '../../../../../infrastructure/components';
import type { {{ENTITY_NAME}} } from '../../../types';

// CUSTOMIZATION POINT: Define props interface
interface {{ENTITY_NAME}}FormProps {
  initialData?: Partial<{{ENTITY_NAME}}>;
  onSubmit: (data: Partial<{{ENTITY_NAME}}>) => void | Promise<void>;
  onCancel?: () => void;
  isEdit?: boolean;
}

// CUSTOMIZATION POINT: Define form constants
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

export const {{ENTITY_NAME}}Form: React.FC<{{ENTITY_NAME}}FormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isEdit = false
}) => {
  const toast = useToast();
  const [formData, setFormData] = React.useState<Partial<{{ENTITY_NAME}}>>(initialData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // ===== FORM STATE MANAGEMENT =====

  // Set default values on mount
  useEffect(() => {
    if (!formData.status) {
      setFormData(prev => ({ ...prev, status: 'active' }));
    }
    // CUSTOMIZATION POINT: Set other default values
  }, []);

  // ===== FIELD CHANGE HANDLERS =====

  const handleFieldChange = (field: keyof {{ENTITY_NAME}}, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNumberChange = (field: keyof {{ENTITY_NAME}}, value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    handleFieldChange(field, numValue);
  };

  // ===== VALIDATION =====

  // CUSTOMIZATION POINT: Implement validation rules
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Example validation
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Name is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    // CUSTOMIZATION POINT: Add more validation rules

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== FORM SUBMISSION =====

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Validation Failed', 'Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success('Success', `{{ENTITY_NAME}} ${isEdit ? 'updated' : 'created'} successfully`);
    } catch (error: any) {
      toast.error('Submission Failed', error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== AUTO-GENERATION HELPERS =====

  // CUSTOMIZATION POINT: Implement auto-generation logic if needed
  const generateName = () => {
    // Check which fields are missing
    const missingFields = [];
    if (!formData.field1) missingFields.push('Field 1');
    if (!formData.field2) missingFields.push('Field 2');

    if (missingFields.length > 0) {
      toast.error('Missing Required Fields', `Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    // Generate name based on fields
    const autoName = `${formData.field1} ${formData.field2}`;
    handleFieldChange('name', autoName);
  };

  // ===== RENDER =====

  return (
    <form onSubmit={handleSubmit}>
      {/* CUSTOMIZATION POINT: Basic Information Section */}
      <FormSection title="Basic Information">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            label="Name"
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Enter name"
            required
            error={errors.name}
          />
          <FormSelect
            label="Status"
            value={formData.status || ''}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            required
            error={errors.status}
          >
            <option value="">Select status...</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormSelect>
          {/* CUSTOMIZATION POINT: Add more fields */}
        </div>
      </FormSection>

      {/* CUSTOMIZATION POINT: Additional Sections */}
      <FormSection title="Details">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            label="Description"
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Enter description"
          />
          {/* CUSTOMIZATION POINT: Add specification fields */}
        </div>
      </FormSection>

      {/* CUSTOMIZATION POINT: Numeric Fields Section */}
      <FormSection title="Measurements">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            type="number"
            label="Value Min"
            value={formData.value_min === undefined || formData.value_min === null ? '' : formData.value_min}
            onChange={(e) => handleNumberChange('value_min', e.target.value)}
            step="0.001"
            placeholder=""
          />
          <FormInput
            type="number"
            label="Value Max"
            value={formData.value_max === undefined || formData.value_max === null ? '' : formData.value_max}
            onChange={(e) => handleNumberChange('value_max', e.target.value)}
            step="0.001"
            placeholder=""
          />
          <FormSelect
            label="Unit"
            value={formData.unit || ''}
            onChange={(e) => handleFieldChange('unit', e.target.value)}
            required
          >
            <option value="">Select unit...</option>
            <option value="mm">Millimeters (mm)</option>
            <option value="inch">Inches (")</option>
            <option value="cm">Centimeters (cm)</option>
          </FormSelect>
        </div>
      </FormSection>

      {/* CUSTOMIZATION POINT: Auto-Generation Section */}
      <FormSection title="Generated Name">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 'var(--space-4)', alignItems: 'center' }}>
          <FormInput
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Click 'Generate Name' or enter custom name"
            required
            error={errors.name}
            style={{ marginBottom: 0 }}
          />
          <Button
            type="button"
            onClick={generateName}
            variant="primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Generate Name
          </Button>
        </div>
      </FormSection>

      {/* Form Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 'var(--space-3)',
        marginTop: 'var(--space-4)',
        paddingTop: 'var(--space-4)',
        borderTop: '1px solid var(--color-border)'
      }}>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
        >
          {isEdit ? 'Update' : 'Create'} {{ENTITY_NAME}}
        </Button>
      </div>
    </form>
  );
};
