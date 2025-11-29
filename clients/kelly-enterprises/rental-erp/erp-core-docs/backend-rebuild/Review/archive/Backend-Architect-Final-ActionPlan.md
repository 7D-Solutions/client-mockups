# Backend Field Naming Resolution - Final Action Plan

## 🚨 CRITICAL INSTRUCTIONS (READ FIRST)

### Environment Requirements
- **Branch**: `development-core` 
- **Database**: MySQL on port 3307 (external, not containerized)
- **Docker Restart Required**: After ANY changes to `/erp-core/` files
- **Development Mode**: Set `STRICT_FIELD_VALIDATION=true` immediately

### Critical Constraints
1. **NO file deletion** - Move to `/review-for-delete/` instead
2. **Use existing ERP core services** - Never duplicate auth, data, or notification functionality  
3. **Production-quality code** - No quick fixes or patches
4. **Test in dedicated directories** - Never create `__tests__/` folders

### Database Schema Reality Check
**CRITICAL**: The `gauge_active_checkouts` table has `location` field, NOT `job_number`. We must either:
- Option A: Add migration to create `job_number` column (recommended)
- Option B: Continue using `location` field

## SuperClaude Execution Strategy

```bash
# Recommended execution with personas and flags
/analyze @backend/src/modules/gauge --focus database --persona-architect
/implement --type migration --persona-backend --safe-mode  
/test --focus emergency-fixes --persona-qa --validate
/improve --quality --persona-refactorer --loop
```

## Phase -1: Database Schema Validation & Migration [CRITICAL - DO FIRST]
**Persona**: `--persona-backend --persona-architect`
**Tools**: Read, Bash, Write, TodoWrite

### Action 1: Validate Current Schema

**File**: `backend/scripts/validate-schema-prereqs.js` (NEW)

```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

async function validateSchemaPrerequisites() {
  console.log('🔍 Validating database schema prerequisites...\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'host.docker.internal',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });
  
  try {
    // Check gauge_active_checkouts schema
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM gauge_active_checkouts"
    );
    
    const columnMap = {};
    columns.forEach(col => {
      columnMap[col.Field] = col.Type;
    });
    
    console.log('Current gauge_active_checkouts columns:', columnMap);
    
    // Critical validations
    const hasLocation = 'location' in columnMap;
    const hasJobNumber = 'job_number' in columnMap;
    const hasCheckedOutTo = 'checked_out_to' in columnMap;
    
    console.log('\n✓ Validation Results:');
    console.log(`  - location column: ${hasLocation ? 'EXISTS' : 'MISSING'}`);
    console.log(`  - job_number column: ${hasJobNumber ? 'EXISTS' : 'MISSING (NEEDS MIGRATION)'}`) ;
    console.log(`  - checked_out_to column: ${hasCheckedOutTo ? 'EXISTS' : 'MISSING'}`);
    
    if (!hasCheckedOutTo) {
      throw new Error('CRITICAL: checked_out_to column is missing!');
    }
    
    if (!hasJobNumber) {
      console.log('\n⚠️  ACTION REQUIRED: Run migration to add job_number column');
    }
    
    return { hasLocation, hasJobNumber, hasCheckedOutTo };
    
  } finally {
    await connection.end();
  }
}

validateSchemaPrerequisites().catch(console.error);
```

**Execute**: `cd backend && node scripts/validate-schema-prereqs.js`

### Action 2: Create Migration (If job_number missing)

**File**: `backend/migrations/004_add_job_number_column.sql` (NEW)

```sql
-- Migration: Add job_number column to gauge_active_checkouts
-- Purpose: Separate job/project number from physical location

-- Add the new column
ALTER TABLE gauge_active_checkouts 
ADD COLUMN job_number VARCHAR(255) DEFAULT NULL AFTER location,
ADD INDEX idx_job_number (job_number);

-- Migrate existing location data that looks like job numbers
UPDATE gauge_active_checkouts 
SET job_number = location 
WHERE location REGEXP '^[A-Z0-9-]+$'  -- Matches job number patterns
  AND location IS NOT NULL;

-- Add migration record
INSERT INTO schema_migrations (version, description) 
VALUES ('004_add_job_number_column', 'Add job_number field to gauge_active_checkouts');
```

**Execute**: Run migration if needed

## Phase 0: Emergency Production Fixes
**Persona**: `--persona-backend --persona-security`
**Tools**: Edit, MultiEdit, Read

### Fix 1: CheckoutRepository Field Mapping

**File**: `backend/src/modules/gauge/repositories/CheckoutRepository.js`

