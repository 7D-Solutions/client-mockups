import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Navigating to login page...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Check if we need to login
    const isLoginPage = await page.locator('input[type="email"]').count() > 0;

    if (isLoginPage) {
      console.log('🔐 Logging in...');
      await page.fill('input[type="email"]', 'james.dickson@7dmanufacturing.com');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    console.log('📍 Navigating to gauge list...');
    await page.goto('http://localhost:3001/gauges/list');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Measure BEFORE search
    console.log('\n📏 BEFORE SEARCH - Measuring all section heights...');

    const beforeMeasurements = await page.evaluate(() => {
      const measurements = {};

      // Find all major sections
      const header = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Gauge Inventory'))?.parentElement;
      const categoryTabs = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'All');
      const searchInput = document.querySelector('input[placeholder*="Search"]');
      const searchContainer = searchInput?.closest('div[style*="marginBottom"]');
      const threadTabs = searchContainer?.nextElementSibling;
      const loadingIndicator = threadTabs?.nextElementSibling;
      const filterBar = document.querySelector('select');
      const filterContainer = filterBar?.closest('div[style*="marginBottom"]');

      // Measure each section
      if (header) {
        measurements.header = {
          top: header.getBoundingClientRect().top,
          height: header.getBoundingClientRect().height,
          bottom: header.getBoundingClientRect().bottom
        };
      }

      if (categoryTabs) {
        const tabsContainer = categoryTabs.closest('div[style*="gap"]');
        measurements.categoryTabs = {
          top: tabsContainer.getBoundingClientRect().top,
          height: tabsContainer.getBoundingClientRect().height,
          bottom: tabsContainer.getBoundingClientRect().bottom
        };
      }

      if (searchContainer) {
        measurements.searchContainer = {
          top: searchContainer.getBoundingClientRect().top,
          height: searchContainer.getBoundingClientRect().height,
          bottom: searchContainer.getBoundingClientRect().bottom,
          styles: searchContainer.getAttribute('style')
        };
      }

      if (threadTabs) {
        measurements.threadTabs = {
          top: threadTabs.getBoundingClientRect().top,
          height: threadTabs.getBoundingClientRect().height,
          bottom: threadTabs.getBoundingClientRect().bottom,
          visibility: window.getComputedStyle(threadTabs).visibility,
          styles: threadTabs.getAttribute('style')
        };
      }

      if (loadingIndicator) {
        measurements.loadingIndicator = {
          top: loadingIndicator.getBoundingClientRect().top,
          height: loadingIndicator.getBoundingClientRect().height,
          bottom: loadingIndicator.getBoundingClientRect().bottom,
          visibility: window.getComputedStyle(loadingIndicator).visibility,
          styles: loadingIndicator.getAttribute('style')
        };
      }

      if (filterContainer) {
        measurements.filterBar = {
          top: filterContainer.getBoundingClientRect().top,
          height: filterContainer.getBoundingClientRect().height,
          bottom: filterContainer.getBoundingClientRect().bottom
        };
      }

      return measurements;
    });

    console.log('BEFORE measurements:', JSON.stringify(beforeMeasurements, null, 2));

    // Take screenshot BEFORE
    await page.screenshot({ path: 'before-search-measurement.png', fullPage: false });
    console.log('📸 Screenshot saved: before-search-measurement.png');

    // Activate search
    console.log('\n🔍 Activating search...');
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    const searchButton = page.locator('button:has-text("Search")').first();
    await searchButton.click();

    // Wait for search to process
    await page.waitForTimeout(3000);

    // Measure AFTER search
    console.log('\n📏 AFTER SEARCH - Measuring all section heights...');

    const afterMeasurements = await page.evaluate(() => {
      const measurements = {};

      // Find all major sections
      const header = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Gauge Inventory'))?.parentElement;
      const categoryTabs = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'All');
      const searchInput = document.querySelector('input[placeholder*="Search"]');
      const searchContainer = searchInput?.closest('div[style*="marginBottom"]');
      const threadTabs = searchContainer?.nextElementSibling;
      const loadingIndicator = threadTabs?.nextElementSibling;
      const filterBar = document.querySelector('select');
      const filterContainer = filterBar?.closest('div[style*="marginBottom"]');

      // Measure each section
      if (header) {
        measurements.header = {
          top: header.getBoundingClientRect().top,
          height: header.getBoundingClientRect().height,
          bottom: header.getBoundingClientRect().bottom
        };
      }

      if (categoryTabs) {
        const tabsContainer = categoryTabs.closest('div[style*="gap"]');
        measurements.categoryTabs = {
          top: tabsContainer.getBoundingClientRect().top,
          height: tabsContainer.getBoundingClientRect().height,
          bottom: tabsContainer.getBoundingClientRect().bottom
        };
      }

      if (searchContainer) {
        measurements.searchContainer = {
          top: searchContainer.getBoundingClientRect().top,
          height: searchContainer.getBoundingClientRect().height,
          bottom: searchContainer.getBoundingClientRect().bottom,
          styles: searchContainer.getAttribute('style')
        };
      }

      if (threadTabs) {
        measurements.threadTabs = {
          top: threadTabs.getBoundingClientRect().top,
          height: threadTabs.getBoundingClientRect().height,
          bottom: threadTabs.getBoundingClientRect().bottom,
          visibility: window.getComputedStyle(threadTabs).visibility,
          styles: threadTabs.getAttribute('style')
        };
      }

      if (loadingIndicator) {
        measurements.loadingIndicator = {
          top: loadingIndicator.getBoundingClientRect().top,
          height: loadingIndicator.getBoundingClientRect().height,
          bottom: loadingIndicator.getBoundingClientRect().bottom,
          visibility: window.getComputedStyle(loadingIndicator).visibility,
          styles: loadingIndicator.getAttribute('style')
        };
      }

      if (filterContainer) {
        measurements.filterBar = {
          top: filterContainer.getBoundingClientRect().top,
          height: filterContainer.getBoundingClientRect().height,
          bottom: filterContainer.getBoundingClientRect().bottom
        };
      }

      return measurements;
    });

    console.log('AFTER measurements:', JSON.stringify(afterMeasurements, null, 2));

    // Take screenshot AFTER
    await page.screenshot({ path: 'after-search-measurement.png', fullPage: false });
    console.log('📸 Screenshot saved: after-search-measurement.png');

    // Calculate shifts
    console.log('\n📊 LAYOUT SHIFT ANALYSIS:');

    const sections = ['header', 'categoryTabs', 'searchContainer', 'threadTabs', 'loadingIndicator', 'filterBar'];

    sections.forEach(section => {
      if (beforeMeasurements[section] && afterMeasurements[section]) {
        const topShift = afterMeasurements[section].top - beforeMeasurements[section].top;
        const heightChange = afterMeasurements[section].height - beforeMeasurements[section].height;

        console.log(`\n${section}:`);
        console.log(`  Position shift: ${topShift}px ${topShift < 0 ? '⬆️ UPWARD' : topShift > 0 ? '⬇️ DOWNWARD' : '✅ NO SHIFT'}`);
        console.log(`  Height change: ${heightChange}px`);
        console.log(`  Before: top=${beforeMeasurements[section].top}px, height=${beforeMeasurements[section].height}px`);
        console.log(`  After: top=${afterMeasurements[section].top}px, height=${afterMeasurements[section].height}px`);

        if (beforeMeasurements[section].visibility !== undefined) {
          console.log(`  Visibility: ${beforeMeasurements[section].visibility} → ${afterMeasurements[section].visibility}`);
        }
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
