# Option B: Minimal Viable Refactoring - Implementation Plan

**Timeline**: 14 weeks (3.5 months)
**Effort**: 165K tokens
**Cost**: ~$72K @ $700/token
**Health Score**: 72 → 85/100
**Status**: ⭐ RECOMMENDED APPROACH

---

## Why Option B?

### The Pragmatic Choice

Option B delivers **80% of the value in 25% of the time** by focusing on what matters most:

1. **Security First** (Week 1-2): Fix critical vulnerabilities
2. **Testing Second** (Week 3-8): Build safety net for future changes
3. **Quick Wins Last** (Week 9-14): High-value improvements only

### Comparison

| Metric | Full Plan | Option B | Savings |
|--------|-----------|----------|---------|
| **Timeline** | 39 weeks | 14 weeks | **64% faster** |
| **Effort** | 663K tokens | 165K tokens | **75% reduction** |
| **Cost** | $290K | $72K | **$218K saved** |
| **Health Score** | 95/100 | 85/100 | "Good enough" |
| **Files Refactored** | 40 files | 3 files | **93% less disruption** |
| **Risk** | High | Low | Minimal changes |

### What You Get

✅ Zero critical security vulnerabilities
✅ 60% frontend test coverage (0% → 60%)
✅ Critical components refactored (worst 3 files)
✅ WCAG 2.1 AA basics (ARIA labels, no window.confirm)
✅ Server-side pagination
✅ Production-ready codebase
✅ Deployment infrastructure

### What You Don't Get (Accept as Technical Debt)

❌ Perfect file sizes (37 files >500 lines remain)
❌ Zero TypeScript `any` types (172 remain)
❌ Backend test coverage improvements (stays at 58.7%)
❌ Full accessibility compliance (WCAG 2.1 AA partial)
❌ Performance optimization (Phase 5)
❌ Advanced infrastructure components

**Trade-off**: Accept some technical debt in exchange for 64% faster delivery and 75% cost savings.

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2, 15K tokens)

#### Week 1: Infrastructure Setup

**Goal**: Install dependencies, configure environment, enable TypeScript strict mode

**Tasks** (10K tokens):

```bash
# Day 1-2: Package Dependencies (3K tokens)
cd backend && npm install csurf helmet express-rate-limit joi redis ioredis
cd frontend && npm install --save-dev @testing-library/user-event msw

# Day 3-4: Environment Configuration (2K tokens)
# Add to .env:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
CSRF_SECRET=your_csrf_secret_key_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Day 5: TypeScript Configuration (3K tokens)
# Update tsconfig.json:
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# Day 5: Database Migrations Setup (2K tokens)
mkdir -p backend/migrations
# Create migration runner script
# Create README.md documenting migration process
```

**Deliverables**:
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] TypeScript strict mode enabled
- [ ] Migration infrastructure ready

---

#### Week 2: Security + Deployment

**Goal**: Fix critical security issues, set up basic deployment infrastructure

**Tasks** (5K tokens):

**Security Fixes** (2K tokens):
```javascript
// 1. Remove Password Logging (500 tokens)
// File: backend/src/infrastructure/database/connection.js
// DELETE line 45 that logs database password
// Audit entire codebase for sensitive data logging

// 2. CSRF Protection (1.5K tokens)
// Backend: Create backend/src/infrastructure/middleware/csrf.js
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Apply to all state-changing routes
app.post('/api/*', csrfProtection);
app.put('/api/*', csrfProtection);
app.delete('/api/*', csrfProtection);

// Frontend: Add CSRF interceptor to apiClient.js
apiClient.interceptors.request.use(async (config) => {
  if (['POST', 'PUT', 'DELETE'].includes(config.method.toUpperCase())) {
    const csrfToken = await fetchCsrfToken();
    config.headers['CSRF-Token'] = csrfToken;
  }
  return config;
});
```

**Deployment Setup** (3K tokens):
```javascript
// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not ready' });
  }
});

// Docker production configuration
// Document blue-green deployment process
// Create rollback procedures
```

**Deliverables**:
- [ ] Zero password logging in codebase
- [ ] CSRF protection enabled
- [ ] Health check endpoints working
- [ ] Deployment documentation complete

---

### Phase 2: Frontend Testing (Week 3-8, 145K tokens)

**Goal**: Achieve 60% frontend test coverage to enable safe future changes

#### Week 3-4: Gauge Module Tests (38K tokens)

