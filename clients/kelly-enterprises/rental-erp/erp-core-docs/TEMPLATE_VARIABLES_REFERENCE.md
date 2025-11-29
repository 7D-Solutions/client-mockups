# Module Template Variables Reference

This document provides the complete set of template variables needed for module generation.

## Configuration Variables

### Entity Naming
```yaml
ENTITY_NAME:                 "Gauge"              # PascalCase entity name
ENTITY_NAME_LOWER:           "gauge"              # lowercase entity name
ENTITY_NAME_PLURAL:          "Gauges"             # Plural form (PascalCase)
ENTITY_NAME_PLURAL_LOWER:    "gauges"             # Plural form (lowercase)
ENTITY_SLUG:                 "gauge"              # URL-safe slug
```

### Database Configuration
```yaml
ENTITY_TABLE:                "gauges"             # Main table name
ENTITY_PRIMARY_KEY:          "id"                 # Primary key field
ENTITY_BUSINESS_ID:          "gauge_id"           # Business identifier
ENTITY_BUSINESS_ID_LABEL:    "Gauge ID"           # Display label
```

### API Configuration
```yaml
API_PREFIX:                  "/api/gauges"        # API base path
API_VERSION:                 "v1"                 # API version
```

### Enumerations
```yaml
EQUIPMENT_TYPES:
  - thread_gauge
  - hand_tool
  - large_equipment
  - calibration_standard

STATUSES:
  - available
  - checked_out
  - pending_qc
  - pending_transfer
  - out_of_service
  - retired
  - pending_unseal
  - out_for_calibration

# Mapped as:
# STATUSES_ENUM: "'available'|'checked_out'|'pending_qc'|..."
```

### Specification Tables (if multi-type entity)
```yaml
SPEC_TABLES:
  thread_gauge: "gauge_thread_specifications"
  hand_tool: "gauge_hand_tool_specifications"
  large_equipment: "gauge_large_equipment_specifications"
  calibration_standard: "gauge_calibration_standard_specifications"

SPEC_TYPES:
  - thread_gauge
  - hand_tool
  - large_equipment
  - calibration_standard
```

### Core Fields (Standard for all entities)
```yaml
CORE_FIELDS:
  - { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" }
  - { name: "{{ENTITY_BUSINESS_ID}}", type: "VARCHAR(50) UNIQUE NOT NULL" }
  - { name: "name", type: "VARCHAR(255) NOT NULL" }
  - { name: "status", type: "ENUM('{{STATUSES_ENUM}}')" }
  - { name: "is_active", type: "TINYINT(1) DEFAULT 1" }
  - { name: "is_deleted", type: "TINYINT(1) DEFAULT 0" }
  - { name: "created_by", type: "INT" }
  - { name: "created_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" }
  - { name: "updated_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" }
```

### Custom Fields (Entity-specific)
```yaml
CUSTOM_FIELDS:
  # For Gauge module:
  - { name: "set_id", type: "VARCHAR(50)", nullable: true }
  - { name: "equipment_type", type: "ENUM('{{EQUIPMENT_TYPES}}')" }
  - { name: "category_id", type: "INT" }
  - { name: "is_sealed", type: "TINYINT(1)" }
  - { name: "manufacturer", type: "VARCHAR(255)" }
  - { name: "model_number", type: "VARCHAR(255)" }
  # Add more custom fields as needed
```

### Feature Toggles (Implementation control)
```yaml
FEATURES:
  list_view: true
  detail_view: true
  create_modal: true
  edit_modal: true
  delete_action: true
  bulk_operations: false
  export_data: false
  import_data: false
  # Add feature flags per module requirements
```

### Filter Fields (Search/filter capability)
```yaml
FILTER_FIELDS:
  - { name: "status", type: "enum", label: "Status" }
  - { name: "created_at", type: "date", label: "Created Date" }
  - { name: "search", type: "text", label: "Search Term" }
  # Add more filters as needed
```

