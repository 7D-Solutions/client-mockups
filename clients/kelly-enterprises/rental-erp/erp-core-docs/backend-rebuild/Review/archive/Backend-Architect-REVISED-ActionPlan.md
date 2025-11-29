# Backend Field Naming Resolution - REVISED Action Plan (Post-Cursor Review)

## 🚨 CRITICAL UPDATES FROM CURSOR REVIEW

### Key Findings:
1. **`job_number`** - UNUSED PLACEHOLDER - Remove from all code paths
2. **`storage_location`** - The ONLY valid location field (on gauges entity)
3. **`location`** - INVALID - Do not map or accept anywhere
4. **Checkouts** - Should NOT accept any location-related fields

## 📋 Critical Instructions

### Environment
- **Branch**: `development-core`
- **Database**: MySQL port 3307
- **Mode**: Set `STRICT_FIELD_VALIDATION=true` immediately
- **Docker**: Restart required after `/erp-core/` changes

### Field Rules (STRICT)
1. **Gauges endpoints**: Accept `storage_location` only
2. **Checkout endpoints**: Accept NO location-related fields
3. **`job_number`**: ERADICATE - unused placeholder field
4. **`location`**: ERADICATE - field no longer exists in database

## Phase 0: ERADICATE location and job_number [CRITICAL]
**Persona**: `--persona-backend --persona-refactorer`
**Tools**: Edit, MultiEdit, Grep, Task

### SEARCH FIRST: Find ALL References
```bash
# Find any reference to 'location' field in gauge module
grep -r "location" backend/src/modules/gauge/ --include="*.js"

# Find any reference to 'job_number' field
grep -r "job_number" backend/src/modules/gauge/ --include="*.js"
```

### Action 1: Remove ALL location and job_number references from CheckoutRepository

**File**: `backend/src/modules/gauge/repositories/CheckoutRepository.js`

```javascript
// REMOVE any references to job_number
async createCheckout(checkoutData) {
  const data = {
    gauge_id: checkoutData.gauge_id,
    checked_out_to: checkoutData.checked_out_to || checkoutData.user_id,
    // REMOVED: job_number field (unused placeholder)
    // REMOVED: location field (no longer exists in DB)
    checkout_date: checkoutData.checkout_date || new Date().toISOString(),
    expected_return: checkoutData.expected_return || checkoutData.expected_return_date,
    notes: checkoutData.notes || null
  };
  
  return await this.create(data);
}

// Update checkout method - remove location fields
async checkout(gaugeId, userId, opts = {}) {
  const checkoutData = {
    gauge_id: gaugeId,
    checked_out_to: userId,
    // REMOVE all location-related fields
    expected_return: opts.expectedReturn || null,
    notes: opts.notes || null
  };
  
  return await this.createCheckout(checkoutData);
}
```

### Action 2: Clean GaugeRepository DTOs

**File**: `backend/src/modules/gauge/repositories/GaugeRepository.js`

```javascript
transformToDTO(dbGauge) {
  if (!dbGauge) return null;
  
  return {
    id: dbGauge.id ? String(dbGauge.id) : null,
    gauge_id: dbGauge.gauge_id,
    name: dbGauge.name,
    
    // KEEP storage_location - it's valid
    storage_location: dbGauge.storage_location,
    
    // REMOVE phantom field
    // checked_out_by_user_id: REMOVE THIS LINE
    
    // KEEP correct checkout field
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

## Phase 1: Strict Validation Implementation
**Persona**: `--persona-backend --persona-security`
**Tools**: Write, Edit

### Action 3: Create Strict Field Validator

**File**: `backend/src/middleware/strictFieldValidator.js` (NEW)

```javascript
const logger = require('../config/logger');

/**
 * Strict field validation per endpoint type
 */
const fieldValidationRules = {
  // Gauge endpoints accept storage_location
  gauge: {
    allowed: ['storage_location'],
    rejected: ['location', 'job_number'],
    entity: 'gauge'
  },
  
  // Checkout endpoints accept NO location fields
  checkout: {
    allowed: [],
    rejected: ['storage_location', 'location', 'job_number'],
    entity: 'checkout'
  }
};