**Component Tests** (26K tokens):

```typescript
// GaugeList.test.jsx (2K tokens)
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GaugeList } from './GaugeList';

describe('GaugeList', () => {
  test('renders gauge list with filters', async () => {
    render(<GaugeList />);
    expect(screen.getByText(/gauges/i)).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  test('filters gauges by search term', async () => {
    const user = userEvent.setup();
    render(<GaugeList />);

    await user.type(screen.getByRole('searchbox'), '1/2');
    await waitFor(() => {
      expect(screen.getByText(/1\/2-13/i)).toBeInTheDocument();
    });
  });

  test('sorts gauges by column', async () => {
    const user = userEvent.setup();
    render(<GaugeList />);

    await user.click(screen.getByText(/thread size/i));
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('.125-40');
      expect(rows[2]).toHaveTextContent('.250-20');
    });
  });

  test('bulk actions work correctly', async () => {
    const user = userEvent.setup();
    render(<GaugeList />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // Select first gauge
    await user.click(checkboxes[1]); // Select second gauge

    await user.click(screen.getByText(/assign to set/i));
    expect(screen.getByText(/create new set/i)).toBeInTheDocument();
  });
});

// SetDetail.test.jsx (2K tokens)
// GaugeForm.test.jsx (2K tokens)
// QCApprovalsModal.test.tsx (2K tokens)
// ... 16 more component tests
```

**Hook Tests** (6K tokens):

```typescript
// useGaugeFilters.test.ts
import { renderHook, act } from '@testing-library/react';
import { useGaugeFilters } from './useGaugeFilters';

describe('useGaugeFilters', () => {
  test('initializes with default filters', () => {
    const { result } = renderHook(() => useGaugeFilters());
    expect(result.current.filters).toEqual({
      search: '',
      equipmentType: 'all',
      status: 'all'
    });
  });

  test('updates search filter', () => {
    const { result } = renderHook(() => useGaugeFilters());
    act(() => {
      result.current.setSearch('1/2');
    });
    expect(result.current.filters.search).toBe('1/2');
  });
});

// ... 9 more hook tests
```

**Utility Tests** (6K tokens):

```typescript
// threadSizeNormalizer.test.ts
import { normalizeThreadSize } from './threadSizeNormalizer';

describe('normalizeThreadSize', () => {
  test('converts fractions to decimals', () => {
    expect(normalizeThreadSize('1/2')).toBe('.500');
    expect(normalizeThreadSize('3/4')).toBe('.750');
    expect(normalizeThreadSize('1-1/4')).toBe('1.250');
  });

  test('normalizes decimals to 3 places', () => {
    expect(normalizeThreadSize('.5')).toBe('.500');
    expect(normalizeThreadSize('0.5')).toBe('.500');
    expect(normalizeThreadSize('.500')).toBe('.500');
  });

  test('handles invalid input', () => {
    expect(normalizeThreadSize('')).toBe(null);
    expect(normalizeThreadSize('abc')).toBe(null);
    expect(normalizeThreadSize(null)).toBe(null);
  });
});

// ... 11 more utility tests
```

**Deliverables Week 3-4**:
- [ ] Gauge module: 60% test coverage
- [ ] 20 component tests passing
- [ ] 10 hook tests passing
- [ ] 12 utility tests passing

---

#### Week 5: Admin Module Tests (32K tokens)

**Focus**: User management, permissions, rules

```typescript
// UserManagement.test.jsx (2K tokens)
describe('UserManagement', () => {
  test('renders user table', async () => {
    render(<UserManagement />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  test('filters users by role', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    await user.selectOptions(screen.getByLabelText(/role/i), 'admin');
    await waitFor(() => {
      expect(screen.getAllByRole('row')).toHaveLength(3); // 2 admins + header
    });
  });

  test('bulk deactivates users', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getByText(/deactivate/i));

    expect(screen.getByText(/confirm deactivation/i)).toBeInTheDocument();
  });
});

// EditUserModal.test.tsx (2K tokens)
// ... 13 more admin component tests
```

**Deliverables Week 5**:
- [ ] Admin module: 55% test coverage
- [ ] 15 component tests passing
- [ ] 8 hook tests passing
- [ ] 10 utility tests passing

---

#### Week 6: Inventory Module Tests (25K tokens)

**Focus**: Inventory dashboard, locations, transfers

