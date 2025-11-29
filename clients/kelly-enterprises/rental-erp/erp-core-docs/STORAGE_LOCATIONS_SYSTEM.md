# Storage Locations Configuration System

**Date**: 2025-10-29
**Status**: Ready for Deployment
**Version**: 1.0

## Overview

The Storage Locations System provides a configurable, company-specific storage location management system. Administrators can define, manage, and customize storage locations to match their unique warehouse/storage layout.

## Features

✅ **Configurable Locations**: Define custom storage locations (bins, shelves, racks, cabinets, etc.)
✅ **Dynamic Dropdowns**: All storage location dropdowns populate from database
✅ **Admin Management**: Full CRUD operations for administrators
✅ **Multi-Type Support**: Bins, shelves, racks, cabinets, drawers, rooms, other
✅ **Soft Delete**: Deactivate locations without losing historical data
✅ **Display Ordering**: Control the order locations appear in dropdowns
✅ **Bulk Operations**: Create multiple locations at once
✅ **In-Use Protection**: Cannot delete locations currently in use by gauges

## Architecture

### Database Layer
**Table**: `storage_locations`
**Migration**: `019-create-storage-locations.sql`

**Schema**:
```sql
CREATE TABLE storage_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL,
  location_type ENUM('bin', 'shelf', 'rack', 'cabinet', 'drawer', 'room', 'other') DEFAULT 'bin',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Default Data**: Includes A1-L5 bin locations (60 locations) for backward compatibility

### Backend Layer

#### Service: `StorageLocationService`
**File**: `backend/src/infrastructure/services/StorageLocationService.js`

**Methods**:
- `getStorageLocations({ includeInactive, locationType })` - Get all locations
- `getStorageLocationById(id)` - Get specific location
- `getStorageLocationByCode(locationCode)` - Get by location code
- `createStorageLocation(locationData)` - Create new location
- `updateStorageLocation(id, updateData)` - Update existing location
- `deleteStorageLocation(id)` - Soft delete (mark inactive)
- `hardDeleteStorageLocation(id)` - Permanent delete (if not in use)
- `bulkCreateStorageLocations(locations)` - Create multiple locations
- `reorderStorageLocations(orderData)` - Update display order

#### API Routes: `/api/storage-locations`
**File**: `backend/src/infrastructure/routes/storageLocations.routes.js`

**Public Endpoints** (Authenticated users):
- `GET /api/storage-locations` - List all active locations
- `GET /api/storage-locations/:id` - Get specific location

**Admin-Only Endpoints**:
- `POST /api/storage-locations` - Create location
- `PUT /api/storage-locations/:id` - Update location
- `DELETE /api/storage-locations/:id` - Soft delete location
- `DELETE /api/storage-locations/:id?hard=true` - Hard delete location
- `POST /api/storage-locations/bulk` - Bulk create locations
- `PUT /api/storage-locations/reorder` - Reorder locations

### Frontend Layer

**Component Updates**:
- `SparePairingInterface.tsx` - Fetches locations from API
- `LocationInput.tsx` - Can be updated to use API (future enhancement)

**Integration**:
```typescript
// Fetch storage locations
const response = await apiClient.get('/storage-locations');
const locations = response.data;

// Use in dropdown
<FormSelect
  label="Storage Location"
  options={[
    { value: '', label: 'Select storage location...' },
    ...locations.map(loc => ({
      value: loc.location_code,
      label: loc.description ? `${loc.location_code} - ${loc.description}` : loc.location_code
    }))
  ]}
