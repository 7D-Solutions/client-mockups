// Location Detail Modal Component
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Modal, DetailModal, Button, FormSelect, FormCheckbox, useToast } from '../../../infrastructure/components';
import { apiClient } from '../../../infrastructure/api/client';
import { Building, Zone } from '../types';

interface StorageLocation {
  id: number;
  location_code: string;
  building_id?: number | null;
  building_name?: string;
  zone_id?: number | null;
  zone_name?: string;
  location_type: string;
  is_active: boolean;
  allowed_item_types?: string[];
  created_at: string;
  updated_at: string;
}

interface LocationDetailModalProps {
  isOpen: boolean;
  locationCode?: string;
  location?: StorageLocation;
  onClose: () => void;
  canManage?: boolean;
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

// Tooltip component that renders outside modal using portal
const PortalTooltip = ({ children, targetRef }: { children: React.ReactNode; targetRef: React.RefObject<HTMLDivElement> }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 60, // Position above element
        left: rect.left + rect.width / 2 - 110 // Center horizontally (220px width / 2)
      });
    }
  }, [targetRef]);

  return createPortal(
    // eslint-disable-next-line infrastructure/prefer-infrastructure-components -- This is a tooltip using portal, not a modal overlay
    <span style={{
      visibility: 'visible',
      position: 'fixed',
      zIndex: 10000,
      top: `${position.top}px`,
      left: `${position.left}px`,
      // eslint-disable-next-line infrastructure/no-hardcoded-colors -- Tooltip styling requires specific colors
      backgroundColor: '#333',
      // eslint-disable-next-line infrastructure/no-hardcoded-colors -- Tooltip styling requires specific colors
      color: '#fff',
      textAlign: 'center',
      padding: 'var(--space-2) var(--space-3)',
      borderRadius: '6px',
      fontSize: '12px',
      width: '220px',
      opacity: 1,
      transition: 'opacity 0.3s',
      pointerEvents: 'none'
    }}>
      {children}
    </span>,
    document.body
  );
};

