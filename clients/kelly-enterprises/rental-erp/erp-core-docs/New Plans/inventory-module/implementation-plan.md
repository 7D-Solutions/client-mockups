# Inventory Module - Implementation Plan

**Date**: 2025-10-30 (Simplified for incremental development + critical fixes)
**Status**: Planning Phase - Ready for Implementation

---

## ⚠️ CRITICAL FIXES APPLIED (2025-10-30)

**Issue**: UNIQUE constraint logic mismatch discovered during accuracy review

**Fix**: Updated MovementService implementation to use:
- **Gauges/Tools**: Simple UPDATE or INSERT (check exists, then UPDATE or INSERT)
- **Parts**: INSERT...ON DUPLICATE KEY UPDATE (works for multiple locations)

**Parts Architecture Confirmed**: Parts MUST use `inventory_current_locations` with quantity field. No separate `part_inventory` table needed.

See database-design.md for detailed explanation and correct transaction logic.

---

## 🎯 DEPLOYMENT CONTEXT (CRITICAL)

**Current Database State**: Test data only - can be cleared and recreated

**Deployment Approach**: Clean slate - no backward compatibility needed

**Benefits**:
- ✅ No initial data migration required
- ✅ No maintenance window needed
- ✅ Trivial rollback (just drop tables)
- ✅ Clean testing with fresh data
- ✅ No legacy data concerns

**Deployment**: Simply run migration, deploy code, start using system. Test data will be created naturally through gauge operations.

---

## Overview

This plan outlines a **simplified, incremental approach** to building the Inventory Module. Start with core functionality, add complexity only when proven necessary.

**Guiding Principles:**
- **Simple first, add as needed** - Don't over-engineer upfront
- Build backend foundation first
- Add frontend pages incrementally
- Test each phase before moving to next
- Keep modules loosely coupled
- Maintain backward compatibility
- **Add fields/indexes/features based on actual needs, not speculation**

---

## Architecture: Inventory = Single Source of Truth for Locations

**Critical Decision**: Inventory module OWNS all item location data. Modules ASK inventory where items are.

### Two-Table Pattern (Industry Standard)

**inventory_current_locations** - Fast lookup for "Where is it NOW?"
- Single source of truth for current item locations
- UNIQUE constraint ensures one item = one location
- INDEX on current_location for "What's in location A1?" queries

**inventory_movements** - Historical audit trail
- Immutable record of all location changes
- Full from/to history for compliance and analysis
- Optimized for history queries, not current state

**Performance**: 50x faster than querying latest from movements table (1ms vs 50ms)

### Module Integration Pattern

**Gauge/Tools/Parts modules**:
- DO NOT store location in their own tables (or field is unused)
- CALL inventory API to move items: `POST /api/inventory/move`
- QUERY inventory API for location: `GET /api/inventory/location/:type/:id`

**Inventory module**:
- Manages both tables atomically (transaction-based updates)
- Validates location changes before recording
- Provides cross-module location visibility

### Why Two Tables?

**Why not just movements table?**
- Query "latest" from movements = slow (ORDER BY + LIMIT for EVERY item)
- No index can help (need latest for each unique item)
- Scales poorly with history size

**Why not just current_locations table?**
- Loses audit trail and compliance requirements
- Can't answer "Where has it been?" or "Who moved it when?"
- No historical analysis or movement trends

**Controlled Duplication**: Accept duplication between tables for performance (NetSuite, SAP, Odoo all use this pattern)

---

## UI Specifications (From Approved Mockups)

### Landing Page Design
**Reference**: `inventory-landing-page-v3.html` (approved 2025-10-30)

**Layout**:
- Single column "Items" list (removed 3-column layout)
- All item types in one column, color-coded by type
- Empty locations show "-" not "0"
- Stats only show types with >0 items

**Item Display**:
- **Gauges**: Blue link - `GAUGE-001`
- **Tools**: Orange link - `TOOL-015`
- **Parts**: Green link with quantity - `P/N-12345 Qty 50, Total 170`
  - "Qty 50" = quantity in THIS location
  - "Total 170" = total quantity across ALL locations

**Search System**:
- Dropdown with 4 options:
  1. All Items (default)
  2. Item ID
  3. Item Name
  4. Location

**Interactions**:
- All items clickable → Opens source module modal
- Location codes clickable → Opens location detail page

### Location Detail Page Design
**Reference**: `inventory-location-detail-updated.html` (approved 2025-10-30)

