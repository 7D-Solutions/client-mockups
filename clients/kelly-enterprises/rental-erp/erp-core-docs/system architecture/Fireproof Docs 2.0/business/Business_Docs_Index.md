# Business Documentation Index

**Version:** 1.0  
**Date:** 2025-09-05  
**Purpose:** Master index of all business documentation for requirements, workflows, and specifications

## Documents

### 1. Gauge_Standardization_v2.0.md
**Purpose:** Unified gauge standardization specification and workflows  
**Contains:**
- Complete gauge ID structure and naming conventions
- Category-driven workflow for all equipment types
- Thread gauge specifications (decimal format authoritative)
- Companion system for GO/NO GO pairs
- Traceability and serial number management
- Form entry rules and validation requirements

**Use When:**
- Implementing gauge entry workflows
- Understanding gauge ID formats and naming
- Setting up category-driven equipment entry
- Designing gauge management features

### 2. UI_Workflows_Guide_v1.0.md
**Purpose:** User interface workflows and interaction patterns  
**Contains:**
- Edit interface structure and permission models
- Status management UI workflows
- User experience flows for all operations
- Error handling and validation patterns
- Return process and condition selection
- Calibration workflow UI specifications

**Use When:**
- Designing user interfaces
- Implementing user interaction patterns
- Understanding permission-based UI behavior
- Building error handling and validation

## Quick Reference Guide

### Need to understand gauge specifications and standardization?
→ **Gauge_Standardization_v2.0.md**

### Need to implement user interface workflows?
→ **UI_Workflows_Guide_v1.0.md**

### Need to see archived business documents?
→ Check the `archive/` subdirectory

## Document Relationships

```
Gauge_Standardization_v2.0.md
    ↓ (defines business rules)
UI_Workflows_Guide_v1.0.md
    ↓ (defines user interactions)
Implementation Code
```

## Content Focus

**Business Requirements**: This folder contains business rules, workflows, and user experience specifications. These documents define "what" the system should do from a business perspective.

**Related Folders**:
- `/technical/` - Technical implementation details
- `/security/` - Permission and access control
- `/design/` - Visual and interaction design

## Maintenance Notes

- All business documents should focus on requirements and workflows
- Technical implementation details belong in `/technical/`
- UI/UX visual specifications belong in `/design/`
- Keep business logic separate from technical architecture

---

*This index serves as the entry point for all business documentation. Update when documents are added, removed, or significantly changed.*