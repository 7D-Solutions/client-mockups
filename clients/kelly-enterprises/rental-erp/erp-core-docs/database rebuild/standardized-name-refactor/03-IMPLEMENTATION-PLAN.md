# Implementation Plan: Standardized Name Refactor

**Date**: 2025-10-28
**Estimated Time**: 2.5 hours
**Type**: Breaking Change (No Backward Compatibility)

---

## Overview

This document provides step-by-step instructions for removing `standardized_name` from the database and implementing computed display names.

---

## Pre-Implementation Checklist

- [x] All current work committed to Git
- [ ] Plan documentation reviewed and approved
- [ ] Development environment ready
- [ ] Database backup created
- [ ] Team notified of breaking change
- [ ] Test environment available for verification

---

## Phase 1: Database Migration (5 minutes)

### Step 1.1: Create Migration File

**File**: `backend/src/infrastructure/database/migrations/012-remove-standardized-name.sql`

```sql
-- Migration 012: Remove standardized_name column
-- Rationale: Display names should be computed from specifications, not stored
-- Impact: BREAKING CHANGE - removes standardized_name column
-- Date: 2025-10-28

-- Step 1: Drop FULLTEXT index that includes standardized_name
DROP INDEX idx_search ON gauges;

-- Step 2: Remove the standardized_name column
ALTER TABLE gauges DROP COLUMN standardized_name;

-- Step 3: Add optimized search indexes on actual data fields
CREATE INDEX idx_gauge_id_search ON gauges(gauge_id);
CREATE INDEX idx_serial_search ON gauges(serial_number);
CREATE INDEX idx_thread_size_search ON gauge_thread_specifications(thread_size);
CREATE INDEX idx_thread_class_search ON gauge_thread_specifications(thread_class);

-- Step 4: Optimize JOIN performance with composite index
CREATE INDEX idx_thread_spec_lookup
ON gauge_thread_specifications(gauge_id, thread_size, thread_type, thread_class, gauge_type);

-- Step 5: Remove gauge_suffix from gauge_thread_specifications if it exists
-- (It should only be in gauges table, not specs table - architecturally incorrect placement)
-- Using IF EXISTS for safety in case column doesn't exist in some environments
ALTER TABLE gauge_thread_specifications DROP COLUMN IF EXISTS gauge_suffix;
```

### Step 1.2: Test Migration on Development Database

```bash
cd backend

# Backup current database
mysqldump -h localhost -P 3307 -u root -p'fireproof2024' fai_db_sandbox > backup_before_migration_$(date +%Y%m%d).sql

# Run migration
mysql -h localhost -P 3307 -u root -p'fireproof2024' fai_db_sandbox < src/infrastructure/database/migrations/012-remove-standardized-name.sql

# Verify column removed
mysql -h localhost -P 3307 -u root -p'fireproof2024' -D fai_db_sandbox -e "DESCRIBE gauges;"

# Verify indexes created
mysql -h localhost -P 3307 -u root -p'fireproof2024' -D fai_db_sandbox -e "SHOW INDEX FROM gauge_thread_specifications;"
```

**Expected Output**:
- `standardized_name` column no longer in `gauges` table
- New indexes present on specification fields
- No errors

---

## Phase 2: Backend Presenter Layer (30 minutes)

### Step 2.1: Create GaugePresenter

**File**: `backend/src/modules/gauge/presenters/GaugePresenter.js`

