# Inventory Module - Final Requirements Document

**Date**: 2025-10-30 (Updated with critical fixes)
**Status**: Requirements Finalized - Ready for Implementation ✅
**Mockups Approved**: Yes
**Source**: Q&A Session + User Feedback

---

## 🎯 DEPLOYMENT CONTEXT

**Critical Information**: Current database contains **test data only** - can be cleared and recreated

**Implications**:
- ✅ No initial data migration required
- ✅ No backward compatibility needed
- ✅ Clean slate deployment approach
- ✅ Trivial rollback (just drop tables)
- ✅ Migration file ready: `/backend/src/infrastructure/database/migrations/020-create-inventory-tables.sql` ✅

---

## ⚠️ CRITICAL FIXES APPLIED (2025-10-30)

**Issue**: UNIQUE constraint logic mismatch discovered during accuracy review

**Fix**: Transaction logic updated to use simple UPDATE for gauges/tools (not INSERT...ON DUPLICATE KEY UPDATE)

**Parts Architecture Confirmed**: Parts MUST use `inventory_current_locations` (not separate `part_inventory` table)

See database-design.md for detailed explanation.

---

## Document Purpose

This document captures all finalized requirements from the Q&A session and approved HTML mockups. It serves as the definitive reference for implementation.

---

## Executive Summary

The Inventory Module is the **single source of truth for item locations** that:
- Manages current locations and movement history for ALL items (gauges, tools, parts)
- Provides cross-module inventory visibility in one unified view
- Handles both unique items (gauges/tools) and quantity-based items (parts)
- Uses two-table pattern (industry standard) for optimal performance

**Critical Architecture Decision**: Inventory module **OWNS all item location data**. Other modules (gauge, tools, parts) do NOT store locations - they call inventory API to move items and query locations.

### Two-Table Pattern

**inventory_current_locations** - Single source of truth for current locations
- Fast lookup: "Where is GAUGE-001 NOW?"
- UNIQUE constraint ensures one item = one location
- Performance: 1ms per lookup (50x faster than querying history)

**inventory_movements** - Immutable audit trail
- Complete movement history: "Where has it been?"
- Compliance and analysis
- Never updated, only inserted

### Why This Architecture?

**Single Source of Truth**: Inventory owns locations, modules own item data
- Gauge module owns calibration dates, QC status, unsealing records
- Tools module owns maintenance history, checkout status
- Parts module owns quantity, vendor, cost data
- Inventory module owns ONLY location data

**No Duplication**: Location field removed from gauge/tools/parts tables (or unused)

**Clean Integration**: Modules call inventory API, no events needed

---

## Item Type Requirements

### Unique Items (Gauges, Tools)

**Characteristics**:
- Each item has unique identifier (GAUGE-001, TOOL-015)
- One item exists in ONE location at a time
- Movement = physical relocation from Location A to Location B

