# Platform Standards - Quick Fix Guide

**Priority**: Address these violations in order

---

## 🔴 CRITICAL - Fix Immediately (Week 1)

### 1. Direct fetch() Calls (15 files) - SECURITY RISK

**Problem**: Bypasses authentication, no error handling, missing httpOnly cookies

**Files to Fix**:
1. `modules/gauge/pages/MyGauges.tsx`
2. `modules/gauge/pages/GaugeList.tsx`
3. `modules/gauge/components/creation/GaugeIdInput.tsx`
4. `modules/gauge/components/OutOfServiceReviewModal.tsx`
5. `modules/gauge/components/QCApprovalsModal.tsx`
6. `modules/gauge/components/creation/steps/ReviewConfirmStep.tsx`
7. `modules/gauge/components/GaugeModalManager.tsx`
8. `modules/gauge/components/creation/steps/SetIdEditor.tsx`
9. `modules/gauge/components/ReviewModal.tsx`
10. `modules/gauge/components/GaugeDashboardContainer.tsx`
11. `modules/gauge/components/UnsealRequestsManagerModal.tsx`
12. `modules/gauge/components/CheckoutModal.tsx`

**Fix Pattern**:
```typescript
// ❌ BEFORE
const response = await fetch('/api/gauges');
const data = await response.json();

// ✅ AFTER
import { apiClient } from '../../../infrastructure/api/client';
const data = await apiClient.get('/gauges');
```

**Estimated Time**: 2-3 hours (bulk find-replace with verification)

---

### 2. window.confirm/alert (11 files) - UX ISSUE

**Problem**: Non-customizable browser dialogs, poor UX, no async/await support

**Files to Fix** (same files as raw buttons):
1. `modules/gauge/components/QCApprovalsModal.tsx`
2. `modules/gauge/components/GaugeModalManager.tsx`
3. `modules/admin/components/UserDetailsModal.tsx`
4. `modules/gauge/components/UnsealConfirmModal.tsx`
5. `modules/admin/components/AddUserModal.tsx`
6. `modules/gauge/components/ReviewModal.tsx`
7. `modules/admin/components/ResetPasswordModal.tsx`
8. `modules/gauge/components/UnsealRequestModal.tsx`
9. `modules/gauge/components/CheckinModal.tsx`
10. `modules/gauge/components/UnsealRequestsManagerModal.tsx`
11. `modules/gauge/components/CheckoutModal.tsx`

**Fix Pattern**:
```typescript
// ❌ BEFORE
if (window.confirm('Are you sure?')) {
  await deleteItem();
}

// ✅ AFTER
import { Modal } from '../../../infrastructure/components';

const [isConfirmOpen, setIsConfirmOpen] = useState(false);

// In render:
<Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} title="Confirm">
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Footer>
    <Button onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
    <Button onClick={handleDelete} variant="danger">Delete</Button>
  </Modal.Footer>
</Modal>
```

**Estimated Time**: 3-4 hours (requires state management changes)

---

### 3. console.log in Backend (5 files) - PRODUCTION ISSUE

**Problem**: Not production-ready, no log rotation, hard to parse

**Files to Fix**:
1. `modules/gauge/mappers/GaugeDTOMapper.js`
2. `modules/gauge/routes/gauges-v2.js`
3. `modules/gauge/services/GaugeSetService.js`
4. `modules/auth/routes/auth.js`
5. `modules/gauge/services/GaugeSearchService.js`

**Fix Pattern**:
```javascript
// ❌ BEFORE
console.log('User logged in:', userId);
console.error('Database error:', error);

// ✅ AFTER
const logger = require('../../../infrastructure/utils/logger');
logger.info('User logged in', { userId });
logger.error('Database error', { error: error.message, stack: error.stack });
```

**Estimated Time**: 1 hour (simple find-replace)

---

## 🟡 HIGH PRIORITY - Fix This Week (Week 1-2)

### 4. Raw HTML Buttons (12 files) - FUNCTIONALITY ISSUE

**Problem**: No double-click protection, inconsistent styling, missing loading states

**Files to Fix**:
1-12. (Same files as window.confirm violations above)

**Fix Pattern**:
```typescript
// ❌ BEFORE
<button onClick={handleSave} disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</button>

// ✅ AFTER
import { Button } from '../../../infrastructure/components';
<Button onClick={handleSave} loading={isLoading}>Save</Button>
```

