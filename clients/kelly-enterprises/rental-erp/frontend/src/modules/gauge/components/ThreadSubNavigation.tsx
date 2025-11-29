import React, { useMemo } from 'react';
import { Badge, Button } from '../../../infrastructure';

interface Gauge {
  id: number;
  serial_number: string;
  type: string;
  size: string;
  status: string;
  storage_location: string;
  last_calibration?: string;
  next_calibration_due?: string;
  checked_out_to?: string;
  checked_out_date?: string;
  created_at: string;
}

interface ThreadSubNavigationProps {
  activeSubTab: 'all' | 'ring' | 'plug';
  onSubTabChange: (subTab: 'all' | 'ring' | 'plug') => void;
  gauges: Gauge[];
  filteredCount: number;
}

export const ThreadSubNavigation: React.FC<ThreadSubNavigationProps> = ({
  activeSubTab,
  onSubTabChange,
  gauges,
  filteredCount
}) => {
  // Calculate counts for each sub-tab
  const subTabCounts = useMemo(() => {
    const threadGauges = gauges.filter(gauge => {
      const type = gauge.type.toLowerCase();
      return type.includes('thread') || type.includes('ring') || type.includes('plug') ||
             type.includes('screw') || type.includes('tap');
    });

    return {
      all: threadGauges.length,
      ring: threadGauges.filter(gauge => {
        const type = gauge.type.toLowerCase();
        return type.includes('ring') || type.includes('thread ring');
      }).length,
      plug: threadGauges.filter(gauge => {
        const type = gauge.type.toLowerCase();
        return type.includes('plug') || type.includes('thread plug') || type.includes('screw plug');
      }).length
    };
  }, [gauges]);

  const subTabs = [
    { key: 'all' as const, label: 'All Thread', count: subTabCounts.all },
    { key: 'ring' as const, label: 'Ring Gauges', count: subTabCounts.ring },
    { key: 'plug' as const, label: 'Plug Gauges', count: subTabCounts.plug }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      marginBottom: 'var(--space-4)',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <span style={{
            width: '4px',
            height: '20px',
            backgroundColor: 'var(--color-primary)',
            borderRadius: 'var(--radius-sm)'
          }}></span>
          <h4 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>Thread Gauge Types</h4>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {subTabs.map(({ key, label, count }) => (
            <Button
              key={key}
              variant={activeSubTab === key ? "primary" : "ghost"}
              onClick={() => onSubTabChange(key)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeSubTab === key ? 'var(--color-primary)' : 'transparent',
                color: activeSubTab === key ? 'white' : 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontWeight: activeSubTab === key ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              {label}
              <Badge variant={activeSubTab === key ? 'default' : 'secondary'} size="sm">
                {count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--color-border)',
        marginBottom: 'var(--space-3)'
      }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
          Filter by thread gauge type for specialized inventory management
        </span>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-primary)' }}>
          {activeSubTab === 'all' ? filteredCount : subTabCounts[activeSubTab]} items shown
        </span>
      </div>

      {/* Quick info badges */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Badge variant="success">
          🔧 Precision Threading
        </Badge>
        <Badge variant="info">
          📏 Calibration Tracked
        </Badge>
        <Badge variant="secondary">
          🏷️ Size Standardized
        </Badge>
      </div>
    </div>
  );
};