**Action**: Update ALL methods to handle both location and job_number

```javascript
// Line ~17 - Update createCheckout method
async createCheckout(checkoutData) {
  const data = {
    gauge_id: checkoutData.gauge_id,
    checked_out_to: checkoutData.checked_out_to || checkoutData.user_id,
    // Support both fields during transition
    location: checkoutData.location || checkoutData.storage_location,
    job_number: checkoutData.job_number || checkoutData.location, // Backwards compatibility
    checkout_date: checkoutData.checkout_date || new Date().toISOString(),
    expected_return: checkoutData.expected_return || checkoutData.expected_return_date,
    notes: checkoutData.notes || null
  };
  
  return await this.create(data);
}

// Line ~48 - Update checkout method
async checkout(gaugeId, userId, opts = {}) {
  const checkoutData = {
    gauge_id: gaugeId,
    checked_out_to: userId,
    job_number: opts.job_number || opts.location,  // Map location → job_number
    expected_return: opts.expectedReturn || null,
    notes: opts.notes || null
  };
  
  return await this.createCheckout(checkoutData);
}

// Line ~95 - Update return method
async return(gaugeId, userId, opts = {}) {
  const returnData = {
    gauge_id: gaugeId,
    returned_by: userId,
    job_number: opts.job_number || opts.location,  // Map location → job_number
    return_date: new Date().toISOString(),
    notes: opts.notes || null
  };
  
  // ... rest of method
}
```

### Fix 2: Thread Validation Enhancement

**File**: `backend/src/modules/gauge/services/gaugeService.js`

