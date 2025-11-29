import { Badge, Icon, DetailRow } from '../../../infrastructure/components';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { StatusRules } from '../../../infrastructure/business/statusRules';

interface SealStatusDisplayProps {
  gauge: {
    equipment_type?: string;
    is_sealed?: boolean;
    seal_status?: string;
  };
  variant?: 'detail-row' | 'inline';
}

/**
 * THE ONLY PLACE seal status display logic exists.
 * 
 * Business Rule: Large equipment and hand tools cannot be sealed.
 * Change this ONE file to modify seal status display behavior.
 */
export function SealStatusDisplay({ gauge, variant = 'detail-row' }: SealStatusDisplayProps) {
  // Hide for non-sealable equipment types
  if (!EquipmentRules.canBeSealed(gauge)) {
    return null;
  }

  const isSealed = StatusRules.isSealed(gauge);
  
  const statusBadge = (
    <Badge size="sm" variant={isSealed ? 'success' : 'warning'}>
      <Icon name={isSealed ? 'lock' : 'lock-open'} />
      {isSealed ? ' Sealed' : ' Unsealed'}
    </Badge>
  );

  if (variant === 'detail-row') {
    return <DetailRow label="Seal Status" value={statusBadge} />;
  }

  // Inline variant for legacy components
  return (
    <div style={{ marginBottom: 'var(--space-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Seal Status:</span>
        {statusBadge}
      </div>
    </div>
  );
}