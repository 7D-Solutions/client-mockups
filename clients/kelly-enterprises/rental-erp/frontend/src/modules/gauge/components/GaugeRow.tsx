// Individual gauge row component
import React from 'react';
import { Button, Icon, Tag, Badge, FormCheckbox } from '../../../infrastructure';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import type { Gauge } from '../types';
import { getGaugeDisplayName, isSpareThreadGauge } from '../types';

interface GaugeRowProps {
  gauge: Gauge;
  index: number;
  currentUser: any;
  onClick: () => void;
  onOperationClick: (operation: string, event: React.MouseEvent) => void;
  canCheckout: boolean;
  canReturn: boolean;
  canTransfer: boolean;
  isSelected?: boolean;
  onSelectToggle?: (gaugeId: string) => void;
  showCheckbox?: boolean;
}

export const GaugeRow = React.memo(function GaugeRow({
  gauge,
  index,
  currentUser,
  onClick,
  onOperationClick,
  canCheckout,
  canReturn,
  canTransfer,
  isSelected = false,
  onSelectToggle,
  showCheckbox = false,
}: GaugeRowProps) {
  // Calibration status handling - status is calculated by backend from gauge_calibration_schedule

  const getStatusBadge = () => {
    // Priority 1: Show operational status badges for critical statuses
    if (StatusRules.isOutOfService(gauge)) {
      return (
        <Tag size="xs" variant={StatusRules.getStatusBadgeVariant(gauge)}>
          {StatusRules.getStatusDisplayText(gauge)}
        </Tag>
      );
    }
    if (StatusRules.isPendingQC(gauge)) {
      return (
        <Tag size="xs" variant={StatusRules.getStatusBadgeVariant(gauge)}>
          {StatusRules.getStatusDisplayText(gauge)}
        </Tag>
      );
    }

    // Priority 2: Show calibration badges
    if (StatusRules.isCalibrationExpired(gauge)) {
      return (
        <Tag size="xs" variant={StatusRules.getCalibrationBadgeVariant(gauge)}>
          {StatusRules.getCalibrationDisplayText(gauge)}
        </Tag>
      );
    }
    if (StatusRules.isCalibrationDueSoon(gauge)) {
      return (
        <Tag size="xs" variant={StatusRules.getCalibrationBadgeVariant(gauge)}>
          {StatusRules.getCalibrationDisplayText(gauge)}
        </Tag>
      );
    }

    return null;
  };

  const getCalibrationBadge = () => {
    if (!gauge.calibration_due_date) return null;

    const dueDate = new Date(gauge.calibration_due_date);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate days until calibration due for frontend display

    if (daysUntilDue < 0) {
      return (
        <Tag size="xs" variant="danger" style={{ marginLeft: 'var(--space-1)' }}>
          <Icon name="exclamation-triangle" /> Overdue
        </Tag>
      );
    } else if (daysUntilDue <= 30) {
      return (
        <Tag size="xs" variant="warning" style={{ marginLeft: 'var(--space-1)' }}>
          <Icon name="clock" /> Due in {daysUntilDue} days
        </Tag>
      );
    }

    return null;
  };

  const getSealBadge = () => {
    // Backend returns is_sealed as 1/0
    if (StatusRules.isSealed(gauge)) {
      return (
        <Tag size="xs" variant="success">
          <Icon name="lock" />
          sealed
        </Tag>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: index === 0 ? '0 var(--space-3) var(--space-2) var(--space-3)' : 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        backgroundColor: isSelected ? 'var(--color-primary-50)' : StatusRules.isCalibrationExpired(gauge) ? 'var(--color-danger-50)' : 'transparent',
        transition: 'background-color 0.15s'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isSelected && !StatusRules.isCalibrationExpired(gauge)) {
          e.currentTarget.style.backgroundColor = 'var(--color-gray-50)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !StatusRules.isCalibrationExpired(gauge)) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Checkbox column (conditional) */}
      {showCheckbox && (
        <div style={{ display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <FormCheckbox
            checked={isSelected}
            onChange={() => onSelectToggle?.(gauge.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Gauge information - compact stacked layout */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Gauge name as clickable link */}
        <a
          href="#"
          style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: '500',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            display: 'block',
            marginBottom: 'var(--space-0)'
          }}
          onClick={(e) => { e.preventDefault(); onClick(); }}
        >
          {gauge.displayName || gauge.name}
        </a>

        {/* Gauge ID and metadata on second line */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
          <span style={{ fontWeight: '600', color: 'var(--color-gray-900)' }}>
            {(gauge as any)._isSet ? (
              <>
                <Icon name="link" style={{ marginRight: 'var(--space-1)' }} />
                {(gauge as any)._setId}
              </>
            ) : (
              <>
                {getGaugeDisplayName(gauge)}
                {gauge.set_id && (
                  <Icon name="exchange-alt" size="sm" style={{ marginLeft: 'var(--space-1)' }} aria-label="Paired gauge" />
                )}
              </>
            )}
          </span>
          {(gauge as any)._isSet && (
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-primary)',
              fontWeight: '600',
              backgroundColor: 'var(--color-primary-50)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              SET
            </span>
          )}
          {(gauge as any)._isSet && (gauge as any)._hasMixedStatus ? (
            <>
              <Tag size="xs" variant={StatusRules.getStatusBadgeVariant({ ...gauge, status: gauge.status })}>
                GO: {StatusRules.getStatusDisplayText({ ...gauge, status: gauge.status })}
              </Tag>
              <Tag size="xs" variant={StatusRules.getStatusBadgeVariant({ ...gauge, status: (gauge as any)._companionStatus })}>
                NO GO: {StatusRules.getStatusDisplayText({ ...gauge, status: (gauge as any)._companionStatus })}
              </Tag>
            </>
          ) : (
            getStatusBadge()
          )}
          {getSealBadge()}
          {getCalibrationBadge()}
          {(gauge.assigned_to_user_name || (gauge.holder && StatusRules.isCheckedOut(gauge))) && (
            <Tag size="xs" variant="warning">
              <Icon name="lock" /> Out: {gauge.assigned_to_user_name || gauge.checked_out_to || gauge.holder?.name}
            </Tag>
          )}
        </div>
      </div>

      {/* Actions column */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        {/* Show action buttons for gauges that support operations OR have status-based disabled states OR are checked out */}
        {(canCheckout || canReturn || canTransfer || StatusRules.isCheckedOut(gauge) || StatusRules.isPendingQC(gauge) || StatusRules.isOutOfService(gauge) || StatusRules.isCalibrationExpired(gauge) || StatusRules.isSealedWithPendingUnseal(gauge)) && (
          <>
            {StatusRules.isCheckedOut(gauge) ? (
              <>
                {/* Transfer button - show for all checked out items */}
                <Button
                  size="sm"
                  variant="info"
                  onClick={(e) => onOperationClick('transfer', e)}
                  icon={<Icon name="exchange-alt" />}
                >
                  Transfer
                </Button>
                {/* Checkin button */}
                <Button
                  size="sm"
                  variant="success"
                  onClick={(e) => onOperationClick('return', e)}
                  icon={<Icon name="download" />}
                >
                  Checkin
                </Button>
              </>
            ) : StatusRules.isPendingQC(gauge) ? (
              <Button
                size="sm"
                variant="warning"
                onClick={(e) => onOperationClick('qcReview', e)}
                icon={<Icon name="clipboard-check" />}
              >
                Pending QC
              </Button>
            ) : StatusRules.isOutOfService(gauge) ? (
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => onOperationClick('oosReview', e)}
                icon={<Icon name="ban" />}
              >
                Out of Service
              </Button>
            ) : StatusRules.isCalibrationExpired(gauge) ? (
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                icon={<Icon name="exclamation-triangle" />}
              >
                Calibration Due
              </Button>
            ) : StatusRules.isSealedWithPendingUnseal(gauge) ? (
              <Button
                size="sm"
                variant="warning"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                icon={<Icon name="unlock-alt" />}
              >
                Pending Unseal
              </Button>
            ) : canCheckout && (
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => onOperationClick('checkout', e)}
                icon={<Icon name="upload" />}
              >
                Checkout
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
});
