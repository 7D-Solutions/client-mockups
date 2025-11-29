# Inventory Module - Future Enhancements Backlog

**Date**: 2025-10-30
**Status**: Backlog (Not MVP)
**Philosophy**: Add features based on actual production needs, not speculation

---

## Purpose

This document contains all features, optimizations, and enhancements that were **intentionally excluded from MVP** to keep the initial implementation simple. Add these features incrementally based on:
- Actual user requests
- Proven performance bottlenecks
- Real-world usage patterns
- Business value validation

**Don't add these "just in case" - add them when there's clear evidence they're needed.**

---

## Database Optimizations

### Add When Performance Proves Necessary

#### 1. Item Description Cache
**When to add**: Movement history queries become too slow

**Migration**: `021-add-item-description-cache.sql`
```sql
ALTER TABLE inventory_movements
ADD COLUMN item_description VARCHAR(255) DEFAULT NULL COMMENT 'Cached item name';

-- Backfill existing records
UPDATE inventory_movements im
JOIN gauges g ON im.item_identifier = g.gauge_id
SET im.item_description = g.name
WHERE im.item_type = 'gauge';
```

**Trade-offs**:
- ✅ Faster queries (no join to source modules)
- ❌ Data duplication
- ❌ Can become stale if item names change
- ❌ More complex update logic

---

#### 2. Additional Indexes
**When to add**: Queries on these fields show poor performance

**Migration**: `022-add-location-from-index.sql`
```sql
-- Add if filtering by from_location is slow
CREATE INDEX idx_location_from ON inventory_movements(from_location);
```

**Migration**: `023-add-moved-by-index.sql`
```sql
-- Add if user activity queries are slow
CREATE INDEX idx_moved_by ON inventory_movements(moved_by);
```

**Trade-offs**:
- ✅ Faster queries on these fields
- ❌ Slower inserts (more indexes to update)
- ❌ More disk space

---

#### 3. Additional Movement Types
**When to add**: Parts module is implemented

**Migration**: `024-add-sold-consumed-types.sql`
```sql
ALTER TABLE inventory_movements
MODIFY COLUMN movement_type ENUM('transfer', 'created', 'deleted', 'sold', 'consumed', 'other') NOT NULL;
```

**Use cases**:
- `sold`: Parts sold to customers (requires order_number)
- `consumed`: Parts used for jobs (requires job_number)

---

## Location Management Enhancements

### Add When Users Request Advanced Features

#### 1. Bulk Range Generator
**Priority**: High - saves significant time for initial setup

**Feature**: Create multiple locations at once
- Example: "Floor 1-50" creates Floor-01, Floor-02, ..., Floor-50
- Example: "Bin A1-Z99" creates Bin-A1, Bin-A2, ..., Bin-Z99

**Implementation**:
- Frontend: `LocationRangeGenerator.tsx` component
- Backend: `POST /api/storage-locations/bulk` endpoint
- Validation: Check for duplicates before creating

**UI Mockup**: Already exists in `storage-locations-admin-ui.html`

---

#### 2. Drag-to-Reorder Display Sequence
**Priority**: Medium - nice-to-have for organization

**Feature**: Drag locations to change display order
- Updates `display_order` field in `storage_locations` table
- Persists order across sessions
- Visual feedback during drag

**Implementation**:
- Use React DnD or similar library
- Backend: `PUT /api/storage-locations/reorder` endpoint

---

#### 3. Location Capacity Management
**Priority**: Low - advanced warehouse management

**Feature**: Set max capacity per location
- Define max items per location
- Warn when approaching capacity
- Prevent adding items to full locations

**Database changes**:
```sql
ALTER TABLE storage_locations
ADD COLUMN max_capacity INT DEFAULT NULL COMMENT 'Maximum items allowed',
ADD COLUMN capacity_type ENUM('items', 'cubic_feet', 'weight') DEFAULT 'items';
```

---

#### 4. Location Hierarchy
**Priority**: Low - complex warehouse structures

**Feature**: Organize locations hierarchically
- Building → Floor → Rack → Bin
- Parent-child relationships
- Breadcrumb navigation

**Database changes**:
```sql
ALTER TABLE storage_locations
ADD COLUMN parent_location_code VARCHAR(50) DEFAULT NULL,
ADD COLUMN hierarchy_level INT DEFAULT 0,
ADD FOREIGN KEY (parent_location_code) REFERENCES storage_locations(location_code);
```

---

## Analytics & Insights

### Add When Reporting Needs Are Clear

#### 1. Location Utilization Dashboard
**Priority**: High - valuable business insights

**Features**:
- Total items per location
- Utilization percentage (items / capacity)
- Empty locations list
- Most/least used locations

**Implementation**:
- Service: `LocationUtilizationService.js`
- Endpoint: `GET /api/inventory/analytics/utilization`
- Frontend: `AnalyticsPage.tsx` with charts

**Technology**: Chart.js or Recharts for visualization


---

#### 2. Movement Trends Visualization
**Priority**: Medium - helps with operational planning