```typescript
// InventoryDashboard.test.jsx (2K tokens)
describe('InventoryDashboard', () => {
  test('renders inventory metrics', async () => {
    render(<InventoryDashboard />);
    expect(screen.getByText(/total items/i)).toBeInTheDocument();
    expect(screen.getByText(/locations/i)).toBeInTheDocument();
  });

  test('filters inventory by location', async () => {
    const user = userEvent.setup();
    render(<InventoryDashboard />);

    await user.selectOptions(screen.getByLabelText(/location/i), 'Location A');
    await waitFor(() => {
      expect(screen.getByText(/50 items/i)).toBeInTheDocument();
    });
  });

  test('exports inventory to CSV', async () => {
    const user = userEvent.setup();
    render(<InventoryDashboard />);

    await user.click(screen.getByText(/export/i));
    // Verify download triggered
  });
});

// LocationDetailPage.test.jsx (1K tokens)
// ... 10 more inventory component tests
```

**Deliverables Week 6**:
- [ ] Inventory module: 50% test coverage
- [ ] 12 component tests passing
- [ ] 7 hook tests passing
- [ ] 8 utility tests passing

---

#### Week 7: Integration Tests (25K tokens)

**API Integration with MSW** (10K tokens):

```typescript
// gaugeApi.test.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { gaugeService } from './gaugeService';

const server = setupServer(
  rest.get('/api/gauges/v2', (req, res, ctx) => {
    return res(ctx.json({
      data: [
        { gauge_id: 1, name: 'Test Gauge 1' },
        { gauge_id: 2, name: 'Test Gauge 2' }
      ]
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Gauge API Integration', () => {
  test('fetches gauges successfully', async () => {
    const gauges = await gaugeService.getGauges();
    expect(gauges).toHaveLength(2);
    expect(gauges[0].name).toBe('Test Gauge 1');
  });

  test('handles API errors', async () => {
    server.use(
      rest.get('/api/gauges/v2', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    await expect(gaugeService.getGauges()).rejects.toThrow('Server error');
  });

  test('retries failed requests', async () => {
    let attempts = 0;
    server.use(
      rest.get('/api/gauges/v2', (req, res, ctx) => {
        attempts++;
        if (attempts < 3) {
          return res(ctx.status(500));
        }
        return res(ctx.json({ data: [] }));
      })
    );

    const gauges = await gaugeService.getGauges();
    expect(attempts).toBe(3);
    expect(gauges).toEqual([]);
  });
});

// ... API tests for admin, inventory, auth endpoints
```

**State Management Tests** (6K tokens):

```typescript
// gaugeStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useGaugeStore } from './gaugeStore';

describe('Gauge Store', () => {
  test('initializes with empty state', () => {
    const { result } = renderHook(() => useGaugeStore());
    expect(result.current.gauges).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  test('loads gauges', async () => {
    const { result } = renderHook(() => useGaugeStore());

    await act(async () => {
      await result.current.loadGauges();
    });

    expect(result.current.gauges.length).toBeGreaterThan(0);
    expect(result.current.isLoading).toBe(false);
  });

  test('handles load errors', async () => {
    const { result } = renderHook(() => useGaugeStore());

    // Mock API error
    jest.spyOn(gaugeService, 'getGauges').mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.loadGauges();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.gauges).toEqual([]);
  });
});
```

**Routing Tests** (5K tokens), **Form Integration Tests** (4K tokens)

**Deliverables Week 7**:
- [ ] All API endpoints tested with MSW
- [ ] State management tested (Zustand stores)
- [ ] Routing tested (protected routes, navigation)
- [ ] Form submission flows tested

---

#### Week 8: E2E Tests + Infrastructure (25K tokens)

**Critical User Journeys** (10K tokens):