/>
```

## Installation & Setup

### Step 1: Run Database Migration

Run the migration to create the `storage_locations` table:

```bash
# From inside the backend Docker container
docker exec -i fireproof-erp-modular-backend-dev node -e "
const mysql = require('mysql2/promise');
const fs = require('fs');
(async () => {
  const connection = await mysql.createConnection({
    host: 'host.docker.internal',
    port: 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  const sql = fs.readFileSync('/app/src/infrastructure/database/migrations/019-create-storage-locations.sql', 'utf8');
  await connection.query(sql);
  console.log('✅ Migration 019 applied successfully');
  await connection.end();
})();
"
```

**Or manually**:
1. Connect to MySQL database
2. Run the SQL from `backend/src/infrastructure/database/migrations/019-create-storage-locations.sql`

### Step 2: Restart Backend

The backend automatically loads the new routes when restarted:

```bash
docker-compose restart backend
```

### Step 3: Verify Installation

Test the API:

```bash
# Get all storage locations
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/storage-locations

# Should return 60 default locations (A1-L5)
```

### Step 4: Customize Locations (Optional)

Use the admin API to add your company-specific locations:

```bash
# Create a new location
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location_code": "WAREHOUSE-A-BIN-1",
    "description": "Warehouse A, Bin 1",
    "location_type": "bin",
    "display_order": 100
  }' \
  http://localhost:8000/api/storage-locations
```

## Usage Examples

### For End Users

**Pairing Spare Gauges**:
1. Click "Pair" button on an unpaired gauge
2. Select compatible spare from dropdown
3. Select storage location from dropdown (populated from database)
4. Click "Pair Gauges"

**Storage Location Dropdown**:
- Automatically populated from database
- Shows location code + description
- Only active locations shown
- Ordered by `display_order` field

### For Administrators

**Add New Location**:
```javascript
// Via API
const response = await apiClient.post('/storage-locations', {
  location_code: 'RACK-A-SHELF-1',
  description: 'Rack A, Top Shelf',
  location_type: 'shelf',
  display_order: 50
});
```

**Bulk Import Locations**:
```javascript
// Create multiple locations at once
const locations = [
  { location_code: 'BIN-1A', location_type: 'bin', display_order: 1 },
  { location_code: 'BIN-1B', location_type: 'bin', display_order: 2 },
  { location_code: 'BIN-1C', location_type: 'bin', display_order: 3 }
];

await apiClient.post('/storage-locations/bulk', { locations });
```

**Deactivate Unused Location**:
```javascript
// Soft delete (mark as inactive)
await apiClient.delete(`/storage-locations/${locationId}`);
```

**Reorder Locations**:
```javascript
// Update display order for multiple locations
await apiClient.put('/storage-locations/reorder', {
  order: [
    { id: 1, display_order: 10 },
    { id: 2, display_order: 20 },
    { id: 3, display_order: 30 }
  ]
});
```

## Migration from Hardcoded Locations

### Before (Hardcoded A1-L5)

```typescript
// LocationInput.tsx
const LOCATION_SUGGESTIONS = [
  'A1', 'A2', 'A3', 'A4', 'A5',
  // ... hardcoded array
];
```

### After (Database-Driven)

```typescript
// Component
const [locations, setLocations] = useState([]);

useEffect(() => {
  const fetchLocations = async () => {
    const response = await apiClient.get('/storage-locations');
    setLocations(response.data);
  };
  fetchLocations();
}, []);
```

**Backward Compatibility**: The default migration includes A1-L5 locations, so existing functionality continues to work.

## Future Admin UI (Planned)

A full admin interface for managing storage locations is planned:

**Features**:
- Visual grid view of all locations
- Drag-and-drop reordering
- Inline editing
- Bulk import from CSV
- Usage statistics (how many gauges per location)
- Deactivation warnings for in-use locations

**Location**: `/admin/settings/storage-locations`

## API Reference

### GET /api/storage-locations

**Description**: Get all storage locations
**Auth**: Required
**Query Parameters**:
- `includeInactive` (boolean, optional) - Include inactive locations
- `locationType` (string, optional) - Filter by type (bin|shelf|rack|cabinet|drawer|room|other)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "location_code": "A1",
      "description": null,
      "location_type": "bin",
      "is_active": true,
      "display_order": 1,
      "created_at": "2025-10-29T10:00:00.000Z",
      "updated_at": "2025-10-29T10:00:00.000Z"
    }
  ],
  "count": 60
}
```

### POST /api/storage-locations

**Description**: Create a new storage location
**Auth**: Required (Admin only)
**Body**:
```json
{
  "location_code": "WAREHOUSE-A1",
  "description": "Warehouse A, Bin 1",
  "location_type": "bin",
  "display_order": 100
}
```

**Response**:
```json
{
  "success": true,
  "message": "Storage location created successfully",
  "data": {
    "id": 61,
    "location_code": "WAREHOUSE-A1",
    "description": "Warehouse A, Bin 1",
    "location_type": "bin",
    "is_active": true,
    "display_order": 100
  }
}
```

### PUT /api/storage-locations/:id

**Description**: Update an existing storage location
**Auth**: Required (Admin only)
**Body**: (all fields optional)
```json
{
  "location_code": "WAREHOUSE-A1-UPDATED",
  "description": "Updated description",
  "is_active": false,
  "display_order": 150
}
```

### DELETE /api/storage-locations/:id

**Description**: Soft delete a storage location
**Auth**: Required (Admin only)
**Query Parameters**:
- `hard` (boolean, optional) - Permanently delete if true

**Soft Delete Response**:
```json
{
  "success": true,
  "message": "Storage location deactivated"
}
```

**Hard Delete** (only if not in use):
```json
{
  "success": true,
  "message": "Storage location permanently deleted"
}
```

**Error** (if in use):
```json
{
  "success": false,
  "message": "Cannot delete storage location: 5 gauge(s) are using this location"
}
```

## Error Handling

### Common Errors

**Duplicate Location Code**:
```json
{
  "success": false,
  "message": "Storage location with code 'A1' already exists"
}
```

**Location Not Found**:
```json
{
  "success": false,
  "message": "Storage location with ID 999 not found"
}
```

**Cannot Delete In-Use Location**:
```json
{
  "success": false,
  "message": "Cannot delete storage location: 3 gauge(s) are using this location"
}
```

## Security

- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Admin-only for create/update/delete operations
- **Validation**: Input validation using express-validator
- **SQL Injection Prevention**: Parameterized queries via mysql2
- **Audit Logging**: All changes logged to audit_logs table

## Performance

- **Caching**: Frontend can implement local caching of locations
- **Indexed Queries**: Database indexes on `is_active`, `location_type`, `display_order`
- **Minimal Payload**: Only active locations returned by default
- **Batch Operations**: Bulk create for efficiency

## Best Practices

1. **Use Descriptive Codes**: `RACK-1-SHELF-A` better than `R1SA`
2. **Add Descriptions**: Helps users identify locations
3. **Logical Ordering**: Use `display_order` to group related locations
4. **Soft Delete**: Always soft delete first, hard delete only if necessary
5. **Regular Audits**: Review unused locations periodically
6. **Standardize Naming**: Establish company-wide naming convention

## Troubleshooting

### Dropdown Shows No Locations

**Cause**: Migration not run or API not accessible
**Solution**:
1. Check migration: `SELECT COUNT(*) FROM storage_locations;`
2. Verify backend routes: `docker logs fireproof-erp-modular-backend-dev`
3. Check browser console for API errors

### Cannot Delete Location

**Cause**: Gauges are using this location
**Solution**:
1. Find gauges using location: `SELECT * FROM gauges WHERE storage_location = 'A1';`
2. Move gauges to different location
3. Then delete the location

### Duplicate Location Code Error

**Cause**: Location code already exists
**Solution**:
1. Use unique location code
2. Or update existing location instead

## Related Documentation

- `PAIRING-WORKFLOW-TEST-REPORT.md` - Spare gauge pairing workflow
- `migrations/019-create-storage-locations.sql` - Database schema
- `StorageLocationService.js` - Service layer implementation
- `storageLocations.routes.js` - API routes

## Support

For questions or issues with the storage locations system, contact the development team or create an issue in the project repository.

## Changelog

### Version 1.0 (2025-10-29)
- Initial release
- Database table with default A1-L5 locations
- Full CRUD API endpoints
- Frontend integration in SparePairingInterface
- Admin-only management controls
- Soft delete and hard delete support
- Bulk operations support
