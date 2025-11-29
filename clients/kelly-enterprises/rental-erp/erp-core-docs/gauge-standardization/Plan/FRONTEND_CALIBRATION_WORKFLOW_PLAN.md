# Frontend Calibration Workflow Implementation Plan
**Date**: 2025-10-26
**Status**: PLANNING
**Reference**: ADDENDUM lines 2291-2470

---

## Current State Analysis

### ✅ Backend Complete (100%)
- CalibrationBatchManagementService (351 lines)
- CalibrationWorkflowService (429 lines)
- CertificateService with supersession
- Migration 006 applied (pending_release status)
- 39/39 integration tests passing

### ❌ Frontend Missing (0%)
**No calibration workflow UI components exist**

**What exists**:
- GaugeDetail shows calibration dates (read-only)
- No certificate upload UI
- No "Send to Calibration" action
- No pending release management
- No calibration management page

---

## Required Frontend Components

### 1. CalibrationManagementPage (NEW PAGE)
**Location**: `frontend/src/modules/gauge/pages/CalibrationManagementPage.tsx`
**Route**: `/gauges/calibration-management`
**Access**: Admin/QC only

**3 Main Sections**:

#### Section A: Send to Calibration
```tsx
<section>
  <h2>Send to Calibration</h2>

  {/* Batch Selection Table */}
  <DataTable
    data={availableSets}
    selectable={true}
    onSelect={handleSelectSets}
  />

  <Button onClick={() => sendToCalibration(selectedSets)}>
    Send Selected to Calibration ({selectedSets.length})
  </Button>
</section>
```

**Features**:
- Select multiple gauge sets
- Batch operation button
- Filters: Available sets only
- Quick action per row

#### Section B: Pending Certificate
```tsx
<section>
  <h2>Pending Certificate ({pendingCertCount})</h2>

  {/* Individual Gauges List */}
  {pendingCertGauges.map(gauge => (
    <GaugeRow
      gauge={gauge}
      action={<Button onClick={() => uploadCertificate(gauge)}>
        Upload Certificate
      </Button>}
    />
  ))}
</section>
```

**Features**:
- List gauges with status = 'pending_certificate'
- Upload button per gauge
- Opens CertificateUploadModal

#### Section C: Pending Release
```tsx
<section>
  <h2>Pending Release ({pendingReleaseCount})</h2>

  {/* Sets Awaiting Location Verification */}
  {pendingReleaseSets.map(set => (
    <SetRow
      set={set}
      action={<Button onClick={() => releaseSet(set)}>
        Verify Location & Release
      </Button>}
    />
  ))}
</section>
```

**Features**:
- List sets with status = 'pending_release'
- Release button per set
- Opens ReleaseSetModal

---

### 2. CertificateUploadModal (NEW MODAL)
**Location**: `frontend/src/modules/gauge/components/modals/CertificateUploadModal.tsx`

**5-Step Flow**:

#### Step 1: Upload Certificate
```tsx
<Modal title={`Upload Certificate - ${gauge.gauge_id}`}>
  <FileUpload
    onChange={handleFileSelect}
    accept=".pdf,.jpg,.png"
  />

  <Button onClick={handleUpload}>Upload</Button>

  {uploadSuccess && (
    <>
      <Icon name="check" color="success" />
      <p>Certificate uploaded successfully</p>

      <FormCheckbox
        label="All certificates uploaded for this gauge"
        checked={allCertsUploaded}
        onChange={setAllCertsUploaded}
      />
    </>
  )}
</Modal>
```

#### Step 2: Companion Prompt (if checkbox checked)
```tsx
{allCertsUploaded && gauge.companion_gauge_id && (
  <Modal title="Companion Gauge Certificate">
    <p>✓ {gauge.gauge_id} certificate verified</p>
    <p>Do you have the certificate for companion gauge?</p>
    <p><strong>{companionGauge.gauge_id}</strong></p>

    <Button onClick={uploadCompanionCertificate}>
      Yes, Upload Now →
    </Button>
    <Button variant="secondary" onClick={saveForLater}>
      Not Yet
    </Button>
  </Modal>
)}
```

#### Step 3-4: Repeat for companion gauge

#### Step 5: Auto-trigger ReleaseSetModal
```tsx
{bothCertificatesUploaded && (
  <ReleaseSetModal
    set={gaugeSet}
    onRelease={handleRelease}
    onCancel={handleCancel}
  />
)}
```

---

### 3. ReleaseSetModal (NEW MODAL)
**Location**: `frontend/src/modules/gauge/components/modals/ReleaseSetModal.tsx`

```tsx
<Modal title={`Release Set to Available`}>
  <p>Set {set.base_id} - Both certificates verified ✓</p>

  <FormGroup>
    <label>Verify Storage Location:</label>
    <p>Current: {set.storage_location}</p>

    <LocationInput
      value={newLocation}
      onChange={setNewLocation}
      defaultValue={set.storage_location}
    />
  </FormGroup>

  <Alert variant="warning">
    ⚠️ Confirm physical location before releasing
  </Alert>

  <ButtonGroup>
    <Button onClick={handleRelease}>Release Set</Button>
    <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
  </ButtonGroup>
</Modal>
```

**Behavior**:
- **Release**: Call API to set status = 'available', update location
- **Cancel**: Call API to set status = 'pending_release', preserve certificates

---

### 4. SendToCalibrationModal (NEW MODAL)
**Location**: `frontend/src/modules/gauge/components/modals/SendToCalibrationModal.tsx`