**Estimated Time**: 4-5 hours (straightforward replacement)

---

### 5. Raw Form Elements (12 files) - CONSISTENCY ISSUE

**Problem**: Inconsistent validation display, missing accessibility, no centralized styling

**Files to Fix**:
1-12. (Same files as buttons above)

**Fix Pattern**:
```typescript
// ❌ BEFORE
<input
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Enter name"
/>

// ✅ AFTER
import { FormInput } from '../../../infrastructure/components';
<FormInput
  label="Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Enter name"
/>
```

**Estimated Time**: 4-5 hours (requires label additions)

---

### 6. Manual Form Section Headers - CONSISTENCY ISSUE

**Problem**: Inconsistent styling, inline CSS, hard to maintain

**Common Pattern Found**:
```typescript
// ❌ BEFORE (MovementHistoryPage.tsx lines 139-156)
<div style={{
  textTransform: 'uppercase',
  borderBottom: '2px solid var(--color-border-light)',
  paddingBottom: 'var(--space-2)',
  marginBottom: 'var(--space-4)',
  fontWeight: '600',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-gray-700)'
}}>
  FILTERS
</div>
```

**Fix Pattern**:
```typescript
// ✅ AFTER
import { FormSection } from '../../../infrastructure/components';
<FormSection title="Filters">
  {/* Form fields here */}
</FormSection>
```

**Search Pattern**: Look for inline styles with `textTransform: 'uppercase'` and `borderBottom`

**Estimated Time**: 2-3 hours (find all manual section headers)

---

## 🟢 MEDIUM PRIORITY - Fix Next Week (Week 2-3)

### 7. Missing usePagination Hook (11 pages)

**Problem**: Duplicated pagination logic, no URL synchronization, manual offset calculation

**Pages to Fix**:
1. `modules/inventory/pages/StorageLocationsPage.tsx`
2. `modules/inventory/pages/LocationDetailPage.tsx`
3. `modules/inventory/pages/InventoryDashboard.tsx`
4. `modules/gauge/pages/MyGauges.tsx`
5. `modules/gauge/pages/GaugeList.tsx`
6. `modules/admin/pages/ZoneManagementPage.tsx`
7. `modules/admin/pages/UserManagement.tsx`
8. `modules/admin/pages/RoleManagement.tsx`
9. `modules/admin/pages/GaugeManagement.tsx`
10. `modules/admin/pages/FacilityManagementPage.tsx`
11. `modules/admin/pages/BuildingManagementPage.tsx`

**Fix Pattern**:
```typescript
// ❌ BEFORE
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(50);
const offset = (page - 1) * limit;

// ✅ AFTER
import { usePagination } from '../../../infrastructure/hooks';
const { page, limit, offset, setPage, setLimit, queryParams } = usePagination({
  moduleDefault: 'gauges', // or 'users', 'inventory'
  preserveInUrl: true
});
```

**Estimated Time**: 6-8 hours (requires refactoring state management)

---

### 8. Raw Table Element (1 file)

**Problem**: No pagination, sorting, filtering built-in

**File to Fix**:
- `modules/inventory/pages/MovementHistoryPage.tsx`

**Fix Pattern**:
```typescript
// ❌ BEFORE
<table>
  <thead><tr><th>Date</th><th>Type</th></tr></thead>
  <tbody>
    {movements.map(m => <tr key={m.id}><td>{m.date}</td><td>{m.type}</td></tr>)}
  </tbody>
</table>

// ✅ AFTER
import { DataTable } from '../../../infrastructure/components';
<DataTable
  data={movements}
  columns={[
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' }
  ]}
  pagination={{ page, limit, total }}
  onPageChange={setPage}
/>
```

**Estimated Time**: 2 hours

---

## 🔵 LOW PRIORITY - Future Improvements (Week 3-4)

### 9. Backend Pagination Helpers (GAP)

**Create**: `backend/src/infrastructure/utils/paginationHelpers.js`

**Functions Needed**:
```javascript
function parsePaginationParams(req, defaults = {}) {
  const page = Math.max(1, parseInt(req.query.page) || defaults.page || 1);
  const limit = Math.min(
    defaults.maxLimit || 200,
    Math.max(1, parseInt(req.query.limit) || defaults.limit || 50)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginationResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1
    }
  };
}
```

**Estimated Time**: 1-2 hours

---

### 10. Validation Schema Library (GAP)

