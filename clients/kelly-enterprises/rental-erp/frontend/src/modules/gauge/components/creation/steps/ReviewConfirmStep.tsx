import React, { useState, useEffect } from 'react';
import { Badge, Icon, Button, FormInput } from '../../../../../infrastructure/components';
import { EquipmentRules } from '../../../../../infrastructure/business/equipmentRules';
import { TextFormatRules } from '../../../../../infrastructure/business/textFormatRules';
import { useGaugeState, useGaugeActions } from '../../../../../infrastructure/store';
import type { EquipmentType } from '../../../types';

export const ReviewConfirmStep: React.FC = () => {
  const { createGauge } = useGaugeState();
  const { equipmentType, categoryName, formData } = createGauge;
  const { updateGaugeFormData } = useGaugeActions();

  const [isEditingSetId, setIsEditingSetId] = useState(false);
  const [customSetId, setCustomSetId] = useState('');
  const [nextSetId, setNextSetId] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Fetch next available set ID when component mounts (for gauge sets only)
  useEffect(() => {
    if (equipmentType === 'thread_gauge' && formData.create_option === 'Both') {
      const fetchNextSetId = async () => {
        try {
          const response = await fetch(`/api/gauges/v2/next-set-id?category_id=${createGauge.categoryId || 31}&gauge_type=${formData.gauge_type || 'plug'}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setNextSetId(data.data.next_set_id);
          } else {
            // Fallback to placeholder if API call fails
            setNextSetId('SP0009');
          }
        } catch {
          // Fallback to placeholder if API call fails
          setNextSetId('SP0009');
        }
      };

      fetchNextSetId();
    }
  }, [equipmentType, formData.create_option, createGauge.categoryId, formData.gauge_type]);

  // Validate set ID in real-time with debouncing
  useEffect(() => {
    if (!customSetId || customSetId === nextSetId) {
      setValidationError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      try {
        // Use dedicated validation endpoint
        const response = await fetch(`/api/gauges/v2/validate-set-id/${encodeURIComponent(customSetId)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && !data.data.is_available) {
            setValidationError(`Set ID "${customSetId}" already exists (${data.data.existing_count} gauge${data.data.existing_count > 1 ? 's' : ''})`);
          } else {
            setValidationError('');
          }
        }
      } catch {
        // Validation error will be handled by the UI
      } finally {
        setIsValidating(false);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [customSetId, nextSetId]);

  const handleEditSetId = () => {
    setCustomSetId(nextSetId);
    setValidationError('');
    setIsEditingSetId(true);
  };

  const handleSaveSetId = () => {
    if (customSetId.trim() && !validationError) {
      updateGaugeFormData({ custom_set_id: customSetId.trim() });
      setNextSetId(customSetId.trim());
      setIsEditingSetId(false);
    }
  };

  const handleCancelEdit = () => {
    setCustomSetId('');
    setValidationError('');
    setIsEditingSetId(false);
  };

  const formatEquipmentType = (type: string) => {
    return TextFormatRules.formatToTitleCase(EquipmentRules.getDisplayName({ equipment_type: type }));
  };

  const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <>
      <span style={{
        fontWeight: '600',
        color: 'var(--color-gray-600)',
        fontSize: 'var(--font-size-sm)'
      }}>
        {label}:
      </span>
      <span style={{
        color: 'var(--color-gray-900)',
        fontSize: 'var(--font-size-sm)'
      }}>
        {value}
      </span>
    </>
  );

  const renderCommonDetails = () => (
    <>
      <DetailItem label="Equipment Type" value={formatEquipmentType(equipmentType)} />
      <DetailItem label="Category" value={categoryName || 'Not selected'} />
      <DetailItem label="Location" value={formData.storage_location || 'Not specified'} />
      {formData.manufacturer && (
        <DetailItem label="Manufacturer" value={formData.manufacturer} />
      )}
      {formData.serial_number && (
        <DetailItem label="Serial Number" value={formData.serial_number} />
      )}
      {formData.model_number && (
        <DetailItem label="Model Number" value={formData.model_number} />
      )}
      {formData.notes && (
        <DetailItem label="Notes" value={formData.notes} />
      )}
    </>
  );

  const renderThreadGaugeDetails = () => (
    <>
      <DetailItem label="Thread Type" value={formData.thread_type || 'Not specified'} />
      <DetailItem label="Thread Size" value={formData.thread_size || 'Not specified'} />
      <DetailItem label="Thread Class" value={formData.thread_class || 'Not specified'} />
      <DetailItem label="Gauge Type" value={formData.gauge_type === 'plug' ? 'Plug Gauge' : formData.gauge_type === 'ring' ? 'Ring Gauge' : 'Not specified'} />
      <DetailItem
        label="Create Option"
        value={
          <Badge variant={formData.create_option === 'Both' ? 'info' : 'default'}>
            {formData.create_option || 'Not specified'}
          </Badge>
        }
      />
      {formData.create_option === 'Both' && (
        <>
          <DetailItem label="GO Serial Number" value={formData.go_serial_number || 'Not specified'} />
          <DetailItem label="NO GO Serial Number" value={formData.nogo_serial_number || 'Not specified'} />
        </>
      )}
      {formData.create_option === 'GO' && formData.go_serial_number && (
        <DetailItem label="Serial Number (S/N)" value={formData.go_serial_number} />
      )}
      {formData.create_option === 'NOGO' && formData.nogo_serial_number && (
        <DetailItem label="Serial Number (S/N)" value={formData.nogo_serial_number} />
      )}
      {EquipmentRules.canBeSealed({ equipment_type: equipmentType }) && (
        <>
          <DetailItem
            label="Seal Status"
            value={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name={formData.is_sealed ? 'lock' : 'unlock'} />
                {formData.is_sealed ? 'Sealed' : 'Unsealed'}
              </span>
            }
          />
          {!formData.is_sealed && formData.unsealed_date && (
            <DetailItem label="Unsealed Date" value={formData.unsealed_date} />
          )}
        </>
      )}
      {renderCommonDetails()}
    </>
  );

  const renderHandToolDetails = () => (
    <>
      <DetailItem label="Gauge Name" value={formData.name || 'Not specified'} />
      <DetailItem label="Ownership Type" value={
        formData.ownership_type ? TextFormatRules.formatSnakeCaseToTitleCase(formData.ownership_type) : 'Not specified'
      } />
      {(formData.measurement_range_min !== undefined || formData.measurement_range_max !== undefined) && (
        <DetailItem
          label="Measurement Range"
          value={`${formData.measurement_range_min || 0} - ${formData.measurement_range_max || 0} ${formData.measurement_unit || ''}`}
        />
      )}
      {formData.resolution_value && (
        <DetailItem label="Resolution" value={formData.resolution_value.toString()} />
      )}
      {formData.accuracy_value && (
        <DetailItem label="Accuracy" value={formData.accuracy_value} />
      )}
      {formData.calibration_frequency_days && (
        <DetailItem label="Calibration Frequency" value={`${formData.calibration_frequency_days} days`} />
      )}
      {renderCommonDetails()}
    </>
  );

  const renderLargeEquipmentDetails = () => (
    <>
      <DetailItem label="Equipment Name" value={formData.name || 'Not specified'} />
      <DetailItem label="Ownership Type" value={
        formData.ownership_type ? TextFormatRules.formatSnakeCaseToTitleCase(formData.ownership_type) : 'Not specified'
      } />
      {(formData.measurement_range_min !== undefined || formData.measurement_range_max !== undefined) && (
        <DetailItem 
          label="Measurement Range" 
          value={`${formData.measurement_range_min || 0} - ${formData.measurement_range_max || 0} ${formData.measurement_unit || ''}`} 
        />
      )}
      {formData.resolution_value && (
        <DetailItem label="Resolution" value={formData.resolution_value.toString()} />
      )}
      {formData.accuracy_value && (
        <DetailItem label="Accuracy" value={formData.accuracy_value} />
      )}
      {formData.calibration_frequency_days && (
        <DetailItem label="Calibration Frequency" value={`${formData.calibration_frequency_days} days`} />
      )}
      {renderCommonDetails()}
    </>
  );

  const renderCalibrationStandardDetails = () => (
    <>
      <DetailItem label="Standard Name" value={formData.name || 'Not specified'} />
      <DetailItem label="Certification Number" value={formData.certification_number || 'Not specified'} />
      {formData.nominal_value && (
        <DetailItem label="Nominal Value" value={formData.nominal_value} />
      )}
      {formData.actual_value && (
        <DetailItem label="Actual Certified Value" value={formData.actual_value} />
      )}
      {formData.accuracy_value && (
        <DetailItem label="Uncertainty" value={formData.accuracy_value} />
      )}
      {formData.traceability_info && (
        <DetailItem label="Traceability" value={formData.traceability_info} />
      )}
      {formData.calibration_frequency_days && (
        <DetailItem label="Recertification Frequency" value={`${formData.calibration_frequency_days} days`} />
      )}
      {formData.temperature_requirements && (
        <DetailItem label="Temperature Requirements" value={formData.temperature_requirements} />
      )}
      {renderCommonDetails()}
    </>
  );

  const renderDetails = () => {
    switch (equipmentType as EquipmentType) {
      case 'thread_gauge':
        return renderThreadGaugeDetails();
      case 'hand_tool':
        return renderHandToolDetails();
      case 'large_equipment':
        return renderLargeEquipmentDetails();
      case 'calibration_standard':
        return renderCalibrationStandardDetails();
      default:
        return renderCommonDetails();
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-gray-900)', textAlign: 'center' }}>Review and Confirm</h2>
      <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-gray-900)', textAlign: 'center' }}>
        Please review the gauge details before creating
      </p>

      {/* Set ID Section - Only show for gauge sets */}
      {equipmentType === 'thread_gauge' && formData.create_option === 'Both' && (
        <div style={{
          backgroundColor: isEditingSetId ? 'var(--color-warning-light)' : 'var(--color-info-light)',
          padding: 'var(--space-5)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-5)',
          boxShadow: 'var(--shadow-sm)',
          maxWidth: '600px',
          margin: '0 auto var(--space-5) auto',
          border: isEditingSetId ? '2px solid var(--color-warning)' : '2px solid var(--color-info)'
        }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--color-gray-600)',
            marginBottom: 'var(--space-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Set ID
          </label>

          {isEditingSetId ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <FormInput
                  value={customSetId}
                  onChange={(e) => setCustomSetId(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: '24px',
                    fontWeight: '600',
                    fontFamily: "'Courier New', monospace",
                    padding: 'var(--space-2) var(--space-3)',
                    border: validationError ? '2px solid var(--color-error)' : '2px solid var(--color-warning)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-white)'
                  }}
                  autoFocus
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSetId}
                  disabled={!customSetId.trim() || !!validationError || isValidating}
                >
                  {isValidating ? 'Checking...' : 'Save'}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
              {validationError && (
                <div style={{
                  marginTop: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: 'var(--color-error-light)',
                  border: '1px solid var(--color-error)',
                  borderRadius: '4px',
                  color: 'var(--color-error-dark)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  ⚠️ {validationError}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                flex: 1,
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--color-gray-900)',
                fontFamily: "'Courier New', monospace"
              }}>
                {nextSetId || 'Loading...'}
              </div>
              <Button variant="secondary" size="sm" onClick={handleEditSetId}>
                Edit
              </Button>
            </div>
          )}

          <div style={{
            fontSize: '12px',
            color: 'var(--color-gray-600)',
            marginTop: 'var(--space-1)'
          }}>
            {isEditingSetId ? 'Enter a custom set ID (must be unique)' : 'Auto-generated next available ID'}
          </div>
        </div>
      )}

      {/* System Gauge ID - Show for individual gauges */}
      {!(equipmentType === 'thread_gauge' && formData.create_option === 'Both') && (
        <div style={{
          backgroundColor: 'var(--color-white)',
          padding: 'var(--space-5)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-5)',
          boxShadow: 'var(--shadow-sm)',
          maxWidth: '600px',
          margin: '0 auto var(--space-5) auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)'
          }}>
            <span style={{
              fontWeight: '600',
              color: 'var(--color-gray-800)',
              fontSize: 'var(--font-size-sm)'
            }}>
              System Gauge ID:
            </span>
            {formData.gauge_id ? (
              <span style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--color-gray-900)',
                fontFamily: "'Courier New', monospace"
              }}>
                {formData.gauge_id}
              </span>
            ) : (
              <Badge variant="info">
                <Icon name="info-circle" size="sm" /> Will be generated automatically
              </Badge>
            )}
          </div>
        </div>
      )}

      <div style={{
        backgroundColor: 'var(--color-white)',
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '200px 1fr',
          gap: 'var(--space-4)',
          alignItems: 'center'
        }}>
          {renderDetails()}
        </div>
      </div>

      {equipmentType === 'thread_gauge' && formData.create_option === 'Both' && (
        <div style={{
          marginTop: 'var(--space-6)',
          padding: 'var(--space-4)',
          backgroundColor: 'var(--color-info-light)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-info)',
          maxWidth: '600px',
          margin: 'var(--space-6) auto 0 auto'
        }}>
          <p style={{ margin: 0, color: 'var(--color-info)', fontWeight: '500' }}>
            <Icon name="info-circle" /> This will create a gauge set with both GO and NO GO gauges
          </p>
        </div>
      )}
    </div>
  );
};