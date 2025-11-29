# Backend Standards

**Fire-Proof ERP Platform - Backend Architecture Documentation**

This directory documents the backend architecture patterns, standards, and best practices for the Fire-Proof ERP platform.

## Overview

The Fire-Proof ERP backend follows a layered architecture with strict separation of concerns:

- **Infrastructure Layer**: Cross-cutting concerns (auth, database, audit, logging)
- **Module Layer**: Business logic organized by domain (gauge, admin, inventory, user)
- **Repository Pattern**: Data access abstraction with transaction support
- **Service Pattern**: Business logic orchestration with dependency injection
- **Domain Layer**: Business rules and validation (domain entities)

## Architecture Principles

### 1. Modular Architecture
Each module is self-contained with clear boundaries:
```
modules/
  gauge/
    ├── domain/           # Business entities and rules
    ├── repositories/     # Data access layer
    ├── services/         # Business logic orchestration
    ├── routes/           # HTTP endpoints
    ├── middleware/       # Module-specific middleware
    ├── mappers/          # DTO transformations
    └── presenters/       # Response formatting
```

### 2. Dependency Injection
Services receive dependencies through constructors:
```javascript
class GaugeCreationService extends BaseService {
  constructor(gaugeRepository, gaugeSetRepository, gaugeReferenceRepository, options = {}) {
    super(gaugeRepository, options);
    this.gaugeSetRepository = gaugeSetRepository;
    this.gaugeReferenceRepository = gaugeReferenceRepository;
  }
}
```

### 3. Transaction Management
All multi-step operations use explicit transactions:
```javascript
return this.executeInTransaction(async (connection) => {
  const goGauge = await this.repository.createGauge(goGaugeWithId, connection);
  const noGoGauge = await this.repository.createGauge(noGoGaugeWithId, connection);
  await this.auditService.logAction({ ... });
  return { go: goGauge, noGo: noGoGauge };
});
```

### 4. File Size Constraints
**CRITICAL REQUIREMENT**: Maintain file size discipline:
- **Target**: 200-300 lines per file
- **Maximum**: 500 lines (absolute limit)
- **Refactoring Trigger**: >300 lines → immediate refactoring required
- **Production Blocker**: >500 lines → must refactor before merge

**Refactoring Patterns**:
- Extract specialized services (GaugeCreationService → GaugeSetService)
- Create helper classes (GaugeSetTransactionHelper, GaugeSetValidationHelper)
- Move domain logic to entities (GaugeEntity, GaugeSet)
- Extract repository methods to focused repositories

## Documentation Structure

### [01-Architecture-Patterns.md](./01-Architecture-Patterns.md)
Architectural patterns and design decisions:
- Layered architecture
- Repository pattern implementation
- Service pattern with dependency injection
- Transaction management patterns
- Domain-driven design elements

### [02-Service-Layer.md](./02-Service-Layer.md)
Service layer patterns and standards:
- BaseService pattern
- Service responsibilities
- Dependency injection
- Transaction handling
- Audit trail integration
- Real examples from gauge module

### [03-Repository-Layer.md](./03-Repository-Layer.md)
Repository pattern implementation:
- BaseRepository pattern
- CRUD operations
- Query patterns
- Transaction support
- Soft delete handling
- Real examples from GaugeRepository

### [04-Infrastructure-Services.md](./04-Infrastructure-Services.md)
Infrastructure services documentation:
- Authentication middleware
- Database connection pooling
- Audit logging service
- Error handling
- Notification service
- Event bus

### [05-Error-Handling.md](./05-Error-Handling.md)
Error handling standards:
- Standard error response format
- HTTP status code usage
- Error logging patterns
- Database error classification
- Validation error handling

## Key Standards

### 1. Database Connection Pattern
```javascript
// Use BaseRepository for automatic connection management
async findById(id, conn) {
  return this.withConnection(async (connection) => {
    const [rows] = await connection.execute(query, params);
    return rows[0] || null;
  }, conn);
}
```

### 2. Service Layer Pattern
```javascript
// Services orchestrate business logic and repository calls
class GaugeCreationService extends BaseService {
  async createGauge(gaugeData, userId) {
    // Validation
    const validationService = serviceRegistry.get('GaugeValidationService');
    gaugeData = validationService.normalizeThreadData(gaugeData);

    // Business logic
    const gauge = await this.repository.createGauge(gaugeData);

    // Audit trail
    await this.auditService.logAction({ ... });

    return gauge;
  }
}
```

### 3. Error Response Format
```javascript
{
  success: false,
  message: 'User-friendly message',
  error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  requestId: 'uuid',
  timestamp: '2025-01-07T10:30:00Z'
}
```

### 4. Audit Logging Pattern
```javascript
await this.auditService.logAction({
  module: 'gauge',
  action: 'gauge_created',
  tableName: 'gauges',
  recordId: gauge.id,
  userId: userId,
  ipAddress: '127.0.0.1',
  oldValues: null,
  newValues: { gauge_id: gauge.gauge_id, name: gauge.name }
});
```

## Infrastructure Services

### Authentication
- JWT token validation
- Permission-based access control (RBAC)
- Session management
- User context extraction

### Database
- Connection pooling (MySQL2)
- IPv4/IPv6 support (Railway compatible)
- Transaction management
- Query timeout protection

### Audit Trail
- AS9102 compliant logging
- Tamper-proof hash chain
- Digital signatures for critical operations
- Full change history

### Error Handling
- Database error classification
- Standard error responses
- Request ID tracking
- Error metrics and monitoring

## Best Practices

### 1. Security
- Never commit credentials
- Always use environment variables
- Validate all user inputs
- Use parameterized queries
- Implement SQL injection protection

### 2. Performance
- Use connection pooling
- Implement query timeouts
- Cache schema information
- Batch operations when possible
- Monitor connection pool health

### 3. Maintainability
- Follow file size limits (200-300 lines)
- Use consistent naming conventions
- Document complex business logic
- Extract reusable helpers
- Keep services focused and single-purpose

### 4. Testing
- Use dedicated test directories
- Mock external dependencies
- Test transaction rollback
- Validate error handling
- Test audit trail integrity

## Related Documentation

- [Frontend Standards](../01-Frontend-Standards/)
- [API Standards](../03-API-Standards/)
- [Database Standards](../04-Database-Standards/)
- [Security Standards](../05-Security-Standards/)

## Contributing

When adding new backend features:
1. Follow the modular architecture pattern
2. Extend BaseService and BaseRepository
3. Implement proper transaction management
4. Add audit trail for data modifications
5. Keep files under 300 lines
6. Document complex business logic
7. Test error handling and edge cases
