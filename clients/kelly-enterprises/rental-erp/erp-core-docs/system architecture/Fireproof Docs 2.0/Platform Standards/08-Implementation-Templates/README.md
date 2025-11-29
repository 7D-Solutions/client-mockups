# Implementation Templates

Ready-to-use templates and checklists for common development tasks in the Fire-Proof ERP Platform.

## Template Index

### Core Templates
1. **[New Module Checklist](01-New-Module-Checklist.md)** - Complete module setup guide
2. **[Service Implementation Template](02-Service-Template.md)** - BaseService patterns
3. **[Repository Implementation Template](03-Repository-Template.md)** - BaseRepository patterns
4. **[API Endpoint Template](04-API-Endpoint-Template.md)** - Express route patterns

### Frontend Templates
5. **[Component Creation Template](05-Component-Template.md)** - React component structure
6. **[Page Creation Template](06-Page-Template.md)** - Complete page patterns
7. **[State Management Template](07-State-Management-Template.md)** - Zustand store patterns

### Testing Templates
8. **[Integration Test Template](08-Integration-Test-Template.md)** - Backend API testing
9. **[E2E Test Template](09-E2E-Test-Template.md)** - Playwright testing

## Quick Reference

### Backend Patterns
- **Service Layer**: Business logic, transactions, audit trails
- **Repository Layer**: Data access, queries, database operations
- **API Layer**: Routes, validation, authentication

### Frontend Patterns
- **Components**: Infrastructure components only
- **Pages**: Layout, data fetching, state management
- **State**: Zustand for local state, context for shared concerns

### Testing Patterns
- **Integration**: Database transactions, real data testing
- **E2E**: User workflows, cross-browser validation

## Usage Guidelines

### Before You Start
1. Review relevant platform standards
2. Check existing modules for patterns
3. Validate against architecture rules
4. Plan your file structure

### While Implementing
1. Use copy-paste templates as starting point
2. Replace TODO markers with actual values
3. Follow existing naming conventions
4. Keep files under 300 lines

### After Implementation
1. Run quality checks (`npm run quality:all`)
2. Write tests (≥80% unit, ≥70% integration)
3. Update documentation
4. Submit for code review

## Common Pitfalls to Avoid

### Backend
- ❌ Don't duplicate auth logic - use infrastructure services
- ❌ Don't hardcode database credentials - use environment variables
- ❌ Don't skip transaction management - use executeInTransaction
- ❌ Don't exceed 300 lines per file - extract specialized classes

### Frontend
- ❌ Don't use raw HTML elements - use infrastructure components
- ❌ Don't use direct fetch - use apiClient
- ❌ Don't create inline styles - use CSS modules
- ❌ Don't duplicate state - use centralized stores

### Testing
- ❌ Don't create `__tests__` folders - use designated test directories
- ❌ Don't skip cleanup - always rollback transactions
- ❌ Don't use hardcoded data - use test fixtures
- ❌ Don't skip error cases - test failure scenarios

## File Size Guidelines

**Target Limits**:
- **Functions**: 10-20 lines (ideal), 200 lines (maximum)
- **Files/Classes**: **200-300 lines (target)**, 500 lines (absolute maximum)

**Refactoring Triggers**:
- **>300 lines**: Refactor immediately
- **>500 lines**: Production blocker

## Template Philosophy

All templates follow these principles:

1. **Production-Ready**: No quick fixes or temporary solutions
2. **Security-First**: Authentication, validation, sanitization
3. **Maintainable**: Clear structure, consistent patterns
4. **Testable**: Easy to test, mock, and verify
5. **Documented**: JSDoc, comments, examples

## Getting Help

- Review existing working examples in codebase
- Check platform standards documentation
- Ask team for code review before merging
- Reference architecture patterns documentation

## Template Maintenance

These templates are living documents:
- Update when patterns change
- Add new examples as they emerge
- Remove deprecated patterns
- Keep aligned with platform evolution
