# Inventory Module - Frontend Structure

**Date**: 2025-10-29
**Status**: Planning Phase

---

## Folder Structure

```
/frontend/src/modules/inventory/
├── pages/
│   ├── InventoryDashboard.tsx           # Main inventory overview
│   ├── LocationDetailPage.tsx           # Items in specific location
│   ├── MovementHistoryPage.tsx          # Movement history and audit trail
│   ├── LocationManagementPage.tsx       # Admin UI for managing locations
│   └── AnalyticsPage.tsx                # Location utilization analytics
├── components/
│   ├── ItemsList.tsx                    # Reusable list of items
│   ├── MovementTimeline.tsx             # Movement history timeline
│   ├── LocationCard.tsx                 # Location summary card
│   ├── LocationUtilizationChart.tsx     # Utilization visualization
│   ├── MovementFilters.tsx              # Filter controls for movements
│   ├── ItemTypeFilter.tsx               # Filter by gauge/tool/part
│   └── LocationRangeGenerator.tsx       # Range generator modal
├── hooks/
│   ├── useInventoryReports.ts           # API calls for inventory reports
│   ├── useMovementHistory.ts            # API calls for movement history
│   └── useLocationAnalytics.ts          # API calls for analytics
└── routes.tsx                           # React Router configuration
```

---

## Routes

```typescript
// frontend/src/modules/inventory/routes.tsx
import { Route } from 'react-router-dom';
import { InventoryDashboard } from './pages/InventoryDashboard';
import { LocationDetailPage } from './pages/LocationDetailPage';
import { MovementHistoryPage } from './pages/MovementHistoryPage';
import { LocationManagementPage } from './pages/LocationManagementPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export const inventoryRoutes = (
  <>
    <Route path="/inventory" element={<InventoryDashboard />} />
    <Route path="/inventory/locations/:locationCode" element={<LocationDetailPage />} />
    <Route path="/inventory/movements" element={<MovementHistoryPage />} />
    <Route path="/inventory/locations/manage" element={<LocationManagementPage />} />
    <Route path="/inventory/analytics" element={<AnalyticsPage />} />
  </>
);
```

---

## Pages

### InventoryDashboard.tsx

**Route**: `/inventory`
**Purpose**: Main inventory overview showing all items across modules

**Features:**
- Total item counts (gauges, tools, parts)
- Items by location breakdown
- Recent movements feed
- Quick filters (by type, by location)
- Links to detailed views

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│ Inventory Dashboard                         │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │ Gauges  │ │ Tools   │ │ Parts   │       │
│ │   75    │ │   45    │ │   30    │       │
│ └─────────┘ └─────────┘ └─────────┘       │
│                                             │
│ ┌─────────────────────┬─────────────────┐  │
│ │ Items by Location   │ Recent Moves    │  │
│ │                     │                 │  │
│ │ A1: 12 items        │ GAUGE-001       │  │
│ │ B2: 8 items         │ A1 → B2         │  │
│ │ Floor 1: 25 items   │ 2 mins ago      │  │
│ │                     │                 │  │
│ │ [View All]          │ [View All]      │  │
│ └─────────────────────┴─────────────────┘  │
└─────────────────────────────────────────────┘
```

**Code Structure:**
```typescript
export const InventoryDashboard: React.FC = () => {
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const [overviewData, movements] = await Promise.all([
      apiClient.get('/inventory/reports/overview'),
      apiClient.get('/inventory/movements?limit=5')
    ]);
    setOverview(overviewData.data);
    setRecentMovements(movements.data.movements);
    setLoading(false);
  };

  return (
    <MainLayout title="Inventory Dashboard">
      {/* Stats cards */}
      {/* Items by location */}
      {/* Recent movements */}
    </MainLayout>
  );
};
```

---

### LocationDetailPage.tsx

**Route**: `/inventory/locations/:locationCode`
**Purpose**: Show all items in a specific storage location

**Features:**
- Location information (code, description, type)
- All items in this location (grouped by type)
- Movement history for this location
- Quick actions (move all items, empty location)

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│ Location: A1 - Shelf A1 (Bin)              │
├─────────────────────────────────────────────┤
│                                             │
│ Items in this location (6)                  │
│                                             │
│ ┌─ Gauges (3) ────────────────────────┐    │
│ │ • GAUGE-001 - Digital Caliper        │    │
│ │ • GAUGE-042 - Micrometer             │    │
│ │ • GAUGE-078 - Bore Gauge             │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─ Tools (2) ──────────────────────────┐   │
│ │ • TOOL-015 - Torque Wrench           │    │
│ │ • TOOL-023 - Allen Key Set           │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─ Movement History ───────────────────┐   │
│ │ GAUGE-001 moved from B2 (2 hrs ago)  │    │
│ │ TOOL-015 moved to A1 (1 day ago)     │    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

### MovementHistoryPage.tsx

**Route**: `/inventory/movements`
**Purpose**: Audit trail of all item movements

**Features:**
- Filterable movement history (by type, location, user, date)
- Timeline view of movements
- Export to CSV
- Search by item or user

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│ Movement History                            │
├─────────────────────────────────────────────┤
│                                             │
│ Filters: [Type ▼] [Location ▼] [Date ▼]   │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 📦 GAUGE-001 - Digital Caliper      │    │
│ │    A1 → B2                          │    │
│ │    By john_doe - 2 hours ago        │    │
│ │    Reason: Maintenance              │    │
│ ├─────────────────────────────────────┤    │
│ │ 🔧 TOOL-015 - Torque Wrench         │    │
│ │    Created at A1                    │    │
│ │    By admin - 1 day ago             │    │
│ ├─────────────────────────────────────┤    │
│ │ [Load More]                         │    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

### LocationManagementPage.tsx

**Route**: `/inventory/locations/manage` (Admin only)
**Purpose**: Manage storage locations (CRUD operations)

**Features:**
- View all locations
- Create single location
- Bulk create (range generator)
- Edit/delete locations
- View usage statistics
- Drag-to-reorder

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│ Storage Location Management                 │
├─────────────────────────────────────────────┤
│                                             │
│ [+ Create] [📊 Range Generator] [Import]   │
│                                             │
│ Search: [________] Filters: [Type ▼] [▼]   │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ Code │ Description │ Type │ Items │ │    │
│ ├──────┼─────────────┼──────┼───────┤ │    │
│ │ A1   │ Shelf A1    │ Bin  │ 6     │ │    │
│ │ A2   │ Shelf A2    │ Bin  │ 0     │ │    │
│ │ B1   │ Shelf B1    │ Bin  │ 3     │ │    │
│ │ ...  │ ...         │ ...  │ ...   │ │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ Showing 60 locations (45 active, 15 empty) │
└─────────────────────────────────────────────┘
```