```javascript
/**
 * GaugePresenter
 *
 * Presentation layer for gauge display formatting.
 * Single source of truth for all name generation logic.
 *
 * Responsibilities:
 * - Format gauge display names from specifications
 * - Convert thread sizes to decimal format
 * - Handle different equipment types (thread_gauge, hand_tool, etc.)
 * - Enrich DTOs with display-ready fields
 */

class GaugePresenter {
  // Standard numbered thread sizes (ANSI B1.1)
  static NUMBER_SIZES = {
    '0': '.060', '1': '.073', '2': '.086', '3': '.099',
    '4': '.112', '5': '.125', '6': '.138', '8': '.164',
    '10': '.190', '12': '.216'
  };

  /**
   * Enrich gauge entity with display fields
   * @param {object} gauge - Gauge entity with specifications
   * @returns {object} DTO with displayName added
   */
  static toDTO(gauge) {
    if (!gauge) return null;

    return {
      ...gauge,
      displayName: this.formatDisplayName(gauge)
    };
  }

  /**
   * Format display name based on equipment type
   * @param {object} gauge - Gauge entity
   * @returns {string} Formatted display name
   */
  static formatDisplayName(gauge) {
    switch (gauge.equipmentType) {
      case 'thread_gauge':
        return this.formatThreadGaugeName(gauge);
      case 'hand_tool':
        return this.formatHandToolName(gauge);
      case 'large_equipment':
        return this.formatLargeEquipmentName(gauge);
      case 'calibration_standard':
        return this.formatCalibrationStandardName(gauge);
      default:
        return gauge.name; // Fallback to user-entered name
    }
  }

  /**
   * Format thread gauge display name
   * @param {object} gauge - Gauge with thread specifications
   * @returns {string} Formatted name (e.g., ".250 UN 2A Thread Plug Gauge GO")
   */
  static formatThreadGaugeName(gauge) {
    if (!gauge.specifications) {
      return gauge.name; // Fallback for incomplete data
    }

    const { threadSize, threadForm, threadClass, gaugeType } = gauge.specifications;

    // Convert fractions and numbered sizes to decimal
    const size = this.convertToDecimal(threadSize);

    // Build name from parts
    const parts = [
      size,
      threadForm,
      threadClass,
      'Thread',
      gaugeType,
      'Gauge'
    ].filter(Boolean); // Remove any undefined/null values

    let name = parts.join(' ');

    // Add GO/NO GO suffix based on gauge_suffix
    if (gauge.gaugeSuffix === 'A') name += ' GO';
    if (gauge.gaugeSuffix === 'B') name += ' NO GO';

    return name;
  }

  /**
   * Format hand tool display name
   * @param {object} gauge - Gauge with hand tool specifications
   * @returns {string} Formatted name
   */
  static formatHandToolName(gauge) {
    if (!gauge.specifications) return gauge.name;

    const { toolType, format, rangeMin, rangeMax, rangeUnit } = gauge.specifications;
    return `${toolType} (${format}) ${rangeMin}-${rangeMax} ${rangeUnit}`;
  }

  /**
   * Format large equipment display name
   * @param {object} gauge - Gauge with large equipment specifications
   * @returns {string} Formatted name
   */
  static formatLargeEquipmentName(gauge) {
    if (!gauge.specifications) return gauge.name;

    const { equipmentType, capacity } = gauge.specifications;
    return capacity ? `${equipmentType} (${capacity})` : equipmentType;
  }

  /**
   * Format calibration standard display name
   * @param {object} gauge - Gauge with calibration standard specifications
   * @returns {string} Formatted name
   */
  static formatCalibrationStandardName(gauge) {
    if (!gauge.specifications) return gauge.name;

    const { standardType, nominalValue, uncertaintyUnits } = gauge.specifications;
    return `${standardType} ${nominalValue} ${uncertaintyUnits}`;
  }

  /**
   * Convert thread size to decimal format
   * @param {string} size - Thread size (e.g., "1/4-20", "10", ".250")
   * @returns {string} Decimal representation
   */
  static convertToDecimal(size) {
    if (!size) return size;

    // Handle fractions: "1/4-20" → ".250-20"
    if (size.includes('/')) {
      const parts = size.split('-');
      const fraction = parts[0];
      const [numerator, denominator] = fraction.split('/').map(Number);

      if (denominator > 0) {
        const decimal = '.' + Math.floor(numerator / denominator * 1000).toString().padStart(3, '0');
        return parts[1] ? `${decimal}-${parts[1]}` : decimal;
      }
    }

    // Handle numbered sizes (ANSI B1.1)
    return this.NUMBER_SIZES[size] || size;
  }
}

module.exports = GaugePresenter;
```

### Step 2.2: Create Tests for Presenter

**File**: `backend/tests/modules/gauge/presenters/GaugePresenter.test.js`

