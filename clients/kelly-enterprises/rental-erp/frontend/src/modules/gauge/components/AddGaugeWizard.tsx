// Phase 6: Add Gauge Wizard Component - Complete workflow in modal
// Multi-step modal wizard for creating new gauges and sets
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  Button,
  BackButton,
  CloseButton,
  LoadingSpinner
} from '../../../infrastructure/components';
import { useGaugeState, useGaugeActions, useSharedActions } from '../../../infrastructure/store';
import { CategorySelectionStep } from './creation/steps/CategorySelectionStep';
import { DetailsFormStep } from './creation/steps/DetailsFormStep';
import { ReviewConfirmStep } from './creation/steps/ReviewConfirmStep';
import { useCreateGaugeMutation } from '../hooks/useGaugeQueries';
import styles from './AddGaugeWizard.module.css';

type EquipmentType = 'thread_gauge' | 'hand_tool' | 'large_equipment' | 'calibration_standard';
type ThreadGaugeOption = 'single' | 'new_set' | 'pair_spares';
type WizardStep = 'equipment-type' | 'thread-options' | 'category' | 'details' | 'review';

interface AddGaugeWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddGaugeWizard: React.FC<AddGaugeWizardProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('equipment-type');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<EquipmentType | null>(null);

  // Zustand store integration
  const { createGauge } = useGaugeState();
  const {
    setEquipmentType,
    resetGaugeForm,
    setGaugeSubmitting,
    updateGaugeFormData
  } = useGaugeActions();
  const { addNotification } = useSharedActions();
  const createGaugeMutation = useCreateGaugeMutation();

  const { isSubmitting, equipmentType, categoryId, formData } = createGauge;

  // Reset function
  const handleReset = useCallback(() => {
    setStep('equipment-type');
    setSelectedEquipmentType(null);
    resetGaugeForm();
  }, [resetGaugeForm]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen, handleReset]);

  const handleEquipmentTypeSelect = (type: EquipmentType) => {
    setSelectedEquipmentType(type);
    setEquipmentType(type);

    if (type === 'thread_gauge') {
      setStep('thread-options');
    } else {
      // Other equipment types skip thread options
      setStep('category');
    }
  };

  const handleThreadOptionSelect = (option: ThreadGaugeOption) => {
    if (option === 'pair_spares') {
      // Navigate to Spare Inventory page (Phase 5)
      navigate('/gauges/spare-inventory');
      handleClose();
    } else if (option === 'new_set') {
      // Pre-populate for set creation
      updateGaugeFormData({ create_option: 'Both' });
      setStep('category');
    } else {
      // Single gauge
      setStep('category');
    }
  };

  const handleBack = () => {
    if (step === 'thread-options') {
      setStep('equipment-type');
      setSelectedEquipmentType(null);
      setEquipmentType(null as any);
    } else if (step === 'category') {
      if (selectedEquipmentType === 'thread_gauge') {
        setStep('thread-options');
      } else {
        setStep('equipment-type');
      }
    } else if (step === 'details') {
      setStep('category');
    } else if (step === 'review') {
      setStep('details');
    }
  };

  const handleNext = () => {
    if (step === 'category' && categoryId) {
      setStep('details');
    } else if (step === 'details' && isDetailsValid()) {
      setStep('review');
    }
  };

  const isDetailsValid = () => {
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

        await createGaugeMutation.mutateAsync({ goData, noGoData });
      } else {
        // For thread gauges, map go_serial_number/nogo_serial_number to serial_number
        const singleGaugeData = equipmentType === 'thread_gauge'
          ? {
              ...gaugeData,
              serial_number: formData.create_option === 'GO' ? formData.go_serial_number : formData.nogo_serial_number
            }
          : gaugeData;

        await createGaugeMutation.mutateAsync({ gaugeData: singleGaugeData });
      }

      addNotification({
        type: 'success',
        title: 'Gauge Created',
        message: 'Gauge has been created successfully.',
      });

      handleClose();
      // Refresh the gauge list
      navigate('/gauges/inventory');
    } catch (error: any) {
      console.error('❌ Failed to create gauge:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status
      });

      // Handle V2 educational errors
      const errorData = error.response?.data;
      let errorMessage = 'Failed to create gauge.';

      if (errorData?.correctUsage) {
        errorMessage = errorData.message;
        if (errorData.field) {
          errorMessage = `Error in ${errorData.field}: ${errorMessage}`;
        }
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

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const getModalTitle = () => {
    switch (step) {
      case 'equipment-type':
        return 'Add Gauge';
      case 'thread-options':
        return 'Add Thread Gauge';
      case 'category':
        return 'Select Category';
      case 'details':
        return 'Gauge Details';
      case 'review':
        return 'Review & Confirm';
      default:
        return 'Add Gauge';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getModalTitle()}
      size={step === 'equipment-type' || step === 'thread-options' ? 'md' : 'lg'}
    >
      <div className={styles.wizardContent}>
        {/* Step 1: Equipment Type Selection */}
        {step === 'equipment-type' && (
          <div className={styles.equipmentTypeSelection}>
            <p className={styles.stepDescription}>What type of equipment are you adding?</p>

            <div className={styles.equipmentGrid}>
              <button
                className={styles.equipmentCard}
                onClick={() => handleEquipmentTypeSelect('thread_gauge')}
              >
                <div className={styles.equipmentIcon}>🔩</div>
                <div className={styles.equipmentLabel}>Thread Gauge</div>
              </button>

              <button
                className={styles.equipmentCard}
                onClick={() => handleEquipmentTypeSelect('hand_tool')}
              >
                <div className={styles.equipmentIcon}>🔧</div>
                <div className={styles.equipmentLabel}>Hand Tool</div>
              </button>

              <button
                className={styles.equipmentCard}
                onClick={() => handleEquipmentTypeSelect('large_equipment')}
              >
                <div className={styles.equipmentIcon}>📦</div>
                <div className={styles.equipmentLabel}>Large Equip.</div>
              </button>

              <button
                className={styles.equipmentCard}
                onClick={() => handleEquipmentTypeSelect('calibration_standard')}
              >
                <div className={styles.equipmentIcon}>📏</div>
                <div className={styles.equipmentLabel}>Cal Standard</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Thread Gauge Options */}
        {step === 'thread-options' && (
          <div className={styles.threadOptionsSelection}>
            <div className={styles.stepHeader}>
              <BackButton onClick={handleBack} size="sm" />
              <p className={styles.stepDescription}>What do you want to create?</p>
            </div>

            <div className={styles.optionsList}>
              <button
                className={styles.optionCard}
                onClick={() => handleThreadOptionSelect('single')}
              >
                <div className={styles.optionContent}>
                  <div className={styles.optionTitle}>Single Gauge</div>
                  <div className={styles.optionDescription}>Add one thread gauge (GO or NO GO)</div>
                </div>
                <span className={styles.selectArrow}>Select →</span>
              </button>

              <button
                className={styles.optionCard}
                onClick={() => handleThreadOptionSelect('new_set')}
              >
                <div className={styles.optionContent}>
                  <div className={styles.optionTitle}>New Gauge Set</div>
                  <div className={styles.optionDescription}>Create GO + NO GO pair with new specs</div>
                </div>
                <span className={styles.selectArrow}>Select →</span>
              </button>

              <button
                className={styles.optionCard}
                onClick={() => handleThreadOptionSelect('pair_spares')}
              >
                <div className={styles.optionContent}>
                  <div className={styles.optionTitle}>Pair Existing Spares</div>
                  <div className={styles.optionDescription}>Combine spare GO + NO GO into set</div>
                </div>
                <span className={styles.selectArrow}>Select →</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Category Selection */}
        {step === 'category' && (
          <div className={styles.formStep}>
            <CategorySelectionStep />
          </div>
        )}

        {/* Step 4: Details Form */}
        {step === 'details' && (
          <div className={styles.formStep}>
            <DetailsFormStep />
          </div>
        )}

        {/* Step 5: Review & Confirm */}
        {step === 'review' && (
          <div className={styles.formStep}>
            <ReviewConfirmStep />
          </div>
        )}
      </div>

      {/* Modal Actions */}
      <Modal.Actions>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>
            {step !== 'equipment-type' && step !== 'thread-options' && (
              <BackButton onClick={handleBack} disabled={isSubmitting} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {step === 'category' && (
              <Button onClick={handleNext} disabled={!categoryId || isSubmitting}>
                Next
              </Button>
            )}
            {step === 'details' && (
              <Button onClick={handleNext} disabled={!isDetailsValid() || isSubmitting}>
                Review
              </Button>
            )}
            {step === 'review' && (
              <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting}>
                {isSubmitting ? <LoadingSpinner size="sm" /> : 'Create Gauge'}
              </Button>
            )}
            <CloseButton onClick={handleClose} disabled={isSubmitting} size="sm" />
          </div>
        </div>
      </Modal.Actions>
    </Modal>
  );
};
