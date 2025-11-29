// For Claude: Example of using centralized Form components instead of raw HTML inputs
// Use FormInput, FormSelect instead of raw <input>, <select>
import React, { useEffect, useMemo } from 'react';
import { FormInput, FormSelect, Button, FormSection, StorageLocationSelect, useToast, TooltipToggle } from '../../../../../infrastructure/components';
import { useGaugeState, useGaugeActions } from '../../../../../infrastructure/store';
import { GaugeIdInput } from '../GaugeIdInput';
import {
  OWNERSHIP_TYPES,
  COMMON_MEASUREMENT_UNITS,
  HAND_TOOL_FORMATS,
  RESOLUTION_VALUES_IMPERIAL,
  RESOLUTION_VALUES_METRIC,
  ACCURACY_VALUES_IMPERIAL,
  ACCURACY_VALUES_METRIC
} from '../../../constants/formConstants';

export const HandToolForm: React.FC = () => {
  const toast = useToast();
  const { createGauge } = useGaugeState();
  const { updateGaugeFormData } = useGaugeActions();
  const { formData, categoryId } = createGauge;

  // Set default measurement unit to inches on mount if not already set
  useEffect(() => {
    if (!formData.measurement_unit) {
      updateGaugeFormData({ measurement_unit: 'inch' });
    }
  }, [formData.measurement_unit, updateGaugeFormData]);

  // Filter resolution and accuracy values based on measurement unit
  const resolutionValues = useMemo(() => {
    return formData.measurement_unit === 'mm' ? RESOLUTION_VALUES_METRIC : RESOLUTION_VALUES_IMPERIAL;
  }, [formData.measurement_unit]);

  const accuracyValues = useMemo(() => {
    return formData.measurement_unit === 'mm' ? ACCURACY_VALUES_METRIC : ACCURACY_VALUES_IMPERIAL;
  }, [formData.measurement_unit]);

  const handleFieldChange = (field: string, value: any) => {
    updateGaugeFormData({ [field]: value });
  };

  const handleNumberChange = (field: string, value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    updateGaugeFormData({ [field]: numValue });
  };

  // Generate name based on Range + Format
  // Format: "0-6" Digital"
  const generateName = () => {
    const { measurement_range_min, measurement_range_max, measurement_unit, tool_format } = formData;

    // Check which fields are missing
    const missingFields = [];
    if (!tool_format) missingFields.push('Format');
    if (measurement_range_min === undefined || measurement_range_min === null || measurement_range_min === '') missingFields.push('Range Min');
    if (measurement_range_max === undefined || measurement_range_max === null || measurement_range_max === '') missingFields.push('Range Max');
    if (!measurement_unit) missingFields.push('Measurement Unit');

    if (missingFields.length > 0) {
      toast.error('Missing Required Fields', `Please fill in the following fields first: ${missingFields.join(', ')}`);
      return;
    }

    // Determine unit symbol for display
    let unitSymbol = '';
    if (measurement_unit === 'inch') unitSymbol = '"';
    else if (measurement_unit === 'mm') unitSymbol = 'mm';
    else if (measurement_unit === 'cm') unitSymbol = 'cm';
    else if (measurement_unit === 'ft') unitSymbol = 'ft';
    else if (measurement_unit === 'deg') unitSymbol = '°';
    else if (measurement_unit === 'psi') unitSymbol = ' PSI';
    else if (measurement_unit === 'bar') unitSymbol = ' bar';

    const autoName = `${measurement_range_min}-${measurement_range_max}${unitSymbol} ${tool_format}`;
    updateGaugeFormData({ name: autoName });
  };

  return (
    <div>
      <TooltipToggle />

      <FormSection title="Basic Information">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormSelect
            label="Format"
            value={formData.tool_format || ''}
            onChange={(e) => handleFieldChange('tool_format', e.target.value)}
            required
            tooltip="Select the display format type (Digital, Analog, Dial, Vernier, etc.)"
          >
            <option value="">Select format...</option>
            {HAND_TOOL_FORMATS.map(format => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            label="Ownership Type"
            value={formData.ownership_type || 'company'}
            onChange={(e) => handleFieldChange('ownership_type', e.target.value)}
            required
            tooltip="Specify whether this tool is company-owned, employee-owned, or customer-owned"
          >
            {OWNERSHIP_TYPES.map(type => (
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
            tooltip="Unique identifier for this hand tool in the system"
          />
        </div>
      </FormSection>

      <FormSection title="Specifications">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            type="number"
            label="Range Min"
            value={formData.measurement_range_min === undefined || formData.measurement_range_min === null ? '' : formData.measurement_range_min}
            onChange={(e) => handleNumberChange('measurement_range_min', e.target.value)}
            step="0.001"
            placeholder=""
            tooltip="Minimum measurement value this tool can measure (e.g., 0 for 0-6 inch caliper)"
          />
          <FormInput
            type="number"
            label="Range Max"
            value={formData.measurement_range_max === undefined || formData.measurement_range_max === null ? '' : formData.measurement_range_max}
            onChange={(e) => handleNumberChange('measurement_range_max', e.target.value)}
            step="0.001"
            placeholder=""
            tooltip="Maximum measurement value this tool can measure (e.g., 6 for 0-6 inch caliper)"
          />
          <FormSelect
            label="Measurement Unit"
            value={formData.measurement_unit || 'inch'}
            onChange={(e) => handleFieldChange('measurement_unit', e.target.value)}
            required
            tooltip="Unit of measurement for this tool (inches, millimeters, degrees, PSI, etc.)"
          >
            {COMMON_MEASUREMENT_UNITS.map(unit => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            label="Resolution"
            value={formData.resolution_value || ''}
            onChange={(e) => handleNumberChange('resolution_value', e.target.value)}
            tooltip="Smallest increment this tool can display or measure (e.g., 0.0001 inch for digital caliper)"
          >
            <option value="">Select resolution...</option>
            {resolutionValues.map(resolution => (
              <option key={resolution.value} value={resolution.value}>
                {resolution.label}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            label="Accuracy"
            value={formData.accuracy_value || ''}
            onChange={(e) => handleFieldChange('accuracy_value', e.target.value)}
            tooltip="Maximum measurement error or tolerance of this tool (e.g., ±0.001 inch)"
          >
            <option value="">Select accuracy...</option>
            {accuracyValues.map(accuracy => (
              <option key={accuracy.value} value={accuracy.value}>
                {accuracy.label}
              </option>
            ))}
          </FormSelect>
        </div>
      </FormSection>

      <FormSection title="Tracking Information">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            label="Serial Number (S/N)"
            value={formData.serial_number || ''}
            onChange={(e) => handleFieldChange('serial_number', e.target.value.toUpperCase())}
            placeholder="Enter serial number"
            required
            tooltip="Unique manufacturer serial number for tracking and identification"
          />
          <StorageLocationSelect
            value={formData.storage_location || ''}
            onChange={(value) => handleFieldChange('storage_location', value)}
            required
            tooltip="Physical storage location where this tool is kept when not in use"
          />
          <FormInput
            type="number"
            label="Calibration Frequency (days)"
            value={formData.calibration_frequency_days || ''}
            onChange={(e) => handleNumberChange('calibration_frequency_days', e.target.value)}
            placeholder="365"
            min="1"
            tooltip="How often this tool must be calibrated (in days, e.g., 365 days = 1 year)"
          />
        </div>
      </FormSection>

      <FormSection title="Manufacturer Details">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
          <FormInput
            label="Manufacturer"
            value={formData.manufacturer || ''}
            onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
            placeholder="e.g., Mitutoyo, Starrett"
            tooltip="Name of the company that manufactured this tool"
          />
          <FormInput
            label="Model Number"
            value={formData.model_number || ''}
            onChange={(e) => handleFieldChange('model_number', e.target.value)}
            placeholder="e.g., CD-12"
            tooltip="Manufacturer's model or part number for this specific tool model"
          />
        </div>
      </FormSection>

      <FormSection title="Gauge Name">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 'var(--space-4)', alignItems: 'center' }}>
          <FormInput
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Click 'Generate Name' or enter custom name"
            required
            style={{ marginBottom: 0 }}
            tooltip='Display name for this tool (auto-generated or custom, e.g., "0-6 inch Digital Caliper")'
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
    </div>
  );
};