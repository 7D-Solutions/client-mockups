import React, { useState, useEffect } from 'react';
import { Modal, Button, TooltipToggle, FormInput, FormCheckbox } from '../../../infrastructure/components';
import type { Building, Facility, CreateBuildingData, UpdateBuildingData } from '../types';

interface AddBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBuildingData | UpdateBuildingData) => Promise<void>;
  building?: Building | null;
  facilities: Facility[];
  mode: 'create' | 'edit';
}

export const AddBuildingModal: React.FC<AddBuildingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  building,
  facilities,
  mode
}) => {
  const [formData, setFormData] = useState({
    building_code: '',
    building_name: '',
    facility_id: 0,
    is_active: true,
    display_order: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when building prop changes
  useEffect(() => {
    if (mode === 'edit' && building) {
      setFormData({
        building_code: building.code,
        building_name: building.name,
        facility_id: building.facilityId,
        is_active: building.isActive,
        display_order: building.displayOrder
      });
    } else {
      setFormData({
        building_code: '',
        building_name: '',
        facility_id: facilities.length > 0 ? facilities[0].id : 0,
        is_active: true,
        display_order: 0
      });
    }
    setError('');
  }, [building, facilities, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.building_code.trim()) {
      setError('Building code is required');
      return;
    }
    if (!formData.building_name.trim()) {
      setError('Building name is required');
      return;
    }
    if (!formData.facility_id || formData.facility_id === 0) {
      setError('Please select a facility');
      return;
    }

    setLoading(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save building');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Building' : 'Edit Building'}
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
              Facility <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <select
              value={formData.facility_id}
              onChange={(e) => setFormData({ ...formData, facility_id: parseInt(e.target.value) })}
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
              <option value={0}>Select a facility...</option>
              {facilities.map(facility => (
                <option key={facility.id} value={facility.id}>
                  {facility.name} ({facility.code})
                </option>
              ))}
            </select>
          </div>

          <FormInput
            label="Building Code"
            value={formData.building_code}
            onChange={(e) => setFormData({ ...formData, building_code: e.target.value })}
            required
            placeholder="e.g., building_1, west_wing"
            maxLength={50}
            tooltip="Unique code identifier for this building (used in system references)"
          />

          <FormInput
            label="Building Name"
            value={formData.building_name}
            onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
            required
            placeholder="e.g., Building 1, West Wing"
            maxLength={100}
            tooltip="Display name for this building as it appears to users"
          />

          <FormInput
            label="Display Order"
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            min={0}
            placeholder="0"
            tooltip="Numeric order for sorting buildings in lists and dropdowns (lower numbers appear first)"
          />

          <FormCheckbox
            label="Active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            tooltip="Whether this building is active and available for selection in the system"
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
            {loading ? 'Saving...' : mode === 'create' ? 'Create Building' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddBuildingModal;