```tsx
<Modal title="Send to Calibration">
  {isBatch ? (
    <p>Send {selectedSets.length} sets to calibration?</p>
  ) : (
    <p>Send set {set.base_id} to calibration?</p>
  )}

  <ul>
    {setsToSend.map(set => (
      <li key={set.id}>
        {set.base_id} - {set.go_gauge.gauge_id} & {set.nogo_gauge.gauge_id}
      </li>
    ))}
  </ul>

  <ButtonGroup>
    <Button onClick={handleSend}>Send to Calibration</Button>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
  </ButtonGroup>
</Modal>
```

**API Call**: `POST /api/calibration/batches/send`

---

### 5. Integration with Existing Components

#### GaugeDetail.tsx (MODIFY)
**Add Certificate Upload Button**:

```tsx
{/* In Status section */}
{gauge.status === 'pending_certificate' && isAdminOrQC && (
  <Button
    icon={<Icon name="upload" />}
    onClick={() => setShowCertUploadModal(true)}
  >
    Upload Certificate
  </Button>
)}

{/* In Certificate History section */}
<section>
  <h3>Calibration Certificates</h3>
  {certificates.map(cert => (
    <CertificateCard
      certificate={cert}
      onDownload={downloadCertificate}
      showSuperseded={cert.is_current === false}
    />
  ))}
</section>
```

#### GaugeList.tsx (MODIFY)
**Add Quick Action Menu Item**:

```tsx
{/* In actions dropdown */}
{gauge.status === 'available' && isAdminOrQC && (
  <MenuItem onClick={() => sendToCalibration([gauge])}>
    <Icon name="paper-plane" />
    Send to Calibration
  </MenuItem>
)}
```

#### Navigation (MODIFY)
**Add new menu item**:

```tsx
{/* In admin section */}
{isAdminOrQC && (
  <NavItem to="/gauges/calibration-management">
    <Icon name="flask" />
    Calibration Management
  </NavItem>
)}
```

---

## API Endpoints Required (Backend Already Exists)

### Send to Calibration
- ✅ `POST /api/calibration/batches` - Create batch
- ✅ `POST /api/calibration/batches/:id/gauges` - Add gauges
- ✅ `POST /api/calibration/batches/:id/send` - Send to calibration

### Certificate Upload
- ✅ `POST /api/gauges/:id/upload-certificate` - Upload certificate
- ✅ `GET /api/gauges/:id/certificates` - Get certificates
- ✅ `DELETE /api/gauges/:id/certificates/:certId` - Delete certificate

### Release Workflow
- ✅ `POST /api/calibration/workflow/:id/receive` - Mark as pending_certificate
- ✅ `POST /api/calibration/workflow/:id/verify-certificates` - Mark as pending_release
- ✅ `POST /api/calibration/workflow/:id/verify-location` - Release to available

### Status Queries
- ✅ `GET /api/gauges?status=pending_certificate` - Get pending cert gauges
- ✅ `GET /api/gauges?status=pending_release` - Get pending release sets
- ✅ `GET /api/gauges?status=out_for_calibration` - Get out for calibration

---

## Implementation Order

### Phase 1: Core Modals (2-3 hours)
1. ✅ Backend complete (already done)
2. ❌ CertificateUploadModal - Step-by-step flow with companion awareness
3. ❌ ReleaseSetModal - Location verification
4. ❌ SendToCalibrationModal - Batch/single send

### Phase 2: Calibration Management Page (2-3 hours)
5. ❌ Create CalibrationManagementPage
6. ❌ Implement 3 sections (Send, Pending Cert, Pending Release)
7. ❌ Add route and navigation

### Phase 3: Integration (1-2 hours)
8. ❌ Add upload button to GaugeDetail
9. ❌ Add "Send to Calibration" action to GaugeList
10. ❌ Add certificate history display to GaugeDetail

### Phase 4: Testing (1-2 hours)
11. ❌ Manual testing of full workflow
12. ❌ E2E tests with Playwright
13. ❌ Update ADDENDUM tracker

**Total Estimated Time**: 6-10 hours

---

## Success Criteria

### ✅ Backend (COMPLETE)
- [x] 39/39 integration tests passing
- [x] All API endpoints working
- [x] Certificate supersession working
- [x] Batch management working
- [x] Status transitions validated

### ❌ Frontend (TODO)
- [ ] Can send sets to calibration (batch & single)
- [ ] Can upload certificates with companion awareness
- [ ] Can verify and release sets
- [ ] Can view certificate history
- [ ] Status badges show correct states
- [ ] Admin-only access enforced
- [ ] E2E tests covering full workflow

---

## Files to Create

### New Pages
- `frontend/src/modules/gauge/pages/CalibrationManagementPage.tsx`

### New Modals
- `frontend/src/modules/gauge/components/modals/CertificateUploadModal.tsx`
- `frontend/src/modules/gauge/components/modals/ReleaseSetModal.tsx`
- `frontend/src/modules/gauge/components/modals/SendToCalibrationModal.tsx`

### New Components
- `frontend/src/modules/gauge/components/CertificateCard.tsx` (display cert with download)
- `frontend/src/modules/gauge/components/CertificateHistory.tsx` (list all certs)

### Modify Files
- `frontend/src/modules/gauge/components/GaugeDetail.tsx` (add upload button & cert history)
- `frontend/src/modules/gauge/pages/GaugeList.tsx` (add "Send to Calibration" action)
- `frontend/src/modules/gauge/routes.tsx` (add CalibrationManagementPage route)
- `frontend/src/infrastructure/navigation/Navigation.tsx` (add menu item)

### New Hooks
- `frontend/src/modules/gauge/hooks/useCalibrationWorkflow.ts` (workflow state management)
- `frontend/src/modules/gauge/hooks/useCertificateUpload.ts` (certificate upload logic)

---

## Next Steps

1. Review this plan with user
2. Get approval on UI/UX approach
3. Begin Phase 1 implementation
4. Test each phase before moving to next
5. Update ADDENDUM tracker when complete

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
