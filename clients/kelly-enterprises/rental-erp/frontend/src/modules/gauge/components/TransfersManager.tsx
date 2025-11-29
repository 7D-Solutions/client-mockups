import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, LoadingSpinner, Badge } from '../../../infrastructure/components';
import { gaugeService } from '../services/gaugeService';
import { useLogger } from '../../../infrastructure/utils/logger';
import { StatusRules } from '../../../infrastructure/business/statusRules';

interface Transfer {
  id: number;
  gauge_id: string;
  from_user_id: number;
  to_user_id: number;
  from_user_name?: string;
  to_user_name?: string;
  status: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

interface TransfersManagerProps {
  className?: string;
  style?: React.CSSProperties;
}

export const TransfersManager: React.FC<TransfersManagerProps> = ({ className, style }) => {
  const logger = useLogger('TransfersManager');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  const loadTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await gaugeService.getTransfers({ status: 'all', user_type: 'all' });
      
      if (response.success && response.data) {
        setTransfers(response.data);
      } else {
        setTransfers([]);
      }
    } catch (error) {
      logger.errorWithStack('Failed to load transfers', error instanceof Error ? error : new Error(String(error)));
      setTransfers([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const handleAcceptTransfer = async (transferId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [transferId]: true }));
      const response = await gaugeService.acceptTransfer(transferId);
      
      if (response.success) {
        logger.info(`Transfer ${transferId} accepted successfully`);
        await loadTransfers(); // Refresh the list
      }
    } catch (error) {
      logger.errorWithStack(`Failed to accept transfer ${transferId}`, error instanceof Error ? error : new Error(String(error)));
    } finally {
      setActionLoading(prev => ({ ...prev, [transferId]: false }));
    }
  };

  const handleRejectTransfer = async (transferId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [transferId]: true }));
      const response = await gaugeService.cancelTransfer(transferId, 'Transfer rejected by user');
      
      if (response.success) {
        logger.info(`Transfer ${transferId} rejected successfully`);
        await loadTransfers(); // Refresh the list
      }
    } catch (error) {
      logger.errorWithStack(`Failed to reject transfer ${transferId}`, error instanceof Error ? error : new Error(String(error)));
    } finally {
      setActionLoading(prev => ({ ...prev, [transferId]: false }));
    }
  };

  // Transfer status logic now centralized in StatusRules

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Transfer Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} style={style}>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CardTitle>Transfer Requests</CardTitle>
          <Button onClick={loadTransfers} size="sm" variant="secondary">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>
            No transfer requests found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                style={{
                  padding: 'var(--space-4)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-background)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-md)', fontWeight: '600' }}>
                      Gauge ID: {transfer.gauge_id}
                    </h4>
                    <p style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                      From: {transfer.from_user_name || `User ${transfer.from_user_id}`} → 
                      To: {transfer.to_user_name || `User ${transfer.to_user_id}`}
                    </p>
                    <p style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-700)' }}>
                      Reason: {transfer.reason}
                    </p>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                      Created: {transfer.created_at ? new Date(transfer.created_at).toLocaleString() : 'Unknown date'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Badge variant={StatusRules.getTransferStatusVariant(transfer.status)}>
                      {transfer.status}
                    </Badge>
                  </div>
                </div>
                
                {StatusRules.isTransferPending(transfer) && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={() => handleRejectTransfer(transfer.id)}
                      disabled={actionLoading[transfer.id]}
                      size="sm"
                      variant="danger"
                    >
                      {actionLoading[transfer.id] ? 'Processing...' : 'Reject'}
                    </Button>
                    <Button
                      onClick={() => handleAcceptTransfer(transfer.id)}
                      disabled={actionLoading[transfer.id]}
                      size="sm"
                      variant="primary"
                    >
                      {actionLoading[transfer.id] ? 'Processing...' : 'Accept'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};