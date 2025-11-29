import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGaugeState, useGaugeActions, useSharedActions } from '../../../../infrastructure/store';
import { Button, LoadingSpinner } from '../../../../infrastructure/components';
import { EquipmentTypeStep } from './steps/EquipmentTypeStep';
import { CategorySelectionStep } from './steps/CategorySelectionStep';
import { DetailsFormStep } from './steps/DetailsFormStep';
import { ReviewConfirmStep } from './steps/ReviewConfirmStep';
import { useCreateGaugeMutation } from '../../hooks/useGaugeQueries';

const STEPS = [
  { id: 0, name: 'Equipment Type', component: EquipmentTypeStep },
  { id: 1, name: 'Category', component: CategorySelectionStep },
  { id: 2, name: 'Details', component: DetailsFormStep },
  { id: 3, name: 'Review & Confirm', component: ReviewConfirmStep },
];

export const CreateGaugeWorkflow: React.FC = () => {
  const navigate = useNavigate();
  const { createGauge } = useGaugeState();
  const {
    setCreateGaugeStep,
    resetGaugeForm,
    setGaugeSubmitting,
    _updateGaugeFormData
  } = useGaugeActions();
  const { addNotification } = useSharedActions();
  const createGaugeMutation = useCreateGaugeMutation();

  const { currentStep, isSubmitting, equipmentType, categoryId, formData } = createGauge;

  // Reset form on unmount
  useEffect(() => {
    return () => {
      resetGaugeForm();
    };
  }, [resetGaugeForm]);

  const handleNext = () => {
    // Validate required fields before proceeding
    if (currentStep === 2) { // Gauge Details step
      // For thread gauges, validate serial number is provided
      if (equipmentType === 'thread_gauge') {
        const createOption = formData.create_option;

        if (createOption === 'GO' && !formData.go_serial_number?.trim()) {
          addNotification({
            type: 'error',
            title: 'Serial Number Required',
            message: 'Please enter a GO gauge serial number before proceeding.',
          });
          return;
        }

        if (createOption === 'NOGO' && !formData.nogo_serial_number?.trim()) {
          addNotification({
            type: 'error',
            title: 'Serial Number Required',
            message: 'Please enter a NO GO gauge serial number before proceeding.',
          });
          return;
        }

        if (createOption === 'Both') {
          if (!formData.go_serial_number?.trim() || !formData.nogo_serial_number?.trim()) {
            addNotification({
              type: 'error',
              title: 'Serial Numbers Required',
              message: 'Please enter both GO and NO GO gauge serial numbers before proceeding.',
            });
            return;
          }
        }
      } else {
        // For other equipment types, validate serial_number field
        if (!formData.serial_number?.trim()) {
          addNotification({
            type: 'error',
            title: 'Serial Number Required',
            message: 'Please enter a serial number before proceeding.',
          });
          return;
        }
      }
    }

    if (currentStep < STEPS.length - 1) {
      setCreateGaugeStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCreateGaugeStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setGaugeSubmitting(true);
    
    try {
      const gaugeData = {
        ...formData,
        equipment_type: equipmentType,
        category_id: categoryId,
        // storage_location is already in formData, no need to map
      };

      // Handle thread gauge set creation
      if (equipmentType === 'thread_gauge' && formData.create_option === 'Both') {
        const goData = {
          ...gaugeData,
          gauge_suffix: 'A',
          serial_number: formData.go_serial_number,
        };
        const noGoData = {
          ...gaugeData,
          gauge_suffix: 'B',
          serial_number: formData.nogo_serial_number,
        };

        const result = await createGaugeMutation.mutateAsync({ goData, noGoData });

        // Show persistent notification for gauge set creation
        addNotification({
          type: 'success',
          title: 'Gauge Set Created Successfully',
          message: `Set ID: ${result.setId}\nGO Gauge: ${result.goId}\nNO GO Gauge: ${result.noGoId}\nStatus: ${formData.is_sealed ? 'Sealed' : 'Available'}`,
          persistent: true,
        });
      } else {
        // For thread gauges, map go_serial_number/nogo_serial_number to serial_number
        const singleGaugeData = equipmentType === 'thread_gauge'
          ? {
              ...gaugeData,
              serial_number: formData.create_option === 'GO' ? formData.go_serial_number : formData.nogo_serial_number
            }
          : gaugeData;

        await createGaugeMutation.mutateAsync({ gaugeData: singleGaugeData });

        addNotification({
          type: 'success',
          title: 'Gauge Created',
          message: 'Gauge has been created successfully.',
        });
      }
      
      navigate('/gauges/inventory');
    } catch (error: any) {
      console.error('Failed to create gauge:', error);
      
      // Handle V2 educational errors
      const errorData = error.response?.data;
      let errorMessage = 'Failed to create gauge.';
      
      if (errorData?.correctUsage) {
        // V2 API provides educational errors with correct usage examples
        errorMessage = errorData.message;
        if (errorData.field) {
          errorMessage = `Error in ${errorData.field}: ${errorMessage}`;
        }
        errorMessage += `\n\nCorrect usage:\n${JSON.stringify(errorData.correctUsage, null, 2)}`;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: errorMessage,
      });
    } finally {
      setGaugeSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return !!equipmentType;
      case 1:
        return !!categoryId;
      case 2:
        // Validation depends on equipment type
        if (equipmentType === 'thread_gauge') {
          // Check basic thread gauge fields
          if (!formData.thread_type || !formData.thread_size || !formData.thread_class || !formData.gauge_type || !formData.create_option || !formData.storage_location) {
            return false;
          }

          // Check serial numbers based on create option
          if (formData.create_option === 'GO') {
            return !!(formData.go_serial_number?.trim());
          } else if (formData.create_option === 'NOGO') {
            return !!(formData.nogo_serial_number?.trim());
          } else if (formData.create_option === 'Both') {
            return !!(formData.go_serial_number?.trim() && formData.nogo_serial_number?.trim());
          }

          return true;
        }
        // For other equipment types, validate serial_number field
        return !!(formData.storage_location && formData.serial_number?.trim());
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getValidationMessage = () => {
    const missing: string[] = [];

    switch (currentStep) {
      case 0:
        if (!equipmentType) missing.push('Equipment Type');
        break;
      case 1:
        if (!categoryId) missing.push('Category');
        break;
      case 2:
        if (equipmentType === 'thread_gauge') {
          if (!formData.thread_type) missing.push('Thread Type');
          if (!formData.thread_size) missing.push('Thread Size');
          if (!formData.thread_class) missing.push('Thread Class');
          if (!formData.gauge_type) missing.push('Gauge Type');
          if (!formData.create_option) missing.push('Create Option');
          if (!formData.storage_location) missing.push('Storage Location');

          // Check serial numbers based on create option
          if (formData.create_option === 'GO' && !formData.go_serial_number?.trim()) {
            missing.push('GO Serial Number');
          } else if (formData.create_option === 'NOGO' && !formData.nogo_serial_number?.trim()) {
            missing.push('NO GO Serial Number');
          } else if (formData.create_option === 'Both') {
            if (!formData.go_serial_number?.trim()) missing.push('GO Serial Number');
            if (!formData.nogo_serial_number?.trim()) missing.push('NO GO Serial Number');
          }
        } else {
          if (!formData.storage_location) missing.push('Storage Location');
          if (!formData.serial_number?.trim()) missing.push('Serial Number');
        }
        break;
    }

    if (missing.length === 0) return '';
    return `Missing required fields: ${missing.join(', ')}`;
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div>
      {/* Progress Indicator */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          {STEPS.map((step) => (
            <div 
              key={step.id} 
              style={{ 
                flex: 1,
                textAlign: 'center',
                padding: '0.5rem',
                borderBottom: `2px solid ${step.id <= currentStep ? 'var(--color-primary)' : 'var(--color-gray-300)'}`,
                color: step.id <= currentStep ? 'var(--color-primary)' : 'var(--color-gray-600)',
                fontWeight: step.id === currentStep ? 'bold' : 'normal',
              }}
            >
              {step.name}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div style={{ minHeight: '400px', marginBottom: 'var(--space-8)' }}>
        {isSubmitting ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '400px' 
          }}>
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <CurrentStepComponent />
        )}
      </div>

      {/* Navigation Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-4)'
      }}>
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
        >
          Back
        </Button>

        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {currentStep === STEPS.length - 1 ? (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isStepValid() || isSubmitting}
              title={!isStepValid() ? getValidationMessage() : ''}
            >
              Create Gauge
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!isStepValid() || isSubmitting}
              title={!isStepValid() ? getValidationMessage() : ''}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};