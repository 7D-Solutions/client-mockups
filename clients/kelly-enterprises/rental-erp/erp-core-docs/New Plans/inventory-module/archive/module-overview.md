# Inventory Module - Overview

**Date**: 2025-10-29
**Status**: Planning Phase
**Purpose**: Cross-module inventory visibility and movement tracking

---

## What is the Inventory Module?

A **reporting and visibility layer** that shows inventory across all modules (gauges, tools, parts, equipment) without owning the items themselves.

### What It DOES:
- ✅ Show cross-module inventory view ("What's in location A1?")
- ✅ Track item movements (audit trail)
- ✅ Track parts quantities across multiple locations
- ✅ Show order numbers (sales) and job numbers (consumption) for parts
- ✅ Provide location utilization analytics
- ✅ Show movement history for any item
- ✅ Generate cross-module inventory reports
- ✅ Manage storage location master data (admin UI)

### What It DOES NOT:
- ❌ Create/delete gauges, tools, or parts (modules own their items)
- ❌ Change item quantities (modules handle their own quantities)
- ❌ Manage item-specific attributes (calibration dates, checkout status, etc.)
- ❌ Replace module-specific inventory operations
- ❌ Process sales orders or job tickets (pulls data from other modules)

---

## Item Types & Tracking Differences

### Unique Items (Gauges, Tools)
**Characteristics**:
- Each item has a unique identifier (GAUGE-001, TOOL-015)
- One item can only be in ONE location at a time
- Movement = item physically moves from Location A to Location B

**Display Format**:
- `GAUGE-001` (no quantity needed)
- `TOOL-015` (no quantity needed)

### Quantity-Based Items (Parts)
**Characteristics**:
- Items identified by part number (P/N-12345)
- Same part number can exist in MULTIPLE locations simultaneously
- Each location tracks its own quantity
- Movement = quantity changes (transfer, sold, consumed)

**Display Format**:
- `P/N-12345 Qty 50, Total 170`
  - "Qty 50" = quantity in THIS location
  - "Total 170" = total quantity across ALL locations

**Movement Types**:
- **Transfer**: Quantity moves between locations
  - Example: "10 units moved A1→B2"
- **Sold**: Quantity leaves inventory with order number
  - Example: "5 units sold from A1, Order #SO-4521"
- **Consumed**: Quantity used for job with job number
  - Example: "3 units consumed from A1, Job #J-8842"

---

## Architecture Principles

### 1. Inventory Module = Reporting Layer
The inventory module is a **read-only view** of items across all modules. It doesn't own items.

**Example:**
- Gauge module creates/deletes gauges
- Tools module creates/deletes tools
- Inventory module shows them all together

### 2. Event-Driven Movement Tracking
Modules emit events when items move, inventory module listens and records.

**Flow:**
```
Gauge module updates location
  → Emits "inventory.item.moved" event
  → Inventory module records to inventory_movements table
```

### 3. Query Federation (No Central Inventory Table)
Inventory module queries each module's table dynamically when needed.

**Example - "What's in location A1?":**
```sql
-- Query gauges table
SELECT gauge_id, name, 'gauge' as type FROM gauges WHERE storage_location = 'A1'

-- Query tools table
SELECT tool_id, name, 'tool' as type FROM tools WHERE storage_location = 'A1'

-- Query parts table
SELECT part_number, description, 'part' as type FROM parts WHERE storage_location = 'A1'

-- Combine results
```

### 4. Loose Coupling
Modules remain autonomous. Inventory module doesn't need to know module-specific business logic.

---

## Module Responsibilities

### Inventory Module Owns:
1. **Movement Tracking** (`inventory_movements` table)
2. **Cross-Module Reporting** (queries across all modules)
3. **Storage Location Admin UI** (CRUD for storage_locations)
4. **Analytics & Dashboards** (utilization, trends, movement history)

### Individual Modules (Gauge, Tools, Parts) Own:
1. **Item Data** (their respective tables)
2. **Item Lifecycle** (create, update, delete items)
3. **Module-Specific Logic** (calibration, checkout, suppliers, etc.)
4. **Event Emission** (emit events when items move)

### Infrastructure Layer Owns:
1. **Storage Locations Service** (centralized location master data)
2. **Storage Locations API** (`/api/storage-locations`)
3. **StorageLocationSelect Component** (shared UI component)

---

## User Personas

