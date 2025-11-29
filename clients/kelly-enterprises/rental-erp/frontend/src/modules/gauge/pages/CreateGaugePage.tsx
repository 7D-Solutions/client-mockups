import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Icon, Card, CardContent } from '../../../infrastructure/components';
import { CreateGaugeWorkflow } from '../components/creation/CreateGaugeWorkflow';
import { useGaugeActions } from '../../../infrastructure/store';

export const CreateGaugePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setEquipmentType, setCreateGaugeStep, updateGaugeFormData, resetGaugeForm } = useGaugeActions();

  // Read wizard navigation state and pre-populate form
  useEffect(() => {
    const state = location.state as { equipmentType?: string; createSet?: boolean } | null;

    if (state?.equipmentType) {
      // Pre-populate equipment type from wizard and skip to step 1 (Category)
      setEquipmentType(state.equipmentType);
      setCreateGaugeStep(1); // Skip equipment type selection step

      // If creating a set, pre-populate the create_option field
      if (state.createSet && state.equipmentType === 'thread_gauge') {
        updateGaugeFormData({ create_option: 'Both' });
      }
    }
  }, [location.state, setEquipmentType, setCreateGaugeStep, updateGaugeFormData]);

  const handleBack = () => {
    // Reset form state before navigating away to ensure clean state on next visit
    resetGaugeForm();
    navigate(-1);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header on blue background with white text */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button
            variant="secondary"
            onClick={handleBack}
            size="sm"
            style={{ padding: 'var(--space-2)' }}
          >
            <Icon name="arrow-left" />
          </Button>
          <h1 style={{ margin: 0, color: 'white' }}>Create New Gauge</h1>
        </div>
      </div>

      {/* Workflow in white Card */}
      <Card>
        <CardContent>
          <CreateGaugeWorkflow />
        </CardContent>
      </Card>
    </div>
  );
};