**Note**: This page embeds the HTML mockup we created earlier (`storage-locations-admin-ui.html`) converted to React components.

---

### AnalyticsPage.tsx

**Route**: `/inventory/analytics`
**Purpose**: Location utilization analytics and insights

**Features:**
- Utilization heatmap
- Most/least used locations
- Movement trends over time
- Empty locations report

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│ Inventory Analytics                         │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─ Utilization Overview ──────────────┐    │
│ │ Total Locations: 60                 │    │
│ │ Active: 45 (75%)                    │    │
│ │ Empty: 15 (25%)                     │    │
│ │ Avg Items/Location: 2.5             │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─ Top Locations by Items ────────────┐    │
│ │ 1. Floor 1 - 25 items               │    │
│ │ 2. A1 - 12 items                    │    │
│ │ 3. B2 - 8 items                     │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─ Movement Trends (Last 30 Days) ────┐    │
│ │ [Chart showing movements over time] │    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## Components

### ItemsList.tsx

**Purpose**: Reusable component to display items

```typescript
interface ItemsListProps {
  items: InventoryItem[];
  groupBy?: 'type' | 'location';
  showActions?: boolean;
  onItemClick?: (item: InventoryItem) => void;
}

export const ItemsList: React.FC<ItemsListProps> = ({
  items,
  groupBy,
  showActions,
  onItemClick
}) => {
  const groupedItems = groupBy ? groupItems(items, groupBy) : { all: items };

  return (
    <div className="items-list">
      {Object.entries(groupedItems).map(([group, groupItems]) => (
        <div key={group} className="item-group">
          <h3>{formatGroupName(group, groupItems.length)}</h3>
          {groupItems.map(item => (
            <ItemCard
              key={`${item.type}-${item.id}`}
              item={item}
              onClick={() => onItemClick?.(item)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
```

### MovementTimeline.tsx

**Purpose**: Timeline view of item movements

```typescript
interface MovementTimelineProps {
  movements: Movement[];
  limit?: number;
}

export const MovementTimeline: React.FC<MovementTimelineProps> = ({
  movements,
  limit = 10
}) => {
  const displayMovements = movements.slice(0, limit);

  return (
    <div className="movement-timeline">
      {displayMovements.map(movement => (
        <div key={movement.id} className="timeline-item">
          <div className="timeline-icon">
            {getMovementIcon(movement.movementType)}
          </div>
          <div className="timeline-content">
            <div className="item-info">
              <strong>{movement.itemDescription}</strong>
              <Badge>{movement.itemType}</Badge>
            </div>
            <div className="movement-info">
              {movement.fromLocation && `${movement.fromLocation} → `}
              {movement.toLocation}
            </div>
            <div className="meta-info">
              By {movement.movedByUsername} · {formatTimeAgo(movement.movedAt)}
            </div>
            {movement.reason && (
              <div className="reason">Reason: {movement.reason}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### LocationCard.tsx

**Purpose**: Summary card for a storage location

```typescript
interface LocationCardProps {
  location: StorageLocation;
  itemCounts: {
    gauges: number;
    tools: number;
    parts: number;
    total: number;
  };
  onClick?: () => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  location,
  itemCounts,
  onClick
}) => {
  return (
    <Card onClick={onClick} className="location-card">
      <CardHeader>
        <CardTitle>{location.location_code}</CardTitle>
        <Badge>{location.location_type}</Badge>
      </CardHeader>
      <CardContent>
        {location.description && (
          <p className="description">{location.description}</p>
        )}
        <div className="item-counts">
          <div>Gauges: {itemCounts.gauges}</div>
          <div>Tools: {itemCounts.tools}</div>
          <div>Parts: {itemCounts.parts}</div>
          <div className="total">Total: {itemCounts.total}</div>
        </div>
      </CardContent>
    </Card>
  );
};
```

### LocationRangeGenerator.tsx

**Purpose**: Range generator modal for bulk location creation

**Note**: This converts the HTML mockup (`storage-locations-admin-ui.html`) to React component

```typescript
interface LocationRangeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (locations: NewLocation[]) => void;
}

