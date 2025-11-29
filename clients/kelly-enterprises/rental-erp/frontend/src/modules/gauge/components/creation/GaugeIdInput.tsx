/**
 * Reusable Gauge ID Input Component
 *
 * Features:
 * - Fetches suggested gauge ID from backend
 * - Real-time validation as user types
 * - Visual feedback for availability
 * - Format validation (A-Z, 0-9, hyphen only, 2-20 chars)
 * - Customizable by user
 */
import React, { useEffect, useState, useCallback } from 'react';
import { FormInput, useToast } from '../../../../infrastructure/components';

interface GaugeIdInputProps {
  categoryId: number | null;
  gaugeType?: string | null;
  isGoGauge?: boolean | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

interface ValidationState {
  valid: boolean;
  available: boolean;
  message: string;
  suggestedId?: string;
}

export const GaugeIdInput: React.FC<GaugeIdInputProps> = ({
  categoryId,
  gaugeType = null,
  isGoGauge = null,
  value,
  onChange,
  disabled = false,
  required = true
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [_suggestedId, _setSuggestedId] = useState<string>('');
  const [validation, setValidation] = useState<ValidationState | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [tempValue, setTempValue] = useState<string>(''); // Temporary value while editing
  const [isCustomizing, setIsCustomizing] = useState(false); // Show confirm/cancel buttons

  // Fetch suggested gauge ID when category changes
  useEffect(() => {
    const fetchSuggestedId = async () => {
      // Only fetch if categoryId is valid (positive integer)
      if (!categoryId || categoryId <= 0) {
        return;
      }

      setIsLoading(true);
      try {
        // Build request payload - only include optional fields if they have values
        // IMPORTANT: Convert categoryId to integer - backend expects INTEGER not string
        const payload: any = {
          category_id: parseInt(categoryId as string, 10)
        };

        if (gaugeType) {
          payload.gauge_type = gaugeType;
        }

        if (isGoGauge !== null && isGoGauge !== undefined) {
          payload.is_go_gauge = isGoGauge;
        }

        const response = await fetch('/api/gauges/v2/suggest-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch suggested ID');
        }

        if (data?.success && data?.data?.suggestedId) {
          const suggested = data.data.suggestedId;
          setSuggestedId(suggested);

          // Auto-populate suggested ID for user review (only if field is empty and user hasn't edited)
          if (!hasUserEdited && !value) {
            onChange(suggested);
            // Validate the suggested ID immediately
            validateGaugeId(suggested);
          }
        }
      } catch (error) {
        console.error('GaugeIdInput: Failed to fetch suggested gauge ID:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestedId();
  }, [categoryId, gaugeType, isGoGauge, hasUserEdited, value, onChange, validateGaugeId]);

  // Validate gauge ID with debouncing
  const validateGaugeId = useCallback(async (gaugeId: string) => {
    if (!gaugeId || !categoryId) {
      setValidation(null);
      return;
    }

    try {
      const response = await fetch('/api/gauges/v2/validate-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          gauge_id: gaugeId,
          category_id: parseInt(categoryId as string, 10),
          gauge_type: gaugeType,
          is_go_gauge: isGoGauge
        })
      });

      const data = await response.json();

      if (data?.success && data?.data) {
        setValidation(data.data);
      }
    } catch (error) {
      console.error('Failed to validate gauge ID:', error);
      setValidation({
        valid: false,
        available: false,
        message: 'Validation failed'
      });
    }
  }, [categoryId, gaugeType, isGoGauge]);

  // Handle input change - enter customization mode
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase().trim();

    // If value is different from current value, enter customization mode
    if (newValue !== value) {
      setTempValue(newValue);
      setIsCustomizing(true);
      setHasUserEdited(true);

      // Clear existing timeout
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      // Set new timeout for validation
      const timeout = setTimeout(() => {
        validateGaugeId(newValue);
      }, 500); // 500ms debounce

      setDebounceTimeout(timeout);
    }
  };

  // Confirm custom ID
  const confirmCustomId = () => {
    if (validation && validation.valid && validation.available) {
      onChange(tempValue);
      setIsCustomizing(false);
      setValidation(null);
    } else {
      // Show error if ID is not valid
      toast.error('Invalid Gauge ID', 'Please enter a valid and available Gauge ID');
    }
  };

  // Cancel customization and revert to suggested ID
  const cancelCustomId = () => {
    setTempValue('');
    setIsCustomizing(false);
    setValidation(null);
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  // Determine input state styling
  const getInputStyle = () => {
    if (!value || !validation) return {};

    // Only show error styling, no success styling
    if (!validation.valid || !validation.available) {
      return {
        borderColor: 'var(--color-error)',
        backgroundColor: 'var(--color-error-light, #fef2f2)'
      };
    }
    return {};
  };

  // Get validation message with appropriate styling
  // Only show success message while customizing, always show errors
  const getValidationMessage = () => {
    if (!validation) return null;

    if (validation.valid && validation.available) {
      // Only show success message while user is actively customizing
      if (!isCustomizing) return null;

      return (
        <div style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-success)',
          marginTop: '0.25rem'
        }}>
          ✓ {validation.message}
        </div>
      );
    } else {
      return (
        <div style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-error)',
          marginTop: '0.25rem'
        }}>
          ✗ {validation.message}
          {validation.suggestedId && (
            <span> - Try: <strong>{validation.suggestedId}</strong></span>
          )}
        </div>
      );
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <FormInput
        label="Gauge ID"
        value={isCustomizing ? tempValue : value}
        onChange={handleChange}
        disabled={disabled || isLoading}
        required={required}
        placeholder={isLoading ? 'Loading...' : 'Auto-generated ID (customizable)'}
        style={getInputStyle()}
      />

      {/* Validation Message */}
      {getValidationMessage()}

      {/* Confirm/Cancel Buttons - show when customizing */}
      {isCustomizing && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={confirmCustomId}
            disabled={!validation || !validation.valid || !validation.available}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-success)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: validation?.valid && validation?.available ? 'pointer' : 'not-allowed',
              opacity: validation?.valid && validation?.available ? 1 : 0.5
            }}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={cancelCustomId}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-gray-500)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      )}

    </div>
  );
};