### End Users (Technicians, Warehouse Staff)
- View inventory across all modules
- See what's in a specific location
- Check movement history for an item
- Generate inventory reports

### Administrators
- Manage storage locations (add Floor 1-50, Bin A1-Z99)
- View utilization analytics
- Audit item movements
- Configure location types

### Module Users (Existing)
- Continue using gauge/tools/parts modules as normal
- Movements automatically tracked in background

---

## Key Features

### 1. Cross-Module Dashboard
**Route**: `/inventory/dashboard`

Shows overview:
- Total items in inventory (gauges + tools + parts)
- Items by location
- Items by module
- Recent movements

### 2. Location Detail Page
**Route**: `/inventory/locations/:locationCode`

Shows what's in a specific location:
- All gauges in location A1
- All tools in location A1
- All parts in location A1
- Movement history for this location

### 3. Movement History
**Route**: `/inventory/movements`

Shows audit trail:
- When items were moved
- Who moved them
- From where to where
- Reason for movement

### 4. Storage Location Management
**Route**: `/inventory/locations/manage`

Admin UI for managing locations:
- Create single location
- Bulk create (Floor 1-50)
- Edit/delete locations
- View usage statistics

### 5. Analytics & Reports
**Route**: `/inventory/analytics`

Shows insights:
- Most-used locations
- Empty locations
- Movement trends
- Utilization heatmap

---

## Integration Points

### With Gauge Module
- Gauge module emits events when gauge location changes
- Inventory module tracks gauge movements
- Can view all gauges from inventory dashboard

### With Future Tools Module
- Tools module emits events when tool location changes
- Inventory module tracks tool movements
- Can view all tools from inventory dashboard

### With Future Parts Module
**Key Difference**: Parts are quantity-based, not unique items

**Integration Requirements**:
- Parts module creates `part_inventory` table with quantities per location
- Parts module emits events with quantity information
- Parts module includes order_number for sales events
- Parts module includes job_number for consumption events
- Inventory module aggregates quantities across all locations
- Inventory module displays "Qty X, Total Y" format

**Event Examples**:
```javascript
// Part transfer
eventBus.emit('inventory.item.moved', {
  itemType: 'part',
  itemIdentifier: 'P/N-12345',
  quantity: 10,
  fromLocation: 'A1',
  toLocation: 'B2'
});

// Part sold
eventBus.emit('inventory.item.moved', {
  itemType: 'part',
  itemIdentifier: 'P/N-12345',
  quantity: 5,
  orderNumber: 'SO-4521',
  fromLocation: 'A1',
  toLocation: null  // Leaves inventory
});

// Part consumed
eventBus.emit('inventory.item.moved', {
  itemType: 'part',
  itemIdentifier: 'P/N-12345',
  quantity: 3,
  jobNumber: 'J-8842',
  fromLocation: 'A1',
  toLocation: null  // Leaves inventory
});
```

### With Infrastructure Layer
- Uses `StorageLocationSelect` component
- Reads from `storage_locations` table
- Provides admin UI for managing locations

---

## Technology Stack

### Backend
- **Framework**: Node.js + Express
- **Database**: MySQL (existing `fai_db_sandbox`)
- **Patterns**: Repository pattern, service layer, event-driven

### Frontend
- **Framework**: React + TypeScript
- **State Management**: Zustand
- **UI Components**: Infrastructure components (Button, Modal, FormInput, etc.)
- **Routing**: React Router

### Database Tables
- `inventory_movements` (new - owned by inventory module)
- `storage_locations` (existing - owned by infrastructure)
- `gauges` (existing - owned by gauge module)
- `tools` (future - owned by tools module)
- `parts` (future - owned by parts module)

---

## Success Metrics

### For Users
- Can find any item's location in <5 seconds
- Can see full movement history for any item
- Can view cross-module inventory in one place

### For Administrators
- Can add 50 locations in <2 minutes (via range generator)
- Can see location utilization at a glance
- Can audit who moved what and when

### For Developers
- Modules remain autonomous (loose coupling)
- No code duplication across modules
- Easy to add new inventory types (equipment, materials, etc.)

---

## Next Steps

See detailed planning documents:
1. `database-design.md` - Database schema and relationships
2. `backend-structure.md` - Backend folder structure and APIs
3. `frontend-structure.md` - Frontend components and pages
4. `implementation-plan.md` - Step-by-step implementation guide
