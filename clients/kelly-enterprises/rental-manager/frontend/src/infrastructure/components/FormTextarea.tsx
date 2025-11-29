import styles from './FormTextarea.module.css';
import { Tooltip, TooltipPosition } from './Tooltip';
import { Icon } from './Icon';
import { useTooltips } from '../context/TooltipContext';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  fieldSize?: 'sm' | 'md' | 'lg';
  tooltip?: string;
  tooltipPosition?: TooltipPosition;
}

export const FormTextarea = ({
  label,
  value,
  onChange,
  error,
  fieldSize = 'md',
  className = '',
  rows = 3,
  tooltip,
  tooltipPosition = 'top',
  ...props
}: FormTextareaProps) => {
  const { tooltipsEnabled } = useTooltips();
  // Remove title attribute to prevent native browser tooltip
  const { title, ...textareaProps } = props as any;

  const textareaElement = (
    <textarea
      value={value}
      onChange={onChange}
      className={`${styles.textarea} ${styles[`textarea${fieldSize.toUpperCase()}`]} ${error ? styles.textareaError : ''}`}
      rows={rows}
      title=""
      {...textareaProps}
    />
  );

  return (
    <div className={`${styles.container} ${className}`}>
      {label && (
        <label className={styles.label}>
          {label}
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
          {textareaElement}
        </Tooltip>
      ) : (
        textareaElement
      )}
      {error && (
        <p className={styles.error}>{error}</p>
      )}
    </div>
  );
};