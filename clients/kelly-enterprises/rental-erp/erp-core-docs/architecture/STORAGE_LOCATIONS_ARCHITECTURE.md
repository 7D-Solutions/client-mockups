# Storage Locations System Architecture

**Date**: 2025-10-29
**Status**: Approved - Company-Wide Infrastructure
**Decision**: Centralized storage location system shared across all inventory modules

## Executive Summary

Storage locations are implemented as **centralized infrastructure** rather than module-specific features, following industry best practices from NetSuite, SAP, and Odoo ERP systems.

## Architecture Decision

### ✅ APPROVED: Company-Wide (Centralized)

**Single storage location master table shared across:**
- Gauges (current)
- Tooling (future)
- Parts inventory (future)
- Equipment tracking (future)
- Raw materials (future)
- Any physical asset management (future)

### ❌ REJECTED: Module-Specific

Separate location systems per module would violate DRY principles and create data silos.

## Industry Research

### Best Practices Found

1. **Centralization** - Single source of truth for all physical locations
2. **Standardization** - Consistent location naming and management
3. **Real-Time Visibility** - Unified view across all inventory types
4. **Flexible Configuration** - Can enable/disable per location/module

### Major ERP Systems

**NetSuite**: Single bin/location master, used by all inventory items
**SAP**: Central "Storage Location" master data, referenced by all materials
**Odoo**: Warehouse locations tree structure, shared by all inventory types

## Current Implementation Status

### ✅ Already Infrastructure-Level

**Backend:**
- `backend/src/infrastructure/services/StorageLocationService.js`
- `backend/src/infrastructure/routes/storageLocations.routes.js`
- `backend/src/infrastructure/database/migrations/019-create-storage-locations.sql`

