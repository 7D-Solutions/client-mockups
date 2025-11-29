import React from 'react';
import { useTooltips } from '../context/TooltipContext';
import styles from './TooltipToggle.module.css';

export const TooltipToggle: React.FC = () => {
  const { tooltipsEnabled, toggleTooltips } = useTooltips();

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <input
          id="tooltip-toggle"
          type="checkbox"
          checked={tooltipsEnabled}
          onChange={toggleTooltips}
          className={styles.checkbox}
        />
        <label htmlFor="tooltip-toggle" className={styles.label}>
          Show Tooltips
        </label>
      </div>
    </div>
  );
};
