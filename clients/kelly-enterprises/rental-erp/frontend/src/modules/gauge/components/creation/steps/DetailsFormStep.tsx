import React from 'react';
import { useGaugeState } from '../../../../../infrastructure/store';
import { EquipmentRules } from '../../../../../infrastructure/business/equipmentRules';
import { ThreadGaugeForm } from '../forms/ThreadGaugeForm';
import { HandToolForm } from '../forms/HandToolForm';
import { LargeEquipmentForm } from '../forms/LargeEquipmentForm';
import { CalibrationStandardForm } from '../forms/CalibrationStandardForm';
import type { EquipmentType } from '../../../types';

export const DetailsFormStep: React.FC = () => {
  const { createGauge } = useGaugeState();
  const { equipmentType, categoryName } = createGauge;

  const renderForm = () => {
    switch (equipmentType as EquipmentType) {
      case 'thread_gauge':
        return <ThreadGaugeForm />;
      case 'hand_tool':
        return <HandToolForm />;
      case 'large_equipment':
        return <LargeEquipmentForm />;
      case 'calibration_standard':
        return <CalibrationStandardForm />;
      default:
        return (
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-gray-600)' }}>
            Unknown equipment type. Please go back and select again.
          </div>
        );
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>Enter Gauge Details</h2>
      <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-gray-600)', textAlign: 'center' }}>
        Fill in the details for your {categoryName || EquipmentRules.getDisplayName({ equipment_type: equipmentType })}
      </p>
      
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {renderForm()}
      </div>
    </div>
  );
};