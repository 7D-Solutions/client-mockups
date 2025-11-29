# Location Hierarchy System - Implementation Plan

**Date**: 2025-11-05
**Status**: In Progress (Phase 1: Database & Backend Services Complete)
**Branch**: `development-core`

## Overview

Replace the unused `storage_locations.description` field with a complete 4-level warehouse location hierarchy following industry standards (SAP/Dynamics pattern).

### Hierarchy Structure

```
Facility (Company/Organization)
  └── Building (Physical structure)
      └── Zone (Functional area: QC, Shipping, Shop Floor, etc.)
          └── Storage Location (Specific bin/shelf: A1, B5, etc.)
```

### Default Seed Data

**Facility**: Main Facility
**Buildings**: Building 1, Building 2
**Zones per Building**:
- Building 1: Receiving, QC, Shop Floor, Tool Crib, Shipping, Bulk Storage
- Building 2: Bulk Storage, Shop Floor

**Storage Locations**: All 62 existing locations assigned to Building 1 by default

---

## ✅ Phase 1: Database & Backend Services (COMPLETED)

### Database Migration (023-remove-storage-location-description.sql)

**File**: `backend/src/infrastructure/database/migrations/023-remove-storage-location-description.sql`

**Tables Created**:
1. `facilities` - Top-level organization
2. `buildings` - Physical structures within facilities
3. `zones` - Functional areas within buildings
4. `storage_locations` - Updated with `building_id` and `zone_id` FKs

**Changes to storage_locations**:
- ❌ **REMOVED**: `description` column
- ✅ **ADDED**: `building_id INT NULL` (FK to buildings)
- ✅ **ADDED**: `zone_id INT NULL` (FK to zones)
- ✅ **ASSIGNED**: All existing locations to Building 1

### Backend Services Created

**1. FacilityService.js** ✅
- Location: `backend/src/infrastructure/services/FacilityService.js`
- Methods: CRUD operations, reordering, soft/hard delete with protection

**2. BuildingService.js** ✅
- Location: `backend/src/infrastructure/services/BuildingService.js`
- Methods: CRUD operations, reordering, facility filtering, soft/hard delete with protection

**3. ZoneService.js** ✅
- Location: `backend/src/infrastructure/services/ZoneService.js`
- Methods: CRUD operations, reordering, building filtering, soft/hard delete with protection

**4. StorageLocationService.js** ✅ (Updated)
- Location: `backend/src/infrastructure/services/StorageLocationService.js`
- Changes:
  - Updated `getStorageLocations()` - includes building/zone info, filters by building_id/zone_id
  - Updated `getStorageLocationById()` - JOINs to buildings, facilities, zones
  - Updated `createStorageLocation()` - accepts building_id, zone_id (removed description)
  - Updated `updateStorageLocation()` - allows building_id, zone_id updates
  - Updated `getLocationsByItemType()` - includes hierarchy info

---

## ⏸️ Phase 2: Backend Routes & APIs (PENDING)

### Routes to Create

**1. facilities.routes.js** ⏸️
```
GET    /api/facilities              - List all facilities
GET    /api/facilities/:id          - Get facility by ID
POST   /api/facilities              - Create facility (admin only)
PUT    /api/facilities/:id          - Update facility (admin only)
DELETE /api/facilities/:id          - Soft delete (admin only)
PUT    /api/facilities/reorder      - Reorder facilities (admin only)
```

**2. buildings.routes.js** ⏸️
```
GET    /api/buildings               - List buildings (filter by facility_id)
GET    /api/buildings/:id           - Get building by ID
POST   /api/buildings               - Create building (admin only)
PUT    /api/buildings/:id           - Update building (admin only)
DELETE /api/buildings/:id           - Soft delete (admin only)
PUT    /api/buildings/reorder       - Reorder buildings (admin only)
```

**3. zones.routes.js** ⏸️
```
GET    /api/zones                   - List zones (filter by building_id)
GET    /api/zones/:id               - Get zone by ID
POST   /api/zones                   - Create zone (admin only)
PUT    /api/zones/:id               - Update zone (admin only)
DELETE /api/zones/:id               - Soft delete (admin only)
PUT    /api/zones/reorder           - Reorder zones (admin only)
```

**4. storageLocations.routes.js** ⏸️ (Update existing)
- Accept `building_id` and `zone_id` in POST/PUT
- Return hierarchy info in responses
- Support filtering by building/zone

### Service Updates Needed

**1. InventoryReportingService.js** ⏸️
- Update `getInventoryOverview()` query
  - Remove `sl.description as location_description`
  - Add LEFT JOINs to buildings, facilities, zones
  - Include hierarchy fields in SELECT
  - Update result mapping

