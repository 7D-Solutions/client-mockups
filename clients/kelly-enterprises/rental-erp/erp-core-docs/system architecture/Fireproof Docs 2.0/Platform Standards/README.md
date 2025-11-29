# Fire-Proof ERP Platform Standards

**Version**: 1.0.0
**Last Updated**: 2025-11-07
**Status**: Active Standard
**Authority**: Architecture Team

## Purpose

This documentation captures all platform standardizations established during the Fire-Proof ERP development. These standards ensure consistency, maintainability, and quality across all current and future projects.

## Philosophy

> "Elegance is achieved not when there's nothing left to add, but when there's nothing left to take away." - Antoine de Saint-Exupéry

Our standards follow these guiding principles:

1. **Consistency Over Flexibility** - Standardized approaches trump individual preferences
2. **Production Quality Only** - No quick fixes, patches, or temporary solutions
3. **Evidence-Based Decisions** - All patterns validated through real implementation
4. **Simplicity by Default** - Complex solutions only when justified
5. **Security First** - Never compromise security for convenience

## Standards Organization

### 01. Frontend Standards
Centralized UI components, state management, and styling patterns.

**Key Documents**:
- UI Components System (Button, Form, Modal, etc.)
- State Management with Zustand
- CSS Modules and Styling Architecture
- ERP Core Services Integration

[→ View Frontend Standards](./01-Frontend-Standards/README.md)

### 02. Backend Standards
Service architecture, repository patterns, and infrastructure patterns.

**Key Documents**:
- Service Layer Architecture
- Repository Pattern Implementation
- Dependency Injection Pattern
- Infrastructure Services

[→ View Backend Standards](./02-Backend-Standards/README.md)

### 03. Database Standards
Schema design, naming conventions, and data integrity patterns.

**Key Documents**:
- Table Design Patterns
- Naming Conventions
- Audit Trail Implementation
- Migration Management

[→ View Database Standards](./03-Database-Standards/README.md)

### 04. API Standards
RESTful endpoint patterns, authentication, and error handling.

**Key Documents**:
- Endpoint Naming Conventions
- Authentication & Authorization
- Request/Response Patterns
- Error Response Standards

[→ View API Standards](./04-API-Standards/README.md)

### 05. Code Quality Standards
File size limits, naming conventions, and code organization.

**Key Documents**:
- File Size Guidelines (200-300 lines target)
- Naming Conventions
- Import/Module Patterns
- Documentation Requirements

[→ View Code Quality Standards](./05-Code-Quality-Standards/README.md)

### 06. Testing Standards
Test organization, naming, and coverage requirements.

**Key Documents**:
- Test Directory Structure
- Testing Patterns
- Integration vs Unit Tests
- E2E Testing with Playwright

[→ View Testing Standards](./06-Testing-Standards/README.md)

### 07. Architecture Patterns
System-wide architectural decisions and patterns.

**Key Documents**:
- Modular Architecture
- Service Separation (Frontend/Backend)
- ERP Core Design
- Deployment Architecture

[→ View Architecture Patterns](./07-Architecture-Patterns/README.md)

### 08. Implementation Templates
Ready-to-use templates and checklists for common tasks.

**Key Documents**:
- New Module Checklist
- Service Implementation Template
- Component Creation Template
- API Endpoint Template

[→ View Implementation Templates](./08-Implementation-Templates/README.md)

## Critical Constraints

These constraints must **NEVER** be violated:

1. ✅ **No File Deletion** - Move to `/review-for-delete/` instead
2. ✅ **Restart Required** - Docker containers must restart after erp-core changes
3. ✅ **Database is External** - MySQL on port 3307 (not containerized)
4. ✅ **Use Existing Modules** - Never duplicate functionality
5. ✅ **Production Quality Only** - No quick fixes or patches
6. ✅ **Security** - Never commit credentials, use environment variables
7. ✅ **Testing** - Use dedicated test directories, no `__tests__/` folders
8. ✅ **Centralized UI** - ALL UI elements must use infrastructure components
9. ✅ **File Size Limits** - 200-300 lines target, 500 absolute maximum
10. ✅ **Service Separation** - Frontend uses ERP core, Backend uses infrastructure

## How to Use This Documentation

### For New Features
1. Review relevant standard sections
2. Use implementation templates
3. Follow established patterns
4. Validate against checklist

### For Code Reviews
1. Check compliance with standards
2. Verify no critical constraints violated
3. Ensure quality thresholds met
4. Document any deviations

### For Refactoring
1. Identify standards violations
2. Plan migration to standard patterns
3. Update incrementally
4. Test thoroughly

### For New Developers
1. Read this README first
2. Study relevant standard sections
3. Review implementation examples
4. Ask questions before deviating

## Standards Compliance

### Enforcement Levels

**🚨 CRITICAL** - Must never be violated, production blockers
**⚠️ REQUIRED** - Must be followed, can be temporarily waived with approval
**ℹ️ RECOMMENDED** - Best practices, should be followed when possible
**💡 OPTIONAL** - Suggestions for consideration

### Deviation Process

If you need to deviate from a standard:

1. **Document** - Clearly explain why deviation is necessary
2. **Propose** - Suggest alternative approach
3. **Approve** - Get architecture team approval
4. **Track** - Add to technical debt register
5. **Review** - Schedule followup to align with standard

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-11-07 | Initial standardization documentation | Architecture Team |

## Contributing

To propose changes to standards:

1. Create detailed RFC (Request for Comments)
2. Provide evidence and rationale
3. Show impact analysis
4. Get team review and approval
5. Update documentation
6. Communicate changes

## References

- [CLAUDE.md](../../../../CLAUDE.md) - Project-specific implementation guide
- [ERP Core Documentation](../../../) - System architecture details
- [Development Environment Setup](./07-Architecture-Patterns/development-environment.md)

## Questions or Issues?

Contact the Architecture Team for:
- Standards clarification
- Deviation approvals
- Standards updates
- Implementation guidance

---

**Remember**: These standards exist to help us build better software faster. They're based on lessons learned and best practices proven in this codebase. When in doubt, follow the standard.
