# Implementation Checklist

**Date**: 2025-10-26
**Status**: Not Started

---

## Overview

Component-by-component tracking for frontend implementation covering 100% of ADDENDUM requirements.

**Total Scope**: ~8,000-10,000 lines of TypeScript/React code
- 25 new components
- 4 new services
- 2 new Zustand stores
- 4 new routes
- 4 modified files

---

## Phase 0: Foundation & Architecture

### Zustand Stores
- [ ] GaugeSetStore.ts
  - [ ] State interface defined
  - [ ] Actions implemented (fetch, unpair, replace, pair)
  - [ ] Helpers implemented (getSetById, getCompanionGauge, isSetComplete, getCompatibleSpares)
  - [ ] Unit tests written (≥80% coverage)

- [ ] CalibrationStore.ts
  - [ ] State interface defined
  - [ ] Actions implemented (fetch queues, send, upload, verify, release)
  - [ ] Helpers implemented (getPendingCounts)
  - [ ] Unit tests written (≥80% coverage)

### Shared Components
- [ ] GaugeStatusBadge.tsx
  - [ ] All 9 statuses supported
  - [ ] Size variants (sm, md, lg)
  - [ ] Icon support
  - [ ] Component tests written

- [ ] SetStatusIndicator.tsx
  - [ ] Same status display
  - [ ] Differential status display
  - [ ] Component tests written

- [ ] CompanionGaugeLink.tsx
  - [ ] Navigation functionality
  - [ ] Accessibility compliant
  - [ ] Component tests written

- [ ] LocationVerificationModal.tsx
  - [ ] Reusable implementation
  - [ ] Location dropdown
  - [ ] Warning display
  - [ ] Component tests written

### API Services
- [ ] gaugeSetService.ts
  - [ ] getAllSets implemented
  - [ ] getSpareGauges implemented
  - [ ] getCompatibleSpares implemented
  - [ ] unpairSet implemented
  - [ ] replaceGauge implemented
  - [ ] pairSpares implemented
  - [ ] Unit tests written

- [ ] calibrationService.ts
  - [ ] getQueues implemented
  - [ ] sendToCalibration implemented
  - [ ] uploadCertificate implemented
  - [ ] verifyCertificate implemented
  - [ ] releaseSet implemented
  - [ ] Unit tests written

- [ ] certificateService.ts
  - [ ] getCertificateHistory implemented
  - [ ] downloadCertificate implemented
  - [ ] viewCertificate implemented
  - [ ] Unit tests written

- [ ] customerGaugeService.ts
  - [ ] returnGauge implemented
  - [ ] getReturnedGauges implemented
  - [ ] Unit tests written

### Hooks
- [ ] usePermissions.ts
  - [ ] Role checks implemented
  - [ ] Permission flags exposed
  - [ ] Unit tests written

---

## Phase 1: Enhanced Gauge List & Details

### Modified Components
- [ ] GaugeList.tsx (MODIFY EXISTING)
  - [ ] Set vs unpaired visual indicators
  - [ ] Checkout enforcement (sets only)
  - [ ] Navigation to Set Details
  - [ ] Integration tests written

### New Pages
- [ ] SetDetailsPage.tsx (CREATE NEW)
  - [ ] Layout implementation (shared info + two columns)
  - [ ] Actions menu
  - [ ] Navigation controls
  - [ ] Customer-owned handling
  - [ ] Integration tests written

### Modified Pages
- [ ] GaugeDetailsPage.tsx (MODIFY EXISTING)
  - [ ] Navigation controls (Back to Set, Close to List)
  - [ ] Set relationship section
  - [ ] Companion links
  - [ ] Actions menu (paired vs unpaired)
  - [ ] Integration tests written

---

## Phase 2: Set Management Operations

### New Components
- [ ] UnpairSetModal.tsx
  - [ ] Modal layout
  - [ ] Validation logic
  - [ ] API integration
  - [ ] Success/error handling
  - [ ] Component + integration tests

- [ ] ReplaceGaugeModal.tsx
  - [ ] Modal layout
  - [ ] Compatible gauges fetching
  - [ ] Selection logic
  - [ ] API integration
  - [ ] Component + integration tests

---

## Phase 3: Calibration Workflow

### New Pages
- [ ] CalibrationManagementPage.tsx (CREATE NEW)
  - [ ] Send to Calibration section
  - [ ] Pending Certificate section
  - [ ] Pending Release section
  - [ ] Permission enforcement
  - [ ] Integration tests written