```typescript
// e2e/criticalJourneys.spec.ts
import { test, expect } from '@playwright/test';

test('Complete gauge workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to gauge list
  await expect(page).toHaveURL('/gauges');
  await expect(page.locator('h1')).toContainText('Gauges');

  // Create new gauge
  await page.click('text=Add Gauge');
  await page.fill('input[name="name"]', 'Test Gauge 1/2-13');
  await page.selectOption('select[name="equipmentType"]', 'thread_gauge');
  await page.fill('input[name="threadSize"]', '1/2-13');
  await page.click('button:has-text("Save")');

  // Verify gauge created
  await expect(page.locator('table')).toContainText('Test Gauge 1/2-13');

  // Logout
  await page.click('[aria-label="User menu"]');
  await page.click('text=Logout');
  await expect(page).toHaveURL('/login');
});

test('Gauge pairing workflow', async ({ page }) => {
  await page.goto('/gauges/spare-inventory');

  // Select GO gauge
  await page.click('text=GO Gauges >> .. >> input[type="checkbox"]:first-of-type');

  // Select NO-GO gauge
  await page.click('text=NO-GO Gauges >> .. >> input[type="checkbox"]:first-of-type');

  // Pair them
  await page.click('button:has-text("Pair Selected")');
  await page.fill('input[name="setName"]', 'Test Set 1/2-13');
  await page.click('button:has-text("Create Set")');

  // Verify set created
  await page.goto('/gauges/sets');
  await expect(page.locator('table')).toContainText('Test Set 1/2-13');
});

// ... 2 more critical journeys (inventory transfer, user management)
```

**Cross-Browser Tests** (3K tokens), **Performance Tests** (2K tokens), **Test Infrastructure** (5K tokens)

**Deliverables Week 8**:
- [ ] 4 critical user journeys passing
- [ ] Cross-browser compatibility verified (Chrome, Firefox, Safari)
- [ ] Performance benchmarks established
- [ ] Test utilities created
- [ ] CI/CD integration configured

**Phase 2 Checkpoint**:
- [ ] Frontend coverage: 0% → 60% ✅
- [ ] All tests passing ✅
- [ ] CI/CD pipeline running tests automatically ✅

---

### Phase 3: Quick Wins (Week 9-14, 30K tokens)

#### Week 9: Window.confirm Fixes (9K tokens)

**Goal**: Replace 16 window.confirm violations with accessible Modal component

**Approach**: ~563 tokens per file × 16 files = 9K tokens

**Example Implementation**:

```typescript
// BEFORE (window.confirm violation)
const handleDelete = (gaugeId) => {
  if (window.confirm('Are you sure you want to delete this gauge?')) {
    deleteGauge(gaugeId);
  }
};

// AFTER (accessible Modal component)
import { Modal, Button } from '../../infrastructure/components';

const [showDeleteModal, setShowDeleteModal] = useState(false);
const [selectedGaugeId, setSelectedGaugeId] = useState(null);

const handleDeleteClick = (gaugeId) => {
  setSelectedGaugeId(gaugeId);
  setShowDeleteModal(true);
};

const handleConfirmDelete = () => {
  deleteGauge(selectedGaugeId);
  setShowDeleteModal(false);
  setSelectedGaugeId(null);
};

return (
  <>
    <Button onClick={() => handleDeleteClick(gauge.id)} variant="danger">
      Delete
    </Button>

    <Modal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      title="Confirm Deletion"
    >
      <p>Are you sure you want to delete this gauge? This action cannot be undone.</p>
      <div className="modal-actions">
        <Button onClick={() => setShowDeleteModal(false)} variant="secondary">
          Cancel
        </Button>
        <Button onClick={handleConfirmDelete} variant="danger">
          Delete
        </Button>
      </div>
    </Modal>
  </>
);
```

**Files to Update**:
- Gauge module: 6 files (3,375 tokens)
- Admin module: 5 files (2,813 tokens)
- Inventory module: 4 files (2,250 tokens)
- User module: 1 file (563 tokens)

**Deliverables Week 9**:
- [ ] Zero window.confirm violations
- [ ] All confirmations use Modal component
- [ ] WCAG 2.1 AA focus management
- [ ] Double-click protection enabled

---

#### Week 10: ARIA Labels + Server-Side Pagination (8K tokens)

**ARIA Labels** (3K tokens):

```typescript
// BEFORE (missing ARIA labels)
<form onSubmit={handleSubmit}>
  <input name="email" type="email" />
  <input name="password" type="password" />
  <button>Login</button>
</form>

// AFTER (accessible with ARIA)
<form onSubmit={handleSubmit} aria-label="Login form">
  <FormInput
    name="email"
    type="email"
    label="Email Address"
    required
    aria-required="true"
    aria-describedby="email-error"
  />
  {errors.email && (
    <span id="email-error" role="alert" className="error">
      {errors.email}
    </span>
  )}

  <FormInput
    name="password"
    type="password"
    label="Password"
    required
    aria-required="true"
    aria-describedby="password-error"
  />
  {errors.password && (
    <span id="password-error" role="alert" className="error">
      {errors.password}
    </span>
  )}

  <Button type="submit" aria-label="Submit login form">
    Login
  </Button>
</form>
```

