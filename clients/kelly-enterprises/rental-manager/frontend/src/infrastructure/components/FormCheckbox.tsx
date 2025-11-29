import React from 'react';
import styles from './FormCheckbox.module.css';
import { Tooltip, TooltipPosition } from './Tooltip';
import { Icon } from './Icon';

interface FormCheckboxProps {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  tooltip?: string;
  tooltipPosition?: TooltipPosition;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  name,
  id,
  className,
  tooltip,
  tooltipPosition = 'top'
}) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  const checkboxLabel = (
    <label htmlFor={checkboxId} className={`${styles.label} ${disabled ? styles.disabled : ''}`}>
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className={styles.checkbox}
      />
      <span className={styles.labelText}>
        {label}
        {tooltip && (
          <span style={{ marginLeft: '6px', display: 'inline-flex' }}>
            <Tooltip content={tooltip} position="top">
              <Icon name="info-circle" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', cursor: 'help' }} />
            </Tooltip>
          </span>
        )}
      </span>
    </label>
  );

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {tooltip ? (
        <Tooltip content={tooltip} position={tooltipPosition}>
          {checkboxLabel}
        </Tooltip>
      ) : (
        checkboxLabel
      )}
    </div>
  );
};