## Backend File Variables

### Repository Class Variables
```yaml
REPOSITORY_CLASS_NAME:       "{{ENTITY_NAME}}Repository"
REPOSITORY_TABLE:            "{{ENTITY_TABLE}}"
REPOSITORY_PRIMARY_KEY:      "{{ENTITY_PRIMARY_KEY}}"
REPOSITORY_BASE_CLASS:       "BaseRepository"
REPOSITORY_METHODS:
  - "findByPrimaryKey(id)"
  - "findBy{{ENTITY_BUSINESS_ID}}(value)"
  - "create{{ENTITY_NAME}}(data)"
  - "update{{ENTITY_NAME}}(id, data)"
  - "delete{{ENTITY_NAME}}(id)"
```

### Service Class Variables
```yaml
SERVICE_CLASSES:
  - { name: "{{ENTITY_NAME}}Service", responsibility: "CRUD coordinator" }
  - { name: "{{ENTITY_NAME}}CreationService", responsibility: "Creation workflows" }
  - { name: "{{ENTITY_NAME}}SearchService", responsibility: "Search/filter logic" }
  - { name: "{{ENTITY_NAME}}ValidationService", responsibility: "Validation rules" }
  # Add more services per module needs
```

### Route Variables
```yaml
ROUTE_PATH:                  "/{{entity}}"
ROUTE_FILES:
  - { name: "{{entities}}.js", features: ["list", "create", "read", "update", "delete"] }
  - { name: "{{entity}}-{{feature}}.js", features: ["feature-specific"] }
  # One file per logical feature group
```

### Domain Entity Variables
```yaml
ENTITY_CLASS_NAME:           "{{ENTITY_NAME}}Entity"
ENTITY_PROPERTIES:
  # Standard:
  - { name: "id", type: "number" }
  - { name: "{{ENTITY_BUSINESS_ID}}", type: "string" }
  - { name: "name", type: "string" }
  - { name: "status", type: "string" }
  # Custom properties per module
```

### DTO Mapper Variables
```yaml
MAPPER_CLASS_NAME:           "{{ENTITY_NAME}}DTOMapper"
MAPPER_METHODS:
  - { name: "transformToDTO(dbEntity)", returns: "DTO" }
  - { name: "transformFromDTO(apiEntity)", returns: "DatabaseEntity" }
```

### Presenter Variables
```yaml
PRESENTER_CLASS_NAME:        "{{ENTITY_NAME}}Presenter"
PRESENTER_METHODS:
  - { name: "toDTO(entity)", adds_fields: ["displayName"] }
  - { name: "formatDisplayName(entity)", returns: "string" }
```

## Frontend File Variables

### Component Variables
```yaml
LIST_COMPONENT:              "{{ENTITY_NAME}}List.tsx"
MODAL_COMPONENT:             "{{ENTITY_NAME}}ModalManager.tsx"
CREATE_MODAL:                "Create{{ENTITY_NAME}}Modal.tsx"
EDIT_MODAL:                  "Edit{{ENTITY_NAME}}Modal.tsx"
FILTER_COMPONENT:            "{{ENTITY_NAME}}Filters.tsx"
ROW_COMPONENT:               "{{ENTITY_NAME}}Row.tsx"
SEARCH_COMPONENT:            "SearchInput.tsx"
SUMMARY_CARDS:               "SummaryCards.tsx"
```

### Hook Variables
```yaml
QUERY_HOOK:                  "use{{ENTITY_NAME_PLURAL}}"
SINGLE_HOOK:                 "use{{ENTITY_NAME}}"
MUTATIONS_HOOK:              "use{{ENTITY_NAME}}Mutations"
OPERATIONS_HOOK:             "use{{ENTITY_NAME}}Operations"
FILTERS_HOOK:                "use{{ENTITY_NAME}}Filters"
```