```javascript
const GaugePresenter = require('../../../../src/modules/gauge/presenters/GaugePresenter');

describe('GaugePresenter', () => {
  describe('formatThreadGaugeName', () => {
    it('formats standard thread gauge with GO suffix', () => {
      const gauge = {
        equipmentType: 'thread_gauge',
        gaugeSuffix: 'A',
        specifications: {
          threadSize: '1/4-20',
          threadForm: 'UN',
          threadClass: '2A',
          gaugeType: 'Plug'
        }
      };

      expect(GaugePresenter.formatDisplayName(gauge))
        .toBe('.250-20 UN 2A Thread Plug Gauge GO');
    });

    it('formats NO GO gauge', () => {
      const gauge = {
        equipmentType: 'thread_gauge',
        gaugeSuffix: 'B',
        specifications: {
          threadSize: '1/4-20',
          threadForm: 'UN',
          threadClass: '2A',
          gaugeType: 'Ring'
        }
      };

      expect(GaugePresenter.formatDisplayName(gauge))
        .toBe('.250-20 UN 2A Thread Ring Gauge NO GO');
    });

    it('converts numbered sizes to decimal', () => {
      const gauge = {
        equipmentType: 'thread_gauge',
        gaugeSuffix: 'A',
        specifications: {
          threadSize: '10',
          threadForm: 'UN',
          threadClass: '2A',
          gaugeType: 'Plug'
        }
      };

      expect(GaugePresenter.formatDisplayName(gauge))
        .toBe('.190 UN 2A Thread Plug Gauge GO');
    });

    it('handles missing thread_form', () => {
      const gauge = {
        equipmentType: 'thread_gauge',
        gaugeSuffix: 'A',
        specifications: {
          threadSize: '1/4-20',
          threadForm: null,
          threadClass: '2A',
          gaugeType: 'Plug'
        }
      };

      expect(GaugePresenter.formatDisplayName(gauge))
        .toBe('.250-20 2A Thread Plug Gauge GO');
    });
  });

  describe('convertToDecimal', () => {
    it('converts simple fractions', () => {
      expect(GaugePresenter.convertToDecimal('1/4')).toBe('.250');
      expect(GaugePresenter.convertToDecimal('3/8')).toBe('.375');
      expect(GaugePresenter.convertToDecimal('1/2')).toBe('.500');
    });

    it('converts fractions with pitch', () => {
      expect(GaugePresenter.convertToDecimal('1/4-20')).toBe('.250-20');
      expect(GaugePresenter.convertToDecimal('3/8-16')).toBe('.375-16');
    });

    it('converts numbered sizes', () => {
      expect(GaugePresenter.convertToDecimal('10')).toBe('.190');
      expect(GaugePresenter.convertToDecimal('12')).toBe('.216');
    });

    it('returns unchanged if already decimal', () => {
      expect(GaugePresenter.convertToDecimal('.250')).toBe('.250');
      expect(GaugePresenter.convertToDecimal('.375-16')).toBe('.375-16');
    });
  });
});
```

---

## Phase 3: Update Repository Layer (15 minutes)

### Step 3.1: Update GaugeRepository

**File**: `backend/src/modules/gauge/repositories/GaugeRepository.js`

**Changes**:

1. Update `getGaugeById` to include specifications JOIN
2. Update `findByFilters` to include specifications JOIN
3. Add helper method `_mapRowToGauge` to structure specifications