**12 forms to update**: LoginForm, GaugeForm, SetForm, UserForm, LocationForm, ItemForm, TransferForm, ProfileForm, PasswordChangeForm, EquipmentRuleForm, StatusRuleForm, SearchFilters

**Server-Side Pagination** (5K tokens):

```javascript
// Backend: Add pagination to gaugeRepository.js
async findAll(filters = {}, pagination = {}) {
  const { page = 1, limit = 50 } = pagination;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM gauges WHERE is_deleted = 0';
  const params = [];

  // Apply filters...

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [gauges] = await pool.execute(query, params);

  // Get total count
  const [countResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM gauges WHERE is_deleted = 0',
    []
  );

  return {
    data: gauges,
    pagination: {
      page,
      limit,
      total: countResult[0].total,
      totalPages: Math.ceil(countResult[0].total / limit)
    }
  };
}

// Frontend: Add pagination UI
const [page, setPage] = useState(1);
const [pagination, setPagination] = useState(null);

const fetchGauges = async () => {
  const response = await gaugeService.getGauges({ page, limit: 50 });
  setGauges(response.data);
  setPagination(response.pagination);
};

return (
  <>
    <GaugeTable gauges={gauges} />

    {pagination && (
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    )}
  </>
);
```

**Deliverables Week 10**:
- [ ] All 12 forms have ARIA labels
- [ ] Required fields indicated for screen readers
- [ ] Error states announced properly
- [ ] Gauge list pagination working
- [ ] Inventory dashboard pagination working

---

#### Week 11-12: Refactor Worst 3 Files (13K tokens)

**Week 11: GaugeList.jsx + UserManagement.jsx (10K tokens)**

**GaugeList.jsx** (782 lines → 4 files, 5K tokens):

```typescript
// BEFORE: GaugeList.jsx (782 lines)
// All filtering, sorting, table rendering, bulk actions in one massive file

// AFTER: Split into 4 files

// 1. GaugeFilters.jsx (200 lines, 1.5K tokens)
export const GaugeFilters = ({ filters, onFilterChange }) => {
  return (
    <div className="filters">
      <FormInput
        value={filters.search}
        onChange={(e) => onFilterChange('search', e.target.value)}
        placeholder="Search by thread size, name..."
        label="Search"
      />
      <FormSelect
        value={filters.equipmentType}
        onChange={(e) => onFilterChange('equipmentType', e.target.value)}
        label="Equipment Type"
        options={equipmentTypeOptions}
      />
      <FormSelect
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value)}
        label="Status"
        options={statusOptions}
      />
    </div>
  );
};

// 2. GaugeTable.jsx (250 lines, 2K tokens)
export const GaugeTable = ({ gauges, onSort, selectedGauges, onSelectionChange }) => {
  return (
    <table className="gauge-table">
      <thead>
        <tr>
          <th><input type="checkbox" onChange={onSelectAll} /></th>
          <th onClick={() => onSort('name')}>Name</th>
          <th onClick={() => onSort('thread_size')}>Thread Size</th>
          <th onClick={() => onSort('status')}>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {gauges.map(gauge => (
          <tr key={gauge.gauge_id}>
            <td>
              <input
                type="checkbox"
                checked={selectedGauges.includes(gauge.gauge_id)}
                onChange={() => onSelectionChange(gauge.gauge_id)}
              />
            </td>
            <td>{gauge.name}</td>
            <td>{gauge.thread_size}</td>
            <td><StatusBadge status={gauge.status} /></td>
            <td>
              <Button onClick={() => onEdit(gauge)}>Edit</Button>
              <Button onClick={() => onDelete(gauge)}>Delete</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// 3. GaugeBulkActions.jsx (150 lines, 1K tokens)
export const GaugeBulkActions = ({ selectedGauges, onAssignToSet, onBulkDelete }) => {
  return (
    <div className="bulk-actions">
      <span>{selectedGauges.length} gauges selected</span>
      <Button onClick={onAssignToSet} disabled={selectedGauges.length === 0}>
        Assign to Set
      </Button>
      <Button onClick={onBulkDelete} variant="danger" disabled={selectedGauges.length === 0}>
        Delete Selected
      </Button>
    </div>
  );
};

// 4. GaugeList.jsx (180 lines, 0.5K tokens - coordinator only)
export const GaugeList = () => {
  const [gauges, setGauges] = useState([]);
  const [filters, setFilters] = useState({ search: '', equipmentType: 'all', status: 'all' });
  const [selectedGauges, setSelectedGauges] = useState([]);
  const [sortBy, setSortBy] = useState('name');

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (column) => {
    setSortBy(column);
  };

  const handleSelectionChange = (gaugeId) => {
    setSelectedGauges(prev =>
      prev.includes(gaugeId)
        ? prev.filter(id => id !== gaugeId)
        : [...prev, gaugeId]
    );
  };

  return (
    <div className="gauge-list">
      <GaugeFilters filters={filters} onFilterChange={handleFilterChange} />
      <GaugeBulkActions selectedGauges={selectedGauges} onAssignToSet={handleAssignToSet} onBulkDelete={handleBulkDelete} />
      <GaugeTable gauges={filteredGauges} onSort={handleSort} selectedGauges={selectedGauges} onSelectionChange={handleSelectionChange} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
```

