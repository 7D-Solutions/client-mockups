# Document Reference Guide for Claude Instances

**Purpose**: This guide tells Claude instances which documents to read for different phases and tasks in the Fireproof Gauge System development.

## 📚 Document Structure Overview

### Core Documentation Hierarchy:
```
Vision → Plan → Rationale → System Specifications → Implementation Guide → Permissions Matrix
  ↓        ↓         ↓              ↓                       ↓                    ↓
 WHY    HOW/WHEN  WHY THIS WAY   WHAT EXACTLY           HOW TO BUILD      WHO CAN DO WHAT
```

## 📁 Essential Documents Location

All documents are in: `Fireproof Gauge System/docs/`

1. **GAUGE_TRACKING_SYSTEM_VISION.md** - Strategic vision and business value
2. **Proposed Gameplan/The Plan.md** - 3-phase development approach (current operational gameplan)
3. **Proposed Gameplan/The Rationale.md** - Architectural reasoning and dependencies
4. **SYSTEM_SPECIFICATIONS.md** - Complete functional requirements from design sessions
5. **IMPLEMENTATION_GUIDE.md** - Technical implementation roadmap with code examples
6. **PERMISSIONS_MATRIX.md** - 74 permissions across 14 categories with 5-tier roles

## 🎯 Phase-Specific Document Requirements

### **Phase 1: Foundation & Security** (Phase 1A & 1B)
**When working on security, user management, testing framework, or development environment:**
```
Read these documents:
1. The Plan.md - Phase 1A & 1B sections for security and infrastructure details
2. The Rationale.md - "Foundation Before Features" principle
3. PERMISSIONS_MATRIX.md - Complete permission system (CRITICAL for Phase 1A)
4. IMPLEMENTATION_GUIDE.md - Phase 0 (Permission System Foundation)
```

**Why these documents:**
- Phase 1 establishes the security foundation
- Permission system is the core of security implementation
- Must understand 5-tier role hierarchy before building user management

### **Phase 2: Backend Excellence** (Phase 2A & 2B)
**When working on database schema, service layer, or API architecture:**
```
Read these documents:
1. The Plan.md - Phase 2A & 2B sections
2. IMPLEMENTATION_GUIDE.md - Phases 1-3 (Equipment Types, Return Workflow, Status Management)
3. SYSTEM_SPECIFICATIONS.md - Sections 3, 5, 6 (Return workflow, Equipment types, Status management)
```

**Why these documents:**
- Backend must implement the exact specifications
- Implementation Guide provides database schemas and API endpoints
- System Specifications define business rules and workflows

### **Phase 3: Frontend Revolution** (Phase 3A & 3B)
**When working on component architecture, UI implementation, or My Tools feature:**
```
Read these documents:
1. The Plan.md - Phase 3A & 3B sections
2. SYSTEM_SPECIFICATIONS.md - Sections 1, 2, 4, 7 (Edit interface, Status management, UI flows, My Tools)
3. IMPLEMENTATION_GUIDE.md - Frontend architecture, component structure, CSS design system
```

**Why these documents:**
- Frontend must match exact UI specifications
- Component architecture defined in Implementation Guide
- User workflows specified in System Specifications

## 🔧 Task-Specific Document Requirements

### **Working on Permissions/Authorization:**
- Primary: PERMISSIONS_MATRIX.md
- Secondary: IMPLEMENTATION_GUIDE.md (Phase 0)
- Context: The Rationale.md (Security principles)

### **Working on Equipment Types/Categories:**
- Primary: SYSTEM_SPECIFICATIONS.md (Section 5)
- Secondary: IMPLEMENTATION_GUIDE.md (Phase 1)
- Context: GAUGE_TRACKING_SYSTEM_VISION.md (Equipment management goals)

### **Working on Calibration Features:**
- Primary: SYSTEM_SPECIFICATIONS.md (Sections 3, 6)
- Secondary: IMPLEMENTATION_GUIDE.md (Phases 2, 6)
- Context: GAUGE_TRACKING_SYSTEM_VISION.md (Compliance requirements)

### **Working on Notifications:**
- Primary: SYSTEM_SPECIFICATIONS.md (Section 7)
- Secondary: IMPLEMENTATION_GUIDE.md (Phase 7)
- Context: The Plan.md (User communication strategy)

## 📋 Quick Reference Rules

1. **Always start with relevant phase section in The Plan.md**
2. **Check The Rationale.md for architectural reasoning**
3. **Use SYSTEM_SPECIFICATIONS.md for exact functional requirements**
4. **Use IMPLEMENTATION_GUIDE.md for technical how-to**
5. **Reference PERMISSIONS_MATRIX.md for any authorization questions**

## ⚠️ Important Notes

- **Current Date Context**: As of July 31, 2025, we are in Phase 1 implementation
- **The Plan.md and The Rationale.md**: Created July 31, 2025 - these are the CURRENT operational documents
- **Don't skip documents**: Each phase builds on previous phases
- **When in doubt**: Read The Plan.md first to understand current phase objectives

## 🚨 Common Mistakes to Avoid

1. **Don't read all documents for every task** - Use phase-specific guidance above
2. **Don't skip The Rationale** - Understanding "why" prevents implementation mistakes
3. **Don't implement without reading specifications** - System Specifications are the source of truth
4. **Don't guess about permissions** - Always check PERMISSIONS_MATRIX.md

## 📝 For Prompt Writers

When creating prompts, include instructions like:
```
"For this Phase 1 security task, read:
- The Plan.md (Phase 1A section)
- PERMISSIONS_MATRIX.md (complete document)
- IMPLEMENTATION_GUIDE.md (Phase 0 only)"
```

This ensures Claude focuses on relevant documentation without information overload.