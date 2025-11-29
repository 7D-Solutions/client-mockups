# Gauge Module Architecture Analysis & Template Specification

**Project**: Fire-Proof ERP Sandbox  
**Analysis Date**: 2025-11-08  
**Scope**: Backend (`backend/src/modules/gauge`) & Frontend (`frontend/src/modules/gauge`) module patterns  
**Purpose**: Extract reusable patterns for a module template system

---

## Executive Summary

The gauge module demonstrates a **production-grade, enterprise-scale architecture** with clear separation of concerns across multiple layers:

- **Backend**: 27 services, 25 repositories, 11 routes, domain-driven design with DTOs
- **Frontend**: 40+ components, Zustand state management, React Query hooks, comprehensive type safety
- **Cross-layer Integration**: Event-driven architecture, audit logging, transaction management

This document identifies **parameterizable patterns** for creating new modules with similar structure.

---

## Part 1: Backend Architecture Analysis

### 1.1 Directory Structure (Highly Organized)

```
backend/src/modules/gauge/
├── domain/                      # Domain-driven design layer
│   ├── DomainValidationError.js # Custom exception class
│   ├── GaugeEntity.js           # Value object with validation
│   └── GaugeSet.js              # Aggregate for paired gauges
├── repositories/                # Data access layer (25 files)
│   ├── BaseRepository patterns
│   ├── GaugeRepository.js       # Primary CRUD + spec tables
│   ├── GaugeSetRepository.js    # Set operations
│   ├── GaugeQueryRepository.js  # Read-only complex queries
│   ├── CalibrationRepository.js
│   ├── TransfersRepository.js
│   └── [22 more...]
├── services/                    # Business logic layer (27 files)
│   ├── GaugeCreationService.js  # Creation workflows
│   ├── GaugeSetService.js       # Set management (816 lines)
│   ├── GaugeSearchService.js    # Search logic
│   ├── GaugeCheckoutService.js  # Checkout workflows (738 lines)
│   ├── TransfersService.js      # Transfer operations
│   └── [22 more specialized services...]
├── mappers/                     # DTO transformation
│   ├── GaugeDTOMapper.js        # DTO ↔ DB transformations
│   └── GaugeSetSQLBuilder.js    # Dynamic SQL generation
├── presenters/                  # Presentation formatting
│   └── GaugePresenter.js        # Display name generation
├── routes/                      # REST API endpoints (11 files)
│   ├── index.js                 # Route aggregation
│   ├── gauges.js                # Main CRUD endpoints
│   ├── gauges-v2.js             # Set management endpoints
│   ├── gauge-tracking-*.js      # Operational workflows (4 files)
│   └── [calibration, certificates, QC...]
├── middleware/                  # Custom middleware
│   └── validation.js            # Field validators
├── queries/                     # Pre-built SQL queries
│   ├── gaugeQueries.js          # GAUGE_WITH_RELATIONS
│   └── index.js
├── utils/                       # Utilities
│   └── threadSizeNormalizer.js
├── migrations/                  # Database schema
│   └── [SQL migration files]
└── domain/
    ├── DomainValidationError.js
    ├── GaugeEntity.js
    └── GaugeSet.js
```

### 1.2 Core Patterns

#### Pattern 1: Repository Layer (Data Access)

**Base Class Pattern** (`BaseRepository`):
```javascript
// Constructor signature - supports multiple initialization patterns
constructor(param1, param2 = 'id', param3 = null) {
  // Handles: pool, tableName OR tableName, primaryKey
  // Validates table against whitelist for security
  this.tableName = tableName;
  this.primaryKey = primaryKey;
}

// Core CRUD methods (inherited):
- async findByPrimaryKey(id)
- async create(data, connection)
- async update(id, updates, connection)
- async delete(id, connection)
- async executeQuery(sql, params, connection)
```

**Specialized Repository Pattern** (`GaugeRepository`):
```javascript
class GaugeRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool, 'gauges'); // or super('gauges', 'id')
  }

  // Implements universal interface
  async findByPrimaryKey(id) { /* routes to getGaugeById */ }
  
  // Adds gauge-specific methods
  async findByGaugeId(gaugeId)
  async findBySetId(setId)
  async findSpareThreadGauges(filters)
  
  // Handles multi-table operations
  async createGauge(gaugeData, conn) {
    // 1. Create main record (gauges table)
    // 2. Create specifications in sub-table
    // 3. Return DTO with specifications
  }
  
  // Maps specification tables by type
  getSpecTableFor(equipmentType) {
    return SPEC_TABLES[equipmentType];
  }
}

// Specification tables mapping
const SPEC_TABLES = {
  thread_gauge: 'gauge_thread_specifications',
  hand_tool: 'gauge_hand_tool_specifications',
  large_equipment: 'gauge_large_equipment_specifications',
  calibration_standard: 'gauge_calibration_standard_specifications',
};
```

**Key Repository Patterns**:
- Extends `BaseRepository` for standard CRUD
- Implements `findByPrimaryKey()` and `findByBusinessIdentifier()`
- Adds entity-specific methods (e.g., `findByGaugeId()`)
- Handles multi-table operations with transaction support
- Uses connection pooling with release semantics
- Maps entity types to specification tables

**Templateable Elements**:
- Table name → `{{ENTITY_TABLE}}`
- Primary key → `{{PRIMARY_KEY}}` (default: 'id')
- Business identifier → `findBy{{IDENTIFIER_FIELD}}`
- Specification tables → `SPEC_TABLES` mapping dict
- Entity-specific queries → Custom finder methods

#### Pattern 2: Domain Layer (Business Rules)

**Entity Pattern** (`GaugeEntity`):
```javascript
class GaugeEntity {
  constructor(data) {
    // Map database snake_case → camelCase
    this.id = data.id;
    this.gaugeId = data.gauge_id; // Universal identifier
    this.equipmentType = data.equipment_type;
    this.threadSize = data.thread_size;
    // ... more fields
    
    // Validate on construction (fail fast)
    this.validate();
  }

  validate() {
    // Field-level validation with custom exceptions
    if (!this.gaugeId) {
      throw new DomainValidationError(
        'gauge_id is required',
        'MISSING_GAUGE_ID'
      );
    }
    // ... equipment-type specific validation
  }

  toDatabase() {
    // Convert camelCase → snake_case for database
    return { gauge_id: this.gaugeId, ... };
  }
}
```

**Key Entity Patterns**:
- Encapsulates field validation (fail-fast)
- Maps between camelCase (JS) and snake_case (DB)
- Implements custom serialization methods
- Throws domain-specific exceptions

**Templateable Elements**:
- Field mappings → `constructor` property assignments
- Validation rules → `validate()` method
- Custom exceptions → Extend `DomainValidationError`
- Serialization logic → `toDatabase()`, `toSpecifications()`

#### Pattern 3: Service Layer (Business Logic)

