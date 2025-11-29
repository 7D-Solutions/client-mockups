// Add Location Modal Component
import { useState } from 'react';
import { Modal, Button, FormInput, FormSelect, FormTextarea, useToast, FormSection, TooltipToggle } from '../../../infrastructure/components';
import { apiClient } from '../../../infrastructure/api/client';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOCATION_TYPES = [
  { value: 'bin', label: 'Bin' },
  { value: 'shelf', label: 'Shelf' },
  { value: 'rack', label: 'Rack' },
  { value: 'cabinet', label: 'Cabinet' },
  { value: 'drawer', label: 'Drawer' },
  { value: 'room', label: 'Room' },
  { value: 'other', label: 'Other' }
];

export function AddLocationModal({ isOpen, onClose }: AddLocationModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkMethod, setBulkMethod] = useState<'range' | 'list'>('range');

  // Single mode state
  const [formData, setFormData] = useState({
    location_code: '',
    location_type: 'bin' as string
  });

  // Bulk mode state - Range
  const [prefix, setPrefix] = useState('');
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(10);
  const [bulkLocationType, setBulkLocationType] = useState('bin');

  // Bulk mode state - List
  const [locationsList, setLocationsList] = useState('');

  const generatePreview = (): string[] => {
    if (mode === 'single') return [];

    if (bulkMethod === 'range') {
      const preview = [];
      for (let i = startNum; i <= Math.min(endNum, startNum + 99); i++) {
        preview.push(`${prefix}${i.toString().padStart(3, '0')}`);
      }
      return preview;
    } else {
      return locationsList
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
  };

  const preview = generatePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'single') {
        // Single location creation
        const response = await apiClient.post('/storage-locations', formData);

        if (response.success) {
          toast.success('Location Created', 'Storage location created successfully');
          setFormData({ location_code: '', location_type: 'bin' });
          onClose();
        }
      } else {
        // Bulk location creation
        let locations;

        if (bulkMethod === 'range') {
          locations = [];
          for (let i = startNum; i <= endNum; i++) {
            locations.push({
              location_code: `${prefix}${i.toString().padStart(3, '0')}`,
              location_type: bulkLocationType,
              description: null,
              display_order: i
            });
          }
        } else {
          locations = locationsList
            .split('\n')
            .map((line, _index) => line.trim())
            .filter(line => line.length > 0)
            .map((code, index) => ({
              location_code: code,
              location_type: bulkLocationType,
              description: null,
              display_order: index
            }));
        }

        if (locations.length === 0) {
          toast.error('No Locations', 'Please specify at least one location');
          setIsSubmitting(false);
          return;
        }

        if (locations.length > 100) {
          toast.error('Too Many Locations', 'Maximum 100 locations can be created at once');
          setIsSubmitting(false);
          return;
        }

        const response = await apiClient.post('/storage-locations/bulk', { locations });

        if (response.success) {
          toast.success('Locations Created', `Created ${locations.length} storage location(s)`);
          onClose();
        }
      }
    } catch (error: any) {
      console.error('Failed to create location:', error);
      toast.error('Create Failed', error.message || 'Failed to create storage location');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Storage Location"
      size={mode === 'bulk' ? 'lg' : 'sm'}
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <TooltipToggle />

          {/* Mode Selection */}
          <FormSection title="Creation Mode">
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                type="button"
                variant={mode === 'single' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setMode('single')}
              >
                Single Location
              </Button>
              <Button
                type="button"
                variant={mode === 'bulk' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setMode('bulk')}
              >
                Bulk Add
              </Button>
            </div>
          </FormSection>

          {/* Single Location Form */}
          {mode === 'single' && (
            <FormSection title="Location Details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <FormInput
                  label="Location Code"
                  value={formData.location_code}
                  onChange={(e) => setFormData({ ...formData, location_code: e.target.value })}
                  placeholder="e.g., A1, BIN-001, SHELF-1-2"
                  required
                  maxLength={50}
                  tooltip="Unique identifier for this storage location (visible on labels and in the system)"
                />

                <FormSelect
                  label="Location Type"
                  value={formData.location_type}
                  onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                  required
                  tooltip="Physical type of storage location (bin, shelf, rack, cabinet, drawer, room, or other)"
                >
                  {LOCATION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </FormSection>
          )}

          {/* Bulk Add Form */}
          {mode === 'bulk' && (
            <>
              <FormSection title="Bulk Method">
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      type="radio"
                      name="bulkMethod"
                      value="range"
                      checked={bulkMethod === 'range'}
                      onChange={() => setBulkMethod('range')}
                    />
                    Range (Sequential Numbers)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      type="radio"
                      name="bulkMethod"
                      value="list"
                      checked={bulkMethod === 'list'}
                      onChange={() => setBulkMethod('list')}
                    />
                    List (One per line)
                  </label>
                </div>
              </FormSection>

              <FormSection title="Location Settings">
                <FormSelect
                  label="Location Type"
                  value={bulkLocationType}
                  onChange={(e) => setBulkLocationType(e.target.value)}
                  required
                  tooltip="Physical type of storage location to apply to all locations being created in bulk"
                >
                  {LOCATION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </FormSelect>
              </FormSection>

              {/* Range Method Fields */}
              {bulkMethod === 'range' && (
                <FormSection title="Range Configuration">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <FormInput
                      label="Prefix"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="e.g., BIN-A-, SHELF-"
                      required
                      maxLength={47}
                      tooltip="Text prefix that will be added before each sequential number (e.g., 'BIN-A-' creates BIN-A-001, BIN-A-002, etc.)"
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                      <FormInput
                        type="number"
                        label="Start Number"
                        value={startNum.toString()}
                        onChange={(e) => setStartNum(parseInt(e.target.value) || 1)}
                        min={1}
                        required
                        tooltip="First number in the sequence (will be zero-padded to 3 digits)"
                      />

                      <FormInput
                        type="number"
                        label="End Number"
                        value={endNum.toString()}
                        onChange={(e) => setEndNum(parseInt(e.target.value) || 1)}
                        min={startNum}
                        max={startNum + 99}
                        required
                        tooltip="Last number in the sequence (maximum 100 locations per batch)"
                      />
                    </div>

                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', margin: 0 }}>
                      Example: Prefix "BIN-A-" with range 1-10 will create BIN-A-001, BIN-A-002, ..., BIN-A-010
                    </p>
                  </div>
                </FormSection>
              )}

              {/* List Method Fields */}
              {bulkMethod === 'list' && (
                <FormSection title="Location Codes">
                  <FormTextarea
                    label="Enter location codes (one per line)"
                    value={locationsList}
                    onChange={(e) => setLocationsList(e.target.value)}
                    placeholder="BIN-A-001&#10;BIN-A-002&#10;SHELF-1-1&#10;SHELF-1-2"
                    rows={10}
                    required
                    tooltip="Enter location codes one per line (maximum 100 locations). Each code must be unique within the system."
                  />

                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', margin: 0 }}>
                    Enter one location code per line. Maximum 100 locations.
                  </p>
                </FormSection>
              )}

              {/* Preview Section */}
              {preview.length > 0 && (
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'var(--color-gray-50)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-default)',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '600',
                    marginBottom: 'var(--space-2)',
                    color: 'var(--color-gray-700)'
                  }}>
                    Preview ({preview.length} location{preview.length !== 1 ? 's' : ''}):
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-gray-600)',
                    fontFamily: 'monospace'
                  }}>
                    {preview.slice(0, 20).map((code, i) => (
                      <div key={i}>{code}</div>
                    ))}
                    {preview.length > 20 && (
                      <div style={{ fontStyle: 'italic' }}>... and {preview.length - 20} more</div>
                    )}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {preview.length > 100 && (
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'var(--color-warning-light)',
                  border: '1px solid var(--color-warning)',
                  borderRadius: 'var(--radius-default)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-warning-dark)'
                }}>
                  ⚠️ Maximum 100 locations allowed. Only the first 100 will be created.
                </div>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Actions>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || (mode === 'bulk' && preview.length === 0)}
          >
            {isSubmitting
              ? 'Creating...'
              : mode === 'bulk'
                ? `Create ${Math.min(preview.length, 100)} Location${preview.length !== 1 ? 's' : ''}`
                : 'Create Location'}
          </Button>
        </Modal.Actions>
      </form>
    </Modal>
  );
}
