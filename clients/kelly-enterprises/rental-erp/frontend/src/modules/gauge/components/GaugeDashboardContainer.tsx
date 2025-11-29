// Legacy-style Gauge Dashboard
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../infrastructure/api/client';
import { useAuth } from '../../../infrastructure/auth/index';
import { Button, Icon, Card, CardContent, FormInput, FormSelect, LoadingSpinner, Alert } from '../../../infrastructure';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { PermissionRules } from '../../../infrastructure/business/permissionRules';
import { CheckoutModal } from './CheckoutModal';
import { CheckinModal } from './CheckinModal';
import { QCApprovalsModal } from './QCApprovalsModal';
import { OutOfServiceReviewModal } from './OutOfServiceReviewModal';
import { UnsealRequestModal } from './UnsealRequestModal';
import { useAdminAlerts } from '../hooks/useAdminAlerts';
import type { Gauge } from '../types';

interface UnrealRequest {
  id: number;
  gauge_serial: string;
  request_type: string;
  status: string;
}

export const GaugeDashboardContainer = () => {
  const { user } = useAuth();
  const [selectedGauge, setSelectedGauge] = useState<Gauge | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showQCModal, setShowQCModal] = useState(false);
  const [showOutOfServiceModal, setShowOutOfServiceModal] = useState(false);
  const [showUnsealModal, setShowUnsealModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  
  // Get admin alerts
  const { pendingQCCount, outOfServiceCount, pendingUnsealCount } = useAdminAlerts();
  

  // Fetch all gauges
  const { data: gaugesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['all-gauges'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Gauge[]; pagination: { page: number; limit: number; total: number; pages: number }; _links?: any }>('/gauges');
      return response;
    },
    enabled: !!user,
  });

  // Fetch unreal requests - Disabled as endpoint doesn't exist
  const unrealRequests: UnrealRequest[] = [];

  const allGauges = gaugesResponse?.data || [];

  // Calculate stats
  const stats = {
    current: allGauges.filter(g => StatusRules.isCheckedOut(g) && g.holder?.id === user?.id).length,
    dueSoon: allGauges.filter(g => {
      if (!g.calibration_due_date) return false;
      const dueDate = new Date(g.calibration_due_date);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate > new Date() && dueDate <= weekFromNow;
    }).length,
    issues: allGauges.filter(g => StatusRules.isPendingQC(g) || StatusRules.isAtCalibration(g)).length,
  };

  // Filter gauges
  const filteredGauges = allGauges.filter(gauge => {
    const matchesSearch = !searchTerm || 
      gauge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gauge.equipment_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Available' && StatusRules.isAvailable(gauge)) ||
      (statusFilter === 'Checked Out' && StatusRules.isCheckedOut(gauge)) ||
      (statusFilter === 'Calibration' && StatusRules.isAtCalibration(gauge));
    
    const matchesType = EquipmentRules.matchesFilterType(gauge, typeFilter);
    const matchesLocation = locationFilter === 'All' || gauge.storage_location === locationFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  }).sort((a, b) => {
    // Sort alphabetically by gauge ID (gauge_id)
    const aId = ( a.gauge_id || '').toUpperCase();
    const bId = ( b.gauge_id || '').toUpperCase();
    return aId.localeCompare(bId);
  });

  const handleGaugeCheckout = (gauge: Gauge) => {
    setSelectedGauge(gauge);
    setShowCheckoutModal(true);
  };

  const handleGaugeCheckin = (gaugeId: string) => {
    const gauge = allGauges.find(g => g.id === gaugeId);
    if (gauge) {
      setSelectedGauge(gauge);
      setShowCheckinModal(true);
    }
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-gray-600)' }}>
          Please login to view your dashboard
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card>
          <CardContent>
            <h3 style={{ margin: '0 0 var(--space-3) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-lg)', color: 'var(--color-gray-600)' }}>
              <Icon name="check-circle" /> Current
            </h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <p style={{ margin: 0, fontSize: 'var(--font-size-4xl)', fontWeight: '700', lineHeight: 1, color: 'var(--color-primary)' }}>
                {stats.current}
              </p>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>gauges</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 style={{ margin: '0 0 var(--space-3) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-lg)', color: 'var(--color-gray-600)' }}>
              <Icon name="clock" /> Due Soon
            </h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <p style={{ margin: 0, fontSize: 'var(--font-size-4xl)', fontWeight: '700', lineHeight: 1, color: 'var(--color-warning)' }}>
                {stats.dueSoon}
              </p>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>gauges</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 style={{ margin: '0 0 var(--space-3) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-lg)', color: 'var(--color-gray-600)' }}>
              <Icon name="exclamation-triangle" /> Issues
            </h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <p style={{ margin: 0, fontSize: 'var(--font-size-4xl)', fontWeight: '700', lineHeight: 1, color: 'var(--color-danger)' }}>
                {stats.issues}
              </p>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>gauges</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Alerts - Show for admin users */}
      {PermissionRules.canViewAdminAlerts(user) && (pendingQCCount > 0 || outOfServiceCount > 0 || pendingUnsealCount > 0) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {pendingQCCount > 0 && (
              <Button
                onClick={() => setShowQCModal(true)}
                variant="warning"
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-warning-light)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-warning)'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--color-warning-dark)' }}>
                    {pendingQCCount} Pending QC
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                    Click to review
                  </div>
                </div>
              </Button>
            )}

            {outOfServiceCount > 0 && (
              <Button
                onClick={() => setShowOutOfServiceModal(true)}
                variant="danger"
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-danger-light-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-danger)'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--color-danger-dark)' }}>
                    {outOfServiceCount} Out of Service
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                    Click to review
                  </div>
                </div>
              </Button>
            )}

            {pendingUnsealCount > 0 && (
              <Button
                onClick={() => setShowUnsealModal(true)}
                variant="info"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-info-light)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-info)'
                }}
              >
                <Icon name="lock-open" />
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--color-info-dark)' }}>
                    Unseal Requests
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                    {pendingUnsealCount} request{pendingUnsealCount !== 1 ? 's' : ''} pending
                  </div>
                </div>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Inventory Card */}
      <Card>
        <CardContent>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ margin: '0 0 var(--space-3) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Icon name="list" /> Gauge Inventory
            </h2>

            {/* Unreal Requests Alert */}
            {unrealRequests && unrealRequests.length > 0 && (
              <Alert variant="warning" style={{ marginBottom: 'var(--space-3)' }}>
                <Icon name="exclamation-triangle" /> Unreal Requests
                <strong> {unrealRequests.length}</strong> request{unrealRequests.length !== 1 ? 's' : ''} pending
              </Alert>
            )}
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
            <FormInput
              type="text"
              placeholder="Search gauges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All Statuses</option>
              <option>Available</option>
              <option>Checked Out</option>
              <option>Calibration</option>
            </FormSelect>
            <FormSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option>All Types</option>
              {Array.from(new Set(allGauges.map(g => g.equipment_type))).filter(Boolean).map(type => (
                <option key={type}>{type}</option>
              ))}
            </FormSelect>
            <FormSelect value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option>All Locations</option>
              {Array.from(new Set(allGauges.map(g => g.storage_location))).map(location => (
                <option key={location}>{location}</option>
              ))}
            </FormSelect>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
            <Button
              variant="ghost"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '2px solid var(--color-primary)',
                color: 'var(--color-primary)',
                fontWeight: '600'
              }}
            >
              All ({filteredGauges.length})
            </Button>
            <Button
              variant="ghost"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                color: 'var(--color-gray-600)'
              }}
            >
              Company Hand Tools (0)
            </Button>
            <Button
              variant="ghost"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                color: 'var(--color-gray-600)'
              }}
            >
              Employee Hand Tools (0)
            </Button>
            <Button
              variant="ghost"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                color: 'var(--color-gray-600)'
              }}
            >
              Thread Gauges (0)
            </Button>
          </div>

          {/* Gauge List */}
          <div>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-danger)' }}>
                Error loading gauges. Please try again.
              </p>
            ) : filteredGauges.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>
                No gauges found matching your criteria.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {filteredGauges.map((gauge, index) => (
                  <div
                    key={`${gauge.gauge_id}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>{gauge.name}</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                        S/N: {gauge.gauge_id} • Type: {EquipmentRules.getDisplayName(gauge)}
                      </div>
                    </div>
                    <div>
                      {StatusRules.isAvailable(gauge) && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleGaugeCheckout(gauge)}
                          icon={<Icon name="upload" />}
                        >
                          Checkout
                        </Button>
                      )}
                      {StatusRules.isCheckedOut(gauge) && gauge.holder?.id === user?.id && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleGaugeCheckin(gauge.id)}
                          icon={<Icon name="download" />}
                        >
                          Checkin
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedGauge && (
        <>
          <CheckoutModal
            isOpen={showCheckoutModal}
            onClose={() => {
              setShowCheckoutModal(false);
              setSelectedGauge(null);
              refetch();
            }}
            gauge={selectedGauge}
          />
          <CheckinModal
            isOpen={showCheckinModal}
            onClose={() => {
              setShowCheckinModal(false);
              setSelectedGauge(null);
              refetch();
            }}
            gauge={selectedGauge}
          />
        </>
      )}

      {/* Admin Modals */}
      <QCApprovalsModal
        isOpen={showQCModal}
        onClose={() => setShowQCModal(false)}
      />

      <OutOfServiceReviewModal
        isOpen={showOutOfServiceModal}
        onClose={() => setShowOutOfServiceModal(false)}
      />

      <UnsealRequestModal
        isOpen={showUnsealModal}
        gauge={null}
        onClose={() => setShowUnsealModal(false)}
      />
    </>
  );
};