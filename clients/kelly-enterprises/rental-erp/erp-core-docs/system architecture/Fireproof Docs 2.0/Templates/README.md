# Module Template System

**Purpose**: Reusable templates for rapid module generation based on proven gauge module architecture patterns.

## Overview

This template system allows you to generate complete, production-ready modules in hours instead of days by applying the battle-tested patterns from the gauge module to new domains.

## Template Structure

```
Templates/
├── README.md                           # This file
├── module-config.schema.json           # Configuration schema
├── examples/                           # Example configurations
│   ├── cattle-config.json
│   ├── equipment-config.json
│   └── airbnb-config.json
├── backend/                            # Backend templates
│   ├── Repository.template.js
│   ├── Service.template.js
│   ├── Routes.template.js
│   ├── DTOMapper.template.js
│   ├── Domain.template.js
│   └── Migration.template.sql
└── frontend/                           # Frontend templates
    ├── Page.template.tsx
    ├── ModalManager.template.tsx
    ├── Form.template.tsx
    ├── Hooks.template.ts
    ├── Service.template.ts
    └── Types.template.ts
```

## How Templates Work

### 1. Variable Substitution

Templates use `{{VARIABLE}}` placeholders that get replaced with actual values:

```javascript
// Template
class {{ENTITY_NAME}}Repository extends BaseRepository {
  constructor() {
    super('{{ENTITY_TABLE}}');
  }
}

// Generated (cattle module)
class CowRepository extends BaseRepository {
  constructor() {
    super('cows');
  }
}
```

### 2. Configuration-Driven

Each module is defined by a JSON configuration file:

```json
{
  "moduleName": "cattle",
  "entityName": "Cow",
  "entityNamePlural": "Cows",
  "entityTable": "cows",
  "entityBusinessId": "tag_id",
  "fields": {
    "tag_id": { "type": "string", "required": true },
    "breed": { "type": "string", "required": true },
    "age": { "type": "integer" },
    "weight": { "type": "decimal" }
  },
  "relationships": {
    "calves": { "type": "hasMany", "entity": "Calf" }
  },
  "features": ["timeline", "financials", "search"]
}
```

### 3. Pattern Inheritance

Templates inherit proven patterns from gauge module:
- ✅ Repository pattern with BaseRepository
- ✅ Service layer with dependency injection
- ✅ DTO transformation
- ✅ Route middleware stacking
- ✅ React Query hooks
- ✅ Zustand state management
- ✅ TypeScript strict mode

## Template Variables Reference

### Core Entity Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{MODULE_NAME}}` | Module folder name (lowercase) | `cattle`, `equipment` |
| `{{ENTITY_NAME}}` | Singular entity name (PascalCase) | `Cow`, `Equipment` |
| `{{ENTITY_NAME_PLURAL}}` | Plural entity name (PascalCase) | `Cows`, `Equipment` |
| `{{ENTITY_LOWER}}` | Singular entity (lowercase) | `cow`, `equipment` |
| `{{ENTITY_LOWER_PLURAL}}` | Plural entity (lowercase) | `cows`, `equipment` |
| `{{ENTITY_TABLE}}` | Database table name | `cows`, `equipment` |
| `{{ENTITY_PRIMARY_KEY}}` | Primary key field | `id` |
| `{{ENTITY_BUSINESS_ID}}` | Business identifier | `tag_id`, `equipment_id` |

### Module Configuration Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{API_PREFIX}}` | API route prefix | `/api/cattle` |
| `{{ROUTE_BASE}}` | Frontend route base | `/cattle` |
| `{{DISPLAY_NAME}}` | User-facing name | `Cattle Tracking` |
| `{{ICON}}` | UI icon name | `🐄`, `⚙️` |

### Database Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{TABLE_NAME}}` | Main table name | `cows` |
| `{{FIELDS}}` | Field definitions | Generated from config |
| `{{RELATIONSHIPS}}` | Foreign keys | Generated from config |
| `{{INDEXES}}` | Database indexes | Generated from config |

### Feature Flags

| Variable | Description | Values |
|----------|-------------|--------|
| `{{HAS_TIMELINE}}` | Enable timeline/history | `true`/`false` |
| `{{HAS_FINANCIALS}}` | Enable financial tracking | `true`/`false` |
| `{{HAS_SEARCH}}` | Enable advanced search | `true`/`false` |
| `{{HAS_EXPORT}}` | Enable data export | `true`/`false` |
| `{{HAS_CALENDAR}}` | Enable calendar view | `true`/`false` |

## Usage Workflow

### 1. Create Configuration File

```bash
# Copy example configuration
cp examples/cattle-config.json my-module-config.json

# Edit configuration with your module details
```

### 2. Generate Module (Manual)

