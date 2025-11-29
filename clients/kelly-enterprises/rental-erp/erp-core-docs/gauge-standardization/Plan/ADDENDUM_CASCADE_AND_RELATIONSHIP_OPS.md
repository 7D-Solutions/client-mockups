# Gauge Set System - Addendum: Cascade Operations & Relationship Management

**Date**: 2025-10-25
**Status**: Ready for Implementation
**Trigger**: User clarification questions about set lifecycle and UI behavior
**Approved By**: Architect 2 with user validation

---

## 🚨 UPDATE: Complete Frontend UX Specifications Added (2025-10-25)

**IMPORTANT**: This addendum has been updated with comprehensive frontend UX specifications covering all gauge set management interfaces. See new section: [Frontend UX Specifications](#frontend-ux-specifications)

**What's New**:
- "Add Gauge" workflow (2-step wizard with thread gauge options)
- Gauge list display patterns (sets vs. unpaired gauges)
- Set Details and Individual Gauge Details pages
- Navigation patterns and actions menus
- Checkout enforcement (sets only)
- Complete calibration workflow UI (send, cert upload, location verification)
- New status: "pending_release" (certs verified, awaiting location)
- Pending QC and Calibration Management dashboards
- Spare inventory pairing interface (two-column with filtering)

**Location**: Complete section added before "Edge Cases Addressed"

---

## Table of Contents

**Quick Navigation**: All sections include line numbers for precise navigation.

### Core Documentation (Lines 209-1656)

**1. [Context](#context)** (Lines 209-272)
- Why this addendum exists
- Scope of additions (7 major areas)

**2. [Investigation Evidence](#investigation-evidence)** (Lines 233-272)
- What EXISTS in codebase vs. what DOES NOT EXIST
- Architectural decision: Cascades are core requirements

**3. [Terminology Clarification](#terminology-clarification)** (Lines 274-313)
- User-facing terms (Set, GO/NO GO gauge)
- API response format
- UI display patterns

**4. [Immutability Rules](#immutability-rules)** (Lines 315-375)
- LOCKED fields: Identity, classification, specs, ownership, audit
- OPERATIONAL changes allowed: Status, location, checkout, calibration

**5. [Relationship Operations](#relationship-operations)** (Lines 377-639)
- 1️⃣ Create Gauge Set (already in plan) - Line 379
- 2️⃣ Pair Orphaned Gauges (enhanced with location prompt) - Line 385
- 3️⃣ **Unpair Set** (NEW) - Line 469
- 4️⃣ **Replace Gauge in Set** (NEW) - Line 524

**6. [Cascade Operations](#cascade-operations)** (Lines 641-1002)
- 1️⃣ Out of Service → both OOS - Line 654
- 2️⃣ Return to Service → both available - Line 751
- 3️⃣ Location Change → both move - Line 773
- 4️⃣ Checkout Enforcement → both together - Line 843
- 5️⃣ Deletion/Retirement → orphan companion - Line 919

**7. [Computed Set Status](#computed-set-status)** (Lines 1004-1059)
- Usability matrix (13 status combinations)
- AND logic: Set available ONLY if both available
- Seal status: ANY sealed = set sealed

**8. [Calibration Workflow](#calibration-workflow)** (Lines 1061-1381) ⭐ **7-STEP PROCESS**
- Step 1-3: Create batch, add gauges, send to calibration
- Step 4: Receive → `pending_certificate` + sealed
- Step 5: Upload certificates (separate per gauge)
- Step 6: Verify → `pending_release` when both verified ⭐ NEW STATUS
- Step 7: Location verification → `available`
- **NEW STATUSES**: `out_for_calibration`, `pending_certificate`, `pending_release`

**9. [Certificate Requirements](#certificate-requirements)** (Lines 1383-1459)
- Separate certificates per gauge
- Certificate upload flow
- Certificate history tracking

**10. [Customer Ownership](#customer-ownership)** (Lines 1461-1601)
- Ownership rules: company or customer only (no employee for thread gauges)
- Customer-owned gauge requirements
- Pairing validation for ownership
- **Return workflow** → `returned` status ⭐ NEW STATUS

**11. [Validation Rules Summary](#validation-rules-summary)** (Lines 1603-1656)
- Pairing, Replace, Delete, Unpair, Re-pairing validation

### Implementation Details (Lines 1658-1942)

**12. [Database Schema Changes](#database-schema-changes)** (Lines 1658-1863) ⭐ **CRITICAL**
- **Status Enum Update**: 4 new statuses (Line 1658)
  - `out_for_calibration`
  - `pending_certificate`
  - `pending_release`
  - `returned`
- Customer ID field (Line 1680)
- Certificate enhancements (Line 1691)
- Calibration batch tables (Line 1704)
- Migration script (Line 1757)

**13. [Phase Integration](#phase-integration)** (Lines 1865-1942)
- Updates to existing phases (Line 1867)
- **NEW Phase 4.5**: Calibration Workflow (Line 1899)

**14. [Code Examples](#code-examples)** (Lines 1944-2025)
- Repository layer additions (Line 1946)
- Domain model enhancements (Line 1985)

### Frontend UX Specifications (Lines 2027-3104) ⭐ **COMPREHENSIVE UI DESIGN**

**15. [Frontend UX Specifications](#frontend-ux-specifications)** (Lines 2027-3104)

**15.1. "Add Gauge" Workflow** (Lines 2041-2101)
- 2-step wizard
- Thread Gauge → 3 options (Single, New Set, Pair Spares)

**15.2. Gauge List Display** (Lines 2103-2138)
- Sets vs. unpaired gauges
- Visual indicators: 🔗 "(Set)", "(GO - Unpaired)"

**15.3. Set Details Page** (Lines 2140-2184)
- Shared info shown once
- Minimal redundancy
- Clickable references

**15.4. Individual Gauge Details** (Lines 2186-2243)
- Navigation: [← Back to Set] [× Close to List]
- Companion gauge clickable

**15.5. Actions Menus** (Lines 2245-2275)
- Set-level actions
- Individual gauge actions

**15.6. Checkout Enforcement** (Lines 2277-2289)
- Sets only (no unpaired gauges)

**15.7. Calibration Workflow UI** (Lines 2291-2470) ⭐ **7-STEP UI FLOW**
- Send to calibration (batch interface)
- Certificate upload with companion prompt
- **Location verification modal** (Step 7)
- **Pending Release handling** (`pending_release` status)
- Pending QC and Calibration Management dashboards

**15.8. Customer Gauge Return Workflow** (Lines 2472-2720) ⭐ **DUAL ACCESS**
- Return action in Set Details AND Individual Gauge Details
- Return modals (set vs. individual)
- Toggle to return one or both from set
- **New "Returned Customer Gauges" page** (Admin/QC only)
- API endpoints defined

**15.9. Spare Inventory Pairing Interface** (Lines 2724-3005)
- Two-column layout (GO | NO GO)
- Compatibility filtering (only compatible shown)
- Location selection modal
- Component hierarchy

### Summary & Next Steps (Lines 3106-3229)

**16. [Edge Cases Addressed](#edge-cases-addressed)** (Lines 3106-3136)
- 6 edge cases with resolutions

**17. [Summary of Additions](#summary-of-additions-to-unified-plan)** (Lines 3138-3195)
- 8 categories, 30+ items documented

**18. [Implementation Priority](#implementation-priority)** (Lines 3197-3214)
- High: Cascade ops, unpair/replace, immutability
- Medium: Calibration, customer ownership
- Lower: Advanced features

**19. [Next Steps](#next-steps)** (Lines 3216-3224)
- Review & approve
- Update unified plan
- Begin Phase 0

---

### 🔍 Quick Find - Key Topics

| Topic | Line Numbers |
|-------|-------------|
| **4 New Statuses** | 1103-1126, 1658-1678 |
| **Cascade Operations** | 641-1002 |
| **7-Step Calibration** | 1061-1381, 2291-2470 |
| **Customer Return** | 1517-1586, 2472-2720 |
| **Spare Pairing UI** | 2724-3005 |
| **Database Schema** | 1658-1863 |
| **Validation Rules** | 1603-1656 |
| **Code Examples** | Throughout file (see line refs in sections) |

---

### 📊 Document Statistics

- **Total Lines**: ~3,229
- **Total Tokens**: ~28,682
- **Main Sections**: 19
- **Subsections**: 80+
- **Code Examples**: 25+
- **UI Mockups**: 15+
- **Database Migrations**: 6
- **API Endpoints**: 10+

---

## Context

### Why This Addendum Exists

During architectural review, user asked: *"How are individual gauges in a set handled in the UI?"*

This revealed critical gaps in the unified plan:
- ✅ Plan covers **pairing system** (create sets, validate relationships)
- ❌ Plan missing **lifecycle operations** (status changes, location, calibration)
- ❌ Plan missing **cascade behavior** (when one gauge affects companion)

### Scope of Additions

This addendum adds to the unified plan:
1. **Relationship Management**: Unpair, replace operations
2. **Cascade Operations**: Status, location, checkout enforcement
3. **Calibration Workflow**: Complete send/receive/certificate process with location verification
4. **Customer Ownership**: Rules for customer-supplied gauges
5. **Computed Set Status**: How set usability is determined
6. **Immutability Rules**: What can/cannot change after creation
7. **Frontend UX Specifications**: Complete UI/UX design for all gauge set management interfaces

---

## Investigation Evidence

### What EXISTS in Codebase

**Database Schema** (`db_export_20251021_212300.sql`):
- ✅ `companion_gauge_id` field (line 1269)
- ✅ `gauge_suffix` field (line 1281)
- ✅ `storage_location` field (line 1283)
- ✅ Foreign key constraint (line 1299)
- ✅ `certificates` table (migration 006)
- ✅ Certificate upload service

**Backend Services**:
- ✅ `GaugeStatusService` - status management (NO cascade logic)
- ✅ `GaugeOperationsService` - checkout, status updates (NO cascade logic)
- ✅ `GaugeRepository` - CRUD operations (NO companion awareness)
- ✅ `CertificateService` - certificate uploads (works per gauge)

### What DOES NOT EXIST

**Missing Cascade Logic**:
- ❌ Status update does NOT check for companion
- ❌ Location update does NOT cascade to companion
- ❌ Deletion does NOT orphan companion
- ❌ Checkout does NOT enforce "both together" rule

**Missing Operations**:
- ❌ Unpair set operation
- ❌ Replace gauge in set operation
- ❌ Calibration batch workflow
- ❌ Certificate requirement enforcement

### Architectural Decision

**Cascade operations ARE core requirements** for initial implementation (development phase).
- NOT a future enhancement
- Part of pairing system design
- Required for production use

---

## Terminology Clarification

### User-Facing Terms

**Paired Gauges = "Set"** (not "companion gauges")

| Technical (Code/Database) | User-Facing (UI) |
|---------------------------|------------------|
| `companion_gauge_id` | Part of set |
| Companion gauge | GO gauge / NO GO gauge |
| Link companions | Create set / Pair gauges |
| Unpair companions | Unpair set / Dissolve set |
| Orphaned gauge | Spare gauge / Unpaired gauge |

### API Response Format

```json
{
  "success": true,
  "data": {
    "set": {
      "baseId": "TG0123",
      "goGauge": { "id": 100, "system_gauge_id": "TG0123A", ... },
      "noGoGauge": { "id": 101, "system_gauge_id": "TG0123B", ... }
    }
  }
}
```

### UI Display

**List View**: Show sets as single entries
```
📦 2.000-3.000 Thread Ring    Set    Available
   (GO: TG0123A | NO GO: TG0123B)
```

**Detail View**: Show both gauges side-by-side with individual operations

---

## Immutability Rules

### LOCKED After Creation (Cannot Change)

**Identity Fields**:
- `gauge_id`
- `system_gauge_id`
- `custom_id`
- `serial_number`

**Classification**:
- `equipment_type` (thread_gauge, hand_tool, etc.)
- `category_id` (Standard, Metric, NPT, etc.)

**Thread Specifications** (entire `gauge_thread_specifications` table):
- `thread_size`
- `thread_type`
- `thread_class`
- `thread_form`
- `gauge_type` (plug/ring)
- `gauge_suffix` (A/B)
- `thread_hand` (RH/LH)
- `acme_starts`

**Descriptive Fields**:
- `name`
- `standardized_name`

**Ownership** (for thread gauges):
- `ownership_type` (company or customer - locked at creation)
- `employee_owner_id` (always NULL for thread gauges)
- `purchase_info`
- `customer_id` (if customer-owned, locked at creation)

**Audit Fields**:
- `created_by`
- `created_at`

**Rationale**:
- Physical gauges don't change specs
- Prevents data corruption
- Mistake → Delete with reason "clerical error" + recreate

### OPERATIONAL Changes Allowed

**Workflow State**:
- `status` (with cascade rules)
- `storage_location` (with cascade rules)
- `is_sealed` (unsealed on checkout, sealed on calibration return)

**System-Managed**:
- `companion_gauge_id` (pairing/unpairing operations)
- `is_spare` (computed: NULL companion = spare)
- `is_deleted` (soft delete flag)
- `is_active` (deactivation flag)
- `updated_at` (automatic timestamp)

**Separate Operation**:
- Calibration certificates (upload/manage in `certificates` table)

---

## Relationship Operations

### 1. Create Gauge Set (Already in Plan)

**Operation**: Create new GO + NO GO pair together
**Service**: `GaugeSetService.createGaugeSet(goData, noGoData, userId)`
**Status**: ✅ Already in unified plan (lines 994-1074)

### 2. Pair Orphaned Gauges (Enhanced)

**Operation**: Pair two existing spare gauges into set

**Enhanced Requirements**:
- **Location Prompt**: User must specify location for the set
- Both gauges updated to chosen location
- Individual statuses unchanged (OOS + Available = Unusable set)

**Service Method**:
```javascript
async pairSpares(goGaugeId, noGoGaugeId, setLocation, userId) {
  return this.executeWithRetry(async () => {
    return this.executeInTransaction(async (connection) => {
      // 1. Fetch both gauges
      const goGauge = await this.gaugeRepository.findById(goGaugeId);
      const noGoGauge = await this.gaugeRepository.findById(noGoGaugeId);

      // 2. Validate both are spares
      if (goGauge.companion_gauge_id || noGoGauge.companion_gauge_id) {
        throw new Error('Both gauges must be spares (no existing companion)');
      }

      // 3. Validate not in pending_qc
      if (goGauge.status === 'pending_qc' || noGoGauge.status === 'pending_qc') {
        throw new Error('Cannot pair gauges in pending_qc status');
      }

      // 4. Create domain objects and validate as set
      const goEntity = new GaugeEntity(goGauge);
      const noGoEntity = new GaugeEntity(noGoGauge);
      const baseId = goGauge.system_gauge_id.replace(/[AB]$/, '');
      const gaugeSet = new GaugeSet({
        baseId,
        goGauge: goEntity,
        noGoGauge: noGoEntity,
        category: goGauge.category
      });

      // 5. Validate ownership match
      if (goGauge.ownership_type !== noGoGauge.ownership_type) {
        throw new Error('Cannot pair company-owned with customer-owned gauges');
      }

      if (goGauge.ownership_type === 'customer' &&
          goGauge.customer_id !== noGoGauge.customer_id) {
        throw new Error('Customer-owned gauges must belong to same customer');
      }

      // 6. Update both locations to setLocation
      await this.gaugeRepository.updateLocation(goGaugeId, setLocation, connection);
      await this.gaugeRepository.updateLocation(noGoGaugeId, setLocation, connection);

      // 7. Link companions
      await this.gaugeRepository.linkCompanionsWithinTransaction(
        goGaugeId, noGoGaugeId, connection
      );

      // 8. Record in history
      await this.gaugeRepository.recordCompanionHistory(
        goGaugeId, noGoGaugeId, 'paired_from_spares', userId, connection,
        { reason: 'Spare gauges paired into set', metadata: { baseId, location: setLocation } }
      );

      return {
        baseId,
        goGauge: await this.gaugeRepository.findById(goGaugeId),
        noGoGauge: await this.gaugeRepository.findById(noGoGaugeId)
      };
    });
  });
}
```

**API Endpoint Update**:
```javascript
// POST /api/gauges/v2/pair-spares
{
  "goGaugeId": 1005,
  "noGoGaugeId": 1006,
  "setLocation": "Shop A - Drawer 3"  // NEW: Required field
}
```

### 3. Unpair Set (NEW)

**Operation**: Break set relationship, both become orphans

**Business Rules**:
- Allowed regardless of individual gauge statuses
- Both `companion_gauge_id` set to NULL
- Both become spares
- Locations unchanged

**Service Method**:
```javascript
async unpairSet(gaugeId, userId, reason = null) {
  return this.executeWithRetry(async () => {
    return this.executeInTransaction(async (connection) => {
      // 1. Get gauge and companion
      const gauge = await this.gaugeRepository.findById(gaugeId);
      if (!gauge || !gauge.companion_gauge_id) {
        throw new Error('Gauge is not part of a set');
      }

      const companionId = gauge.companion_gauge_id;
      const companion = await this.gaugeRepository.findById(companionId);

      // 2. Determine which is GO and which is NO GO
      const isGaugeGo = gauge.gauge_suffix === 'A';
      const goGaugeId = isGaugeGo ? gauge.id : companion.id;
      const noGoGaugeId = isGaugeGo ? companion.id : gauge.id;

      // 3. Record in history BEFORE unpairing
      await this.gaugeRepository.recordCompanionHistory(
        goGaugeId, noGoGaugeId, 'unpaired', userId, connection,
        { reason: reason || 'Set unpaired', metadata: { initiatedBy: gaugeId } }
      );

      // 4. Unpair both gauges
      await this.gaugeRepository.unpairGauges(gauge.id, companionId, connection);

      return {
        gauge: await this.gaugeRepository.findById(gauge.id),
        formerCompanion: await this.gaugeRepository.findById(companionId)
      };
    });
  });
}
```

**API Endpoint**:
```javascript
// POST /api/gauges/:id/unpair
{
  "reason": "Gauge damaged, needs replacement"  // Optional
}
```

### 4. Replace Gauge in Set (NEW)

**Operation**: Replace one gauge in set with an orphaned spare

**Business Rules**:
- Block if either gauge in set is 'checked_out'
- Block if replacement gauge is 'pending_qc'
- Old gauge becomes orphan
- New gauge pairs with remaining gauge
- Validate specs match (domain validation)

**Service Method**:
```javascript
async replaceGaugeInSet(gaugeIdToReplace, newOrphanId, userId, reason = null) {
  return this.executeWithRetry(async () => {
    return this.executeInTransaction(async (connection) => {
      // 1. Get all gauges
      const oldGauge = await this.gaugeRepository.findById(gaugeIdToReplace);
      if (!oldGauge || !oldGauge.companion_gauge_id) {
        throw new Error('Gauge is not part of a set');
      }

      const remainingGauge = await this.gaugeRepository.findById(oldGauge.companion_gauge_id);
      const newGauge = await this.gaugeRepository.findById(newOrphanId);

      // 2. Validate replacement gauge is spare
      if (newGauge.companion_gauge_id) {
        throw new Error('Replacement gauge must be a spare (no existing companion)');
      }

      // 3. Validate neither gauge in set is checked out
      if (oldGauge.status === 'checked_out' || remainingGauge.status === 'checked_out') {
        throw new Error('Cannot replace gauge while either gauge in set is checked out');
      }

      // 4. Validate replacement not in pending_qc
      if (newGauge.status === 'pending_qc') {
        throw new Error('Cannot use gauge in pending_qc status for replacement');
      }

      // 5. Validate ownership match
      if (remainingGauge.ownership_type !== newGauge.ownership_type) {
        throw new Error('Cannot mix company-owned with customer-owned gauges');
      }

      if (remainingGauge.ownership_type === 'customer' &&
          remainingGauge.customer_id !== newGauge.customer_id) {
        throw new Error('Customer-owned gauges must belong to same customer');
      }

      // 6. Create domain objects to validate specs match
      const remainingEntity = new GaugeEntity(remainingGauge);
      const newEntity = new GaugeEntity(newGauge);
      const baseId = remainingGauge.system_gauge_id.replace(/[AB]$/, '');

      // Determine which is GO and which is NO GO
      const isRemainingGo = remainingGauge.gauge_suffix === 'A';
      const gaugeSet = new GaugeSet({
        baseId,
        goGauge: isRemainingGo ? remainingEntity : newEntity,
        noGoGauge: isRemainingGo ? newEntity : remainingEntity,
        category: remainingGauge.category
      });
      // Domain validation will throw if specs don't match

      // 7. Record replacement in history
      const goGaugeId = isRemainingGo ? remainingGauge.id : newGauge.id;
      const noGoGaugeId = isRemainingGo ? newGauge.id : remainingGauge.id;

      await this.gaugeRepository.recordCompanionHistory(
        goGaugeId, noGoGaugeId, 'replaced', userId, connection,
        {
          reason: reason || 'Gauge replaced in set',
          metadata: {
            replacedGaugeId: oldGauge.id,
            replacedGaugeSystemId: oldGauge.system_gauge_id
          }
        }
      );

      // 8. Unpair old gauge (becomes orphan)
      await this.gaugeRepository.unpairGauges(oldGauge.id, remainingGauge.id, connection);

      // 9. Update new gauge location to match set
      await this.gaugeRepository.updateLocation(
        newGauge.id,
        remainingGauge.storage_location,
        connection
      );

      // 10. Pair new gauge with remaining gauge
      await this.gaugeRepository.linkCompanionsWithinTransaction(
        remainingGauge.id, newGauge.id, connection
      );

      return {
        baseId,
        goGauge: await this.gaugeRepository.findById(goGaugeId),
        noGoGauge: await this.gaugeRepository.findById(noGoGaugeId),
        replacedGauge: await this.gaugeRepository.findById(oldGauge.id)
      };
    });
  });
}
```

**API Endpoint**:
```javascript
// POST /api/gauges/:id/replace
{
  "newGaugeId": 1050,
  "reason": "Original gauge damaged in use"  // Optional
}
```

---

## Cascade Operations

### Cascade vs. Computed Status

**TRUE CASCADE** (Updates both database records):
- Out of Service → Both status = 'out_of_service'
- Return to Service → Both status = 'available'
- Location Change → Both storage_location updated

**COMPUTED STATUS** (No database update):
- Calibration expiry → Individual status, set computed as "Unusable"
- Seal status → Individual is_sealed, set computed as "Sealed" if any sealed

### 1. Out of Service Cascade

**Operation**: Mark one gauge OOS → Both become OOS

**Enhancement to GaugeStatusService**:
```javascript
async updateStatus(gaugeId, status, userId, connection = null) {
  // Existing validation...

  // NEW: Check for companion if status is out_of_service
  if (status === 'out_of_service') {
    const gauge = await this.gaugeRepository.findById(gaugeId);

    if (gauge.companion_gauge_id) {
      // Has companion - must cascade
      const companion = await this.gaugeRepository.findById(gauge.companion_gauge_id);

      // Update both statuses
      await this.gaugeStatusRepository.updateGaugeStatus(gauge.id, status, connection);
      await this.gaugeStatusRepository.updateGaugeStatus(companion.id, status, connection);

      // Record cascade in companion_history
      const goGaugeId = gauge.gauge_suffix === 'A' ? gauge.id : companion.id;
      const noGoGaugeId = gauge.gauge_suffix === 'A' ? companion.id : gauge.id;

      await this.gaugeRepository.recordCompanionHistory(
        goGaugeId, noGoGaugeId, 'cascaded_oos', userId, connection,
        {
          reason: 'Cascade from companion out of service',
          metadata: { initiatedBy: gaugeId }
        }
      );

      logger.info(`Cascaded OOS: Gauge ${gaugeId} and companion ${companion.id} both marked out_of_service`);

      return {
        cascaded: true,
        affectedGauges: [gauge.id, companion.id]
      };
    }
  }

  // Existing single gauge update logic...
}
```

**Enhancement to GaugeOperationsService**:
```javascript
async updateGaugeStatus(gaugeId, newStatus, userId = null, reason = null) {
  // NEW: Use GaugeStatusService for cascade support
  const gaugeStatusService = serviceRegistry.get('GaugeStatusService');
  const result = await gaugeStatusService.updateStatus(gaugeId, newStatus, userId);

  // Audit logging
  await this.auditService.logAction({
    module: 'gauge',
    action: result.cascaded ? 'gauge_status_cascaded' : 'gauge_status_updated',
    entity_id: gaugeId,
    user_id: userId,
    details: {
      newStatus,
      reason,
      cascaded: result.cascaded || false,
      affectedGauges: result.affectedGauges
    }
  });

  return result;
}
```

**API Response**:
```json
{
  "success": true,
  "data": {
    "cascaded": true,
    "affectedGauges": [100, 101],
    "message": "Both gauges in set marked out of service"
  }
}
```

**UI Warning Modal**:
```
⚠️ Mark Gauge Out of Service

This gauge is part of a set. Marking it out of service will also
mark the companion gauge (TG0123B) out of service.

Both gauges will be unavailable until returned to service.

Reason: [___________________________]

[Confirm - Both Gauges OOS]  [Cancel]
```

### 2. Return to Service Cascade

**Operation**: Mark one gauge available → Both become available

**Same pattern as OOS cascade**:
- Check for companion
- Update both statuses to 'available'
- Record 'cascaded_return' in companion_history
- Return cascade notification

**UI Warning**:
```
✓ Return Gauge to Service

This gauge is part of a set. Returning it to service will also
return the companion gauge (TG0123B) to service.

Both gauges will be available for checkout.

[Confirm - Both Gauges Available]  [Cancel]
```

### 3. Location Change Cascade

**Operation**: Move one gauge → Both move together

**Enhancement to GaugeOperationsService**:
```javascript
async updateGaugeLocation(gaugeId, newLocation, userId, reason = null) {
  return this.executeInTransaction(async (connection) => {
    const gauge = await this.gaugeRepository.findById(gaugeId);

    if (!gauge) {
      throw new Error(`Gauge not found: ${gaugeId}`);
    }

    // Check for companion
    if (gauge.companion_gauge_id) {
      const companion = await this.gaugeRepository.findById(gauge.companion_gauge_id);

      // Update both locations
      await this.gaugeRepository.updateLocation(gauge.id, newLocation, connection);
      await this.gaugeRepository.updateLocation(companion.id, newLocation, connection);

      // Record cascade in companion_history
      const goGaugeId = gauge.gauge_suffix === 'A' ? gauge.id : companion.id;
      const noGoGaugeId = gauge.gauge_suffix === 'A' ? companion.id : gauge.id;

      await this.gaugeRepository.recordCompanionHistory(
        goGaugeId, noGoGaugeId, 'cascaded_location', userId, connection,
        {
          reason: reason || 'Cascade location update',
          metadata: {
            initiatedBy: gaugeId,
            newLocation
          }
        }
      );

      logger.info(`Cascaded location: Gauge ${gaugeId} and companion ${companion.id} moved to ${newLocation}`);

      return {
        cascaded: true,
        affectedGauges: [gauge.id, companion.id],
        newLocation
      };
    }

    // Single gauge update
    await this.gaugeRepository.updateLocation(gauge.id, newLocation, connection);

    return {
      cascaded: false,
      affectedGauges: [gauge.id],
      newLocation
    };
  });
}
```

**UI Warning**:
```
📍 Move Gauge Location

This gauge is part of a set. Moving it will also move the
companion gauge (TG0123B).

Both gauges will be moved to: Shop B - Drawer 5

[Confirm - Move Both]  [Cancel]
```

### 4. Checkout Enforcement (Both Together)

**Operation**: Checkout enforces both gauges together

**Enhancement to checkout workflow**:
```javascript
async checkoutGauge(gaugeId, userId, checkoutData) {
  return this.executeInTransaction(async (connection) => {
    const gauge = await this.getGaugeById(gaugeId);

    // Verify gauge is available
    const availability = await this.isGaugeAvailable(gaugeId);
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    // NEW: Check for companion
    if (gauge.companion_gauge_id) {
      const companion = await this.gaugeRepository.findById(gauge.companion_gauge_id);

      // Verify companion is also available
      const companionAvailability = await this.isGaugeAvailable(companion.system_gauge_id);
      if (!companionAvailability.available) {
        throw new Error(`Cannot checkout set - companion gauge ${companion.system_gauge_id} is ${companionAvailability.status}`);
      }

      // Checkout BOTH gauges
      await this.trackingRepository.createCheckout(gauge.id, {
        user_id: checkoutData.assigned_to_user,
        department: checkoutData.assigned_to_department,
        location: checkoutData.location
      }, connection);

      await this.trackingRepository.createCheckout(companion.id, {
        user_id: checkoutData.assigned_to_user,
        department: checkoutData.assigned_to_department,
        location: checkoutData.location
      }, connection);

      // Unseal both if sealed
      if (gauge.is_sealed) {
        await this.gaugeRepository.update(gauge.id, { is_sealed: 0 }, connection);
      }
      if (companion.is_sealed) {
        await this.gaugeRepository.update(companion.id, { is_sealed: 0 }, connection);
      }

      return {
        gaugeSet: true,
        gauges: [
          { gauge_id: gauge.system_gauge_id, status: 'checked_out', unsealed: gauge.is_sealed },
          { gauge_id: companion.system_gauge_id, status: 'checked_out', unsealed: companion.is_sealed }
        ]
      };
    }

    // Existing single gauge checkout logic...
  });
}
```

**UI Indication**:
```
Checkout Gauge Set

GO Gauge:     TG0123A  (.312-18 2A Ring)
NO GO Gauge:  TG0123B  (.312-18 2A Ring)

Both gauges will be checked out together.

Assigned to: [User Dropdown]
Location:    [Location Input]

[Checkout Set]  [Cancel]
```

### 5. Deletion/Retirement - Orphan Companion

**Operation**: Delete/retire one gauge → Companion orphaned

**Enhancement to delete/retire operations**:
```javascript
async deleteGauge(gaugeId, userId, reason) {
  return this.executeInTransaction(async (connection) => {
    const gauge = await this.gaugeRepository.findById(gaugeId);

    if (!gauge) {
      throw new Error(`Gauge not found: ${gaugeId}`);
    }

    // Block if companion is checked out
    if (gauge.companion_gauge_id) {
      const companion = await this.gaugeRepository.findById(gauge.companion_gauge_id);

      if (companion.status === 'checked_out') {
        throw new Error('Cannot delete gauge - companion is currently checked out');
      }

      // Record orphaning in history
      const goGaugeId = gauge.gauge_suffix === 'A' ? gauge.id : companion.id;
      const noGoGaugeId = gauge.gauge_suffix === 'A' ? companion.id : gauge.id;

      await this.gaugeRepository.recordCompanionHistory(
        goGaugeId, noGoGaugeId, 'orphaned', userId, connection,
        {
          reason: `Companion deleted: ${reason}`,
          metadata: {
            deletedGaugeId: gauge.id,
            deletedGaugeSystemId: gauge.system_gauge_id
          }
        }
      );

      // Orphan the companion (set companion_gauge_id to NULL)
      await this.gaugeRepository.unpairGauges(gauge.id, companion.id, connection);

      logger.info(`Orphaned gauge ${companion.id} - companion ${gauge.id} deleted`);
    }

    // Soft delete the gauge
    await this.gaugeRepository.update(gauge.id, { is_deleted: 1 }, connection);

    // Audit log
    await this.auditService.logAction({
      module: 'gauge',
      action: 'gauge_deleted',
      entity_id: gauge.id,
      user_id: userId,
      details: { reason, companionOrphaned: !!gauge.companion_gauge_id }
    });

    return {
      deleted: gauge.id,
      companionOrphaned: gauge.companion_gauge_id
    };
  });
}

async retireGauge(gaugeId, reason, userId) {
  // Same logic - retirement orphans companion
  // Uses status = 'retired' instead of is_deleted = 1
}
```

**UI Warning**:
```
⚠️ Delete Gauge

This gauge is part of a set. Deleting it will orphan the
companion gauge (TG0123B).

The companion will become a spare gauge and can be paired
with a different gauge later.

Reason: [___________________________]

[Confirm - Delete & Orphan Companion]  [Cancel]
```

---

## Computed Set Status

### Set Status is NOT a Database Field

**Important**: Set status is DERIVED/COMPUTED from individual gauge statuses.

**Computation Logic** (AND logic):
- Set is "Available" ONLY if BOTH gauges are 'available'
- Set is "Unusable" if ANY gauge has restrictive status

### Usability Matrix

| GO Status | NO GO Status | Set Computed Status | Can Checkout? |
|-----------|--------------|---------------------|---------------|
| available | available | Available | ✅ Yes |
| available | calibration_due | Calibration Due - Unusable | ❌ No |
| available | out_of_service | Out of Service - Unusable | ❌ No |
| available | pending_qc | Pending QC - Unusable | ❌ No |
| available | checked_out | Partially Checked Out | ❌ No (already out) |
| available | out_for_calibration | Out for Calibration - Unusable | ❌ No |
| available | pending_certificate | Pending Certificate - Unusable | ❌ No |
| available | pending_release | Pending Release - Unusable | ❌ No |
| out_of_service | out_of_service | Out of Service | ❌ No |
| calibration_due | calibration_due | Calibration Due | ❌ No |
| out_for_calibration | out_for_calibration | Out for Calibration | ❌ No |
| pending_certificate | pending_certificate | Pending Certificate | ❌ No |
| pending_release | pending_release | Pending Release | ❌ No |

### Calibration Expiry (NOT a Cascade)

**Business Practice**: Sets sent to calibration together (naturally stay in sync)

**Edge Case Allowed**: Individual calibration permitted
- GO gauge expires → GO status = 'calibration_due'
- NO GO valid → NO GO status = 'available'
- **Set computed**: "Calibration Due - Unusable"
- Individual gauge statuses unchanged

**Workflow**:
1. User sends GO to calibration (replace with spare temporarily)
2. GO returns, calibrated
3. Replace spare with original GO
4. Set becomes available again

### Seal Status (Computed)

**Rule**: If ANY gauge sealed → Set computed as "Sealed"

**Examples**:
- GO sealed, NO GO unsealed → Set: "Sealed"
- Both sealed → Set: "Sealed"
- Both unsealed → Set: "Unsealed"

**No cascade**: Sealing/unsealing does NOT automatically affect companion

---

## Calibration Workflow

### Overview

**Roles**: QC and Admin only
**Send**: Batch operation (multiple gauges/sets)
**Receive**: Individual or complete sets
**Certificate**: Required for each gauge before availability

### Workflow Steps

```
1. CREATE BATCH (QC/Admin)
   ↓
2. ADD GAUGES TO BATCH
   - Individual gauges (spares or from sets)
   - Complete sets (both GO and NO GO)
   ↓
3. SEND BATCH TO CALIBRATION
   - Select location: Internal lab OR External vendor
   - If external: vendor name, tracking number
   - All gauges status → 'out_for_calibration'
   ↓
4. RECEIVE INDIVIDUAL GAUGE(S)
   - Status → 'pending_certificate'
   - is_sealed → 1 (automatically sealed)
   ↓
5. UPLOAD CERTIFICATE(S)
   - Separate certificate for each gauge
   - Multiple formats allowed (PDF, images)
   - Linked to gauge in certificates table
   ↓
6. VERIFY CERTIFICATES
   - QC/Admin checks: "All certificates uploaded for this gauge"
   - When BOTH gauges in set verified → Status → 'pending_release'
   ↓
7. VERIFY LOCATION & RELEASE
   - QC/Admin confirms physical storage location
   - Updates location if needed
   - Status → 'available'
```

### Status Enum Additions

**New Statuses Needed**:
- `'out_for_calibration'` - Gauge sent to calibration
- `'pending_certificate'` - Returned from calibration, awaiting certificate upload
- `'pending_release'` - Certificates uploaded and verified, awaiting location verification
- `'returned'` - Customer-owned gauge returned to customer (Admin/QC visible only)

**Updated Status Enum**:
```sql
enum(
  'available',
  'checked_out',
  'calibration_due',
  'pending_qc',
  'out_of_service',
  'pending_unseal',
  'retired',
  'out_for_calibration',      -- NEW: Sent to calibration
  'pending_certificate',       -- NEW: Awaiting certificate upload
  'pending_release',           -- NEW: Certs verified, awaiting location
  'returned'                   -- NEW: Customer gauge returned (Admin/QC only)
)
```

### Calibration Batch Operations

**NEW: CalibrationService** (location: `backend/src/modules/gauge/services/CalibrationService.js`)

```javascript
class CalibrationService extends BaseService {
  /**
   * Create calibration batch
   */
  async createBatch(batchData, userId) {
    return this.executeInTransaction(async (connection) => {
      // Create batch record
      const batch = await this.calibrationRepository.createBatch({
        created_by: userId,
        calibration_type: batchData.calibrationType, // 'internal' or 'external'
        vendor_name: batchData.vendorName,
        tracking_number: batchData.trackingNumber,
        status: 'pending_send'
      }, connection);

      return batch;
    });
  }

  /**
   * Add gauges to batch
   */
  async addGaugeToBatch(batchId, gaugeId, userId) {
    return this.executeInTransaction(async (connection) => {
      // Validate gauge can be calibrated
      const gauge = await this.gaugeRepository.findById(gaugeId);

      if (gauge.status === 'checked_out') {
        throw new Error('Cannot calibrate gauge that is checked out');
      }

      // Add to batch
      await this.calibrationRepository.addGaugeToBatch(
        batchId,
        gaugeId,
        connection
      );

      return { batchId, gaugeId };
    });
  }

  /**
   * Send batch to calibration
   */
  async sendBatch(batchId, userId) {
    return this.executeInTransaction(async (connection) => {
      // Get all gauges in batch
      const gauges = await this.calibrationRepository.getBatchGauges(batchId, connection);

      // Update all gauge statuses to out_for_calibration
      for (const gauge of gauges) {
        await this.gaugeStatusRepository.updateGaugeStatus(
          gauge.id,
          'out_for_calibration',
          connection
        );
      }

      // Update batch status
      await this.calibrationRepository.updateBatch(
        batchId,
        { status: 'sent', sent_at: new Date() },
        connection
      );

      // Audit log
      await this.auditService.logAction({
        module: 'calibration',
        action: 'batch_sent',
        entity_id: batchId,
        user_id: userId,
        details: { gaugeCount: gauges.length }
      });

      return { batchId, gaugesSent: gauges.length };
    });
  }

  /**
   * Receive gauge from calibration
   */
  async receiveGauge(gaugeId, userId, calibrationPassed = true) {
    return this.executeInTransaction(async (connection) => {
      const gauge = await this.gaugeRepository.findById(gaugeId);

      if (gauge.status !== 'out_for_calibration') {
        throw new Error('Gauge is not currently out for calibration');
      }

      if (!calibrationPassed) {
        // Calibration failed - retire gauge
        await this.gaugeOperationsService.retireGauge(
          gauge.system_gauge_id,
          'calibration_failed',
          userId
        );

        return {
          gaugeId,
          status: 'retired',
          reason: 'calibration_failed'
        };
      }

      // Calibration passed - mark pending certificate and seal
      await this.gaugeRepository.update(gauge.id, {
        status: 'pending_certificate',
        is_sealed: 1
      }, connection);

      // Audit log
      await this.auditService.logAction({
        module: 'calibration',
        action: 'gauge_received',
        entity_id: gauge.id,
        user_id: userId,
        details: { calibrationPassed }
      });

      return {
        gaugeId,
        status: 'pending_certificate',
        isSealed: true
      };
    });
  }

  /**
   * Verify gauge and release to available
   */
  async verifyAndRelease(gaugeId, userId) {
    return this.executeInTransaction(async (connection) => {
      const gauge = await this.gaugeRepository.findById(gaugeId);

      if (gauge.status !== 'pending_certificate') {
        throw new Error('Gauge is not pending certificate');
      }

      // Verify certificate exists
      const certificates = await this.certificateRepository.findByGaugeId(gauge.id);
      if (certificates.length === 0) {
        throw new Error('Cannot release gauge - no calibration certificate uploaded');
      }

      // Update status to available
      await this.gaugeStatusRepository.updateGaugeStatus(
        gauge.id,
        'available',
        connection
      );

      // Audit log
      await this.auditService.logAction({
        module: 'calibration',
        action: 'gauge_released',
        entity_id: gauge.id,
        user_id: userId,
        details: { certificateCount: certificates.length }
      });

      return {
        gaugeId,
        status: 'available'
      };
    });
  }
}
```

### API Endpoints for Calibration

**Create Batch**:
```javascript
// POST /api/calibration/batches
{
  "calibrationType": "external",
  "vendorName": "Acme Calibration Labs",
  "trackingNumber": "ACL-2025-001"
}
```

**Add Gauge to Batch**:
```javascript
// POST /api/calibration/batches/:batchId/gauges
{
  "gaugeId": 100
}
```

**Send Batch**:
```javascript
// POST /api/calibration/batches/:batchId/send
// No body needed
```

**Receive Gauge**:
```javascript
// POST /api/calibration/gauges/:id/receive
{
  "calibrationPassed": true
}
```

**Verify & Release**:
```javascript
// POST /api/calibration/gauges/:id/verify-release
// No body needed - validates certificate exists
```

### Calibration Tables

**NEW: calibration_batches**:
```sql
CREATE TABLE calibration_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  created_by INT NOT NULL,
  calibration_type ENUM('internal', 'external') NOT NULL,
  vendor_name VARCHAR(255) NULL,
  tracking_number VARCHAR(100) NULL,
  status ENUM('pending_send', 'sent', 'completed', 'cancelled') DEFAULT 'pending_send',
  sent_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES core_users(id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;
```

**NEW: calibration_batch_gauges**:
```sql
CREATE TABLE calibration_batch_gauges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL,
  gauge_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (batch_id) REFERENCES calibration_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  UNIQUE KEY unique_batch_gauge (batch_id, gauge_id),
  INDEX idx_batch (batch_id),
  INDEX idx_gauge (gauge_id)
) ENGINE=InnoDB;
```

---

## Certificate Requirements

### Separate Certificates Per Gauge

**Rule**: Each gauge (GO and NO GO) requires its own certificate
- Cannot share one certificate for a set
- Each certificate uploaded separately

### Certificate Upload Flow

**Existing Infrastructure**:
- ✅ `certificates` table (migration 006)
- ✅ `CertificateService` - upload/download
- ✅ Dropbox integration
- ✅ Multiple formats supported (PDF, images, etc.)

**Enhanced for Calibration**:
```javascript
async uploadCalibrationCertificate(gaugeId, file, userId) {
  // Use existing CertificateService.uploadCertificate()
  const result = await certificateService.uploadCertificate(gaugeId, file, userId);

  // Check if gauge is pending_certificate
  const gauge = await gaugeRepository.findById(gaugeId);

  if (gauge.status === 'pending_certificate') {
    // Certificate uploaded, but don't auto-release
    // QC must manually verify and release
    logger.info(`Certificate uploaded for gauge ${gaugeId} in pending_certificate status`);
  }

  return result;
}
```

### Certificate History

**Rule**: Keep all certificates, mark old ones as "superseded"

**Enhancement to certificates table**:
```sql
ALTER TABLE certificates
ADD COLUMN is_current BOOLEAN DEFAULT TRUE COMMENT 'Whether this is the current/active certificate',
ADD COLUMN superseded_at TIMESTAMP NULL COMMENT 'When this certificate was superseded by a newer one',
ADD COLUMN superseded_by INT NULL COMMENT 'ID of certificate that superseded this one',
ADD FOREIGN KEY (superseded_by) REFERENCES certificates(id);

CREATE INDEX idx_current_certs ON certificates(gauge_id, is_current);
```

**Auto-supersede logic**:
```javascript
async uploadCertificate(gaugeId, file, userId) {
  return this.executeInTransaction(async (connection) => {
    // Get current certificates
    const currentCerts = await certificateRepository.findByGaugeId(gaugeId, { is_current: true });

    // Upload new certificate
    const newCert = await certificateService.uploadCertificate(gaugeId, file, userId);

    // Mark old certificates as superseded
    for (const oldCert of currentCerts) {
      await certificateRepository.update(oldCert.id, {
        is_current: false,
        superseded_at: new Date(),
        superseded_by: newCert.id
      }, connection);
    }

    return newCert;
  });
}
```

**Note**: Certificate superseding may be revisited in future (marked as "may change" in edge case analysis).

---

## Customer Ownership

### Ownership Rules

**Thread Gauges Can Be**:
- `ownership_type = 'company'` (default, most common)
- `ownership_type = 'customer'` (customer-supplied gauges)
- NOT `'employee'` (not allowed for thread gauges)

### Customer-Owned Gauge Requirements

**When ownership_type = 'customer'**:
- MUST have `customer_id` (FK to customers table)
- Selected from dropdown in UI

**Database Schema Addition**:
```sql
ALTER TABLE gauges
ADD COLUMN customer_id INT NULL COMMENT 'Customer ID if customer-owned',
ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

CREATE INDEX idx_customer_gauges ON gauges(customer_id, is_deleted);
```

### Pairing Validation for Ownership

**Rule**: Cannot mix company + customer owned gauges

**Validation Logic**:
```javascript
// In GaugeSet.validate()
if (this.goGauge.ownershipType !== this.noGoGauge.ownershipType) {
  throw new DomainValidationError(
    'Cannot pair company-owned with customer-owned gauges',
    'OWNERSHIP_MISMATCH',
    {
      goOwnership: this.goGauge.ownershipType,
      noGoOwnership: this.noGoGauge.ownershipType
    }
  );
}

// If both customer-owned, must be same customer
if (this.goGauge.ownershipType === 'customer' &&
    this.goGauge.customerId !== this.noGoGauge.customerId) {
  throw new DomainValidationError(
    'Customer-owned gauges must belong to the same customer',
    'CUSTOMER_MISMATCH',
    {
      goCustomerId: this.goGauge.customerId,
      noGoCustomerId: this.noGoGauge.customerId
    }
  );
}
```

### Return Customer Gauges

**New Status**: `'returned'`
- Customer gauge returned to customer
- Visible only to Admin and QC roles
- Hidden from regular users

**Return Operation**:
```javascript
async returnCustomerGauge(gaugeId, userId, returnBoth = false) {
  return this.executeInTransaction(async (connection) => {
    const gauge = await this.gaugeRepository.findById(gaugeId);

    if (gauge.ownership_type !== 'customer') {
      throw new Error('Only customer-owned gauges can be marked as returned');
    }

    // Update status to returned
    await this.gaugeStatusRepository.updateGaugeStatus(
      gauge.id,
      'returned',
      connection
    );

    // If part of set and returnBoth is true
    if (returnBoth && gauge.companion_gauge_id) {
      const companion = await this.gaugeRepository.findById(gauge.companion_gauge_id);

      await this.gaugeStatusRepository.updateGaugeStatus(
        companion.id,
        'returned',
        connection
      );

      // Record in history
      const goGaugeId = gauge.gauge_suffix === 'A' ? gauge.id : companion.id;
      const noGoGaugeId = gauge.gauge_suffix === 'A' ? companion.id : gauge.id;

      await this.gaugeRepository.recordCompanionHistory(
        goGaugeId, noGoGaugeId, 'set_returned', userId, connection,
        { reason: 'Customer gauge set returned', metadata: { customerId: gauge.customer_id } }
      );

      return {
        returned: [gauge.id, companion.id],
        setReturned: true
      };
    }

    // Single gauge return - orphan companion if exists
    if (gauge.companion_gauge_id) {
      await this.gaugeRepository.unpairGauges(gauge.id, gauge.companion_gauge_id, connection);
    }

    return {
      returned: [gauge.id],
      setReturned: false
    };
  });
}
```

**API Endpoint**:
```javascript
// POST /api/gauges/:id/return-customer
{
  "returnBoth": false  // Toggle: return just this gauge, or both in set
}
```

**UI for Customer Return**:
```
Return Customer Gauge

This gauge is customer-owned (Customer: Acme Corp)

□ Return companion gauge (TG0124B) as well

Both gauges will be marked as returned and removed from
active inventory (visible to Admin/QC only).

[Confirm Return]  [Cancel]
```

---

## Validation Rules Summary

### Pairing Validation

**Specs Must Match** (enforced by GaugeSet domain model):
- ✅ `thread_size` must match
- ✅ `thread_class` must match
- ✅ `thread_type` must match
- ✅ `category_id` must match
- ✅ GO must have suffix 'A'
- ✅ NO GO must have suffix 'B'
- ✅ NPT gauges cannot have companions

**Ownership Must Match**:
- ✅ Both must have same `ownership_type`
- ✅ If 'customer', both must have same `customer_id`

**Status Validation**:
- ❌ `pending_qc` blocks pairing
- ✅ Other statuses allowed (OOS + Available = valid but unusable set)

**Availability**:
- ✅ Both must be spares (companion_gauge_id = NULL)

### Replace Validation

**Checkout Status**:
- ❌ Block if either gauge in set is 'checked_out'

**Replacement Gauge**:
- ✅ Must be spare (companion_gauge_id = NULL)
- ❌ Cannot be 'pending_qc'
- ✅ Specs must match (GaugeSet domain validation)
- ✅ Ownership must match

### Delete Validation

**Companion Status**:
- ❌ Block if companion is 'checked_out'
- ✅ Otherwise allowed - companion orphaned

### Unpair Validation

**No Restrictions**:
- ✅ Allowed regardless of status
- ✅ Both become orphans

### Re-pairing

**Historical Pairs**:
- ✅ Can re-pair gauges that were previously paired
- ✅ History tracked in companion_history table

---

## Database Schema Changes

### Status Enum Update

```sql
-- Add new status values
ALTER TABLE gauges
MODIFY COLUMN status ENUM(
  'available',
  'checked_out',
  'calibration_due',
  'pending_qc',
  'out_of_service',
  'pending_unseal',
  'retired',
  'out_for_calibration',      -- NEW: Gauge sent to calibration
  'pending_certificate',       -- NEW: Gauge returned, awaiting certificate upload
  'pending_release',           -- NEW: Certs uploaded, awaiting location verification
  'returned'                   -- NEW: Customer gauge returned (Admin/QC only)
) DEFAULT 'available';
```

### Customer ID Field

```sql
-- Add customer_id if not exists
ALTER TABLE gauges
ADD COLUMN IF NOT EXISTS customer_id INT NULL COMMENT 'Customer ID if customer-owned',
ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

CREATE INDEX IF NOT EXISTS idx_customer_gauges ON gauges(customer_id, is_deleted);
```

### Certificate Enhancements

```sql
-- Add certificate history tracking
ALTER TABLE certificates
ADD COLUMN is_current BOOLEAN DEFAULT TRUE COMMENT 'Whether this is the current/active certificate',
ADD COLUMN superseded_at TIMESTAMP NULL COMMENT 'When this certificate was superseded',
ADD COLUMN superseded_by INT NULL COMMENT 'ID of certificate that superseded this one',
ADD FOREIGN KEY (superseded_by) REFERENCES certificates(id);

CREATE INDEX idx_current_certs ON certificates(gauge_id, is_current);
```

### Calibration Batch Tables

**Create calibration_batches**:
```sql
CREATE TABLE calibration_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  created_by INT NOT NULL,
  calibration_type ENUM('internal', 'external') NOT NULL,
  vendor_name VARCHAR(255) NULL,
  tracking_number VARCHAR(100) NULL,
  status ENUM('pending_send', 'sent', 'completed', 'cancelled') DEFAULT 'pending_send',
  sent_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES core_users(id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='Tracks calibration batches sent to internal/external labs';
```

**Create calibration_batch_gauges**:
```sql
CREATE TABLE calibration_batch_gauges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL,
  gauge_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (batch_id) REFERENCES calibration_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  UNIQUE KEY unique_batch_gauge (batch_id, gauge_id),
  INDEX idx_batch (batch_id),
  INDEX idx_gauge (gauge_id)
) ENGINE=InnoDB COMMENT='Links gauges to calibration batches';
```

### companion_history Action Types

**Expand action_type values** (VARCHAR(50) already supports):
- `'created_together'` - Set created with both gauges
- `'paired_from_spares'` - Orphans paired into set
- `'replaced'` - One gauge replaced with spare
- `'unpaired'` - Set dissolved, both become spares
- `'orphaned'` - Companion deleted/retired
- `'cascaded_oos'` - Out of service cascaded to both
- `'cascaded_return'` - Return to service cascaded to both
- `'cascaded_location'` - Location change cascaded to both
- `'set_returned'` - Customer set returned together

**No schema change needed** - VARCHAR(50) handles all values.

### Migration Script

**NEW: 003_cascade_operations_schema.sql**:
```sql
-- ============================================================================
-- Migration: 003_cascade_operations_schema.sql
-- Purpose: Schema changes for cascade operations and calibration workflow
-- Date: 2025-10-25
-- ============================================================================

-- Add new status values
ALTER TABLE gauges
MODIFY COLUMN status ENUM(
  'available',
  'checked_out',
  'calibration_due',
  'pending_qc',
  'out_of_service',
  'pending_unseal',
  'retired',
  'out_for_calibration',
  'pending_certificate',
  'returned'
) DEFAULT 'available';

-- Add customer_id for customer-owned gauges
ALTER TABLE gauges
ADD COLUMN IF NOT EXISTS customer_id INT NULL COMMENT 'Customer ID if customer-owned',
ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

CREATE INDEX IF NOT EXISTS idx_customer_gauges ON gauges(customer_id, is_deleted);

-- Certificate history tracking
ALTER TABLE certificates
ADD COLUMN is_current BOOLEAN DEFAULT TRUE COMMENT 'Whether this is the current/active certificate',
ADD COLUMN superseded_at TIMESTAMP NULL COMMENT 'When this certificate was superseded',
ADD COLUMN superseded_by INT NULL COMMENT 'ID of certificate that superseded this one',
ADD FOREIGN KEY (superseded_by) REFERENCES certificates(id);

CREATE INDEX idx_current_certs ON certificates(gauge_id, is_current);

-- Calibration batch tables
CREATE TABLE calibration_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  created_by INT NOT NULL,
  calibration_type ENUM('internal', 'external') NOT NULL,
  vendor_name VARCHAR(255) NULL,
  tracking_number VARCHAR(100) NULL,
  status ENUM('pending_send', 'sent', 'completed', 'cancelled') DEFAULT 'pending_send',
  sent_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES core_users(id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='Tracks calibration batches';

CREATE TABLE calibration_batch_gauges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL,
  gauge_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (batch_id) REFERENCES calibration_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  UNIQUE KEY unique_batch_gauge (batch_id, gauge_id),
  INDEX idx_batch (batch_id),
  INDEX idx_gauge (gauge_id)
) ENGINE=InnoDB COMMENT='Links gauges to calibration batches';

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
/*
-- Revert status enum
ALTER TABLE gauges
MODIFY COLUMN status ENUM(
  'available',
  'checked_out',
  'calibration_due',
  'pending_qc',
  'out_of_service',
  'pending_unseal',
  'retired'
) DEFAULT 'available';

-- Drop customer_id
ALTER TABLE gauges DROP FOREIGN KEY fk_customer;
ALTER TABLE gauges DROP COLUMN customer_id;
DROP INDEX idx_customer_gauges ON gauges;

-- Drop certificate enhancements
ALTER TABLE certificates DROP FOREIGN KEY certificates_ibfk_superseded_by;
ALTER TABLE certificates DROP COLUMN is_current;
ALTER TABLE certificates DROP COLUMN superseded_at;
ALTER TABLE certificates DROP COLUMN superseded_by;
DROP INDEX idx_current_certs ON certificates;

-- Drop calibration tables
DROP TABLE IF EXISTS calibration_batch_gauges;
DROP TABLE IF EXISTS calibration_batches;
*/
```

---

## Phase Integration

### Updates to Existing Phases

**Phase 0: Architecture Alignment**
- [ ] Add: Review cascade operations architecture
- [ ] Add: Review calibration workflow design
- [ ] Add: ADR for computed vs. stored set status

**Phase 1: Database Schema**
- [ ] Add: Apply `003_cascade_operations_schema.sql`
- [ ] Add: Test new status values
- [ ] Add: Verify customer_id foreign key
- [ ] Add: Test calibration batch tables

**Phase 2: Domain Model**
- [ ] Add: Ownership validation to GaugeSet
- [ ] Add: Customer ID validation
- [ ] Add: Test customer ownership scenarios

**Phase 3: Repository Refactor**
- [ ] Add: `unpairGauges(id1, id2, connection)` method
- [ ] Add: `updateLocation(gaugeId, location, connection)` method
- [ ] Add: `findByCustomerId(customerId)` method
- [ ] Expand: `recordCompanionHistory` with new action types

**Phase 4: Service Layer**
- [ ] Add: `unpairSet()` to GaugeSetService
- [ ] Add: `replaceGaugeInSet()` to GaugeSetService
- [ ] Add: Cascade logic to GaugeStatusService
- [ ] Add: Cascade logic to GaugeOperationsService
- [ ] Add: Checkout enforcement (both together)
- [ ] Add: Delete/retire orphaning logic

### NEW Phase 4.5: Calibration Workflow

**Tasks**:
- [ ] Create `CalibrationService.js`
- [ ] Create `CalibrationRepository.js`
- [ ] Implement batch creation
- [ ] Implement send to calibration (status updates)
- [ ] Implement receive from calibration
- [ ] Implement verify & release (with certificate check)
- [ ] Integrate with CertificateService
- [ ] Add calibration API routes

**Acceptance Criteria**:
- ✅ QC/Admin can create calibration batches
- ✅ Can add individual gauges or sets to batch
- ✅ Sending batch updates all gauge statuses to 'out_for_calibration'
- ✅ Receiving gauge sets status to 'pending_certificate' and is_sealed = 1
- ✅ Cannot release gauge without certificate
- ✅ Verify & release sets status to 'available'
- ✅ Calibration failure retires gauge

**Phase 5: Testing**
- [ ] Add: Cascade operation tests (OOS, location, checkout)
- [ ] Add: Unpair/replace operation tests
- [ ] Add: Customer ownership validation tests
- [ ] Add: Calibration workflow integration tests
- [ ] Add: Certificate requirement enforcement tests
- [ ] Add: Computed set status tests
- [ ] Add: Concurrency tests for pairing/replace

**Phase 6: Frontend Integration**
- [ ] Add: Cascade warning modals (OOS, location, checkout)
- [ ] Add: Location prompt for pairing
- [ ] Add: Unpair set UI
- [ ] Add: Replace gauge UI (show compatible spares)
- [ ] Add: Customer ownership dropdown
- [ ] Add: Return customer gauge UI (toggle both)
- [ ] Add: Calibration batch management UI
- [ ] Add: Certificate upload with status transition
- [ ] Add: Verify & release button
- [ ] Update: Set status display (computed from individual statuses)
- [ ] Update: Delete confirmation (orphan warning)

---

## Code Examples

### Repository Layer Additions

**NEW: GaugeRepository methods**:
```javascript
// Unpair gauges (set both companion_gauge_id to NULL)
async unpairGauges(gaugeId1, gaugeId2, connection) {
  if (!connection) {
    throw new Error('unpairGauges requires connection parameter');
  }

  await this.executeQuery(
    'UPDATE gauges SET companion_gauge_id = NULL WHERE id IN (?, ?)',
    [gaugeId1, gaugeId2],
    connection
  );
}

// Update location
async updateLocation(gaugeId, location, connection) {
  if (!connection) {
    throw new Error('updateLocation requires connection parameter');
  }

  await this.executeQuery(
    'UPDATE gauges SET storage_location = ? WHERE id = ?',
    [location, gaugeId],
    connection
  );
}

// Find by customer
async findByCustomerId(customerId) {
  return this.executeQuery(
    'SELECT * FROM gauges WHERE customer_id = ? AND is_deleted = 0',
    [customerId]
  );
}
```

### Domain Model Enhancement

**GaugeSet ownership validation**:
```javascript
// In GaugeSet.validate()

// Business Rule #8: Ownership types must match
if (this.goGauge.ownershipType !== this.noGoGauge.ownershipType) {
  throw new DomainValidationError(
    'Cannot pair company-owned with customer-owned gauges',
    'OWNERSHIP_MISMATCH',
    {
      goOwnership: this.goGauge.ownershipType,
      noGoOwnership: this.noGoGauge.ownershipType
    }
  );
}

// Business Rule #9: Customer-owned gauges must belong to same customer
if (this.goGauge.ownershipType === 'customer') {
  if (!this.goGauge.customerId || !this.noGoGauge.customerId) {
    throw new DomainValidationError(
      'Customer-owned gauges must have customer_id specified',
      'MISSING_CUSTOMER_ID'
    );
  }

  if (this.goGauge.customerId !== this.noGoGauge.customerId) {
    throw new DomainValidationError(
      'Customer-owned gauges must belong to the same customer',
      'CUSTOMER_MISMATCH',
      {
        goCustomerId: this.goGauge.customerId,
        noGoCustomerId: this.noGoGauge.customerId
      }
    );
  }
}
```

---

## Frontend UX Specifications

### Overview

This section defines complete frontend UX for gauge set management, including:
1. "Add Gauge" workflow (create single gauges and sets)
2. Gauge list display (sets vs. unpaired gauges)
3. Set and individual gauge detail pages
4. Navigation patterns and action menus
5. Calibration workflow UI
6. Admin/QC management interfaces

---

### 1. "Add Gauge" Workflow

**Button Label**: "Add Gauge" (renamed from "Add New Gauge")

**2-Step Modal Wizard**:

**Step 1: Select Equipment Type**
```
┌─────────────────────────────────────────────────────┐
│ Add Gauge                                     [×]   │
├─────────────────────────────────────────────────────┤
│ What type of equipment are you adding?              │
│                                                      │
│ ┌──────────────┐  ┌──────────────┐                 │
│ │ Thread Gauge │  │  Hand Tool   │                 │
│ │    🔩        │  │    🔧        │                 │
│ └──────────────┘  └──────────────┘                 │
│                                                      │
│ ┌──────────────┐  ┌──────────────┐                 │
│ │Large Equip.  │  │ Cal Standard │                 │
│ │    📦        │  │    📏        │                 │
│ └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

**Step 2a: Thread Gauge Options (3 choices)**
```
┌─────────────────────────────────────────────────────┐
│ Add Thread Gauge                   [← Back]   [×]   │
├─────────────────────────────────────────────────────┤
│ What do you want to create?                         │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ Single Gauge                                   │  │
│ │ Add one thread gauge (GO or NO GO)             │  │
│ │                                      [Select →]│  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ New Gauge Set                                  │  │
│ │ Create GO + NO GO pair with new specs          │  │
│ │                                      [Select →]│  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ Pair Existing Spares                           │  │
│ │ Combine spare GO + NO GO into set              │  │
│ │                                      [Select →]│  │
│ └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Step 2b: Other Equipment Types**
- Hand Tool, Large Equipment, Calibration Standard → Single gauge form only
- No set option (thread gauges only have GO/NO GO pairs)

**"Pair Existing Spares" Flow**:
- Selecting this option opens the Spare Inventory Pairing Interface (see section below)
- Two-column layout for selecting compatible gauges

---

### 2. Gauge List Display

**Visual Indicators**:
- **Set**: Shows base ID (TG0123) + 🔗 icon + "(Set)"
- **Unpaired GO**: Shows full ID with suffix (TG0456A) + "(GO - Unpaired)"
- **Unpaired NO GO**: Shows full ID with suffix (TG0789B) + "(NO GO - Unpaired)"

**Example List View**:
```
┌─────────────────────────────────────────────────────────────┐
│ Gauge Inventory                           [Add Gauge]       │
│ [Search...] [Filter ▼] [Status ▼]                          │
├─────────────────────────────────────────────────────────────┤
│ TG0123 (Set) 🔗                                             │
│ .312-18 2A Ring | Available | Shelf A2                     │
│ Last Cal: 2024-09-15 | Next: 2025-09-15                    │
│                                                [View →]     │
├─────────────────────────────────────────────────────────────┤
│ TG0456A (GO - Unpaired)                                     │
│ .500-13 3A Plug | Available | Shelf B1                     │
│ Last Cal: 2024-08-01 | Next: 2025-08-01                    │
│                                                [View →]     │
├─────────────────────────────────────────────────────────────┤
│ TG0789B (NO GO - Unpaired)                                  │
│ .625-11 2B Ring | Available | Shelf C3                     │
│ Last Cal: 2024-07-15 | Next: 2025-07-15                    │
│                                                [View →]     │
└─────────────────────────────────────────────────────────────┘
```

**Important Notes**:
- Single gauge = Spare gauge = Unpaired gauge (same thing)
- Only sets show checkout actions
- Unpaired gauges cannot be checked out (no checkout button)

---

### 3. Set Details Page

**Layout**: Shared information + minimal individual gauge info

**Standard View (Both Gauges Same Status)**:
```
┌─────────────────────────────────────────────────────────────┐
│ Set Details: TG0123                     [× Close to List]   │
│                                              [Actions ▼]     │
│                                                ├─ Unpair Set │
│                                                ├─ Replace GO │
│                                                ├─ Replace NO GO│
│                                                └─ Checkout Set│
├─────────────────────────────────────────────────────────────┤
│ Set Information (Shared)                                     │
│ ├─ Specifications: .312-18 2A Ring                          │
│ ├─ Status: Available                                        │
│ ├─ Location: Shelf A2                                       │
│ └─ Ownership: Company                                       │
├──────────────────────────┬──────────────────────────────────┤
│ GO Gauge (A)             │ NO GO Gauge (B)                  │
├──────────────────────────┼──────────────────────────────────┤
│ TG0123A                  │ TG0123B                          │
│                          │                                   │
│ [View Details →]         │ [View Details →]                 │
└──────────────────────────┴──────────────────────────────────┘
```

**Differential Status View (One Gauge Different)**:
```
├──────────────────────────┬──────────────────────────────────┤
│ GO Gauge (A)             │ NO GO Gauge (B)                  │
├──────────────────────────┼──────────────────────────────────┤
│ TG0123A                  │ TG0123B                          │
│ ⚠️ Out for Calibration   │                                   │
│ [View Details →]         │ [View Details →]                 │
└──────────────────────────┴──────────────────────────────────┘
```

**Design Principles**:
- Show shared info ONCE at top (specs, status, location, ownership)
- Show individual gauge info ONLY when different from set/companion
- Minimal clutter - drill down for full details

---

### 4. Individual Gauge Details Page

**Navigation Controls**:
- **[← Back to Set]**: Returns to Set Details page (only visible if gauge is paired)
- **[× Close to List]**: Returns to Gauge List/Inventory

**For Paired Gauge**:
```
┌─────────────────────────────────────────────────────────────┐
│ Gauge Details: TG0123A (GO)                                 │
│ [← Back to Set]  [× Close to List]         [Actions ▼]     │
│                                               ├─ Unpair from Set│
│                                               └─ Replace This Gauge│
├─────────────────────────────────────────────────────────────┤
│ Part of Set: [TG0123] ← clickable                          │
│ Companion Gauge: [TG0123B (NO GO)] ← clickable             │
│                                                              │
│ Specifications:                                              │
│ ├─ Thread Size: .312-18                                     │
│ ├─ Thread Class: 2A                                         │
│ ├─ Type: Ring                                               │
│ └─ Category: Thread Rings                                   │
│                                                              │
│ Status Information:                                          │
│ ├─ Status: Available                                        │
│ ├─ Location: Shelf A2                                       │
│ ├─ Serial Number: SN123456                                  │
│ └─ Ownership: Company                                       │
│                                                              │
│ Calibration History:                                         │
│ ├─ Last Calibration: 2024-09-15                            │
│ ├─ Next Due: 2025-09-15                                    │
│ └─ Certificate: [View PDF]                                  │
│                                                              │
│ Checkout History:                                            │
│ ├─ Last Checkout: John Smith (2024-10-10)                  │
│ └─ Returned: 2024-10-12                                     │
└─────────────────────────────────────────────────────────────┘
```

**For Unpaired Gauge**:
```
┌─────────────────────────────────────────────────────────────┐
│ Gauge Details: TG0456A (GO)                                 │
│ [× Close to List]                          [Actions ▼]      │
│                                               └─ Pair with NO GO│
├─────────────────────────────────────────────────────────────┤
│ Status: Unpaired (Single Gauge)                             │
│                                                              │
│ [Same detail sections as paired gauge...]                   │
└─────────────────────────────────────────────────────────────┘
```

**Clickable References**:
- Set reference ([TG0123]) → Navigate to Set Details
- Companion gauge reference ([TG0123B]) → Navigate to companion's Individual Gauge Details

---

### 5. Actions Menus

**Set Details Actions**:
```
[Actions ▼]
├─ Unpair Set
├─ Replace GO Gauge
├─ Replace NO GO Gauge
├─ Send to Calibration
└─ Checkout Set (only if status = Available)
```

**Individual Gauge Details Actions (Paired)**:
```
[Actions ▼]
├─ Unpair from Set
└─ Replace This Gauge
```

**Individual Gauge Details Actions (Unpaired)**:
```
[Actions ▼]
└─ Pair with NO GO (or "Pair with GO" if this is NO GO gauge)
```

**Action Notes**:
- Unpair and Replace available from both set level and individual gauge level
- Checkout ONLY available for sets, never for unpaired gauges
- Send to Calibration available at set level

---

### 6. Checkout Enforcement

**Business Rule**: Only complete sets can be checked out. Unpaired/single/spare gauges CANNOT be checked out.

**UI Implementation**:
- **Set Details page**: Shows "Checkout Set" button in Actions menu (if status = Available)
- **Individual Gauge Details (paired)**: No checkout button (user must go back to set)
- **Individual Gauge Details (unpaired)**: No checkout button at all
- **Gauge List**: Only sets show checkout action

**No blocking modals needed** - checkout simply not offered for unpaired gauges.

---

### 7. Calibration Workflow UI

#### 7.1 Sending Gauges to Calibration

**Primary Location: Calibration Management Page**
```
Admin Gauge Management
└── Calibration Management
    ├── Send to Calibration
    ├── Pending Certificate
    └── Pending Release
```

**Send to Calibration Interface**:
- Select multiple sets from list
- Batch operation: Mark all selected as "out_for_calibration"
- No batch tracking (purchasing module would handle that)

**Secondary Location: Set Details Quick Action**
```
Set Details: TG0123
[Actions ▼] → Send to Calibration
```
- Urgent single set calibration
- Immediately marks set as "out_for_calibration"

#### 7.2 Status Progression (Visible to All Users)

```
Available
↓ (Admin/QC sends to calibration)
Out for Calibration 🔧
↓ (Gauge returns, Admin/QC uploads certs)
Pending Certificate 📄
↓ (Both certs verified)
Pending Release ⏳ ⭐ NEW STATUS
↓ (Admin/QC verifies location)
Available ✓
```

**Visibility**:
- **All users**: See status changes throughout calibration process
- **Admin/QC only**: Can perform actions (upload certs, verify location, release)

#### 7.3 Certificate Upload Workflow

**Available in Two Locations**:

**Location A: Calibration Management Page**
```
Calibration Management
└── Pending Certificate
    - TG0123A (GO) [Upload Certificate]
    - TG0123B (NO GO) [Upload Certificate]
```

**Location B: Individual Gauge Details**
```
Gauge Details: TG0123A
Status: Pending Certificate ⚠️
[Upload Certificate]
```

**Upload Flow (Step-by-Step)**:

**Step 1: Upload certificate for first gauge (GO)**
```
┌─────────────────────────────────────────────────────┐
│ Upload Certificate - TG0123A (GO)                   │
├─────────────────────────────────────────────────────┤
│ [Choose File] → file.pdf selected                   │
│ [Upload]                                             │
│                                                      │
│ ✓ Certificate uploaded successfully                 │
│                                                      │
│ □ All certificates uploaded for this gauge          │
│                                                      │
│                           [Save]        [Cancel]    │
└─────────────────────────────────────────────────────┘
```

**Step 2: User checks verification box → Companion prompt**
```
┌─────────────────────────────────────────────────────┐
│ Companion Gauge Certificate                         │
├─────────────────────────────────────────────────────┤
│ ✓ TG0123A (GO) certificate verified                │
│                                                      │
│ Do you have the certificate for companion gauge?    │
│ TG0123B (NO GO)                                     │
│                                                      │
│             [Yes, Upload Now →]     [Not Yet]       │
└─────────────────────────────────────────────────────┘
```

**Step 3: Upload certificate for second gauge (NO GO)**
```
┌─────────────────────────────────────────────────────┐
│ Upload Certificate - TG0123B (NO GO)                │
├─────────────────────────────────────────────────────┤
│ [Choose File] → file.pdf selected                   │
│ [Upload]                                             │
│                                                      │
│ ✓ Certificate uploaded successfully                 │
│                                                      │
│ □ All certificates uploaded for this gauge          │
│                                                      │
│                           [Save]        [Cancel]    │
└─────────────────────────────────────────────────────┘
```

**Step 4: User checks second box → IMMEDIATE location verification modal**
```
┌─────────────────────────────────────────────────────┐
│ Release Set to Available                            │
├─────────────────────────────────────────────────────┤
│ Set TG0123 - Both certificates verified ✓           │
│                                                      │
│ Verify Storage Location:                            │
│ Current: Shelf A2                                   │
│ New Location: [Shelf A2 ▼]                         │
│                                                      │
│ ⚠️ Confirm physical location before releasing       │
│                                                      │
│                           [Release Set]   [Cancel]  │
└─────────────────────────────────────────────────────┘
```

**Step 5: If user clicks "Release Set"**
- Set status → Available
- Both gauges location updated
- Success notification

**Step 6: If user clicks "Cancel"**
- Set status → **pending_release** ⭐ NEW STATUS
- Certificate verifications preserved (checkboxes stay checked)
- User can complete release later

#### 7.4 Completing Pending Release

**Pending Release Status Visibility**:
- **All users** can see status "Pending Release ⏳"
- **Admin/QC only** can complete release

**Shown in Two Places**:

**A) Pending QC Dashboard**
```
Pending QC (Admin/QC Only)
├── Pending QC Review (5)
├── Pending Certificate (3)
└── Pending Release (2) ← Shows sets needing location verification
```

**B) Calibration Management Page**
```
Calibration Management (Admin/QC Only)
├── Send to Calibration
├── Pending Certificate (3)
└── Pending Release (2) ← Shows sets needing location verification
```

**Clicking Set in "Pending Release" → Location verification modal appears**
```
┌─────────────────────────────────────────────────────┐
│ Complete Release - Set TG0123                       │
├─────────────────────────────────────────────────────┤
│ Certificates verified ✓                             │
│                                                      │
│ Verify Storage Location:                            │
│ Current: Shelf A2                                   │
│ New Location: [Shelf A2 ▼]                         │
│                                                      │
│ ⚠️ Confirm physical location before releasing       │
│                                                      │
│                           [Release Set]   [Cancel]  │
└─────────────────────────────────────────────────────┘
```

---

### 8. Customer Gauge Return Workflow

#### 8.1 Access Control & Visibility

**Permission**: Admin/QC only
**Applies to**: Gauges with `ownership_type = 'customer'`
**Status**: `'returned'` gauges visible ONLY to Admin/QC roles

#### 8.2 Return Action Location

**Available in TWO places:**

**A) Set Details Page (Customer-Owned Set)**
```
┌─────────────────────────────────────────────────────────────┐
│ Set Details: TG0123                     [× Close to List]   │
│ Customer: Acme Corp                      [Actions ▼]        │
│                                                ├─ Return to Customer ⭐│
│                                                ├─ Unpair Set │
│                                                └─ Checkout Set│
├─────────────────────────────────────────────────────────────┤
│ Set Information (Shared)                                     │
│ ├─ Specifications: .312-18 2A Ring                          │
│ ├─ Status: Available                                        │
│ ├─ Location: Shelf A2                                       │
│ └─ Ownership: Customer (Acme Corp)                          │
├──────────────────────────┬──────────────────────────────────┤
│ GO Gauge (A)             │ NO GO Gauge (B)                  │
│ TG0123A                  │ TG0123B                          │
│ [View Details →]         │ [View Details →]                 │
└──────────────────────────┴──────────────────────────────────┘
```

**B) Individual Gauge Details (Customer-Owned)**
```
┌─────────────────────────────────────────────────────────────┐
│ Gauge Details: TG0123A (GO)                                 │
│ [← Back to Set]  [× Close to List]         [Actions ▼]     │
│                                               ├─ Return to Customer ⭐│
│                                               ├─ Unpair from Set│
│                                               └─ Replace This Gauge│
├─────────────────────────────────────────────────────────────┤
│ Part of Set: [TG0123]                                       │
│ Companion Gauge: [TG0123B (NO GO)]                          │
│                                                              │
│ Status Information:                                          │
│ ├─ Ownership: Customer (Acme Corp)                          │
│ └─ ...                                                      │
└─────────────────────────────────────────────────────────────┘
```

#### 8.3 Return Modal - From Set Details

**Triggered by**: User clicks "Return to Customer" from Set Details

```
┌─────────────────────────────────────────────────────┐
│ Return Customer Gauge Set                           │
├─────────────────────────────────────────────────────┤
│ Customer: Acme Corp                                 │
│ Set: TG0123 (.312-18 2A Ring)                      │
│                                                      │
│ Which gauges are being returned?                    │
│                                                      │
│ ☑ GO Gauge (TG0123A)                               │
│ ☑ NO GO Gauge (TG0123B)                            │
│                                                      │
│ ℹ️ Returned gauges will be removed from active      │
│    inventory and visible only to Admin/QC           │
│                                                      │
│ Notes (optional):                                    │
│ [____________________________________________]       │
│                                                      │
│                           [Confirm Return]  [Cancel]│
└─────────────────────────────────────────────────────┘
```

**Options**:
- Both checkboxes checked (default) → Returns entire set
- Uncheck one → Returns only selected gauge, orphans the other
- Must check at least one

#### 8.4 Return Modal - From Individual Gauge Details

**Triggered by**: User clicks "Return to Customer" from Individual Gauge Details

**If gauge is part of set:**
```
┌─────────────────────────────────────────────────────┐
│ Return Customer Gauge                               │
├─────────────────────────────────────────────────────┤
│ Customer: Acme Corp                                 │
│ Gauge: TG0123A (GO)                                │
│ Part of Set: TG0123                                │
│                                                      │
│ This gauge is part of a set.                        │
│                                                      │
│ □ Also return companion gauge (TG0123B - NO GO)     │
│                                                      │
│ ⚠️ If unchecked, companion will become a spare gauge│
│                                                      │
│ Notes (optional):                                    │
│ [____________________________________________]       │
│                                                      │
│                           [Confirm Return]  [Cancel]│
└─────────────────────────────────────────────────────┘
```

**If gauge is unpaired:**
```
┌─────────────────────────────────────────────────────┐
│ Return Customer Gauge                               │
├─────────────────────────────────────────────────────┤
│ Customer: Acme Corp                                 │
│ Gauge: TG0456A (GO - Unpaired)                     │
│                                                      │
│ This gauge will be marked as returned.              │
│                                                      │
│ ℹ️ Gauge will be removed from active inventory      │
│    and visible only to Admin/QC                     │
│                                                      │
│ Notes (optional):                                    │
│ [____________________________________________]       │
│                                                      │
│                           [Confirm Return]  [Cancel]│
└─────────────────────────────────────────────────────┘
```

#### 8.5 Post-Return Behavior

**After Confirm Return clicked:**

1. **Status Update**: Gauge(s) status → `'returned'`
2. **Unpair if needed**: If only one gauge returned from set → Orphan companion
3. **Visibility Change**: Gauge(s) disappear from regular user views
4. **Redirect**: User returned to Gauge List (gauge no longer visible)
5. **Toast Notification**: "Customer gauge(s) returned successfully"

**Audit Log**:
```javascript
{
  action: 'customer_gauge_returned',
  entity_id: gaugeId,
  details: {
    customerId: gauge.customer_id,
    customerName: 'Acme Corp',
    returnedGauges: [gaugeId1, gaugeId2],  // Both if set, single if alone
    companionOrphaned: false,  // true if one returned, one kept
    notes: 'Customer project completed'
  }
}
```

#### 8.6 Viewing Returned Customer Gauges

**Admin/QC Dashboard Section**:
```
Admin Gauge Management
├── Active Gauges
├── Spare Inventory
├── Returned Customer Gauges ⭐ NEW
└── Calibration Management
```

**Returned Customer Gauges Page**:
```
┌─────────────────────────────────────────────────────────────┐
│ Returned Customer Gauges                 [Filter Customer ▼]│
│ [Search...]                                                  │
├─────────────────────────────────────────────────────────────┤
│ TG0123 (Set) 🔗                                             │
│ .312-18 2A Ring | Returned | Customer: Acme Corp           │
│ Returned: 2024-10-20 by John Smith (QC)                    │
│ Notes: Project completed                                    │
│                                                [View →]     │
├─────────────────────────────────────────────────────────────┤
│ TG0456A (GO - Unpaired)                                     │
│ .500-13 3A Plug | Returned | Customer: Beta Industries     │
│ Returned: 2024-10-18 by Sarah Lee (Admin)                  │
│                                                [View →]     │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Filter by customer
- Search by gauge ID
- Shows returned date and who processed return
- Click to view full details (read-only)
- No actions available (returned gauges are archived)

#### 8.7 Business Rules

**Validation**:
- ❌ Cannot return if gauge status = `'checked_out'`
- ❌ Cannot return if gauge status = `'out_for_calibration'`
- ✅ Can return from any other status (available, calibration_due, etc.)

**Pairing Rules**:
- ✅ Can return one gauge from set → Orphans companion
- ✅ Can return both gauges from set → Set dissolved
- ❌ Cannot re-activate returned gauge (permanent state)

**Visibility Rules**:
- Regular users: Cannot see returned gauges at all
- Admin/QC: See in dedicated "Returned Customer Gauges" section only

#### 8.8 API Endpoints

**Return Customer Gauge(s)**:
```typescript
// POST /api/gauges/:id/return-customer
Request: {
  returnCompanion: boolean,  // If part of set, return companion too?
  notes?: string            // Optional return notes
}

Response: {
  success: true,
  data: {
    returnedGauges: [gaugeId1, gaugeId2?],
    companionOrphaned: boolean,
    customer: {
      id: number,
      name: string
    }
  }
}
```

**Get Returned Customer Gauges**:
```typescript
// GET /api/gauges/returned-customer
// Admin/QC only
Query params:
  - customerId?: number  // Filter by customer
  - search?: string     // Search gauge ID

Response: {
  gauges: Array<{
    id: number,
    gaugeId: string,
    customer: { id, name },
    returnedAt: timestamp,
    returnedBy: { id, username },
    notes?: string,
    isSet: boolean
  }>
}
```

---

### 9. Spare Inventory Pairing Interface

#### Initial View - All Spares

```
┌─────────────────────────────────────────────────────────────────────┐
│ Spare Gauge Inventory - Pair into Sets                             │
│                                                                      │
│ [Search: _________]  [Type: All ▼]  [Category: All ▼]              │
│                                        5 GO | 3 NO GO available     │
├────────────────────────────┬────────────────────────────────────────┤
│ GO Gauges (A)              │ NO GO Gauges (B)                       │
├────────────────────────────┼────────────────────────────────────────┤
│ TG0123A                    │ TG0124B                                │
│ .312-18 2A Ring            │ .312-18 2A Ring                        │
│ Location: Shelf A2         │ Location: Shelf A2                     │
│                            │                                         │
│ TG0456A                    │ TG0789B                                │
│ .500-13 3A Plug            │ .625-11 2B Ring                        │
│ Location: Shelf B1         │ Location: Shelf C3                     │
│                            │                                         │
│ TG0999A                    │ TG0888B                                │
│ .312-18 2A Ring            │ .312-18 2A Ring                        │
│ Location: Shelf A2         │ Location: Shelf B1                     │
└────────────────────────────┴────────────────────────────────────────┘
```

**Filter Controls**:
- **Search**: Text search (gauge ID, thread size)
  - Real-time filtering as user types
  - Searches both columns simultaneously

- **Type Dropdown**: All | Ring | Plug | Other
  - Filters by gauge type before selection
  - Resets when gauge selected

- **Category Dropdown**: All | Thread Plugs | Thread Rings | etc.
  - Filters by category before selection
  - Resets when gauge selected

**Count Indicator**:
- Format: `{go_count} GO | {nogo_count} NO GO available`
- Updates dynamically with active filters

---

#### Selection & Compatibility Filtering

**User Flow**:
1. User clicks any gauge (GO or NO GO)
2. **Selected column**: Shows ONLY clicked gauge
3. **Opposite column**: Shows ONLY compatible gauges
4. Clear selection button appears
5. User selects compatible gauge
6. "Create Set" button appears

**Example - GO Gauge Selected**:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Spare Gauge Inventory - Pair into Sets                             │
│                                                                      │
│ ● TG0123A Selected       [Clear Selection]      [← Back to All]    │
│   .312-18 2A Ring                                                   │
│   Location: Shelf A2                                                │
├────────────────────────────┬────────────────────────────────────────┤
│ GO Gauges (A)              │ Compatible NO GO Gauges (B)            │
├────────────────────────────┼────────────────────────────────────────┤
│ ● TG0123A (selected)       │ TG0124B                                │
│   .312-18 2A Ring          │   .312-18 2A Ring ✓ Specs Match       │
│   Location: Shelf A2       │   Location: Shelf A2                   │
│                            │                                         │
│                            │ TG0888B                                │
│                            │   .312-18 2A Ring ✓ Specs Match       │
│                            │   Location: Shelf B1                   │
│                            │                                         │
│                            │                       [Create Set →]   │
└────────────────────────────┴────────────────────────────────────────┘
```

**Example - NO GO Gauge Selected Then Matched**:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Spare Gauge Inventory - Pair into Sets                             │
│                                                                      │
│ Creating Set: TG0123A + TG0124B                                     │
│                                                                      │
│ Storage Location for Set: [Shelf A2 ▼]      [Confirm]  [Cancel]   │
├────────────────────────────┬────────────────────────────────────────┤
│ GO Gauge (A)               │ NO GO Gauge (B)                        │
├────────────────────────────┼────────────────────────────────────────┤
│ ✓ TG0123A                  │ ✓ TG0124B                              │
│   .312-18 2A Ring          │   .312-18 2A Ring                      │
│   Current: Shelf A2        │   Current: Shelf A2                    │
│                            │                                         │
│ Set ID: TG0123 (auto)      │                                        │
│ Status: Available          │                                        │
└────────────────────────────┴────────────────────────────────────────┘
```

---

#### Compatibility Logic

**Matching Rules** (from domain model):
```javascript
// Gauges are compatible if ALL match:
✓ thread_size (e.g., ".312-18")
✓ thread_class (e.g., "2A")
✓ equipment_type ("thread_gauge")
✓ category_id (must be same)
✓ ownership_type (company-company or customer-customer)
✓ customer_id (if customer-owned, must match)
```

**Visual Indicators**:
- ✓ Specs Match - Shows WHY gauges are compatible
- Location shown for awareness (user can override)
- Status shown (must be available or orphaned)

**Incompatible Gauges**:
- Completely hidden from view (not dimmed)
- No interaction possible with incompatible gauges

---

#### Location Selection Modal

**Triggers After**: User selects compatible pair, clicks "Create Set"

**Modal Content**:
```
┌─────────────────────────────────────────────────────────────┐
│ Set Storage Location                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Where should this set be stored?                            │
│                                                              │
│ GO Gauge Location:  Shelf A2                                │
│ NO GO Gauge Location: Shelf A2                              │
│                                                              │
│ Set Location: [Shelf A2          ▼]                        │
│                                                              │
│ ⚠️ Both gauges will move to this location                   │
│                                                              │
│                              [Confirm Pairing]  [Cancel]    │
└─────────────────────────────────────────────────────────────┘
```

**Location Dropdown Options**:
- All existing storage locations
- Pre-populated with GO gauge current location
- User can select different location

**Cascade Behavior**:
- Both gauges storage_location updated to selected value
- Recorded in audit log
- Companion history records action_type: 'paired_from_spares'

---

### Component Hierarchy

#### Page Component
```typescript
// SpareInventoryPage.tsx
- Main container for spare inventory management
- Permission check (admin/qc only)
- State management for selected gauges
- API calls for gauge fetching and pairing

Props: None (route-based)
State:
  - spareGauges: { go: Gauge[], nogo: Gauge[] }
  - selectedGauge: Gauge | null
  - compatibleGauges: Gauge[]
  - filters: { search: string, type: string, category: string }
  - showLocationModal: boolean
```

#### Filter Controls Component
```typescript
// SpareInventoryFilters.tsx
- Search input with debounce
- Type dropdown (Ring/Plug/Other)
- Category dropdown (from categories table)
- Count display

Props:
  - filters: FilterState
  - onFilterChange: (filters: FilterState) => void
  - counts: { go: number, nogo: number }
```

#### Two-Column Layout Component
```typescript
// SpareInventoryColumns.tsx
- Side-by-side GO and NO GO columns
- Responsive grid layout
- Handles selection state
- Manages visibility based on selection

Props:
  - goGauges: Gauge[]
  - nogoGauges: Gauge[]
  - selectedGauge: Gauge | null
  - compatibleGauges: Gauge[]
  - onSelectGauge: (gauge: Gauge) => void
  - onClearSelection: () => void
  - onCreateSet: () => void
```

#### Gauge Card Component
```typescript
// SpareGaugeCard.tsx
- Individual gauge display card
- Shows gauge ID, specs, location
- Click to select/match
- Visual states: default, selected, compatible

Props:
  - gauge: Gauge
  - isSelected: boolean
  - isCompatible: boolean
  - onClick: () => void
```

#### Location Selection Modal
```typescript
// SetLocationModal.tsx
- Modal for location selection
- Shows current locations of both gauges
- Dropdown for new location
- Confirms pairing action

Props:
  - isOpen: boolean
  - goGauge: Gauge
  - nogoGauge: Gauge
  - locations: string[]
  - onConfirm: (location: string) => void
  - onCancel: () => void
```

---

### API Integration

**Endpoint Requirements**:

```typescript
// GET /api/gauges/v2/spares
// Returns all spare/orphaned gauges
Response: {
  go: Gauge[],      // All GO gauges (suffix A) with no companion
  nogo: Gauge[]     // All NO GO gauges (suffix B) with no companion
}

// POST /api/gauges/v2/pair-spares
// Pairs two spare gauges into a set
Request: {
  goGaugeId: number,
  nogoGaugeId: number,
  storageLocation: string
}
Response: {
  set: {
    id: number,
    gaugeId: string,
    goGauge: Gauge,
    nogoGauge: Gauge
  }
}

// GET /api/gauges/v2/spares/compatible/:gaugeId
// Returns compatible gauges for a selected gauge
Response: {
  compatible: Gauge[]
}
```

---

### User Interaction Flow

**Complete Flow**:

1. **Access**: Admin/QC navigates to "Spare Inventory"
2. **View**: See all spare GO and NO GO gauges in two columns
3. **Filter** (optional): Use search/type/category to narrow list
4. **Select**: Click any gauge (GO or NO GO)
   - Selected column shows only clicked gauge
   - Opposite column filters to compatible matches only
5. **Match**: Click compatible gauge from opposite column
6. **Location**: Modal appears for storage location selection
   - Pre-filled with GO gauge location
   - User can override
7. **Confirm**: Create set with selected location
8. **Result**:
   - Set created with new gauge_id (e.g., TG0123)
   - Both gauges updated:
     - companion_gauge_id linked
     - gauge_suffix assigned (A/B)
     - storage_location updated
   - Companion history recorded
   - Both gauges removed from spare inventory view
9. **Success**: Toast notification, return to full inventory view

**Cancel/Reset Flow**:
- Clear Selection button → Returns to full two-column view
- Back to All button → Same as clear selection
- Modal cancel → Returns to selected state (doesn't clear selection)

---

### Visual Design Notes

**Color Coding**:
- GO gauges (A): Blue accent
- NO GO gauges (B): Orange accent
- Selected gauge: Darker background, border highlight
- Compatible gauge: Green checkmark, lighter green background
- Incompatible: Hidden (not visible at all)

**Responsive Behavior**:
- Desktop: Side-by-side columns (50/50 split)
- Tablet: Side-by-side columns (maintain layout)
- Mobile: Single column, tabs for GO/NO GO
  - Tab 1: GO Gauges
  - Tab 2: NO GO Gauges
  - Selection state maintained across tabs

**Loading States**:
- Skeleton cards while fetching gauges
- Spinner on Create Set button during pairing
- Disabled state for buttons during operations

**Empty States**:
- No spares: "No spare gauges available"
- No compatible: "No compatible gauges found for this selection"
- Filtered to zero: "No gauges match your filters"

---

### Accessibility Requirements

**Keyboard Navigation**:
- Tab through gauge cards
- Enter to select gauge
- Escape to clear selection
- Arrow keys for dropdown navigation

**Screen Reader Support**:
- Announce column headers
- Announce selection state changes
- Announce compatibility status
- Announce filter changes and result counts

**Focus Management**:
- Clear focus indicators
- Focus trap in modal
- Return focus to trigger element on modal close

---

### Performance Considerations

**Optimization Strategies**:
- Virtual scrolling for large spare inventories (>50 gauges)
- Debounced search (300ms delay)
- Memoized compatibility calculations
- Lazy load location dropdown options
- Optimistic UI updates on pairing action

**Caching**:
- Cache spare inventory for 5 minutes
- Invalidate cache on successful pairing
- Cache location list indefinitely (rarely changes)

---

## Edge Cases Addressed

### 1. Calibration Failures
**Resolution**: Single action - retire gauge with reason "calibration_failed"
- Companion orphaned (per retirement rule)
- Audit trail records failure

### 2. Certificate Management
**Resolution**:
- Delete allowed (existing functionality)
- Keep all certificates, mark old as "superseded" (may be revisited)

### 3. Soft Delete Restoration
**Resolution**: Restore as orphan (prevents conflicts)
- If companion was re-paired during deletion, no corruption
- User can manually re-pair if companion still available

### 4. Concurrent Pairing
**Resolution**: Database locks sufficient (FOR UPDATE from unified plan)
- Transaction isolation handles race conditions
- No additional UI locking needed

### 5. Lost in Calibration
**Resolution**: Too rare, not addressing
- Manual intervention if occurs

### 6. Customer Ownership Transfer
**Resolution**: Not needed, won't implement
- Customer gauges returned when project ends

---

## Summary of Additions to Unified Plan

### Relationship Operations (4 total)
1. ✅ Create set (already in plan)
2. ✅ Pair orphans (enhanced with location prompt)
3. ✅ Unpair set (NEW)
4. ✅ Replace gauge in set (NEW)

### Cascade Operations (5 total)
1. ✅ Out of service → both OOS
2. ✅ Return to service → both available
3. ✅ Location change → both move
4. ✅ Checkout → enforce both together
5. ✅ Delete/retire → orphan companion

### Computed Status (2 types)
1. ✅ Set usability (AND logic)
2. ✅ Seal status (ANY sealed)

### Calibration Workflow (Complete)
1. ✅ Batch creation (QC/Admin)
2. ✅ Send to calibration (status update)
3. ✅ Receive from calibration (pending_certificate + seal)
4. ✅ Certificate upload (separate per gauge)
5. ✅ Verify & release (manual approval)
6. ✅ Both internal and external support

### Customer Ownership (Complete)
1. ✅ company or customer only
2. ✅ customer_id required if customer-owned
3. ✅ Cannot mix in sets
4. ✅ Return workflow (individual toggle)
5. ✅ 'returned' status (Admin/QC visible)

### Immutability Rules (Comprehensive)
1. ✅ All classification fields locked
2. ✅ All thread specs locked
3. ✅ Descriptive fields locked
4. ✅ Only operational state changeable

### Database Schema (4 new statuses, 3 new tables)
1. ✅ Status enum additions: out_for_calibration, pending_certificate, pending_release, returned
2. ✅ customer_id field
3. ✅ Certificate enhancements
4. ✅ Calibration batch tables

### Frontend UX Specifications (Complete)
1. ✅ "Add Gauge" workflow (2-step wizard with thread gauge options)
2. ✅ Gauge list display (sets vs. unpaired, visual indicators)
3. ✅ Set Details page (shared info, minimal redundancy)
4. ✅ Individual Gauge Details (clickable references, navigation)
5. ✅ Actions menus (set and individual gauge levels)
6. ✅ Checkout enforcement (sets only, no unpaired gauges)
7. ✅ Calibration workflow UI (send, upload certs, location verification)
8. ✅ Pending QC and Calibration Management dashboards
9. ✅ Spare inventory pairing interface (two-column with filtering)

---

## Implementation Priority

**High Priority** (Core functionality):
1. Cascade operations (OOS, location, checkout)
2. Unpair/replace operations
3. Immutability enforcement
4. Pairing location prompt

**Medium Priority** (Important for completeness):
1. Calibration workflow
2. Customer ownership
3. Certificate requirements

**Lower Priority** (Can be phased):
1. Certificate superseding
2. Advanced calibration batch features

---

## Next Steps

1. **Review & Approve Addendum**: All architects + user sign-off
2. **Update Unified Plan**: Integrate phase additions
3. **Begin Implementation**: Start with Phase 0 (architecture alignment)

---

**Status**: ✅ READY FOR REVIEW AND APPROVAL

**Date**: 2025-10-25
**Reviewed By**: Architect 2 with user validation
**Approved By**: Pending team sign-off
