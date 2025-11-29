// Modal manager for all gauge-related modal operations
// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button components instead of raw <button> elements
// Use apiClient instead of direct fetch() calls
import { useState, useEffect, useRef } from 'react';
import { Modal, DetailModal, Button, Icon, Badge, DetailRow, SectionHeader, InfoCard, CloseButton, CancelButton, useImmediateModal, useToast, useCertificateManagement, FileInput, FormInput, LocationDisplay } from '../../../infrastructure';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { TextFormatRules } from '../../../infrastructure/business/textFormatRules';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../infrastructure/components/ui/Tabs';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import { useGaugeHistory } from '../hooks/useGaugeQueries';
import { useAuth } from '../../../infrastructure';
import { UnsealRequestModal } from './UnsealRequestModal';
import { CheckinModal } from './CheckinModal';
import { TransferModal } from './TransferModal';
import { ReturnCustomerGaugeModal } from './ReturnCustomerGaugeModal'; // ➕ Phase 4: Customer return workflow
import { QCApprovalsModal } from './QCApprovalsModal';
import { InternalHandToolCalibrationForm } from './InternalHandToolCalibrationForm';
import { OutOfServiceReviewModal } from './OutOfServiceReviewModal';
import { EditGaugeModal } from './EditGaugeModal';
import { SparePairingInterface } from './SparePairingInterface';
import { SealStatusDisplay } from './SealStatusDisplay';
import { certificateService } from '../services/certificateService';
import type { Gauge } from '../types';

interface HistoryEntry {
  action_date: string;
  action: string;
  user_name?: string;
  to_location?: string;
  notes?: string;
}

interface GaugeModalManagerProps {
  selectedGauge: Gauge | null;
  modalType: string | null;
  onClose: () => void;
  onFullClose?: () => void; // For 'X' button - navigate back to origin page
  onRefetch: () => void;
  onModalTypeChange?: (type: string) => void;
}

