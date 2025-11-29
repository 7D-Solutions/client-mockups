/**
 * MODAL MANAGER TEMPLATE
 *
 * This template provides a centralized modal management pattern for entity operations.
 *
 * PATTERN OVERVIEW:
 * - Single component handles all modal types (details, create, edit, delete, custom actions)
 * - Modal routing based on modalType prop
 * - Infrastructure Modal component with consistent styling
 * - Integration with mutation hooks for data operations
 *
 * CUSTOMIZATION POINTS:
 * 1. Replace {{ENTITY_NAME}} with singular entity name (e.g., "Gauge", "User", "Order")
 * 2. Replace {{ENTITY_NAME_LOWER}} with lowercase singular (e.g., "gauge", "user", "order")
 * 3. Add modal cases for your specific operations (approve, reject, etc.)
 * 4. Define detail sections based on entity structure
 * 5. Configure tabs if needed (details, history, attachments, etc.)
 *
 * INFRASTRUCTURE COMPONENTS USED:
 * - Modal: Base modal component with standardized layout
 * - Button: Action buttons with variants
 * - DetailRow: Consistent detail display
 * - SectionHeader: Section headers in details view
 * - Badge: Status indicators
 * - Tabs: Tab navigation for complex details
 *
 * @see GaugeModalManager.tsx - Reference implementation
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Icon, Badge, DetailRow, SectionHeader, CloseButton, CancelButton, useToast } from '../../../infrastructure';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../infrastructure/components/ui/Tabs';
import { use{{ENTITY_NAME}}Operations } from '../hooks/use{{ENTITY_NAME}}Operations';
import { useAuth } from '../../../infrastructure';
import type { {{ENTITY_NAME}} } from '../types';

interface {{ENTITY_NAME}}ModalManagerProps {
  selected{{ENTITY_NAME}}: {{ENTITY_NAME}} | null;
  modalType: string | null;
  onClose: () => void;
  onRefetch: () => void;
  onModalTypeChange?: (type: string) => void;
}

export function {{ENTITY_NAME}}ModalManager({
  selected{{ENTITY_NAME}},
  modalType,
  onClose,
  onRefetch,
  onModalTypeChange
}: {{ENTITY_NAME}}ModalManagerProps) {
  const [activeTab, setActiveTab] = useState('details');
  const toast = useToast();
  const { user } = useAuth();

  // CUSTOMIZATION POINT: Import operation hooks
  const {
    update,
    delete: deleteOperation,
    // Add other operations as needed
  } = use{{ENTITY_NAME}}Operations();

  // Reset active tab when opening a different entity
  useEffect(() => {
    if (selected{{ENTITY_NAME}} && modalType === 'details') {
      setActiveTab('details');
    }
  }, [selected{{ENTITY_NAME}}, modalType]);

  if (!selected{{ENTITY_NAME}} || !modalType) return null;

  const entity = selected{{ENTITY_NAME}};

  // ===== OPERATION HANDLERS =====

  const handleOperation = async (operation: string, data?: any) => {
    try {
      switch (operation) {
        case 'update':
          await update.mutateAsync({
            id: entity.id,
            data: data || {}
          });
          break;
        case 'delete':
          await deleteOperation.mutateAsync({ id: entity.id });
          break;
        // CUSTOMIZATION POINT: Add custom operation cases
        default:
          console.warn(`Unknown operation: ${operation}`);
      }
      onRefetch();
      onClose();
    } catch (error) {
      // Error handling is done in the hooks via toast
      console.error(`Operation ${operation} failed:`, error);
    }
  };

  // ===== MODAL CONTENT RENDERING =====

  const renderModalContent = () => {
    switch (modalType) {
      case 'details':
        return (
          <Modal
            isOpen={true}
            onClose={onClose}
            title={entity.name}
            size="lg"
          >
            <Modal.Tabs>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList style={{ marginBottom: 'var(--space-3)', display: 'flex', width: '100%' }}>
                  <TabsTrigger value="details" style={{ flex: 1 }}>
                    <span style={{ marginRight: 'var(--space-2)' }}>ℹ️</span>
                    Details
                  </TabsTrigger>
                  {/* CUSTOMIZATION POINT: Add additional tabs */}
                  <TabsTrigger value="history" style={{ flex: 1 }}>
                    <span style={{ marginRight: 'var(--space-2)' }}>🕐</span>
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" style={{ padding: 'var(--space-3)', height: '400px', overflow: 'hidden' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-3)',
                    height: '100%'
                  }}>
                    {/* Column 1: Basic Information */}
                    <div>
                      <div style={{ marginBottom: 'var(--space-1)' }}>
                        <SectionHeader size="sm">Basic Information</SectionHeader>
                        <DetailRow label="ID" value={entity.id} />
                        <DetailRow label="Name" value={entity.name} />
                        {/* CUSTOMIZATION POINT: Add entity-specific fields */}
                        <DetailRow label="Status" value={
                          <Badge size="sm" variant={getStatusVariant(entity.status)}>
                            {getStatusText(entity.status)}
                          </Badge>
                        } />
                      </div>

                      {/* CUSTOMIZATION POINT: Add additional sections */}
                      <div style={{ marginBottom: 'var(--space-1)' }}>
                        <SectionHeader size="sm">Additional Information</SectionHeader>
                        <DetailRow
                          label="Created"
                          value={entity.created_at ? new Date(entity.created_at).toLocaleDateString() : 'N/A'}
                        />
                        <DetailRow
                          label="Updated"
                          value={entity.updated_at ? new Date(entity.updated_at).toLocaleDateString() : 'N/A'}
                        />
                      </div>
                    </div>

                    {/* Column 2: Extended Information */}
                    <div>
                      {/* CUSTOMIZATION POINT: Add entity-specific sections */}
                      <div style={{ marginBottom: 'var(--space-1)' }}>
                        <SectionHeader size="sm">Details</SectionHeader>
                        <DetailRow label="Description" value={entity.description || 'No description'} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* CUSTOMIZATION POINT: Add additional tab content */}
                <TabsContent value="history" style={{ padding: 'var(--space-3)', height: '400px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <SectionHeader size="sm" marginBottom="var(--space-2)">Activity History</SectionHeader>
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      textAlign: 'center',
                      padding: 'var(--space-8)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      No history available
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Modal.Tabs>

            <Modal.Actions>
              {/* CUSTOMIZATION POINT: Add action buttons based on status/permissions */}
              <Button
                variant="info"
                size="sm"
                onClick={() => onModalTypeChange?.('edit')}
                icon={<Icon name="edit" />}
              >
                Edit
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => onModalTypeChange?.('delete')}
                icon={<Icon name="trash" />}
              >
                Delete
              </Button>

              <CloseButton size="sm" onClick={onClose} />
            </Modal.Actions>
          </Modal>
        );

      case 'edit':
        return (
          <Modal isOpen onClose={onClose} title={`Edit ${entity.name}`} size="md">
            <Modal.Body>
              {/* CUSTOMIZATION POINT: Add edit form component */}
              <p style={{ margin: '0' }}>
                Edit form for <strong>{entity.name}</strong>
              </p>
            </Modal.Body>
            <Modal.Actions>
              <Button
                variant="primary"
                onClick={() => handleOperation('update', { /* form data */ })}
                loading={update.isPending}
              >
                Save Changes
              </Button>
              <CancelButton onClick={onClose} />
            </Modal.Actions>
          </Modal>
        );

      case 'delete':
        return (
          <Modal isOpen onClose={onClose} title="Confirm Delete" size="sm">
            <Modal.Body>
              <p style={{ margin: '0' }}>
                Are you sure you want to delete <strong>{entity.name}</strong>? This action cannot be undone.
              </p>
            </Modal.Body>
            <Modal.Actions>
              <Button
                variant="danger"
                onClick={() => handleOperation('delete')}
                loading={deleteOperation.isPending}
              >
                Delete
              </Button>
              <CancelButton onClick={onClose} />
            </Modal.Actions>
          </Modal>
        );

      // CUSTOMIZATION POINT: Add custom modal cases
      case 'approve':
        return (
          <Modal isOpen onClose={onClose} title="Approve {{ENTITY_NAME}}" size="sm">
            <Modal.Body>
              <p style={{ margin: '0' }}>
                Are you sure you want to approve <strong>{entity.name}</strong>?
              </p>
            </Modal.Body>
            <Modal.Actions>
              <Button
                variant="success"
                onClick={() => handleOperation('approve')}
              >
                Approve
              </Button>
              <CancelButton onClick={onClose} />
            </Modal.Actions>
          </Modal>
        );

      default:
        return null;
    }
  };

  // ===== HELPER FUNCTIONS =====

  // CUSTOMIZATION POINT: Implement status badge variant mapping
  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'danger' | 'secondary' => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'secondary';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  // CUSTOMIZATION POINT: Implement status display text mapping
  const getStatusText = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active': return 'Active';
      case 'pending': return 'Pending';
      case 'inactive': return 'Inactive';
      case 'error': return 'Error';
      default: return status || '-';
    }
  };

  return <>{renderModalContent()}</>;
}