function createFieldValidator(type) {
  const rules = fieldValidationRules[type];
  
  return (req, res, next) => {
    const invalidFields = [];
    const warnings = [];
    
    // Check for rejected fields
    rules.rejected.forEach(field => {
      if (req.body && req.body[field] !== undefined) {
        invalidFields.push(field);
      }
    });
    
    if (invalidFields.length > 0) {
      const message = `Invalid fields for ${rules.entity} endpoint: ${invalidFields.join(', ')}. ` +
                     `These fields are not accepted.`;
      
      if (process.env.STRICT_FIELD_VALIDATION === 'true') {
        // Strict mode: reject with 400
        return res.status(400).json({
          success: false,
          message,
          invalidFields
        });
      } else {
        // Non-strict: log warning and remove fields
        logger.warn(`Field validation warning: ${message}`, {
          endpoint: req.path,
          invalidFields,
          body: req.body
        });
        
        // Remove invalid fields
        invalidFields.forEach(field => {
          delete req.body[field];
        });
      }
    }
    
    next();
  };
}

module.exports = {
  validateGaugeFields: createFieldValidator('gauge'),
  validateCheckoutFields: createFieldValidator('checkout')
};
```

### Action 4: Apply Validation to Routes

**File**: `backend/src/modules/gauge/routes/gaugeRoutes.js`

```javascript
const { validateGaugeFields, validateCheckoutFields } = require('../../../middleware/strictFieldValidator');

// Apply to gauge endpoints
router.post('/gauges', validateGaugeFields, async (req, res, next) => {
  // ... existing handler
});

router.put('/gauges/:id', validateGaugeFields, async (req, res, next) => {
  // ... existing handler
});

// Apply to checkout endpoints  
router.post('/gauges/:id/checkout', validateCheckoutFields, async (req, res, next) => {
  // ... existing handler
});

router.post('/gauges/tracking/:id/checkout', validateCheckoutFields, async (req, res, next) => {
  // ... existing handler
});
```

## Phase 2: Thread Validation Enhancement
**Persona**: `--persona-backend`
**Tools**: Edit, Write

### Action 5: Export Thread Forms & Add Normalization

**File**: `backend/src/modules/gauge/constants/threadForms.js` (NEW)

```javascript
/**
 * Thread form constants - shared between frontend and backend
 */
const THREAD_FORMS = {
  standard: ['UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ'],
  npt: ['NPT', 'NPTF']
};

const ALL_THREAD_FORMS = [...THREAD_FORMS.standard, ...THREAD_FORMS.npt];

module.exports = {
  THREAD_FORMS,
  ALL_THREAD_FORMS
};
```

**File**: `backend/src/modules/gauge/services/gaugeService.js`

```javascript
// Import shared constants
const { THREAD_FORMS, ALL_THREAD_FORMS } = require('../constants/threadForms');

// Add normalization before validation
normalizeThreadData(data) {
  // Only normalize if thread_type contains a form value
  if (data.thread_type && !data.thread_form) {
    const upperType = data.thread_type.toUpperCase();
    
    if (ALL_THREAD_FORMS.includes(upperType)) {
      // Move form value to correct field
      data.thread_form = upperType;
      // Set correct thread type
      data.thread_type = THREAD_FORMS.npt.includes(upperType) ? 'npt' : 'standard';
      
      logger.info('Normalized thread input', {
        original: { thread_type: upperType },
        normalized: { thread_type: data.thread_type, thread_form: data.thread_form }
      });
    }
  }
  
  return data;
}

// Update create to normalize first
async create(gaugeData) {
  try {
    // Normalize thread data
    const normalizedData = this.normalizeThreadData({...gaugeData});
    
    // Continue with existing validation
    if (normalizedData.equipment_type === 'Thread') {
      const validationResult = this.validateThreadFields(normalizedData);
      if (!validationResult.isValid) {
        return validationResult;
      }
    }
    // ... rest of method
  }
}
```

## Phase 3: Canonical Field Mappings
**Persona**: `--persona-architect`
**Tools**: Write, Edit

### Action 6: Create Minimal Field Mappings

**File**: `backend/src/modules/gauge/constants/fieldMappings.js` (NEW)

```javascript
/**
 * Canonical field mappings - gauges only
 * NO mapping for location or job_number
 */