**Service Constructor Pattern**:
```javascript
class GaugeCreationService extends BaseService {
  constructor(gaugeRepository, gaugeSetRepository, options = {}) {
    super(gaugeRepository, options);
    this.gaugeSetRepository = gaugeSetRepository;
    // Inject other dependencies
    this.auditService = auditService;
    this.movementService = new MovementService();
  }
}
```

**Service Methods Pattern**:
```javascript
// Public interface
async createGauge(gaugeData, userId) {
  // 1. Validate input
  // 2. Prepare data (transform DTOs)
  // 3. Execute transaction (with audit logging)
  // 4. Return result with DTO transformation
}

// Private helpers
async _logAuditAction(action, recordId, userId, details) {
  // Consistent audit logging
}

_validateGaugeSetSpecs(goData, noGoData) {
  // Domain validation
}
```

**Key Service Patterns**:
- Extends `BaseService` for standard operations
- Injects multiple repositories
- Uses transaction wrappers for multi-step operations
- Maintains consistent audit logging
- Implements private helper methods for complexity

**Service Organization** (27 services by responsibility):
```
GaugeCreationService       - Gauge/set creation workflows
GaugeSetService            - Set management (816 LOC)
GaugeSearchService         - Search & filtering logic
GaugeCheckoutService       - Checkout/return workflows
TransfersService           - Transfer operations
GaugeValidationService     - Cross-cutting validation
GaugeStatusService         - Status management
CalibrationWorkflowService - Calibration workflows
CertificateService         - Certificate management (953 LOC)
... and 18 more specialized services
```

#### Pattern 4: DTO Mapper (Data Transformation)

**Mapper Pattern** (`GaugeDTOMapper`):
```javascript
class GaugeDTOMapper {
  // Database → DTO transformation
  static transformToDTO(dbGauge) {
    // 1. Structure specifications from joined columns
    let specifications = dbGauge.specifications || null;
    if (!specifications && dbGauge.thread_size) {
      specifications = {
        threadSize: dbGauge.thread_size,
        threadClass: dbGauge.thread_class,
        // ... map all spec fields
      };
    }

    // 2. Transform field names (snake_case → camelCase)
    const dto = {
      id: String(dbGauge.id),
      gauge_id: dbGauge.gauge_id,
      gaugeId: dbGauge.gauge_id, // Provide both formats
      equipment_type: dbGauge.equipment_type,
      equipmentType: dbGauge.equipment_type,
      // ... all fields with dual naming
      specifications
    };

    // 3. Enrich with presenter (display names)
    return GaugePresenter.toDTO(dto);
  }

  // DTO → Database transformation
  static transformFromDTO(apiGauge) {
    // Convert camelCase → snake_case
    const transformed = {
      id: parseInt(apiGauge.id),
      gauge_id: apiGauge.gauge_id,
      equipment_type: apiGauge.equipment_type,
      // ...
    };
    return transformed;
  }
}
```

**Key Mapper Patterns**:
- Bidirectional transformations
- Handles field name case conversion
- Structures related data from JOINs
- Integrates with Presenter for enrichment
- Provides both naming conventions for backward compatibility

#### Pattern 5: Presenter Layer (Display Logic)

**Presenter Pattern** (`GaugePresenter`):
```javascript
class GaugePresenter {
  static toDTO(gauge) {
    return {
      ...gauge,
      displayName: this.formatDisplayName(gauge)
    };
  }

  static formatDisplayName(gauge) {
    switch (gauge.equipmentType) {
      case 'thread_gauge':
        return this.formatThreadGaugeName(gauge);
      case 'hand_tool':
        return this.formatHandToolName(gauge);
      // ... other types
    }
  }

  // Equipment-type specific formatting
  static formatThreadGaugeName(gauge) {
    const { threadSize, threadForm, threadClass, gaugeType } = gauge.specifications;
    const size = this.convertToDecimal(threadSize);
    return [size, threadForm, threadClass, 'Thread', gaugeType, 'Gauge']
      .filter(Boolean).join(' ');
  }
}
```

**Key Presenter Patterns**:
- Single responsibility: display logic only
- Equipment-type aware formatting
- Conversion utilities (fractions → decimals)
- Enriches DTOs with display fields

#### Pattern 6: Route Layer (REST API)

**Route Structure** (`gauges-v2.js`):
```javascript
const router = express.Router();

// Authentication & validation middleware
router.get('/categories/:equipmentType',
  authenticateToken,
  validateEquipmentType,
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    // Route logic
  })
);

// Validation middleware construction
const validateCreateSet = [
  body('goGauge.equipment_type').equals('thread_gauge'),
  body('goGauge.thread_size').notEmpty(),
  // ... comprehensive field validation
];

// Helper functions
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};
```

**Route Endpoints Pattern**:
```
GET    /api/gauges              - List gauges with filters
POST   /api/gauges              - Create single gauge
GET    /api/gauges/:id          - Get gauge details
PUT    /api/gauges/:id          - Update gauge
DELETE /api/gauges/:id          - Delete gauge (soft)

GET    /api/gauges/v2/categories/:equipmentType
GET    /api/gauges/v2/next-set-id
POST   /api/gauges/v2/create-set      - Create GO/NO-GO pair
POST   /api/gauges/v2/pair-spares     - Pair spare gauges
POST   /api/gauges/v2/unpair          - Break a set
GET    /api/gauges/v2/spares          - Get spares by type
```

**Key Route Patterns**:
- Middleware stacking (auth → validate → handle → logic)
- Express-validator for field validation
- Async error handling wrapper
- Service registry injection (`serviceRegistry.get()`)
- Database connection pooling (`getPool()`)

#### Pattern 7: Query Builders (Pre-built SQL)

**Query Pattern** (`gaugeQueries.js`):
```javascript
const GAUGE_WITH_RELATIONS = `
  SELECT g.*,
    gac.checked_out_to,
    gac.checkout_date,
    u.name as assigned_to_user_name,
    gt.id as pending_transfer_id,
    CASE WHEN gt.id IS NOT NULL THEN 1 ELSE 0 END as has_pending_transfer,
    ts.thread_size,
    ts.thread_class,
    // ... 40+ fields from LEFT JOINs
  FROM gauges g
  LEFT JOIN gauge_active_checkouts gac ON g.id = gac.gauge_id
  LEFT JOIN core_users u ON gac.checked_out_to = u.id
  LEFT JOIN gauge_transfers gt ON g.id = gt.gauge_id
  // ... more LEFT JOINs
`;

const buildGaugeQuery = (whereClause = '', params = []) => ({
  sql: `${GAUGE_WITH_RELATIONS} ${whereClause}`,
  params
});
```

**Key Query Patterns**:
- Pre-built base query with standard JOINs
- Dynamic WHERE clause builder
- Parameterized queries for safety
- Consistent field naming across tables

### 1.3 File Naming Conventions

