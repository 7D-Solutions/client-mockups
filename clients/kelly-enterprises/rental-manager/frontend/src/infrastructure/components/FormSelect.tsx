import styles from './FormSelect.module.css';
import { Tooltip, TooltipPosition } from './Tooltip';
import { Icon } from './Icon';
import { useTooltips } from '../context/TooltipContext';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: Array<{ value: string | number; label: string }>;
  error?: string;
  children?: React.ReactNode;
  fieldSize?: 'sm' | 'md' | 'lg';
  tooltip?: string;
  tooltipPosition?: TooltipPosition;
}

export const FormSelect = ({
  label,
  value,
  onChange,
  options,
  error,
  children,
  fieldSize = 'md',
  className = '',
  required,
  tooltip,
  tooltipPosition = 'top',
  ...props
}: FormSelectProps) => {
  const { tooltipsEnabled } = useTooltips();
  // Remove title attribute to prevent native browser tooltip
  const { title, ...selectProps } = props as any;

  const selectElement = (
    <select
      value={value}
      onChange={onChange}
      className={`${styles.select} ${styles[`select${fieldSize.toUpperCase()}`]} ${error ? styles.selectError : ''}`}
      required={required}
      title=""
      {...selectProps}
    >
      {children || options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className={`${styles.container} ${className}`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}> *</span>}
          <span style={{ marginLeft: '6px', display: 'inline-flex', visibility: tooltip && tooltipsEnabled ? 'visible' : 'hidden' }}>
            {tooltip && (
              <Tooltip content={tooltip} position="top">
                <Icon name="info-circle" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', cursor: 'help' }} />
              </Tooltip>
            )}
          </span>
        </label>
      )}
      {tooltip ? (
        <Tooltip content={tooltip} position={tooltipPosition}>
          {selectElement}
        </Tooltip>
      ) : (
        selectElement
      )}
      {error && (
        <p className={styles.error}>{error}</p>
      )}
    </div>
  );
};