const GAUGE_FIELD_MAPPINGS = {
  // Only map what's actually used
  DB_TO_API: {
    'checked_out_to': 'checked_out_to_user_id',
    'expected_return': 'expected_return_date',
    'storage_location': 'storage_location'  // Direct mapping
  },
  
  API_TO_DB: {
    'checked_out_to_user_id': 'checked_out_to',
    'expected_return_date': 'expected_return',
    'storage_location': 'storage_location'  // Direct mapping
  },
  
  // Boolean fields requiring conversion
  BOOLEAN_FIELDS: [
    'is_sealed', 'is_spare', 'is_active', 'is_deleted',
    'has_pending_transfer', 'has_pending_unseal_request'
  ],
  
  // Phantom fields to remove
  PHANTOM_FIELDS: [
    'checked_out_by_user_id'
  ],
  
  // Fields that MUST be eradicated from codebase
  ERADICATED_FIELDS: [
    'location',      // No longer exists in database
    'job_number'     // Unused placeholder field
  ]
};

module.exports = GAUGE_FIELD_MAPPINGS;
```

## Phase 4: Repository Consistency
**Persona**: `--persona-refactorer`
**Tools**: Edit, MultiEdit

### Action 7: Ensure All Repositories Use DTO Layer

**File**: `backend/src/modules/gauge/repositories/GaugeSearchRepository.js`

```javascript
const GaugeRepository = require('./GaugeRepository');
const GAUGE_FIELD_MAPPINGS = require('../constants/fieldMappings');

class GaugeSearchRepository extends BaseRepository {
  constructor() {
    super('gauges');
  }
  
  // Add DTO transformation
  transformToDTO(dbResult) {
    // Delegate to GaugeRepository's transformation
    return GaugeRepository.prototype.transformToDTO.call(this, dbResult);
  }
  
  // Update search to use transformation
  async searchGauges(criteria) {
    // ... existing query logic ...
    
    const results = await this.executeQuery(query, params);
    
    // Apply transformation to ensure consistency
    return results.map(result => this.transformToDTO(result));
  }
}
```

## Phase 5: Testing Requirements
**Persona**: `--persona-qa`
**Tools**: Write

### Action 8: Integration Tests for Revised Requirements

**File**: `backend/tests/integration/modules/gauge/strict-validation.test.js` (NEW)

```javascript
const request = require('supertest');
const app = require('../../../../src/app');

