# Inventory Module - Database Design

**Date**: 2025-10-30 (Updated with architectural decision + critical fixes)
**Status**: Planning Phase - Ready for Implementation ✅

---

## 🎯 DEPLOYMENT CONTEXT

**Critical Information**: Current database contains **test data only** - can be cleared and recreated

**Implications**:
- ✅ No initial data migration required
- ✅ No backward compatibility needed
- ✅ Tables start empty, test data created through normal operations
- ✅ Trivial rollback (just drop tables)
- ✅ Migration file ready: `/backend/src/infrastructure/database/migrations/020-create-inventory-tables.sql` ✅

---

## ⚠️ CRITICAL FIXES APPLIED (2025-10-30)

**Issue**: UNIQUE constraint logic mismatch discovered during accuracy review

**Problem**: Original design used `INSERT...ON DUPLICATE KEY UPDATE` for all item types, but this doesn't work correctly with UNIQUE constraint `(item_type, item_identifier, current_location)` for gauges/tools.

**Root Cause**:
- Moving GAUGE-001 from B2 to A1 would INSERT new row instead of UPDATE
- Result: Gauge exists in BOTH locations (data corruption)

**Fix Applied**:
1. **Gauges/Tools**: Use simple UPDATE or INSERT logic (not INSERT...ON DUPLICATE KEY UPDATE)
2. **Parts**: Keep INSERT...ON DUPLICATE KEY UPDATE (works correctly for multiple locations)
3. **quantity field**: Changed to `INT NOT NULL DEFAULT 1` (always 1 for gauges/tools, variable for parts)
4. **Parts architecture**: Confirmed parts MUST use `inventory_current_locations` (not separate table)

See "How the Two Tables Work Together" section for correct implementation.

---

## Architectural Decision: Why Inventory Owns Movement History

**Context**: Gauge module already has `gauge_transactions` table tracking ALL lifecycle events (checkout, return, calibration, unseal, retire, QC checks).

**Decision**: Inventory module creates its own `inventory_movements` table for LOCATION TRACKING ONLY.

**Rationale**:
1. **Different Purpose**:
   - `gauge_transactions`: Complete lifecycle (calibrations, QC, maintenance, unsealing, retirement)
   - `inventory_movements`: Location changes only (where did it go?)

2. **Schema Mismatch**:
   - `gauge_transactions.location`: Single VARCHAR(255) field (not structured from/to)
   - `inventory_movements`: Structured from_location/to_location for tracking movement

3. **Parts Requirements**:
   - Parts need quantity tracking + order_number + job_number
   - Doesn't fit in gauge_transactions model

4. **Cross-Module Consistency**:
   - Uniform schema for gauges, tools, parts
   - Optimized for "where is everything?" queries

**Result**: Both tables coexist serving different purposes. When gauge module moves an item, it calls inventory API which updates BOTH tables atomically.

---

## Database Schema

**Inventory Module = Single Source of Truth for Locations**

Inventory module owns and manages all item locations. Other modules (gauge, tools, parts) query inventory API to get current location - they do NOT store location in their own tables.

### Architecture: Two-Table Pattern

**Why two tables?**
- `inventory_current_locations` → Fast lookups ("Where is GAUGE-001 NOW?")
- `inventory_movements` → Audit trail ("Where has it been?")

This is the industry standard pattern (NetSuite, SAP, Odoo) - accept controlled duplication for performance.

---

### Table 1: `inventory_current_locations` (NEW)

**Purpose**: Fast lookup of current item locations - single source of truth

**CRITICAL IMPLEMENTATION NOTE**:
The UNIQUE constraint `(item_type, item_identifier, current_location)` allows parts in multiple locations but requires different update logic for gauges/tools vs parts:
- **Gauges/Tools**: Use simple UPDATE (item can only be in ONE location)
- **Parts**: Use INSERT...ON DUPLICATE KEY UPDATE (item can be in MULTIPLE locations)
See "How the Two Tables Work Together" section below for correct implementation.