**Database:**
```sql
CREATE TABLE storage_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  location_type ENUM('bin', 'shelf', 'rack', 'cabinet', 'drawer', 'room', 'other'),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**API:**
- `GET /api/storage-locations` - Public (authenticated users)
- `POST /api/storage-locations` - Admin only
- `PUT /api/storage-locations/:id` - Admin only
- `DELETE /api/storage-locations/:id` - Admin only
- `POST /api/storage-locations/bulk` - Admin only
- `PUT /api/storage-locations/reorder` - Admin only

### 🔄 Needs Frontend Updates

**Current State:**
- `frontend/src/modules/gauge/components/SparePairingInterface.tsx` - Fetches locations (module-specific)

**Target State:**
- `frontend/src/infrastructure/components/StorageLocationSelect.tsx` - Shared component
- All modules import from infrastructure layer

## Implementation Plan

### Phase 1: Infrastructure Component (Current Sprint)

1. **Create Shared Frontend Component**
   ```typescript
   // frontend/src/infrastructure/components/StorageLocationSelect.tsx
   export const StorageLocationSelect = ({
     value,
     onChange,
     label = "Storage Location",
     required = false,
     disabled = false
   }) => {
     // Fetches from /api/storage-locations
     // Used by gauge, tooling, parts modules
   };
   ```

2. **Create Admin UI Page**
   - Location: `/admin/settings/storage-locations`
   - Features: CRUD operations, range generator, bulk import
   - Access: System admins only

3. **Update Documentation**
   - Mark as infrastructure-level feature
   - Document cross-module usage

### Phase 2: Module Integration (Next Sprint)

1. **Update Gauge Module**
   - Replace module-specific location fetching with shared component
   - Test backward compatibility with existing data

2. **Prepare for Future Modules**
   - Document integration pattern
   - Create example usage in docs

### Phase 3: Future Enhancements (Backlog)

1. **Hierarchical Locations** (Optional)
   - Building → Floor → Room → Rack → Shelf → Bin
   - Parent-child relationships

2. **Location Attributes** (Optional)
   - Temperature controlled
   - Secure access
   - Hazmat approved
   - Max capacity

3. **Barcode/QR Integration** (Optional)
   - Generate codes for physical locations
   - Scan-to-locate functionality

## Data Model

### Current Schema

```sql
storage_locations
├── id (PK)
├── location_code (UNIQUE)
├── description
├── location_type (ENUM)
├── is_active
├── display_order
├── created_at
└── updated_at
```

### Module References

**Gauges:**
```sql
gauges.storage_location → storage_locations.location_code
```

**Future Modules:**
```sql
tools.storage_location → storage_locations.location_code
parts.storage_location → storage_locations.location_code
equipment.storage_location → storage_locations.location_code
```

## Access Control

### Current Permissions

- **View Locations**: Any authenticated user (for dropdowns)
- **Manage Locations**: System admins only (`requireAdmin` middleware)

### Future Considerations

- Keep centralized admin control
- No per-module location management
- Maintains single source of truth

## Benefits

### Single Source of Truth
- One location list for entire company
- No duplicate location management
- Consistent location naming

### Easy Management
- Admin manages locations once
- Changes instantly affect all modules
- Add "Warehouse-Section-A" → available everywhere

### Better Data Integrity
- Track which module uses which location
- Cross-module reports by location
- "What's in location A1?" shows all inventory types

### Future-Proof
- New inventory modules automatically get location management
- No need to rebuild location system per module
- Scales naturally with business growth

## Migration Strategy

### Existing Gauge Data

**Current:** Gauges use `storage_location` VARCHAR field
**Status:** No migration needed - text field remains compatible
**Approach:**
- Dropdown now populated from database instead of hardcoded
- Existing location codes (A1-L5) already in database
- New locations can be added via admin UI

### Future Module Rollout

1. Create new inventory module (tools, parts, etc.)
2. Add `storage_location` VARCHAR field
3. Import `StorageLocationSelect` component
4. No additional backend work needed

## Technical Specifications

### Backend API

**Service Layer:**
```javascript
// backend/src/infrastructure/services/StorageLocationService.js
class StorageLocationService {
  async getStorageLocations({ includeInactive, locationType })
  async getStorageLocationById(id)
  async getStorageLocationByCode(locationCode)
  async createStorageLocation(locationData)
  async updateStorageLocation(id, updateData)
  async deleteStorageLocation(id) // Soft delete
  async hardDeleteStorageLocation(id) // With in-use protection
  async bulkCreateStorageLocations(locations)
  async reorderStorageLocations(orderData)
}
```

**Route Layer:**
```javascript
// backend/src/infrastructure/routes/storageLocations.routes.js
router.get('/', authenticateToken, getStorageLocations)
router.get('/:id', authenticateToken, getStorageLocationById)
router.post('/', authenticateToken, requireAdmin, createStorageLocation)
router.put('/:id', authenticateToken, requireAdmin, updateStorageLocation)
router.delete('/:id', authenticateToken, requireAdmin, deleteStorageLocation)
router.post('/bulk', authenticateToken, requireAdmin, bulkCreateLocations)
router.put('/reorder', authenticateToken, requireAdmin, reorderLocations)
```

### Frontend Components

**Infrastructure Component (To Be Created):**
```typescript
// frontend/src/infrastructure/components/StorageLocationSelect.tsx
interface StorageLocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const StorageLocationSelect: React.FC<StorageLocationSelectProps>
```

**Module Usage:**
```typescript
// In any module (gauge, tooling, parts)
import { StorageLocationSelect } from '../../infrastructure/components';

<StorageLocationSelect
  value={storageLocation}
  onChange={setStorageLocation}
  label="Storage Location"
  required
