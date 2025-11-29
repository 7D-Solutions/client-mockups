// GaugeTypeBadge - Small badge for indicating Set or Spare gauges
import styles from './GaugeTypeBadge.module.css';

interface GaugeTypeBadgeProps {
  type: 'set' | 'spare';
  className?: string;
}

export const GaugeTypeBadge = ({ type, className = '' }: GaugeTypeBadgeProps) => {
  return (
    <span className={`${styles.badge} ${styles[type]} ${className}`}>
      {type === 'spare' ? 'Spare' : 'Set'}
    </span>
  );
};
