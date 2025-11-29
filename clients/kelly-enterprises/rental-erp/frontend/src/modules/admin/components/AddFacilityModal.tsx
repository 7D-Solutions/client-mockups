import React, { useState, useEffect } from 'react';
import { Modal, Button, TooltipToggle, FormInput, FormCheckbox } from '../../../infrastructure/components';
import type { Facility, CreateFacilityData, UpdateFacilityData } from '../types';

interface AddFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFacilityData | UpdateFacilityData) => Promise<void>;
  facility?: Facility | null;
  mode: 'create' | 'edit';
}

export const AddFacilityModal: React.FC<AddFacilityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  facility,
  mode
}) => {
  const [formData, setFormData] = useState({
    facility_code: '',
    facility_name: '',
    is_active: true,
    display_order: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when facility prop changes
  useEffect(() => {
    if (mode === 'edit' && facility) {
      setFormData({
        facility_code: facility.code,
        facility_name: facility.name,
        is_active: facility.isActive,
        display_order: facility.displayOrder
      });
    } else {
      setFormData({
        facility_code: '',
        facility_name: '',
        is_active: true,
        display_order: 0
      });
    }
    setError('');
  }, [facility, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.facility_code.trim()) {
      setError('Facility code is required');
      return;
    }
    if (!formData.facility_name.trim()) {
      setError('Facility name is required');
      return;
    }

    setLoading(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save facility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Facility' : 'Edit Facility'}
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

          <FormInput
            label="Facility Code"
            value={formData.facility_code}
            onChange={(e) => setFormData({ ...formData, facility_code: e.target.value })}
            required
            placeholder="e.g., main, branch_1"
            maxLength={50}
            tooltip="Unique code identifier for this facility (used in system references)"
          />

          <FormInput
            label="Facility Name"
            value={formData.facility_name}
            onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })}
            required
            placeholder="e.g., Main Facility"
            maxLength={100}
            tooltip="Display name for this facility as it appears to users"
          />

          <FormInput
            label="Display Order"
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            min={0}
            placeholder="0"
            tooltip="Numeric order for sorting facilities in lists and dropdowns (lower numbers appear first)"
          />

          <FormCheckbox
            label="Active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            tooltip="Whether this facility is active and available for selection in the system"
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
            {loading ? 'Saving...' : mode === 'create' ? 'Create Facility' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddFacilityModal;
