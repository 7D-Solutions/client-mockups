import React from 'react';
import { Icon } from '../../../../../infrastructure/components';
import { useGaugeState, useGaugeActions } from '../../../../../infrastructure/store';
import type { EquipmentType } from '../../../types';

const EQUIPMENT_TYPES: Array<{
  type: EquipmentType;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    type: 'thread_gauge',
    title: 'Thread Gauge',
    description: 'Precision gauges for testing thread dimensions and pitch',
    icon: 'wrench'
  },
  {
    type: 'hand_tool',
    title: 'Hand Tool',
    description: 'Micrometers, calipers, and other handheld measuring instruments',
    icon: 'tools'
  },
  {
    type: 'large_equipment',
    title: 'Large Equipment',
    description: 'Stationary or heavy measurement equipment',
    icon: 'cogs'
  },
  {
    type: 'calibration_standard',
    title: 'Calibration Standard',
    description: 'Reference standards used for calibrating other instruments',
    icon: 'certificate'
  }
];

export const EquipmentTypeStep: React.FC = () => {
  const { createGauge } = useGaugeState();
  const { setEquipmentType, setCreateGaugeStep } = useGaugeActions();
  const { equipmentType, currentStep } = createGauge;

  const handleSelect = (type: EquipmentType) => {
    setEquipmentType(type);
    // Automatically proceed to next step after a brief delay for visual feedback
    setTimeout(() => {
      setCreateGaugeStep(currentStep + 1);
    }, 150);
  };

  return (
    <div>
      <h2 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-gray-900)', textAlign: 'center' }}>Select Equipment Type</h2>
      <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-gray-900)', fontWeight: '500', textAlign: 'center' }}>
        Click on a card to select the type of gauge you want to create
      </p>
      
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-4)'
        }}>
        {EQUIPMENT_TYPES.map((item) => (
          <div
            key={item.type}
            onClick={() => handleSelect(item.type)}
            style={{
              cursor: 'pointer',
              padding: 'var(--space-5)',
              border: `2px solid ${equipmentType === item.type ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              backgroundColor: equipmentType === item.type ? 'var(--color-primary-light)' : 'var(--color-white)',
              transition: 'all 0.2s ease',
              boxShadow: equipmentType === item.type ? 'var(--shadow-md)' : 'var(--shadow-sm)',
              transform: equipmentType === item.type ? 'translateY(-2px)' : 'translateY(0)'
            }}
            onMouseEnter={(e) => {
              if (equipmentType !== item.type) {
                e.currentTarget.style.borderColor = 'var(--color-primary-hover)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }
            }}
            onMouseLeave={(e) => {
              if (equipmentType !== item.type) {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
              <Icon
                name={item.icon as any}
                size="lg"
                style={{
                  color: equipmentType === item.type ? 'var(--color-primary)' : 'var(--color-gray-600)',
                  fontSize: 'var(--font-size-2xl)'
                }}
              />
              <h3 style={{
                margin: 0,
                color: equipmentType === item.type ? 'var(--color-primary)' : 'var(--color-gray-800)',
                fontSize: 'var(--font-size-lg)',
                fontWeight: '600'
              }}>
                {item.title}
              </h3>
            </div>
            <p style={{
              margin: 0,
              color: 'var(--color-gray-600)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: '1.5'
            }}>
              {item.description}
            </p>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};