// Summary cards showing gauge statistics
import React from 'react';
import { Icon } from '../../../infrastructure';
import { useDashboardStats } from '../hooks';

interface SummaryCardsProps {
  gauges?: any[]; // Keep for backward compatibility but not used
}

export const SummaryCards = React.memo(function SummaryCards({ gauges }: SummaryCardsProps) {
  const { stats } = useDashboardStats();

  // Use dashboard statistics directly with safe fallbacks
  // Current = available + checked_out (gauges that are not overdue)
  const currentCount = (stats.available || 0) + (stats.checked_out || 0);
  const dueSoonCount = stats.calibration_due || 0;
  const issuesCount = (stats.out_for_calibration || 0) + (stats.scheduled_calibration || 0);
  const outOfServiceCount = stats.out_of_service || 0;

  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: 'var(--space-4)'
        }}>
          <h3 style={{ margin: '0 0 var(--space-3) 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', color: 'var(--color-primary)' }}>
            <Icon name="check-circle" /> Current
          </h3>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-4xl)', fontWeight: '700', lineHeight: 1, color: 'var(--color-primary)' }}>{currentCount}</span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>gauges</span>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: 'var(--space-4)'
        }}>
          <h3 style={{ margin: '0 0 var(--space-3) 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', color: 'var(--color-primary)' }}>
            <Icon name="clock" /> Due Soon
          </h3>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-4xl)', fontWeight: '700', lineHeight: 1, color: 'var(--color-primary)' }}>{dueSoonCount}</span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>gauges</span>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: 'var(--space-4)'
        }}>
          <h3 style={{ margin: '0 0 var(--space-3) 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', color: 'var(--color-primary)' }}>
            <Icon name="exclamation-triangle" /> Issues
          </h3>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-4xl)', fontWeight: '700', lineHeight: 1, color: 'var(--color-primary)' }}>{issuesCount}</span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>gauges</span>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: outOfServiceCount > 0 ? '2px solid var(--color-danger)' : '1px solid var(--color-border)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: 'var(--space-4)'
        }}>
          <h3 style={{ margin: '0 0 var(--space-3) 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', color: outOfServiceCount > 0 ? 'var(--color-danger)' : 'var(--color-gray-600)' }}>
            <Icon name="ban" /> Out of Service
          </h3>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-4xl)', fontWeight: '700', lineHeight: 1, color: outOfServiceCount > 0 ? 'var(--color-danger)' : 'var(--color-gray-600)' }}>{outOfServiceCount}</span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>gauges</span>
          </div>
        </div>
      </div>
    </div>
  );
});