**Features**:
- Movement volume over time (daily/weekly/monthly)
- Peak movement times
- Slowest moving items
- Location churn rate

**Implementation**:
- Endpoint: `GET /api/inventory/analytics/trends`
- Time series queries with date grouping
- Line/bar charts for visualization


---

#### 3. Heat Maps
**Priority**: Low - visual warehouse management

**Feature**: Visual representation of location activity
- Color-coded by movement frequency
- Interactive warehouse floor plan
- Identifies hot/cold zones

**Implementation**: Requires warehouse layout data


---

#### 4. Predictive Analytics
**Priority**: Low - advanced analytics

**Features**:
- Predict space needs based on trends
- Recommend locations for new items
- Identify underutilized locations

**Implementation**: Requires historical data and ML models


---

## Advanced Search & Filtering

### Add When Basic Search Proves Insufficient

#### 1. Advanced Filters
**Priority**: Medium - improves usability

**Features**:
- Filter by multiple criteria simultaneously
- Date range filters
- Item type combinations
- Saved filter presets

**Implementation**:
- Frontend: Advanced filter component
- Backend: Dynamic query builder


---

#### 2. Saved Searches
**Priority**: Low - convenience feature

**Feature**: Save frequently used searches
- Name and save search criteria
- Quick access from dropdown
- Share searches with team

**Database**:
```sql
CREATE TABLE saved_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  search_criteria JSON NOT NULL,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```


---

## Reporting Enhancements

### Add When Export/Reporting Needs Emerge

#### 1. CSV Export
**Priority**: High - common business requirement

**Features**:
- Export inventory overview
- Export movement history
- Export location contents
- Configurable column selection

**Implementation**:
- Backend: CSV generation library
- Endpoint: `GET /api/inventory/reports/export?format=csv`


---

#### 2. PDF Reports
**Priority**: Medium - professional reporting

**Features**:
- Formatted PDF reports
- Logo and branding
- Print-optimized layouts
- Custom report templates

**Implementation**: PDF generation library (e.g., PDFKit)


---

#### 3. Scheduled Reports
**Priority**: Low - automation feature

**Feature**: Email reports on schedule
- Daily/weekly/monthly reports
- Configurable recipients
- Automatic generation and delivery

**Implementation**: Requires job scheduler (cron or similar)


---

#### 4. Custom Report Builder
**Priority**: Low - advanced feature

**Feature**: User-defined reports
- Drag-and-drop field selection
- Custom filters and grouping
- Save and reuse report templates

**Implementation**: Complex report builder UI


---

## Integration Features

### Add When External System Integration Needed

#### 1. Barcode/QR Code Scanning
**Priority**: High - improves operational efficiency

**Features**:
- Scan location codes to view contents
- Scan item codes to find location
- Mobile-optimized scanning UI
- Camera-based or dedicated scanner

**Implementation**:
- Frontend: Camera API integration
- Backend: Barcode format validation
- Mobile-responsive design


---

#### 2. RFID Tag Support
**Priority**: Medium - advanced tracking

**Features**:
- RFID reader integration
- Automatic item detection
- Bulk scanning capability
- Real-time location updates

**Implementation**: Requires RFID hardware and SDK


---

#### 3. Mobile App
**Priority**: Medium - field operations

**Features**:
- Native iOS/Android apps
- Offline capability
- Barcode scanning
- Quick item lookup
- Movement recording

**Technology**: React Native or Flutter


---

#### 4. Real-Time Updates (WebSockets)
**Priority**: Low - multi-user collaboration

**Feature**: Live updates without page refresh
- See movement changes in real-time
- Location updates propagate instantly
- Multiple users stay synchronized

**Implementation**:
- WebSocket server (Socket.io)
- Frontend subscription management


---

#### 5. API Webhooks
**Priority**: Low - external integrations

**Feature**: Notify external systems of events
- POST to configured endpoints
- Movement notifications
- Low stock alerts
- Custom event triggers

**Database**:
```sql
CREATE TABLE webhook_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  url VARCHAR(500) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  secret_key VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```


---

#### 6. Integration with Shipping Systems
**Priority**: Low - specific business need

**Features**:
- Export shipment data
- Update locations on shipment
- Track shipped items
- Integration with UPS/FedEx/etc.

**Implementation**: Depends on shipping provider APIs


---

#### 7. Integration with Purchasing Systems
**Priority**: Low - inventory replenishment

**Features**:
- Low stock triggers purchase orders
- Receiving updates inventory
- Supplier integration
- Cost tracking

**Implementation**: Depends on purchasing system


---

## Performance Optimizations

### Add When Performance Issues Arise

#### 1. Query Result Caching
**Priority**: Medium - improves response time

**Implementation**:
- Redis cache for expensive queries
- Cache location contents (5-minute TTL)
- Cache utilization stats (15-minute TTL)
- Invalidate on movements


---

#### 2. Movement Archive
**Priority**: Low - long-term data management

**Feature**: Archive old movements
- Move movements >2 years old to archive table
- Keep main table performant
- Archive table available for historical reporting

