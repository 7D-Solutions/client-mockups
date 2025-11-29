import React from 'react';
import { FormInput, FormTextarea, StorageLocationSelect, FormSection, TooltipToggle } from '../../../../../infrastructure/components';
import { useGaugeState, useGaugeActions } from '../../../../../infrastructure/store';
import { GaugeIdInput } from '../GaugeIdInput';

export const CalibrationStandardForm: React.FC = () => {
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            label="Standard Name"
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="e.g., Grade 1 Gage Block Set, Master Ring Gauge"
            required
            tooltip="Enter the descriptive name of this calibration standard"
          />

          <FormInput
            label="Certification Number"
            value={formData.certification_number || ''}
            onChange={(e) => handleFieldChange('certification_number', e.target.value)}
            placeholder="e.g., NIST-123456"
            required
            tooltip="Official certification number from the certifying authority (e.g., NIST-123456)"
          />

          <GaugeIdInput
            categoryId={categoryId}
            gaugeType={null}
            isGoGauge={null}
            value={formData.gauge_id || ''}
            onChange={(value) => handleFieldChange('gauge_id', value)}
            required
            tooltip="Unique identifier for this calibration standard in the system"
          />
        </div>
      </FormSection>

      {/* Specifications */}
      <FormSection title="Specifications">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            label="Nominal Value/Size"
            value={formData.nominal_value || ''}
            onChange={(e) => handleFieldChange('nominal_value', e.target.value)}
            placeholder="e.g., 1.0000 inch, 25.000 mm"
            required
            tooltip="Target measurement value or size that this standard represents"
          />

          <FormInput
            label="Actual Certified Value"
            value={formData.actual_value || ''}
            onChange={(e) => handleFieldChange('actual_value', e.target.value)}
            placeholder="e.g., 1.00002 inch"
            tooltip="Actual measured value as certified by the calibration authority"
          />

          <FormInput
            label="Uncertainty"
            value={formData.accuracy_value || ''}
            onChange={(e) => handleFieldChange('accuracy_value', e.target.value)}
            placeholder="e.g., ±0.000002 inch"
            required
            tooltip="Measurement uncertainty or tolerance of the certified value"
          />

          <div style={{ gridColumn: 'span 3' }}>
            <FormTextarea
              label="Traceability Information"
              value={formData.traceability_info || ''}
              onChange={(e) => handleFieldChange('traceability_info', e.target.value)}
              placeholder="e.g., Traceable to NIST through certificate #ABC123..."
              rows={3}
              required
              tooltip="Chain of custody and certification path back to national/international standards"
            />
          </div>
        </div>
      </FormSection>

      {/* Tracking Information */}
      <FormSection title="Tracking Information">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            label="Serial Number (S/N)"
            value={formData.serial_number || ''}
            onChange={(e) => handleFieldChange('serial_number', e.target.value.toUpperCase())}
            placeholder="Enter standard serial number"
            required
            tooltip="Unique manufacturer serial number for tracking and identification"
          />

          <StorageLocationSelect
            value={formData.storage_location || ''}
            onChange={(value) => handleFieldChange('storage_location', value)}
            required
            tooltip="Physical storage location where this standard is kept when not in use"
          />
        </div>
      </FormSection>

      {/* Calibration & Environment */}
      <FormSection title="Calibration & Environment">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            type="number"
            label="Recertification Frequency (days)"
            value={formData.calibration_frequency_days || ''}
            onChange={(e) => handleNumberChange('calibration_frequency_days', e.target.value)}
            placeholder="730"
            min="1"
            required
            tooltip="How often this standard must be recertified (in days, e.g., 730 days = 2 years)"
          />

          <FormInput
            label="Temperature Requirements"
            value={formData.temperature_requirements || ''}
            onChange={(e) => handleFieldChange('temperature_requirements', e.target.value)}
            placeholder="e.g., 20°C ± 0.5°C"
            tooltip="Required environmental temperature conditions for accurate measurement and use"
          />
        </div>
      </FormSection>

      {/* Manufacturer & Handling */}
      <FormSection title="Manufacturer & Handling">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            label="Manufacturer"
            value={formData.manufacturer || ''}
            onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
            placeholder="e.g., Mitutoyo, Starrett, Webber"
            required
            tooltip="Name of the company that manufactured this calibration standard"
          />

          <div style={{ gridColumn: 'span 3' }}>
            <FormTextarea
              label="Special Handling Instructions"
              value={formData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="e.g., Handle with lint-free gloves only, store in temperature-controlled environment..."
              rows={3}
              tooltip="Any special care, handling, or environmental requirements for this calibration standard"
            />
          </div>
        </div>
      </FormSection>
    </div>
  );
};
