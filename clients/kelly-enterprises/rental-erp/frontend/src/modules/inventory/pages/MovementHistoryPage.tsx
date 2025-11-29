// Movement History Page - Shows audit trail of all inventory movements
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner, Button, Icon, Badge, BackButton } from '../../../infrastructure/components';
import { useToast } from '../../../infrastructure';
import { usePermissions } from '../../../infrastructure/auth/usePermissions';
import { logger } from '../../../infrastructure/utils/logger';
import { inventoryService } from '../services/inventoryService';
import { INVENTORY_PERMISSIONS } from '../permissions';
import type { InventoryMovement } from '../types';

export function MovementHistoryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('');

  // Check permission
  const canViewInventory = hasPermission(INVENTORY_PERMISSIONS.VIEW);

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await inventoryService.getMovements({
        itemType: itemTypeFilter || undefined,
        movementType: movementTypeFilter || undefined,
        limit: 100
      });

      if (response.success && response.data) {
        setMovements(response.data.movements || []);
      }
    } catch (error) {
      logger.error('Failed to load movement history:', error);
      toast.error('Load Error', 'Failed to load movement history');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemTypeFilter, movementTypeFilter]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'created':
        return <Badge variant="success">Created</Badge>;
      case 'transfer':
        return <Badge variant="info">Transfer</Badge>;
      case 'deleted':
        return <Badge variant="danger">Deleted</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case 'gauge':
        return <Badge variant="primary">Gauge</Badge>;
      case 'tool':
        return <Badge variant="warning">Tool</Badge>;
      case 'part':
        return <Badge variant="secondary">Part</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Permission check
  if (!canViewInventory) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-5)'
        }}>
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <Icon name="lock" style={{ fontSize: '48px', color: 'var(--color-error)', marginBottom: 'var(--space-4)' }} />
              <h2 style={{ color: 'var(--color-gray-900)', marginBottom: 'var(--space-2)' }}>
                Access Denied
              </h2>
              <p style={{ color: 'var(--color-gray-600)' }}>
                You do not have permission to view inventory data.
              </p>
              <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
                Contact your administrator to request access.
              </p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <BackButton onClick={() => navigate(-1)} />
        <h1 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: '700',
          color: 'var(--color-gray-900)',
          margin: 'var(--space-4) 0 var(--space-2) 0'
        }}>
          Movement History
        </h1>
        <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--font-size-md)' }}>
          Audit trail of all inventory movements
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            fontWeight: '500',
            marginBottom: 'var(--space-2)',
            color: 'var(--color-gray-700)'
          }}>
            Item Type
          </label>
          <select
            value={itemTypeFilter}
            onChange={(e) => setItemTypeFilter(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            <option value="">All Types</option>
            <option value="gauge">Gauges</option>
            <option value="tool">Tools</option>
            <option value="part">Parts</option>
            <option value="equipment">Equipment</option>
            <option value="material">Materials</option>
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            fontWeight: '500',
            marginBottom: 'var(--space-2)',
            color: 'var(--color-gray-700)'
          }}>
            Movement Type
          </label>
          <select
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            <option value="">All Movements</option>
            <option value="created">Created</option>
            <option value="transfer">Transfer</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setItemTypeFilter('');
              setMovementTypeFilter('');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Movements Table */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-5)'
      }}>
          {movements.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{
                      padding: 'var(--space-3)',
                      textAlign: 'left',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: '600',
                      color: 'var(--color-gray-700)'
                    }}>
                      Date & Time
                    </th>
                    <th style={{
                      padding: 'var(--space-3)',
                      textAlign: 'left',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: '600',
                      color: 'var(--color-gray-700)'
                    }}>
                      Item
                    </th>
                    <th style={{
                      padding: 'var(--space-3)',
                      textAlign: 'center',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: '600',
                      color: 'var(--color-gray-700)'
                    }}>
                      Type
                    </th>
                    <th style={{
                      padding: 'var(--space-3)',
                      textAlign: 'center',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: '600',
                      color: 'var(--color-gray-700)'
                    }}>
                      Movement
                    </th>
                    <th style={{
                      padding: 'var(--space-3)',
                      textAlign: 'left',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: '600',
                      color: 'var(--color-gray-700)'
                    }}>
                      From → To
                    </th>
                    <th style={{
                      padding: 'var(--space-3)',
                      textAlign: 'left',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: '600',
                      color: 'var(--color-gray-700)'
                    }}>
                      Moved By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
                        {new Date(movement.moved_at).toLocaleString()}
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontWeight: '600' }}>
                        {movement.item_identifier}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                        {getItemTypeBadge(movement.item_type)}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                        {getMovementTypeBadge(movement.movement_type)}
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ color: 'var(--color-gray-600)' }}>
                            {movement.from_location ? movement.from_location.toUpperCase() : '—'}
                          </span>
                          <Icon name="arrow-right" style={{ color: 'var(--color-gray-400)' }} />
                          <span style={{ fontWeight: '600' }}>
                            {movement.to_location ? movement.to_location.toUpperCase() : '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                        {movement.moved_by_name || movement.moved_by_username || `User #${movement.moved_by}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <Icon name="history" style={{ fontSize: '48px', color: 'var(--color-gray-400)', marginBottom: 'var(--space-4)' }} />
              <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--font-size-lg)' }}>
                No movements found
              </p>
              <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
                Try adjusting your filters or check back later
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
 