/>
```

## Admin UI Features

### Location Management Page (`/admin/settings/storage-locations`)

**Features:**
- ✅ List all locations with filters (type, status, usage)
- ✅ Create single location
- ✅ Range generator (e.g., Floor 1-50, Bin A1-Z99)
- ✅ Bulk import from CSV
- ✅ Edit location details
- ✅ Reorder display sequence (drag-and-drop)
- ✅ Soft delete (deactivate)
- ✅ Hard delete (only if unused)
- ✅ In-use protection (cannot delete locations with inventory)

**Statistics:**
- Total locations
- Active vs inactive
- In-use count
- Location type breakdown

**Filters:**
- Search by code or description
- Filter by type (bin, shelf, rack, etc.)
- Filter by status (active/inactive)
- Filter by usage (in-use/available)

## Security

### Authentication
- All endpoints require valid JWT token
- Admin operations require `requireAdmin` middleware

### Authorization
- Public: View active locations (for dropdowns)
- Admin: Full CRUD operations

### Validation
- Input validation using express-validator
- Unique location codes enforced
- SQL injection prevention via parameterized queries

### Audit Logging
- All location changes logged to audit_logs table
- Track who created/modified/deleted locations

## Performance

### Caching Strategy
- Frontend: Cache locations in component state
- Backend: Database indexes on is_active, location_type, display_order
- Minimal payload: Only active locations by default

### Batch Operations
- Bulk create for efficiency
- Range generator for sequential creation

## Testing Strategy

### Backend Tests
- Unit tests for StorageLocationService
- Integration tests for API endpoints
- Test in-use protection logic
- Test soft delete vs hard delete

### Frontend Tests
- Unit tests for StorageLocationSelect component
- Integration tests for admin UI
- E2E tests for location creation and usage

## Documentation

### For Developers
- API documentation in this file
- Integration examples for new modules
- Shared component usage patterns

### For Administrators
- User guide for location management UI
- Best practices for naming conventions
- Guidance on location types and organization

### For End Users
- How to use location dropdowns
- Understanding location codes
- What to do if location not found

## Success Metrics

### Technical
- ✅ Single location master table
- ✅ Zero code duplication across modules
- ✅ <200ms API response time
- ✅ 100% backward compatibility with gauge module

### Business
- Reduced admin overhead (manage locations once)
- Faster module development (no location system per module)
- Better inventory visibility across all types

## Risks & Mitigation

### Risk: Location name conflicts across modules
**Mitigation**: Unique location codes enforced at database level

### Risk: Module-specific location requirements
**Mitigation**: Use location_type field and descriptions for categorization

### Risk: Performance with many locations (1000+)
**Mitigation**: Database indexes, pagination, search filters

### Risk: Breaking change for existing gauge data
**Mitigation**: Default A1-L5 locations included in migration, backward compatible

## Future Considerations

### Phase 4: Advanced Features (Backlog)

**Hierarchical Locations:**
```sql
storage_locations
├── parent_id (FK to storage_locations.id)
└── location_path (e.g., "Building-A/Floor-1/Rack-3/Bin-5")
```

**Location Capacity:**
```sql
ALTER TABLE storage_locations ADD COLUMN max_items INT;
```

**Location Zones:**
```sql
CREATE TABLE location_zones (
  id INT PRIMARY KEY,
  zone_name VARCHAR(50),
  zone_type ENUM('temperature_controlled', 'secure', 'hazmat', 'general')
);

ALTER TABLE storage_locations ADD COLUMN zone_id INT;
```

**Barcode Integration:**
```sql
ALTER TABLE storage_locations ADD COLUMN barcode VARCHAR(100);
ALTER TABLE storage_locations ADD COLUMN qr_code VARCHAR(255);
```

## Related Documentation

- [Storage Locations System Documentation](../STORAGE_LOCATIONS_SYSTEM.md)
- [Admin UI Mockup](../mockups/storage-locations-admin-ui.html)
- [API Reference](../STORAGE_LOCATIONS_SYSTEM.md#api-reference)
- [Migration Guide](../STORAGE_LOCATIONS_SYSTEM.md#migration-from-hardcoded-locations)

## Changelog

### 2025-10-29: Architecture Decision
- ✅ Decision: Company-wide centralized storage locations
- ✅ Rationale: Industry best practice, future-proof, DRY principles
- ✅ Research: NetSuite, SAP, Odoo analysis
- ✅ Status: Backend infrastructure complete, frontend component pending

## Appendix

### References

**Industry Best Practices:**
- NetSuite Bin Management Documentation
- SAP Storage Location Master Data
- Odoo Warehouse Management Architecture
- ERP Inventory Management Standards

**Internal:**
- Original gauge module location implementation
- Spare pairing workflow
- Admin permission system