**Implementation**:
```sql
CREATE TABLE inventory_movements_archive
LIKE inventory_movements;

-- Scheduled job to archive old records
INSERT INTO inventory_movements_archive
SELECT * FROM inventory_movements
WHERE moved_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```


---

#### 3. Materialized Views
**Priority**: Low - complex reporting optimization

**Feature**: Pre-computed aggregations
- Current item counts per location
- Movement summary statistics
- Refresh on schedule or trigger

**Implementation**: Depends on MySQL version and capabilities


---

## User Experience Enhancements

### Add When UX Feedback Indicates Need

#### 1. Dashboard Customization
**Priority**: Low - personalization

**Features**:
- Drag-and-drop widget layout
- Show/hide sections
- Personal preferences saved
- Role-based default layouts


---

#### 2. Bulk Operations
**Priority**: Medium - operational efficiency

**Features**:
- Move multiple items at once
- Bulk location updates
- Batch transfers
- Progress tracking


---

#### 3. Movement Approval Workflows
**Priority**: Low - controls and compliance

**Features**:
- Require approval for certain movements
- Multi-level approval chains
- Email notifications
- Audit trail of approvals

**Database**:
```sql
CREATE TABLE movement_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  movement_id INT NOT NULL,
  approver_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected'),
  approved_at TIMESTAMP NULL,
  notes TEXT,
  FOREIGN KEY (movement_id) REFERENCES inventory_movements(id),
  FOREIGN KEY (approver_id) REFERENCES users(id)
);
```


---

#### 4. Inventory Reservations
**Priority**: Low - advanced inventory management

**Features**:
- Reserve items for future use
- Prevent double-allocation
- Reservation expiration
- Release reservations

**Database**:
```sql
CREATE TABLE inventory_reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_type VARCHAR(50) NOT NULL,
  item_identifier VARCHAR(100) NOT NULL,
  quantity INT DEFAULT 1,
  reserved_for_user INT NOT NULL,
  reservation_reason VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reserved_for_user) REFERENCES users(id)
);
```


---

## Parts-Specific Features

### Add When Parts Module Is Implemented

#### 1. Low Stock Alerts
**Priority**: High - prevents stockouts

**Features**:
- Set minimum quantity thresholds
- Email alerts when stock low
- Dashboard warnings
- Reorder recommendations

**Database**:
```sql
ALTER TABLE parts
ADD COLUMN min_quantity INT DEFAULT NULL,
ADD COLUMN reorder_quantity INT DEFAULT NULL;
```


---

#### 2. Parts Costing
**Priority**: Medium - financial tracking

**Features**:
- Track part costs per movement
- Calculate inventory value
- Cost of goods sold (COGS)
- Price history

**Database changes**:
```sql
ALTER TABLE inventory_movements
ADD COLUMN unit_cost DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN total_cost DECIMAL(10,2) DEFAULT NULL;
```


---

#### 3. Lot/Batch Tracking
**Priority**: Medium - traceability

**Features**:
- Track parts by lot number
- Expiration date management
- First-in-first-out (FIFO)
- Recall capability

**Database**:
```sql
CREATE TABLE part_lots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  part_number VARCHAR(50) NOT NULL,
  lot_number VARCHAR(50) NOT NULL,
  received_date DATE NOT NULL,
  expiration_date DATE,
  quantity INT NOT NULL,
  storage_location VARCHAR(50),
  FOREIGN KEY (part_number) REFERENCES parts(part_number)
);
```


---

## Decision Framework

### When to Implement Features from This Document

Use this checklist to decide if a feature should be implemented:

1. **User Request**
   - [ ] Has a user explicitly asked for this feature?
   - [ ] Would it solve a real problem they're experiencing?

2. **Performance Need**
   - [ ] Is there measurable performance degradation without it?
   - [ ] Have we profiled and identified this as a bottleneck?

3. **Business Value**
   - [ ] Does this feature enable new business capabilities?
   - [ ] Is there clear ROI (time saved, errors prevented, revenue enabled)?

4. **Technical Debt**
   - [ ] Is NOT implementing this causing technical problems?
   - [ ] Would adding it now prevent bigger issues later?

5. **Simplicity Check**
   - [ ] Have we tried solving the problem without adding features?
   - [ ] Is this the simplest solution that could work?

**If you can't check at least 3 boxes, the feature probably isn't needed yet.**

---

## Priority Matrix

### Implementation Priority Guidelines

| Priority | Criteria | When to Implement |
|----------|----------|-------------------|
| **High** | User-requested, clear value, simple to add | Immediately after MVP |
| **Medium** | Nice-to-have, moderate value, moderate complexity | After MVP proven in production |
| **Low** | Speculative, complex, niche use case | Only if specifically requested |

---

## Version History

| Date | Changes | Reason |
|------|---------|--------|
| 2025-10-30 | Initial backlog created | Simplified MVP, moved features here |

---

**Remember**: This document is a backlog, not a roadmap. Features move from here to active development only when there's clear evidence they're needed.
