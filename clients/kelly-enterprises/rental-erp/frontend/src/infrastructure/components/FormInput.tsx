// MANDATORY: Use this FormInput component instead of raw <input> elements.
// Provides consistent validation, styling, and accessibility.
// For Claude Code: Always use FormInput/FormCheckbox/FormTextarea instead of raw HTML form elements.
import styles from './FormInput.module.css';
import { Tooltip, TooltipPosition } from './Tooltip';
import { Icon } from './Icon';
import { useTooltips } from '../context/TooltipContext';

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  helperText?: string;
  fieldSize?: 'sm' | 'md' | 'lg';
  tooltip?: string;
  tooltipPosition?: TooltipPosition;
}

export const FormInput = ({
  label,
  value,
  onChange,
  error,
  helperText,
  fieldSize = 'md',
  className = '',
  type = 'text',
  style,
  required,
  tooltip,
  tooltipPosition = 'top',
  ...rest
}: FormInputProps) => {
  const { tooltipsEnabled } = useTooltips();
  // Remove title attribute to prevent native browser tooltip
  const { title, ...inputProps } = rest as any;

  const inputElement = (
    <input
      type={type}
      value={value}
      onChange={onChange}
      className={`${styles.input} ${styles[`input${fieldSize.toUpperCase()}`]} ${error ? styles.inputError : ''}`}
      required={required}
      title=""
      {...inputProps}
    />
  );

  return (
    <div className={`${styles.container} ${className}`} style={style}>
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
          {inputElement}
        </Tooltip>
      ) : (
        inputElement
      )}
      {helperText && !error && (
        <p className={styles.helperText}>{helperText}</p>
      )}
      {error && (
        <p className={styles.error}>{error}</p>
      )}
    </div>
  );
};