export function GaugeModalManager({
  selectedGauge,
  modalType,
  onClose,
  onFullClose,
  onRefetch,
  onModalTypeChange
}: GaugeModalManagerProps) {
  const [showUnsealModal, setShowUnsealModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [isDragging, setIsDragging] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Certificate management hook
  const {
    certificates,
    loading: loadingCertificates,
    uploading: uploadingCertificate,
    syncing: syncingCertificates,
    uploadError,
    uploadSuccess,
    deletingId: deletingCertificateId,
    editingId: editingCertificateId,
    editingName: editingCertificateName,
    loadCertificates,
    uploadCertificate: handleUploadCertificate,
    deleteCertificate: handleDeleteCertificate,
    syncCertificates: handleSyncCertificates,
    startEditName: handleStartEditCertificateName,
    setEditingName: setEditingCertificateName,
    saveName: handleSaveCertificateName,
    cancelEdit: handleCancelEditCertificateName
  } = useCertificateManagement(selectedGauge?.gauge_id);

  const {
    checkout,
    transfer,
    cancelTransfer,
    qcVerify
  } = useGaugeOperations();

  const { handleSuccess } = useImmediateModal({ onClose });
  const toast = useToast();

  // Fetch history data when gauge is selected
  const { data: historyData, isLoading: historyLoading } = useGaugeHistory(selectedGauge?.id);

  // Reset active tab when opening a different gauge
  useEffect(() => {
    if (selectedGauge && modalType === 'details') {
      setActiveTab('details');
    }
  }, [selectedGauge, modalType]);

  // Load certificates when certs tab is active
  useEffect(() => {
    if (activeTab === 'certs' && selectedGauge) {
      loadCertificates();
    }
  }, [activeTab, selectedGauge, loadCertificates]);

  // Drag and drop handlers for certificate upload
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file type - accept common certificate file types
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!allowedExtensions.includes(fileExtension)) {
        toast.error('Invalid File Type', `File type ${fileExtension} not accepted. Allowed types: ${allowedExtensions.join(', ')}`);
        return;
      }

      handleUploadCertificate(file);
    }
  };

  if (!selectedGauge || !modalType) return null;

  const gauge = selectedGauge;

  // All status logic now centralized in StatusRules

  // Helper to go back to detail modal when canceling action modals
  const handleBackToDetails = () => {
    onModalTypeChange?.('details');
  };

  const handleOperation = async (operation: string, data?: Record<string, unknown>) => {
    try {
      switch (operation) {
        case 'checkout':
          // Check if gauge is sealed before attempting checkout
          if (StatusRules.isSealed(gauge)) {
            // Show the unseal request modal instead
            setShowUnsealModal(true);
            return;
          }
          await checkout.mutateAsync({
            gaugeId: gauge.gauge_id,
            data: data || {}
          });
          break;
        case 'return':
          // CheckinModal handles its own submission
          // No need to call the mutation here
          break;
        case 'transfer':
          await transfer.mutateAsync({
            gaugeId: gauge.gauge_id,
            data
          });
          break;
        case 'acceptReturn':
          await qcVerify.mutateAsync({
            gaugeId: gauge.gauge_id,
            data: {
              pass_fail: 'pass' as const,
              condition_rating: 10,
              notes: 'QC inspection passed',
              requires_calibration: false
            }
          });
          break;
      }
      onRefetch();
      // Close the modal after successful operations
      onClose();
    } catch {
      // Error handling is done in the hooks via toast
    }
  };

  const renderModalContent = () => {
    switch (modalType) {
      case 'details':
        return (
          <DetailModal
            isOpen={true}
            onClose={onClose}
            onFullClose={onFullClose}
            title={gauge.name}
            size="lg"
            editButton={
              <Button
                variant="info"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                icon={<Icon name="edit" />}
              >
                Edit
              </Button>
            }
            actionButtons={
              <>
                {/* If checked out, show Transfer and Checkin only for gauges that can be checked out
                    EXCEPT for thread gauges that are part of a set (they can only be operated on as a set) */}
                {StatusRules.isCheckedOut(gauge) && EquipmentRules.canBeCheckedOut(gauge) &&
                 !(EquipmentRules.isThreadGauge(gauge) && gauge.set_id) ? (
                  <>
                    {/* Transfer button */}
                    <Button
                      variant="info"
                      size="sm"
                      onClick={() => onModalTypeChange?.('transfer')}
                      icon={<Icon name="exchange-alt" />}
                    >
                      Transfer
                    </Button>
                    {/* Checkin button */}
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => onModalTypeChange?.('return')}
                      icon={<Icon name="download" />}
                    >
                      Checkin
                    </Button>
                  </>
                ) : (
                  /* Action buttons for checkout-enabled gauges EXCEPT thread gauges that are part of a set */
                  EquipmentRules.canBeCheckedOut(gauge) && !(EquipmentRules.isThreadGauge(gauge) && gauge.set_id) && (
                    StatusRules.isOutOfService(gauge) ? (
                      <Button
                        variant="danger"
                        size="sm"
                        disabled
                        icon={<Icon name="tools" />}
                      >
                        Out of Service
                      </Button>
                    ) : StatusRules.isCalibrationOverdue(gauge) ? (
                      <Button
                        variant="danger"
                        size="sm"
                        disabled
                        icon={<Icon name="exclamation-triangle" />}
                      >
                        Calibration Overdue
                      </Button>
                    ) : StatusRules.isPendingQC(gauge) ? (
                      <Button
                        variant="warning"
                        size="sm"
                        disabled
                        icon={<Icon name="clipboard-check" />}
                      >
                        Pending QC
                      </Button>
                    ) : StatusRules.isSealedWithPendingUnseal(gauge) ? (
                      <Button
                        variant="warning"
                        size="sm"
                        disabled
                        icon={<Icon name="unlock-alt" />}
                      >
                        Pending Unseal
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onModalTypeChange?.('checkout')}
                        icon={<Icon name="upload" />}
                      >
                        Checkout
                      </Button>
                    )
                  )
                )}

                {/* ➕ Phase 4: Return customer-owned gauges to customer (Admin/QC only) */}
                {gauge.ownership_type === 'customer_owned' && (user?.role === 'admin' || user?.role === 'qc') && (
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => onModalTypeChange?.('returnCustomer')}
                    icon={<Icon name="user-times" />}
                  >
                    Return to Customer
                  </Button>
                )}

                {/* Pair button for unpaired thread gauges */}
                {(() => {
                  if (EquipmentRules.isThreadGauge(gauge) && (!gauge.set_id || gauge.set_id === '') && gauge.ownership_type !== 'customer') {
                    return (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsPairingModalOpen(true)}
                        icon={<Icon name="link" />}
                      >
                        Pair
                      </Button>
                    );
                  }
                  return null;
                })()}

                <CloseButton size="sm" onClick={onClose} />
              </>
            }
          >
            <DetailModal.Body>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList style={{ marginBottom: 'var(--space-3)', display: 'flex', width: '100%' }}>
                  <TabsTrigger value="details" style={{ flex: 1 }}>
                    <span style={{ marginRight: 'var(--space-2)' }}>ℹ️</span>
                    Details
                  </TabsTrigger>
                  {gauge.ownership_type !== 'employee' && gauge.type !== 'cmm' && (
                    <TabsTrigger value="history" style={{ flex: 1 }}>
                      <span style={{ marginRight: 'var(--space-2)' }}>🕐</span>
                      History
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="certs" style={{ flex: 1 }}>
                    <span style={{ marginRight: 'var(--space-2)' }}>📜</span>
                    Calibration Certs
                  </TabsTrigger>
                </TabsList>
              
              <TabsContent value="details" style={{ padding: 'var(--space-3) var(--space-3) 0 var(--space-3)' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-3)',
                  height: '100%'
                }}>
                  {/* Column 1: Basic, Status & Additional Information */}
                  <div>
                    <div style={{ marginBottom: 'var(--space-1)' }}>
                      <SectionHeader size="sm">Basic Information</SectionHeader>
                      <DetailRow label="Gauge ID" value={gauge.gauge_id} />
                      <DetailRow label="Category" value={EquipmentRules.getDisplayName(gauge)} />
                      <DetailRow label="Type" value={EquipmentRules.getOwnershipTypeDisplay(gauge)} />
                      {gauge.gauge_suffix && (
                        <DetailRow label="Suffix" value={gauge.gauge_suffix} />
                      )}
                    </div>
                    
                    <div style={{ marginBottom: 'var(--space-1)' }}>
                      <SectionHeader marginBottom="0.25rem">Status Information</SectionHeader>
                      <DetailRow
                        label="Status"
                        value={
                          <Badge size="sm" variant={StatusRules.getStatusBadgeVariant(gauge)}>
                            {StatusRules.getStatusDisplayText(selectedGauge)}
                          </Badge>
                        }
                      />
                      <SealStatusDisplay gauge={gauge} variant="detail-row" />
                      <DetailRow
                        label="Location"
                        value={
                          <LocationDisplay
                            location_code={gauge.storage_location}
                            building_name={gauge.building_name}
                            facility_name={gauge.facility_name}
                            zone_name={gauge.zone_name}
                            showHierarchy={true}
                          />
                        }
                      />
                      {StatusRules.isCheckedOut(gauge) && (
                        <DetailRow
                          label="Checked Out To"
                          value={gauge.assigned_to_user_name || gauge.holder?.name || gauge.checked_out_to || 'Unknown User'}
                        />
                      )}
                    </div>

                    <div style={{ marginBottom: 'var(--space-1)' }}>
                      <SectionHeader marginBottom="0.25rem">Additional Information</SectionHeader>
                      <DetailRow 
                        label="Created" 
                        value={gauge.created_at ? new Date(gauge.created_at).toLocaleDateString() : 'N/A'} 
                      />
                      <DetailRow 
                        label="Updated" 
                        value={gauge.updated_at ? new Date(gauge.updated_at).toLocaleDateString() : 'N/A'} 
                      />
                    </div>
                  </div>
                  
                  {/* Column 2: Specifications & Calibration Information */}
                  <div>
                    <div style={{ marginBottom: 'var(--space-1)' }}>
                      <SectionHeader marginBottom="0.25rem">Specifications</SectionHeader>
                      <DetailRow label="Serial Number" value={gauge.gauge_id} />
                      <DetailRow label="Model Number" value={gauge.model_number || 'Not recorded'} />
                      <DetailRow label="Manufacturer" value={gauge.manufacturer || 'Not specified'} />
                      {EquipmentRules.isHandTool(gauge) && (
                        <>
                          <DetailRow 
                            label="Range" 
                            value={
                              gauge.measurement_range_min !== null && gauge.measurement_range_max !== null
                                ? `${gauge.measurement_range_min} - ${gauge.measurement_range_max} ${gauge.measurement_unit || ''}`
                                : 'No range specified'
                            } 
                          />
                          <DetailRow 
                            label="Resolution" 
                            value={gauge.resolution_value !== null ? gauge.resolution_value : 'No resolution specified'} 
                          />
                        </>
                      )}
                      {EquipmentRules.isLargeEquipment(gauge) && (
                        <DetailRow 
                          label="Accuracy Class" 
                          value={gauge.accuracy_value || 'No accuracy class specified'} 
                        />
                      )}
                      {EquipmentRules.isThreadGauge(gauge) && (
                        <>
                          {gauge.thread_size && (
                            <DetailRow label="Thread Size" value={gauge.thread_size} />
                          )}
                          {gauge.thread_type && (
                            <DetailRow label="Thread Type" value={gauge.thread_type} />
                          )}
                          {gauge.thread_class && (
                            <DetailRow label="Thread Class" value={gauge.thread_class} />
                          )}
                        </>
                      )}
                    </div>

                    <div style={{ marginBottom: 'var(--space-1)' }}>
                      <SectionHeader marginBottom="0.25rem">Calibration Information</SectionHeader>
                      <DetailRow 
                        label="Calibration Due" 
                        value={
                          gauge.calibration_due_date 
                            ? new Date(gauge.calibration_due_date).toLocaleDateString()
                            : 'Not scheduled'
                        } 
                      />
                      <DetailRow 
                        label="Last Calibration" 
                        value={
                          gauge.last_calibration_date 
                            ? new Date(gauge.last_calibration_date).toLocaleDateString()
                            : 'N/A'
                        } 
                      />
                      <DetailRow 
                        label="Frequency" 
                        value={
                          gauge.calibration_frequency_days 
                            ? `${gauge.calibration_frequency_days} days`
                            : 'N/A'
                        } 
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" style={{ padding: 'var(--space-3) var(--space-3) 0 var(--space-3)', height: '100%' }}>
                {gauge.ownership_type !== 'employee' && gauge.type !== 'cmm' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <SectionHeader size="sm" marginBottom="var(--space-2)">Checkout History</SectionHeader>
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 'var(--space-3)',
                      flex: 1,
                      overflowY: 'auto'
                    }}>
                      <InfoCard padding="var(--space-3)" marginBottom="0">
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <div style={{
                          minWidth: '120px'
                        }}>
                          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            {new Date().toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong>Current Status</strong>
                          <p>Status: {StatusRules.getStatusDisplayText(selectedGauge)}</p>
                          {StatusRules.isCheckedOut(gauge) && (gauge.assigned_to_user_name || gauge.holder) && (
                            <p>Checked out to: {gauge.assigned_to_user_name || gauge.holder?.name || 'Unknown'}</p>
                          )}
                        </div>
                        </div>
                      </InfoCard>
                      {historyLoading ? (
                        <div style={{
                          textAlign: 'center',
                          padding: 'var(--space-8)'
                        }}>
                          <p style={{ color: 'var(--color-text-secondary)' }}>Loading history...</p>
                        </div>
                      ) : historyData?.data && historyData.data.length > 0 ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-3)'
                        }}>
                          {historyData.data.map((entry: HistoryEntry, index: number) => (
                            <InfoCard key={index} padding="var(--space-3)" marginBottom="0">
                              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <div style={{
                                  minWidth: '120px',
                                  fontSize: 'var(--font-size-sm)',
                                  color: 'var(--color-text-secondary)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 'var(--space-1)'
                                }}>
                                  <div style={{ fontWeight: '600', color: 'var(--color-gray-700)' }}>
                                    {new Date(entry.action_date).toLocaleDateString()}
                                  </div>
                                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                                    {new Date(entry.action_date).toLocaleTimeString()}
                                  </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    marginBottom: 'var(--space-1)'
                                  }}>
                                    <Icon name={entry.action === 'checkout' ? 'sign-out-alt' : entry.action === 'return' ? 'sign-in-alt' : 'cog'} />
                                    <strong>
                                      {TextFormatRules.formatActionText(entry.action)}
                                    </strong>
                                  </div>
                                  {entry.user_name && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 'var(--space-2)',
                                      fontSize: 'var(--font-size-sm)',
                                      color: 'var(--color-text-secondary)'
                                    }}>
                                      <Icon name="users" />
                                      <span>{entry.user_name}</span>
                                    </div>
                                  )}
                                  {entry.to_location && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 'var(--space-2)',
                                      fontSize: 'var(--font-size-sm)',
                                      color: 'var(--color-text-secondary)',
                                      marginTop: 'var(--space-1)'
                                    }}>
                                      <Icon name="map-marker-alt" />
                                      <span>Location: {entry.to_location}</span>
                                    </div>
                                  )}
                                  {entry.notes && (
                                    <p style={{
                                      marginTop: 'var(--space-2)',
                                      fontSize: 'var(--font-size-sm)',
                                      color: 'var(--color-text-secondary)'
                                    }}>{entry.notes}</p>
                                  )}
                                </div>
                              </div>
                            </InfoCard>
                          ))}
                        </div>
                      ) : (
                        <div style={{
                          textAlign: 'center',
                          padding: 'var(--space-8)'
                        }}>
                          <p style={{ color: 'var(--color-text-secondary)' }}>No checkout history available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="certs" style={{ padding: 'var(--space-3) var(--space-3) 0 var(--space-3)' }}>
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  style={{
                    position: 'relative',
                    border: isDragging ? '3px dashed var(--color-primary)' : '2px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isDragging ? 'var(--color-primary-bg)' : 'transparent',
                    transition: 'all 0.2s ease',
                    padding: 'var(--space-3)',
                    minHeight: '100%'
                  }}
                >
                  {/* Drag overlay */}
                  {isDragging && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--color-primary-bg)',
                      borderRadius: 'var(--radius-md)',
                      zIndex: 10,
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: '600',
                        color: 'var(--color-primary)',
                        textAlign: 'center',
                        padding: 'var(--space-4)',
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)'
                      }}>
                        📜 Drop certificate file here
                      </div>
                    </div>
                  )}

                  {/* Header with Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h3 style={{ margin: '0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-gray-900)' }}>
                      Calibration Certificates
                    </h3>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      {EquipmentRules.isHandTool(selectedGauge) && !showCalibrationForm && (
                        <Button
                          onClick={() => setShowCalibrationForm(true)}
                          variant="success"
                          size="sm"
                        >
                          <Icon name="plus" style={{ marginRight: 'var(--space-1)' }} />
                          Record Internal Calibration
                        </Button>
                      )}
                      <Button
                        onClick={handleSyncCertificates}
                        disabled={syncingCertificates || loadingCertificates}
                        variant="info"
                        size="sm"
                      >
                        {syncingCertificates ? (
                          <>
                            <Icon name="spinner" spin style={{ marginRight: 'var(--space-1)' }} />
                            Syncing...
                          </>
                        ) : (
                          <>
                            🔄 Sync Certs
                          </>
                        )}
                      </Button>
                      <FileInput
                        ref={fileInputRef}
                        accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.bmp,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={(file) => {
                          if (file) {
                            handleUploadCertificate(file);
                          }
                        }}
                        buttonText={uploadingCertificate ? "Uploading..." : "Upload Certificate"}
                        buttonVariant="primary"
                        buttonIcon={uploadingCertificate ? <Icon name="spinner" spin /> : <span style={{ marginRight: 'var(--space-1)' }}>📜</span>}
                        enableDragDrop={false}
                      />
                    </div>
                  </div>

                  {/* Internal Calibration Form */}
                  {showCalibrationForm && EquipmentRules.isHandTool(selectedGauge) && (
                    <div style={{
                      marginBottom: 'var(--space-6)',
                      padding: 'var(--space-4)',
                      backgroundColor: 'var(--color-gray-50)',
                      border: '2px solid var(--color-success)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <InternalHandToolCalibrationForm
                        gaugeId={String(selectedGauge.id)}
                        onSuccess={async () => {
                          await loadCertificates();
                          setShowCalibrationForm(false);
                          toast.success('Success', 'Calibration recorded and certificate generated');
                        }}
                        onCancel={() => setShowCalibrationForm(false)}
                      />
                    </div>
                  )}

                  {/* Upload Status Messages */}
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    {uploadingCertificate && (
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)'
                      }}>
                        <Icon name="spinner" spin />
                        Uploading certificate...
                      </div>
                    )}
                    {uploadError && (
                      <div style={{
                        padding: 'var(--space-3)',
                        backgroundColor: 'var(--color-error-bg)',
                        border: '1px solid var(--color-danger)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        color: 'var(--color-danger)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-2)'
                      }}>
                        <Icon name="exclamation-triangle" style={{ flexShrink: 0, marginTop: 'var(--space-0)' }} />
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Upload Failed</strong>
                          {uploadError}
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadError(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0',
                            color: 'var(--color-danger)',
                            flexShrink: 0
                          }}
                          title="Dismiss"
                        >
                          <Icon name="x" />
                        </button>
                      </div>
                    )}
                    {uploadSuccess && (
                      <div style={{
                        padding: 'var(--space-3)',
                        backgroundColor: 'var(--color-success-bg)',
                        border: '1px solid var(--color-success)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        color: 'var(--color-success)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-2)'
                      }}>
                        <Icon name="check-circle" style={{ flexShrink: 0, marginTop: 'var(--space-0)' }} />
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Upload Successful</strong>
                          {uploadSuccess}
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadSuccess(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0',
                            color: 'var(--color-success)',
                            flexShrink: 0
                          }}
                          title="Dismiss"
                        >
                          <Icon name="x" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Certificate List */}
                  {loadingCertificates ? (
                    <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      Loading certificates...
                    </div>
                  ) : certificates.length > 0 ? (
                    <div style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}>
                      {certificates.map((cert, index) => (
                        <div
                          key={cert.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr auto',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-3)',
                            borderTop: index > 0 ? '1px solid var(--color-border)' : 'none',
                            backgroundColor: 'var(--color-bg-subtle)'
                          }}
                        >
                          <Icon name="file-pdf" style={{ color: 'var(--color-danger)', fontSize: '1.5rem' }} />
                          <div style={{ minWidth: 0 }}>
                            {editingCertificateId === cert.id ? (
                              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                                <FormInput
                                  type="text"
                                  value={editingCertificateName}
                                  onChange={(e) => setEditingCertificateName(e.target.value)}
                                  autoFocus
                                  style={{ minWidth: '400px', flex: '1' }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveCertificateName(cert);
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      handleCancelEditCertificateName();
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveCertificateName(cert)}
                                  title="Save"
                                >
                                  <Icon name="check" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEditCertificateName}
                                  title="Cancel"
                                >
                                  <Icon name="x" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  fontWeight: 500,
                                  marginBottom: 'var(--space-1)',
                                  lineHeight: '1.4'
                                }}
                                title={`${certificateService.formatCertificateName(cert.customName, cert.name, cert.uploadedAt)} (${cert.name})`}
                              >
                                {certificateService.formatCertificateName(cert.customName, cert.name, cert.uploadedAt)}
                              </div>
                            )}
                            <div style={{
                              fontSize: '0.875rem',
                              color: 'var(--color-text-muted)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 'var(--space-1)'
                            }}>
                              <div>{certificateService.formatFileSize(cert.size)}</div>
                              {cert.uploadedBy && (
                                <div>
                                  Uploaded by {cert.uploadedBy} on {certificateService.formatDate(cert.uploadedAt)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            {editingCertificateId !== cert.id && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEditCertificateName(cert)}
                                  title="Rename certificate"
                                >
                                  <Icon name="edit" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const gaugeId = gauge.gauge_id;
                                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                                    const downloadUrl = `${apiUrl}/api/gauges/${gaugeId}/certificates/${cert.id}/download`;
                                    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  title="View certificate"
                                >
                                  <Icon name="eye" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteCertificate(cert)}
                                  title="Delete certificate"
                                  style={{ color: 'var(--color-danger)' }}
                                  loading={deletingCertificateId === cert.id}
                                >
                                  <Icon name="trash" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: 'var(--space-4)',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      border: '1px dashed var(--color-border)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      No certificates uploaded yet
                    </div>
                  )}

                  {/* Drag and drop hint */}
                  {!loadingCertificates && (
                    <div style={{
                      marginTop: 'var(--space-4)',
                      padding: 'var(--space-3)',
                      textAlign: 'center',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-muted)',
                      backgroundColor: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--color-border)'
                    }}>
                      💡 Tip: Drag and drop files anywhere in this area to upload (PDF, images, documents)
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            </DetailModal.Body>
          </DetailModal>
        );

      case 'checkout':
        return (
          <Modal isOpen onClose={onClose} title="Checkout Gauge" size="sm">
            <Modal.Body>
              <p style={{ margin: '0' }}>
                Are you sure you want to checkout gauge <strong>{gauge.gauge_id}</strong>?
              </p>
            </Modal.Body>
            <Modal.Actions>
              <Button
                variant="primary"
                onClick={() => handleOperation('checkout')}
              >
                Checkout
              </Button>
              <CancelButton onClick={onClose} />
            </Modal.Actions>
          </Modal>
        );

      case 'return':
        return (
          <CheckinModal
            isOpen={true}
            onClose={onClose}
            gauge={gauge}
          />
        );

      case 'transfer':
        return (
          <TransferModal
            isOpen={true}
            onClose={onClose}
            gauge={gauge}
          />
        );

      case 'acceptReturn':
        return (
          <Modal isOpen onClose={handleBackToDetails} title="Accept Checkin" size="sm">
            <Modal.Body>
              <p style={{ margin: '0' }}>
                Accept the checkin of gauge <strong>{gauge.gauge_id}</strong>?
              </p>
            </Modal.Body>
            <Modal.Actions>
              <Button
                variant="warning"
                onClick={() => handleOperation('acceptReturn')}
                loading={qcVerify.isPending}
              >
                Accept
              </Button>
              <CancelButton onClick={handleBackToDetails} />
            </Modal.Actions>
          </Modal>
        );

      case 'cancelTransfer':
        return (
          <Modal
            isOpen={true}
            onClose={handleBackToDetails}
            title="Pending Transfer"
            size="sm"
          >
            <Modal.Body>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <p style={{ marginBottom: 'var(--space-2)' }}>
                  <strong>Gauge:</strong> {gauge.name}
                </p>
                <p style={{ marginBottom: 'var(--space-2)' }}>
                  <strong>ID:</strong> {gauge.gauge_id}
                </p>
                {gauge.transfer_to_user_name && (
                  <p style={{ marginBottom: 'var(--space-2)' }}>
                    <strong>Transfer to:</strong> {gauge.transfer_to_user_name}
                  </p>
                )}
              </div>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                This gauge has a pending transfer request. Would you like to cancel this transfer?
              </p>
            </Modal.Body>
            <Modal.Actions>
              <Button
                variant="danger"
                onClick={() => {
                  if (gauge.pending_transfer_id) {
                    cancelTransfer.mutate({
                      transferId: gauge.pending_transfer_id,
                      reason: 'Transfer cancelled by user'
                    }, {
                      onSuccess: () => {
                        onRefetch();
                        handleBackToDetails();
                      }
                    });
                  }
                }}
                loading={cancelTransfer.isPending}
              >
                Cancel Transfer
              </Button>
              <CancelButton onClick={handleBackToDetails} />
            </Modal.Actions>
          </Modal>
        );

      case 'returnCustomer':
        // ➕ Phase 4: Return customer-owned gauge to customer
        return (
          <ReturnCustomerGaugeModal
            isOpen={true}
            gauge={gauge}
            companionGauge={null} // TODO: Fetch companion gauge if exists
            onClose={handleBackToDetails}
            onSuccess={() => {
              onRefetch();
              handleBackToDetails();
            }}
          />
        );

      case 'qcReview':
        // QC Review modal for pending QC gauges
        return (
          <QCApprovalsModal
            isOpen={true}
            onClose={handleBackToDetails}
            initialGaugeId={gauge.gauge_id}
          />
        );

      case 'oosReview':
        // Out of Service Review modal for returning gauges to service
        return (
          <OutOfServiceReviewModal
            isOpen={true}
            onClose={handleBackToDetails}
            initialGaugeId={gauge.gauge_id}
          />
        );

      case 'unseal':
        // Unseal request modal for sealed gauges
        return (
          <UnsealRequestModal
            isOpen={true}
            gauge={gauge}
            onClose={handleBackToDetails}
            onSuccess={() => {
              onRefetch();
              handleBackToDetails();
            }}
          />
        );

      default:
        return null;
    }
  };

  const modalContent = renderModalContent();
  
  return (
    <>
      {modalContent}
      {showUnsealModal && (
        <UnsealRequestModal
          isOpen={showUnsealModal}
          gauge={gauge}
          onClose={() => {
            setShowUnsealModal(false);
            onClose(); // Also close the parent modal
          }}
          onSuccess={() => {
            setShowUnsealModal(false);
            onClose();
          }}
        />
      )}

      {/* Edit Modal */}
      {selectedGauge && (
        <EditGaugeModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            onRefetch(); // Refresh gauge data after editing
          }}
          onFullClose={onFullClose}
          gauge={selectedGauge}
          onViewSet={(setId) => {
            setIsEditModalOpen(false);
            // Navigate to the set - implementation depends on routing context
            // For now, this will open the gauge detail modal for the set
            if (onModalTypeChange) {
              onModalTypeChange('set-detail');
            }
          }}
        />
      )}

      {/* Pairing Modal */}
      <SparePairingInterface
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        onSuccess={() => {
          setIsPairingModalOpen(false);
          onRefetch(); // Refresh gauge data after pairing
        }}
        sourceGauge={gauge}
      />
    </>
  );
}