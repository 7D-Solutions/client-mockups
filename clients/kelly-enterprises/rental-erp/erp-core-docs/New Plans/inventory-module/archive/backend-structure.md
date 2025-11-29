# Inventory Module - Backend Structure

**Date**: 2025-10-29
**Status**: Planning Phase

---

## Folder Structure

```
/backend/src/modules/inventory/
├── controllers/
│   ├── inventoryReportController.js      # Cross-module inventory queries
│   ├── movementController.js             # Movement history endpoints
│   └── locationAdminController.js        # Storage location admin UI endpoints
├── services/
│   ├── InventoryReportingService.js      # Business logic for cross-module queries
│   ├── MovementTrackingService.js        # Movement recording and history
│   └── LocationUtilizationService.js     # Location analytics and statistics
├── repositories/
│   └── MovementRepository.js             # Database operations for inventory_movements
├── routes/
│   ├── index.js                          # Main router
│   ├── inventory-reports.routes.js       # GET endpoints for inventory views
│   ├── movements.routes.js               # GET endpoints for movement history
│   └── location-admin.routes.js          # Admin endpoints for location management
├── events/
│   └── inventoryEventHandlers.js         # Event listeners for item movements
└── validators/
    └── movementValidators.js             # Input validation for movement tracking
```

---

## API Endpoints

### Inventory Reports (`/api/inventory/reports`)

#### GET /api/inventory/reports/overview
Get cross-module inventory overview

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": 150,
    "byModule": {
      "gauge": 75,
      "tool": 45,
      "part": 30
    },
    "byLocation": {
      "A1": 12,
      "B2": 8,
      "Floor 1": 25
    },
    "recentMovements": 5
  }
}
```

#### GET /api/inventory/reports/by-location/:locationCode
Get all items in a specific location

**Response:**
```json
{
  "success": true,
  "data": {
    "location": "A1",
    "items": [
      {
        "id": "GAUGE-001",
        "name": "Digital Caliper",
        "type": "gauge",
        "module": "gauge",
        "lastMoved": "2025-10-29T10:00:00Z"
      },
      {
        "id": "TOOL-042",
        "name": "Torque Wrench",
        "type": "tool",
        "module": "tools",
        "lastMoved": "2025-10-28T14:30:00Z"
      }
    ],
    "counts": {
      "gauges": 3,
      "tools": 2,
      "parts": 1,
      "total": 6
    }
  }
}
```

#### GET /api/inventory/reports/by-type/:itemType
Get all items of a specific type

**Query params**: `location` (optional), `limit`, `offset`

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 75,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### Movement History (`/api/inventory/movements`)

#### GET /api/inventory/movements
Get recent movements across all items

**Query params**: `limit`, `offset`, `itemType`, `location`, `userId`

**Response:**
```json
{
  "success": true,
  "data": {
    "movements": [
      {
        "id": 1,
        "movementType": "transfer",
        "itemType": "gauge",
        "itemIdentifier": "GAUGE-001",
        "itemDescription": "Digital Caliper",
        "fromLocation": "A1",
        "toLocation": "B2",
        "movedBy": "john_doe",
        "movedAt": "2025-10-29T10:00:00Z",
        "reason": "Maintenance"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0
    }
  }
}
```

#### GET /api/inventory/movements/item/:itemType/:itemIdentifier
Get movement history for a specific item

**Response:**
```json
{
  "success": true,
  "data": {
    "item": {
      "type": "gauge",
      "identifier": "GAUGE-001",
      "description": "Digital Caliper",
      "currentLocation": "B2"
    },
    "movements": [
      {
        "id": 2,
        "movementType": "transfer",
        "fromLocation": "A1",
        "toLocation": "B2",
        "movedAt": "2025-10-29T10:00:00Z",
        "movedBy": "john_doe",
        "reason": "Maintenance"
      },
      {
        "id": 1,
        "movementType": "created",
        "toLocation": "A1",
        "movedAt": "2025-10-01T08:00:00Z",
        "movedBy": "admin"
      }
    ]
  }
}
```

#### GET /api/inventory/movements/location/:locationCode
Get movement history for a specific location

**Response:**
```json
{
  "success": true,
  "data": {
    "location": "A1",
    "movements": [...]
  }
}
```

---

### Location Analytics (`/api/inventory/analytics`)

#### GET /api/inventory/analytics/utilization
Get location utilization statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "locationCode": "A1",
        "description": "Shelf A1",
        "gauges": 3,
        "tools": 2,
        "parts": 1,
        "total": 6,
        "utilizationScore": 0.6
      }
    ],
    "summary": {
      "totalLocations": 60,
      "activeLocations": 45,
      "emptyLocations": 15,
      "averageUtilization": 0.45
    }
  }
}
```

#### GET /api/inventory/analytics/trends
Get movement trends over time

**Query params**: `startDate`, `endDate`, `groupBy` (day|week|month)

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "2025-10-29",
        "movements": 15,
        "transfers": 10,
        "checkouts": 3,
        "checkins": 2
      }
    ]
  }
}
```

---

### Location Admin (`/api/inventory/locations`)

**Note**: These endpoints use the existing infrastructure API but are also exposed through inventory module for convenience.

#### GET /api/inventory/locations
Get all storage locations (delegates to `/api/storage-locations`)

#### POST /api/inventory/locations
Create storage location (admin only, delegates to infrastructure)

#### PUT /api/inventory/locations/:id
Update storage location (admin only)

#### DELETE /api/inventory/locations/:id
Delete storage location (admin only, soft delete)

---

## Service Layer

### InventoryReportingService.js

```javascript
class InventoryReportingService {
  /**
   * Get all items in a specific location across all modules
   */
  async getItemsByLocation(locationCode) {
    // Query each module's table
    const [gauges] = await pool.execute(
      'SELECT gauge_id as id, name, "gauge" as type FROM gauges WHERE storage_location = ?',
      [locationCode]
    );

    const [tools] = await pool.execute(
      'SELECT tool_id as id, name, "tool" as type FROM tools WHERE storage_location = ?',
      [locationCode]
    );

    const [parts] = await pool.execute(
      'SELECT part_number as id, description as name, "part" as type FROM parts WHERE storage_location = ?',
      [locationCode]
    );

    return {
      location: locationCode,
      items: [...gauges, ...tools, ...parts],
      counts: {
        gauges: gauges.length,
        tools: tools.length,
        parts: parts.length,
        total: gauges.length + tools.length + parts.length
      }
    };
  }

