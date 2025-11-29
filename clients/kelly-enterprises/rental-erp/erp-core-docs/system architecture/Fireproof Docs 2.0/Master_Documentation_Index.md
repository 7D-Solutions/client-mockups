# Master Documentation Index

**Version:** 1.1  
**Date:** 2025-09-15  
**Purpose:** Master navigation hub for all Fire-Proof ERP documentation domains

> **🚨 CRITICAL FOR DEVELOPMENT:**
> **Frontend Implementation**: Use infrastructure components only.
> CSS modules are being eliminated in favor of infrastructure-based styling.

## Documentation Domains

### 📋 [Business Documentation](./business/Business_Docs_Index.md)
**Focus**: Business requirements, workflows, and specifications  
**Key Documents**:
- Gauge_Standardization_v2.0.md (unified specifications)
- UI_Workflows_Guide_v1.0.md (user interface patterns)

**Use When**: Defining business requirements, implementing workflows, understanding gauge standardization

### 🎨 [Design Documentation](./design/Design_Docs_Index.md)
**Focus**: Visual design system specifications (reference only - implemented in infrastructure components)  
**Key Documents**:
- Design_System_v2.0.md (infrastructure component reference - DO NOT implement CSS directly)
- Visual_Style_Guide_v1.0.md (infrastructure component usage patterns)

**Use When**: Understanding design principles (implementation via infrastructure components only)

### 📈 [Project Documentation](./project/Project_Docs_Index.md)
**Focus**: Strategic planning, migration strategy, and implementation roadmap  
**Key Documents**:
- Modular_Vision_v1.0.md (system architecture vision)
- Legacy_To_Modern_Migration_Strategy_v1.0.md (transition planning)
- Business_Module_Roadmap_v1.0.md (development timeline)

**Use When**: Strategic planning, system migration, module development coordination

### 🔐 [Security Documentation](./security/Security_Docs_Index.md)
**Focus**: Access control, permissions, and system security  
**Key Documents**:
- Permissions_Complete_v2.0.md (comprehensive security reference)

**Use When**: Implementing access control, managing user permissions, ensuring security compliance

### 🔧 [Technical Documentation](./technical/Technical_Docs_Index.md)
**Focus**: Technical implementation, database schema, and system architecture  
**Key Documents**:
- Backend_Module_Development_Guide_v1.2.md (secure backend module creation)
- Database_Complete_Reference_v2.0.md (database schema and design)
- System_Specs_Implementation_Guide_v3.2.md (implementation guide)
- Technical_Architecture_Playbook_v1.0.md (architecture standards - updated for infrastructure styling)

**Use When**: Technical implementation, backend module creation, database operations, following architectural patterns

## Quick Navigation

### 🚀 Getting Started
1. **System Architecture**: [Technical_Architecture_Playbook_v1.0.md](./technical/Technical_Architecture_Playbook_v1.0.md)
2. **Security Model**: [Permissions_Complete_v2.0.md](./security/Permissions_Complete_v2.0.md)
3. **Frontend Components**: [design/Visual_Style_Guide_v1.0.md](./design/Visual_Style_Guide_v1.0.md)

### 🔍 Common Tasks
- **Implementing gauge features** → [business/](./business/Business_Docs_Index.md)
- **Building UI components** → [design/](./design/Design_Docs_Index.md)
- **Database operations** → [technical/](./technical/Technical_Docs_Index.md)
- **Planning development** → [project/](./project/Project_Docs_Index.md)
- **Managing permissions** → [security/](./security/Security_Docs_Index.md)

## Documentation Standards

All documentation follows the [Documentation Standardization Guide](./Documentation_Standardization_Guide.md):
- Consistent file naming: `Title_Case_With_Underscores_vX.Y.md`
- Standard headers with version, date, and purpose
- Table of contents for navigation
- Domain-specific folder organization

## System Overview

```
Fire-Proof ERP System Documentation
│
├── business/           # What the system should do
├── design/            # How it should look and feel  
├── project/           # When and how to build it
├── security/          # Who can do what
└── technical/         # How to implement it
```

## Document Lifecycle

- **Active Documents**: Production-ready specifications and guides
- **Archive Folders**: Superseded documents with full preservation trail
- **Version Control**: All changes tracked with clear versioning
- **Cross-References**: Maintained links between related documents

## Maintenance

- **Document Updates**: Follow standardization guide for all changes
- **Index Updates**: Update relevant folder indexes when documents change
- **Cross-References**: Verify links remain valid after document moves
- **Archive Management**: Properly document reasons for archiving

## Related Documents

- [Documentation_Reorganization_Log_v1.0.md](./Documentation_Reorganization_Log_v1.0.md) - Complete reorganization history
- [Documentation_Standardization_Guide.md](./Documentation_Standardization_Guide.md) - Standards and formatting guidelines

---

*This master index provides the entry point to all Fire-Proof ERP documentation. Start here for navigation and use domain-specific indexes for detailed exploration.*