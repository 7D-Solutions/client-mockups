# E2E Test Template

Playwright end-to-end testing for user workflows and UI interactions.

## Template

```typescript
/**
 * E2E Tests for [Module]
 * Tests user workflows through the UI
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { [Module]Page } from '../pages/[Module]Page';
import { setupTest, cleanupTest, waitForToast } from '../utils/test-helpers';

test.describe('[Module] E2E Tests', () => {
  let loginPage: LoginPage;
  let [module]Page: [Module]Page;

  test.beforeEach(async ({ page }) => {
    await setupTest(page);
    loginPage = new LoginPage(page);
    [module]Page = new [Module]Page(page);

    // Login as admin
    await loginPage.goto();
    await loginPage.loginAsAdmin();
    await [module]Page.goto();
  });

  test.afterEach(async ({ page }) => {
    await cleanupTest(page);
  });

  test.describe('List View', () => {
    test('should display items list', async ({ page }) => {
      // Verify page loaded
      await expect(page.locator('h1')).toContainText('[Module] Management');

      // Verify table exists
      await expect(page.locator('[data-testid="data-table"]')).toBeVisible();

      // Verify at least some items exist
      const rows = page.locator('[data-testid="table-row"]');
      await expect(rows.first()).toBeVisible();
    });

    test('should support pagination', async ({ page }) => {
      // Check if pagination controls exist
      const paginationControls = page.locator('[data-testid="pagination"]');

      if (await paginationControls.isVisible()) {
        const currentPage = page.locator('[data-testid="current-page"]');
        await expect(currentPage).toContainText('1');

        // Navigate to next page
        await page.click('[data-testid="next-page"]');
        await expect(currentPage).toContainText('2');
      }
    });

    test('should support search', async ({ page }) => {
      // TODO: Replace with actual search term
      const searchTerm = 'TEST';

      await page.fill('[data-testid="search-input"]', searchTerm);
      await page.click('[data-testid="search-button"]');

      // Wait for results
      await page.waitForTimeout(500);

      // Verify results contain search term
      const rows = page.locator('[data-testid="table-row"]');
      const firstRow = rows.first();

      if (await firstRow.isVisible()) {
        await expect(firstRow).toContainText(searchTerm, { ignoreCase: true });
      }
    });

    test('should open detail view on row click', async ({ page }) => {
      // Click first row
      await page.click('[data-testid="table-row"]:first-child');

      // Verify navigated to detail view
      await expect(page).toHaveURL(/\/[module]\/\d+/);
    });
  });

  test.describe('Create Item', () => {
    test('should create new item successfully', async ({ page }) => {
      // Click create button
      await page.click('[data-testid="create-button"]');

      // Verify on create page
      await expect(page).toHaveURL(/\/[module]\/create/);

      // TODO: Fill form with test data
      await page.fill('[data-testid="name-input"]', 'Test Item');
      await page.fill('[data-testid="description-input"]', 'Test Description');
      await page.selectOption('[data-testid="category-select"]', 'Standard');

      // Submit form
      await page.click('[data-testid="submit-button"]');

      // Verify success
      await waitForToast(page, 'created successfully', 'success');

      // Verify redirected to list or detail view
      await expect(page).not.toHaveURL(/\/create/);
    });

    test('should validate required fields', async ({ page }) => {
      await page.click('[data-testid="create-button"]');

      // Try to submit without filling required fields
      await page.click('[data-testid="submit-button"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="error-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-name"]')).toContainText('required');
    });

    test('should validate field formats', async ({ page }) => {
      await page.click('[data-testid="create-button"]');

      // TODO: Fill with invalid data
      await page.fill('[data-testid="email-input"]', 'invalid-email');

      await page.click('[data-testid="submit-button"]');

      // Verify validation error
      await expect(page.locator('[data-testid="error-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-email"]')).toContainText('valid email');
    });

    test('should allow canceling creation', async ({ page }) => {
      await page.click('[data-testid="create-button"]');

      // Fill some data
      await page.fill('[data-testid="name-input"]', 'Test');

      // Click cancel
      await page.click('[data-testid="cancel-button"]');

      // Verify returned to list
      await expect(page).toHaveURL(/\/[module]$/);
    });
  });

  test.describe('Update Item', () => {
    test('should update item successfully', async ({ page }) => {
      // Open first item
      await page.click('[data-testid="table-row"]:first-child');

      // Click edit button
      await page.click('[data-testid="edit-button"]');

      // Update field
      await page.fill('[data-testid="name-input"]', 'Updated Name');

      // Save changes
      await page.click('[data-testid="save-button"]');

      // Verify success
      await waitForToast(page, 'updated successfully', 'success');

      // Verify updated value displayed
      await expect(page.locator('[data-testid="item-name"]')).toContainText('Updated Name');
    });

    test('should preserve data on cancel', async ({ page }) => {
      await page.click('[data-testid="table-row"]:first-child');

      // Get original value
      const originalName = await page.locator('[data-testid="item-name"]').textContent();

      await page.click('[data-testid="edit-button"]');

      // Change value
      await page.fill('[data-testid="name-input"]', 'Changed Value');

      // Cancel
      await page.click('[data-testid="cancel-button"]');

      // Verify original value preserved
      await expect(page.locator('[data-testid="item-name"]')).toContainText(originalName || '');
    });
  });

  test.describe('Delete Item', () => {
    test('should delete item with confirmation', async ({ page }) => {
      await page.click('[data-testid="table-row"]:first-child');

      // Click delete button
      await page.click('[data-testid="delete-button"]');

      // Verify confirmation modal appears
      await expect(page.locator('[data-testid="confirmation-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="confirmation-modal"]')).toContainText('Are you sure');

      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');

      // Verify success
      await waitForToast(page, 'deleted successfully', 'success');

      // Verify redirected to list
      await expect(page).toHaveURL(/\/[module]$/);
    });

    test('should allow canceling deletion', async ({ page }) => {
      await page.click('[data-testid="table-row"]:first-child');

      // Click delete
      await page.click('[data-testid="delete-button"]');

      // Cancel in modal
      await page.click('[data-testid="cancel-delete-button"]');

      // Verify still on detail page
      await expect(page).toHaveURL(/\/[module]\/\d+/);

      // Verify item still exists
      await expect(page.locator('[data-testid="item-name"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/[module]', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ success: false, message: 'Server error' })
        });
      });

      await page.click('[data-testid="create-button"]');

      await page.fill('[data-testid="name-input"]', 'Test');
      await page.click('[data-testid="submit-button"]');

      // Verify error toast
      await waitForToast(page, 'failed', 'error');
    });

    test('should handle network timeout', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/[module]', route => {
        return new Promise(() => {}); // Never resolve
      });

      await page.click('[data-testid="create-button"]');

      await page.fill('[data-testid="name-input"]', 'Test');
      await page.click('[data-testid="submit-button"]');

      // Should show timeout error
      await waitForToast(page, 'timeout', 'error', { timeout: 35000 });
    });
  });

  test.describe('User Experience', () => {
    test('should show loading state during operations', async ({ page }) => {
      // Delay API response
      await page.route('**/api/[module]', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      await page.click('[data-testid="create-button"]');

      await page.fill('[data-testid="name-input"]', 'Test');
      await page.click('[data-testid="submit-button"]');

      // Loading indicator should appear
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    });

    test('should disable buttons during submission', async ({ page }) => {
      await page.route('**/api/[module]', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      await page.click('[data-testid="create-button"]');

      await page.fill('[data-testid="name-input"]', 'Test');
      await page.click('[data-testid="submit-button"]');

      // Submit button should be disabled
      const submitButton = page.locator('[data-testid="submit-button"]');
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Permissions', () => {
    test('should prevent actions for users without permission', async ({ page }) => {
      // Logout and login as viewer
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      await loginPage.goto();
      await loginPage.loginAsViewer();

      // Navigate to module
      await [module]Page.goto();

      // Create button should be hidden or disabled
      const createButton = page.locator('[data-testid="create-button"]');

      if (await createButton.isVisible()) {
        await expect(createButton).toBeDisabled();
      } else {
        await expect(createButton).toBeHidden();
      }
    });
  });
});
```