### Service Variables
```yaml
SERVICE_CLASS_NAME:          "{{ENTITY_NAME}}Service"
SERVICE_CLASS_PATH:          "services/{{entity}}Service.ts"
SERVICE_METHODS:
  - "getAll(filters)"
  - "getById(id)"
  - "create(data)"
  - "update(id, data)"
  - "delete(id)"
```

### Type Variables
```yaml
MAIN_TYPE:                   "{{ENTITY_NAME}}"
CREATION_DATA_TYPE:          "{{ENTITY_NAME}}CreationData"
FILTERS_TYPE:                "{{ENTITY_NAME}}Filters"
STATUS_TYPE:                 "{{ENTITY_NAME}}Status"
LIST_RESPONSE_TYPE:          "{{ENTITY_NAME}}ListResponse"
```

### Provider Variables
```yaml
PROVIDER_NAME:               "{{ENTITY_NAME}}Provider"
CONTEXT_HOOK:                "use{{ENTITY_NAME}}Context"
ZUSTAND_STORE:               "use{{ENTITY_NAME}}State"
EVENT_PREFIX:                "{{entity}}:"  # e.g., "gauge:checked_out"
```

## File Path Templates

### Backend File Paths
```
Domain:
  /backend/src/modules/{{entity}}/domain/{{ENTITY_NAME}}Entity.js
  /backend/src/modules/{{entity}}/domain/DomainValidationError.js

Repositories:
  /backend/src/modules/{{entity}}/repositories/{{ENTITY_NAME}}Repository.js
  /backend/src/modules/{{entity}}/repositories/{{ENTITY_NAME}}QueryRepository.js

Services:
  /backend/src/modules/{{entity}}/services/{{ENTITY_NAME}}Service.js
  /backend/src/modules/{{entity}}/services/{{ENTITY_NAME}}CreationService.js
  /backend/src/modules/{{entity}}/services/{{ENTITY_NAME}}SearchService.js

Routes:
  /backend/src/modules/{{entity}}/routes/index.js
  /backend/src/modules/{{entity}}/routes/{{entities}}.js
  /backend/src/modules/{{entity}}/routes/{{entity}}-{{feature}}.js

Mappers/Presenters:
  /backend/src/modules/{{entity}}/mappers/{{ENTITY_NAME}}DTOMapper.js
  /backend/src/modules/{{entity}}/presenters/{{ENTITY_NAME}}Presenter.js

Queries:
  /backend/src/modules/{{entity}}/queries/{{entity}}Queries.js

Middleware:
  /backend/src/modules/{{entity}}/middleware/validation.js

Database:
  /backend/src/modules/{{entity}}/migrations/001_create_{{entity}}.sql
  /backend/src/modules/{{entity}}/migrations/002_create_{{entity}}_specifications.sql
```

### Frontend File Paths
```
Components:
  /frontend/src/modules/{{entity}}/components/{{ENTITY_NAME}}List.tsx
  /frontend/src/modules/{{entity}}/components/{{ENTITY_NAME}}ModalManager.tsx
  /frontend/src/modules/{{entity}}/components/{{ENTITY_NAME}}Filters.tsx
  /frontend/src/modules/{{entity}}/components/Create{{ENTITY_NAME}}Modal.tsx
  /frontend/src/modules/{{entity}}/components/Edit{{ENTITY_NAME}}Modal.tsx

Pages:
  /frontend/src/modules/{{entity}}/pages/{{ENTITY_NAME}}List.tsx

Hooks:
  /frontend/src/modules/{{entity}}/hooks/use{{ENTITY_NAME_PLURAL}}.ts
  /frontend/src/modules/{{entity}}/hooks/use{{ENTITY_NAME}}Filters.ts
  /frontend/src/modules/{{entity}}/hooks/use{{ENTITY_NAME}}Operations.ts

Services:
  /frontend/src/modules/{{entity}}/services/{{entity}}Service.ts

Types:
  /frontend/src/modules/{{entity}}/types/index.ts

Context:
  /frontend/src/modules/{{entity}}/context/index.tsx

Configuration:
  /frontend/src/modules/{{entity}}/permissions.ts
  /frontend/src/modules/{{entity}}/navigation.ts
  /frontend/src/modules/{{entity}}/constants/formConstants.ts
```

