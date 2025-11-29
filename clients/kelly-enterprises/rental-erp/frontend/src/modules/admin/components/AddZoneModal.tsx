import React, { useState, useEffect } from 'react';
import { Modal, Button, TooltipToggle, FormInput, FormCheckbox } from '../../../infrastructure/components';
import type { Zone, Building, CreateZoneData, UpdateZoneData } from '../types';

interface AddZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateZoneData | UpdateZoneData) => Promise<void>;
  zone?: Zone | null;
  buildings: Building[];
  mode: 'create' | 'edit';
}

export const AddZoneModal: React.FC<AddZoneModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  zone,
  buildings,
  mode
}) => {
  const [formData, setFormData] = useState({
    zone_code: '',
    zone_name: '',
    building_id: 0,
    is_active: true,
    display_order: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when zone prop changes
  useEffect(() => {
    if (mode === 'edit' && zone) {
      setFormData({
        zone_code: zone.code,
        zone_name: zone.name,
        building_id: zone.buildingId,
        is_active: zone.isActive,
        display_order: zone.displayOrder
      });
    } else {
      setFormData({
        zone_code: '',
        zone_name: '',
        building_id: buildings.length > 0 ? buildings[0].id : 0,
        is_active: true,
        display_order: 0
      });
    }
    setError('');
  }, [zone, buildings, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.zone_code.trim()) {
      setError('Zone code is required');
      return;
    }
    if (!formData.zone_name.trim()) {
      setError('Zone name is required');
      return;
    }
    if (!formData.building_id || formData.building_id === 0) {
      setError('Please select a building');
      return;
    }

    setLoading(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save zone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Zone' : 'Edit Zone'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <TooltipToggle />

          {error && (
            <div style={{
              padding: 'var(--space-3)',
              background: 'var(--color-bg-error)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-2)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)'
            }}>
              Building <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <select
              value={formData.building_id}
              onChange={(e) => setFormData({ ...formData, building_id: parseInt(e.target.value) })}
              required
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-base)',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)'
              }}
            >
              <option value={0}>Select a building...</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>
                  {building.name} ({building.code})
                  {building.facilityName && ` - ${building.facilityName}`}
                </option>
              ))}
            </select>
          </div>

          <FormInput
            label="Zone Code"
            value={formData.zone_code}
            onChange={(e) => setFormData({ ...formData, zone_code: e.target.value })}
            required
            placeholder="e.g., receiving, qc, shop_floor"
            maxLength={50}
            tooltip="Unique code identifier for this zone (used in system references)"
          />

          <FormInput
            label="Zone Name"
            value={formData.zone_name}
            onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
            required
            placeholder="e.g., Receiving, Quality Control, Shop Floor"
            maxLength={100}
            tooltip="Display name for this zone as it appears to users"
          />

          <FormInput
            label="Display Order"
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            min={0}
            placeholder="0"
            tooltip="Numeric order for sorting zones in lists and dropdowns (lower numbers appear first)"
          />

          <FormCheckbox
            label="Active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            tooltip="Whether this zone is active and available for selection in the system"
          />
        </div>

        <div style={{
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--color-border-default)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-3)'
        }}>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : mode === 'create' ? 'Create Zone' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddZoneModal;