## Page Object Model Example

```typescript
// TODO: Create page object for your module
// File: frontend/tests/e2e/pages/[Module]Page.ts

import { Page } from '@playwright/test';

export class [Module]Page {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/[module]');
  }

  async clickCreateButton() {
    await this.page.click('[data-testid="create-button"]');
  }

  async fillName(name: string) {
    await this.page.fill('[data-testid="name-input"]', name);
  }

  async fillDescription(description: string) {
    await this.page.fill('[data-testid="description-input"]', description);
  }

  async selectCategory(category: string) {
    await this.page.selectOption('[data-testid="category-select"]', category);
  }

  async submit() {
    await this.page.click('[data-testid="submit-button"]');
  }

  async createItem(data: { name: string; description: string; category: string }) {
    await this.clickCreateButton();
    await this.fillName(data.name);
    await this.fillDescription(data.description);
    await this.selectCategory(data.category);
    await this.submit();
  }

  async expectSuccess() {
    await this.page.waitForSelector('[data-testid="success-message"]');
  }
}
```

## Test Fixtures Example

```typescript
// TODO: Create test fixtures
// File: frontend/tests/e2e/fixtures/[module]-fixtures.ts

export const TEST_[MODULE]_DATA = {
  standard: {
    name: 'Test Standard Item',
    description: 'Standard test description',
    category: 'Standard'
  },

  minimal: {
    name: 'Minimal Test Item',
    category: 'Standard'
  },

  invalid: {
    name: '', // Empty name
    description: 'x'.repeat(10000) // Too long
  }
};
```

## TODO Checklist

- [ ] Replace `[Module]`, `[module]` with actual names
- [ ] Create Page Object Model classes
- [ ] Create test data fixtures
- [ ] Test all user workflows
- [ ] Test form validation
- [ ] Test error handling
- [ ] Test permissions
- [ ] Test cross-browser compatibility
- [ ] Add visual regression tests (optional)

## Best Practices

- ✅ Use Page Object Model for maintainability
- ✅ Use data-testid attributes for selectors
- ✅ Test user workflows, not implementation
- ✅ Test happy path and error cases
- ✅ Mock API responses for error scenarios
- ✅ Verify loading states and disabled buttons
- ✅ Test permissions and authorization
- ✅ Use descriptive test names
- ✅ Keep tests independent and isolated
