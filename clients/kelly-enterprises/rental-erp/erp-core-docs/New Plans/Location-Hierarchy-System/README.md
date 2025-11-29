# Location Hierarchy System

**Quick Reference & Overview**

---

## What Is This?

Replacement of unused `storage_locations.description` field with a complete 4-level warehouse location hierarchy following industry standards (SAP/Dynamics).

```
Facility → Building → Zone → Storage Location
```

**Example**:
- Main Facility → Building 1 → QC → A1
- Main Facility → Building 2 → Shop Floor → C5

---

## Current Status

### ✅ Complete (Phase 1)
- Database migration script ready
- All backend services created/updated
- Documentation complete

### ⏸️ Not Started
- Backend routes (API endpoints)
- Frontend components
- Testing

---

## Quick Start (Next Session)

### Step 1: Run Migration

```bash
# Backup first
docker exec fireproof-erp-modular-backend-dev mysqldump -u root -pfireproof_root_sandbox fai_db_sandbox > backup.sql

# Run migration
docker exec -i fireproof-erp-modular-backend-dev mysql -u root -pfireproof_root_sandbox fai_db_sandbox < backend/src/infrastructure/database/migrations/023-remove-storage-location-description.sql

# Verify
docker exec fireproof-erp-modular-backend-dev mysql -u root -pfireproof_root_sandbox fai_db_sandbox -e "
SHOW TABLES LIKE '%facilities%';
SHOW TABLES LIKE '%buildings%';
SHOW TABLES LIKE '%zones%';
SELECT COUNT(*) FROM facilities;
SELECT COUNT(*) FROM buildings;
SELECT COUNT(*) FROM zones;
"
```

**Expected Results**:
- 1 facility (Main Facility)
- 2 buildings (Building 1, Building 2)
- 8 zones (6 in Building 1, 2 in Building 2)
- All 62 locations assigned to Building 1

---

### Step 2: Create Backend Routes

**Files to create** (copy pattern from existing services):

1. `backend/src/infrastructure/routes/facilities.routes.js`
2. `backend/src/infrastructure/routes/buildings.routes.js`
3. `backend/src/infrastructure/routes/zones.routes.js`

**Pattern to follow**:
```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, checkPermission } = require('../../middleware/auth');
const facilityService = require('../services/FacilityService');

// Public endpoints
router.get('/', authenticateToken, async (req, res) => { /* ... */ });
router.get('/:id', authenticateToken, async (req, res) => { /* ... */ });

// Admin endpoints
router.post('/', authenticateToken, checkPermission('admin'), async (req, res) => { /* ... */ });
router.put('/:id', authenticateToken, checkPermission('admin'), async (req, res) => { /* ... */ });
router.delete('/:id', authenticateToken, checkPermission('admin'), async (req, res) => { /* ... */ });
router.put('/reorder', authenticateToken, checkPermission('admin'), async (req, res) => { /* ... */ });

module.exports = router;
```

**Register in server.js**:
```javascript
app.use('/api/facilities', require('./infrastructure/routes/facilities.routes'));
app.use('/api/buildings', require('./infrastructure/routes/buildings.routes'));
app.use('/api/zones', require('./infrastructure/routes/zones.routes'));
```

---

### Step 3: Test Backend

```bash
# Test facilities endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/facilities

# Test buildings endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/buildings

# Test zones endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/zones
```

---

## File Locations

### Documentation
- `erp-core-docs/New Plans/Location-Hierarchy-System/IMPLEMENTATION-PLAN.md` - Full implementation details
- `erp-core-docs/New Plans/Location-Hierarchy-System/PROGRESS.md` - Progress tracking
- `erp-core-docs/New Plans/Location-Hierarchy-System/README.md` - This file

### Migration
- `backend/src/infrastructure/database/migrations/023-remove-storage-location-description.sql`

### Backend Services (✅ Complete)
- `backend/src/infrastructure/services/FacilityService.js`
- `backend/src/infrastructure/services/BuildingService.js`
- `backend/src/infrastructure/services/ZoneService.js`
- `backend/src/infrastructure/services/StorageLocationService.js` (updated)

### Backend Routes (⏸️ To Create)
- `backend/src/infrastructure/routes/facilities.routes.js`
- `backend/src/infrastructure/routes/buildings.routes.js`
- `backend/src/infrastructure/routes/zones.routes.js`
- `backend/src/infrastructure/routes/storageLocations.routes.js` (update)

### Frontend (⏸️ To Update)
- Types: `frontend/src/modules/inventory/types/index.ts`
- Pages:
  - `frontend/src/modules/inventory/pages/StorageLocationsPage.tsx`
  - `frontend/src/modules/inventory/pages/InventoryDashboard.tsx`
  - `frontend/src/modules/admin/pages/FacilityManagementPage.tsx` (new)
  - `frontend/src/modules/admin/pages/BuildingManagementPage.tsx` (new)
  - `frontend/src/modules/admin/pages/ZoneManagementPage.tsx` (new)
- Components:
  - `frontend/src/modules/inventory/components/LocationDetailModal.tsx`

---

## Database Schema

### New Tables

**facilities**
- id, facility_code, facility_name
- is_active, display_order
- created_at, updated_at

**buildings**
- id, building_code, building_name
- facility_id (FK → facilities)
- is_active, display_order
- created_at, updated_at

**zones**
- id, zone_code, zone_name
- building_id (FK → buildings)
- is_active, display_order
- created_at, updated_at

**storage_locations** (updated)
- ❌ REMOVED: description
- ✅ ADDED: building_id (FK → buildings, NULL allowed)
- ✅ ADDED: zone_id (FK → zones, NULL allowed)

---

## API Endpoints (To Implement)

### Facilities
- `GET /api/facilities` - List all
- `GET /api/facilities/:id` - Get one
- `POST /api/facilities` - Create (admin)
- `PUT /api/facilities/:id` - Update (admin)
- `DELETE /api/facilities/:id` - Delete (admin)
- `PUT /api/facilities/reorder` - Reorder (admin)

### Buildings
- `GET /api/buildings?facility_id={id}` - List all (filter by facility)
- `GET /api/buildings/:id` - Get one
- `POST /api/buildings` - Create (admin)
- `PUT /api/buildings/:id` - Update (admin)
- `DELETE /api/buildings/:id` - Delete (admin)
- `PUT /api/buildings/reorder` - Reorder (admin)

### Zones
- `GET /api/zones?building_id={id}` - List all (filter by building)
- `GET /api/zones/:id` - Get one
- `POST /api/zones` - Create (admin)
- `PUT /api/zones/:id` - Update (admin)
- `DELETE /api/zones/:id` - Delete (admin)
- `PUT /api/zones/reorder` - Reorder (admin)

---

## Rollback (If Needed)

```sql
-- Restore description column
ALTER TABLE storage_locations ADD COLUMN description VARCHAR(255) NULL AFTER location_code;

-- Remove foreign keys
ALTER TABLE storage_locations DROP FOREIGN KEY fk_storage_location_building;
ALTER TABLE storage_locations DROP FOREIGN KEY fk_storage_location_zone;

-- Remove new columns
ALTER TABLE storage_locations DROP COLUMN building_id;
ALTER TABLE storage_locations DROP COLUMN zone_id;

-- Drop new tables
DROP TABLE IF EXISTS zones;
DROP TABLE IF EXISTS buildings;
DROP TABLE IF EXISTS facilities;
```

---

## Questions?

See:
- **IMPLEMENTATION-PLAN.md** for detailed technical specs
- **PROGRESS.md** for current status and next steps
- **Migration file** for exact SQL being executed
- **Service files** for implementation patterns to copy