| Purpose | Pattern | Examples |
|---------|---------|----------|
| Repository | `{{Entity}}Repository.js` | `GaugeRepository.js`, `CalibrationRepository.js` |
| Service | `{{Entity}}Service.js` or `{{Operation}}Service.js` | `GaugeCreationService.js`, `TransfersService.js` |
| Route | `{{plural}}.js` or `{{module}}-{{feature}}.js` | `gauges.js`, `gauge-tracking-transfers.js` |
| Domain Entity | `{{Entity}}Entity.js` | `GaugeEntity.js`, `GaugeSet.js` |
| Exception | `{{Domain}}Exception.js` or `DomainValidationError.js` | `DomainValidationError.js` |
| Mapper | `{{Entity}}DTOMapper.js` | `GaugeDTOMapper.js` |
| Presenter | `{{Entity}}Presenter.js` | `GaugePresenter.js` |
| Query | `{{entity}}Queries.js` | `gaugeQueries.js` |

### 1.4 Database Schema Patterns

**Main Table Pattern**:
```sql
CREATE TABLE gauges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gauge_id VARCHAR(50) UNIQUE NOT NULL,      -- Universal identifier
  set_id VARCHAR(50),                         -- For paired gauges
  custom_id VARCHAR(50),
  name VARCHAR(255),
  equipment_type ENUM('thread_gauge', 'hand_tool', ...),
  category_id INT,
  status ENUM('available', 'checked_out', ...),
  is_spare TINYINT(1),
  is_sealed TINYINT(1),
  is_active TINYINT(1),
  is_deleted TINYINT(1),
  created_by INT,
  ownership_type VARCHAR(50),
  employee_owner_id INT,
  customer_id INT,
  purchase_info VARCHAR(255),
  manufacturer VARCHAR(255),
  model_number VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Specification Table Pattern** (multi-table approach):
```sql
CREATE TABLE gauge_thread_specifications (
  gauge_id INT PRIMARY KEY,
  thread_size VARCHAR(50),
  thread_class VARCHAR(50),
  thread_type VARCHAR(50),
  thread_form VARCHAR(50),
  gauge_type ENUM('plug', 'ring'),
  thread_hand VARCHAR(50),
  acme_starts INT,
  is_go_gauge TINYINT(1),
  FOREIGN KEY (gauge_id) REFERENCES gauges(id)
);

-- Similar tables for:
CREATE TABLE gauge_hand_tool_specifications
CREATE TABLE gauge_large_equipment_specifications
CREATE TABLE gauge_calibration_standard_specifications
```

**Supporting Tables Pattern**:
```sql
-- Tracking tables
CREATE TABLE gauge_active_checkouts
CREATE TABLE gauge_transfers
CREATE TABLE gauge_unseal_requests
CREATE TABLE gauge_calibrations
CREATE TABLE gauge_qc_checks

-- Metadata tables
CREATE TABLE gauge_categories
CREATE TABLE gauge_calibration_schedule

-- Audit trail
CREATE TABLE audit_logs
```

---

## Part 2: Frontend Architecture Analysis

### 2.1 Directory Structure (Component-Driven)

```
frontend/src/modules/gauge/
├── components/                 # 40+ React components
│   ├── GaugeList.tsx          # Main list view (page component)
│   ├── GaugeRow.tsx            # Table row component
│   ├── GaugeFilters.tsx        # Filter panel
│   ├── SearchInput.tsx         # Search box
│   ├── SummaryCards.tsx        # Statistics cards
│   ├── GaugeModalManager.tsx   # Modal orchestration
│   ├── EditGaugeModal.tsx      # Edit dialog
│   ├── CheckinModal.tsx        # Checkin workflow
│   ├── CheckoutModal.tsx       # Checkout workflow
│   ├── TransferModal.tsx       # Transfer workflow
│   ├── UnsealRequestModal.tsx  # Unseal request workflow
│   ├── QCApprovalsModal.tsx    # QC approval workflow
│   ├── OutOfServiceReviewModal.tsx
│   ├── AddGaugeWizard.tsx      # Multi-step creation (Phase 6)
│   ├── creation/               # Creation workflow
│   │   ├── CreateGaugeWorkflow.tsx
│   │   ├── GaugeIdInput.tsx
│   │   ├── forms/
│   │   │   ├── CalibrationStandardForm.tsx
│   │   │   ├── HandToolForm.tsx
│   │   │   ├── LargeEquipmentForm.tsx
│   │   │   └── ThreadGaugeForm.tsx
│   │   └── steps/
│   │       ├── CategorySelectionStep.tsx
│   │       ├── DetailsFormStep.tsx
│   │       ├── EquipmentTypeStep.tsx
│   │       ├── ReviewConfirmStep.tsx
│   │       └── SetIdEditor.tsx
│   └── [15+ more components...]
├── pages/                      # Page components
│   ├── GaugeList.tsx          # Main list page
│   └── index.ts
├── hooks/                      # Custom React hooks
│   ├── useGauges.ts           # Data fetching
│   ├── useGaugeOperations.ts  # CRUD mutations
│   ├── useGaugeFilters.ts     # Filter state
│   ├── useGaugeQueries.ts     # History queries
│   ├── useAdminAlerts.ts      # Admin stats
│   ├── useCategoryCounts.ts   # Category stats
│   ├── useDashboardStats.ts   # Dashboard metrics
│   └── useGaugeCategorization.ts
├── context/                    # React Context
│   └── index.tsx              # GaugeProvider, useGaugeContext
├── services/                   # API client layer
│   ├── gaugeService.ts        # REST API methods
│   ├── certificateService.ts  # Certificate operations
│   └── index.ts
├── types/                      # TypeScript definitions
│   └── index.ts
├── constants/                  # Configuration
│   └── formConstants.ts
├── utils/                      # Utilities
├── permissions.ts             # Role-based access control
├── navigation.ts              # Route definitions
└── index.ts                   # Module exports
```

### 2.2 Core Frontend Patterns

#### Pattern 1: State Management (Zustand)

**Store Pattern** (via `useGaugeState`, `useGaugeActions`):
```typescript
// In infrastructure/store (centralized)
// Module accesses through hooks:
const gaugeState = useGaugeState(); // Read-only state
const gaugeActions = useGaugeActions(); // State mutations

// Available state:
- selectedGaugeId: string | null
- filters: Partial<GaugeFilters>
- sortBy: string
- sortOrder: 'asc' | 'desc'
- viewMode: 'grid' | 'list'

// Available actions:
- setSelectedGauge(id)
- updateGaugeFilters(filters)
- setGaugeSort(sortBy, sortOrder)
- setGaugeViewMode(mode)
```

**Context Pattern** (React Context):
```typescript
interface GaugeContextType {
  // State properties
  selectedGaugeId: string | null;
  filters: Partial<GaugeFilters>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  
  // Actions
  setSelectedGauge: (id: string | null) => void;
  updateFilters: (filters: Partial<GaugeFilters>) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  
  // Events
  emitGaugeEvent: (event: string, data: GaugeEventData) => void;
}

export const GaugeProvider = ({ children }) => {
  const gaugeState = useGaugeState();
  const gaugeActions = useGaugeActions();

  return (
    <GaugeContext.Provider value={{ ...gaugeState, ...gaugeActions }}>
      {children}
    </GaugeContext.Provider>
  );
};