describe('Strict Field Validation', () => {
  describe('job_number rejection', () => {
    test('rejects job_number on gauge endpoints', async () => {
      const response = await request(app)
        .post('/api/gauges')
        .send({
          gauge_id: 'TEST-001',
          name: 'Test Gauge',
          job_number: 'Should be rejected'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.invalidFields).toContain('job_number');
    });
    
    test('rejects job_number on checkout endpoints', async () => {
      const response = await request(app)
        .post('/api/gauges/TEST-001/checkout')
        .send({
          user_id: '123',
          job_number: 'Should be rejected'
        })
        .expect(400);
      
      expect(response.body.invalidFields).toContain('job_number');
    });
  });
  
  describe('storage_location validation', () => {
    test('accepts storage_location on gauge endpoints', async () => {
      const response = await request(app)
        .post('/api/gauges')
        .send({
          gauge_id: 'TEST-002',
          name: 'Test Gauge',
          storage_location: 'Warehouse A'
        })
        .expect(201);
      
      expect(response.body.data.storage_location).toBe('Warehouse A');
    });
    
    test('rejects storage_location on checkout endpoints', async () => {
      const response = await request(app)
        .post('/api/gauges/TEST-002/checkout')
        .send({
          user_id: '123',
          storage_location: 'Should be rejected'
        })
        .expect(400);
      
      expect(response.body.invalidFields).toContain('storage_location');
    });
  });
  
  describe('eradicated field rejection', () => {
    test('rejects location on all endpoints', async () => {
      // Test gauge endpoint
      const gaugeResponse = await request(app)
        .post('/api/gauges')
        .send({
          gauge_id: 'TEST-003',
          location: 'Should be rejected'
        })
        .expect(400);
      
      expect(gaugeResponse.body.invalidFields).toContain('location');
      
      // Test checkout endpoint
      const checkoutResponse = await request(app)
        .post('/api/gauges/TEST-003/checkout')
        .send({
          user_id: '123',
          location: 'Should be rejected'
        })
        .expect(400);
      
      expect(checkoutResponse.body.invalidFields).toContain('location');
    });
  });
  
  describe('phantom field removal', () => {
    test('no checked_out_by_user_id in responses', async () => {
      const response = await request(app)
        .get('/api/gauges/TEST-001')
        .expect(200);
      
      expect(response.body.data).not.toHaveProperty('checked_out_by_user_id');
      expect(response.body.data).toHaveProperty('checked_out_to_user_id');
    });
  });
  
  describe('boolean field consistency', () => {
    test('returns booleans not integers', async () => {
      const response = await request(app)
        .get('/api/gauges')
        .expect(200);
      
      if (response.body.data.length > 0) {
        const gauge = response.body.data[0];
        ['is_active', 'is_sealed', 'is_spare'].forEach(field => {
          if (gauge.hasOwnProperty(field)) {
            expect(typeof gauge[field]).toBe('boolean');
          }
        });
      }
    });
  });
  
  describe('thread normalization', () => {
    test('normalizes NPT in thread_type to proper fields', async () => {
      const response = await request(app)
        .post('/api/gauges')
        .send({
          gauge_id: 'TG-001',
          name: 'NPT Gauge',
          equipment_type: 'Thread',
          thread_type: 'NPT'  // Should be normalized
        })
        .expect(201);
      
      expect(response.body.data.thread_type).toBe('npt');
      expect(response.body.data.thread_form).toBe('NPT');
    });
    
    test('normalizes all standard thread forms', async () => {
      const forms = ['UN', 'UNF', 'UNEF'];
      
      for (const form of forms) {
        const response = await request(app)
          .post('/api/gauges')
          .send({
            gauge_id: `TG-${form}`,
            name: `${form} Gauge`,
            equipment_type: 'Thread',
            thread_type: form
          })
          .expect(201);
        
        expect(response.body.data.thread_type).toBe('standard');
        expect(response.body.data.thread_form).toBe(form);
      }
    });
  });
});
```

## Phase 6: Observability & Monitoring
**Persona**: `--persona-devops --persona-analyzer`
**Tools**: Write, Edit

### Action 9: Add Metrics and Logging

**File**: `backend/src/config/metrics.js` (NEW)

```javascript
const prometheus = require('prom-client');

// Create custom metrics
const unknownFieldsRejected = new prometheus.Counter({
  name: 'unknown_fields_rejected_total',
  help: 'Total number of requests with rejected unknown fields',
  labelNames: ['endpoint', 'field']
});

const normalizedThreadInputs = new prometheus.Counter({
  name: 'normalized_thread_inputs_total',
  help: 'Total number of thread inputs that were normalized'
});

const phantomFieldDetected = new prometheus.Counter({
  name: 'phantom_field_reference_detected_total',
  help: 'Total phantom field references detected',
  labelNames: ['field', 'location']
});

module.exports = {
  unknownFieldsRejected,
  normalizedThreadInputs,
  phantomFieldDetected,
  register: prometheus.register
};
```

## Execution Checklist

### Immediate Actions
- [ ] Set `STRICT_FIELD_VALIDATION=true` in .env
- [ ] Remove ALL `job_number` references from code
- [ ] Remove ALL `location` field mappings
- [ ] Fix phantom `checked_out_by_user_id` references

### Phase Implementation
- [ ] Phase 0: Remove job_number from all repositories
- [ ] Phase 1: Implement strict field validation
- [ ] Phase 2: Add thread normalization with shared constants
- [ ] Phase 3: Create minimal canonical mappings
- [ ] Phase 4: Ensure repository consistency
- [ ] Phase 5: Run comprehensive tests
- [ ] Phase 6: Add observability metrics

### Validation
- [ ] Run strict validation tests
- [ ] Check logs for rejected fields
- [ ] Verify no phantom fields in responses
- [ ] Confirm boolean consistency
- [ ] Test thread normalization

## Key Differences from Previous Plan

1. **job_number** - Completely removed, not mapped
2. **location** - Treated as invalid, never mapped
3. **storage_location** - Only accepted on gauge endpoints
4. **Checkouts** - Accept NO location fields at all
5. **Strict validation** - Reject invalid fields with clear messages
6. **Minimal mappings** - Only map fields that actually need transformation