**2. server.js** ⏸️
- Register new routes:
  ```javascript
  app.use('/api/facilities', require('./infrastructure/routes/facilities.routes'));
  app.use('/api/buildings', require('./infrastructure/routes/buildings.routes'));
  app.use('/api/zones', require('./infrastructure/routes/zones.routes'));
  ```

---

## ⏸️ Phase 3: Frontend Types & Components (PENDING)

### Type Definitions

**New Interfaces** (`frontend/src/modules/inventory/types/`):

```typescript
interface Facility {
  id: number;
  facility_code: string;
  facility_name: string;
  is_active: boolean;
  display_order: number;
  building_count?: number;
  created_at: string;
  updated_at: string;
}

interface Building {
  id: number;
  building_code: string;
  building_name: string;
  facility_id: number;
  facility_code: string;
  facility_name: string;
  is_active: boolean;
  display_order: number;
  zone_count?: number;
  created_at: string;
  updated_at: string;
}

interface Zone {
  id: number;
  zone_code: string;
  zone_name: string;
  building_id: number;
  building_code: string;
  building_name: string;
  facility_id: number;
  facility_code: string;
  facility_name: string;
  is_active: boolean;
  display_order: number;
  location_count?: number;
  created_at: string;
  updated_at: string;
}
```

**Updated Interface**:
```typescript
interface StorageLocation {
  id: number;
  location_code: string;
  // description: string | null;  ❌ REMOVE
  building_id: number | null;     // ✅ ADD
  building_code?: string;         // ✅ ADD (from JOIN)
  building_name?: string;         // ✅ ADD
  facility_id?: number;           // ✅ ADD
  facility_code?: string;         // ✅ ADD
  facility_name?: string;         // ✅ ADD
  zone_id: number | null;         // ✅ ADD
  zone_code?: string;             // ✅ ADD (from JOIN)
  zone_name?: string;             // ✅ ADD
  location_type: string;
  is_active: boolean;
  allowed_item_types: string[];
  item_count?: number;
  created_at: string;
  updated_at: string;
}
```

### Component Updates

**1. StorageLocationsPage.tsx** ⏸️
**Changes**:
- Remove "DESCRIPTION" column
- Add "BUILDING" column (shows building_name or '-')
- Add "ZONE" column (shows zone_name or '-')
- Update sorting/filtering for new columns
- Add building/zone filter dropdowns

**2. LocationDetailModal.tsx** ⏸️
**Changes**:
- Remove description textarea field
- Add cascading dropdowns:
  - Building dropdown (fetches from /api/buildings)
  - Zone dropdown (fetches from /api/zones?building_id={selected})
- Both optional (can be blank)
- Show current hierarchy if editing existing location

**3. InventoryDashboard.tsx** ⏸️
**Changes**:
- Remove `location_description` references
- Add zone/building display in location cards
- Add filter by building/zone
- Update location display format based on user preferences

### New Admin Pages

**1. FacilityManagementPage.tsx** ⏸️
**Location**: `frontend/src/modules/admin/pages/FacilityManagementPage.tsx`
**Features**:
- Table of all facilities
- Add/Edit/Delete facility
- Drag-and-drop reordering
- Shows building count per facility
- Admin-only access

**2. BuildingManagementPage.tsx** ⏸️
**Location**: `frontend/src/modules/admin/pages/BuildingManagementPage.tsx`
**Features**:
- Table of all buildings
- Filter by facility
- Add/Edit/Delete building
- Drag-and-drop reordering
- Shows zone count per building
- Admin-only access

**3. ZoneManagementPage.tsx** ⏸️
**Location**: `frontend/src/modules/admin/pages/ZoneManagementPage.tsx`
**Features**:
- Table of all zones
- Filter by building
- Add/Edit/Delete zone
- Drag-and-drop reordering
- Shows location count per zone
- Admin-only access

### Display Configuration (Future Enhancement)

**User Preference Setting**:
```typescript
enum LocationDisplayFormat {
  LOCATION_ONLY = 'location_only',           // A1
  ZONE_LOCATION = 'zone_location',           // QC → A1
  BUILDING_ZONE_LOCATION = 'building_zone',  // Building 1 → QC → A1
  FULL = 'full'                              // Main Facility → Building 1 → QC → A1
}
```

Store in user preferences or company settings table.

---

## 🧪 Phase 4: Testing & Validation (PENDING)

### Migration Testing

**Test Steps**:
1. Backup database
2. Run migration `023-remove-storage-location-description.sql`
3. Verify tables created:
   - `facilities` (1 row: Main Facility)
   - `buildings` (2 rows: Building 1, Building 2)
   - `zones` (8 rows: 6 for Building 1, 2 for Building 2)