  /**
   * Get inventory overview across all modules
   */
  async getInventoryOverview() {
    const [gaugeCounts] = await pool.execute('SELECT COUNT(*) as count FROM gauges');
    const [toolCounts] = await pool.execute('SELECT COUNT(*) as count FROM tools');
    const [partCounts] = await pool.execute('SELECT COUNT(*) as count FROM parts');

    return {
      totalItems: gaugeCounts[0].count + toolCounts[0].count + partCounts[0].count,
      byModule: {
        gauge: gaugeCounts[0].count,
        tool: toolCounts[0].count,
        part: partCounts[0].count
      }
    };
  }

  /**
   * Get all items of a specific type
   */
  async getItemsByType(itemType, { location, limit = 20, offset = 0 }) {
    let query;
    let params = [];

    if (itemType === 'gauge') {
      query = 'SELECT gauge_id as id, name, storage_location FROM gauges';
      if (location) {
        query += ' WHERE storage_location = ?';
        params.push(location);
      }
    } else if (itemType === 'tool') {
      query = 'SELECT tool_id as id, name, storage_location FROM tools';
      if (location) {
        query += ' WHERE storage_location = ?';
        params.push(location);
      }
    } else if (itemType === 'part') {
      query = 'SELECT part_number as id, description as name, storage_location FROM parts';
      if (location) {
        query += ' WHERE storage_location = ?';
        params.push(location);
      }
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [items] = await pool.execute(query, params);
    return items;
  }
}

module.exports = new InventoryReportingService();
```

### MovementTrackingService.js

```javascript
class MovementTrackingService {
  /**
   * Record an item movement
   */
  async recordMovement(movementData) {
    const {
      movementType,
      itemType,
      itemIdentifier,
      itemModule,
      itemDescription,
      fromLocation,
      toLocation,
      movedBy,
      reason,
      notes
    } = movementData;

    // Validate item exists
    await this.validateItemExists(itemType, itemIdentifier, itemModule);

    // Insert movement record
    return await MovementRepository.create({
      movement_type: movementType,
      item_type: itemType,
      item_identifier: itemIdentifier,
      item_module: itemModule,
      item_description: itemDescription,
      from_location: fromLocation,
      to_location: toLocation,
      moved_by: movedBy,
      reason,
      notes
    });
  }

