# Storage Locations Implementation Plan

## Overview
This document outlines the implementation plan for storage location improvements based on approved mockup designs.

**Created**: 2025-11-04
**Status**: Awaiting approval
**Mockups Reference**: `/erp-core-docs/frontend-rebuild/mockups/`

---

## 1. Database Changes

### 1.1 Add Allowed Item Types Field
**File**: `backend/src/infrastructure/database/migrations/020-add-allowed-item-types.sql`

```sql
-- Add allowed_item_types column to storage_locations table
ALTER TABLE storage_locations
ADD COLUMN allowed_item_types JSON DEFAULT '["gauges", "tools", "parts"]'
COMMENT 'Types of items allowed in this location (gauges, tools, parts)';

-- Create index for JSON queries (MySQL 5.7+)
ALTER TABLE storage_locations
ADD INDEX idx_allowed_item_types ((CAST(allowed_item_types AS CHAR(100))));

-- Update existing locations to allow all types by default
UPDATE storage_locations
SET allowed_item_types = '["gauges", "tools", "parts"]'
WHERE allowed_item_types IS NULL;
```

**Reason**: Enable location-level filtering of which item types can be stored (A-E for gauges, F-J for tools, etc.)

### 1.2 Remove Display Order References (Already Started)
**Status**: Migration file already updated, routes file partially updated

**Remaining work**:
- Remove `display_order` validation from routes (lines 231, 158-159 in storageLocations.routes.js)
- Remove `/reorder` endpoint entirely (lines 149-179)
- Update StorageLocationService to remove reorder method
- Frontend already sorts alphabetically by location_code

---

## 2. Backend API Changes

### 2.1 Update Storage Location Service
**File**: `backend/src/infrastructure/services/StorageLocationService.js`

**Changes needed**:
1. Add `allowed_item_types` to createStorageLocation
2. Add `allowed_item_types` to updateStorageLocation
3. Add validation: at least one item type must be selected
4. Remove `reorderStorageLocations` method
5. Remove `display_order` from all queries

### 2.2 Update Routes Validation
**File**: `backend/src/infrastructure/routes/storageLocations.routes.js`

**Lines to update**:
- Line 83: Remove `body('display_order')` validation from POST
- Line 231: Remove `body('display_order')` validation from PUT
- Lines 149-179: Remove entire `/reorder` endpoint
- Add validation for `allowed_item_types`:
  ```javascript
  body('allowed_item_types')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one item type must be allowed')
    .custom((value) => {
      const validTypes = ['gauges', 'tools', 'parts'];
      return value.every(type => validTypes.includes(type));
    })
    .withMessage('Invalid item type')
  ```

### 2.3 Add Item Type Filtering Endpoint (Optional)
**File**: `backend/src/infrastructure/routes/storageLocations.routes.js`

```javascript
/**
 * GET /api/storage-locations/for-item-type/:itemType
 * Get storage locations that allow a specific item type
 */
router.get('/for-item-type/:itemType',
  authenticateToken,
  [
    param('itemType').isIn(['gauges', 'tools', 'parts']).withMessage('Invalid item type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const locations = await storageLocationService.getLocationsByItemType(req.params.itemType);
      return res.json({
        success: true,
        data: locations,
        count: locations.length
      });
    } catch (error) {
      console.error('Error fetching locations by item type:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch locations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);
```

---

## 3. Frontend Changes

### 3.1 Update Location Detail Page
**File**: `frontend/src/modules/inventory/components/LocationDetailPage.tsx`

**Based on**: `location-detail-simplified.html` mockup

**Changes**:
1. Remove tabs (single section design)
2. Add collapsible history section
3. Compact spacing (already done)
4. Show allowed item types badges
5. Filter displayed items based on location's allowed types

**New sections**:
```typescript
// Display allowed item types as badges
<div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
  {location.allowed_item_types?.includes('gauges') && (
    <span className="badge badge-primary">🔧 Gauges</span>
  )}
  {location.allowed_item_types?.includes('tools') && (
    <span className="badge badge-info">🔨 Tools</span>
  )}
  {location.allowed_item_types?.includes('parts') && (
    <span className="badge badge-success">📦 Parts</span>
  )}
</div>

// Collapsible history section
<div className="history-section">
  <div
    className="history-toggle"
    onClick={() => setHistoryExpanded(!historyExpanded)}
    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
  >
    <h3>📊 Movement History</h3>
    <span>{historyExpanded ? '▼' : '▶'}</span>
  </div>
  {historyExpanded && (
    <div className="history-content">
      {/* History table */}
    </div>
  )}
</div>
```

### 3.2 Create Edit Location Modal Component
**File**: `frontend/src/modules/inventory/components/EditLocationModal.tsx`

**Based on**: `edit-location-modal-with-item-types.html` mockup

**Key features**:
- Location code field (disabled when items exist)
- Description textarea
- Location type dropdown
- Allowed item types checkboxes (Gauges, Tools, Parts)
- Active status toggle
- Delete button (disabled when items exist)
- Validation: at least one item type must be selected

**Props**:
```typescript
interface EditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: StorageLocation;
  hasItems: boolean;
  onSave: (updates: Partial<StorageLocation>) => Promise<void>;
  onDelete: () => Promise<void>;
}
```