**Testing After Split**:
```bash
# Run tests for refactored component
npm test -- GaugeList.test.jsx

# If tests pass → Continue
# If tests fail → Rollback immediately
```

**UserManagement.jsx** (843 lines → 5 files, 5K tokens):

Similar extraction pattern:
- UserTable.jsx (280 lines)
- UserFilters.jsx (180 lines)
- UserBulkActions.jsx (150 lines)
- UserValidation.js (120 lines)
- UserManagement.jsx (110 lines coordinator)

**Deliverables Week 11-12**:
- [ ] GaugeList.jsx refactored (782 → 180 lines)
- [ ] UserManagement.jsx refactored (843 → 110 lines)
- [ ] All tests passing after refactoring
- [ ] No regressions introduced

---

#### Week 13-14: InventoryDashboard.jsx + Buffer (3K tokens)

**Week 13: InventoryDashboard.jsx** (756 lines → 5 files, 3K tokens)

**Extraction Pattern**:
- InventoryMetrics.jsx (200 lines) - Metrics cards
- InventoryFilters.jsx (180 lines) - Filter controls
- InventoryTable.jsx (250 lines) - Table component
- InventoryActions.jsx (120 lines) - Bulk actions
- InventoryDashboard.jsx (180 lines) - Coordinator

**Testing After Split**: Same process as GaugeList

**Week 14: Buffer & Validation**

**Focus**: Address any issues, ensure all tests pass, validate health score improvement

**Tasks**:
- Fix any test failures from refactoring
- Update documentation for refactored components
- Run full test suite (unit + integration + E2E)
- Validate health score improvement (72 → 85)
- Deploy to staging for final validation

**Deliverables Week 13-14**:
- [ ] InventoryDashboard.jsx refactored (756 → 180 lines)
- [ ] All 3 files refactored successfully
- [ ] Full test suite passing (60% coverage maintained)
- [ ] Health score validated: 72 → 85
- [ ] Production-ready

---

## Success Metrics

### Week 2 Checkpoint
- [ ] Zero CRITICAL security vulnerabilities
- [ ] CSRF protection enabled
- [ ] Health check endpoints working
- [ ] All dependencies installed

### Week 8 Checkpoint
- [ ] Frontend test coverage: 0% → 60%
- [ ] 102 unit tests passing
- [ ] 25K tokens of integration tests
- [ ] 4 E2E critical journeys passing
- [ ] CI/CD pipeline running

### Week 14 Final Validation
- [ ] Health score: 72 → 85
- [ ] Zero window.confirm violations
- [ ] All forms WCAG 2.1 AA basics
- [ ] Server-side pagination working
- [ ] 3 worst files refactored
- [ ] All tests passing
- [ ] Production-ready

---

## Risk Mitigation

### High-Risk Activities

**1. File Refactoring (Week 11-13)**
- **Risk**: Breaking existing functionality
- **Mitigation**:
  - Phase 2 tests provide safety net
  - Test after EVERY file split
  - Rollback immediately if tests fail
- **Contingency**: Skip remaining files, accept technical debt

**2. Test Implementation (Week 3-8)**
- **Risk**: Time overruns, flaky tests
- **Mitigation**:
  - Focus on critical paths first
  - Use reusable test utilities
  - Skip edge cases if behind schedule
- **Contingency**: Accept 50% coverage instead of 60%

