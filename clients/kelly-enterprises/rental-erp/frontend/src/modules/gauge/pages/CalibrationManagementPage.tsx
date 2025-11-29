// Phase 3: Calibration Management Page
// Self-contained page for managing calibration workflow
// Sections: Available to Send | Pending Certificate | Pending Release
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { gaugeService } from '../services/gaugeService';
import type { Gauge } from '../types';
import {
  Modal,
  Button,
  FileInput,
  FormSelect,
  ConfirmButton,
  CancelButton,
  LoadingSpinner,
  Alert,
  DataTable,
  Badge,
  Icon
} from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useToast, useColumnManager } from '../../../infrastructure';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { GaugeModalManager } from '../components';

interface ReleaseItem {
  id: string;
  gaugeId: string;
  baseId: string; // Gauge ID without A/B suffix (same as set_id)
  status: string;
  set_id?: string; // Set ID for thread gauge sets
}

export const CalibrationManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State for 4 sections
  const [available, setAvailable] = useState<Gauge[]>([]);
  const [outForCalibration, setOutForCalibration] = useState<Gauge[]>([]);
  const [pendingCert, setPendingCert] = useState<Gauge[]>([]);
  const [pendingRelease, setPendingRelease] = useState<ReleaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedGauges, setSelectedGauges] = useState<string[]>([]);
  const [selectedGauge, setSelectedGauge] = useState<Gauge | null>(null);
  const [selectedSet, setSelectedSet] = useState<ReleaseItem | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);

  // Upload state
  const [certFile, setCertFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Release state
  const [releaseLocation, setReleaseLocation] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);

  const toast = useToast();

  const fetchQueues = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch calibration-due gauges
      const availResp = await gaugeService.getAll({
        status: 'calibration_due'
      });
      setAvailable(availResp.data || []);

      // Fetch out for calibration
      const outForCalResp = await gaugeService.getAll({
        status: 'out_for_calibration'
      });
      setOutForCalibration(outForCalResp.data || []);

      // Fetch pending certificate
      const pendCertResp = await gaugeService.getAll({
        status: 'pending_certificate'
      });
      setPendingCert(pendCertResp.data || []);

      // Fetch pending release - group by set
      const pendRelResp = await gaugeService.getAll({
        status: 'pending_release'
      });

      // Group gauges by base ID (without A/B suffix)
      const grouped = new Map<string, ReleaseItem>();
      (pendRelResp.data || []).forEach((gauge: Gauge) => {
        const baseId = gauge.gauge_id?.replace(/[AB]$/, '') || gauge.gauge_id;
        if (!grouped.has(baseId)) {
          grouped.set(baseId, {
            id: gauge.id,
            gaugeId: gauge.gauge_id,
            baseId,
            status: gauge.status,
            set_id: gauge.set_id
          });
        }
      });
      setPendingRelease(Array.from(grouped.values()));

    } catch (err: any) {
      console.error('Failed to fetch calibration queues', err);
      setError(err.message || 'Failed to load calibration data');
      toast.error('Failed to load calibration data');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch data
  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  // Send to calibration
  const handleSendToCalibration = async () => {
    if (selectedGauges.length === 0) return;

    try {
      await gaugeService.sendToCalibration(selectedGauges);
      toast.success(`Sent ${selectedGauges.length} gauge${selectedGauges.length > 1 ? 's' : ''} to calibration`);
      setSelectedGauges([]);
      setShowSendModal(false);
      fetchQueues();
    } catch (error: any) {
      console.error('Failed to send to calibration', error);
      toast.error(error.message || 'Failed to send gauges to calibration');
    }
  };

  // Upload certificate
  const handleUploadCertificate = async () => {
    if (!selectedGauge || !certFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('certificate', certFile);

      await gaugeService.uploadCertificate(selectedGauge.id, formData);
      toast.success(`Certificate uploaded for ${selectedGauge.gauge_id}`);

      // Check if companion needs certificate (for thread gauge sets)
      if (selectedGauge.set_id && selectedGauge.gauge_id) {
        const suffix = selectedGauge.gauge_id.slice(-1);
        if (suffix === 'A' || suffix === 'B') {
          const companionSuffix = suffix === 'A' ? 'B' : 'A';
          const companionGaugeId = selectedGauge.set_id + companionSuffix;
          try {
            const companion = await gaugeService.getById(companionGaugeId);
            if (companion.status === 'pending_certificate') {
              toast.info(`Companion gauge ${companion.gauge_id} also needs certificate upload`, {
                duration: 8000
              });
            }
          } catch (err) {
            console.error('Failed to check companion status', err);
          }
        }
      }

      setShowUploadModal(false);
      setSelectedGauge(null);
      setCertFile(null);
      fetchQueues();
    } catch (error: any) {
      console.error('Failed to upload certificate', error);
      toast.error(error.message || 'Failed to upload certificate');
    } finally {
      setIsUploading(false);
    }
  };

  // Release set
  const handleReleaseSet = async () => {
    if (!selectedSet || !releaseLocation) return;

    setIsReleasing(true);
    try {
      // Release using the gauge ID (backend handles the set)
      await gaugeService.releaseFromCalibration(selectedSet.gaugeId, releaseLocation);
      toast.success(`Released set ${selectedSet.baseId} to ${releaseLocation}`);
      setShowReleaseModal(false);
      setSelectedSet(null);
      setReleaseLocation('');
      fetchQueues();
    } catch (error: any) {
      console.error('Failed to release set', error);
      toast.error(error.message || 'Failed to release set from calibration');
    } finally {
      setIsReleasing(false);
    }
  };

  // Handle row click to show details
  const handleRowClick = (gauge: Gauge) => {
    setSelectedGauge(gauge);
    setModalType('details');
  };

  // Handle modal close
  const handleModalClose = async () => {
    setModalType(null);
    setSelectedGauge(null);
    await fetchQueues();
  };

  // Handle full close (X button) - close all modals and clear URL state
  const handleFullClose = () => {
    setModalType(null);
    setSelectedGauge(null);
    // Clear any URL state that might have caused modal to open
    navigate(location.pathname, { replace: true, state: {} });
  };

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Toggle gauge selection
  const toggleGaugeSelection = (gaugeId: string) => {
    setSelectedGauges(prev =>
      prev.includes(gaugeId)
        ? prev.filter(id => id !== gaugeId)
        : [...prev, gaugeId]
    );
  };

  // Select all in available section
  const handleSelectAll = () => {
    if (selectedGauges.length === available.length) {
      setSelectedGauges([]);
    } else {
      setSelectedGauges(available.map(g => g.gauge_id));
    }
  };

  // Column definitions for Available to Send section
  const availableColumns: DataTableColumn[] = useMemo(() => [
    {
      id: 'select',
      label: '',
      locked: true,
      sortable: false,
      filterable: false,
      align: 'center',
      render: (_, row: Gauge) => (
        <input
          type="checkbox"
          checked={selectedGauges.includes(row.gauge_id)}
          onChange={() => toggleGaugeSelection(row.gauge_id)}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
    {
      id: 'gauge_id',
      label: 'GAUGE ID',
      locked: true,
      align: 'left',
      render: (value) => (
        <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
          {value || '-'}
        </span>
      )
    },
    {
      id: 'name',
      label: 'DESCRIPTION',
      align: 'left'
    },
    {
      id: 'status',
      label: 'STATUS',
      align: 'center',
      render: (_, row: Gauge) => (
        <Badge size="compact" variant={StatusRules.getStatusBadgeVariant(row)}>
          {StatusRules.getStatusDisplayText(row)}
        </Badge>
      )
    },
    {
      id: 'calibration_due_date',
      label: 'CAL DUE',
      align: 'center',
      filterType: 'date',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    }
  ], [selectedGauges, toggleGaugeSelection]);

  // Column definitions for Out for Calibration section
  const outForCalibrationColumns: DataTableColumn[] = useMemo(() => [
    {
      id: 'gauge_id',
      label: 'GAUGE ID',
      locked: true,
      align: 'left',
      render: (value) => (
        <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
          {value || '-'}
        </span>
      )
    },
    {
      id: 'name',
      label: 'DESCRIPTION',
      align: 'left'
    },
    {
      id: 'status',
      label: 'STATUS',
      align: 'center',
      render: (_, row: Gauge) => (
        <Badge size="compact" variant={StatusRules.getStatusBadgeVariant(row)}>
          {StatusRules.getStatusDisplayText(row)}
        </Badge>
      )
    },
    {
      id: 'updated_at',
      label: 'DATE SENT',
      align: 'center',
      filterType: 'date',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    }
  ], []);

  // Column definitions for Pending Certificate section
  const pendingCertColumns: DataTableColumn[] = useMemo(() => [
    {
      id: 'gauge_id',
      label: 'GAUGE ID',
      locked: true,
      align: 'left',
      render: (value, row: Gauge) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
            {value || '-'}
          </span>
          {row.set_id && <Badge size="compact" variant="info">Paired</Badge>}
        </span>
      )
    },
    {
      id: 'name',
      label: 'DESCRIPTION',
      align: 'left'
    },
    {
      id: 'status',
      label: 'STATUS',
      align: 'center',
      render: (_, row: Gauge) => (
        <Badge size="compact" variant={StatusRules.getStatusBadgeVariant(row)}>
          {StatusRules.getStatusDisplayText(row)}
        </Badge>
      )
    },
    {
      id: 'actions',
      label: 'ACTIONS',
      locked: true,
      sortable: false,
      filterable: false,
      align: 'center',
      render: (_, gauge: Gauge) => (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedGauge(gauge);
            setShowUploadModal(true);
          }}
          size="sm"
          icon={<Icon name="upload" />}
        >
          Upload Certificate
        </Button>
      )
    }
  ], [setSelectedGauge, setShowUploadModal]);

  // Column definitions for Pending Release section
  const pendingReleaseColumns: DataTableColumn[] = useMemo(() => [
    {
      id: 'baseId',
      label: 'SET ID',
      locked: true,
      align: 'left',
      render: (value) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Icon name="link" />
          <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
            {value || '-'}
          </span>
          <Badge size="compact" variant="secondary">Set (A & B)</Badge>
        </span>
      )
    },
    {
      id: 'status',
      label: 'STATUS',
      align: 'center',
      render: () => (
        <Badge size="compact" variant="warning">
          PENDING RELEASE
        </Badge>
      )
    },
    {
      id: 'actions',
      label: 'ACTIONS',
      locked: true,
      sortable: false,
      filterable: false,
      align: 'center',
      render: (_, item: ReleaseItem) => (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSet(item);
            setShowReleaseModal(true);
          }}
          size="sm"
          icon={<Icon name="check" />}
        >
          Release Set
        </Button>
      )
    }
  ], [setSelectedSet, setShowReleaseModal]);

  // Column managers for each table
  const availableColumnManager = useColumnManager('calibration-available', availableColumns);
  const outForCalibrationColumnManager = useColumnManager('calibration-out-for-cal', outForCalibrationColumns);
  const pendingCertColumnManager = useColumnManager('calibration-pending-cert', pendingCertColumns);
  const pendingReleaseColumnManager = useColumnManager('calibration-pending-release', pendingReleaseColumns);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: '100%', margin: '0' }}>
      <div style={{
        marginBottom: 'var(--space-4)'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 'var(--font-size-2xl)',
          fontWeight: '600'
        }}>
          Calibration Management
        </h1>
      </div>

      {error && (
        <Alert variant="danger" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
          <Button onClick={fetchQueues} variant="link">Retry</Button>
        </Alert>
      )}

      {/* Section 1: Calibration Due */}
      <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-4)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: 'var(--space-2) var(--space-4)',
            borderBottom: collapsedSections.has('calibration-due') ? 'none' : '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <button
                onClick={() => toggleSection('calibration-due')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  padding: '4px'
                }}
                title={collapsedSections.has('calibration-due') ? 'Expand' : 'Collapse'}
              >
                {collapsedSections.has('calibration-due') ? '▶' : '▼'}
              </button>
              <h2 style={{
                margin: 0,
                fontSize: 'var(--font-size-xl)',
                fontWeight: '600'
              }}>
                Calibration Due - Ready to Send
              </h2>
              {available.length > 0 && (
                <Badge variant="primary" size="sm" count>
                  {available.length}
                </Badge>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                onClick={handleSelectAll}
                variant="secondary"
                size="sm"
                disabled={available.length === 0}
              >
                {selectedGauges.length === available.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                onClick={() => setShowSendModal(true)}
                disabled={selectedGauges.length === 0}
                size="sm"
                icon={<Icon name="paper-plane" />}
              >
                Send Selected ({selectedGauges.length})
              </Button>
            </div>
          </div>

          {!collapsedSections.has('calibration-due') && (
            <DataTable
            tableId="calibration-available"
            columns={availableColumns}
            data={available}
            columnManager={availableColumnManager}
            resetKey={location.pathname}
            onRowClick={handleRowClick}
            itemsPerPage={50}
            emptyMessage="No gauges with calibration due"
            showPagination={false}
            hideBottomInfo={true}
          />
          )}
        </div>

      {/* Section 2: Out for Calibration */}
      <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-4)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: 'var(--space-2) var(--space-4)',
            borderBottom: collapsedSections.has('out-for-calibration') ? 'none' : '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <button
                onClick={() => toggleSection('out-for-calibration')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  padding: '4px'
                }}
                title={collapsedSections.has('out-for-calibration') ? 'Expand' : 'Collapse'}
              >
                {collapsedSections.has('out-for-calibration') ? '▶' : '▼'}
              </button>
              <h2 style={{
                margin: 0,
                fontSize: 'var(--font-size-xl)',
                fontWeight: '600'
              }}>
                Out for Calibration
              </h2>
              {outForCalibration.length > 0 && (
                <Badge variant="warning" size="sm" count>
                  {outForCalibration.length}
                </Badge>
              )}
            </div>
          </div>

          {!collapsedSections.has('out-for-calibration') && (
            <DataTable
            tableId="calibration-out-for-cal"
            columns={outForCalibrationColumns}
            data={outForCalibration}
            columnManager={outForCalibrationColumnManager}
            resetKey={location.pathname}
            onRowClick={handleRowClick}
            itemsPerPage={50}
            emptyMessage="No gauges out for calibration"
            showPagination={false}
            hideBottomInfo={true}
          />
          )}
        </div>

      {/* Section 3: Pending Certificate Upload */}
      <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-4)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: 'var(--space-2) var(--space-4)',
            borderBottom: collapsedSections.has('pending-certificate') ? 'none' : '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <button
                onClick={() => toggleSection('pending-certificate')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  padding: '4px'
                }}
                title={collapsedSections.has('pending-certificate') ? 'Expand' : 'Collapse'}
              >
                {collapsedSections.has('pending-certificate') ? '▶' : '▼'}
              </button>
              <h2 style={{
                margin: 0,
                fontSize: 'var(--font-size-xl)',
                fontWeight: '600'
              }}>
                Pending Certificate Upload
              </h2>
              {pendingCert.length > 0 && (
                <Badge variant="info" size="sm" count>
                  {pendingCert.length}
                </Badge>
              )}
            </div>
          </div>

          {!collapsedSections.has('pending-certificate') && (
            <DataTable
            tableId="calibration-pending-cert"
            columns={pendingCertColumns}
            data={pendingCert}
            columnManager={pendingCertColumnManager}
            resetKey={location.pathname}
            onRowClick={handleRowClick}
            itemsPerPage={50}
            emptyMessage="No gauges pending certificate upload"
            showPagination={false}
            hideBottomInfo={true}
          />
          )}
        </div>

      {/* Section 4: Pending Release */}
      <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-4)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: 'var(--space-2) var(--space-4)',
            borderBottom: collapsedSections.has('pending-release') ? 'none' : '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <button
                onClick={() => toggleSection('pending-release')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  padding: '4px'
                }}
                title={collapsedSections.has('pending-release') ? 'Expand' : 'Collapse'}
              >
                {collapsedSections.has('pending-release') ? '▶' : '▼'}
              </button>
              <h2 style={{
                margin: 0,
                fontSize: 'var(--font-size-xl)',
                fontWeight: '600'
              }}>
                Pending Release
              </h2>
              {pendingRelease.length > 0 && (
                <Badge variant="success" size="sm" count>
                  {pendingRelease.length}
                </Badge>
              )}
            </div>
          </div>

          {!collapsedSections.has('pending-release') && (
            <DataTable
            tableId="calibration-pending-release"
            columns={pendingReleaseColumns}
            data={pendingRelease}
            columnManager={pendingReleaseColumnManager}
            resetKey={location.pathname}
            itemsPerPage={50}
            emptyMessage="No gauges pending release"
            showPagination={false}
            hideBottomInfo={true}
          />
          )}
        </div>

      {/* Send to Calibration Modal */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="Send to Calibration"
      >
        <Modal.Body>
          <p style={{ marginBottom: 'var(--space-3)' }}>
            Send {selectedGauges.length} gauge{selectedGauges.length > 1 ? 's' : ''} to calibration?
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)'
          }}>
            {selectedGauges.map(id => (
              <div key={id} style={{
                padding: 'var(--space-2) var(--space-3)',
                backgroundColor: 'var(--color-gray-100)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: '500'
              }}>
                {id}
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Actions>
          <ConfirmButton onClick={handleSendToCalibration}>
            Send to Calibration
          </ConfirmButton>
          <CancelButton onClick={() => setShowSendModal(false)} />
        </Modal.Actions>
      </Modal>

      {/* Upload Certificate Modal */}
      <Modal
        isOpen={showUploadModal && !!selectedGauge}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedGauge(null);
          setCertFile(null);
        }}
        title={`Upload Certificate - ${selectedGauge?.gauge_id || ''}`}
      >
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {selectedGauge?.set_id && (
              <Alert variant="info">
                This gauge is part of a set. You'll need to upload certificates for both gauges.
              </Alert>
            )}
            <FileInput
              accept=".pdf"
              onChange={(file) => setCertFile(file)}
              label="Upload Calibration Certificate"
              buttonText="Browse Files"
              selectedFileName={certFile ? `${certFile.name} (${(certFile.size / 1024).toFixed(2)} KB)` : undefined}
              enableDragDrop={true}
            />
          </div>
        </Modal.Body>
        <Modal.Actions>
          <ConfirmButton
            onClick={handleUploadCertificate}
            disabled={!certFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Certificate'}
          </ConfirmButton>
          <CancelButton
            onClick={() => {
              setShowUploadModal(false);
              setSelectedGauge(null);
              setCertFile(null);
            }}
            disabled={isUploading}
          />
        </Modal.Actions>
      </Modal>

      {/* Release Set Modal */}
      <Modal
        isOpen={showReleaseModal && !!selectedSet}
        onClose={() => {
          setShowReleaseModal(false);
          setSelectedSet(null);
          setReleaseLocation('');
        }}
        title={`Release Set - ${selectedSet?.baseId || ''}`}
      >
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Alert variant="info">
              Both gauges in this set will be released to the selected location.
            </Alert>
            <FormSelect
              label="Storage Location"
              value={releaseLocation}
              onChange={(e) => setReleaseLocation(e.target.value)}
              options={[
                { value: '', label: 'Select Location...' },
                { value: 'Shelf A1', label: 'Shelf A1' },
                { value: 'Shelf A2', label: 'Shelf A2' },
                { value: 'Shelf A3', label: 'Shelf A3' },
                { value: 'Shelf B1', label: 'Shelf B1' },
                { value: 'Shelf B2', label: 'Shelf B2' },
                { value: 'Shelf B3', label: 'Shelf B3' },
                { value: 'Cabinet 1', label: 'Cabinet 1' },
                { value: 'Cabinet 2', label: 'Cabinet 2' },
                { value: 'Cabinet 3', label: 'Cabinet 3' }
              ]}
              required
            />
          </div>
        </Modal.Body>
        <Modal.Actions>
          <ConfirmButton
            onClick={handleReleaseSet}
            disabled={!releaseLocation || isReleasing}
          >
            {isReleasing ? 'Releasing...' : 'Release Set'}
          </ConfirmButton>
          <CancelButton
            onClick={() => {
              setShowReleaseModal(false);
              setSelectedSet(null);
              setReleaseLocation('');
            }}
            disabled={isReleasing}
          />
        </Modal.Actions>
      </Modal>

      {/* Gauge Details Modal */}
      {modalType && selectedGauge && (
        <GaugeModalManager
          selectedGauge={selectedGauge}
          modalType={modalType}
          onClose={handleModalClose}
          onFullClose={handleFullClose}
          onRefetch={fetchQueues}
          onModalTypeChange={setModalType}
        />
      )}
    </div>
  );
};
