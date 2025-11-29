import { useState, useEffect } from 'react';
import { FormSelect } from './FormSelect';
import { FormInput } from './FormInput';

interface CalibrationFrequencySelectProps {
  value: string | number;
  onChange: (value: string) => void;
  categoryDefault?: number; // Default from gauge_categories.default_calibration_days
  label?: string;
  required?: boolean;
  disabled?: boolean;
  tooltip?: string;
}

// Common calibration frequency presets (in days)
const COMMON_PRESETS = [
  { value: '30', label: '30 days (Monthly)' },
  { value: '90', label: '90 days (Quarterly)' },
  { value: '180', label: '180 days (Semi-Annual)' },
  { value: '365', label: '365 days (Annual)' }
];

const CUSTOM_VALUE = 'custom';

export const CalibrationFrequencySelect = ({
  value,
  onChange,
  categoryDefault,
  label = 'Frequency (days)',
  required = false,
  disabled = false,
  tooltip
}: CalibrationFrequencySelectProps) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customValue, setCustomValue] = useState<string>('');

  // Initialize selected option and custom value based on current value
  useEffect(() => {
    const valueStr = value?.toString() || '';

    if (!valueStr) {
      setSelectedOption('');
      setCustomValue('');
      return;
    }

    // Check if value matches category default or common presets
    const matchesDefault = categoryDefault && valueStr === categoryDefault.toString();
    const matchesPreset = COMMON_PRESETS.some(preset => preset.value === valueStr);

    if (matchesDefault || matchesPreset) {
      setSelectedOption(valueStr);
      setCustomValue('');
    } else {
      // Custom value
      setSelectedOption(CUSTOM_VALUE);
      setCustomValue(valueStr);
    }
  }, [value, categoryDefault]);

  // Build options list with category default (if provided) + common presets + custom
  const options = [];

  // Add category default as first option (if provided and not in presets)
  if (categoryDefault && !COMMON_PRESETS.some(p => p.value === categoryDefault.toString())) {
    options.push({
      value: categoryDefault.toString(),
      label: `${categoryDefault} days (Category Default) ⭐`
    });
  }

  // Add common presets, highlighting category default if it matches
  COMMON_PRESETS.forEach(preset => {
    const isDefault = categoryDefault && preset.value === categoryDefault.toString();
    options.push({
      value: preset.value,
      label: isDefault ? `${preset.label} (Category Default) ⭐` : preset.label
    });
  });

  // Add custom option
  options.push({
    value: CUSTOM_VALUE,
    label: 'Custom...'
  });

  const handleSelectChange = (newValue: string) => {
    setSelectedOption(newValue);

    if (newValue === CUSTOM_VALUE) {
      // Switching to custom - keep existing custom value or clear
      if (customValue) {
        onChange(customValue);
      } else {
        onChange('');
      }
    } else {
      // Selected a preset or default
      setCustomValue('');
      onChange(newValue);
    }
  };

  const handleCustomValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomValue(newValue);
    onChange(newValue);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <FormSelect
        label={label}
        value={selectedOption}
        onChange={handleSelectChange}
        required={required}
        disabled={disabled}
        tooltip={tooltip || 'Number of days between required calibrations'}
      >
        <option value="">Select frequency...</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FormSelect>

      {selectedOption === CUSTOM_VALUE && (
        <FormInput
          label="Custom Frequency"
          type="number"
          min="1"
          value={customValue}
          onChange={handleCustomValueChange}
          placeholder="Enter days (e.g., 120)"
          required={required}
          disabled={disabled}
          tooltip="Enter custom number of days between calibrations"
        />
      )}
    </div>
  );
};
