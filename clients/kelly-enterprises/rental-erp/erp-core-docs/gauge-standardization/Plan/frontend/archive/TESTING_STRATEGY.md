# Testing Strategy

**Date**: 2025-10-26
**Status**: Not Started

---

## Overview

Comprehensive testing strategy covering unit tests, integration tests, and E2E tests for all frontend components.

**Testing Pyramid**:
- Unit Tests (70%): Components, hooks, services, stores
- Integration Tests (20%): Workflows, modals, API integration
- E2E Tests (10%): Complete user journeys

---

## 1. Unit Tests

### 1.1 Zustand Stores

**Test Files**:
- `frontend/tests/unit/stores/GaugeSetStore.test.ts`
- `frontend/tests/unit/stores/CalibrationStore.test.ts`

**Coverage**:
- State initialization
- Action execution
- Helper functions
- Error handling
- Optimistic updates

**Example**:
```typescript
import { useGaugeSetStore } from '../../../stores/GaugeSetStore';

describe('GaugeSetStore', () => {
  beforeEach(() => {
    // Reset store state
    useGaugeSetStore.setState({
      sets: new Map(),
      spareGauges: new Map(),
      selectedSetId: null
    });
  });

  it('should fetch and store gauge sets', async () => {
    const { fetchSets, sets } = useGaugeSetStore.getState();
    await fetchSets();
    expect(sets.size).toBeGreaterThan(0);
  });

  it('should get compatible spares for a gauge', () => {
    const { getCompatibleSpares } = useGaugeSetStore.getState();
    const compatible = getCompatibleSpares(1);
    expect(Array.isArray(compatible)).toBe(true);
  });
});
```

### 1.2 API Services

**Test Files**:
- `frontend/tests/unit/services/gaugeSetService.test.ts`
- `frontend/tests/unit/services/calibrationService.test.ts`
- `frontend/tests/unit/services/certificateService.test.ts`
- `frontend/tests/unit/services/customerGaugeService.test.ts`

**Coverage**:
- API request formatting
- Response parsing
- Error handling
- Mock API responses

### 1.3 Shared Components

**Test Files**:
- `frontend/tests/unit/components/GaugeStatusBadge.test.tsx`
- `frontend/tests/unit/components/SetStatusIndicator.test.tsx`
- `frontend/tests/unit/components/CompanionGaugeLink.test.tsx`
- `frontend/tests/unit/components/LocationVerificationModal.test.tsx`

**Coverage**:
- Rendering with different props
- User interactions
- Accessibility
- Edge cases

### 1.4 Hooks

**Test Files**:
- `frontend/tests/unit/hooks/usePermissions.test.ts`

**Coverage**:
- Permission calculation
- Role-based access
- Edge cases (no user, invalid role)

---

## 2. Integration Tests

### 2.1 Modal Workflows

**Test Files**:
- `frontend/tests/integration/UnpairSetModal.test.tsx`
- `frontend/tests/integration/ReplaceGaugeModal.test.tsx`
- `frontend/tests/integration/CertificateUploadModal.test.tsx`
- `frontend/tests/integration/ReturnCustomerGaugeModal.test.tsx`

**Coverage**:
- Complete modal flow (open, interact, submit, close)
- API integration
- State updates
- Error handling
- Success notifications

**Example**:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnpairSetModal } from '../../../modules/gauge/components/UnpairSetModal';

describe('UnpairSetModal Integration', () => {
  it('should unpair set and update state', async () => {
    const mockOnSuccess = jest.fn();

    render(
      <UnpairSetModal
        isOpen={true}
        setId="TG0123"
        onClose={jest.fn()}
        onSuccess={mockOnSuccess}
      />
    );

    // Enter reason
    fireEvent.change(screen.getByLabelText('Reason (optional):'), {
      target: { value: 'Test reason' }
    });

    // Confirm unpair
    fireEvent.click(screen.getByText('Confirm Unpair'));

    // Wait for API call and state update
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
```

### 2.2 Page Workflows

**Test Files**:
- `frontend/tests/integration/SetDetailsPage.test.tsx`
- `frontend/tests/integration/CalibrationManagementPage.test.tsx`
- `frontend/tests/integration/SpareInventoryPage.test.tsx`

**Coverage**:
- Data fetching
- User interactions
- Navigation
- Permission enforcement

### 2.3 Pairing Interface

**Test Files**:
- `frontend/tests/integration/SpareInventoryPairing.test.tsx`

**Coverage**:
- Two-column layout
- Selection logic
- Compatibility filtering
- Location verification
- Set creation

---

## 3. E2E Tests (Playwright)

### 3.1 Calibration Workflow

**Test File**: `frontend/tests/e2e/calibration-workflow.spec.ts`

**Scenario**:
1. Login as Admin/QC
2. Navigate to Calibration Management
3. Select gauges and send to calibration
4. Upload certificate for GO gauge
5. Accept companion prompt and upload NO GO certificate
6. Verify location and release set
7. Confirm set status is "available"

**Example**:
```typescript
import { test, expect } from '@playwright/test';

test('complete calibration workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to Calibration Management
  await page.click('text=Calibration Management');
  await expect(page).toHaveURL('/admin/gauge-management/calibration');

  // Upload certificate
  await page.click('text=Upload Certificate');
  await page.setInputFiles('input[type="file"]', 'test-certificate.pdf');
  await page.click('text=Upload');
  await page.check('text=All certificates uploaded for this gauge');

  // Accept companion prompt
  await page.click('text=Yes, Upload Now');
  await page.setInputFiles('input[type="file"]', 'test-certificate-2.pdf');
  await page.click('text=Upload');
  await page.check('text=All certificates uploaded for this gauge');

  // Verify location and release
  await page.selectOption('select[id="location-dropdown"]', 'Shelf A2');
  await page.click('text=Release Set');

  // Verify success
  await expect(page.locator('text=Set released successfully')).toBeVisible();
});
```

### 3.2 Customer Return Workflow

**Test File**: `frontend/tests/e2e/customer-return.spec.ts`

**Scenario**:
1. Login as Admin/QC
2. Navigate to customer-owned set
3. Open return modal
4. Select gauges to return
5. Confirm return
6. Verify gauge removed from active inventory
7. Check "Returned Customer Gauges" page

### 3.3 Spare Pairing Workflow

**Test File**: `frontend/tests/e2e/spare-pairing.spec.ts`

**Scenario**:
1. Login as Admin/QC
2. Navigate to Spare Inventory
3. Select GO gauge
4. View filtered compatible NO GO gauges
5. Select compatible gauge
6. Verify location and create set
7. Confirm set created successfully

---

## 4. Test Coverage Goals

**Unit Tests**: ≥80% code coverage
**Integration Tests**: ≥70% critical workflows
**E2E Tests**: 100% of major user journeys

---

## 5. Testing Tools

- **Jest**: Unit and integration tests
- **React Testing Library**: Component testing
- **Playwright**: E2E browser automation
- **MSW**: API mocking

---

## 6. Continuous Integration

**Run tests on**:
- Every commit (unit tests)
- Pull requests (unit + integration tests)
- Pre-deployment (all tests including E2E)

**Test Commands**:
```bash
npm run test              # Run all unit tests
npm run test:integration  # Run integration tests
npm run test:e2e          # Run E2E tests with Playwright
npm run test:coverage     # Generate coverage report
```

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