### 3.3 Update Storage Locations List Page
**File**: `frontend/src/modules/inventory/components/StorageLocationsPage.tsx`

**Changes**:
1. Add "Edit" button to each row (admin only)
2. Show allowed item types as icons/badges in table
3. Remove drag-and-drop reordering (no longer needed)
4. Sort by location_code alphabetically

### 3.4 Add Item Type Filtering to Movement Operations
**Files**:
- `frontend/src/modules/gauge/components/CheckInModal.tsx`
- `frontend/src/modules/gauge/components/TransferModal.tsx`
- Any other location selection dropdowns

**Changes**:
```typescript
// Filter locations based on item type
const validLocations = locations.filter(loc =>
  loc.allowed_item_types?.includes(itemType) &&
  loc.is_active
);
```

---

## 4. TypeScript Types Updates

### 4.1 Update StorageLocation Interface
**File**: `frontend/src/types/inventory.ts` (or wherever types are defined)

```typescript
export interface StorageLocation {
  id: number;
  location_code: string;
  description?: string;
  location_type: 'bin' | 'shelf' | 'rack' | 'cabinet' | 'drawer' | 'room' | 'other';
  is_active: boolean;
  allowed_item_types: Array<'gauges' | 'tools' | 'parts'>; // NEW FIELD
  created_at: string;
  updated_at: string;
}
```

---

## 5. Testing Requirements

### 5.1 Backend Tests
**File**: `backend/tests/modules/inventory/storageLocations.test.js`

**Test cases**:
1. Create location with allowed_item_types
2. Update location with allowed_item_types
3. Validate at least one item type is required
4. Validate only valid item types are accepted
5. Filter locations by item type
6. Prevent editing location_code when items exist
7. Prevent deleting location when items exist

### 5.2 Frontend Tests
**File**: `frontend/tests/unit/inventory/EditLocationModal.test.tsx`

**Test cases**:
1. Render modal with location data
2. Disable location_code when hasItems=true
3. Require at least one item type checkbox
4. Submit form with valid data
5. Show validation errors
6. Disable delete button when hasItems=true

---

## 6. Migration Strategy

### Phase 1: Database (No User Impact)
1. Run migration to add `allowed_item_types` column
2. Default all existing locations to allow all types
3. Verify data integrity

### Phase 2: Backend (API Compatibility)
1. Update service and routes to handle `allowed_item_types`
2. Keep `display_order` temporarily for backwards compatibility
3. Deploy backend
4. Test API endpoints

### Phase 3: Frontend (User-Facing Changes)
1. Update LocationDetailPage with simplified design
2. Create EditLocationModal component
3. Update location selection dropdowns with filtering
4. Deploy frontend
5. User acceptance testing

### Phase 4: Cleanup
1. Remove `display_order` from backend completely
2. Remove `/reorder` endpoint
3. Remove any frontend references to reordering

---

## 7. Rollback Plan

If issues arise:

**Phase 3+ Issues**: Revert frontend, backend still compatible
**Phase 2 Issues**: `allowed_item_types` defaults to all types, no filtering applied
**Phase 1 Issues**: Column can be dropped without data loss

---

## 8. Documentation Updates

### 8.1 User Documentation
- Update admin guide with new "Allowed Item Types" feature
- Explain how location filtering works during check-in/transfer
- Document that locations sort alphabetically (A1, A2, B1, etc.)

### 8.2 Developer Documentation
- Update API documentation for storage_locations endpoints
- Document JSON structure for `allowed_item_types`
- Update database schema documentation

---

## 9. Estimated Effort

| Task | Estimated Time |
|------|---------------|
| Database migration | 30 minutes |
| Backend service updates | 1-2 hours |
| Backend route updates | 1 hour |
| Backend tests | 1-2 hours |
| EditLocationModal component | 2-3 hours |
| LocationDetailPage updates | 1-2 hours |
| Location filtering in dropdowns | 1-2 hours |
| Frontend tests | 1-2 hours |
| Testing & QA | 2-3 hours |
| Documentation | 1 hour |
| **Total** | **12-18 hours** |

---

## 10. Approval Checklist

Before proceeding with implementation:

- [ ] Review mockup designs (edit-location-modal-with-item-types.html)
- [ ] Approve database schema changes (allowed_item_types JSON field)
- [ ] Approve removal of display_order field and /reorder endpoint
- [ ] Approve simplified LocationDetailPage design (no tabs)
- [ ] Confirm item type filtering approach (checkboxes)
- [ ] Approve migration strategy and rollback plan
- [ ] Review effort estimates

---

## 11. Questions for User

1. **Priority**: Should this be implemented immediately or after other work?
2. **Phasing**: Implement all at once or phase by phase?
3. **Default Behavior**: Should new locations default to all types or require explicit selection?
4. **Existing Data**: Should we review existing location assignments and suggest filtering (A-E gauges, F-J tools)?
5. **UI Polish**: Any additional styling or UX improvements needed beyond mockups?

---

## Next Steps

Once approved, I will:
1. Create database migration file (020-add-allowed-item-types.sql)
2. Update backend services and routes
3. Create EditLocationModal component
4. Update LocationDetailPage with simplified design
5. Add item type filtering to all location dropdowns
6. Write comprehensive tests
7. Update documentation

**Estimated completion**: 2-3 days with testing and QA