**Layout**:
- Show what's in the specific location
- Separate sections: Gauges | Tools | Parts
- Hide sections with 0 items (don't show empty sections)

**Parts Display**:
- Format: `P/N-12345 Qty 50, Total 170`
- Same format as landing page for consistency

### Movement History Design
**Reference**: `inventory-movement-history-updated.html` (approved 2025-10-30)

**Timeline Display**:
- Chronological timeline of movements
- Color-coded badges by movement type

**Parts Movement Tracking**:
- **Transfer**: Show quantity + remaining balances
  - Example: "10 units moved A1→B2, Remaining: A1: 40 units, B2: 30 units"
- **Sold**: Show quantity + order number + remaining balance
  - Example: "5 units from A1, Order #SO-4521, Remaining: A1: 35 units"
- **Consumed**: Show quantity + job number + remaining balance
  - Example: "3 units from A1, Job #J-8842, Remaining: A1: 17 units"

**Key Requirements**:
- Parts movements MUST show quantity
- Sold movements MUST show order number
- Consumed movements MUST show job number
- All parts movements show remaining quantities

---

## Phase 1: Foundation (Sprint 1)

**Goal**: Database schema, movement tracking, basic reporting API



### Tasks

#### 1.1 Database Setup (SIMPLIFIED - Test Data Only)
- [ ] Run migration `020-create-inventory-tables.sql` ✅ **File created**
- [ ] Verify tables created successfully
- [ ] Verify foreign key relationships work
- [ ] Ready to start - test data will be created through normal operations

**Migration File Location:**
- ✅ `/backend/src/infrastructure/database/migrations/020-create-inventory-tables.sql` (CREATED)

**Deployment:**
```bash
# Simple deployment - no data migration needed
cd /path/to/backend
mysql -u username -p database_name < src/infrastructure/database/migrations/020-create-inventory-tables.sql

# Or via Docker:
docker exec -i fireproof-erp-modular-backend-dev mysql -u root -p fai_db_sandbox < /app/src/infrastructure/database/migrations/020-create-inventory-tables.sql
```

**Verification:**
```sql
-- Verify both tables created
DESCRIBE inventory_current_locations;
DESCRIBE inventory_movements;

-- Verify indexes exist
SHOW INDEX FROM inventory_current_locations;
SHOW INDEX FROM inventory_movements;

-- Tables start empty - test data will be created when:
-- 1. Gauges are created (creates inventory_current_locations record)
-- 2. Gauges are moved (creates inventory_movements record)
SELECT COUNT(*) FROM inventory_current_locations;  -- Should be 0
SELECT COUNT(*) FROM inventory_movements;           -- Should be 0
```

**Rollback (if needed):**
```sql
-- Simple rollback - just drop tables
DROP TABLE IF EXISTS inventory_movements;
DROP TABLE IF EXISTS inventory_current_locations;

-- No data loss since all data is test data
```

#### 1.2 Backend Infrastructure
- [ ] Create module folder structure
- [ ] Create `MovementRepository.js`
- [ ] Create `MovementTrackingService.js`
- [ ] Add basic CRUD operations for movements

**Files to Create:**
- `/backend/src/modules/inventory/repositories/MovementRepository.js`
- `/backend/src/modules/inventory/services/MovementTrackingService.js`

**Testing:**
- Unit tests for repository CRUD operations
- Service layer validation tests

#### 1.3 Movement API (Core Service)
- [ ] Create `MovementService.js` with atomic transaction logic
- [ ] Implement `moveItem()` method (updates both tables)
- [ ] Implement `getCurrentLocation()` method
- [ ] Create API routes for movement operations

**Files to Create:**
- `/backend/src/modules/inventory/services/MovementService.js`
- `/backend/src/modules/inventory/controllers/movementController.js`
- `/backend/src/modules/inventory/routes/inventory-movement.routes.js`

**API Endpoints:**
- `POST /api/inventory/move` - Move an item to new location
- `GET /api/inventory/location/:itemType/:itemIdentifier` - Get current location
- `DELETE /api/inventory/location/:itemType/:itemIdentifier` - Remove from inventory (when item deleted)

**Critical Transaction Test Cases**:
```javascript
// Test Case 1: Move gauge (UPDATE path - gauge already exists)
const result1 = await MovementService.moveItem({
  itemType: 'gauge',
  itemIdentifier: 'GAUGE-001',
  toLocation: 'B2',
  movedBy: 1,
  reason: 'Moving to new location'
});
// ✅ Verify: UPDATE executed on inventory_current_locations
// ✅ Verify: INSERT executed on inventory_movements

// Test Case 2: Create gauge (INSERT path - first time tracking)
const result2 = await MovementService.moveItem({
  itemType: 'gauge',
  itemIdentifier: 'NEW-GAUGE-001',
  toLocation: 'A1',
  movedBy: 1,
  reason: 'New gauge created'
});
// ✅ Verify: INSERT executed on inventory_current_locations
// ✅ Verify: INSERT executed on inventory_movements

// Test Case 3: Move to same location (no-op)
const result3 = await MovementService.moveItem({
  itemType: 'gauge',
  itemIdentifier: 'GAUGE-001',
  toLocation: 'B2',  // Same as current location
  movedBy: 1,
  reason: 'No change'
});
// ✅ Verify: No UPDATE executed (skipped)
// ✅ Verify: No INSERT executed (skipped)

// Test Case 4: Transaction rollback on error
await expect(async () => {
  await MovementService.moveItem({
    itemType: 'gauge',
    itemIdentifier: 'TEST-001',
    toLocation: 'INVALID-LOCATION',  // Triggers foreign key error
    movedBy: 1,
    reason: 'Testing'
  });
}).rejects.toThrow();
// ✅ Verify: NEITHER table updated (transaction rolled back)

// Test Case 5: Concurrent updates (race condition)
const promises = [
  MovementService.moveItem({ itemType: 'gauge', itemIdentifier: 'GAUGE-001', toLocation: 'A1', movedBy: 1 }),
  MovementService.moveItem({ itemType: 'gauge', itemIdentifier: 'GAUGE-001', toLocation: 'B2', movedBy: 2 })
];
await Promise.all(promises);
// ✅ Verify: Final location is either A1 or B2 (not corrupted)
// ✅ Verify: Both movements recorded in history

// Test API endpoint
const response = await request(app)
  .post('/api/inventory/move')
  .send({ itemType: 'gauge', itemIdentifier: 'TEST-001', toLocation: 'B2', reason: 'Testing' });
```

#### 1.4 Basic Reporting API
- [ ] Create `InventoryReportingService.js`
- [ ] Implement queries against `inventory_current_locations` table
- [ ] Join to source modules for item names (optional optimization)
- [ ] Create API endpoints for basic reports
- [ ] Test with sample data

**Files to Create:**
- `/backend/src/modules/inventory/services/InventoryReportingService.js`
- `/backend/src/modules/inventory/controllers/inventoryReportController.js`
- `/backend/src/modules/inventory/routes/inventory-reports.routes.js`

**API Endpoints:**
- `GET /api/inventory/reports/overview` - Summary stats by item type
- `GET /api/inventory/reports/by-location/:locationCode` - All items in a location

**Query Strategy Decision: Use Option B (JOIN)**

**Chosen Approach**: Single query with LEFT JOINs for performance

**Rationale**:
| Aspect          | Option A (Multiple Queries) | Option B (Single JOIN) |
|-----------------|----------------------------|------------------------|
| Simplicity      | ✅ Simple                   | ⚠️ More complex        |
| Performance     | ❌ N+1 queries              | ✅ Single query        |
| Maintainability | ✅ Easy to change           | ⚠️ Tighter coupling    |
| Scalability     | ❌ Poor with 100+ items     | ✅ Excellent           |

**Decision**: Option B - Performance matters more than coupling at production scale

**Implementation**:
```javascript
// Recommended: Single query with LEFT JOINs
const items = await db.query(`
  SELECT icl.item_type, icl.item_identifier, icl.quantity, icl.current_location,
         COALESCE(g.name, t.name, p.description) as item_name
  FROM inventory_current_locations icl
  LEFT JOIN gauges g ON icl.item_type = 'gauge' AND icl.item_identifier = g.gauge_id
  LEFT JOIN tools t ON icl.item_type = 'tool' AND icl.item_identifier = t.tool_id
  LEFT JOIN parts p ON icl.item_type = 'part' AND icl.item_identifier = p.part_number
  WHERE icl.current_location = ?
`, [locationCode]);

// Alternative: Multiple queries (use only if JOIN proves problematic)
// const items = await db.query(
//   'SELECT item_type, item_identifier FROM inventory_current_locations WHERE current_location = ?',
//   [locationCode]
// );
// Then fetch names from gauge/tools/parts tables
```

**Testing:**
- Integration tests for API endpoints
- Verify correct counts by item type
- Performance testing with larger datasets
- Test with items that have no current location

---

## Phase 2: Gauge Module Integration (Sprint 2)

**Goal**: Update gauge module to use inventory API for location management



### Tasks

#### 2.1 Update Gauge Module to Call Inventory API
- [ ] Modify gauge workflows that involve location changes
- [ ] Replace direct storage_location updates with inventory API calls
- [ ] Test movement tracking when gauge location changes
- [ ] Verify backward compatibility (gauges still work)

**Files to Modify:**
- `/backend/src/modules/gauge/services/GaugeCheckoutService.js` (when gauge returned)
- `/backend/src/modules/gauge/services/GaugeCreationService.js` (when gauge created)
- Other services that move gauges

**Architecture Change:**
```javascript
// OLD APPROACH (no longer use):
// await pool.execute('UPDATE gauges SET storage_location = ? WHERE gauge_id = ?', [newLocation, gaugeId]);

// NEW APPROACH (call inventory module directly - same process):
const InventoryMovementService = require('../../inventory/services/MovementService');
await InventoryMovementService.moveItem({
  itemType: 'gauge',
  itemIdentifier: gaugeId,
  toLocation: newLocation,
  movedBy: userId,
  reason: 'Gauge returned from customer'
});

// MovementService.moveItem handles:
// 1. Check if gauge exists in inventory_current_locations
// 2. UPDATE existing row OR INSERT new row (for gauges/tools)
// 3. INSERT movement record in inventory_movements
// 4. All within atomic transaction
```

**Key Locations to Update:**
1. **Gauge Return Flow**: When customer returns gauge, call inventory API to set location
2. **Gauge Creation**: When new gauge created, call inventory API with type='created'
3. **Gauge Deletion**: When gauge deleted, call inventory API to remove from current_locations
4. **Manual Location Updates** (if any admin UI exists)

#### 2.2 Update Gauge Display to Show Location
- [ ] Modify gauge detail views to query inventory API for location
- [ ] Remove direct queries to `gauges.storage_location` field (or note it's deprecated)
- [ ] Display location from inventory API

**Frontend Changes:**
```javascript
// When displaying gauge detail:
const locationResponse = await fetch(`/api/inventory/location/gauge/${gaugeId}`);
const { current_location } = await locationResponse.json();
// Display current_location in UI
```

**Backend Changes:**
```javascript
// In gauge detail endpoint, include location from inventory:
const gauge = await GaugeRepository.findById(gaugeId);
const location = await InventoryMovementService.getCurrentLocation('gauge', gaugeId);
res.json({ ...gauge, current_location: location });
```

#### 2.3 Testing Integration
- [ ] Create gauge → verify record in inventory_current_locations with type='created'
- [ ] Return gauge → verify location updated in inventory_current_locations
- [ ] Delete gauge → verify removed from inventory_current_locations
- [ ] Display gauge → verify location shown from inventory API

**Testing:**
- Create test gauge through gauge module
- Verify inventory API returns correct location
- Return gauge to different location
- Verify movement history shows correct from/to locations
- Delete gauge and verify cleanup

---

## Phase 3: Frontend Dashboard (Sprint 2-3)

**Goal**: Basic inventory dashboard and location detail pages



### Tasks

#### 3.1 Create Module Structure
- [ ] Create inventory module folder
- [ ] Set up routes
- [ ] Create basic page shells
- [ ] Add navigation link

**Files to Create:**
- `/frontend/src/modules/inventory/routes.tsx`
- `/frontend/src/modules/inventory/pages/InventoryDashboard.tsx`
- `/frontend/src/modules/inventory/pages/LocationDetailPage.tsx`

**Navigation Update:**
```typescript
// In MainLayout.tsx or App.tsx
import { inventoryRoutes } from './modules/inventory/routes';

// Add to navigation
{ path: '/inventory', label: 'Inventory', icon: 'warehouse' }
```

#### 3.2 Build Landing Page (Dashboard)
- [ ] Create `useInventoryReports` hook
- [ ] Implement overview stats (only show types with >0 items)
- [ ] Build single-column items list (color-coded)
- [ ] Implement search dropdown (All Items | Item ID | Item Name | Location)
- [ ] Add parts quantity display: "Qty 50, Total 170"
- [ ] Make items clickable (open source module modals)
- [ ] Show "-" for empty locations (not "0")
- [ ] Add recent movements feed
- [ ] Style using infrastructure components

**Color Coding**:
```css
.gauge-link { color: #007bff; }  /* Blue for gauges */
.tool-link { color: #fd7e14; }   /* Orange for tools */
.part-link { color: #28a745; }   /* Green for parts */
```

**Parts Quantity Logic**:
```typescript
// For each part in location
const localQty = getQuantityInLocation(partNumber, locationCode);
const totalQty = getTotalQuantityAllLocations(partNumber);
// Display: "P/N-12345 Qty ${localQty}, Total ${totalQty}"
```

**Testing:**
- Manual UI testing
- Verify color coding works for all item types
- Test search dropdown filters correctly
- Verify parts show local + total quantities
- Check responsive design
- Test with different data volumes
- Verify empty locations show "-"
- Test clickable items open correct modals

#### 3.3 Build Location Detail Page
- [ ] Fetch items by location
- [ ] Group items by type (gauges, tools, parts)
- [ ] Hide sections with 0 items (show only populated sections)
- [ ] Add parts quantity display: "Qty 50, Total 170"
- [ ] Make items clickable (open source module modals)
- [ ] Show movement history for location
- [ ] Add navigation breadcrumbs

**Section Visibility Logic**:
```typescript
// Only show sections that have items
const showGaugesSection = gauges.length > 0;
const showToolsSection = tools.length > 0;
const showPartsSection = parts.length > 0;
```

**Testing:**
- Click location from dashboard → should load detail page
- Verify all items in location are shown
- Verify empty sections are hidden (not shown at all)
- Verify parts show "Qty X, Total Y" format
- Verify items are clickable and open correct modals
- Check movement history displays correctly

---

## Phase 4: Movement History UI (Sprint 3)

**Goal**: Complete movement history and audit trail



### Tasks

#### 4.1 Movement History Page
- [ ] Create `useMovementHistory` hook
- [ ] Build movement timeline component
- [ ] Add parts quantity display in movements
- [ ] Show order numbers for "sold" movements
- [ ] Show job numbers for "consumed" movements
- [ ] Display remaining quantities after part movements
- [ ] Add filters (type, location, date, user)
- [ ] Implement pagination
- [ ] Add export to CSV feature

**Parts Movement Display Requirements**:
```typescript
// Transfer movement
"10 units moved A1→B2"
"Remaining: A1: 40 units, B2: 30 units"

// Sold movement
"5 units from A1"
"Order #SO-4521"
"Remaining: A1: 35 units"

// Consumed movement
"3 units from A1"
"Job #J-8842"
"Remaining: A1: 17 units"
```

**Files to Create:**
- `/frontend/src/modules/inventory/pages/MovementHistoryPage.tsx`
- `/frontend/src/modules/inventory/components/MovementTimeline.tsx`
- `/frontend/src/modules/inventory/components/MovementFilters.tsx`
- `/frontend/src/modules/inventory/components/PartMovementDetails.tsx` (NEW - for parts-specific display)
- `/frontend/src/modules/inventory/hooks/useMovementHistory.ts`

#### 4.2 Movement History API
- [ ] Create movement history endpoints
- [ ] Include quantity, order_number, job_number fields for parts
- [ ] Add filtering and pagination
- [ ] Optimize queries with indexes
- [ ] Test performance with large datasets

**API Endpoints:**
- `GET /api/inventory/movements`
- `GET /api/inventory/movements/item/:itemType/:itemIdentifier`
- `GET /api/inventory/movements/location/:locationCode`

**Response Structure** (for parts movements):
```json
{
  "id": 123,
  "movement_type": "sold",
  "item_type": "part",
  "item_identifier": "P/N-12345",
  "item_description": "Widget Assembly",
  "quantity": 5,
  "order_number": "SO-4521",
  "job_number": null,
  "from_location": "A1",
  "to_location": null,
  "moved_at": "2025-10-30T14:30:00Z",
  "moved_by": "john.doe",
  "reason": "Customer order fulfillment"
}
```

**Testing:**
- Filter by item type → verify correct results
- Filter by location → verify correct results
- Verify quantity field populated for parts movements
- Verify order_number present for "sold" movements
- Verify job_number present for "consumed" movements
- Pagination → verify correct page boundaries
- Performance test with 10,000+ movements

---

## Phase 5: Basic Location Management (Sprint 3)

**Goal**: Simple CRUD for storage locations (delegate to infrastructure API)



### Tasks

#### 5.1 Basic Location Management UI
- [ ] Create simple `LocationManagementPage.tsx`
- [ ] List all locations
- [ ] Create single location form
- [ ] Edit location form
- [ ] Delete location (soft delete)

**Files to Create:**
- `/frontend/src/modules/inventory/pages/LocationManagementPage.tsx`

**MVP Features Only:**
- ✅ View all locations
- ✅ Search and filter
- ✅ Create single location
- ✅ Edit location details
- ✅ Delete location (soft delete with validation)

**Moved to Future Enhancements:**
- ❌ Bulk range generator (Floor 1-50, Bin A1-Z99)
- ❌ Drag-to-reorder display sequence
- ❌ Usage statistics and charts
- ❌ Advanced filtering

#### 5.2 Location Admin API
- [ ] Delegate to existing infrastructure API at `/api/storage-locations`
- [ ] Test admin-only permissions

**Note**: Infrastructure layer already provides location CRUD. Inventory module simply uses these endpoints.

**Testing:**
- Create location → verify appears in list
- Edit location → verify changes saved
- Delete location → verify soft deleted (is_active = false)
- Try to delete in-use location → verify error shown

---

## Phase 6: Future Modules Integration (Future)

**Goal**: Integrate with tools and parts modules when they're built



### Tasks

#### 6.1 Tools Module Integration
- [ ] Create tools module (separate effort)
- [ ] Tools module calls inventory API for location management
- [ ] Test cross-module reporting (gauges + tools)

**Integration Pattern:**
```javascript
// When tool location changes, call inventory API:
await InventoryMovementService.moveItem({
  itemType: 'tool',
  itemIdentifier: toolId,
  toLocation: newLocation,
  movedBy: userId,
  reason: 'Tool returned'
});

// When displaying tool, query inventory for location:
const location = await InventoryMovementService.getCurrentLocation('tool', toolId);
```

#### 6.2 Parts Module Integration
- [ ] Create parts module (separate effort)
- [ ] Decide on parts architecture (Option A: use inventory_current_locations vs Option B: separate part_inventory table)
- [ ] Parts module calls inventory API with quantity field
- [ ] Support quantity-based movements (not just unique items)
- [ ] Support sold movements with order_number
- [ ] Support consumed movements with job_number
- [ ] Test cross-module reporting (gauges + tools + parts)
- [ ] Test parts quantity aggregation across locations

**Parts API Calls:**
```javascript
// Transfer with quantity (uses INSERT...ON DUPLICATE KEY UPDATE)
await InventoryMovementService.moveItem({
  itemType: 'part',
  itemIdentifier: 'P/N-12345',
  quantity: 10,                    // REQUIRED for parts
  fromLocation: 'A1',
  toLocation: 'B2',
  movedBy: userId,
  reason: 'Restocking'
});

// Sold with order number
await InventoryMovementService.moveItem({
  itemType: 'part',
  itemIdentifier: 'P/N-12345',
  quantity: 5,                     // REQUIRED for parts
  orderNumber: 'SO-4521',          // REQUIRED for sold
  fromLocation: 'A1',
  toLocation: null,                // Sold = leaves inventory
  movedBy: userId,
  reason: 'Customer order fulfillment',
  movementType: 'sold'             // Add this type when parts module exists
});

// Consumed with job number
await InventoryMovementService.moveItem({
  itemType: 'part',
  itemIdentifier: 'P/N-12345',
  quantity: 3,                     // REQUIRED for parts
  jobNumber: 'J-8842',             // REQUIRED for consumed
  fromLocation: 'A1',
  toLocation: null,                // Consumed = leaves inventory
  movedBy: userId,
  reason: 'Job material usage',
  movementType: 'consumed'         // Add this type when parts module exists
});
```

**MovementService Implementation Notes:**
- **For Gauges/Tools**: Use simple UPDATE or INSERT (see database-design.md for logic)
- **For Parts**: Use INSERT...ON DUPLICATE KEY UPDATE to adjust quantities
- UNIQUE constraint `(item_type, item_identifier, current_location)` allows parts in multiple locations

---

## Moved to Future Enhancements (Not MVP)

**Database Optimizations** (add when needed):
- ❌ `item_description` cache field (add if queries too slow)
- ❌ `idx_location_from` index (add if from_location queries slow)
- ❌ `idx_moved_by` index (add if user activity queries slow)
- ❌ `sold`, `consumed` movement types (add when parts module exists)

**Location Management Advanced Features**:
- ❌ Bulk range generator (Floor 1-50, Bin A1-Z99)
- ❌ Drag-to-reorder display sequence
- ❌ Location capacity management
- ❌ Usage statistics display

**Analytics & Insights** (entire Phase 6 removed from MVP):
- ❌ Location utilization analytics
- ❌ Movement trends visualization
- ❌ Charts and graphs
- ❌ Top/least used locations reports
- ❌ LocationUtilizationService
- ❌ Caching for expensive queries

**Advanced Reporting**:
- ❌ Custom reports builder
- ❌ Scheduled email reports
- ❌ PDF export
- ❌ Advanced filtering
- ❌ Saved searches

**Integration Features**:
- ❌ Barcode/QR code scanning
- ❌ RFID tag support
- ❌ Mobile app
- ❌ Real-time updates (WebSockets)
- ❌ API webhooks

**Reasoning**: Focus on "where are my items?" first. Add advanced features after core functionality proven in production.

---

## Testing Strategy

### Unit Tests
- Repository CRUD operations
- Service layer business logic (MovementService.moveItem)
- Transaction rollback logic
- Validation logic (location exists, item exists)

### Integration Tests
- API endpoint responses
- Inventory API called from gauge module
- Atomic updates to both tables (current_locations + movements)
- Database transactions and rollback on failure

### E2E Tests (Playwright)
- Full user workflows
- Dashboard → Location Detail flow
- Movement history filtering
- Location management CRUD operations
- Range generator bulk creation

### Performance Tests
- Query performance with 10,000+ items
- Movement history pagination
- Cross-module queries
- Location utilization calculations

---

## Error Handling Strategy

### Inventory API Failures

**Approach**: Fail gauge operation (no fallback)

**Rationale**:
- Test data only - no production data at risk
- No backward compatibility needed
- Clean failure is better than inconsistent state
- Location is critical business data

**Implementation Pattern**:
```javascript
// In gauge module services (e.g., GaugeCheckoutService)
try {
  // Call inventory API
  await InventoryMovementService.moveItem({
    itemType: 'gauge',
    itemIdentifier: gaugeId,
    toLocation: location,
    movedBy: userId,
    reason: 'Gauge returned from customer'
  });
} catch (err) {
  // Log error with full context
  logger.error('Inventory API failed', {
    gaugeId,
    location,
    userId,
    error: err.message,
    stack: err.stack
  });

  // Fail the gauge operation
  throw new Error('Failed to update gauge location. Please try again.');
}
```

**Benefits of Clean Failure**:
- One code path = simpler debugging
- Clear error messages to users
- No hybrid state = no data inconsistency risk
- Easy to identify root cause (check logs)

**When Inventory API is Down**:
- Gauge operations will fail visibly
- Users see clear error message
- Operations team alerted via logs
- Fix inventory API, retry operation
- No data corruption possible

---

## Deployment Checklist (SIMPLIFIED - Test Data Only)

### Before Deployment

#### Database
- [ ] Run migration `020-create-inventory-tables.sql` ✅ **File ready**
- [ ] Verify both tables created successfully
- [ ] Verify indexes created correctly
- [ ] No backup needed (test data only)

#### Backend
- [ ] All tests passing
- [ ] Inventory API endpoints registered in routes
- [ ] Gauge module updated to call inventory API
- [ ] Error handling implemented (fail on inventory API error)
- [ ] Logging configured for inventory operations

#### Frontend
- [ ] Build successful (`npm run build`)
- [ ] No console errors
- [ ] Routes registered correctly
- [ ] Navigation updated

### Deployment Steps (Clean Slate Approach)

**Total Time: ~5 minutes**

1. **Run Database Migration**
   ```bash
   # Via Docker (recommended)
   docker exec -i fireproof-erp-modular-backend-dev \
     mysql -u root -p fai_db_sandbox < \
     /app/src/infrastructure/database/migrations/020-create-inventory-tables.sql

   # Or directly if MySQL accessible
   mysql -u root -p fai_db_sandbox < \
     backend/src/infrastructure/database/migrations/020-create-inventory-tables.sql
   ```

2. **Deploy Backend Code**
   ```bash
   # Restart backend to load new code
   docker-compose restart backend

   # Verify tables exist
   docker exec -i fireproof-erp-modular-backend-dev \
     mysql -u root -p fai_db_sandbox -e "DESCRIBE inventory_current_locations;"
   ```

3. **Deploy Frontend Code**
   ```bash
   # Build and restart frontend
   cd frontend && npm run build
   docker-compose restart frontend
   ```

4. **Smoke Test**
   - [ ] Create a test gauge → Verify inventory record created
   - [ ] Move gauge to different location → Verify location updated
   - [ ] View gauge detail → Verify location displayed from inventory
   - [ ] Check movement history → Verify movement recorded

### Verification Queries

```sql
-- Check tables created
SHOW TABLES LIKE 'inventory_%';

-- Should show 2 tables:
-- inventory_current_locations
-- inventory_movements

-- Verify structure
DESCRIBE inventory_current_locations;
DESCRIBE inventory_movements;

-- Tables start empty (test data created through operations)
SELECT COUNT(*) FROM inventory_current_locations;  -- 0
SELECT COUNT(*) FROM inventory_movements;           -- 0
```

---

## Rollback Plan (TRIVIAL - Test Data Only)

If critical issues are discovered post-deployment:

**Simple Rollback** (5 minutes):

1. **Drop Inventory Tables**
   ```sql
   -- Safe to drop - all data is test data
   DROP TABLE IF EXISTS inventory_movements;
   DROP TABLE IF EXISTS inventory_current_locations;
   ```

2. **Revert Code**
   ```bash
   # Checkout previous commit
   git checkout <previous-commit-hash>

   # Restart containers
   docker-compose restart backend frontend
   ```

3. **Recreate Test Data**
   - Create test gauges through gauge module
   - System works exactly as before
   - No data loss (test data is recreatable)

**Why So Simple?**
- Test data only - no production data at risk
- No backward compatibility = no hybrid state to manage
- Clean cutover = clean rollback
- Tables can be safely dropped and recreated

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ Both inventory tables created (current_locations + movements)
- ✅ Movement API functional (moveItem, getCurrentLocation)
- ✅ Transaction-based updates working correctly
- ✅ Basic reporting API returns correct data

### Phase 2 Success Criteria
- ✅ Gauge module calls inventory API for location changes
- ✅ Gauge location changes tracked in both tables
- ✅ No breaking changes to gauge module
- ✅ Location displayed from inventory API

### Phase 3 Success Criteria
- ✅ Dashboard displays inventory overview
- ✅ Location detail page shows all items
- ✅ Navigation integrated

### Phase 4 Success Criteria
- ✅ Movement history page functional
- ✅ Basic filters working correctly
- ✅ Pagination handling datasets

### Phase 5 Success Criteria
- ✅ Admin can create/edit/delete locations
- ✅ In-use locations protected from deletion
- ✅ Simple list view functional

### MVP Complete
- ✅ Core question answered: "Where are my items?"
- ✅ Movement history provides audit trail
- ✅ Basic location management working
- ✅ Ready to add advanced features based on actual needs

---

## Risk Management

### Risk: Performance degradation with large datasets
**Mitigation:**
- Add database indexes on key fields
- Implement pagination everywhere
- Cache expensive queries (utilization stats)
- Archive old movements after 2 years

### Risk: Breaking changes to gauge module
**Mitigation:**
- Thorough testing before deployment
- Inventory API calls are non-blocking (can fail gracefully)
- Rollback plan ready
- Feature flags to disable inventory tracking if needed

### Risk: Data inconsistency between two tables
**Mitigation:**
- Transaction-based updates (both tables updated atomically)
- Rollback on failure ensures consistency
- Check current location before recording movement (avoid no-op)
- Application-level validation before recording movements
- Regular data integrity checks

### Risk: User confusion with new UI
**Mitigation:**
- Clear navigation labels
- Tooltips and help text
- User documentation and training
- Gradual rollout to pilot users first

---

## Future Enhancements (Backlog)

**Add these features after MVP is in production and actual needs are understood.**

### Database Optimizations (Add When Proven Needed)
- [ ] `item_description` cache field (if movement history queries too slow)
- [ ] `idx_location_from` index (if filtering by from_location shows poor performance)
- [ ] `idx_moved_by` index (if user activity queries are slow)
- [ ] `sold`, `consumed` movement types (when parts module is implemented)

### Location Management Enhancements
- [ ] Bulk range generator (Floor 1-50, Bin A1-Z99)
- [ ] Drag-to-reorder display sequence
- [ ] Location capacity management
- [ ] Usage statistics per location
- [ ] Location hierarchy (Building → Floor → Rack → Bin)

### Analytics & Insights (Removed from MVP)
- [ ] Location utilization dashboard
- [ ] Movement trends visualization
- [ ] Charts and graphs
- [ ] Top/least used locations reports
- [ ] Heat maps showing location activity
- [ ] Predictive analytics for space planning

### Advanced Features
- [ ] Barcode/QR code scanning for locations and items
- [ ] Mobile app for warehouse staff
- [ ] Real-time inventory updates (WebSockets)
- [ ] Movement approval workflows
- [ ] Bulk item transfers
- [ ] Inventory reservations
- [ ] Low stock alerts (parts-specific)

### Reporting Enhancements
- [ ] Custom reports builder
- [ ] Scheduled email reports
- [ ] PDF export
- [ ] Advanced filtering
- [ ] Saved searches
- [ ] Dashboard customization

### Integration Enhancements
- [ ] API webhooks for external systems
- [ ] Integration with shipping systems
- [ ] Integration with purchasing systems
- [ ] RFID tag support
- [ ] IoT sensor integration

---

## Documentation

### User Documentation
- [ ] User guide for inventory dashboard
- [ ] Admin guide for location management
- [ ] FAQ for common questions
- [ ] Video tutorials

### Developer Documentation
- [ ] API reference for inventory endpoints
- [ ] Two-table pattern explanation
- [ ] Integration guide for new modules (how to call inventory API)
- [ ] Database schema documentation
- [ ] Code examples for common tasks
- [ ] Transaction-based update patterns

### Operations Documentation
- [ ] Deployment guide
- [ ] Monitoring and alerting setup
- [ ] Backup and recovery procedures
- [ ] Performance tuning guide
- [ ] Troubleshooting guide

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on business needs
3. **Set up development environment** for inventory module
4. **Create Phase 1 tasks** in project management tool
5. **Begin implementation** starting with Phase 1

---

## Questions to Resolve

Before starting implementation, clarify:

1. **User Access**: Should all users see inventory, or only specific roles?
2. **Movement Permissions**: Who can manually create/edit movement records?
3. **Data Retention**: How long to keep movement history before archiving?
4. **Performance Targets**: What are acceptable page load times and query response times?
5. **Mobile Support**: Is mobile/tablet access required in Phase 1?
6. **Reporting Requirements**: What reports are most critical for initial release?
7. **Integration Timeline**: When will tools and parts modules be available?

---

**Document Status**: Ready for review and approval
**Next Review Date**: TBD
**Owner**: Development Team