```sql
CREATE TABLE inventory_current_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Polymorphic reference to item
  item_type ENUM('gauge', 'tool', 'part', 'equipment', 'material') NOT NULL,
  item_identifier VARCHAR(100) NOT NULL COMMENT 'gauge_id, tool_id, part_number, etc.',

  -- Current location (THE source of truth)
  current_location VARCHAR(50) NOT NULL COMMENT 'Where item is RIGHT NOW',

  -- Quantity in this location
  -- Gauges/Tools: always 1 (unique items)
  -- Parts: actual quantity (can be any number)
  quantity INT NOT NULL DEFAULT 1 COMMENT 'Always 1 for gauges/tools, variable for parts',

  -- Audit metadata
  last_moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_moved_by INT NOT NULL,

  -- Allows: Gauges/tools in one location only, parts in multiple locations
  UNIQUE KEY unique_item_location (item_type, item_identifier, current_location),

  -- CRITICAL index for "What's in location A1?" queries
  INDEX idx_location (current_location),

  -- Fast lookup for specific items
  INDEX idx_item (item_type, item_identifier),

  -- Foreign keys
  FOREIGN KEY (current_location) REFERENCES storage_locations(location_code) ON DELETE RESTRICT,
  FOREIGN KEY (last_moved_by) REFERENCES users(id) ON DELETE RESTRICT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Current item locations - single source of truth for ALL items including parts';
```

**Query Performance:**
- "Where is GAUGE-001?" → UNIQUE key lookup = ~1ms
- "What's in location A1?" → Index scan on idx_location = instant
- Cross-module dashboard → One simple JOIN

---

### Table 2: `inventory_movements`

**Purpose**: Historical audit trail of all movements

**Design Philosophy**: Start simple, add fields/indexes as needed. Don't over-engineer upfront.

```sql
CREATE TABLE inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Movement metadata (simplified - start with 4 types, add more as needed)
  movement_type ENUM('transfer', 'created', 'deleted', 'other') NOT NULL,

  -- Polymorphic reference to item (simplified - removed item_module and item_description cache)
  item_type ENUM('gauge', 'tool', 'part', 'equipment', 'material') NOT NULL,
  item_identifier VARCHAR(100) NOT NULL COMMENT 'gauge_id, tool_id, part_number, etc.',

  -- Quantity moved (always 1 for gauges/tools, variable for parts)
  quantity INT NOT NULL DEFAULT 1 COMMENT 'Always 1 for gauges/tools, variable for parts',

  -- Parts-specific fields (reserved for future parts module)
  order_number VARCHAR(50) DEFAULT NULL COMMENT 'Sales order number (future)',
  job_number VARCHAR(50) DEFAULT NULL COMMENT 'Job number (future)',

  -- Location tracking
  from_location VARCHAR(50) DEFAULT NULL COMMENT 'Previous storage location code',
  to_location VARCHAR(50) DEFAULT NULL COMMENT 'New storage location code',

  -- Audit metadata
  moved_by INT NOT NULL COMMENT 'User ID who performed the movement',
  moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255) DEFAULT NULL COMMENT 'Reason for movement',
  notes TEXT DEFAULT NULL COMMENT 'Additional notes',

  -- Essential indexes only (add more if performance requires)
  INDEX idx_item_lookup (item_type, item_identifier),
  INDEX idx_location_to (to_location),
  INDEX idx_movement_date (moved_at),

  -- Foreign keys
  FOREIGN KEY (from_location) REFERENCES storage_locations(location_code) ON DELETE SET NULL,
  FOREIGN KEY (to_location) REFERENCES storage_locations(location_code) ON DELETE SET NULL,
  FOREIGN KEY (moved_by) REFERENCES users(id) ON DELETE RESTRICT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Inventory location movements - start simple, add as needed';
```

**Simplifications from Initial Design**:
- ❌ Removed `item_module` field (can derive from item_type: gauge→gauge, part→parts)
- ❌ Removed `item_description` cache (query source module on demand - simpler data model)
- ❌ Reduced movement types from 8 to 4 (add 'sold'/'consumed' when parts module exists)
- ❌ Removed 3 indexes (add `idx_location_from`, `idx_moved_by` only if queries are slow)

**When to Add Back**:
- `item_description` cache: If movement history queries become too slow
- `idx_location_from`, `idx_moved_by`: If filtering by these fields shows poor performance
- `sold`, `consumed` movement types: When parts module is implemented
- Additional indexes: Based on actual query patterns, not speculation

---

### How the Two Tables Work Together

**The Move Flow:**
```javascript
// API: POST /api/inventory/move
{
  itemType: 'gauge',
  itemId: 'GAUGE-001',
  toLocation: 'A1',
  movedBy: userId,
  reason: 'Returned from customer'
}

// STEP 1: Get current location (if exists)
const current = await db.query(`
  SELECT current_location
  FROM inventory_current_locations
  WHERE item_type = ? AND item_identifier = ?