```javascript
// Add at top of file
const GaugePresenter = require('../presenters/GaugePresenter');

// Update getGaugeById method
async getGaugeById(id, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;

  try {
    const [rows] = await connection.query(`
      SELECT
        g.*,
        ts.thread_size,
        ts.thread_type,
        ts.thread_form,
        ts.thread_class,
        ts.gauge_type,
        ts.thread_hand,
        ts.acme_starts
      FROM gauges g
      LEFT JOIN gauge_thread_specifications ts ON g.id = ts.gauge_id
      WHERE g.id = ? AND g.is_deleted = 0
    `, [id]);

    if (rows.length === 0) return null;

    return this._mapRowToGauge(rows[0]);
  } finally {
    if (shouldRelease) connection.release();
  }
}

// Update findByFilters method
async findByFilters(filters, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;

  try {
    const { sql, params } = this._buildFilterQuery(filters);
    const [rows] = await connection.query(sql, params);

    return rows.map(row => this._mapRowToGauge(row));
  } finally {
    if (shouldRelease) connection.release();
  }
}

// Add new helper method
_mapRowToGauge(row) {
  const gauge = GaugeDTOMapper.transformToDTO(row);

  // Structure specifications if present
  if (row.thread_size) {
    gauge.specifications = {
      threadSize: row.thread_size,
      threadType: row.thread_type,
      threadForm: row.thread_form,
      threadClass: row.thread_class,
      gaugeType: row.gauge_type,
      threadHand: row.thread_hand,
      acmeStarts: row.acme_starts
    };
  }

  return gauge;
}

// Update _buildFilterQuery to include JOIN
_buildFilterQuery(filters) {
  let sql = `
    SELECT
      g.*,
      ts.thread_size,
      ts.thread_type,
      ts.thread_form,
      ts.thread_class,
      ts.gauge_type,
      ts.thread_hand,
      ts.acme_starts
    FROM gauges g
    LEFT JOIN gauge_thread_specifications ts ON g.id = ts.gauge_id
    WHERE g.is_deleted = 0
  `;

  const params = [];

  if (filters.categoryId) {
    sql += ' AND g.category_id = ?';
    params.push(filters.categoryId);
  }

  if (filters.status) {
    sql += ' AND g.status = ?';
    params.push(filters.status);
  }

  if (filters.search) {
    sql += ` AND (
      g.gauge_id LIKE ? OR
      g.serial_number LIKE ? OR
      ts.thread_size LIKE ?
    )`;
    const searchParam = `%${filters.search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  sql += ' ORDER BY g.id DESC LIMIT ?';
  params.push(filters.limit || 100);

  return { sql, params };
}
```

---

## Phase 4: Update Service Layer (10 minutes)

### Step 4.1: Update GaugeQueryService

**File**: `backend/src/modules/gauge/services/GaugeQueryService.js`

```javascript
// Add at top of file
const GaugePresenter = require('../presenters/GaugePresenter');

// Update getGaugeById
async getGaugeById(gaugeId) {
  const gauge = await this.repository.getGaugeById(gaugeId);
  return GaugePresenter.toDTO(gauge);  // Enriches with displayName
}

// Update getGauges
async getGauges(filters) {
  const gauges = await this.repository.findByFilters(filters);
  return gauges.map(g => GaugePresenter.toDTO(g));
}

// Update searchGauges
async searchGauges(query) {
  const gauges = await this.repository.findByFilters({
    search: query,
    limit: 20
  });
  return gauges.map(g => GaugePresenter.toDTO(g));
}
```

### Step 4.2: Update GaugeCreationService

**File**: `backend/src/modules/gauge/services/GaugeCreationService.js`

```javascript
// Add at top
const GaugePresenter = require('../presenters/GaugePresenter');

// Update createGauge - REMOVE standardized_name generation
async createGauge(gaugeData, userId) {
  // ... validation ...

  // Remove this line:
  // const standardizedName = this.generateStandardizedName(gaugeData);

  const gauge = await this.repository.createGauge({
    ...gaugeData,
    // REMOVE: standardized_name: standardizedName,
    created_by: userId
  });

  // Return with displayName
  return GaugePresenter.toDTO(gauge);
}

// DELETE these methods entirely:
// - generateStandardizedName()
// - convertToDecimal()
// - static NUMBER_SIZES
// (They now live in GaugePresenter)
```

---

## Phase 5: Update Frontend (20 minutes)

### Step 5.1: Update TypeScript Types

**File**: `frontend/src/modules/gauge/types/index.ts`

```typescript
export interface Gauge {
  id: number;
  gaugeId: string;
  displayName: string;  // CHANGED: was standardized_name
  equipmentType: string;
  status: string;
  gaugeSuffix?: string;
  specifications?: ThreadSpecifications;
  // ... rest of fields
}

export interface ThreadSpecifications {
  threadSize: string;
  threadType: string;
  threadForm?: string;
  threadClass: string;
  gaugeType: string;
  threadHand?: string;
  acmeStarts?: number;
}
```

### Step 5.2: Global Search and Replace

```bash
cd frontend/src

# Find all occurrences (verification)
grep -r "standardized_name" . --files-with-matches

# Replace all occurrences
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/standardized_name/displayName/g' {} +

