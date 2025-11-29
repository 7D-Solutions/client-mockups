import React from 'react';
import { FormInput, FormSelect, FormTextarea, StorageLocationSelect, FormSection, TooltipToggle } from '../../../../../infrastructure/components';
import { useGaugeState, useGaugeActions } from '../../../../../infrastructure/store';
import { GaugeIdInput } from '../GaugeIdInput';
import { LARGE_EQUIPMENT_OWNERSHIP_TYPES, MEASUREMENT_UNITS } from '../../../constants/formConstants';

export const LargeEquipmentForm: React.FC = () => {
  const { createGauge } = useGaugeState();
  const { updateGaugeFormData } = useGaugeActions();
  const { formData, categoryId } = createGauge;

  const handleFieldChange = (field: string, value: any) => {
    updateGaugeFormData({ [field]: value });
  };

  const handleNumberChange = (field: string, value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    updateGaugeFormData({ [field]: numValue });
  };

  return (
    <div>
      <TooltipToggle />

      {/* Basic Information */}
      <FormSection title="Basic Information">
        <div>
          <FormInput
            label="Equipment Name"
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="e.g., CMM Machine, Height Gauge Station"
            required
            tooltip="Enter the name or description of this large equipment or measurement station"
          />

          <FormSelect
            label="Ownership Type"
            value={formData.ownership_type || 'company'}
            onChange={(e) => handleFieldChange('ownership_type', e.target.value)}
            required
            tooltip="Specify whether this equipment is company-owned or leased from another party"
          >
            {LARGE_EQUIPMENT_OWNERSHIP_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </FormSelect>

          <GaugeIdInput
            categoryId={categoryId}
            gaugeType={null}
            isGoGauge={null}
            value={formData.gauge_id || ''}
            onChange={(value) => handleFieldChange('gauge_id', value)}
            required
            tooltip="Unique identifier for this large equipment in the system"
          />
        </div>
      </FormSection>

      {/* Specifications */}
      <FormSection title="Specifications">
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormInput
              type="number"
              label="Range Min"
              value={formData.measurement_range_min || ''}
              onChange={(e) => handleNumberChange('measurement_range_min', e.target.value)}
              step="0.001"
              placeholder="0"
              tooltip="Minimum measurement value this equipment can measure"
            />
            <FormInput
              type="number"
              label="Range Max"
              value={formData.measurement_range_max || ''}
              onChange={(e) => handleNumberChange('measurement_range_max', e.target.value)}
              step="0.001"
              placeholder="1000"
              tooltip="Maximum measurement value this equipment can measure"
            />
          </div>

          <FormSelect
            label="Measurement Unit"
            value={formData.measurement_unit || ''}
            onChange={(e) => handleFieldChange('measurement_unit', e.target.value)}
            required
            tooltip="Unit of measurement for this equipment (inches, millimeters, etc.)"
          >
            <option value="">Select unit...</option>
            {MEASUREMENT_UNITS.map(unit => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </FormSelect>

          <FormInput
            type="number"
            label="Resolution"
            value={formData.resolution_value || ''}
            onChange={(e) => handleNumberChange('resolution_value', e.target.value)}
            step="0.0001"
            placeholder="e.g., 0.0001"
            tooltip="Smallest increment this equipment can display or measure (e.g., 0.0001 inch)"
          />

          <FormInput
            label="Accuracy"
            value={formData.accuracy_value || ''}
            onChange={(e) => handleFieldChange('accuracy_value', e.target.value)}
            placeholder="e.g., ±0.0005 inch"
            tooltip="Maximum measurement error or tolerance of this equipment (e.g., ±0.0005 inch)"
          />
        </div>
      </FormSection>

      {/* Tracking Information */}
      <FormSection title="Tracking Information">
        <div>
          <FormInput
            label="Serial Number (S/N)"
            value={formData.serial_number || ''}
            onChange={(e) => handleFieldChange('serial_number', e.target.value.toUpperCase())}
            placeholder="Enter equipment serial number"
            required
            tooltip="Unique manufacturer serial number for tracking and identification of this equipment"
          />

          <StorageLocationSelect
            value={formData.storage_location || ''}
            onChange={(value) => handleFieldChange('storage_location', value)}
            required
            tooltip="Physical location where this equipment is installed or stored"
          />
        </div>
      </FormSection>

      {/* Manufacturer Details */}
      <FormSection title="Manufacturer Details">
        <div>
          <FormInput
            label="Manufacturer"
            value={formData.manufacturer || ''}
            onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
            placeholder="e.g., Zeiss, Brown & Sharpe"
            required
            tooltip="Name of the company that manufactured this equipment"
          />

          <FormInput
            label="Model Number"
            value={formData.model_number || ''}
            onChange={(e) => handleFieldChange('model_number', e.target.value)}
            placeholder="e.g., CONTURA G2"
            required
            tooltip="Manufacturer's model or part number for this specific equipment model"
          />
        </div>
      </FormSection>

      {/* Maintenance */}
      <FormSection title="Maintenance">
        <div>
          <FormInput
            type="number"
            label="Calibration Frequency (days)"
            value={formData.calibration_frequency_days || ''}
            onChange={(e) => handleNumberChange('calibration_frequency_days', e.target.value)}
            placeholder="365"
            min="1"
            required
            tooltip="How often this equipment must be calibrated (in days, e.g., 365 days = 1 year)"
          />

          <FormTextarea
            label="Maintenance Schedule"
            value={formData.notes || ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="e.g., Annual service by manufacturer, Monthly cleaning checklist..."
            rows={4}
            tooltip="Regular maintenance schedule and procedures for keeping this equipment in optimal condition"
          />
        </div>
      </FormSection>
    </div>
  );
};