4. Verify storage_locations updated:
   - `description` column removed
   - `building_id` and `zone_id` columns added
   - All 62 locations assigned to Building 1
5. Verify foreign keys created and ON DELETE SET NULL works

### Backend Testing

**Service Tests**:
- FacilityService CRUD operations
- BuildingService CRUD operations with facility relationship
- ZoneService CRUD operations with building relationship
- StorageLocationService with building/zone filtering
- Delete protection (can't delete if children exist)

**API Tests**:
- GET endpoints return hierarchy data
- POST endpoints validate required fields
- PUT endpoints update correctly
- DELETE endpoints soft-delete only
- Reorder endpoints update display_order

### Frontend Testing

**Component Tests**:
- Storage locations page displays hierarchy correctly
- Location modal cascading dropdowns work
- Admin pages CRUD operations functional
- Filtering by building/zone works
- Display format preferences apply

### Integration Testing

**End-to-End Scenarios**:
1. Create new facility → Create building → Create zone → Create location
2. Assign zone to location → View in inventory dashboard
3. Filter inventory by building → by zone
4. Try to delete building with zones (should fail)
5. Reassign locations to different building/zone

---

## 🔄 Rollback Plan

If issues arise, rollback using SQL:

```sql
-- Restore description column
ALTER TABLE storage_locations ADD COLUMN description VARCHAR(255) NULL AFTER location_code;

-- Remove foreign keys
ALTER TABLE storage_locations DROP FOREIGN KEY fk_storage_location_building;
ALTER TABLE storage_locations DROP FOREIGN KEY fk_storage_location_zone;

-- Remove new columns
ALTER TABLE storage_locations DROP COLUMN building_id;
ALTER TABLE storage_locations DROP COLUMN zone_id;

-- Drop new tables (CASCADE will handle foreign keys)
DROP TABLE IF EXISTS zones;
DROP TABLE IF EXISTS buildings;
DROP TABLE IF EXISTS facilities;
```

---

## 📋 Implementation Checklist

### Phase 1: Database & Backend Services ✅
- [x] Create migration file with 4 tables
- [x] Create FacilityService
- [x] Create BuildingService
- [x] Create ZoneService
- [x] Update StorageLocationService

### Phase 2: Backend Routes & APIs ⏸️
- [ ] Create facilities.routes.js
- [ ] Create buildings.routes.js
- [ ] Create zones.routes.js
- [ ] Update storageLocations.routes.js
- [ ] Update InventoryReportingService queries
- [ ] Register routes in server.js

### Phase 3: Frontend ⏸️
- [ ] Define TypeScript interfaces
- [ ] Update StorageLocationsPage
- [ ] Update LocationDetailModal
- [ ] Update InventoryDashboard
- [ ] Create FacilityManagementPage
- [ ] Create BuildingManagementPage
- [ ] Create ZoneManagementPage

### Phase 4: Testing & Validation ⏸️
- [ ] Run migration on dev database
- [ ] Test all backend services
- [ ] Test all API endpoints
- [ ] Test frontend components
- [ ] End-to-end integration tests
- [ ] Performance testing (JOIN queries)

### Phase 5: Deployment
- [ ] Code review
- [ ] Backup production database
- [ ] Run migration on production
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Monitor for errors

---

## 📝 Notes

### Design Decisions

1. **Foreign Keys with SET NULL**: Prevents cascading deletes, safer for production
2. **Soft Delete by Default**: All services use `is_active` flag
3. **Optional Hierarchy**: building_id and zone_id are nullable for gradual adoption
4. **Display Order**: Allows custom sorting independent of alphabetical order
5. **Unique Constraints**: zone_code unique per building, building_code unique per facility

### Future Enhancements

1. **Location Display Preferences**: User/company-level settings for hierarchy display
2. **Zone-Based Permissions**: Restrict access by zone (QC only, etc.)
3. **Zone Capacity Limits**: Track capacity and warn when approaching limit
4. **Location QR Codes**: Generate codes with full hierarchy path
5. **Multi-Facility Support**: Expand to support multiple companies/organizations

### Performance Considerations

- Added indexes on all foreign keys
- LEFT JOINs used to avoid filtering out locations without zones
- Group by needed in count queries due to JOINs
- Consider materialized views for frequent hierarchy queries

---

## 🚀 Next Steps

**Immediate Action**: Run migration to validate database schema

**Command**:
```bash
docker exec -it fireproof-erp-modular-backend-dev mysql -u root -pfireproof_root_sandbox fai_db_sandbox < /app/src/infrastructure/database/migrations/023-remove-storage-location-description.sql
```

**After Migration Success**: Complete Phase 2 (Backend Routes) in new session to conserve tokens.