**Display Requirements**:
- Show item ID only: `GAUGE-001`
- No quantity needed
- Color coding:
  - Gauges: Blue (#007bff)
  - Tools: Orange (#fd7e14)

**Database**:
- Location stored in `inventory_current_locations` table (single source of truth)
- Module tables do NOT store location (field removed or unused)
- Movement history recorded in `inventory_movements` table
- Modules call inventory API to move items and query locations

---

### Quantity-Based Items (Parts)

**Characteristics**:
- Identified by part number (P/N-12345)
- Same part number can exist in MULTIPLE locations simultaneously
- Each location has its own quantity
- Total quantity = sum across all locations

**Display Requirements**:
- Format: `P/N-12345 Qty 50, Total 170`
  - **Qty 50**: Quantity in THIS specific location
  - **Total 170**: Total quantity across ALL locations
- Color coding: Green (#28a745)

**Database**:
- Parts stored in `parts` table (part number, description)
- Quantities stored in `part_inventory` table (part_number, storage_location, quantity)
- One row per location-part combination

**Movement Types**:
1. **Transfer**: Move quantity between locations
   - Display: "10 units moved A1→B2"
   - Show remaining: "Remaining: A1: 40 units, B2: 30 units"
2. **Sold**: Remove quantity for customer order
   - Display: "5 units sold from A1, Order #SO-4521"
   - Show remaining: "Remaining: A1: 35 units"
   - **REQUIRED**: order_number field
3. **Consumed**: Remove quantity for internal job
   - Display: "3 units consumed from A1, Job #J-8842"
   - Show remaining: "Remaining: A1: 17 units"
   - **REQUIRED**: job_number field

---

## User Interface Requirements

### Landing Page (Inventory Dashboard)

**Reference Mockup**: `inventory-landing-page-v3.html` (approved 2025-10-30)

**Layout Structure**:
```
┌─────────────────────────────────────────┐
│ Inventory Dashboard                     │
├─────────────────────────────────────────┤
│ [Search Dropdown ▼] [Search Input]     │
├─────────────────────────────────────────┤
│ Location | Total | Items               │
├─────────────────────────────────────────┤
│ A1       | 8     | GAUGE-001           │
│          |       | GAUGE-002           │
│          |       | TOOL-015            │
│          |       | P/N-12345 Qty 50,   │
│          |       | Total 170           │
├─────────────────────────────────────────┤
│ B2       | 0     | -                   │
└─────────────────────────────────────────┘
```

**Requirements**:
1. **Single Column Items List**
   - All items in ONE column (not separate columns for each type)
   - Items color-coded by type (blue/orange/green)
   - Items ordered by type, then ID

2. **Search System**
   - Dropdown with 4 options:
     1. All Items (default)
     2. Item ID
     3. Item Name
     4. Location
   - Search input field
   - Real-time filtering

3. **Empty Locations**
   - Show "-" in items column when empty
   - Do NOT show "0" or empty string

4. **Stats Display**
   - Only show item type counts when >0
   - Example: If location has 3 gauges, 0 tools, 2 parts
     - Show: "3 Gauges, 2 Parts"
     - Don't show: "0 Tools"

5. **Clickable Items**
   - Click gauge → open gauge detail modal (from gauge module)
   - Click tool → open tool detail modal (from tools module)
   - Click part → open part detail modal (from parts module)
   - Click location code → navigate to location detail page

---

### Location Detail Page

**Reference Mockup**: `inventory-location-detail-updated.html` (approved 2025-10-30)

**Layout Structure**:
```
┌─────────────────────────────────────────┐
│ Location: A1 - Bin Storage              │
├─────────────────────────────────────────┤
│ Gauges (3)                              │
│ • GAUGE-001                             │
│ • GAUGE-002                             │
│ • GAUGE-003                             │
├─────────────────────────────────────────┤
│ Parts (2)                               │
│ • P/N-12345 Qty 50, Total 170           │
│ • P/N-67890 Qty 25, Total 100           │
├─────────────────────────────────────────┤
│ Movement History                        │
│ [Timeline...]                           │
└─────────────────────────────────────────┘
```

**Requirements**:
1. **Section Visibility**
   - Only show sections with items
   - If Gauges = 0, hide "Gauges" section entirely
   - If Tools = 0, hide "Tools" section entirely
   - If Parts = 0, hide "Parts" section entirely

2. **Parts Display**
   - Same format as landing page: "Qty X, Total Y"
   - Maintain consistency across all pages

3. **Clickable Items**
   - Same behavior as landing page
   - Click item → open source module modal

4. **Movement History**
   - Show recent movements for this location
   - Filter: movements with from_location OR to_location = this location

---

### Movement History Page

**Reference Mockup**: `inventory-movement-history-updated.html` (approved 2025-10-30)

**Timeline Display**:
```
┌─────────────────────────────────────────┐
│ Movement History                        │
├─────────────────────────────────────────┤
│ Oct 30, 2025 2:30 PM                    │
│ [SOLD] P/N-12345                        │
│ 5 units from A1                         │
│ Order #SO-4521                          │
│ Remaining: A1: 35 units                 │
│ By: john.doe                            │
├─────────────────────────────────────────┤
│ Oct 29, 2025 10:15 AM                   │
│ [TRANSFER] P/N-12345                    │
│ 10 units moved A1→B2                    │
│ Remaining: A1: 40 units, B2: 30 units   │
│ By: jane.smith                          │
├─────────────────────────────────────────┤
│ Oct 28, 2025 3:45 PM                    │
│ [CONSUMED] P/N-12345                    │
│ 3 units from A1                         │
│ Job #J-8842                             │
│ Remaining: A1: 17 units                 │
│ By: bob.jones                           │
└─────────────────────────────────────────┘
```

**Requirements**:
1. **Movement Type Badges**
   - Color-coded by type:
     - TRANSFER: Blue
     - SOLD: Red
     - CONSUMED: Yellow
     - CREATED: Green
     - DELETED: Gray

2. **Parts Movement Display** (CRITICAL):
   - **MUST** show quantity for all parts movements
   - **MUST** show remaining quantities after movement
   - **MUST** show order_number for "sold" movements
   - **MUST** show job_number for "consumed" movements

3. **Gauge/Tool Movements**:
   - Show item ID
   - Show from → to location
   - No quantity needed

4. **Filters**:
   - By item type (gauge, tool, part)
   - By location
   - By date range
   - By user who performed movement

5. **Pagination**:
   - Show 50 movements per page
   - Load more / infinite scroll

---

## Database Requirements

### Inventory Module Tables (Two-Table Pattern)

**Owner**: Inventory module
**Purpose**: Single source of truth for item locations + movement audit trail
**Philosophy**: Start simple, add fields/indexes as needed based on actual requirements

### Table 1: `inventory_current_locations`

**Purpose**: Fast lookup for current item locations ("Where is it NOW?")

**MVP Schema**:
```sql
CREATE TABLE inventory_current_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Polymorphic reference to item
  item_type ENUM('gauge', 'tool', 'part', 'equipment', 'material') NOT NULL,
  item_identifier VARCHAR(100) NOT NULL,

  -- Current location (THE source of truth)
  current_location VARCHAR(50) NOT NULL,

  -- Quantity in this location
  -- Gauges/Tools: always 1 (unique items)
  -- Parts: actual quantity (can be any number)
  quantity INT NOT NULL DEFAULT 1 COMMENT 'Always 1 for gauges/tools, variable for parts',

  -- Audit metadata
  last_moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_moved_by INT NOT NULL,

  -- Allows: Gauges/tools in one location only, parts in multiple locations
  UNIQUE KEY unique_item_location (item_type, item_identifier, current_location),

  -- CRITICAL INDEX for "What's in location A1?" queries
  INDEX idx_location (current_location),

  -- Fast lookup for specific items
  INDEX idx_item (item_type, item_identifier),

  -- Foreign keys
  FOREIGN KEY (current_location) REFERENCES storage_locations(location_code) ON DELETE RESTRICT,
  FOREIGN KEY (last_moved_by) REFERENCES users(id) ON DELETE RESTRICT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Current item locations - single source of truth for ALL items including parts';
```

**Performance**: 1ms per lookup (50x faster than querying movements table)

### Table 2: `inventory_movements`

**Purpose**: Immutable audit trail of all location changes ("Where has it been?")

**MVP Schema**:
```sql
CREATE TABLE inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Movement metadata (4 types for MVP)
  movement_type ENUM('transfer', 'created', 'deleted', 'other') NOT NULL,

  -- Polymorphic item reference
  item_type ENUM('gauge', 'tool', 'part', 'equipment', 'material') NOT NULL,
  item_identifier VARCHAR(100) NOT NULL,

  -- Quantity moved (always 1 for gauges/tools, variable for parts)
  quantity INT NOT NULL DEFAULT 1 COMMENT 'Always 1 for gauges/tools, variable for parts',

  -- Parts-specific fields (reserved for future parts module)
  order_number VARCHAR(50) DEFAULT NULL COMMENT 'Sales order number (future)',
  job_number VARCHAR(50) DEFAULT NULL COMMENT 'Job number (future)',

  -- Location tracking
  from_location VARCHAR(50) DEFAULT NULL,
  to_location VARCHAR(50) DEFAULT NULL,

  -- Audit metadata
  moved_by INT NOT NULL,
  moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255) DEFAULT NULL,
  notes TEXT DEFAULT NULL,

  -- Essential indexes only
  INDEX idx_item_lookup (item_type, item_identifier),
  INDEX idx_movement_date (moved_at),
  -- NOTE: Removed idx_location_to (optimize for history, not current state)

  FOREIGN KEY (from_location) REFERENCES storage_locations(location_code) ON DELETE SET NULL,
  FOREIGN KEY (to_location) REFERENCES storage_locations(location_code) ON DELETE SET NULL,
  FOREIGN KEY (moved_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Inventory movement history - immutable audit trail';
```

### How the Two Tables Work Together

**Transaction-Based Updates** (atomic, consistent):
```javascript
// STEP 1: Get current location (if exists)
const current = await db.query(`
  SELECT current_location
  FROM inventory_current_locations
  WHERE item_type = ? AND item_identifier = ?
`, ['gauge', 'GAUGE-001']);

// STEP 2: Check if location actually changed
if (current?.current_location === 'A1') {
  return { message: 'GAUGE-001 is already in location A1' };
}

// STEP 3: Update both tables atomically
await db.transaction(async (trx) => {
  // 3a. Update/Insert current location (THE source of truth)
  // For GAUGES/TOOLS (unique items): Use simple UPDATE or INSERT
  if (current.length > 0) {
    // UPDATE existing row (gauge already in system)
    await trx.query(`
      UPDATE inventory_current_locations
      SET current_location = ?,
          last_moved_at = NOW(),
          last_moved_by = ?
      WHERE item_type = ? AND item_identifier = ?
    `, ['A1', userId, 'gauge', 'GAUGE-001']);
  } else {
    // INSERT new row (first time tracking this gauge)
    await trx.query(`
      INSERT INTO inventory_current_locations (
        item_type, item_identifier, current_location, quantity, last_moved_by, last_moved_at
      ) VALUES (?, ?, ?, 1, ?, NOW())
    `, ['gauge', 'GAUGE-001', 'A1', userId]);
  }

  // For PARTS (quantity-based items): Use INSERT...ON DUPLICATE KEY UPDATE
  // This works for parts because UNIQUE constraint allows same part in multiple locations
  // await trx.query(`
  //   INSERT INTO inventory_current_locations (
  //     item_type, item_identifier, current_location, quantity, last_moved_by, last_moved_at
  //   ) VALUES (?, ?, ?, ?, ?, NOW())
  //   ON DUPLICATE KEY UPDATE
  //     quantity = quantity + ?,
  //     last_moved_at = NOW(),
  //     last_moved_by = ?
  // `, ['part', 'P/N-12345', 'A1', 10, userId, 10, userId]);

  // 3b. Record movement in history (audit trail)
  await trx.query(`
    INSERT INTO inventory_movements (
      movement_type, item_type, item_identifier,
      from_location, to_location,
      moved_at, moved_by, reason
    ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
  `, ['transfer', 'gauge', 'GAUGE-001', current[0]?.current_location || null, 'A1', userId, 'Returned from customer']);
});
```

**Simplifications from Initial Design**:
- ❌ Removed `item_module` field (derive from item_type)
- ❌ Removed `item_description` cache (query source module on demand)
- ❌ Reduced movement types from 8 to 4 (add sold/consumed when parts module exists)
- ❌ Removed 3 indexes (add only if queries prove slow)

**Future Additions** (add when proven necessary):
- `sold`, `consumed` movement types → when parts module implemented
- `item_description` cache → if movement queries too slow
- `idx_location_from`, `idx_moved_by` → if filtering performance requires

### Module-Owned History Tables (For Reference)

#### Gauge Module: `gauge_transactions` (EXISTS)
**Owner**: Gauge module
**Purpose**: Complete gauge lifecycle tracking (calibration, unseal, QC, retirement)

**Current Schema** (from live database):
```sql
gauge_transactions (
  id INT PRIMARY KEY,
  gauge_id INT,
  user_id INT,
  action ENUM('checkout','return','transfer_out','transfer_in','calibrate','unseal','retire','qc_pass','qc_fail'),
  related_user_id INT,
  location VARCHAR(255),  -- Descriptive only, NOT source of truth
  notes TEXT,
  created_at TIMESTAMP
)
```

**Note**: `gauge_transactions` tracks gauge-specific lifecycle events. The `location` field is descriptive only. Inventory module is the single source of truth for current and historical locations.

#### Parts Module: `part_movements` (FUTURE)
**Owner**: Parts module
**Purpose**: Parts-specific lifecycle and business logic

```sql
-- Expected structure (owned by parts module)
CREATE TABLE part_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  part_number VARCHAR(50) NOT NULL,
  movement_type ENUM('transfer', 'sold', 'consumed', 'received', 'adjusted', 'damaged'),
  quantity INT NOT NULL,
  order_number VARCHAR(50) DEFAULT NULL,
  job_number VARCHAR(50) DEFAULT NULL,
  from_location VARCHAR(50),
  to_location VARCHAR(50),
  cost DECIMAL(10,2) DEFAULT NULL,
  moved_by INT NOT NULL,
  moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255),
  notes TEXT,
  FOREIGN KEY (part_number) REFERENCES parts(part_number),
  FOREIGN KEY (moved_by) REFERENCES core_users(id)
);
```

**Note**: Parts module tracks full business context (cost, vendor, etc.). Location changes are ALSO recorded in `inventory_movements`.

#### Tools Module: `tool_movements` (FUTURE)
**Owner**: Tools module
**Purpose**: Tool-specific lifecycle tracking

```sql
-- Expected structure (owned by tools module)
CREATE TABLE tool_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tool_id VARCHAR(50) NOT NULL,
  movement_type ENUM('transfer', 'checked_out', 'checked_in', 'maintenance', 'retired'),
  from_location VARCHAR(50),
  to_location VARCHAR(50),
  moved_by INT NOT NULL,
  moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255),
  notes TEXT,
  FOREIGN KEY (tool_id) REFERENCES tools(tool_id),
  FOREIGN KEY (moved_by) REFERENCES core_users(id)
);
```

**Note**: Tool lifecycle events stay in `tool_movements`. Location changes are ALSO recorded in `inventory_movements`.

### `parts` Table (Future Parts Module)

**IMPORTANT**: Parts module does NOT store location or quantity. Inventory module is the single source of truth for part quantities per location.

```sql
-- Parts master data (owned by parts module)
CREATE TABLE parts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  part_number VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  min_quantity INT DEFAULT NULL,
  unit_cost DECIMAL(10,2) DEFAULT NULL,
  vendor_id INT DEFAULT NULL,
  -- NO storage_location field
  -- NO quantity field
  -- Parts module queries inventory API for quantities and locations
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_part_number (part_number)
);
```

**Parts quantity tracking** (handled by inventory module):
```sql
-- Multiple records for same part in different locations
-- quantity field already exists in inventory_current_locations table

