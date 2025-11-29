import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Modal, DetailModal, Button, Icon, Badge, LocationDisplay, CloseButton } from '../../../infrastructure/components';
import { SealStatusDisplay } from './SealStatusDisplay';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../infrastructure/components/ui/Tabs';
import type { Gauge } from '../types';
import { gaugeService } from '../services/gaugeService';
import { EditSetModal } from './EditSetModal';

interface SetDetailProps {
  isOpen: boolean;
  onClose: () => void;
  goGauge: Gauge;
  nogoGauge: Gauge;
  setId: string;
  onReplaceGauge?: (gaugeType: 'GO' | 'NOGO') => void;
  onUnpairSet?: () => void;
  onGaugeClick?: (gauge: Gauge) => void;
  onCheckout?: () => void;
  onCheckin?: () => void;
  onTransfer?: () => void;
}

/**
 * SetDetail Component - Modal view for gauge sets (GO + NO GO pairs)
 * Matches the design from set-vs-gauge-comparison.html
 */
export function SetDetail({
  isOpen,
  onClose,
  goGauge,
  nogoGauge,
  setId,
  onReplaceGauge,
  onUnpairSet,
  onGaugeClick,
  onCheckout,
  onCheckin,
  onTransfer
}: SetDetailProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [inventoryLocation, setInventoryLocation] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditSetModalOpen, setIsEditSetModalOpen] = useState(false);

  // Use GO gauge data for shared set information, but aggregate critical properties
  const setData = {
    ...goGauge,
    // Aggregate seal status: if EITHER gauge is sealed, set is sealed
    is_sealed: StatusRules.isSealed(goGauge) ||
               StatusRules.isSealed(nogoGauge),
    // Aggregate calibration: use earliest due date (most urgent)
    calibration_due_date: [goGauge.calibration_due_date, nogoGauge.calibration_due_date]
      .filter(d => d)
      .sort()[0] || goGauge.calibration_due_date,
    // Aggregate calibration status: Expired > Due Soon > Current
    calibration_status: (() => {
      const statusPriority = { 'Expired': 3, 'Due Soon': 2, 'Current': 1 } as const;
      const statuses = [goGauge.calibration_status, nogoGauge.calibration_status].filter(Boolean);
      if (statuses.length === 0) return goGauge.calibration_status;
      return statuses.reduce((worst, status) => {
        if (!worst) return status;
        return statusPriority[status as keyof typeof statusPriority] > statusPriority[worst as keyof typeof statusPriority] ? status : worst;
      });
    })()
  };

  // Reset edit mode when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsEditMode(false);
    }
  }, [isOpen]);

  // Fetch inventory location when component opens or gauge changes
  useEffect(() => {
    const fetchInventoryLocation = async () => {
      if (goGauge && isOpen) {
        try {
          const locationData = await gaugeService.getCurrentLocation(goGauge.gauge_id);
          if (locationData?.current_location) {
            setInventoryLocation(locationData.current_location);
          }
        } catch (_error) {
          // Silently handle - inventory location is optional
        }
      }
    };

    fetchInventoryLocation();
  }, [goGauge, isOpen]);

  return (
    <>
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${setId} - ${setData.displayName || 'Thread Gauge Set'}`}
      size="lg"
      editButton={
        !isEditMode && setData.ownership_type !== 'customer' ? (
          <Button size="sm" variant="info" icon={<Icon name="edit" />} onClick={() => setIsEditMode(true)}>
            Edit
          </Button>
        ) : isEditMode ? (
          <Button size="sm" variant="secondary" icon={<Icon name="times" />} onClick={() => setIsEditMode(false)}>
            Done
          </Button>
        ) : undefined
      }
      actionButtons={
        <>
          {/* View mode: Show action buttons (Checkout/Checkin/Transfer) */}
          {!isEditMode && (
            <>
              {StatusRules.isCheckedOut(setData) ? (
                <>
                  {onTransfer && (
                    <Button size="sm" variant="info" icon={<Icon name="exchange-alt" />} onClick={onTransfer}>
                      Transfer
                    </Button>
                  )}
                  {onCheckin && (
                    <Button size="sm" variant="success" icon={<Icon name="download" />} onClick={onCheckin}>
                      Checkin
                    </Button>
                  )}
                </>
              ) : (
                StatusRules.isAvailable(setData) && onCheckout && (
                  <Button size="sm" variant="primary" icon={<Icon name="upload" />} onClick={onCheckout}>
                    Checkout
                  </Button>
                )
              )}
            </>
          )}

          {/* Edit mode: Show management buttons (Edit Properties/Replace Gauge/Unpair Set) */}
          {isEditMode && setData.ownership_type !== 'customer' && (
            <>
              <Button size="sm" variant="info" icon={<Icon name="edit" />} onClick={() => setIsEditSetModalOpen(true)}>
                Edit Properties
              </Button>
              {onReplaceGauge && (
                <Button size="sm" variant="info" icon={<Icon name="exchange-alt" />} onClick={() => onReplaceGauge('GO')}>
                  Replace Gauge
                </Button>
              )}
              {onUnpairSet && (
                <Button size="sm" variant="info" icon={<Icon name="unlink" />} onClick={onUnpairSet}>
                  Unpair Set
                </Button>
              )}
            </>
          )}

          <CloseButton size="sm" onClick={onClose} />
        </>
      }
    >
      <DetailModal.Body>
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList style={{ marginBottom: 'var(--space-3)', display: 'flex', width: '100%' }}>
            <TabsTrigger value="details" style={{ flex: 1 }}>
              <span style={{ marginRight: 'var(--space-2)' }}>ℹ️</span>
              Details
            </TabsTrigger>
            <TabsTrigger value="history" style={{ flex: 1 }}>
              <span style={{ marginRight: 'var(--space-2)' }}>🕐</span>
              History
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" style={{ padding: 'var(--space-3)', overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-3)'
            }}>
              {/* Column 1: Basic, Status & Additional Information */}
              <div>
                <div style={{ marginBottom: 'var(--space-1)' }}>
                  <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-gray-900)' }}>
                    Basic Information
                  </h4>
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Set ID:</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '700', color: 'var(--color-gray-900)', textAlign: 'right' }}>
                        {setId}
                      </span>
                    </div>
                  </div>
                  {setData.thread_size && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Thread Size:</span>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', textAlign: 'right' }}>
                          {setData.thread_size}
                        </span>
                      </div>
                    </div>
                  )}
                  {setData.thread_class && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Thread Class:</span>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', textAlign: 'right' }}>
                          {setData.thread_class}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 'var(--space-1)' }}>
                  <h4 style={{ margin: 'var(--space-4) 0 var(--space-2) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-gray-900)' }}>
                    Status Information
                  </h4>
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Status:</span>
                      <Badge variant={StatusRules.getStatusBadgeVariant(goGauge)} size="sm">
                        {StatusRules.getStatusDisplayText(goGauge)}
                      </Badge>
                    </div>
                  </div>
                  <SealStatusDisplay gauge={setData} variant="inline" />
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Location:</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', textAlign: 'right' }}>
                        <LocationDisplay
                          location_code={inventoryLocation || setData.storage_location}
                          building_name={setData.building_name}
                          facility_name={setData.facility_name}
                          zone_name={setData.zone_name}
                          showHierarchy={true}
                        />
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-1)' }}>
                  <h4 style={{ margin: 'var(--space-4) 0 var(--space-2) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-gray-900)' }}>
                    Additional Information
                  </h4>
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Created:</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', textAlign: 'right' }}>
                        {setData.created_at ? new Date(setData.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Updated:</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', textAlign: 'right' }}>
                        {setData.updated_at ? new Date(setData.updated_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Gauge Members & Calibration Information */}
              <div>
                <div style={{ marginBottom: 'var(--space-1)' }}>
                  <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-gray-900)' }}>
                    Gauge Members
                  </h4>
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>GO Gauge (A):</span>
                      {onGaugeClick ? (
                        <button
                          onClick={() => onGaugeClick(goGauge)}
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-primary)',
                            fontWeight: '600',
                            textDecoration: 'none',
                            textAlign: 'right',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {goGauge.gauge_id}
                        </button>
                      ) : (
                        <Link
                          to={`/gauges?open=${goGauge.gauge_id}&returnTo=/gauges/sets/${setId}`}
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-primary)',
                            fontWeight: '600',
                            textDecoration: 'none',
                            textAlign: 'right'
                          }}
                        >
                          {goGauge.gauge_id}
                        </Link>
                      )}
                    </div>
                  </div>
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>NO GO Gauge (B):</span>
                      {onGaugeClick ? (
                        <button
                          onClick={() => onGaugeClick(nogoGauge)}
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-primary)',
                            fontWeight: '600',
                            textDecoration: 'none',
                            textAlign: 'right',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {nogoGauge.gauge_id}
                        </button>
                      ) : (
                        <Link
                          to={`/gauges?open=${nogoGauge.gauge_id}&returnTo=/gauges/sets/${setId}`}
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-primary)',
                            fontWeight: '600',
                            textDecoration: 'none',
                            textAlign: 'right'
                          }}
                        >
                          {nogoGauge.gauge_id}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-1)' }}>
                  <h4 style={{ margin: 'var(--space-4) 0 var(--space-2) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-gray-900)' }}>
                    Calibration Information
                  </h4>
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Calibration Due:</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', textAlign: 'right' }}>
                        {setData.calibration_due_date ? new Date(setData.calibration_due_date).toLocaleDateString() : 'Not scheduled'}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Last Calibration:</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', textAlign: 'right' }}>
                        {setData.last_calibration_date ? new Date(setData.last_calibration_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>Frequency:</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', textAlign: 'right' }}>
                        {setData.calibration_frequency_days || 365} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" style={{ padding: 'var(--space-3)', overflowY: 'auto', maxHeight: '400px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '200px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🕐</div>
              <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-lg)', fontWeight: '600', color: 'var(--color-gray-700)' }}>
                No Set History
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                This set has no history yet
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DetailModal.Body>
    </DetailModal>

    {/* EditSetModal for editing storage location and notes */}
    <EditSetModal
      isOpen={isEditSetModalOpen}
      onClose={() => setIsEditSetModalOpen(false)}
      setData={{
        set_id: setId,
        storage_location: inventoryLocation || undefined,
        notes: setData.notes,
        goGauge: goGauge,
        nogoGauge: nogoGauge
      }}
      onSuccess={async () => {
        // Refresh inventory location after update
        try {
          const locationData = await gaugeService.getCurrentLocation(goGauge.gauge_id);
          if (locationData?.current_location) {
            setInventoryLocation(locationData.current_location);
          }
        } catch (_error) {
          // Silently handle refresh error
        }
      }}
    />
    </>
  );
}