export const useGaugeContext = () => {
  const context = useContext(GaugeContext);
  if (!context) throw new Error('Must be within GaugeProvider');
  return context;
};
```

#### Pattern 2: Data Fetching (React Query + Hooks)

**Query Hook Pattern**:
```typescript
export const useGauges = (filters?: GaugeFilters) => {
  const { filters: contextFilters } = useGaugeContext();
  const activeFilters = filters || contextFilters;

  return useQuery({
    queryKey: ['gauges', activeFilters],
    queryFn: () => gaugeService.getAll(activeFilters),
    staleTime: 30000,              // 30 seconds
    refetchOnWindowFocus: false,
    keepPreviousData: true,        // Maintain old data while fetching new
  });
};

export const useGauge = (id: string) => {
  return useQuery({
    queryKey: ['gauge', id],
    queryFn: () => gaugeService.getById(id),
    enabled: !!id,
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });
};
```

**Mutation Hook Pattern**:
```typescript
export const useGaugeMutations = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { emitGaugeEvent } = useGaugeContext();

  const checkout = useMutation({
    mutationFn: ({ id, data }) => gaugeService.checkout(id, data),
    onSuccess: (response, variables) => {
      emitGaugeEvent('gauge:checked_out', { 
        gaugeId: variables.id, 
        gauge: response.data 
      });
      queryClient.invalidateQueries({ queryKey: ['gauges'] });
    },
    onError: (error) => {
      toast.error('Checkout Failed', error.message);
    }
  });

  // Similar patterns for: return, transfer, qcVerify, etc.
  
  return { checkout, returnGauge, transfer, qcVerify, ... };
};
```

#### Pattern 3: Service Layer (API Client)

**Service Pattern** (`gaugeService.ts`):
```typescript
export class GaugeService {
  // List with filtering
  async getAll(params?: {
    status?: string;
    category?: string;
    search?: string;
    equipment_type?: string;
    page?: number;
    limit?: number;
  }): Promise<GaugeListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });
    
    const url = `/gauges${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.get<GaugeListResponse>(url);
    return response;
  }

  // Single entity retrieval
  async getById(id: string): Promise<Gauge> {
    const response = await apiClient.get<{ data: Gauge }>(`/gauges/${id}`);
    return response.data || response;
  }

  // Operational workflows
  async checkout(id: string, data: CheckoutData): Promise<ApiResponse<Gauge>> {
    return apiClient.post<ApiResponse<Gauge>>(`/gauges/tracking/${id}/checkout`, data);
  }

  async return(id: string, data: ReturnData): Promise<ApiResponse<Gauge>> {
    return apiClient.post<ApiResponse<Gauge>>(`/gauges/tracking/${id}/return`, data);
  }

  async transfer(id: string, data: TransferData): Promise<ApiResponse<Gauge>> {
    return apiClient.post<ApiResponse<Gauge>>(`/gauges/tracking/transfers`, {
      gauge_id: id,
      to_user_id: parseInt(data.to_user_id),
      reason: data.reason
    });
  }

  // ... more operations
}
```

#### Pattern 4: Component Patterns

**Page Component Pattern** (`GaugeList.tsx`):
```typescript
export function GaugeList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State management
  const [selectedGauge, setSelectedGauge] = useState<Gauge | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(() => 
    sessionStorage.getItem('gaugeList_searchTerm') || ''
  );

  // Context & hooks
  const { filters } = useGaugeContext();
  const { data, isLoading, error, refetch } = useGauges(activeFilters);
  const { pendingQCCount, outOfServiceCount } = useAdminAlerts();
  
  // Memoized computed values
  const pageTitle = useMemo(() => {
    const equipmentType = searchParams.get('equipment_type');
    return equipmentType ? capitalize(equipmentType) : 'All Gauges';
  }, [searchParams]);

  // Persistence
  useEffect(() => {
    sessionStorage.setItem('gaugeList_searchTerm', searchTerm);
  }, [searchTerm]);

  // Component composition
  return (
    <>
      <PageHeader title={pageTitle} />
      <SummaryCards stats={stats} />
      <GaugeFilters onFilterChange={handleFilterChange} />
      <DataTable
        columns={tableColumns}
        data={filteredGauges}
        onRowClick={handleRowClick}
        resetKey={resetTableKey}
      />
      {selectedGauge && modalType && (
        <GaugeModalManager
          selectedGauge={selectedGauge}
          modalType={modalType}
          onClose={handleModalClose}
          onRefetch={refetch}
        />
      )}
    </>
  );
}
```

**Modal Component Pattern** (`GaugeModalManager.tsx`):
```typescript
interface GaugeModalManagerProps {
  selectedGauge: Gauge | null;
  modalType: string | null;
  onClose: () => void;
  onRefetch: () => void;
}

export function GaugeModalManager({
  selectedGauge,
  modalType,
  onClose,
  onRefetch,
}: GaugeModalManagerProps) {
  // State
  const [showUnsealModal, setShowUnsealModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Hooks
  const { user, permissions } = useAuth();
  const { checkout, return: returnMutation, transfer } = useGaugeOperations();
  const { certificates, loadCertificates } = useCertificateManagement(selectedGauge?.gauge_id);

  // Effects
  useEffect(() => {
    if (selectedGauge && modalType === 'details') {
      setActiveTab('details');
    }
  }, [selectedGauge, modalType]);

  // Handlers
  const handleCheckout = async (data: CheckoutData) => {
    await checkout.mutateAsync({ id: selectedGauge!.id, data });
    onRefetch();
  };

  // Rendering
  return (
    <Modal isOpen={!!selectedGauge} onClose={onClose} title={selectedGauge?.gauge_id}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="certs">Certificates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          {/* Details tab content */}
        </TabsContent>
        
        {/* More tabs */}
      </Tabs>
    </Modal>
  );
}
```

**Form Component Pattern**:
```typescript
interface ThreadGaugeFormProps {
  initialData?: Partial<GaugeCreationData>;
  onSubmit: (data: GaugeCreationData) => Promise<void>;
  isLoading?: boolean;
}

export function ThreadGaugeForm({
  initialData = {},
  onSubmit,
  isLoading = false
}: ThreadGaugeFormProps) {
  const [formData, setFormData] = useState<GaugeCreationData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof GaugeCreationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = validateThreadGaugeData(formData);
      await onSubmit(validated);
    } catch (error) {
      setErrors(parseValidationErrors(error));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormSection title="Thread Specifications">
        <FormInput
          label="Thread Size"
          value={formData.thread_size || ''}
          onChange={(e) => handleChange('thread_size', e.target.value)}
          error={errors.thread_size}
        />
        <FormInput
          label="Thread Class"
          value={formData.thread_class || ''}
          onChange={(e) => handleChange('thread_class', e.target.value)}
        />
      </FormSection>
      
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

#### Pattern 5: Type Definitions

**Type Organization** (`types/index.ts`):
```typescript
// Entity types
export interface Gauge {
  id: string;
  gauge_id: string;              // Universal public identifier
  set_id?: string | null;        // For thread gauge sets
  name: string;
  displayName?: string;          // Computed from backend
  equipment_type: EquipmentType;
  status: GaugeStatus;
  is_sealed?: number | boolean;
  storage_location: string;
  manufacturer?: string;
  // ... 30+ fields
}