INSERT INTO inventory_current_locations (
  item_type, item_identifier, current_location, quantity, last_moved_by
) VALUES
  ('part', 'P/N-12345', 'A1', 50, 1),
  ('part', 'P/N-12345', 'B2', 30, 1),
  ('part', 'P/N-12345', 'C3', 90, 1);

-- Total quantity = SUM(quantity) WHERE item_identifier = 'P/N-12345' = 170 units
```

---

## API-Based Architecture

### Integration Pattern: Modules Call Inventory API

**Critical Design**: Inventory module is the single source of truth for locations. Other modules do NOT store locations - they call inventory API.

### Module Integration Flow

**When Gauge Module Needs to Move an Item**:
```
Gauge Service                     Inventory Module
─────────────                    ─────────────────
1. User returns gauge         →  (waiting)
2. Process gauge return logic
3. Call Inventory API:
   POST /api/inventory/move
   {
     itemType: 'gauge',
     itemIdentifier: 'GAUGE-001',
     toLocation: 'A1',
     movedBy: userId,
     reason: 'Returned from customer'
   }
                              →  4. Receive API call
                                 5. Get current location from inventory_current_locations
                                 6. Update both tables atomically:
                                    - UPDATE inventory_current_locations
                                    - INSERT inventory_movements
                                 7. Return success
                              ←  8. Response: { success: true, current_location: 'A1' }