`, ['gauge', 'GAUGE-001']);
// Returns: { current_location: 'B2' } or NULL if new item

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

// Transaction ensures both tables stay in sync
// If one fails, both rollback
```

**Consistency Guarantee**: Transaction ensures both tables always stay synchronized.

**Read Pattern - Gauge Module Needs Location:**
```javascript
// Gauge detail page needs to show location
GET /api/inventory/location/gauge/GAUGE-001

// Inventory API queries:
SELECT current_location, last_moved_at, last_moved_by
FROM inventory_current_locations
WHERE item_type = 'gauge' AND item_identifier = 'GAUGE-001';

// Returns: { currentLocation: 'A1', lastMovedAt: '2025-10-30', lastMovedBy: 'john.doe' }
// Gauge module displays this - doesn't store it
```

---

## Existing Tables (Referenced)

### `storage_locations` (Infrastructure)
**Already exists** - managed by infrastructure layer

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

### `gauges` (Gauge Module)
**Already exists** - managed by gauge module

**IMPORTANT**: Gauge module does NOT store location. Inventory module is the single source of truth.

```sql
-- Gauge table structure (simplified)
CREATE TABLE gauges (
  gauge_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  -- storage_location field NOT USED or REMOVED
  -- Gauge module queries inventory API for location
  -- Other gauge-specific fields...
);
```

**When gauge module needs location:**
```javascript
// Gauge detail page
const location = await fetch(`/api/inventory/location/gauge/${gaugeId}`);
// Display location from inventory API
```

### `tools` (Future Tools Module)
**To be created** - will be managed by tools module

**IMPORTANT**: Tools module does NOT store location. Inventory module is the single source of truth.

```sql
-- Expected structure (example)
CREATE TABLE tools (
  tool_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  -- NO storage_location field
  -- Tools module queries inventory API for location
  -- other tool-specific fields
);
```

### `parts` (Future Parts Module)
**To be created** - will be managed by parts module

**Key Difference**: Parts have quantities and can exist in multiple locations simultaneously (unlike gauges/tools which are unique items).

**IMPORTANT**: Parts module does NOT store location or quantity. Inventory module is the single source of truth for part quantities per location.

```sql
-- Expected structure (example)
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**For parts, inventory module stores quantities per location in `inventory_current_locations`:**
```sql
-- Part quantity tracking handled by inventory module
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

## Data Relationships

### Inventory Module Relationships

```
inventory_movements
├── References storage_locations (from_location, to_location)
├── References users (moved_by)
└── Polymorphic reference to items
    ├── gauges (when item_type = 'gauge')
    ├── tools (when item_type = 'tool')
    └── parts (when item_type = 'part')
```

### Storage Locations Relationships

```
storage_locations
├── Referenced by inventory_current_locations.current_location
├── Referenced by inventory_movements.from_location
└── Referenced by inventory_movements.to_location

Note: Gauges, tools, and parts do NOT have storage_location fields.
      Inventory module is the single source of truth for ALL item locations.
```

---

## Query Patterns

### 1. Get All Items in a Location (Cross-Module)

**Query inventory_current_locations (single source of truth), then fetch item details**

```sql
-- STEP 1: Get all items in location A1 from inventory
SELECT
  icl.item_type,
  icl.item_identifier,
  icl.current_location,
  icl.last_moved_at
FROM inventory_current_locations icl
WHERE icl.current_location = 'A1'
ORDER BY icl.item_type, icl.item_identifier;

-- STEP 2: Fetch item details from source modules (application layer)
-- For each gauge: SELECT name FROM gauges WHERE gauge_id = ?
-- For each tool: SELECT name FROM tools WHERE tool_id = ?
-- For each part: SELECT description FROM parts WHERE part_number = ?
```

**Alternative: Single query with LEFT JOINs** (if performance is critical):
```sql
-- Get items in location A1 with names in one query
SELECT
  icl.item_type,
  icl.item_identifier,
  icl.current_location,
  icl.last_moved_at,
  COALESCE(g.name, t.name, p.description) as item_name
FROM inventory_current_locations icl
LEFT JOIN gauges g ON icl.item_type = 'gauge' AND icl.item_identifier = g.gauge_id
LEFT JOIN tools t ON icl.item_type = 'tool' AND icl.item_identifier = t.tool_id
LEFT JOIN parts p ON icl.item_type = 'part' AND icl.item_identifier = p.part_number
WHERE icl.current_location = 'A1'
ORDER BY icl.item_type, icl.item_identifier;
```