  /**
   * Get movement history for an item
   */
  async getItemMovementHistory(itemType, itemIdentifier) {
    return await MovementRepository.findByItem(itemType, itemIdentifier);
  }

  /**
   * Get movement history for a location
   */
  async getLocationMovementHistory(locationCode) {
    return await MovementRepository.findByLocation(locationCode);
  }

  /**
   * Get recent movements
   */
  async getRecentMovements({ limit = 50, offset = 0, filters = {} }) {
    return await MovementRepository.findAll({ limit, offset, filters });
  }

  /**
   * Validate that item exists in source module
   */
  async validateItemExists(itemType, itemIdentifier, itemModule) {
    let query;
    let params = [itemIdentifier];

    if (itemType === 'gauge') {
      query = 'SELECT COUNT(*) as count FROM gauges WHERE gauge_id = ?';
    } else if (itemType === 'tool') {
      query = 'SELECT COUNT(*) as count FROM tools WHERE tool_id = ?';
    } else if (itemType === 'part') {
      query = 'SELECT COUNT(*) as count FROM parts WHERE part_number = ?';
    } else {
      throw new Error(`Unknown item type: ${itemType}`);
    }

    const [result] = await pool.execute(query, params);
    if (result[0].count === 0) {
      throw new Error(`${itemType} with identifier ${itemIdentifier} not found`);
    }
  }
}

module.exports = new MovementTrackingService();
```

### LocationUtilizationService.js

```javascript
class LocationUtilizationService {
  /**
   * Get utilization statistics for all locations
   */
  async getUtilizationStats() {
    const query = `
      SELECT
        sl.location_code,
        sl.description,
        sl.location_type,
        COALESCE(g.gauge_count, 0) as gauges,
        COALESCE(t.tool_count, 0) as tools,
        COALESCE(p.part_count, 0) as parts,
        COALESCE(g.gauge_count, 0) + COALESCE(t.tool_count, 0) + COALESCE(p.part_count, 0) as total_items
      FROM storage_locations sl
      LEFT JOIN (
        SELECT storage_location, COUNT(*) as gauge_count
        FROM gauges
        GROUP BY storage_location
      ) g ON sl.location_code = g.storage_location
      LEFT JOIN (
        SELECT storage_location, COUNT(*) as tool_count
        FROM tools
        GROUP BY storage_location
      ) t ON sl.location_code = t.storage_location
      LEFT JOIN (
        SELECT storage_location, COUNT(*) as part_count
        FROM parts
        GROUP BY storage_location
      ) p ON sl.location_code = p.storage_location
      WHERE sl.is_active = TRUE
      ORDER BY total_items DESC, sl.location_code
    `;

    const [locations] = await pool.execute(query);

    return {
      locations,
      summary: {
        totalLocations: locations.length,
        activeLocations: locations.filter(l => l.total_items > 0).length,
        emptyLocations: locations.filter(l => l.total_items === 0).length,
        averageUtilization: this.calculateAverageUtilization(locations)
      }
    };
  }

