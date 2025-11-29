# Phase 3: Calibration Workflow

**Date**: 2025-10-26
**Status**: Not Started
**Dependencies**: Phase 0, Phase 1
**Architectural Approach**: CREATE self-contained page

---

## Overview

Single self-contained page for calibration management. All logic inline, React state only.

**Simplicity First**: One page file with internal components. No global store needed.

---

## Calibration Management Page

**Location**: `/frontend/src/modules/gauge/pages/CalibrationManagementPage.tsx` (**CREATE**)

**Complete self-contained implementation**:

```typescript
import { useState, useEffect } from 'react';
import { gaugeService } from '../services/gaugeService';
import {
  GaugeStatusBadge,
  Modal,
  Button,
  FileInput,
  FormSelect,
  ConfirmButton,
  CancelButton
} from '../../../infrastructure/components';

const CalibrationManagementPage = () => {
  // State for 3 sections
  const [available, setAvailable] = useState<Gauge[]>([]);
  const [pendingCert, setPendingCert] = useState<Gauge[]>([]);
  const [pendingRelease, setPendingRelease] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedGauges, setSelectedGauges] = useState<number[]>([]);
  const [selectedGauge, setSelectedGauge] = useState<Gauge | null>(null);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    setIsLoading(true);
    try {
      // Fetch available/calibration-due gauges
      const availResp = await gaugeService.getAll({
        status: 'available,calibration_due'
      });
      setAvailable(availResp.data || []);

      // Fetch pending certificate
      const pendCertResp = await gaugeService.getAll({
        status: 'pending_certificate'
      });
      setPendingCert(pendCertResp.data || []);

      // Fetch pending release
      const pendRelResp = await gaugeService.getAll({
        status: 'pending_release'
      });
      setPendingRelease(pendRelResp.data || []);
    } finally {
      setIsLoading(false);
    }
  };

  // Send to calibration
  const handleSendToCalibration = async () => {
    if (selectedGauges.length === 0) return;

    try {
      await gaugeService.sendToCalibration(selectedGauges);
      setSelectedGauges([]);
      setShowSendModal(false);
      fetchQueues();
    } catch (error) {
      console.error('Failed to send to calibration', error);
    }
  };

  // Upload certificate
  const [certFile, setCertFile] = useState<File | null>(null);

  const handleUploadCertificate = async () => {
    if (!selectedGauge || !certFile) return;

    try {
      await gaugeService.uploadCertificate(selectedGauge.id, certFile);

      // Check if companion needs certificate
      if (selectedGauge.companion_gauge_id) {
        const companionResp = await gaugeService.getById(selectedGauge.companion_gauge_id);
        if (companionResp.status === 'pending_certificate') {
          // Prompt for companion upload
          alert(`Don't forget to upload certificate for companion gauge ${companionResp.gaugeId}`);
        }
      }

      setShowUploadModal(false);
      setCertFile(null);
      fetchQueues();
    } catch (error) {
      console.error('Failed to upload certificate', error);
    }
  };

  // Release set
  const [location, setLocation] = useState('');

  const handleReleaseSet = async () => {
    if (!selectedSet || !location) return;

    try {
      await gaugeService.releaseFromCalibration(selectedSet, location);
      setShowReleaseModal(false);
      setLocation('');
      fetchQueues();
    } catch (error) {
      console.error('Failed to release set', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="calibration-management">
      <h1>Calibration Management</h1>

      {/* Section 1: Available to Send */}
      <section>
        <h2>Available to Send to Calibration</h2>
        <Button onClick={() => setShowSendModal(true)} disabled={selectedGauges.length === 0}>
          Send Selected to Calibration ({selectedGauges.length})
        </Button>

        {available.map(gauge => (
          <div key={gauge.id} className="gauge-row">
            <input
              type="checkbox"
              checked={selectedGauges.includes(gauge.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedGauges([...selectedGauges, gauge.id]);
                } else {
                  setSelectedGauges(selectedGauges.filter(id => id !== gauge.id));
                }
              }}
            />
            <div>{gauge.gaugeId}</div>
            <GaugeStatusBadge status={gauge.status} />
          </div>
        ))}
      </section>

      {/* Section 2: Pending Certificate Upload */}
      <section>
        <h2>Pending Certificate Upload</h2>
        {pendingCert.map(gauge => (
          <div key={gauge.id} className="gauge-row">
            <div>{gauge.gaugeId}</div>
            <GaugeStatusBadge status={gauge.status} />
            <Button onClick={() => {
              setSelectedGauge(gauge);
              setShowUploadModal(true);
            }}>
              Upload Certificate
            </Button>
          </div>
        ))}
      </section>

      {/* Section 3: Pending Release */}
      <section>
        <h2>Pending Release</h2>
        {pendingRelease.map(item => {
          const baseId = item.gaugeId?.replace(/[AB]$/, '');
          return (
            <div key={item.id} className="gauge-row">
              <div>🔗 {baseId}</div>
              <GaugeStatusBadge status={item.status} />
              <Button onClick={() => {
                setSelectedSet(baseId);
                setShowReleaseModal(true);
              }}>
                Release Set
              </Button>
            </div>
          );
        })}
      </section>

      {/* Send to Calibration Modal */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="Send to Calibration"
      >
        <p>Send {selectedGauges.length} gauges to calibration?</p>
        <div className="modal-actions">
          <ConfirmButton onClick={handleSendToCalibration}>Confirm</ConfirmButton>
          <CancelButton onClick={() => setShowSendModal(false)} />
        </div>
      </Modal>

      {/* Upload Certificate Modal */}
      <Modal
        isOpen={showUploadModal && !!selectedGauge}
        onClose={() => {
          setShowUploadModal(false);
          setCertFile(null);
        }}
        title={`Upload Certificate - ${selectedGauge?.gaugeId}`}
      >
        <FileInput
          accept=".pdf"
          onChange={(e) => setCertFile(e.target.files?.[0] || null)}
        />
        <div className="modal-actions">
          <ConfirmButton onClick={handleUploadCertificate} disabled={!certFile}>
            Upload
          </ConfirmButton>
          <CancelButton onClick={() => {
            setShowUploadModal(false);
            setCertFile(null);
          }} />
        </div>
      </Modal>

      {/* Release Set Modal */}
      <Modal
        isOpen={showReleaseModal && !!selectedSet}
        onClose={() => {
          setShowReleaseModal(false);
          setLocation('');
        }}
        title={`Release Set - ${selectedSet}`}
      >
        <FormSelect
          label="Storage Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          options={[
            { value: '', label: 'Select...' },
            { value: 'Shelf A1', label: 'Shelf A1' },
            { value: 'Shelf A2', label: 'Shelf A2' }
            // ... more options ...
          ]}
        />
        <div className="modal-actions">
          <ConfirmButton onClick={handleReleaseSet} disabled={!location}>
            Release Set
          </ConfirmButton>
          <CancelButton onClick={() => {
            setShowReleaseModal(false);
            setLocation('');
          }} />
        </div>
      </Modal>
    </div>
  );
};

export default CalibrationManagementPage;
```

---

## Implementation Checklist

- [ ] Create CalibrationManagementPage.tsx
- [ ] Test 3-section workflow
- [ ] Test certificate upload with companion awareness
- [ ] Test release with location verification

---

## File Count

**Files Created**: 1
- `pages/CalibrationManagementPage.tsx` - CREATE (self-contained)

**Total**: 1 file (vs. original plan: 4 files + store)

**Estimated LOC**: ~250 lines (vs. original plan: ~1,500 lines)

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