### New Components
- [ ] CertificateUploadModal.tsx
  - [ ] 5-step flow implementation
  - [ ] Companion awareness
  - [ ] Location verification integration
  - [ ] API integration
  - [ ] Component + integration tests

- [ ] ReleaseSetModal.tsx
  - [ ] Location verification
  - [ ] API integration
  - [ ] Component + integration tests

- [ ] SendToCalibrationModal.tsx
  - [ ] Batch selection display
  - [ ] API integration
  - [ ] Component + integration tests

---

## Phase 4: Customer Return Workflow

### New Components
- [ ] ReturnCustomerGaugeModal.tsx
  - [ ] Set context variant
  - [ ] Paired context variant
  - [ ] Unpaired context variant
  - [ ] Companion awareness
  - [ ] Validation logic
  - [ ] Component + integration tests

### New Pages
- [ ] ReturnedCustomerGaugesPage.tsx (CREATE NEW)
  - [ ] Customer filter
  - [ ] Search functionality
  - [ ] Read-only details view
  - [ ] Permission enforcement
  - [ ] Integration tests written

---

## Phase 5: Spare Pairing Interface

### New Pages
- [ ] SpareInventoryPage.tsx (CREATE NEW)
  - [ ] Two-column layout orchestration
  - [ ] Selection state management
  - [ ] Location modal integration
  - [ ] Permission enforcement
  - [ ] Integration tests written

### New Components
- [ ] SpareInventoryFilters.tsx
  - [ ] Search input with debounce
  - [ ] Type dropdown
  - [ ] Category dropdown
  - [ ] Count display
  - [ ] Component tests

- [ ] SpareInventoryColumns.tsx
  - [ ] Two-column layout
  - [ ] Selection logic
  - [ ] Compatibility filtering
  - [ ] Create set button
  - [ ] Component tests

- [ ] SpareGaugeCard.tsx
  - [ ] Visual states (default, selected, compatible)
  - [ ] Click handling
  - [ ] Component tests

---

## Phase 6: "Add Gauge" Wizard

### New Components
- [ ] AddGaugeWizard.tsx
  - [ ] Equipment type selection step
  - [ ] Thread gauge options step
  - [ ] Navigation logic
  - [ ] Integration with other pages
  - [ ] Component tests

---

## Phase 7: Navigation & Routing

### Route Configuration
- [ ] SetDetailsPage route (/gauges/sets/:setId)
- [ ] CalibrationManagementPage route (/admin/gauge-management/calibration)
- [ ] ReturnedCustomerGaugesPage route (/admin/gauge-management/returned-customer-gauges)
- [ ] SpareInventoryPage route (/admin/gauge-management/spare-inventory)

### Navigation Updates
- [ ] ProtectedRoute component (if not existing)
- [ ] Admin/QC navigation menu updated
- [ ] Permission-based rendering
- [ ] Breadcrumb navigation
- [ ] Status badges in navigation

---

## Phase 8: Certificate History

### New Components
- [ ] CertificateHistory.tsx
  - [ ] Certificate fetching
  - [ ] Current vs superseded display
  - [ ] Component tests

- [ ] CertificateCard.tsx
  - [ ] View functionality
  - [ ] Download functionality
  - [ ] Supersession display
  - [ ] Component tests

### Modified Pages
- [ ] GaugeDetailsPage.tsx (ADD SECTION)
  - [ ] CertificateHistory integration

---

## Testing

### Unit Tests
- [ ] All stores tested (≥80% coverage)
- [ ] All services tested (≥80% coverage)
- [ ] All shared components tested
- [ ] All hooks tested

### Integration Tests
- [ ] All modals tested (complete workflows)
- [ ] All pages tested (data fetching, navigation, permissions)
- [ ] Spare pairing interface tested

### E2E Tests
- [ ] Calibration workflow E2E test
- [ ] Customer return workflow E2E test
- [ ] Spare pairing workflow E2E test

---

## Documentation

- [ ] Component API documentation
- [ ] State management documentation
- [ ] Testing documentation
- [ ] Deployment guide

---

## Progress Tracking

**Components Completed**: 0 / 25
**Services Completed**: 0 / 4
**Stores Completed**: 0 / 2
**Routes Completed**: 0 / 4
**Tests Written**: 0 / ~50

**Overall Progress**: 0%

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
