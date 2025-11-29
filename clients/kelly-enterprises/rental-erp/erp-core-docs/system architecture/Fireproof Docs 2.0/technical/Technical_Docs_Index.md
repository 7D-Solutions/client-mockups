# Technical Documentation Index

**Version:** 1.1  
**Date:** 2025-01-15  
**Purpose:** Master index of all technical documentation for quick reference and navigation

## Document Directory

### 1. Database_Complete_Reference_v2.0.md
**Current Version:** 2.0  
**Status:** Production Ready  
**Purpose:** Complete database reference including schema, design decisions, and migration procedures

**Contains:**
- Complete normalized database schema (multi-table design)
- Equipment-specific specification tables (thread gauges, hand tools, etc.)
- Design rationale and NULL optimization decisions
- Migration guide from wide-table to normalized structure
- Performance optimizations and indexing strategy
- Common queries and usage examples

**Key Sections:**
- Database Schema (Section 3)
- Design Decisions (Section 4)
- Migration Guide (Section 5)

**When to Use:**
- Implementing database changes
- Understanding table relationships
- Planning data migrations
- Reviewing design decisions

---

### 2. System_Specs_Implementation_Guide_v3.2.md
**Current Version:** 3.2  
**Status:** Production Ready  
**Purpose:** AI coding assistant implementation guide for business and UX behaviors

**Contains:**
- 4-role / 8-permission model specifications
- Canonical entity states and workflows
- API implementation guidelines
- Business rule implementations
- Accessibility requirements
- Error handling patterns

**Key Sections:**
- Prime Directives (Section 0)
- Roles & Permissions (Section 1)
- Entities & States (Section 2)

**When to Use:**
- Implementing business logic
- Understanding workflow states
- Building API endpoints
- Following UI/UX specifications

---

### 3. Technical_Architecture_Playbook_v1.0.md
**Current Version:** 1.0  
**Status:** Production Ready  
**Purpose:** Defines system architecture, module boundaries, and coding standards (updated for infrastructure-based frontend styling)

**Contains:**
- Module independence principles
- Core module descriptions (auth, navigation, data, notifications)
- Business module template
- Event system (7 canonical events)
- Folder structure standards (includes infrastructure folder)
- File size guidelines (30-200 lines)
- Testing strategies
- Frontend styling architecture (infrastructure-based approach)

**Key Sections:**
- Architecture Overview (Section 2)
- Core Modules (Section 3)
- Event System (Section 5)
- Folder Structure (Section 6)
- Frontend Styling Architecture (Section 11)

**When to Use:**
- Creating new modules
- Understanding system boundaries
- Implementing cross-module communication
- Following coding standards

---

### 4. Backend_Module_Development_Guide_v1.2.md
**Current Version:** 1.2  
**Status:** Production Ready  
**Purpose:** Comprehensive guide for creating secure backend modules following gold standard patterns

**Contains:**
- 🚨 Critical LIMIT/OFFSET SQL injection prevention
- Repository and Service layer patterns
- Secure pagination implementation
- Test coverage requirements (≥80%)
- Complete module creation checklist
- Full inventory module example
- Security testing templates

**Key Sections:**
- Step-by-Step Guide (Section 3)
- Critical Security Requirements (Section 4)
- Testing Requirements (Section 5)
- Complete Example (Section 7)

**When to Use:**
- Creating new backend modules
- Implementing repository pattern
- Ensuring SQL injection prevention
- Writing security tests
- Following backend gold standards

**Supersedes:**
- Backend_Module_Development_Guide_v1.1.md
- CRITICAL-SECURITY-ADDENDUM-LIMIT-OFFSET.md

---

## Quick Reference Guide

### Need to understand the database?
→ **Database_Complete_Reference_v2.0.md**

### Need to implement business logic or API endpoints?
→ **System_Specs_Implementation_Guide_v3.2.md**

### Need to build a new module or understand architecture?
→ **Technical_Architecture_Playbook_v1.0.md**

### Need to create a secure backend module?
→ **Backend_Module_Development_Guide_v1.2.md**

### Need to find archived documents?
→ Check the `archive/` subdirectory

---

## Version Control Policy

All technical documents follow semantic versioning:
- **Major version (X.0)**: Breaking changes or major restructuring
- **Minor version (x.X)**: New sections or significant updates
- **Patch version (x.x.X)**: Minor corrections or clarifications

Version numbers are included in filenames for clarity.

---

## Document Relationships

```
Technical_Architecture_Playbook_v1.0.md
    ↓ (defines structure)
Database_Complete_Reference_v2.0.md
    ↓ (implements schema)
System_Specs_Implementation_Guide_v3.2.md
    ↓ (defines business logic)
Application Code
```

---

## Maintenance Notes

- All documents should maintain their Table of Contents
- Version history should be updated with each change
- This index should be updated when documents are added/removed
- Archive old versions rather than deleting them

---

*This index serves as the entry point for all technical documentation. Keep it updated as the documentation evolves.*