### 2. Get Movement History for an Item

**Simplified query - fetch item details from source module as needed**

```sql
SELECT
  im.id,
  im.movement_type,
  im.item_type,
  im.item_identifier,
  im.from_location,
  im.to_location,
  im.quantity,           -- Quantity moved (parts only, NULL for gauges/tools)
  im.order_number,       -- Sales order (future: when movement_type = 'sold')
  im.job_number,         -- Job number (future: when movement_type = 'consumed')
  im.moved_at,
  im.reason,
  im.notes,
  u.username as moved_by_username
FROM inventory_movements im
JOIN users u ON im.moved_by = u.id
WHERE im.item_type = 'gauge'
  AND im.item_identifier = 'GAUGE-001'
ORDER BY im.moved_at DESC;

-- Then fetch item details from source module:
-- SELECT name FROM gauges WHERE gauge_id = 'GAUGE-001'
```

**Example for Parts**:
```sql
-- Get movement history for part number P/N-12345
SELECT
  im.id,
  im.movement_type,
  im.from_location,
  im.to_location,
  im.quantity,
  im.order_number,
  im.job_number,
  im.moved_at,
  im.reason,
  u.username as moved_by_username
FROM inventory_movements im
JOIN users u ON im.moved_by = u.id
WHERE im.item_type = 'part'
  AND im.item_identifier = 'P/N-12345'
ORDER BY im.moved_at DESC;

-- Results might show:
-- 2025-10-30 | transfer | A1 → B2 | 10 units | NULL | NULL
-- 2025-10-29 | sold     | A1 → NULL | 5 units | SO-4521 | NULL
-- 2025-10-28 | consumed | A1 → NULL | 3 units | NULL | J-8842
```

### 3. Get Movement History for a Location

```sql
SELECT
  im.id,
  im.item_type,
  im.item_identifier,
  im.movement_type,
  im.from_location,
  im.to_location,
  im.moved_at,
  u.username as moved_by_username
FROM inventory_movements im
JOIN users u ON im.moved_by = u.id
WHERE im.from_location = 'A1'
   OR im.to_location = 'A1'
ORDER BY im.moved_at DESC;

-- Fetch item names from source modules as needed
```

### 4. Get Location Utilization Statistics

**Query inventory_current_locations (single source of truth)**

```sql
-- Get item counts per location from inventory
SELECT
  sl.location_code,
  sl.description,
  sl.location_type,
  COALESCE(SUM(CASE WHEN icl.item_type = 'gauge' THEN 1 ELSE 0 END), 0) as gauges,
  COALESCE(SUM(CASE WHEN icl.item_type = 'tool' THEN 1 ELSE 0 END), 0) as tools,
  COALESCE(SUM(CASE WHEN icl.item_type = 'part' THEN 1 ELSE 0 END), 0) as parts,
  COUNT(icl.id) as total_items
FROM storage_locations sl
LEFT JOIN inventory_current_locations icl ON sl.location_code = icl.current_location
WHERE sl.is_active = TRUE
GROUP BY sl.location_code, sl.description, sl.location_type
ORDER BY total_items DESC, sl.location_code;
```

### 5. Get Recent Movements (Activity Feed)

```sql
SELECT
  im.id,
  im.item_type,
  im.item_identifier,
  im.movement_type,
  im.from_location,
  im.to_location,
  im.quantity,
  im.order_number,
  im.job_number,
  im.moved_at,
  im.reason,
  u.username as moved_by_username
FROM inventory_movements im
JOIN users u ON im.moved_by = u.id
ORDER BY im.moved_at DESC
LIMIT 50;

-- Fetch item names from source modules for display
```

### 6. Get Current Location for an Item

**Query inventory_current_locations for any item type**

```sql
-- Get current location for a gauge
SELECT
  icl.current_location,
  icl.last_moved_at,
  u.username as last_moved_by_username
FROM inventory_current_locations icl
JOIN users u ON icl.last_moved_by = u.id
WHERE icl.item_type = 'gauge'
  AND icl.item_identifier = 'GAUGE-001';

-- Get current location for a tool
SELECT current_location
FROM inventory_current_locations
WHERE item_type = 'tool'
  AND item_identifier = 'TOOL-042';
```

---