export function LocationDetailModal({ isOpen, locationCode, location: locationProp, onClose, canManage = true }: LocationDetailModalProps) {
  const toast = useToast();
  const [location, setLocation] = useState<StorageLocation | null>(locationProp || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasItems, setHasItems] = useState(false);
  const [itemCount, setItemCount] = useState(0);
  const [itemTypeCounts, setItemTypeCounts] = useState({ gauges: 0, tools: 0, parts: 0 });
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [formData, setFormData] = useState({
    location_code: '',
    building_id: null as number | null,
    zone_id: null as number | null,
    location_type: 'bin',
    is_active: true,
    allowed_item_types: ['gauges', 'tools', 'parts']
  });

  // Refs for tooltip positioning
  const activeCheckboxRef = useRef<HTMLDivElement>(null);
  const gaugesCheckboxRef = useRef<HTMLDivElement>(null);
  const toolsCheckboxRef = useRef<HTMLDivElement>(null);
  const partsCheckboxRef = useRef<HTMLDivElement>(null);
  const deleteButtonRef = useRef<HTMLDivElement>(null);

  // Fetch location data if locationCode is provided or reset when closed
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setLocation(null);
      setIsLoading(false);
      return;
    }

    const fetchLocation = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/storage-locations/by-code/${locationCode}`);
        if (response.success && response.data) {
          setLocation(response.data);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load location details';
        toast.error('Load Failed', errorMessage);
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    if (locationCode) {
      fetchLocation();
    } else if (locationProp) {
      setLocation(locationProp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, locationCode, locationProp, onClose]);

  // Fetch buildings on mount
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await apiClient.get('/api/buildings');
        if (response.success && response.data) {
          setBuildings(response.data);
        }
      } catch {
        // Silently fail - buildings are optional
        setBuildings([]);
      }
    };

    if (isOpen) {
      fetchBuildings();
    }
  }, [isOpen]);

  // Fetch zones when building changes
  useEffect(() => {
    const fetchZones = async () => {
      if (formData.building_id) {
        try {
          const response = await apiClient.get(`/api/zones?buildingId=${formData.building_id}`);
          if (response.success && response.data) {
            setZones(response.data);
          }
        } catch {
          // Silently fail - zones are optional
          setZones([]);
        }
      } else {
        setZones([]);
      }
    };

    fetchZones();
  }, [formData.building_id]);

  // Update form data when location changes
  useEffect(() => {
    if (isOpen && location) {
      setFormData({
        location_code: location.location_code,
        building_id: location.building_id || null,
        zone_id: location.zone_id || null,
        location_type: location.location_type,
        is_active: location.is_active,
        allowed_item_types: location.allowed_item_types || ['gauges', 'tools', 'parts']
      });
    }
  }, [isOpen, location]);

  // Check if location has items
  useEffect(() => {
    const checkItems = async () => {
      if (!location) return;

      try {
        const response = await apiClient.get(`/inventory/reports/by-location/${location.location_code}`);
        if (response.success && response.data) {
          const total = response.data.total_items || 0;
          setHasItems(total > 0);
          setItemCount(total);

          // Track counts by item type
          const items = response.data.items || { gauges: [], tools: [], parts: [] };
          setItemTypeCounts({
            gauges: items.gauges?.length || 0,
            tools: items.tools?.length || 0,
            parts: items.parts?.length || 0
          });
        } else {
          // API returned but no data
          setHasItems(false);
          setItemCount(0);
          setItemTypeCounts({ gauges: 0, tools: 0, parts: 0 });
        }
      } catch {
        // On error, assume no items (safer to allow delete than block it incorrectly)
        setHasItems(false);
        setItemCount(0);
        setItemTypeCounts({ gauges: 0, tools: 0, parts: 0 });
      }
    };

    if (isOpen && location) {
      checkItems();
    }
  }, [isOpen, location]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      toast.error('Error', 'Location data not loaded');
      return;
    }

    // Validate at least one item type is selected
    if (formData.allowed_item_types.length === 0) {
      toast.error('Validation Error', 'At least one item type must be selected');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.put(`/storage-locations/${location.id}`, formData);

      if (response.success) {
        toast.success('Location Updated', 'Storage location updated successfully');
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update storage location';
      toast.error('Update Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!location) return;

    setIsDeleting(true);
    setShowDeleteConfirm(false);

    try {
      const response = await apiClient.delete(`/storage-locations/${location.id}`);

      if (response.success) {
        toast.success('Location Deleted', 'Storage location deleted successfully');
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete storage location';
      toast.error('Delete Failed', errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleItemTypeToggle = (itemType: string) => {
    setFormData(prev => {
      const currentTypes = prev.allowed_item_types;
      const isChecked = currentTypes.includes(itemType);

      if (isChecked) {
        // Remove the item type
        return { ...prev, allowed_item_types: currentTypes.filter(t => t !== itemType) };
      } else {
        // Add the item type
        return { ...prev, allowed_item_types: [...currentTypes, itemType] };
      }
    });
  };

  if (!location && !isLoading) {
    return null;
  }

  return (
    <>
      <DetailModal
        isOpen={isOpen}
        onClose={onClose}
        title={location ? `Location: ${location.location_code}` : 'Loading...'}
        size="sm"
        editButton={
          canManage && location && !isLoading ? (
            <div
              ref={deleteButtonRef}
              onMouseEnter={() => setHoveredElement('delete-button')}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteClick}
                disabled={isDeleting || hasItems}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
              {hoveredElement === 'delete-button' && hasItems && (
                <PortalTooltip targetRef={deleteButtonRef}>
                  Cannot delete: {itemCount} item{itemCount !== 1 ? 's' : ''} stored here
                </PortalTooltip>
              )}
            </div>
          ) : undefined
        }
        actionButtons={
          !isLoading && location ? (
            <>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || formData.allowed_item_types.length === 0}
                form="location-edit-form"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          )
        }
      >
        {isLoading ? (
          <Modal.Body padding={true}>
            <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <p>Loading location details...</p>
            </div>
          </Modal.Body>
        ) : !location ? (
          <Modal.Body padding={true}>
            <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <p>Location not found</p>
            </div>
          </Modal.Body>
        ) : (
        <form id="location-edit-form" onSubmit={handleUpdate}>
          <DetailModal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Location Type and Active Status */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                <div style={{ width: '160px' }}>
                  <FormSelect
                    label="Location Type"
                    value={formData.location_type}
                    onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                    required
                  >
                    {LOCATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </FormSelect>
                </div>
                <div
                  ref={activeCheckboxRef}
                  style={{ paddingTop: 'var(--space-4)' }}
                  onMouseEnter={() => setHoveredElement('active-checkbox')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <FormCheckbox
                    label="Active"
                    checked={formData.is_active}
                    onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    disabled={hasItems && formData.is_active}
                  />
                  {hoveredElement === 'active-checkbox' && hasItems && formData.is_active && (
                    <PortalTooltip targetRef={activeCheckboxRef}>
                      Cannot deactivate: {itemCount} item{itemCount !== 1 ? 's' : ''} stored here
                    </PortalTooltip>
                  )}
                </div>
              </div>

              {/* Building and Zone Selection */}
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <FormSelect
                    label="Building (optional)"
                    value={formData.building_id?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setFormData({ ...formData, building_id: value, zone_id: null });
                    }}
                  >
                    <option value="">None</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.building_name}
                      </option>
                    ))}
                  </FormSelect>
                </div>
                <div style={{ flex: 1 }}>
                  <FormSelect
                    label="Zone (optional)"
                    value={formData.zone_id?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setFormData({ ...formData, zone_id: value });
                    }}
                    disabled={!formData.building_id}
                  >
                    <option value="">None</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.zone_name}
                      </option>
                    ))}
                  </FormSelect>
                </div>
              </div>

              {/* Allowed Item Types */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-2)'
                }}>
                  Allowed Item Types <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
                  <div
                    ref={gaugesCheckboxRef}
                    onMouseEnter={() => setHoveredElement('gauges-checkbox')}
                    onMouseLeave={() => setHoveredElement(null)}
                  >
                    <FormCheckbox
                      label="🔧 Gauges"
                      checked={formData.allowed_item_types.includes('gauges')}
                      onChange={() => handleItemTypeToggle('gauges')}
                      disabled={itemTypeCounts.gauges > 0 && formData.allowed_item_types.includes('gauges')}
                    />
                    {hoveredElement === 'gauges-checkbox' && itemTypeCounts.gauges > 0 && formData.allowed_item_types.includes('gauges') && (
                      <PortalTooltip targetRef={gaugesCheckboxRef}>
                        Cannot disallow: {itemTypeCounts.gauges} gauge{itemTypeCounts.gauges !== 1 ? 's' : ''} stored here
                      </PortalTooltip>
                    )}
                  </div>
                  <div
                    ref={toolsCheckboxRef}
                    onMouseEnter={() => setHoveredElement('tools-checkbox')}
                    onMouseLeave={() => setHoveredElement(null)}
                  >
                    <FormCheckbox
                      label="🔨 Tools"
                      checked={formData.allowed_item_types.includes('tools')}
                      onChange={() => handleItemTypeToggle('tools')}
                      disabled={itemTypeCounts.tools > 0 && formData.allowed_item_types.includes('tools')}
                    />
                    {hoveredElement === 'tools-checkbox' && itemTypeCounts.tools > 0 && formData.allowed_item_types.includes('tools') && (
                      <PortalTooltip targetRef={toolsCheckboxRef}>
                        Cannot disallow: {itemTypeCounts.tools} tool{itemTypeCounts.tools !== 1 ? 's' : ''} stored here
                      </PortalTooltip>
                    )}
                  </div>
                  <div
                    ref={partsCheckboxRef}
                    onMouseEnter={() => setHoveredElement('parts-checkbox')}
                    onMouseLeave={() => setHoveredElement(null)}
                  >
                    <FormCheckbox
                      label="📦 Parts"
                      checked={formData.allowed_item_types.includes('parts')}
                      onChange={() => handleItemTypeToggle('parts')}
                      disabled={itemTypeCounts.parts > 0 && formData.allowed_item_types.includes('parts')}
                    />
                    {hoveredElement === 'parts-checkbox' && itemTypeCounts.parts > 0 && formData.allowed_item_types.includes('parts') && (
                      <PortalTooltip targetRef={partsCheckboxRef}>
                        Cannot disallow: {itemTypeCounts.parts} part{itemTypeCounts.parts !== 1 ? 's' : ''} stored here
                      </PortalTooltip>
                    )}
                  </div>
                </div>
                <p style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                  lineHeight: '1.3'
                }}>
                  Controls which items can be moved to this location.
                </p>
              </div>
            </div>
          </DetailModal.Body>
        </form>
        )}
      </DetailModal>

      {/* Delete Confirmation Modal */}
      {location && (
      <Modal
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        title="Delete Storage Location?"
        size="sm"
      >
        <Modal.Body padding={true}>
          <p>Are you sure you want to delete location "{location.location_code}"? This action will mark it as inactive.</p>
        </Modal.Body>
        <Modal.Actions>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteConfirm}
          >
            Delete
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDeleteCancel}
          >
            Cancel
          </Button>
        </Modal.Actions>
      </Modal>
      )}
    </>
  );
}
