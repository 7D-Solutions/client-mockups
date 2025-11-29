import React from 'react';
import styles from './FormSection.module.css';
import { Tooltip } from './Tooltip';
import { Icon } from './Icon';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  tooltip?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children, tooltip }) => {
  return (
    <div className={styles.section}>
      <div className={styles.title}>
        {title}
        {tooltip && (
          <span style={{ marginLeft: '6px', display: 'inline-flex' }}>
            <Tooltip content={tooltip} position="top">
              <Icon name="info-circle" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', cursor: 'help' }} />
            </Tooltip>
          </span>
        )}
      </div>
      {children}
    </div>
  );
};