### Parts Module Queries (Future)

**Design Decision**: Parts MUST use inventory_current_locations - inventory module owns ALL locations.

**Confirmed Architecture**:
- Inventory module is single source of truth for ALL item locations
- Parts use `inventory_current_locations` with quantity field
- UNIQUE constraint `(item_type, item_identifier, current_location)` allows same part in multiple locations
- `parts` table stores part master data (description, min_quantity, cost, etc.)
- `inventory_current_locations` stores quantities per location

### 7. Get Total Quantity for a Part Across All Locations (Future)

**Parts-specific query using inventory_current_locations**

```sql
-- Get total quantity across all locations
SELECT
  icl.item_identifier as part_number,
  SUM(icl.quantity) as total_quantity,
  COUNT(DISTINCT icl.current_location) as location_count
FROM inventory_current_locations icl
WHERE icl.item_type = 'part'
  AND icl.item_identifier = 'P/N-12345'
GROUP BY icl.item_identifier;

-- Get quantity breakdown by location
SELECT
  icl.current_location,
  icl.quantity,
  icl.last_moved_at
FROM inventory_current_locations icl
WHERE icl.item_type = 'part'
  AND icl.item_identifier = 'P/N-12345'
ORDER BY icl.quantity DESC;
```

### 8. Get Parts with Low Stock Alerts (Future)

**Parts-specific query using inventory_current_locations + parts table**

```sql
-- Get parts below minimum quantity threshold
SELECT
  p.part_number,
  p.description,
  p.min_quantity,
  COALESCE(SUM(icl.quantity), 0) as current_quantity
FROM parts p
LEFT JOIN inventory_current_locations icl
  ON icl.item_type = 'part'
  AND icl.item_identifier = p.part_number
GROUP BY p.part_number, p.description, p.min_quantity
HAVING current_quantity < p.min_quantity
ORDER BY (p.min_quantity - current_quantity) DESC;
```

### 9. Get Item Count by Type

**Summary statistics across all item types**

```sql
-- Get total count of items in inventory by type
SELECT
  item_type,
  COUNT(*) as item_count,
  COUNT(DISTINCT current_location) as location_count
FROM inventory_current_locations
GROUP BY item_type
ORDER BY item_count DESC;

-- Example result:
-- gauge | 450 | 35
-- tool  | 120 | 28
-- part  | 890 | 42
```

---

## Migration Script

**File**: `/backend/src/infrastructure/database/migrations/020-create-inventory-tables.sql`

```sql
-- Migration: Create inventory module tables
-- Purpose: Track current locations + movement history
-- Date: 2025-10-30
-- Philosophy: Two-table pattern (industry standard)

-- =====================================================
-- TABLE 1: Current item locations (single source of truth)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_current_locations (
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

  -- CRITICAL for "What's in location A1?" queries
  INDEX idx_location (current_location),

  -- Fast lookup for specific items
  INDEX idx_item (item_type, item_identifier),

  -- Foreign keys
  FOREIGN KEY (current_location) REFERENCES storage_locations(location_code) ON DELETE RESTRICT,
  FOREIGN KEY (last_moved_by) REFERENCES users(id) ON DELETE RESTRICT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Current item locations - single source of truth for ALL items including parts';

-- =====================================================
-- TABLE 2: Movement history (audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Start with 4 basic movement types
  movement_type ENUM('transfer', 'created', 'deleted', 'other') NOT NULL,

  -- Polymorphic reference
  item_type ENUM('gauge', 'tool', 'part', 'equipment', 'material') NOT NULL,
  item_identifier VARCHAR(100) NOT NULL,

  -- Quantity moved (always 1 for gauges/tools, variable for parts)
  quantity INT NOT NULL DEFAULT 1 COMMENT 'Always 1 for gauges/tools, variable for parts',

  -- Parts-specific fields (reserved for future)
  order_number VARCHAR(50) DEFAULT NULL COMMENT 'Sales order (future)',
  job_number VARCHAR(50) DEFAULT NULL COMMENT 'Job number (future)',

  -- Location tracking
  -- Both nullable: from_location NULL = created, to_location NULL = deleted/sold/consumed
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

  -- Foreign keys
  FOREIGN KEY (from_location) REFERENCES storage_locations(location_code) ON DELETE SET NULL,
  FOREIGN KEY (to_location) REFERENCES storage_locations(location_code) ON DELETE SET NULL,
  FOREIGN KEY (moved_by) REFERENCES users(id) ON DELETE RESTRICT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Movement history - audit trail';
```