  calculateAverageUtilization(locations) {
    if (locations.length === 0) return 0;
    const totalItems = locations.reduce((sum, loc) => sum + loc.total_items, 0);
    return totalItems / locations.length;
  }
}

module.exports = new LocationUtilizationService();
```

---

## Repository Layer

### MovementRepository.js

```javascript
class MovementRepository {
  async create(movementData) {
    const query = `
      INSERT INTO inventory_movements (
        movement_type, item_type, item_identifier, item_module, item_description,
        from_location, to_location, moved_by, reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      movementData.movement_type,
      movementData.item_type,
      movementData.item_identifier,
      movementData.item_module,
      movementData.item_description,
      movementData.from_location,
      movementData.to_location,
      movementData.moved_by,
      movementData.reason,
      movementData.notes
    ]);

    return { id: result.insertId, ...movementData };
  }

  async findByItem(itemType, itemIdentifier) {
    const query = `
      SELECT im.*, u.username as moved_by_username
      FROM inventory_movements im
      JOIN users u ON im.moved_by = u.id
      WHERE im.item_type = ? AND im.item_identifier = ?
      ORDER BY im.moved_at DESC
    `;

    const [movements] = await pool.execute(query, [itemType, itemIdentifier]);
    return movements;
  }

  async findByLocation(locationCode) {
    const query = `
      SELECT im.*, u.username as moved_by_username
      FROM inventory_movements im
      JOIN users u ON im.moved_by = u.id
      WHERE im.from_location = ? OR im.to_location = ?
      ORDER BY im.moved_at DESC
    `;

    const [movements] = await pool.execute(query, [locationCode, locationCode]);
    return movements;
  }

  async findAll({ limit, offset, filters }) {
    let query = `
      SELECT im.*, u.username as moved_by_username
      FROM inventory_movements im
      JOIN users u ON im.moved_by = u.id
    `;

    const conditions = [];
    const params = [];

    if (filters.itemType) {
      conditions.push('im.item_type = ?');
      params.push(filters.itemType);
    }

    if (filters.location) {
      conditions.push('(im.from_location = ? OR im.to_location = ?)');
      params.push(filters.location, filters.location);
    }

    if (filters.userId) {
      conditions.push('im.moved_by = ?');
      params.push(filters.userId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY im.moved_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [movements] = await pool.execute(query, params);
    return movements;
  }
}

module.exports = new MovementRepository();
```

---

## Event Handlers

### inventoryEventHandlers.js

```javascript
const eventBus = require('../../../infrastructure/events/EventBus');
const MovementTrackingService = require('../services/MovementTrackingService');

/**
 * Listen for item movement events from all modules
 */
eventBus.on('inventory.item.moved', async (event) => {
  try {
    await MovementTrackingService.recordMovement({
      movementType: event.movementType || 'transfer',
      itemType: event.itemType,
      itemIdentifier: event.itemIdentifier,
      itemModule: event.itemModule,
      itemDescription: event.itemDescription,
      fromLocation: event.fromLocation,
      toLocation: event.toLocation,
      movedBy: event.movedBy,
      reason: event.reason,
      notes: event.notes
    });
  } catch (error) {
    console.error('Failed to record inventory movement:', error);
    // Don't throw - we don't want to break the source operation
  }
});

/**
 * Listen for item creation events
 */
eventBus.on('inventory.item.created', async (event) => {
  try {
    await MovementTrackingService.recordMovement({
      movementType: 'created',
      itemType: event.itemType,
      itemIdentifier: event.itemIdentifier,
      itemModule: event.itemModule,
      itemDescription: event.itemDescription,
      toLocation: event.location,
      movedBy: event.createdBy,
      reason: 'Item created'
    });
  } catch (error) {
    console.error('Failed to record item creation:', error);
  }
});

/**
 * Listen for item deletion events
 */
eventBus.on('inventory.item.deleted', async (event) => {
  try {
    await MovementTrackingService.recordMovement({
      movementType: 'deleted',
      itemType: event.itemType,
      itemIdentifier: event.itemIdentifier,
      itemModule: event.itemModule,
      itemDescription: event.itemDescription,
      fromLocation: event.location,
      movedBy: event.deletedBy,
      reason: event.reason || 'Item deleted'
    });
  } catch (error) {
    console.error('Failed to record item deletion:', error);
  }
});

module.exports = {
  // Event handlers are registered automatically when this module is loaded
};
```

---

## Authentication & Authorization

All endpoints require authentication. Movement recording requires the user to be logged in to track who moved the item.

**Middleware:**
- `authenticateToken` - All endpoints
- `requireAdmin` - Location admin endpoints only

**Permissions:**
- Any authenticated user can view inventory and movements
- Only admins can manage storage locations
- Modules handle their own item permissions (gauge module controls who can move gauges)
