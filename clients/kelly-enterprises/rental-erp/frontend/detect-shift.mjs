import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  try {
    console.log('🔍 Opening browser and navigating...');
    await page.goto('http://localhost:3001');

    // Try to login if needed
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 3000 });
      await page.fill('input[type="email"]', 'james.dickson@7dmanufacturing.com');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('Already logged in or no login needed');
    }

    console.log('📍 Navigating to gauge list...');
    await page.goto('http://localhost:3001/gauges/list');
    await page.waitForTimeout(3000);

    // Add colored borders to all sections to see what moves
    console.log('🎨 Adding visual markers to sections...');
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        .marker-header { border: 3px solid red !important; }
        .marker-tabs { border: 3px solid blue !important; }
        .marker-search { border: 3px solid green !important; }
        .marker-thread { border: 3px solid orange !important; }
        .marker-loading { border: 3px solid purple !important; }
        .marker-filters { border: 3px solid pink !important; }
      `;
      document.head.appendChild(style);

      // Find and mark sections
      const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Gauge Inventory'));
      if (h2) h2.parentElement.classList.add('marker-header');

      const allButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('All'));
      if (allButton) allButton.closest('div[style*="gap"]').classList.add('marker-tabs');

      const searchInput = document.querySelector('input[placeholder*="Search"]');
      if (searchInput) searchInput.closest('div[style*="marginBottom"]').classList.add('marker-search');

      const threadSection = document.querySelector('.marker-search')?.nextElementSibling;
      if (threadSection) threadSection.classList.add('marker-thread');

      const loadingSection = document.querySelector('.marker-thread')?.nextElementSibling;
      if (loadingSection) loadingSection.classList.add('marker-loading');

      const filterSelect = document.querySelector('select');
      if (filterSelect) filterSelect.closest('div[style*="marginBottom"]').classList.add('marker-filters');
    });

    console.log('📸 Taking BEFORE screenshot...');
    await page.screenshot({ path: 'shift-before.png', fullPage: false });

    // Record positions BEFORE
    const beforePositions = await page.evaluate(() => {
      const positions = {};
      ['marker-header', 'marker-tabs', 'marker-search', 'marker-thread', 'marker-loading', 'marker-filters'].forEach(cls => {
        const el = document.querySelector(`.${cls}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          positions[cls] = {
            top: rect.top,
            height: rect.height,
            bottom: rect.bottom
          };
        }
      });
      return positions;
    });

    console.log('\n📏 BEFORE positions:');
    console.log(JSON.stringify(beforePositions, null, 2));

    // Perform search
    console.log('\n🔍 Performing search...');
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(300);

    const searchButton = page.locator('button').filter({ hasText: 'Search' }).first();
    await searchButton.click();

    // Wait a bit for any changes
    await page.waitForTimeout(2000);

    console.log('📸 Taking AFTER screenshot...');
    await page.screenshot({ path: 'shift-after.png', fullPage: false });

    // Record positions AFTER
    const afterPositions = await page.evaluate(() => {
      const positions = {};
      ['marker-header', 'marker-tabs', 'marker-search', 'marker-thread', 'marker-loading', 'marker-filters'].forEach(cls => {
        const el = document.querySelector(`.${cls}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          positions[cls] = {
            top: rect.top,
            height: rect.height,
            bottom: rect.bottom
          };
        }
      });
      return positions;
    });

    console.log('\n📏 AFTER positions:');
    console.log(JSON.stringify(afterPositions, null, 2));

    // Calculate shifts
    console.log('\n🎯 SHIFT ANALYSIS:');
    ['marker-header', 'marker-tabs', 'marker-search', 'marker-thread', 'marker-loading', 'marker-filters'].forEach(section => {
      if (beforePositions[section] && afterPositions[section]) {
        const topShift = afterPositions[section].top - beforePositions[section].top;
        const heightChange = afterPositions[section].height - beforePositions[section].height;

        if (Math.abs(topShift) > 0.5 || Math.abs(heightChange) > 0.5) {
          console.log(`\n❌ ${section} MOVED:`);
          console.log(`   Position: ${beforePositions[section].top}px → ${afterPositions[section].top}px (${topShift > 0 ? '+' : ''}${topShift.toFixed(2)}px)`);
          console.log(`   Height: ${beforePositions[section].height}px → ${afterPositions[section].height}px (${heightChange > 0 ? '+' : ''}${heightChange.toFixed(2)}px)`);
        } else {
          console.log(`\n✅ ${section} - NO CHANGE`);
        }
      }
    });

    console.log('\n✅ Screenshots saved: shift-before.png and shift-after.png');
    console.log('Look at the colored borders to see which sections moved!');

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
})();
