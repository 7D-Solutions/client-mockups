import React from 'react';
import { Icon, Card, CardHeader, CardTitle, CardContent, Button } from '../../../infrastructure';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import type { Gauge } from '../types';

interface GaugeUserDashboardProps {
  gauges: Gauge[];
  activeDashboardTab: string;
  onTabChange: (tab: string) => void;
  onNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
  renderGaugeRow: (gauge: Gauge, showCheckoutButton?: boolean) => React.ReactNode;
  currentUser?: any;
}

const GaugeUserDashboard: React.FC<GaugeUserDashboardProps> = ({
  gauges,
  activeDashboardTab,
  onTabChange,
  onNotification,
  onRefresh,
  renderGaugeRow,
  currentUser
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Icon name="users" /> My Gauges
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Dashboard Sub-tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
          <Button
            variant="ghost"
            onClick={() => onTabChange('personal')}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: activeDashboardTab === 'personal' ? '2px solid var(--color-primary)' : 'none',
              color: activeDashboardTab === 'personal' ? 'var(--color-primary)' : 'var(--color-gray-600)',
              fontWeight: activeDashboardTab === 'personal' ? '600' : '400',
              borderRadius: '0'
            }}
          >
            <Icon name="tools" /> My Personal Tools
          </Button>
          <Button
            variant="ghost"
            onClick={() => onTabChange('checked-out')}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: activeDashboardTab === 'checked-out' ? '2px solid var(--color-primary)' : 'none',
              color: activeDashboardTab === 'checked-out' ? 'var(--color-primary)' : 'var(--color-gray-600)',
              fontWeight: activeDashboardTab === 'checked-out' ? '600' : '400',
              borderRadius: '0'
            }}
          >
            <Icon name="sign-out-alt" /> Items I've Checked Out
          </Button>
          <Button
            variant="ghost"
            onClick={() => onTabChange('transfers')}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: activeDashboardTab === 'transfers' ? '2px solid var(--color-primary)' : 'none',
              color: activeDashboardTab === 'transfers' ? 'var(--color-primary)' : 'var(--color-gray-600)',
              fontWeight: activeDashboardTab === 'transfers' ? '600' : '400',
              borderRadius: '0'
            }}
          >
            <Icon name="exchange-alt" /> Pending Transfers
          </Button>
        </div>

        <div>
          {/* Personal Tools */}
          {activeDashboardTab === 'personal' && (
            <div>
              {gauges
                .filter(gauge => EquipmentRules.isEmployeeOwned(gauge))
                .map(gauge => renderGaugeRow(gauge))}
              {gauges.filter(gauge => EquipmentRules.isEmployeeOwned(gauge)).length === 0 && (
                <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>
                  No personal tools assigned to you.
                </p>
              )}
            </div>
          )}

          {/* Checked Out Items */}
          {activeDashboardTab === 'checked-out' && (
            <div>
              {gauges
                .filter(gauge => StatusRules.isCheckedOut(gauge) && gauge.holder?.id === currentUser?.id)
                .map(gauge => renderGaugeRow(gauge))}
              {gauges.filter(gauge => StatusRules.isCheckedOut(gauge) && gauge.holder?.id === currentUser?.id).length === 0 && (
                <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>
                  You currently have no items checked out.
                </p>
              )}
            </div>
          )}

          {/* Pending Transfers */}
          {activeDashboardTab === 'transfers' && (
            <div>
              {gauges
                .filter(gauge => gauge.pending_transfer_id &&
                  (gauge.transfer_to_user_id === currentUser?.id || gauge.transfer_from_user_id === currentUser?.id))
                .map(gauge => renderGaugeRow({
                  ...gauge,
                  has_pending_transfer: !!gauge.pending_transfer_id,
                  pending_transfer: gauge.pending_transfer_id ? {
                    id: gauge.pending_transfer_id,
                    to_user_id: gauge.transfer_to_user_id,
                    from_user_id: gauge.transfer_from_user_id,
                    to_user_name: gauge.transfer_to_user_name,
                    from_user_name: gauge.transfer_from_user_name
                  } : null
                }))}
              {gauges.filter(gauge => gauge.pending_transfer_id &&
                (gauge.transfer_to_user_id === currentUser?.id || gauge.transfer_from_user_id === currentUser?.id)).length === 0 && (
                <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>
                  No pending transfers.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GaugeUserDashboard;