**Future Migrations** (add when needed):
```sql
-- 021-add-sold-consumed-types.sql (when parts module implemented)
ALTER TABLE inventory_movements
MODIFY COLUMN movement_type ENUM('transfer', 'created', 'deleted', 'sold', 'consumed', 'other');

-- 022-add-location-from-index.sql (if filtering by from_location is slow)
CREATE INDEX idx_location_from ON inventory_movements(from_location);

-- 023-add-moved-by-index.sql (if user activity queries are slow)
CREATE INDEX idx_moved_by ON inventory_movements(moved_by);

-- 024-add-item-description-cache.sql (if queries are too slow without it)
ALTER TABLE inventory_movements
ADD COLUMN item_description VARCHAR(255) DEFAULT NULL COMMENT 'Cached item name';
```

---

## Data Integrity Considerations

### Orphaned Movement Records
**Problem**: What if a gauge is deleted but movements exist?

**Solution**: Keep movement records for audit trail
- Movement records are historical data (immutable audit trail)
- Don't delete movements when item is deleted
- Fetch item name from source module for display (may show "Deleted Item")

### Orphaned Current Location Records
**Problem**: What if an item is deleted but current_location exists?

**Solution**: Clean up on item deletion
- When item is deleted, delete from `inventory_current_locations`
- OR record final movement with type 'deleted' and remove from current_locations
- Application code should handle this as part of item deletion workflow

### Deleted Storage Locations
**Problem**: What if a location is deleted but items reference it?

**Solution**: Soft delete storage locations
- Set `is_active = FALSE` instead of deleting
- `ON DELETE RESTRICT` foreign key prevents deletion if items exist in location
- Can still see historical movements to that location
- Prevents accidental deletion of in-use locations

### Referential Integrity
**Problem**: How to enforce item_identifier references?

**Solution**: Application-level validation (not foreign keys)
- Can't use foreign key for polymorphic relationship
- Validate item exists in application code before recording movement
- Accept that historical data might reference deleted items

### Sync Between Two Tables
**Problem**: How to ensure inventory_current_locations and inventory_movements stay in sync?

**Solution**: Transaction-based updates (see "How the Two Tables Work Together" section)
- ALWAYS update both tables in single transaction
- Check current location BEFORE recording movement
- If location unchanged, skip update (avoid no-op movements)
- Transaction rollback on failure ensures consistency

---

## Performance Considerations

### Indexes on inventory_current_locations
- **UNIQUE** on `(item_type, item_identifier, current_location)` - ensures gauges/tools can only be in one location, allows parts in multiple locations
- **INDEX** on `current_location` - CRITICAL for "What's in location A1?" queries
- **INDEX** on `(item_type, item_identifier)` - Fast lookup for specific items
- Additional indexes NOT needed for MVP (add if proven necessary)

### Indexes on inventory_movements
- **INDEX** on `(item_type, item_identifier)` - item history lookups
- **INDEX** on `moved_at` - recent activity queries
- Additional indexes to add when needed (see FUTURE-ENHANCEMENTS.md):
  - `from_location` - if filtering by source location is slow
  - `moved_by` - if user activity tracking queries are slow

### Query Performance
- **Current location lookup**: 1ms (index on current_location)
- **Movement history**: <10ms for typical items (<100 movements)
- **Location contents**: <50ms for typical locations (<200 items)

**Performance target**: 50x faster than querying latest from movements table

### Caching Strategy
- Cache location utilization counts (refresh every 5 minutes)
- Cache recent movements (last 50 items)
- Don't cache current_locations (always query fresh - already fast)

### Archive Strategy (Future)
- After 2 years, archive movements to `inventory_movements_archive` table
- Keep only recent movements in main table
- Maintain indexes on archive table for historical reporting

---

## Security Considerations

### Access Control
- Only authenticated users can view movements
- Only admins can manually create/edit movements
- Modules call inventory API (application code validates permissions)

### Audit Trail Immutability
- Movement records should never be deleted (audit trail)
- Updates should be rare (only to fix data entry errors)
- Consider adding `updated_at` and `updated_by` fields for tracking changes

### Sensitive Data
- Inventory tables only store item identifiers (gauge_id, tool_id, etc.)
- Never cache sensitive item details in inventory tables
- Always fetch full item details from source module when needed
- Source modules control access to sensitive data