## Derived Variables (Auto-generated)

These are computed from primary variables:

```yaml
# Case transformations
ENTITY_NAME_UPPER_SNAKE:     "GAUGE"  # From ENTITY_NAME
ENTITY_NAME_LOWER_SNAKE:     "gauge"  # From ENTITY_NAME
ENTITY_NAME_KEBAB:           "gauge"  # For URLs

# Query key names
QUERY_KEY_SINGULAR:          "{{entity}}"      # React Query key
QUERY_KEY_PLURAL:            "{{entities}}"    # React Query key

# Event names
EVENT_CREATED:               "{{entity}}:created"
EVENT_UPDATED:               "{{entity}}:updated"
EVENT_DELETED:               "{{entity}}:deleted"
EVENT_SELECTED:              "{{entity}}:selected"

# Zust and store names
STORE_HOOK:                  "use{{ENTITY_NAME_UPPER}}Store"

# Service names for dependency injection
SERVICE_REGISTRY_KEY:        "{{ENTITY_NAME}}Service"

# API endpoints
ENDPOINT_LIST:               "GET /{{api_prefix}}"
ENDPOINT_CREATE:             "POST /{{api_prefix}}"
ENDPOINT_READ:               "GET /{{api_prefix}}/:id"
ENDPOINT_UPDATE:             "PUT /{{api_prefix}}/:id"
ENDPOINT_DELETE:             "DELETE /{{api_prefix}}/:id"
```

## Validation Rules

### Database
- Table name must be lowercase plural
- Primary key must be integer
- Business ID should be VARCHAR(50) UNIQUE
- All tables need: is_deleted, created_at, updated_at, created_by

### Backend
- Repository must extend BaseRepository
- Service must extend BaseService
- All public methods must have JSDoc comments
- All mutations must be transaction-wrapped
- All errors must inherit from DomainValidationError

### Frontend
- All components must use infrastructure components
- All API calls must use apiClient
- All components must be TypeScript
- All state must use Zustand hooks
- No raw HTML elements (button, input, etc.)

## Usage Example

For a new module called "Equipment":

```yaml
# Primary variables
ENTITY_NAME:                 "Equipment"
ENTITY_TABLE:                "equipment"
ENTITY_BUSINESS_ID:          "equipment_id"
ENTITY_PLURAL:               "Equipment"
ENTITY_PLURAL_LOWER:         "equipment"

# Enumerations
STATUSES:
  - active
  - inactive
  - maintenance

# Custom fields
CUSTOM_FIELDS:
  - { name: "category", type: "VARCHAR(100)" }
  - { name: "location", type: "VARCHAR(255)" }
  - { name: "cost", type: "DECIMAL(10, 2)" }

# Results in:
REPOSITORY_CLASS_NAME:       "EquipmentRepository"
SERVICE_CLASS_NAME:          "EquipmentService"
COMPONENT_LIST:              "EquipmentList.tsx"
HOOK_QUERY:                  "useEquipment"
SERVICE_CLASS_PATH:          "services/equipmentService.ts"
API_ENDPOINT:                "GET /api/equipment"
```

---

## Notes

1. **Mustache Templates**: Variables use `{{VARIABLE_NAME}}` syntax
2. **Case Conventions**: Use provided case transformations consistently
3. **Enumeration Arrays**: Join with pipe (`|`) for type unions
4. **Field Lists**: Map to create SQL columns and TypeScript properties
5. **Method Names**: Use PascalCase for classes, camelCase for methods
6. **File Names**: Follow conventions exactly (affects imports and routing)