**Create**: `backend/src/infrastructure/validation/schemas/`

**Example Structure**:
```javascript
// commonSchemas.js
const { body, query } = require('express-validator');

const commonSchemas = {
  id: body('id').isInt({ min: 1 }).withMessage('Valid ID required'),
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  phone: body('phone').matches(/^\d{10}$/).withMessage('10-digit phone required'),
  pagination: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 })
  ]
};

module.exports = commonSchemas;
```

**Estimated Time**: 4-6 hours

---

## Bulk Fix Scripts

### Script 1: Replace fetch() with apiClient

```bash
#!/bin/bash
# scripts/fix-fetch-calls.sh

FILES=(
  "frontend/src/modules/gauge/pages/MyGauges.tsx"
  "frontend/src/modules/gauge/pages/GaugeList.tsx"
  # ... add all 15 files
)

for file in "${FILES[@]}"; do
  echo "Processing $file..."

  # Add import if not present
  if ! grep -q "import.*apiClient.*from.*infrastructure/api/client" "$file"; then
    sed -i "1i import { apiClient } from '../../../infrastructure/api/client';" "$file"
  fi

  # Replace fetch() patterns (basic - manual review required)
  sed -i 's/await fetch(/await apiClient.get(/g' "$file"

  echo "✅ $file updated (REVIEW REQUIRED)"
done

echo "Done! Please review all changes manually."
```

---

### Script 2: Replace console.log

```bash
#!/bin/bash
# scripts/fix-console-logs.sh

FILES=(
  "backend/src/modules/gauge/mappers/GaugeDTOMapper.js"
  "backend/src/modules/gauge/routes/gauges-v2.js"
  # ... add all 5 files
)

for file in "${FILES[@]}"; do
  echo "Processing $file..."

  # Add logger import if not present
  if ! grep -q "const logger = require" "$file"; then
    sed -i "1i const logger = require('../../../infrastructure/utils/logger');" "$file"
  fi

  # Replace console.log
  sed -i 's/console\.log(/logger.info(/g' "$file"
  sed -i 's/console\.error(/logger.error(/g' "$file"
  sed -i 's/console\.warn(/logger.warn(/g' "$file"

  echo "✅ $file updated"
done
```

---

## Verification Commands

After fixes, run these to verify:

```bash
# Frontend violations check
grep -r "window\.confirm\|window\.alert" frontend/src/modules/ --include="*.tsx" --include="*.jsx"
grep -r "fetch(" frontend/src/modules/ --include="*.tsx" --include="*.jsx" | grep -v "apiClient"
grep -r "<button" frontend/src/modules/ --include="*.tsx" --include="*.jsx"

# Backend violations check
grep -r "console\.log\|console\.error" backend/src/modules/ --include="*.js"

# Run ESLint
cd frontend && npm run lint
cd backend && npm run lint

# Run custom validator
node scripts/validate-architecture.js
```

---

## Estimated Total Time

| Priority | Task | Time | Cumulative |
|----------|------|------|------------|
| CRITICAL | Direct fetch() fixes | 2-3h | 3h |
| CRITICAL | window.confirm/alert fixes | 3-4h | 7h |
| CRITICAL | console.log fixes | 1h | 8h |
| HIGH | Raw button fixes | 4-5h | 13h |
| HIGH | Raw form element fixes | 4-5h | 18h |
| HIGH | Form section headers | 2-3h | 21h |
| MEDIUM | usePagination adoption | 6-8h | 29h |
| MEDIUM | Raw table fix | 2h | 31h |
| LOW | Pagination helpers | 1-2h | 33h |
| LOW | Validation schemas | 4-6h | 39h |

**Total**: ~39 hours (1 week for critical/high, 2 weeks for medium, 3-4 weeks for low)

---

## Success Criteria

After all fixes:

✅ Zero direct fetch() calls in modules
✅ Zero window.confirm/alert in modules
✅ Zero console.log in backend modules
✅ Zero raw HTML buttons in modules
✅ Zero raw form elements in modules
✅ All list pages use usePagination hook
✅ All modals use infrastructure Modal component
✅ All tables use DataTable component
✅ Backend pagination helpers created
✅ Validation schema library started

**Compliance Targets**:
- Frontend: 95%+ (from 81%)
- Backend: 99%+ (from 96%)

---

**Generated**: 2025-11-07
**See**: Platform-Standardization-Audit.md (full report)