export type EquipmentType = 
  | 'thread_gauge' 
  | 'hand_tool' 
  | 'large_equipment' 
  | 'calibration_standard';

export type GaugeStatus =
  | 'available'
  | 'checked_out'
  | 'pending_qc'
  | 'pending_transfer'
  | 'out_of_service'
  | 'retired';

// Operational types
export interface CheckoutData {
  assigned_to_user_id?: number;
  expected_return?: string;
  notes?: string;
}

export interface ReturnData {
  condition_at_return: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  return_notes?: string;
  usage_hours?: number;
}

export interface TransferData {
  to_user_id: string;
  reason: string;
  note?: string;
}

// API response types
export interface GaugeListResponse {
  data: Gauge[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions
export function getGaugeDisplayName(gauge: Gauge): string {
  return gauge.gauge_id;
}

export function isSpareThreadGauge(gauge: Gauge): boolean {
  return gauge.equipment_type === 'thread_gauge' && gauge.is_spare;
}
```

### 2.3 Frontend File Naming Conventions

| Purpose | Pattern | Examples |
|---------|---------|----------|
| Page Component | `{{Entity}}{{Feature}}.tsx` | `GaugeList.tsx`, `GaugeDashboard.tsx` |
| Modal Component | `{{Action}}Modal.tsx` | `CheckoutModal.tsx`, `TransferModal.tsx` |
| Form Component | `{{Entity}}Form.tsx` or `{{Feature}}Form.tsx` | `ThreadGaugeForm.tsx`, `EditGaugeForm.tsx` |
| List/Row Component | `{{Entity}}Row.tsx` or `{{Entity}}List.tsx` | `GaugeRow.tsx` |
| Filter Component | `{{Entity}}Filters.tsx` | `GaugeFilters.tsx` |
| Hook | `use{{Entity}}{{Feature}}.ts` | `useGauges.ts`, `useGaugeOperations.ts` |
| Service | `{{entity}}Service.ts` | `gaugeService.ts`, `certificateService.ts` |
| Type Definition | `index.ts` in `types/` folder | `types/index.ts` |
| Context | `index.tsx` in `context/` folder | `context/index.tsx` |
| Constant | `{{feature}}Constants.ts` | `formConstants.ts` |

### 2.4 Infrastructure Dependencies

**Centralized Infrastructure Components Used**:
```typescript
// From infrastructure/components
import { 
  Button,                // Standard button with variants
  Modal,                 // Accessible modal
  Badge,                 // Status badges
  DetailRow,             // Display row with label/value
  SectionHeader,         // Section titles
  InfoCard,              // Info display card
  FileInput,             // File upload
  FormInput,             // Form input field
  FormCheckbox,          // Checkbox
  FormTextarea,          // Textarea
  FormSection,           // Form section grouping
  LocationDisplay,       // Location hierarchy display
  DataTable,             // Advanced table with sorting/filtering
  Icon,                  // Icon component
  LoadingSpinner,        // Loading indicator
  Pagination,            // Pagination controls
  Tabs, TabsList, TabsTrigger, TabsContent  // Tab UI
} from '../../../infrastructure';

// From infrastructure hooks
import { 
  useToast,             // Toast notifications
  useAuth,              // Authentication
  useEventBus,          // Event system
  useImmediateModal,    // Modal utils
  useCertificateManagement // Certificate CRUD
} from '../../../infrastructure';

// From infrastructure API
import { apiClient } from '../../../infrastructure/api/client';
import { eventBus } from '../../../infrastructure/events';

// From infrastructure business rules
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { TextFormatRules } from '../../../infrastructure/business/textFormatRules';
```

---

## Part 3: Template Specification

### 3.1 Template Variables (Parameterization)

#### Core Configuration Variables

```yaml
# Entity configuration
ENTITY_NAME:               "Gauge" (example)
ENTITY_NAME_PLURAL:        "Gauges"
ENTITY_NAME_LOWERCASE:     "gauge"
ENTITY_NAME_LOWERCASE_PLURAL: "gauges"
ENTITY_SLUG:               "gauge" (for routes)
ENTITY_TABLE:              "gauges" (database table)
ENTITY_PRIMARY_KEY:        "id" (usually 'id')
ENTITY_BUSINESS_ID:        "gauge_id" (universal identifier)

# Equipment types (if applicable)
EQUIPMENT_TYPES:           # Array of enum values
  - "thread_gauge"
  - "hand_tool"
  - "large_equipment"
  - "calibration_standard"

# Status enum (if applicable)
STATUSES:                  # Array of status values
  - "available"
  - "checked_out"
  - "pending_qc"
  - "out_of_service"
  - "retired"

# Specification tables (entity-specific)
SPEC_TABLES:               # Dict mapping equipment_type → table_name
  thread_gauge: "gauge_thread_specifications"
  hand_tool: "gauge_hand_tool_specifications"
  large_equipment: "gauge_large_equipment_specifications"
  calibration_standard: "gauge_calibration_standard_specifications"

# Core fields (always required)
CORE_FIELDS:
  - id (INT PRIMARY KEY AUTO_INCREMENT)
  - {{ENTITY_BUSINESS_ID}} (VARCHAR UNIQUE NOT NULL)
  - name (VARCHAR)
  - status (ENUM)
  - is_active (TINYINT(1))
  - is_deleted (TINYINT(1))
  - created_by (INT)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

# Entity-specific fields (custom)
CUSTOM_FIELDS:             # List of {{ field_name: type, ... }}
  # Examples for gauge:
  - { name: "set_id", type: "VARCHAR(50)" }
  - { name: "equipment_type", type: "ENUM(...)" }
  - { name: "category_id", type: "INT" }
  - { name: "is_sealed", type: "TINYINT(1)" }

# API routes
API_PREFIX:                "/api/{{ENTITY_NAME_LOWERCASE_PLURAL}}"
API_ROUTES:                # Map of endpoints
  list:   "GET    {{API_PREFIX}}"
  create: "POST   {{API_PREFIX}}"
  read:   "GET    {{API_PREFIX}}/:id"
  update: "PUT    {{API_PREFIX}}/:id"
  delete: "DELETE {{API_PREFIX}}/:id"

# Frontend features
FEATURES:
  - list_view: true
  - detail_view: true
  - create_modal: true
  - edit_modal: true
  - filters: [status, category, search]
  - checkout: true (if applicable)
  - transfer: false (if not applicable)
  - audit_logging: true

# Validation rules
VALIDATION_RULES:
  {{ENTITY_BUSINESS_ID}}: { required: true, unique: true }
  name: { required: true, max_length: 255 }
  status: { required: true, enum: [STATUSES] }
```

### 3.2 Parameterized File Templates

#### Backend: Repository Template

**File**: `backend/src/modules/{{entity}}/repositories/{{Entity}}Repository.js`

```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');
const { {{ENTITY_UPPER_SNAKE}}_WITH_RELATIONS, build{{Entity}}Query } = require('../queries');
const {{Entity}}DTOMapper = require('../mappers/{{Entity}}DTOMapper');

const SPEC_TABLES = {
  {{#SPEC_TABLES}}
  {{key}}: '{{value}}',
  {{/SPEC_TABLES}}
};

class {{Entity}}Repository extends BaseRepository {
  constructor(pool = null) {
    if (pool && typeof pool === 'object' && pool.execute) {
      super(pool, '{{ENTITY_TABLE}}');
    } else {
      super('{{ENTITY_TABLE}}', '{{ENTITY_PRIMARY_KEY}}');
    }
  }

  async findByPrimaryKey(id, connection = null) {
    try {
      return await this.get{{Entity}}ById(id, connection);
    } catch (error) {
      logger.error('{{Entity}}Repository.findByPrimaryKey failed:', { id, error: error.message });
      throw error;
    }
  }

  async _fetch{{Entity}}ByField(fieldName, fieldValue, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const { sql, params } = build{{Entity}}Query(
        `WHERE e.${fieldName} = ? AND e.is_deleted = 0`,
        [fieldValue]
      );
      const entities = await this.executeQuery(sql, params, conn);
      if (entities.length === 0) return null;

      const entity = entities[0];
      // Load specifications if applicable
      if (entity.equipment_type && SPEC_TABLES[entity.equipment_type]) {
        const specTable = this.getSpecTableFor(entity.equipment_type);
        const specs = await this.executeQuery(
          `SELECT * FROM \`${specTable}\` WHERE {{ENTITY_BUSINESS_ID}} = ?`,
          [entity.{{ENTITY_PRIMARY_KEY}}],
          conn
        );
        entity.specifications = specs[0] || null;
      }

      return {{Entity}}DTOMapper.transformToDTO(entity);
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  async get{{Entity}}ById(id, conn) {
    return await this._fetch{{Entity}}ByField('{{ENTITY_PRIMARY_KEY}}', id, conn);
  }

  async findBy{{Entity}}Id({{entity}}Id, connection = null) {
    return await this._fetch{{Entity}}ByField('{{ENTITY_BUSINESS_ID}}', {{entity}}Id, connection);
  }

  async create{{Entity}}({{entity}}Data, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();

      const dbData = {{Entity}}DTOMapper.transformFromDTO({{entity}}Data);
      const res = await this.executeQuery(
        `INSERT INTO {{ENTITY_TABLE}} ({{#CORE_FIELDS}}{{name}}, {{/CORE_FIELDS}}) VALUES (?, ...)`,
        [/* mapped values */],
        connection
      );

      const {{entity}}Id = res.insertId;

      // Create specifications if provided
      if (dbData.specifications && dbData.equipment_type) {
        const specTable = this.getSpecTableFor(dbData.equipment_type);
        // Insert specifications...
      }

      if (shouldCommit) await connection.commit();
      const created{{Entity}} = { {{ENTITY_PRIMARY_KEY}}: {{entity}}Id, ...dbData };
      return {{Entity}}DTOMapper.transformToDTO(created{{Entity}});
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create {{entity}}:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  getSpecTableFor(type) {
    const table = SPEC_TABLES[type];
    if (!table) throw new Error(`Unsupported equipment_type: ${type}`);
    return table;
  }
}

module.exports = {{Entity}}Repository;
```

#### Backend: Service Template

**File**: `backend/src/modules/{{entity}}/services/{{Entity}}CreationService.js`

```javascript
const BaseService = require('../../../infrastructure/services/BaseService');
const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');

class {{Entity}}CreationService extends BaseService {
  constructor({{entity}}Repository, otherRepository, options = {}) {
    super({{entity}}Repository, options);
    this.{{entity}}Repository = {{entity}}Repository;
    this.auditService = auditService;
  }

  async create{{Entity}}({{entity}}Data, userId) {
    try {
      // 1. Validate
      this._validate{{Entity}}Data({{entity}}Data);

      // 2. Prepare
      const prepared = this._prepare{{Entity}}Data({{entity}}Data, userId);

      // 3. Execute transaction
      return await this.repository.create{{Entity}}(prepared);
    } catch (error) {
      logger.error('{{Entity}} creation failed:', error);
      throw error;
    }
  }

  async _logAuditAction(action, recordId, userId, details = {}) {
    await this.auditService.logAction({
      module: '{{entity}}',
      action,
      tableName: '{{ENTITY_TABLE}}',
      recordId,
      userId: userId || null,
      ...details
    });
  }

  _validate{{Entity}}Data(data) {
    // Implement validation
  }

  _prepare{{Entity}}Data(data, userId) {
    return {
      ...data,
      created_by: userId
    };
  }
}

module.exports = {{Entity}}CreationService;
```

#### Backend: Route Template

**File**: `backend/src/modules/{{entity}}/routes/{{entities}}.js`

```javascript
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

const validateCreate = [
  body('name').notEmpty().withMessage('Name is required'),
  body('status').isIn(['{{STATUSES.join("', '")}}'])
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET {{API_PREFIX}}
router.get('/',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const {{entity}}Service = serviceRegistry.get('{{Entity}}Service');
    const entities = await {{entity}}Service.getAll(req.query);
    res.json({ success: true, data: entities });
  })
);

// POST {{API_PREFIX}}
router.post('/',
  authenticateToken,
  validateCreate,
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    const {{entity}}Service = serviceRegistry.get('{{Entity}}Service');
    const created = await {{entity}}Service.create(req.body, req.user.id);
    res.status(201).json({ success: true, data: created });
  })
);

// GET {{API_PREFIX}}/:id
router.get('/:id',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const {{entity}}Service = serviceRegistry.get('{{Entity}}Service');
    const entity = await {{entity}}Service.getById(req.params.id);
    if (!entity) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: entity });
  })
);