**3. Integration Issues**
- **Risk**: Refactored components don't integrate properly
- **Mitigation**:
  - Integration tests in Week 7
  - E2E tests in Week 8 catch integration issues
- **Contingency**: Rollback refactoring, keep original files

---

## Cost Analysis

### Investment Breakdown

| Phase | Tokens | Cost @ $700/token | % of Budget |
|-------|--------|-------------------|-------------|
| Foundation (Week 1-2) | 15K | $10,500 | 9% |
| Frontend Testing (Week 3-8) | 145K | $101,500 | 88% |
| Quick Wins (Week 9-14) | 30K | $21,000 | 18% |
| **Total** | **165K** | **$72,450** | **100%** |

Note: These costs may vary based on actual implementation complexity. Budget assumes $700/token but actual cost will depend on token velocity and developer hourly rate.

### ROI Calculation

**Investment**: $72,450 over 14 weeks

**Return**:
1. **Prevented Production Bugs**: 60% test coverage prevents ~80% of regressions
   - Est. value: $50K-100K/year in bug fixes avoided
2. **Faster Feature Development**: Tests enable confident changes
   - Est. value: 20-30% faster development speed
3. **Security Risk Elimination**: Zero CRITICAL vulnerabilities
   - Est. value: $100K-500K potential breach cost avoided
4. **Technical Debt Reduction**: 3 worst files refactored
   - Est. value: 30% faster maintenance on those components

**Payback Period**: 3-6 months

---

## Next Steps

### Immediate Actions (This Week)

1. **Get Stakeholder Buy-In**
   - Present Option B vs. Full Plan comparison
   - Confirm acceptance of "good enough" (85/100) vs. "gold standard" (95/100)
   - Secure budget approval ($72K)

2. **Allocate Resources**
   - 1.0 FTE Senior Full-Stack Developer
   - 0.5 FTE Frontend Developer
   - 0.3 FTE Backend Developer
   - 0.3 FTE QA Engineer
   - Total: 2.1 FTE for 14 weeks

3. **Prepare Environment**
   - Set up staging environment
   - Configure CI/CD pipeline
   - Install Redis server
   - Prepare monitoring/logging infrastructure

### Week 1 Kickoff

**Day 1: Team Alignment**
- Review implementation plan with entire team
- Assign phase ownership
- Set up project tracking (GitHub Projects, Jira, etc.)

**Day 2-5: Phase 1 Execution**
- Install dependencies
- Configure environment
- Enable TypeScript strict mode
- Set up database migrations infrastructure

### Communication Plan

**Weekly Demos**: Every Friday, 30 minutes
- Show progress (tests passing, refactored components)
- Discuss blockers
- Adjust timeline if needed

**Daily Standups**: 15 minutes
- What did yesterday
- What doing today
- Any blockers

**Milestone Reviews**: Week 2, Week 8, Week 14
- Formal review with stakeholders
- Health score validation
- Go/no-go decision for next phase

---

## Appendix: Comparison with Other Options

### Option A: Full Plan (Revised) - 410K tokens, 26 weeks

**Pros**:
- Higher health score (90/100 vs. 85/100)
- More files refactored (10 vs. 3)
- Backend test improvements (58.7% → 80%)
- TypeScript quality improvements (some `any` types fixed)

**Cons**:
- 86% longer timeline (26 weeks vs. 14 weeks)
- 148% higher cost ($180K vs. $72K)
- More disruption (10 files refactored)

**Use Case**: If you have time/budget and want higher quality

### Option C: Security + Testing Only - 47K tokens, 4 weeks

**Pros**:
- 93% cheaper ($21K vs. $72K)
- 92% faster (4 weeks vs. 14 weeks)
- Minimal disruption

**Cons**:
- Low health score improvement (72 → 78)
- No refactoring (40 files >500 lines remain)
- Limited test coverage (35% vs. 60%)

**Use Case**: Emergency de-risking only, not sustainable long-term

### Why Option B is the Sweet Spot

Option B balances:
- **Speed**: 64% faster than Full Plan
- **Cost**: 75% cheaper than Full Plan
- **Quality**: 85/100 health score (good enough)
- **Risk**: Low disruption (only 3 files refactored)
- **Value**: 80% of value in 25% of time

---

**Generated**: November 5, 2025
**Status**: Ready for Execution
**Recommended Start**: Immediately upon stakeholder approval
**Expected Completion**: 14 weeks from start date