export const LocationRangeGenerator: React.FC<LocationRangeGeneratorProps> = ({
  isOpen,
  onClose,
  onGenerate
}) => {
  const [prefix, setPrefix] = useState('Floor');
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(50);
  const [locationType, setLocationType] = useState('bin');
  const [description, setDescription] = useState('');

  const handleGenerate = () => {
    const locations = [];
    for (let i = startNum; i <= endNum; i++) {
      locations.push({
        location_code: `${prefix} ${i}`,
        location_type: locationType,
        description: description || null
      });
    }
    onGenerate(locations);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Range Generator">
      {/* Form fields with tooltips */}
      {/* Live preview */}
      {/* Generate button */}
    </Modal>
  );
};
```

---

## Hooks

### useInventoryReports.ts

```typescript
export const useInventoryReports = () => {
  const getOverview = async () => {
    const response = await apiClient.get('/inventory/reports/overview');
    return response.data;
  };

  const getItemsByLocation = async (locationCode: string) => {
    const response = await apiClient.get(`/inventory/reports/by-location/${locationCode}`);
    return response.data;
  };

  const getItemsByType = async (
    itemType: string,
    options: { location?: string; limit?: number; offset?: number }
  ) => {
    const params = new URLSearchParams();
    if (options.location) params.append('location', options.location);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const response = await apiClient.get(`/inventory/reports/by-type/${itemType}?${params}`);
    return response.data;
  };

  return { getOverview, getItemsByLocation, getItemsByType };
};
```

### useMovementHistory.ts

```typescript
export const useMovementHistory = () => {
  const getMovements = async (filters: MovementFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.itemType) params.append('itemType', filters.itemType);
    if (filters.location) params.append('location', filters.location);
    if (filters.userId) params.append('userId', filters.userId.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await apiClient.get(`/inventory/movements?${params}`);
    return response.data;
  };

  const getItemMovementHistory = async (itemType: string, itemIdentifier: string) => {
    const response = await apiClient.get(`/inventory/movements/item/${itemType}/${itemIdentifier}`);
    return response.data;
  };

  const getLocationMovementHistory = async (locationCode: string) => {
    const response = await apiClient.get(`/inventory/movements/location/${locationCode}`);
    return response.data;
  };

  return { getMovements, getItemMovementHistory, getLocationMovementHistory };
};
```

### useLocationAnalytics.ts

```typescript
export const useLocationAnalytics = () => {
  const getUtilization = async () => {
    const response = await apiClient.get('/inventory/analytics/utilization');
    return response.data;
  };

  const getTrends = async (options: TrendOptions) => {
    const params = new URLSearchParams();
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.groupBy) params.append('groupBy', options.groupBy);

    const response = await apiClient.get(`/inventory/analytics/trends?${params}`);
    return response.data;
  };

  return { getUtilization, getTrends };
};
```

---

## Navigation Integration

### Add to Main Navigation

```typescript
// frontend/src/infrastructure/components/MainLayout.tsx
const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'home' },
  { path: '/gauge', label: 'Gauges', icon: 'ruler' },
  { path: '/inventory', label: 'Inventory', icon: 'warehouse' }, // New
  { path: '/admin', label: 'Admin', icon: 'settings' }
];
```

---

## Styling

Uses existing infrastructure CSS modules and Tailwind classes. No new CSS files needed - all components use centralized infrastructure components (Button, Modal, FormInput, etc.).

**Example:**
```tsx
import { Button, Card, Badge, Modal } from '../../infrastructure/components';

// Components automatically get consistent styling
<Button variant="primary">View Details</Button>
<Badge>gauge</Badge>
<Card>...</Card>
```

---

## State Management

Uses React hooks and local state. For complex state (filters, pagination), consider Zustand store if needed.

**Example Zustand Store (Optional):**
```typescript
// frontend/src/modules/inventory/store/inventoryStore.ts
interface InventoryStore {
  filters: MovementFilters;
  setFilters: (filters: MovementFilters) => void;
  currentLocation: string | null;
  setCurrentLocation: (location: string | null) => void;
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  filters: {},
  setFilters: (filters) => set({ filters }),
  currentLocation: null,
  setCurrentLocation: (location) => set({ currentLocation: location })
}));
```

---

## Accessibility

All components must follow accessibility best practices:
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Focus management
- Screen reader support

Uses infrastructure components which already have accessibility built-in.