**Action**: Add normalization BEFORE existing validation (don't replace it!)

```javascript
// Add this method around line 36, before validateThreadFields
normalizeThreadData(data) {
  // Only normalize if we detect a form value in thread_type
  if (data.thread_type && !data.thread_form) {
    const upperType = data.thread_type.toUpperCase();
    const allForms = [
      ...THREAD_FORMS.standard,
      ...THREAD_FORMS.npt
    ];
    
    if (allForms.includes(upperType)) {
      // Move form value to correct field
      data.thread_form = upperType;
      // Set correct thread type
      data.thread_type = THREAD_FORMS.npt.includes(upperType) ? 'npt' : 'standard';
      
      console.log(`Normalized thread data: type="${data.thread_type}", form="${data.thread_form}"`);
    }
  }
  
  return data;
}

// Update create method around line 126
async create(gaugeData) {
  try {
    // Normalize FIRST
    const normalizedData = this.normalizeThreadData({...gaugeData});
    
    // Then use existing validation
    if (normalizedData.equipment_type === 'Thread') {
      const validationResult = this.validateThreadFields(normalizedData);
      if (!validationResult.isValid) {
        return validationResult;
      }
    }
    
    // Continue with existing create logic...
    const result = await this.repository.create(normalizedData);
    // ... rest of method
  }
}
```

### Fix 3: Remove Phantom Field

**File**: `backend/src/modules/gauge/repositories/GaugeRepository.js`

**Action**: Remove non-existent field from transformToDTO (line ~178)

```javascript
transformToDTO(dbGauge) {
  if (!dbGauge) return null;
  
  return {
    id: dbGauge.id ? String(dbGauge.id) : null,
    gauge_id: dbGauge.gauge_id,
    custom_id: dbGauge.custom_id || null,
    name: dbGauge.name,
    
    // REMOVE THIS LINE - field doesn't exist in database
    // checked_out_by_user_id: dbGauge.checked_out_by_user_id ? String(dbGauge.checked_out_by_user_id) : null,
    
    // KEEP THIS - this is the real field
    checked_out_to: dbGauge.checked_out_to ? String(dbGauge.checked_out_to) : null,
    
    // Boolean conversions
    is_sealed: Boolean(dbGauge.is_sealed),
    is_spare: Boolean(dbGauge.is_spare),
    is_active: Boolean(dbGauge.is_active),
    is_deleted: Boolean(dbGauge.is_deleted),
    
    // ... rest of fields
  };
}
```

**File**: `backend/src/modules/user/repositories/UserRepository.js`

**Action**: Fix SQL query to use correct field

```javascript
// Around line 25
async getGaugesAssignedToUser(userId) {
  const query = `
    SELECT g.*,
           gac.checked_out_to,
           gac.checkout_date,
           gac.expected_return
    FROM gauges g
    INNER JOIN gauge_active_checkouts gac ON g.id = gac.gauge_id
    WHERE gac.checked_out_to = ?  -- Use correct field name
      AND g.is_active = 1
      AND g.is_deleted = 0
  `;
  
  return await this.executeQuery(query, [userId]);
}
```

## Phase 1: Field Standardization
**Persona**: `--persona-architect --persona-refactorer`
**Tools**: Write, Edit, TodoWrite

### Action 4: Create Canonical Field Mappings

**File**: `backend/src/modules/gauge/constants/fieldMappings.js` (NEW)

```javascript
/**
 * Canonical field mappings for gauge module
 * Single source of truth for field name transformations
 */
const GAUGE_FIELD_MAPPINGS = {
  // Database to API mappings
  DB_TO_API: {
    'checked_out_to': 'checked_out_to_user_id',
    'expected_return': 'expected_return_date',
    'storage_location': 'storage_location',
    'location': 'location',  // Keep for now
    'job_number': 'job_number'
  },
  
  // API to Database mappings (reverse)
  API_TO_DB: {
    'checked_out_to_user_id': 'checked_out_to',
    'expected_return_date': 'expected_return',
    'storage_location': 'storage_location',
    'location': 'location',  // Legacy support
    'job_number': 'job_number'
  },
  
  // Boolean fields requiring type conversion
  BOOLEAN_FIELDS: [
    'is_sealed', 'is_spare', 'is_active', 'is_deleted',
    'has_pending_transfer', 'has_pending_unseal_request'
  ],
  
  // Fields that should be removed (phantom fields)
  PHANTOM_FIELDS: [
    'checked_out_by_user_id'
  ]
};

module.exports = GAUGE_FIELD_MAPPINGS;
```

### Action 5: Update GaugeRepository Transformations

**File**: `backend/src/modules/gauge/repositories/GaugeRepository.js`

**Action**: Import mappings and update both transform methods

```javascript
// Add at top with other requires
const GAUGE_FIELD_MAPPINGS = require('../constants/fieldMappings');

// Update transformToDTO method
transformToDTO(dbGauge) {
  if (!dbGauge) return null;
  
  const dto = {};
  
  // Apply field mappings systematically
  Object.entries(dbGauge).forEach(([dbField, value]) => {
    // Skip phantom fields
    if (GAUGE_FIELD_MAPPINGS.PHANTOM_FIELDS.includes(dbField)) {
      console.warn(`Skipping phantom field: ${dbField}`);
      return;
    }
    
    // Apply mapping or use original field name
    const apiField = GAUGE_FIELD_MAPPINGS.DB_TO_API[dbField] || dbField;
    dto[apiField] = value;
  });
  
  // Apply boolean conversions
  GAUGE_FIELD_MAPPINGS.BOOLEAN_FIELDS.forEach(field => {
    if (dto[field] !== undefined && dto[field] !== null) {
      dto[field] = Boolean(dto[field]);
    }
  });
  
  // Convert ID fields to strings
  ['id', 'checked_out_to_user_id', 'created_by_id', 'updated_by_id'].forEach(field => {
    if (dto[field] !== undefined && dto[field] !== null) {
      dto[field] = String(dto[field]);
    }
  });
  
  return dto;
}

// Update transformFromDTO method  
transformFromDTO(apiGauge) {
  const dbData = {};
  
  // Apply reverse mappings
  Object.entries(apiGauge).forEach(([apiField, value]) => {
    // Skip phantom fields
    if (GAUGE_FIELD_MAPPINGS.PHANTOM_FIELDS.includes(apiField)) {
      console.warn(`Skipping phantom field: ${apiField}`);
      return;
    }
    
    const dbField = GAUGE_FIELD_MAPPINGS.API_TO_DB[apiField] || apiField;
    dbData[dbField] = value;
  });
  
  // Convert booleans to integers for MySQL
  GAUGE_FIELD_MAPPINGS.BOOLEAN_FIELDS.forEach(field => {
    if (dbData[field] !== undefined) {
      dbData[field] = dbData[field] ? 1 : 0;
    }
  });
  
  return dbData;
}
```

## Phase 2: Testing & Validation
**Persona**: `--persona-qa --persona-analyzer`
**Tools**: Write, Bash, Read, Playwright

### Action 6: Create Emergency Fix Tests

**File**: `backend/tests/integration/modules/gauge/emergency-fixes.test.js` (NEW)

```javascript
const request = require('supertest');
const app = require('../../../../src/app');
const mysql = require('mysql2/promise');
require('dotenv').config();

describe('Emergency Field Naming Fixes', () => {
  let connection;
  
  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'host.docker.internal',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
  });
  
  afterAll(async () => {
    await connection.end();
  });
  
  describe('CheckoutRepository handles location→job_number mapping', () => {
    test('createCheckout accepts location and maps correctly', async () => {
      const checkoutData = {
        gauge_id: 'TEST-001',
        checked_out_to: '123',
        location: 'Workshop A'
      };
      
      const response = await request(app)
        .post('/api/gauges/TEST-001/checkout')
        .send(checkoutData)
        .expect(200);
      
      // Verify response
      expect(response.body.success).toBe(true);
      
      // Verify in database - check if job_number column exists
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM gauge_active_checkouts LIKE 'job_number'"
      );
      
      if (columns.length > 0) {
        // job_number exists, verify it was populated
        const [rows] = await connection.execute(
          'SELECT job_number, location FROM gauge_active_checkouts WHERE gauge_id = ?',
          ['TEST-001']
        );
        expect(rows[0].job_number).toBe('Workshop A');
      } else {
        // Only location exists, verify it was populated
        const [rows] = await connection.execute(
          'SELECT location FROM gauge_active_checkouts WHERE gauge_id = ?',
          ['TEST-001']
        );
        expect(rows[0].location).toBe('Workshop A');
      }
    });
  });
  
  describe('Thread validation accepts NPT in thread_type field', () => {
    test('normalizes thread form values in thread_type field', async () => {
      const gaugeData = {
        gauge_id: 'TG-NPT-001',
        name: 'NPT Test Gauge',
        equipment_type: 'Thread',
        thread_type: 'NPT',  // Form value, should be normalized
        thread_designation: '1/2-14 NPT'
      };
      
      const response = await request(app)
        .post('/api/gauges')
        .send(gaugeData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.thread_type).toBe('npt');
      expect(response.body.data.thread_form).toBe('NPT');
    });
    
    test('handles all standard thread forms', async () => {
      const threadForms = ['UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ'];
      
      for (const form of threadForms) {
        const response = await request(app)
          .post('/api/gauges')
          .send({
            gauge_id: `TG-${form}-001`,
            name: `${form} Test Gauge`,
            equipment_type: 'Thread',
            thread_type: form  // Should be normalized
          })
          .expect(201);
        
        expect(response.body.data.thread_type).toBe('standard');
        expect(response.body.data.thread_form).toBe(form);
      }
    });
  });
  
  describe('Phantom fields do not cause errors', () => {
    test('GaugeRepository omits phantom checked_out_by_user_id field', async () => {
      const response = await request(app)
        .get('/api/gauges/TEST-001')
        .expect(200);
      
      // Should have the real field but not the phantom
      expect(response.body.data).toHaveProperty('checked_out_to_user_id');
      expect(response.body.data).not.toHaveProperty('checked_out_by_user_id');
    });
    
    test('UserRepository uses correct field in queries', async () => {
      // This should not throw SQL error
      const response = await request(app)
        .get('/api/users/123/assigned-gauges')
        .expect(200);
      
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
  
  describe('Boolean fields return as booleans', () => {
    test('all boolean fields have correct type', async () => {
      const response = await request(app)
        .get('/api/gauges')
        .expect(200);
      
      if (response.body.data.length > 0) {
        const gauge = response.body.data[0];
        const booleanFields = [
          'is_active', 'is_sealed', 'is_spare', 'is_deleted',
          'has_pending_transfer', 'has_pending_unseal_request'
        ];
        
        booleanFields.forEach(field => {
          if (gauge.hasOwnProperty(field)) {
            expect(typeof gauge[field]).toBe('boolean');
            expect([true, false]).toContain(gauge[field]);
          }
        });
      }
    });
  });
});
```

### Action 7: Enable Strict Validation

**File**: `.env.development`

```bash
# Development Environment Settings
NODE_ENV=development

# Enable strict field validation to catch all issues
STRICT_FIELD_VALIDATION=true

# Database settings
DB_HOST=host.docker.internal
DB_PORT=3307
```

**File**: `backend/src/infrastructure/repositories/BaseRepository.js`

**Action**: Add strict validation mode

```javascript
// In the create method, add validation
async create(data) {
  const schema = await this.loadTableSchema();
  const validData = {};
  const unknownColumns = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (this.tableSchema.columns[key]) {
      validData[key] = value;
    } else {
      unknownColumns.push(key);
    }
  }
  
  if (unknownColumns.length > 0) {
    const message = `Unknown columns for table '${this.tableName}': ${unknownColumns.join(', ')}`;
    
    if (process.env.STRICT_FIELD_VALIDATION === 'true') {
      // Fail fast in development
      throw new Error(message);
    } else {
      // Log warning in production
      logger.warn(message);
    }
  }
  
  // Continue with validated data only
  const query = `INSERT INTO ${this.tableName} SET ?`;
  const [result] = await this.pool.execute(query, [validData]);
  return result;
}
```

## Phase 3: Verification & Monitoring
**Persona**: `--persona-analyzer --introspect`
**Tools**: Bash, Read, Grep

### Action 8: Create Verification Script

**File**: `backend/scripts/verify-field-fixes.js` (NEW)

```javascript
const mysql = require('mysql2/promise');
const chalk = require('chalk');
require('dotenv').config();

async function verifyFieldFixes() {
  console.log(chalk.bold('\n🔍 Verifying Field Name Fixes...\n'));
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'host.docker.internal',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // Test 1: Check schema state
    console.log(chalk.yellow('1. Checking database schema...'));
    const [checkoutCols] = await connection.execute(
      "SHOW COLUMNS FROM gauge_active_checkouts"
    );
    const colNames = checkoutCols.map(c => c.Field);
    
    if (colNames.includes('job_number')) {
      results.passed.push('✅ job_number column exists');
    } else {
      results.warnings.push('⚠️  job_number column missing - using location field');
    }
    
    if (!colNames.includes('checked_out_by_user_id')) {
      results.passed.push('✅ Phantom field not in schema');
    } else {
      results.failed.push('❌ Phantom field exists in database!');
    }
    
    // Test 2: Check for data consistency
    console.log(chalk.yellow('\n2. Checking data consistency...'));
    const [activeCheckouts] = await connection.execute(
      'SELECT COUNT(*) as count FROM gauge_active_checkouts WHERE checked_out_to IS NOT NULL'
    );
    results.passed.push(`✅ ${activeCheckouts[0].count} active checkouts found`);
    
    // Test 3: Check boolean field values
    console.log(chalk.yellow('\n3. Checking boolean field types...'));
    const [gauges] = await connection.execute(
      'SELECT is_active, is_sealed FROM gauges LIMIT 1'
    );
    if (gauges.length > 0) {
      const gauge = gauges[0];
      if (gauge.is_active === 0 || gauge.is_active === 1) {
        results.passed.push('✅ Boolean fields stored as TINYINT');
      }
    }
    
    // Summary
    console.log(chalk.bold('\n📊 Verification Summary:\n'));
    
    if (results.passed.length > 0) {
      console.log(chalk.green('Passed:'));
      results.passed.forEach(msg => console.log('  ' + msg));
    }
    
    if (results.warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      results.warnings.forEach(msg => console.log('  ' + msg));
    }
    
    if (results.failed.length > 0) {
      console.log(chalk.red('\nFailed:'));
      results.failed.forEach(msg => console.log('  ' + msg));
      process.exit(1);
    }
    
    console.log(chalk.green('\n✅ All critical checks passed!\n'));
    
  } finally {
    await connection.end();
  }
}

verifyFieldFixes().catch(console.error);
```

## Execution Checklist

### Pre-Flight Checks
- [ ] Run `node scripts/validate-schema-prereqs.js` (should confirm job_number exists)
- [ ] Set `STRICT_FIELD_VALIDATION=true` in .env
- [ ] Verify you're connected to the correct database

### Phase 0: Emergency Fixes
- [ ] Update CheckoutRepository.js (all methods)
- [ ] Update gaugeService.js (add normalization)
- [ ] Remove phantom field from GaugeRepository.js
- [ ] Fix UserRepository.js SQL query
- [ ] Run emergency tests: `npm test emergency-fixes`

### Phase 1: Standardization
- [ ] Create fieldMappings.js constants
- [ ] Update GaugeRepository transformations
- [ ] Test field mappings work correctly

### Phase 2: Validation
- [ ] Enable strict validation in BaseRepository
- [ ] Run all gauge tests
- [ ] Check logs for unknown column warnings

### Phase 3: Verification
- [ ] Run verification script
- [ ] Monitor application logs
- [ ] Restart Docker containers

## Success Criteria

1. **No data loss** - All checkout operations correctly map location to job_number
2. **Thread gauges can be created** - NPT values accepted
3. **No phantom field errors** - Logs clean of unknown column warnings
4. **Boolean types correct** - Frontend receives true/false not 0/1
5. **All tests pass** - Emergency fix tests succeed

## Docker Restart Commands

```bash
# After making changes, restart containers
docker-compose restart backend frontend

# Check logs
docker logs fireproof-erp-modular-backend-dev -f

# If issues, check database
docker exec -it fireproof-erp-modular-backend-dev bash
mysql -h host.docker.internal -P 3307 -u $DB_USER -p$DB_PASS $DB_NAME
```