9. Continue with gauge logic
```

**When Gauge Module Needs to Display Location**:
```
Gauge Detail Page
  ↓
  Calls Inventory API: GET /api/inventory/location/gauge/GAUGE-001
  ↓
  Inventory returns: { current_location: 'A1', last_moved_at: '2025-10-30T14:00:00Z' }
  ↓
  Gauge page displays: "Current Location: A1"
```

### API Specifications

#### MVP API Endpoints

**POST /api/inventory/move**
Move an item to a new location (updates both tables atomically)

Request:
```javascript
{
  itemType: 'gauge',           // Required: 'gauge' | 'tool' | 'part'
  itemIdentifier: 'GAUGE-001', // Required: item ID
  toLocation: 'A1',            // Required: destination location code
  movedBy: 1,                  // Required: user ID
  reason: 'Returned from customer', // Optional
  notes: 'In good condition'   // Optional
}
```

Response:
```javascript
{
  success: true,
  current_location: 'A1',
  previous_location: 'B2',     // null if newly created
  movement_id: 123
}
```

**GET /api/inventory/location/:itemType/:itemIdentifier**
Get current location for an item

Response:
```javascript
{
  item_type: 'gauge',
  item_identifier: 'GAUGE-001',
  current_location: 'A1',
  last_moved_at: '2025-10-30T14:00:00Z',
  last_moved_by: 1
}
```

**DELETE /api/inventory/location/:itemType/:itemIdentifier**
Remove item from inventory (when item is deleted)

Response:
```javascript
{
  success: true,
  message: 'GAUGE-001 removed from inventory'
}
```

#### Future API Endpoints (Parts Module)

**POST /api/inventory/move** (with quantity for parts)

Request:
```javascript
{
  itemType: 'part',
  itemIdentifier: 'P/N-12345',
  quantity: 10,                    // REQUIRED for parts
  fromLocation: 'A1',              // For parts, specify source
  toLocation: 'B2',
  movedBy: 1,
  reason: 'Restocking'
}
```

**POST /api/inventory/move** (parts sold with order number)

Request:
```javascript
{
  itemType: 'part',
  itemIdentifier: 'P/N-12345',
  quantity: 5,                     // REQUIRED for parts
  orderNumber: 'SO-4521',          // REQUIRED for sold
  fromLocation: 'A1',
  toLocation: null,                // Sold = leaves inventory
  movedBy: 1,
  movementType: 'sold',            // Add this type when parts module exists
  reason: 'Customer order fulfillment'
}
```

**POST /api/inventory/move** (parts consumed with job number)

Request:
```javascript
{
  itemType: 'part',
  itemIdentifier: 'P/N-12345',
  quantity: 3,                     // REQUIRED for parts
  jobNumber: 'J-8842',             // REQUIRED for consumed
  fromLocation: 'A1',
  toLocation: null,                // Consumed = leaves inventory
  movedBy: 1,
  movementType: 'consumed',        // Add this type when parts module exists
  reason: 'Job material usage'
}
```

---

## API Endpoint Requirements

### GET /api/inventory/reports/overview
**Purpose**: Landing page data

**Response**:
```json
{
  "locations": [
    {
      "location_code": "A1",
      "description": "Bin Storage",
      "total_items": 8,
      "items": [
        {
          "id": "GAUGE-001",
          "name": "Digital Caliper",
          "type": "gauge",
          "type_display": "Gauge"
        },
        {
          "id": "P/N-12345",
          "name": "Widget Assembly",
          "type": "part",
          "type_display": "Part",
          "quantity": 50,
          "total_quantity": 170
        }
      ]
    }
  ]
}
```

### GET /api/inventory/reports/by-location/:locationCode
**Purpose**: Location detail page data

**Response**:
```json
{
  "location": {
    "location_code": "A1",
    "description": "Bin Storage",
    "location_type": "bin"
  },
  "items": {
    "gauges": [
      { "gauge_id": "GAUGE-001", "name": "Digital Caliper" }
    ],
    "tools": [],
    "parts": [
      {
        "part_number": "P/N-12345",
        "description": "Widget Assembly",
        "quantity": 50,
        "total_quantity": 170
      }
    ]
  },
  "movement_history": [
    {
      "id": 123,
      "movement_type": "transfer",
      "item_type": "gauge",
      "item_identifier": "GAUGE-001",
      "quantity": null,
      "order_number": null,
      "job_number": null,
      "from_location": "A1",
      "to_location": "B2",
      "moved_at": "2025-10-30T14:30:00Z",
      "moved_by": "john.doe"
    }
  ]
}
```

### GET /api/inventory/movements
**Purpose**: Movement history page

**Query Parameters**:
- `item_type`: Filter by gauge, tool, part
- `location`: Filter by location code
- `from_date`: Start date
- `to_date`: End date
- `user_id`: Filter by user
- `page`: Pagination (default: 1)
- `limit`: Items per page (default: 50)

**Response** (simplified - fetch item names from source modules as needed):
```json
{
  "movements": [
    {
      "id": 123,
      "movement_type": "transfer",
      "item_type": "gauge",
      "item_identifier": "GAUGE-001",
      "quantity": null,
      "order_number": null,
      "job_number": null,
      "from_location": "A1",
      "to_location": "B2",
      "moved_at": "2025-10-30T14:30:00Z",
      "moved_by": "john.doe",
      "reason": "Restocking"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}

// NOTE: Frontend will fetch item name from gauge module: GET /api/gauges/GAUGE-001
// NOTE: 'sold', 'consumed' movement types added when parts module implemented
```

---

## Non-Functional Requirements

### Performance
- **Landing page load**: <2 seconds for 100 locations
- **Location detail page load**: <1 second
- **Movement history load**: <1.5 seconds for 50 items
- **Search response**: <500ms

### Scalability
- Support 1000+ storage locations
- Support 10,000+ items across all modules
- Support 100,000+ movement records
- Pagination for all large datasets

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design (desktop, tablet, mobile)

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios

---

## User Workflows

### Workflow 1: Find Item Location
1. User navigates to inventory dashboard
2. User selects "Item ID" from search dropdown
3. User types "GAUGE-001"
4. System filters locations to show only those with GAUGE-001
5. User sees: "Location A1 contains GAUGE-001"
6. User clicks location code → navigates to detail page

### Workflow 2: View Part Quantities
1. User navigates to inventory dashboard
2. User searches for "P/N-12345"
3. System shows all locations with this part:
   - A1: Qty 50, Total 170
   - B2: Qty 30, Total 170
   - C3: Qty 90, Total 170
4. User understands total quantity = 170 across all locations

### Workflow 3: Audit Part Movement
1. User navigates to movement history
2. User filters by item type "Part" and item "P/N-12345"
3. System shows timeline:
   - Oct 30: 5 units sold, Order #SO-4521
   - Oct 29: 10 units transferred A1→B2
   - Oct 28: 3 units consumed, Job #J-8842
4. User sees complete audit trail with order/job numbers

---

## Testing Requirements

### Unit Tests
- Item display formatting (parts quantity format)
- Section visibility logic (hide empty sections)
- Color coding CSS classes
- Search filtering logic

### Integration Tests
- Cross-module queries (gauges + tools + parts)
- Parts quantity aggregation across locations
- Movement history with order/job numbers
- API endpoint responses

### E2E Tests (Playwright)
- Search workflow (all 4 search types)
- Click item → opens correct modal
- Empty location shows "-"
- Parts show "Qty X, Total Y"
- Movement history displays correctly

### Performance Tests
- 100 locations load time
- 1000+ items query performance
- 10,000+ movements pagination

---

## Success Criteria

### Phase 1: Foundation
- ✅ Database schema supports parts quantity tracking
- ✅ Movement types include "sold" and "consumed"
- ✅ order_number and job_number fields exist

### Phase 2: Gauge Integration
- ✅ Gauge movements recorded automatically
- ✅ No breaking changes to gauge module

### Phase 3: Frontend Dashboard
- ✅ Single-column items list with color coding
- ✅ Search dropdown with 4 options
- ✅ Parts show "Qty X, Total Y" format
- ✅ Empty locations show "-"
- ✅ Items are clickable

### Phase 4: Movement History
- ✅ Parts movements show quantity
- ✅ Sold movements show order number
- ✅ Consumed movements show job number
- ✅ Remaining quantities displayed

---

## Open Questions & Decisions

### Resolved
- ✅ Parts have quantities (not unique like gauges)
- ✅ Same part can exist in multiple locations
- ✅ Parts show "Qty X, Total Y" format
- ✅ Single column items list (not 3 columns)
- ✅ Empty locations show "-" (not "0")
- ✅ Sections hide when empty (not show "0 items")
- ✅ Search has 4 options (All, ID, Name, Location)

### Pending
- ❓ User access control (who can view inventory?)
- ❓ Movement permissions (who can manually create movements?)
- ❓ Data retention period for movements
- ❓ Mobile app requirements
- ❓ Barcode/QR code integration

---

## Implementation Priority

**Philosophy**: Start simple, add as needed. Build MVP first, add advanced features based on actual usage.

### Must Have (MVP)
1. **Simplified database schema** (3 indexes, 4 movement types)
2. Landing page with single-column items list
3. Basic location detail page
4. Movement history with pagination
5. Search functionality (4 options: All, ID, Name, Location)
6. Simple location CRUD (create, edit, delete)

### Should Have (Post-MVP - Add When Needed)
1. Parts display "Qty X, Total Y" (when parts module exists)
2. `sold`, `consumed` movement types (when parts module exists)
3. Advanced filtering (when users request it)
4. Export to CSV (when reporting needs require)
5. Additional database indexes (when performance proves necessary)
6. `item_description` cache (when queries prove slow)

### Could Have (Future - Based on Demand)
1. Analytics dashboard (utilization, trends)
2. Bulk location range generator
3. Drag-to-reorder locations
4. Low stock alerts (parts-specific)
5. Barcode scanning
6. Mobile app
7. Real-time updates (WebSockets)
8. Custom reports builder

---

## Related Documents

- **Database Design**: `database-design.md` - Complete schema and query patterns
- **Implementation Plan**: `implementation-plan.md` - Phase-by-phase development plan
- **Module Overview**: `module-overview.md` - Architecture and integration points
- **Mockups**:
  - `inventory-landing-page-v3.html` (APPROVED)
  - `inventory-location-detail-updated.html` (APPROVED)
  - `inventory-movement-history-updated.html` (APPROVED)

---

**Document Status**: ✅ Complete
**Last Updated**: 2025-10-30
**Approved By**: User (via Q&A session and mockup reviews)
**Ready for Implementation**: Yes
