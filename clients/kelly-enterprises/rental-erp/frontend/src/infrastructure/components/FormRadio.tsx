import { ReactNode } from 'react';
import styles from './FormRadio.module.css';
import { Tooltip, TooltipPosition } from './Tooltip';
import { Icon } from './Icon';

interface FormRadioProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  description?: string;
  className?: string;
  tooltip?: string;
  tooltipPosition?: TooltipPosition;
}

export function FormRadio({
  name,
  value,
  checked,
  onChange,
  children,
  disabled = false,
  description,
  className = '',
  tooltip,
  tooltipPosition = 'top'
}: FormRadioProps) {
  const radioElement = (
    <div
      className={`${styles.radioWrapper} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''} ${className}`}
      onClick={() => !disabled && onChange(value)}>
      <div className={styles.radioControl}>
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={styles.radioInput} />
        <div className={styles.radioIndicator}>
          {checked && <div className={styles.radioChecked} />}
        </div>
      </div>
      <div className={styles.radioContent}>
        <div className={styles.radioLabel}>
          {children}
          {tooltip && (
            <span style={{ marginLeft: '6px', display: 'inline-flex' }}>
              <Tooltip content={tooltip} position="top">
                <Icon name="info-circle" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', cursor: 'help' }} />
              </Tooltip>
            </span>
          )}
        </div>
        {description && <div className={styles.radioDescription}>{description}</div>}
      </div>
    </div>
  );

  return tooltip ? (
    <Tooltip content={tooltip} position={tooltipPosition}>
      {radioElement}
    </Tooltip>
  ) : (
    radioElement
  );
}