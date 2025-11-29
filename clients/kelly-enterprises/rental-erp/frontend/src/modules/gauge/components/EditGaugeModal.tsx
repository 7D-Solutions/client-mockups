import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  CancelButton,
  SaveButton,
  Button,
  FormInput,
  FormTextarea,
  StorageLocationSelect,
  FormSection,
  DetailRow,
  Badge,
  Icon,
  Alert,
  useToast,
  TooltipToggle,
  SearchableCombobox,
  CalibrationFrequencySelect
} from '../../../infrastructure';
import type { ComboboxOption } from '../../../infrastructure';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLogger } from '../../../infrastructure/utils/logger';
import { gaugeService } from '../../gauge/services/gaugeService';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import type { Gauge } from '../../gauge/types';
import styles from './EditGaugeModal.module.css';

interface EditGaugeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFullClose?: () => void; // For X button - close all modals
  gauge: Gauge;
  onViewSet?: (setId: string) => void;
}

export function EditGaugeModal({ isOpen, onClose, onFullClose, gauge, onViewSet }: EditGaugeModalProps) {
  const toast = useToast();
  const logger = useLogger('EditGaugeModal');
  const queryClient = useQueryClient();

  // Check if gauge is part of a set
  const isPartOfSet = Boolean(gauge.set_id && EquipmentRules.isThreadGauge(gauge));

  // MUTABLE FIELDS ONLY (based on backend ALLOWED_UPDATE_FIELDS)
  // Immutable fields for ALL: gauge_id, equipment_type, ownership_type, etc.
  // Additional immutable for SET MEMBERS: storage_location (managed at set level), category, type
  // Mutable fields: name, manufacturer, model_number, serial_number, calibration_frequency_days, notes, measurement_range_min, measurement_range_max, storage_location (if not in set), status
  const initialFormData = useMemo(() => ({
    name: gauge.name || '',
    manufacturer: gauge.manufacturer || '',
    model_number: gauge.model_number || '',
    serial_number: gauge.serial_number || '',
    calibration_frequency_days: gauge.calibration_frequency_days || '',
    notes: gauge.notes || '',
    measurement_range_min: gauge.measurement_range_min || '',
    measurement_range_max: gauge.measurement_range_max || '',
    storage_location: gauge.storage_location || '',
    status: gauge.status || 'available'
  }), [gauge]);

  const [formData, setFormData] = useState(initialFormData);
  const [manufacturers, setManufacturers] = useState<ComboboxOption[]>([]);
  const [isLoadingManufacturers, setIsLoadingManufacturers] = useState(false);

  // Fetch manufacturers list when modal opens
  useEffect(() => {
    const fetchManufacturers = async () => {
      if (isOpen && manufacturers.length === 0) {
        try {
          setIsLoadingManufacturers(true);
          const response = await gaugeService.getManufacturers();
          const manufacturerOptions = response.map((mfr: string) => ({
            id: mfr,
            label: mfr,
            value: mfr
          }));
          setManufacturers(manufacturerOptions);
        } catch (error) {
          logger.errorWithStack('Failed to load manufacturers', error instanceof Error ? error : new Error(String(error)));
          // Continue without manufacturers list - combobox allows custom entry
        } finally {
          setIsLoadingManufacturers(false);
        }
      }
    };

    fetchManufacturers();
  }, [isOpen, manufacturers.length, logger]);

  // Reset form data when modal opens or gauge changes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen, initialFormData]);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return Object.keys(formData).some(
      key => formData[key as keyof typeof formData] !== initialFormData[key as keyof typeof initialFormData]
    );
  }, [formData, initialFormData]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Gauge>) => {
      const gaugeId = gauge.gauge_id;
      const result = await gaugeService.updateGauge(gaugeId, data);
      return result;
    },
    onSuccess: async () => {
      toast.success('Success', 'Gauge updated successfully');
      await queryClient.invalidateQueries({ queryKey: ['gauge', gauge.id] });
      await queryClient.invalidateQueries({ queryKey: ['gauges'] });
      // Close modal - parent component will reload data
      onClose();
    },
    onError: (error: Error) => {
      toast.error('Update Failed', error.message || 'Failed to update gauge');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent form from being unmounted while processing
    if (updateMutation.isPending) {
      return;
    }

    // Don't save if there are no changes
    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      // Only send MUTABLE fields that have actually changed
      const updateData: Partial<Gauge> = {};

      // Only include changed mutable fields
      if (formData.name !== initialFormData.name) {
        updateData.name = formData.name || undefined;
      }
      if (formData.manufacturer !== initialFormData.manufacturer) {
        updateData.manufacturer = formData.manufacturer || undefined;
      }
      if (formData.model_number !== initialFormData.model_number) {
        updateData.model_number = formData.model_number || undefined;
      }
      if (formData.serial_number !== initialFormData.serial_number) {
        updateData.serial_number = formData.serial_number || undefined;
      }
      if (formData.notes !== initialFormData.notes) {
        updateData.notes = formData.notes || undefined;
      }
      if (formData.status !== initialFormData.status) {
        updateData.status = formData.status;
      }

      // Handle numeric fields with proper type conversion
      if (formData.calibration_frequency_days !== initialFormData.calibration_frequency_days) {
        updateData.calibration_frequency_days = formData.calibration_frequency_days ? parseInt(formData.calibration_frequency_days) : undefined;
      }
      if (formData.measurement_range_min !== initialFormData.measurement_range_min) {
        updateData.measurement_range_min = formData.measurement_range_min ? parseFloat(formData.measurement_range_min) : undefined;
      }
      if (formData.measurement_range_max !== initialFormData.measurement_range_max) {
        updateData.measurement_range_max = formData.measurement_range_max ? parseFloat(formData.measurement_range_max) : undefined;
      }
      // Only allow storage_location changes if not part of a set
      if (!isPartOfSet && formData.storage_location !== initialFormData.storage_location) {
        updateData.storage_location = formData.storage_location || undefined;
      }

      updateMutation.mutate(updateData);
    } catch (error) {
      logger.errorWithStack('Form submission failed', error instanceof Error ? error : new Error(String(error)));
      toast.error('Update Failed', 'Failed to update gauge');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onFullClose={onFullClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span>{`Edit Gauge: ${gauge.name}`}</span>
          {isPartOfSet && (
            <Badge variant="info" size="sm">
              <Icon name="link" /> Part of Set {gauge.set_id}
            </Badge>
          )}
        </div>
      }
      size="lg"
      noScroll={true}
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body scrollable={true}>
          <TooltipToggle />

          {/* Two-column grid layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {/* Column 1: Basic Information & Set Information */}
            <div>
              {/* Basic Information */}
              <FormSection title="Basic Information">
                <FormInput
                  label="Name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Gauge name"
                  tooltip="Descriptive name to identify this gauge"
                />

                <FormInput
                  label="Category"
                  value={gauge.category_name || EquipmentRules.getDisplayName(gauge)}
                  disabled={isPartOfSet}
                  tooltip={isPartOfSet ? 'Cannot change category for gauges in a set' : 'Equipment category classification'}
                  onChange={() => {}}
                />

                <FormInput
                  label="Type"
                  value={EquipmentRules.getOwnershipTypeDisplay(gauge)}
                  disabled={isPartOfSet}
                  tooltip={isPartOfSet ? 'Cannot change ownership type for gauges in a set' : 'Ownership classification (Company-owned, Customer-owned, Vendor-owned)'}
                  onChange={() => {}}
                />
              </FormSection>

              {/* Set Information (for set members only) */}
              {isPartOfSet && (
                <FormSection title="Set Information (Read-Only)">
                  <FormInput
                    label="Set ID"
                    value={gauge.set_id || ''}
                    disabled
                    tooltip="Use 'Unpair Set' on set detail page"
                    onChange={() => {}}
                  />

                  <FormInput
                    label="Location"
                    value={gauge.storage_location}
                    disabled
                    tooltip="Location managed at set level - use 'View Set'"
                    onChange={() => {}}
                  />
                </FormSection>
              )}
            </div>

            {/* Column 2: Specifications */}
            <div>
              <FormSection title="Specifications">
                <FormInput
                  label="Serial Number (S/N)"
                  value={formData.serial_number}
                  onChange={(e) => handleChange('serial_number', e.target.value.toUpperCase())}
                  placeholder="Enter serial number"
                  required
                  tooltip="Unique identifier for this specific gauge unit"
                />

                <FormInput
                  label="Model Number"
                  value={formData.model_number}
                  onChange={(e) => handleChange('model_number', e.target.value)}
                  placeholder="Model number"
                  tooltip="Manufacturer's model designation for this gauge"
                />

                <SearchableCombobox
                  label="Manufacturer"
                  options={manufacturers}
                  value={formData.manufacturer}
                  onChange={(value) => handleChange('manufacturer', value)}
                  placeholder={isLoadingManufacturers ? "Loading..." : "Type to search or add new..."}
                  disabled={isLoadingManufacturers}
                  allowCustom={true}
                  customOptionLabel='Add "{value}" as new manufacturer'
                  tooltip="Company that manufactured this gauge - select existing or type new"
                />
              </FormSection>

              {/* Thread Specifications (read-only for thread gauges) */}
              {EquipmentRules.isThreadGauge(gauge) && gauge.thread_size && (
                <FormSection title="Thread Specifications (Read-Only)">
                  <FormInput
                    label="Thread Size"
                    value={gauge.thread_size || ''}
                    disabled
                    tooltip="Cannot edit thread specs for paired gauges"
                    onChange={() => {}}
                  />

                  <FormInput
                    label="Thread Type"
                    value={gauge.thread_type || ''}
                    disabled
                    tooltip="Cannot edit thread specs for paired gauges"
                    onChange={() => {}}
                  />

                  <FormInput
                    label="Thread Class"
                    value={gauge.thread_class || ''}
                    disabled
                    tooltip="Cannot edit thread specs for paired gauges"
                    onChange={() => {}}
                  />
                </FormSection>
              )}
            </div>

            {/* Full-width sections - span both columns */}
            {!isPartOfSet && (
              <div style={{ gridColumn: '1 / -1' }}>
                <FormSection title="Location">
                  <StorageLocationSelect
                    label="Storage Location"
                    value={formData.storage_location}
                    onChange={(value) => handleChange('storage_location', value)}
                    placeholder="Select location..."
                    required
                  />
                </FormSection>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <FormSection title="Calibration Information">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                    <CalibrationFrequencySelect
                      value={formData.calibration_frequency_days}
                      onChange={(value) => handleChange('calibration_frequency_days', value)}
                      categoryDefault={gauge.default_calibration_days}
                      label="Frequency (days)"
                      tooltip="Number of days between required calibrations"
                    />

                    <FormInput
                      label="Due Date"
                      value={gauge.calibration_due_date ? new Date(gauge.calibration_due_date).toLocaleDateString() : 'N/A'}
                      disabled
                      tooltip="System-managed based on unseal/service events"
                      onChange={() => {}}
                    />

                    <FormInput
                      label="Last Date"
                      value={gauge.last_calibration_date ? new Date(gauge.last_calibration_date).toLocaleDateString() : 'N/A'}
                      disabled
                      tooltip="System-managed based on unseal/service events"
                      onChange={() => {}}
                    />
                  </div>
              </FormSection>
            </div>

          </div>

          {/* Notes section - outside grid for full width */}
          <FormSection title="Additional Information">
            <FormTextarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Condition observations, damage reports, etc."
              rows={3}
              tooltip="Additional information such as condition observations, damage reports, or special handling instructions"
            />
          </FormSection>
        </Modal.Body>

        <Modal.Actions>
          <SaveButton
            type="submit"
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending || !hasChanges}
          />
          <CancelButton
            onClick={onClose}
            disabled={updateMutation.isPending}
          />
        </Modal.Actions>
      </form>
    </Modal>
  );
}