```bash
# For each template file:
# 1. Copy template to destination
# 2. Replace all {{VARIABLES}} with values from config
# 3. Adjust business logic as needed
```

### 3. Generate Module (Automated - Future)

```bash
# Using CLI generator (to be built)
npx generate-module --config my-module-config.json

# Or interactive mode
npx generate-module cattle --interactive
```

## Template Categories

### Backend Templates

**Repository.template.js**
- Extends BaseRepository
- CRUD operations
- Complex queries
- Connection management

**Service.template.js**
- Business logic layer
- Transaction management
- Validation
- Audit logging

**Routes.template.js**
- Express routes
- Middleware stacking
- Request validation
- Error handling

**DTOMapper.template.js**
- DB to DTO transformation
- DTO to DB transformation
- Type safety
- Null handling

**Domain.template.js**
- Domain entities
- Value objects
- Business rule validation
- Fail-fast validation

**Migration.template.sql**
- Database schema
- Indexes
- Foreign keys
- Constraints

### Frontend Templates

**Page.template.tsx**
- Main page component
- Layout structure
- Data fetching
- State management

**ModalManager.template.tsx**
- Modal orchestration
- Create/Edit/Delete modals
- Modal state management

**Form.template.tsx**
- Entity form component
- Field rendering
- Validation
- Submit handling

**Hooks.template.ts**
- React Query hooks
- useEntities (list)
- useEntity (single)
- useMutations (create/update/delete)

**Service.template.ts**
- API client methods
- HTTP requests
- Response typing
- Error handling

**Types.template.ts**
- Entity types
- DTO types
- API response types
- Form types

## Best Practices

### 1. Keep Templates Generic

❌ **Bad**: Hard-coded gauge-specific logic
```javascript
// Don't include gauge-specific business rules in templates
if (gauge.equipment_type === 'thread_gauge') {
  // gauge-specific logic
}
```

✅ **Good**: Parameterized, reusable patterns
```javascript
// Keep templates focused on structure
async findAll(filters = {}) {
  return this.executeQuery(/* ... */);
}
```

### 2. Use Configuration for Customization

Move customizable behavior to configuration:

```json
{
  "features": {
    "timeline": true,
    "financials": true,
    "customField": "breed"
  },
  "validationRules": {
    "tag_id": { "pattern": "^[A-Z]-\\d{4}$" }
  }
}
```

### 3. Maintain Architectural Consistency

- ✅ Follow gauge module patterns exactly
- ✅ Use same middleware stack
- ✅ Use same error handling
- ✅ Use same validation approach
- ✅ Use infrastructure components only

### 4. Document Customization Points

Mark areas where module-specific logic goes:

```javascript
// CUSTOMIZATION POINT: Add module-specific validation
async validate{{ENTITY_NAME}}(data) {
  // TODO: Add business-specific validation rules
  return true;
}
```

## Testing Templates

Before using templates in production:

1. **Generate Test Module**: Apply templates to simple entity
2. **Verify File Structure**: Check all files generated correctly
3. **Test Compilation**: Ensure no syntax errors
4. **Run Linters**: ESLint, TypeScript checks
5. **Test Functionality**: CRUD operations work
6. **Check Integration**: Module integrates with existing system

## Migration from Gauge Module

These templates were extracted from the production gauge module:

**Source Analysis**: `/erp-core-docs/GAUGE_MODULE_ARCHITECTURE_ANALYSIS.md`

**Extraction Process**:
1. Identified 7 backend patterns + 5 frontend patterns
2. Extracted reusable code structures
3. Replaced gauge-specific code with placeholders
4. Validated against second module (cattle)
5. Documented configuration schema

## Future Enhancements

### Phase 1: Manual Templates ✓ (Current)
- Template files with placeholders
- Example configurations
- Documentation

### Phase 2: CLI Generator (Next)
- Interactive module creation
- Automated string substitution
- Validation & linting
- File scaffolding

### Phase 3: Advanced Features
- Relationship inference
- Migration generation from config
- Test generation
- Documentation generation
- Visual module builder

## Support

**Documentation**:
- Full analysis: `/erp-core-docs/GAUGE_MODULE_ARCHITECTURE_ANALYSIS.md`
- Variable reference: `/erp-core-docs/TEMPLATE_VARIABLES_REFERENCE.md`
- Quick summary: `/erp-core-docs/GAUGE_MODULE_ANALYSIS_SUMMARY.md`

**Examples**:
- See `examples/` folder for complete module configurations
- Reference gauge module: `backend/src/modules/gauge/`

**Questions**: Refer to architecture documentation or gauge module implementation

---

**Last Updated**: November 2024
**Based On**: Gauge Module Architecture v1.0
**Template Version**: 1.0.0