# Verify replacement
grep -r "standardized_name" . --files-with-matches
# Should return no results
```

**Files likely affected**:
- `modules/gauge/components/GaugeList.tsx`
- `modules/gauge/components/GaugeDetail.tsx`
- `modules/gauge/components/GaugeModalManager.tsx`
- `modules/gauge/pages/*.tsx`
- `modules/gauge/services/gaugeService.ts`

---

## Phase 6: Remove Old Code (10 minutes)

### Step 6.1: Clean Up Backend

```javascript
// backend/src/modules/gauge/services/GaugeCreationService.js
// DELETE these methods:
// - generateStandardizedName()
// - convertToDecimal()
// - static NUMBER_SIZES

// backend/src/modules/gauge/domain/GaugeEntity.js
// REMOVE this field from constructor:
// this.standardizedName = data.standardized_name;

// REMOVE from toDatabase():
// standardized_name: this.standardizedName,
```

### Step 6.2: Update Documentation

**File**: `backend/docs/API_CHANGES.md` (create if doesn't exist)

```markdown
# API Breaking Changes

## 2025-10-28: Removed standardized_name

**BREAKING CHANGE**: The `standardized_name` field has been removed from gauge responses.

### Migration Guide

**Before**:
```json
{
  "id": 123,
  "gauge_id": "GB0045A",
  "standardized_name": ".250 UN 2A Thread Plug Gauge GO",
  "status": "available"
}
```

**After**:
```json
{
  "id": 123,
  "gauge_id": "GB0045A",
  "displayName": ".250 UN 2A Thread Plug Gauge GO",
  "specifications": {
    "threadSize": "1/4-20",
    "threadType": "standard",
    "threadForm": "UN",
    "threadClass": "2A",
    "gaugeType": "Plug"
  },
  "status": "available"
}
```

**Action Required**: Replace all uses of `standardized_name` with `displayName`.
```

---

## Phase 7: Testing (30 minutes)

### Step 7.1: Unit Tests

```bash
cd backend

# Run presenter tests
npm test -- GaugePresenter.test.js

# Run repository tests
npm test -- GaugeRepository.test.js

# Run service tests
npm test -- GaugeQueryService.test.js
```

### Step 7.2: Integration Tests

```bash
# Run gauge API integration tests
npm test -- tests/integration/modules/gauge/

# Expected: All tests pass with displayName instead of standardized_name
```

### Step 7.3: Frontend Tests

```bash
cd frontend

# Build to check for TypeScript errors
npm run build

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

### Step 7.4: Manual Verification Checklist

- [ ] Gauge list displays names correctly
- [ ] Gauge detail page shows correct name
- [ ] Search by thread size works
- [ ] Pairing validates specs correctly
- [ ] Create gauge wizard works
- [ ] Edit gauge updates specs and name updates automatically
- [ ] Calibration pages display names correctly
- [ ] Export/reports show correct names

---

## Phase 8: Deployment (10 minutes)

### Step 8.1: Commit Changes

```bash
git add .
git commit -m "refactor: Remove standardized_name, compute displayName

BREAKING CHANGE: standardized_name field removed from API responses.
Replace with displayName which is computed from specifications.

- Database: Remove standardized_name column, add search indexes
- Backend: Add GaugePresenter for name formatting
- Frontend: Update all references to use displayName
- Tests: Update expectations for new field name

Rationale: Display names should be computed from source data,
not stored as derived data. Improves maintainability and flexibility.

See: erp-core-docs/database rebuild/standardized-name-refactor/
"
```

### Step 8.2: Restart Services

```bash
docker-compose restart backend frontend
```

### Step 8.3: Smoke Test

```bash
# Test API endpoint
curl http://localhost:8000/api/gauges/v2/1 | jq '.displayName'

# Should return: ".250 UN 2A Thread Plug Gauge GO" (or similar)
```

---

## Post-Implementation Checklist

- [ ] Database migration completed successfully
- [ ] Backend tests pass
- [ ] Frontend builds without errors
- [ ] Manual verification complete
- [ ] Documentation updated
- [ ] Changes committed to Git
- [ ] Services restarted
- [ ] Smoke tests pass
- [ ] Team notified of deployment

---

## Rollback Procedure

See `06-ROLLBACK-PLAN.md` for detailed rollback instructions.

**Quick rollback**:
```bash
# Restore database from backup
mysql -h localhost -P 3307 -u root -p'fireproof2024' fai_db_sandbox < backup_before_migration_YYYYMMDD.sql

# Revert Git changes
git revert HEAD

# Restart services
docker-compose restart backend frontend
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-28
**Implementation Status**: Ready to Execute
