# Platform Standards Quick Reference

Quick reference guide for Fire-Proof ERP Platform development standards.

## Database Standards

### Naming Conventions
- **Tables**: `snake_case`, plural (`gauges`, `audit_logs`)
- **Columns**: `snake_case` (`gauge_id`, `created_at`, `is_active`)
- **Indexes**: `idx_{table}_{column}` (`idx_gauges_category_id`)
- **Foreign Keys**: `{referenced_table}_id` (`user_id`, `category_id`)

### Audit Trail (Required on All Tables)
```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
created_by INT NULL,
updated_by INT NULL,
is_deleted BOOLEAN DEFAULT 0,
deleted_at TIMESTAMP NULL,
deleted_by INT NULL
```

### Table Defaults
```sql
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
```

### Connection (Docker Development)
```bash
DB_HOST=host.docker.internal
DB_PORT=3307
DB_USER=root
DB_NAME=fai_db_sandbox
```

---

## API Standards

### URL Pattern
```
/api/{module}/{resource}[/{id}][/{sub-resource}]
```

### Standard Response
```json
{
    "success": true,
    "data": { ... },
    "message": "Optional message"
}
```

### Error Response
```json
{
    "success": false,
    "message": "User-friendly error",
    "error": "Detailed error (dev only)",
    "errors": [ ... ]  // For validation
}
```

### HTTP Status Codes
- `200` - OK (GET, PUT, PATCH, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (business rule violation)
- `401` - Unauthorized (auth required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Validation Errors
- `500` - Server Error
- `503` - Service Unavailable

### Authentication
```javascript
// Cookie (preferred for web)
authToken: "jwt_token_here"

// Header (for API clients)
Authorization: Bearer jwt_token_here
```

### Middleware Stack
```javascript
router.post('/endpoint',
    authenticateToken,           // JWT auth
    requireOperator,              // RBAC
    validateFields,               // Field validation
    handleValidationErrors,       // Error handling
    async (req, res) => { ... }
);
```

---

## Frontend Standards

### Component Imports (MANDATORY)
```typescript
// ✅ ALWAYS use centralized components
import { Button, FormInput, Modal } from '../../infrastructure/components';

// ❌ NEVER use raw HTML
<button>...</button>  // Wrong!
```

### API Calls (MANDATORY)
```typescript
// ✅ ALWAYS use API client
import { apiClient } from '../../infrastructure/api/client';
const response = await apiClient.post('/endpoint', data);

// ❌ NEVER use direct fetch
fetch('/api/endpoint', { ... })  // Wrong!
```

---

## Code Quality

### File Size Limits
- **Target**: 200-300 lines
- **Maximum**: 500 lines (absolute)
- **Action**: Refactor immediately if >300 lines

### Module Structure
```
/backend/src/modules/{module}/
├── routes/          # API endpoints
├── services/        # Business logic
├── repositories/    # Data access
├── models/          # Domain models
└── validators/      # Input validation

/frontend/src/modules/{module}/
├── pages/           # Route components
├── components/      # Module components
├── hooks/           # Custom hooks
├── store/           # State management
└── types/           # TypeScript types
```

---

## Common Patterns

### Service Layer Pattern
```javascript
class GaugeService {
    constructor(repository, auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    async createGauge(data, userId) {
        // Business logic
        const gauge = await this.repository.create(data);

        // Audit logging
        await this.auditService.logAction({
            userId,
            action: 'create',
            tableName: 'gauges',
            recordId: gauge.id
        });

        return gauge;
    }
}
```

### Repository Pattern
```javascript
class GaugeRepository {
    async create(data) {
        const [result] = await pool.execute(
            'INSERT INTO gauges SET ?',
            [data]
        );
        return this.findById(result.insertId);
    }

    async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM gauges WHERE id = ? AND is_deleted = 0',
            [id]
        );
        return rows[0];
    }
}
```

### Error Handling Pattern
```javascript
try {
    const result = await service.performAction(data);
    logger.info('Action successful', { result, userId });
    res.status(200).json({ success: true, data: result });
} catch (error) {
    logger.error('Action failed', { error: error.message, userId });

    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    res.status(500).json({
        success: false,
        message: 'Action failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}
```

---

## Testing

### Test Organization
```
/backend/tests/
├── integration/    # API integration tests
└── modules/        # Module-specific tests

/frontend/tests/
├── e2e/           # Playwright E2E tests
├── integration/   # Integration tests
└── unit/          # Unit tests
```

### Test Commands
```bash
# Frontend
npm run test              # Run Jest tests
npm run test:coverage     # Test with coverage
npm run test:e2e         # Playwright E2E tests

# Backend (from backend/)
npm test                 # Run tests
```

---

## Development Workflow

### Local Development
```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker logs fireproof-erp-modular-backend-dev -f
docker logs fireproof-erp-modular-frontend-dev -f

# Restart after changes
docker-compose restart backend frontend
```

### Code Quality Checks
```bash
# Frontend (from frontend/)
npm run lint              # ESLint check
npm run lint:fix         # Auto-fix issues
npm run validate:all     # Full validation
npm run architecture:validate  # Architecture rules
```

---

## Quick Dos and Don'ts

### DO ✅
- Use centralized infrastructure components
- Validate all inputs
- Log all errors with context
- Use connection pool for database
- Implement audit trail on all tables
- Use environment variables for config
- Follow naming conventions
- Keep files under 300 lines

### DON'T ❌
- Use raw HTML elements
- Use direct fetch calls
- Hardcode credentials
- Skip error handling
- Create duplicate services
- Modify Docker files
- Use `__tests__` folders
- Exceed 500 lines per file

---

## Links to Full Documentation

- [Database Standards](./03-Database-Standards/README.md)
- [API Standards](./04-API-Standards/README.md)
- [Frontend Standards](./01-Frontend-Standards/README.md)
- [Backend Standards](./02-Backend-Standards/README.md)
- [Code Quality Standards](./05-Code-Quality-Standards/README.md)
- [Testing Standards](./06-Testing-Standards/README.md)
- [Architecture Patterns](./07-Architecture-Patterns/README.md)
