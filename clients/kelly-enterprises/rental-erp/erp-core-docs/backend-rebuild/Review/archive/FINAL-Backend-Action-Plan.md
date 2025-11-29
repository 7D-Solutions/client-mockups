# FINAL Backend Action Plan - Field Naming Resolution

## Executive Summary

Based on database analysis and Cursor review:
- `location` field: **DOES NOT EXIST** in database - eradicate from code
- `job_number` field: **UNUSED PLACEHOLDER** in database - eradicate from code  
- `storage_location` field: **VALID** - keep for gauge entities only

## Critical Rules

1. **ERADICATE** all references to `location` and `job_number`
2. **ACCEPT** `storage_location` only on gauge endpoints
3. **REJECT** all location fields on checkout endpoints
4. **ENFORCE** strict validation in development; in production return HTTP 400 for invalid fields
5. **WIRE** route-level validators on gauge and checkout endpoints (body and relevant query params)

## Phase 1: Search and Destroy
**Tools**: Grep, Task

```bash
# Find ALL references to eradicate (expanded scope)
rg -n "\blocation\b|\bjob_number\b" backend/src --glob "*.{js,ts}"
rg -n "[\"']location[\"']|[\"']job_number[\"']" backend/src --glob "*.{js,ts}"
rg -n "\.location\b|\.job_number\b" backend/src --glob "*.{js,ts}"
rg -n "job_number|location" backend --glob "*.sql"

# Check joins/selects that could leak job_number from gauge_active_checkouts
rg -n "JOIN\s+.*gauge_active_checkouts|FROM\s+gauge_active_checkouts" backend/src --glob "*.{js,ts}"

# Optional: add a CI denylist to prevent reintroduction
# e.g., fail the build if these tokens appear in diffs
```

## Phase 2: Code Cleanup
**Tools**: Edit, MultiEdit

### CheckoutRepository.js
```javascript
// Remove ALL location/job_number references
async createCheckout(checkoutData) {
  const data = {
    gauge_id: checkoutData.gauge_id,
    checked_out_to: checkoutData.checked_out_to || checkoutData.user_id,
    checkout_date: checkoutData.checkout_date || new Date().toISOString(),
    expected_return: checkoutData.expected_return || checkoutData.expected_return_date,
    notes: checkoutData.notes || null
  };
  return await this.create(data);
}
```

### GaugeRepository.js
```javascript
// Remove phantom field, keep only valid fields
transformToDTO(dbGauge) {
  if (!dbGauge) return null;
  
  return {
    // Valid fields
    storage_location: dbGauge.storage_location,
    checked_out_to: dbGauge.checked_out_to ? String(dbGauge.checked_out_to) : null,
    
    // Boolean conversions
    is_active: Boolean(dbGauge.is_active),
    // ... other booleans
  };
}
```

### Apply across layers (repositories/services/routes)
- Ensure no repository or service accepts/returns `location` or `job_number`.
- Replace any broad `SELECT *` responses with explicit DTO whitelists to avoid leaking joined columns.
- Remove or update validators that referenced `location`/`job_number`.

## Phase 3: Strict Validation
**Tools**: Write

### strictFieldValidator.js
```javascript
const fieldRules = {
  gauge: {
    allowed: ['storage_location'],
    rejected: ['location', 'job_number']
  },
  checkout: {
    allowed: [],
    rejected: ['storage_location', 'location', 'job_number']
  }
};

function createValidator(type) {
  const rules = fieldRules[type];
  return (req, res, next) => {
    const invalid = rules.rejected.filter(f => req.body?.[f] !== undefined);
    
    // In production, always reject invalid fields with 400 to enforce API contracts
    if (invalid.length > 0 && (process.env.NODE_ENV === 'production' || process.env.STRICT_FIELD_VALIDATION === 'true')) {
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${invalid.join(', ')}`,
        invalidFields: invalid
      });
    }
    next();
  };
}
```

### Route-level wiring and telemetry
- Mount the validator on gauge create/update routes; and on checkout/return routes.
- Validate relevant query params as needed (not body-only) where misuse is possible.
- Emit metrics/logs for rejected fields (endpoint, actor, invalidFields) for observability.

## Phase 4: Thread Normalization
**Tools**: Edit

### gaugeService.js
```javascript
// Add BEFORE existing validation
normalizeThreadData(data) {
  if (data.thread_type && !data.thread_form) {
    const upperType = data.thread_type.toUpperCase();
    const forms = ['UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ', 'NPT', 'NPTF'];
    
    if (forms.includes(upperType)) {
      data.thread_form = upperType;
      data.thread_type = ['NPT', 'NPTF'].includes(upperType) ? 'npt' : 'standard';
    }
  }
  return data;
}
```

### Frontend alignment and telemetry (recommended)
- Export the canonical thread forms from backend so frontend uses the same list.
- Add a counter/metric for normalized thread inputs by form.

## Phase 5: Testing
**Tools**: Write

### Test Requirements
1. `location` and `job_number` are rejected on ALL endpoints
2. `storage_location` accepted ONLY on gauge endpoints  
3. Checkouts accept NO location fields
4. Boolean fields return as booleans
5. Thread normalization works
6. Negative tests assert 400 for payloads with forbidden fields in prod behavior
7. No leakage of `job_number` via joined queries (e.g., joining `gauge_active_checkouts`)

## Execution Steps

1. **Enable strict mode**: Set `STRICT_FIELD_VALIDATION=true`
2. **Search**: Find all references to `location` and `job_number`
3. **Eradicate**: Remove ALL occurrences
4. **Wire validators**: Mount route-level validators for gauges and checkouts
5. **Validate**: Add strict field validation and production 400 behavior
6. **Harden middleware**: add helmet, correct CORS error typing, fix error handler ordering
7. **Test**: Verify fields are properly rejected (including negative/join-leak tests)
8. **Add CI guard**: denylist `location` and `job_number` token reintroduction
9. **Docker restart**: Required after changes

## Success Criteria

- ✅ Zero references to `location` field in code
- ✅ Zero references to `job_number` field in code
- ✅ `storage_location` works only where valid
- ✅ All tests pass with strict validation
- ✅ No phantom fields in responses

## Additional Architectural Hardening (Recommended)

- Middleware
  - Add `app.use(helmet())` early; keep custom `securityHeaders` thereafter
  - Ensure CORS origin rejections produce a 403 (typed error or mapped in global handler)
  - Remove any duplicate mounts of `/api/health`
  - Mount `databaseErrorHandler` before `globalErrorHandler`

- Config/Infrastructure
  - Use `config.database.connectionLimit` in the MySQL pool (avoid hardcoded values)

- Repository Governance
  - Standardize DTO transforms across repositories; avoid `SELECT *` on API surfaces
  - In dev/staging, fail-fast unknown fields (create/update/patch) with 400 responses

- Observability
  - Add metrics: `invalid_fields_rejected`, `thread_inputs_normalized`, `phantom_field_prevented`
  - Expose via `/metrics` for dashboards/alerts