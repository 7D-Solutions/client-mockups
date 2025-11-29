import React, { useState, useEffect } from 'react';
import { Modal, Button, CloseButton, FormSection, FormTextarea, DetailRow, Badge, Icon } from '../../../infrastructure/components';
import { StorageLocationSelect } from '../../../infrastructure/components/StorageLocationSelect';
import { apiClient } from '../../../infrastructure/api/client';
import styles from './EditSetModal.module.css';

interface EditSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  setData: {
    set_id: string;
    storage_location?: string;
    notes?: string;
    goGauge: any;
    nogoGauge: any;
  };
  onSuccess?: () => void;
}

export const EditSetModal: React.FC<EditSetModalProps> = ({
  isOpen,
  onClose,
  setData,
  onSuccess
}) => {
  const [storageLocation, setStorageLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with set data
  useEffect(() => {
    if (isOpen && setData) {
      setStorageLocation(setData.storage_location || '');
      setNotes(setData.notes || '');
      setError(null);
    }
  }, [isOpen, setData]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Validate at least one field is provided
      if (!storageLocation && !notes) {
        setError('Please provide at least one field to update');
        return;
      }

      const updateData: any = {};
      if (storageLocation) {
        updateData.storage_location = storageLocation;
      }
      if (notes !== setData.notes) {
        updateData.notes = notes;
      }

      await apiClient.put(`/gauges/v2/sets/${setData.set_id}`, updateData);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update gauge set');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={`Edit Set ${setData?.set_id}`} size="md">
      <Modal.Body>
        <div className={styles.modalContent}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* Gauge Members Card */}
          <div className={styles.gaugeMembersCard}>
            <div className={styles.cardHeader}>
              <Icon name="link" />
              <span>Gauge Set Members</span>
            </div>

            <div className={styles.gaugeGrid}>
              {/* GO Gauge */}
              <div className={styles.gaugeCard}>
                <div className={styles.gaugeCardHeader}>
                  <Badge variant="success" size="sm">GO</Badge>
                  <span className={styles.gaugeLabel}>Gauge A</span>
                </div>
                <div className={styles.gaugeId}>
                  {setData?.goGauge?.gauge_id}
                </div>
              </div>

              {/* NO GO Gauge */}
              <div className={styles.gaugeCard}>
                <div className={styles.gaugeCardHeader}>
                  <Badge variant="danger" size="sm">NO GO</Badge>
                  <span className={styles.gaugeLabel}>Gauge B</span>
                </div>
                <div className={styles.gaugeId}>
                  {setData?.nogoGauge?.gauge_id}
                </div>
              </div>
            </div>
          </div>

          {/* Editable Properties */}
          <FormSection title="Set Properties">
            <div className={styles.formFields}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>
                  <Icon name="map-marker-alt" />
                  <span>Storage Location</span>
                </div>
                <StorageLocationSelect
                  value={storageLocation}
                  onChange={setStorageLocation}
                  placeholder="Select storage location..."
                  required={false}
                />
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>
                  <Icon name="sticky-note" />
                  <span>Notes</span>
                </div>
                <FormTextarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add set-level notes (applies to both gauges)..."
                />
              </div>
            </div>
          </FormSection>
        </div>
      </Modal.Body>

      <Modal.Actions>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="primary"
          icon={<Icon name="save" />}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <CloseButton onClick={handleCancel} disabled={isSaving} />
      </Modal.Actions>
    </Modal>
  );
};
