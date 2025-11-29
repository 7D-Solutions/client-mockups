// GaugeStatusBadge component - wrapper around Tag for gauge statuses
// Phase 0 requirement: Support all gauge statuses including new ones
import React from 'react';
import { Tag } from './Tag';
import { Icon } from './Icon';
import type { GaugeStatus } from '../../modules/gauge/types';

interface GaugeStatusBadgeProps {
  status: GaugeStatus;
  label?: string; // Optional label override (e.g., "GO", "NO GO")
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const statusConfig: Record<GaugeStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'dark'; icon?: string }> = {
  // Existing statuses
  available: {
    label: 'Available',
    variant: 'success',
    icon: 'check-circle'
  },
  checked_out: {
    label: 'Checked Out',
    variant: 'info',
    icon: 'arrow-circle-right'
  },
  pending_qc: {
    label: 'Pending QC',
    variant: 'warning',
    icon: 'clipboard-check'
  },
  pending_transfer: {
    label: 'Pending Transfer',
    variant: 'warning',
    icon: 'exchange-alt'
  },
  calibration_due: {
    label: 'Calibration Due',
    variant: 'danger',
    icon: 'exclamation-triangle'
  },
  out_of_service: {
    label: 'Out of Service',
    variant: 'danger',
    icon: 'tools'
  },
  pending_unseal: {
    label: 'Pending Unseal',
    variant: 'warning',
    icon: 'lock'
  },
  retired: {
    label: 'Retired',
    variant: 'dark',
    icon: 'archive'
  },

  // ➕ Phase 0: New statuses for ADDENDUM
  out_for_calibration: {
    label: 'Out for Calibration',
    variant: 'info',
    icon: 'shipping-fast'
  },
  pending_certificate: {
    label: 'Pending Certificate',
    variant: 'warning',
    icon: 'file-certificate'
  },
  pending_release: {
    label: 'Pending Release',
    variant: 'warning',
    icon: 'hourglass-half'
  },
  returned: {
    label: 'Returned (Customer)',
    variant: 'dark',
    icon: 'box'
  }
};

export const GaugeStatusBadge: React.FC<GaugeStatusBadgeProps> = ({ status, label, size = 'xs' }) => {
  const config = statusConfig[status] || {
    label: status,
    variant: 'default' as const
  };

  const displayLabel = label || config.label;

  return (
    <Tag size={size} variant={config.variant}>
      {config.icon && <Icon name={config.icon} />}
      {displayLabel}
    </Tag>
  );
};