module.exports = router;
```

#### Frontend: Hook Template

**File**: `frontend/src/modules/{{entity}}/hooks/use{{Entities}}.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {{entity}}Service } from '../services';
import { use{{Entity}}Context } from '../context';
import { useToast } from '../../../infrastructure';
import type { {{Entity}}, {{Entity}}Filters } from '../types';

export const use{{Entities}} = (filters?: {{Entity}}Filters) => {
  const { filters: contextFilters } = use{{Entity}}Context();
  const activeFilters = filters || contextFilters;

  return useQuery({
    queryKey: ['{{entities}}', activeFilters],
    queryFn: () => {{entity}}Service.getAll(activeFilters),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};

export const use{{Entity}} = (id: string) => {
  return useQuery({
    queryKey: ['{{entity}}', id],
    queryFn: () => {{entity}}Service.getById(id),
    enabled: !!id,
    staleTime: 60000,
    retry: 2,
  });
};

export const use{{Entity}}Mutations = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const create = useMutation({
    mutationFn: (data: {{Entity}}) => {{entity}}Service.create(data),
    onSuccess: () => {
      toast.success('Created', '{{Entity}} created successfully');
      queryClient.invalidateQueries({ queryKey: ['{{entities}}'] });
    },
    onError: (error: Error) => {
      toast.error('Failed', error.message);
    }
  });

  return { create };
};
```

#### Frontend: Page Component Template

**File**: `frontend/src/modules/{{entity}}/pages/{{Entity}}List.tsx`

```typescript
import { useState, useEffect, useMemo } from 'react';
import { use{{Entities}} } from '../hooks/use{{Entities}}';
import { use{{Entity}}Context } from '../context';
import { DataTable, Button, LoadingSpinner } from '../../../infrastructure';
import type { {{Entity}}, {{Entity}}Filters } from '../types';

export function {{Entity}}List() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);

  const { filters } = use{{Entity}}Context();
  const { data, isLoading, error, refetch } = use{{Entities}}();

  const entities = data?.data || [];

  const tableColumns = [
    { accessorKey: '{{ENTITY_BUSINESS_ID}}', header: 'ID', size: 100 },
    { accessorKey: 'name', header: 'Name', size: 200 },
    { accessorKey: 'status', header: 'Status', size: 100 },
    { accessorKey: 'created_at', header: 'Created', size: 150 },
  ];

  return (
    <div>
      <h1>{{Entity}} List</h1>
      
      {isLoading && <LoadingSpinner />}
      {error && <div>Error loading {{entities}}</div>}
      
      <DataTable
        columns={tableColumns}
        data={entities}
        onRowClick={(row) => {
          setSelectedId(row.original.id);
          setModalType('details');
        }}
      />

      <Button onClick={() => setModalType('create')}>
        Add {{Entity}}
      </Button>
    </div>
  );
}
```

#### Frontend: Type Definition Template

**File**: `frontend/src/modules/{{entity}}/types/index.ts`

```typescript
export type {{Entity}}Status = 
  {{#STATUSES}}
  | '{{.}}'
  {{/STATUSES}};

export interface {{Entity}} {
  id: string;
  {{ENTITY_BUSINESS_ID}}: string;
  name: string;
  status: {{Entity}}Status;
  created_at: string;
  updated_at: string;
  {{#CUSTOM_FIELDS}}
  {{name}}: {{type}};
  {{/CUSTOM_FIELDS}}
}

export interface {{Entity}}CreationData {
  name: string;
  status: {{Entity}}Status;
  {{#CUSTOM_FIELDS}}
  {{name}}?: {{type}};
  {{/CUSTOM_FIELDS}}
}

export interface {{Entity}}Filters {
  status?: {{Entity}}Status;
  search?: string;
  {{#CUSTOM_FILTER_FIELDS}}
  {{name}}?: {{type}};
  {{/CUSTOM_FILTER_FIELDS}}
}

export interface {{Entity}}ListResponse {
  data: {{Entity}}[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3.3 Required Directory Structure for New Module

```
backend/src/modules/{{entity}}/
├── domain/
│   ├── {{Entity}}Entity.js
│   ├── {{Entity}}Set.js (if applicable)
│   └── DomainValidationError.js
├── repositories/
│   ├── {{Entity}}Repository.js (main CRUD)
│   ├── {{Entity}}QueryRepository.js (read-only queries)
│   └── [Specialized repositories for sub-entities]
├── services/
│   ├── {{Entity}}CreationService.js
│   ├── {{Entity}}SearchService.js
│   ├── {{Entity}}Service.js (coordinator)
│   └── [Specialized services for workflows]
├── mappers/
│   ├── {{Entity}}DTOMapper.js
│   └── {{Entity}}SQLBuilder.js (if needed)
├── presenters/
│   └── {{Entity}}Presenter.js
├── routes/
│   ├── index.js (aggregation)
│   ├── {{entities}}.js (main CRUD)
│   └── [Feature routes: operations, workflows, etc.]
├── middleware/
│   └── validation.js
├── queries/
│   ├── {{entity}}Queries.js
│   └── index.js
├── utils/
│   └── [Custom utilities]
├── migrations/
│   └── [SQL migration files]
└── tests/
    ├── integration/
    └── unit/

frontend/src/modules/{{entity}}/
├── components/
│   ├── {{Entity}}List.tsx (list page)
│   ├── {{Entity}}Row.tsx (table row)
│   ├── {{Entity}}Filters.tsx (filter panel)
│   ├── {{Entity}}ModalManager.tsx (modal orchestration)
│   ├── Create{{Entity}}Modal.tsx
│   ├── Edit{{Entity}}Modal.tsx
│   ├── creation/ (multi-step creation)
│   │   ├── Create{{Entity}}Workflow.tsx
│   │   └── steps/
│   └── [Feature components: workflows, modals, etc.]
├── pages/
│   ├── {{Entity}}List.tsx (page component)
│   └── index.ts
├── hooks/
│   ├── use{{Entities}}.ts (queries & mutations)
│   ├── use{{Entity}}Operations.ts (workflow mutations)
│   ├── use{{Entity}}Filters.ts (filter state)
│   └── index.ts
├── context/
│   └── index.tsx (state + event provider)
├── services/
│   ├── {{entity}}Service.ts (API client)
│   └── index.ts
├── types/
│   └── index.ts (TypeScript definitions)
├── constants/
│   └── formConstants.ts
├── utils/
│   └── [Custom utilities]
├── permissions.ts (RBAC)
├── navigation.ts (route definitions)
└── index.ts (module exports)
```

### 3.4 Configuration & Integration Checklist

#### Backend Integration Checklist

- [ ] Register module routes in `backend/src/routes/index.js`
- [ ] Register services in ServiceRegistry: `backend/src/infrastructure/services/ServiceRegistry.js`
- [ ] Add table to BaseRepository whitelist: `backend/src/infrastructure/repositories/BaseRepository.js`
- [ ] Create migration files: `backend/src/modules/{{entity}}/migrations/`
- [ ] Add audit logging: Implement module-specific audit actions
- [ ] Add database connection pooling: Use shared pool from infrastructure
- [ ] Implement transaction management: Use `BaseService.executeInTransaction()`
- [ ] Add error handling middleware: Leverage existing error handlers
- [ ] Document API endpoints: Update API documentation/OpenAPI spec

#### Frontend Integration Checklist

- [ ] Register module routes in `frontend/src/routing/` (if using separate routing)
- [ ] Wrap module with Provider: `<{{Entity}}Provider><{{Entity}}List /></{{Entity}}Provider>`
- [ ] Add module to navigation: `frontend/src/modules/{{entity}}/navigation.ts`
- [ ] Export module in main index: `frontend/src/modules/{{entity}}/index.ts`
- [ ] Add permissions/RBAC: `frontend/src/modules/{{entity}}/permissions.ts`
- [ ] Use centralized infrastructure components (Button, Modal, Form, etc.)
- [ ] Integrate with Zustand store (if state management needed)
- [ ] Add React Query cache invalidation strategies
- [ ] Configure API base path: `/api/{{entities}}`
- [ ] Add TypeScript strict mode compliance

---

## Part 4: Business Logic Patterns (Gauge-Specific)

### 4.1 Gauge-Specific Patterns (Not Generalizable)

These patterns are specific to the gauge module and should NOT be included in generic templates:

**Serial Number System**:
- `gauge_id` as universal public identifier (serial number for thread gauges)
- System-generated IDs for other equipment types
- Extraction of GO/NO-GO suffixes from gauge_id

**Set Management**:
- Paired gauges (GO + NO-GO) grouped by `set_id`
- Spare gauges without set_id
- Specifications stored in separate tables per equipment type

**Multi-Table Specifications**:
- Thread specifications table
- Hand tool specifications table
- Large equipment specifications table
- Calibration standard specifications table

**Tracking & Workflows**:
- Checkout/return workflows
- Transfer operations between users
- Calibration scheduling and tracking
- Unseal request workflows
- QC approval workflows
- Certificate management

**Status Machine**:
- Available, checked_out, pending_qc, calibration_due, out_of_service, retired, etc.
- Status-specific operations and permissions

### 4.2 Generic Patterns (Templateable)

**CRUD Pattern** (Generalizable):
1. Repository implements findByPrimaryKey(), findByBusinessIdentifier()
2. Service provides create(), read(), update(), delete()
3. Routes expose REST endpoints with validation
4. Frontend uses React Query hooks + service layer

**DTO Transformation Pattern** (Generalizable):
1. Database layer uses snake_case
2. DTO layer provides camelCase
3. Presenter layer adds computed fields (displayName, etc.)
4. Mapper handles bidirectional transformation

**Validation Pattern** (Generalizable):
1. Domain validation (entity rules)
2. Field validation (express-validator middleware)
3. Service-level validation (business rules)
4. Type validation (TypeScript frontend)

**Transaction Pattern** (Generalizable):
1. Begin transaction
2. Execute operations
3. Audit log on success
4. Rollback on error
5. Release connection

**State Management Pattern** (Generalizable):
1. Zustand for global state
2. React Context for module state
3. React Query for server state
4. Event bus for cross-module communication

---

## Part 5: Implementation Roadmap for Template Generator

### Phase 1: Infrastructure Setup
1. Create template files with variable placeholders
2. Build template variable configuration schema
3. Implement string substitution engine
4. Create validation for template variables

### Phase 2: Backend Code Generation
1. Generate repository classes
2. Generate service classes
3. Generate route handlers
4. Generate migration files
5. Generate database entity files

### Phase 3: Frontend Code Generation
1. Generate page components
2. Generate modal/form components
3. Generate hooks (queries & mutations)
4. Generate type definitions
5. Generate context/provider

### Phase 4: Integration & Validation
1. Validate generated code syntax
2. Check for missing imports
3. Verify database schema compatibility
4. Lint generated code
5. Generate module index exports

### Phase 5: Documentation
1. Auto-generate API documentation
2. Auto-generate component props documentation
3. Create module architecture diagram
4. Document custom patterns

---

## Appendix A: Key File Metrics

### Backend Service Size Analysis
```
GaugeSetService        816 lines (complex set operations)
CertificateService     953 lines (certificate lifecycle)
GaugeCheckoutService   738 lines (checkout workflows)
GaugeCreationService   546 lines (creation workflows)
GaugeCascadeService    555 lines (cascade deletions)

Pattern: Services averaging 300-400 lines (sweet spot)
         Services >500 lines indicate need for decomposition
```

### Backend Repository Size Analysis
```
Base operations: 100-150 lines
Specialized queries: 150-250 lines (e.g., findSpareThreadGauges)
Multi-table operations: 250-350 lines (e.g., createGauge with specs)
```

### Frontend Component Size
```
Page components:       200-400 lines
Modal components:      300-600 lines
Form components:       150-350 lines
List row components:   100-200 lines
Filter components:     150-300 lines
```

---

## Appendix B: Quality Standards Enforced

### Backend Quality Gates
1. **Validation**: All inputs validated via express-validator or domain validation
2. **Authentication**: All routes require `authenticateToken` middleware
3. **Transactions**: Multi-step operations use transaction wrappers
4. **Audit Logging**: All mutations logged to audit trail
5. **Error Handling**: Custom error classes for domain errors
6. **Connection Management**: Proper pool release semantics
7. **SQL Safety**: Parameterized queries, whitelist validation

### Frontend Quality Gates
1. **Type Safety**: Full TypeScript with strict mode
2. **Component Composition**: Centralized infrastructure components only
3. **State Management**: Zustand + React Query (no prop drilling)
4. **Accessibility**: Built into infrastructure components
5. **Performance**: Memoization, lazy loading, code splitting
6. **Testing**: Structure supports unit/integration/E2E tests
7. **Error Handling**: Toast notifications + error boundaries

---

## Summary of Parameterizable Elements

### Core Parameterization
```
Entity Name → {{Entity}}, {{entity}}, {{ENTITY}}, {{entities}}
Table Name → {{ENTITY_TABLE}} (usually lowercase plural)
Primary Key → {{ENTITY_PRIMARY_KEY}} (default: 'id')
Business ID → {{ENTITY_BUSINESS_ID}} (e.g., gauge_id)
Equipment Types → {{EQUIPMENT_TYPES}} (enum array)
Statuses → {{STATUSES}} (enum array)
Custom Fields → {{CUSTOM_FIELDS}} (field definitions)
API Prefix → {{API_PREFIX}} (/api/{{entities}})
Routes → {{ROUTE_*}} (for each REST operation)
```

### Database Pattern
```
Main table with:
  - Standard CRUD fields
  - Soft delete (is_deleted)
  - Audit fields (created_by, created_at, updated_at)
  - Equipment-type specific fields (optional)

Specification tables (one per equipment type):
  - Store type-specific attributes
  - Foreign key to main table

Supporting tables:
  - Relationships (sets, transfers, etc.)
  - Audit trail
  - Status history
```

### Service Organization
```
{{Entity}}Service           - Main coordinator (queries)
{{Entity}}CreationService   - Creation workflows
{{Entity}}SearchService     - Search/filter logic
{{Entity}}{{Feature}}Service - Feature-specific services
```

---

## Conclusion

The gauge module provides a **production-grade template** for building enterprise modules. Its architecture demonstrates:

✅ Clear separation of concerns (domain, repository, service, presenter, route)  
✅ Transaction safety with audit logging  
✅ Type-safe frontend with Zustand + React Query  
✅ Parameterizable patterns for template generation  
✅ Comprehensive validation at multiple layers  
✅ Centralized infrastructure components  
✅ Event-driven cross-module communication  

**Next Steps for Template System**:
1. Create parameterized template files
2. Build template variable schema & validation
3. Implement code generation engine
4. Add quality gates (linting, type checking)
5. Create wizard/CLI for module scaffold

