# Research: Best Practices for Hierarchical Organization UI

**Date**: 2025-01-11
**Context**: Facility → Building → Zone → Storage Location management interface

---

## Executive Summary

Based on research of enterprise design systems (SAP Fiori, IBM Carbon, Salesforce Lightning, AWS Cloudscape) and UX best practices, **tree tables (expandable row tables)** are the industry-standard pattern for managing hierarchical organizational data in enterprise applications.

**Recommendation**: **Option 5 (Expandable Table)** or **Option 2 (Hierarchical Tree)** are both enterprise-proven patterns, with Option 5 being superior for data-heavy operations.

---

## Key Findings

### 1. Industry Standard: Tree Tables (Option 5)

**What They Are:**
- Combines expand/collapse controls with columns of tabular data
- First column shows hierarchical data (with indentation)
- Additional columns show attributes for each level
- Inline expansion reveals child records

**Used By:**
- **SAP Fiori**: "Tree Table" component for hierarchical data with attributes
- **Salesforce Lightning**: `lightning-tree-grid` component built on `lightning-datatable`
- **AWS Cloudscape**: Table with expandable rows pattern for resource management
- **Material React Table**: Expanding sub-rows/tree data guide

**Why They're Preferred:**
> "Tree tables allow users to view all item attributes at once, which means that the user can compare items more easily."

> "Use a table with expandable rows when a data set has multiple levels of hierarchy."

### 2. When to Use Each Pattern

#### Tree Tables (Option 5) - **BEST FOR YOUR USE CASE**
✅ **Use When:**
- Multiple levels of hierarchy (Facility → Building → Zone → Location) ✓
- Need to display attributes for each level (Code, Status, Count) ✓
- Users need to compare items across levels ✓
- Data management operations (CRUD) ✓
- Sorting and filtering needed ✓
- Inventory/warehouse management context ✓

❌ **Don't Use When:**
- Extremely large and complex datasets (use details pages instead)
- Simple one-level navigation (use accordion)
- Mobile-first experience (use card drill-down)

#### Tree Views (Option 2)
✅ **Use When:**
- Primary goal is navigation (not data comparison)
- Need to communicate hierarchical structure visually
- Organizing large amounts of nested information
- File system or folder-like structures

❌ **Don't Use When:**
- Need to display multiple attributes per item
- Require sorting/filtering by columns
- Users need to compare items side-by-side

### 3. Design Best Practices

#### Visual Hierarchy
- **Indentation**: 24-40px per level
- **Expand Icons**: Chevron (▶) that rotates 90° when expanded
- **Visual Depth**: Use background colors or left border to indicate nesting level
- **Icon Consistency**: Different icons per entity type (🏢 Facility, 🏛️ Building, 📐 Zone, 📦 Location)

#### Interaction Patterns
- **Click Target**: Either full row OR just expand icon (be consistent)
- **Keyboard Navigation**: Arrow keys to navigate, Space/Enter to expand
- **Expand All/Collapse All**: Provide bulk action buttons
- **State Persistence**: Remember expanded/collapsed state on reload

#### Data Display
- **First Column**: Hierarchical structure (name with icon)
- **Code Column**: Monospace font for technical identifiers
- **Status Column**: Visual badges with color coding
- **Count Column**: Show child count (e.g., "5 buildings")
- **Actions Column**: Contextual actions per row

#### Performance
- **Lazy Loading**: Load children only when expanded (for large datasets)
- **Virtual Scrolling**: For 100+ total items
- **Search**: Filter by any column, maintain hierarchy visibility

### 4. Enterprise Application Patterns

#### SAP Fiori Tree Table Guidelines
- Hierarchical data structured in rows and columns grouped into nodes
- First column identifies line item (prefer name over ID)
- Additional non-hierarchical columns per line item
- Each column can be sorted (except tree column)

#### Salesforce Lightning Design
- Rows with child items defined using `_children` key
- Display chevron button to expand/collapse
- Keyboard support: Right arrow expands, Left arrow collapses
- Support for multiple expanded rows simultaneously

#### AWS Cloudscape Pattern
- "Having clickable rows expand inline is an intuitive way to show more details"
- "Exposing more information in a desktop scenario is most appropriate to maintain full context"
- Reduces visual clutter by hiding details until needed

### 5. Warehouse/Inventory Context

**Specific Best Practices:**
- **Default Sorting**: Most recent entries first OR entries needing action
- **Status Visibility**: Critical for tracking (Active/Inactive/Maintenance)
- **Quick Actions**: Inline edit, add child, view details
- **Context Maintenance**: Keep parent visible when viewing children
- **Drill-Down Path**: Breadcrumbs or highlighted parent rows

**Example from Research:**
> "A warehouse manager can sort orders from earliest first to monitor progress and address issues early, and can also sort by shipping preference and ensure that same-day orders are on track."

### 6. Accessibility Requirements

- **Target Size**: 44x44 pixels for touch targets (WCAG AAA)
- **ARIA Roles**: `treegrid` role for tree tables, `tree` role for tree views
- **Keyboard Navigation**: Full keyboard support without mouse
- **Screen Reader**: Announce hierarchy level and expanded/collapsed state
- **Focus Management**: Maintain focus when expanding/collapsing

---

## Comparison: Your Options vs. Best Practices

| Pattern | Your Option | Enterprise Usage | Best For |
|---------|-------------|------------------|----------|
| **Tree Table** | Option 5 | ⭐⭐⭐⭐⭐ SAP, Salesforce, AWS | ✅ **Your use case** |
| **Tree View** | Option 2 | ⭐⭐⭐⭐ Carbon, PatternFly | Navigation-focused |
| **Tabs** | Option 1 | ⭐⭐ Basic admin panels | Simple flat data |
| **Card Drill-Down** | Option 3 | ⭐⭐⭐ Mobile apps | Mobile-first |
| **Split View** | Option 4 | ⭐⭐⭐⭐ IDEs, email clients | Power users |

---

## Final Recommendations

### Primary Recommendation: **Option 5 (Expandable Table)**

**Reasons:**
1. ✅ **Industry Standard**: Used by SAP Fiori, Salesforce, AWS for hierarchical data management
2. ✅ **Perfect Fit**: Designed specifically for multi-level organizational structures
3. ✅ **Data-Rich**: Supports your need for codes, statuses, counts, and actions
4. ✅ **Sortable/Filterable**: Essential for managing large facility/building lists
5. ✅ **Inventory Context**: Best practice pattern for warehouse/location management
6. ✅ **Comparison**: Users can compare facilities/buildings side-by-side
7. ✅ **Scalability**: Works from 10 to 1000+ locations

**Implementation Notes:**
- Start collapsed, allow users to expand as needed
- Provide "Expand All" for full hierarchy view
- Use lazy loading if total locations > 500
- Add search/filter across all columns
- Maintain expanded state in localStorage

### Secondary Recommendation: **Option 2 (Hierarchical Tree)**

**When to Choose This Instead:**
- If navigation is more important than data comparison
- If users work with one branch at a time
- If mobile experience is more important
- If you want simpler implementation

**Hybrid Approach:**
- Offer both views with a toggle button
- Default to Option 5, allow switching to Option 2
- Save user preference

---

## Implementation Priorities

### Must-Have Features
1. ✅ Expand/collapse rows
2. ✅ Visual hierarchy (indentation + icons)
3. ✅ Inline actions (Edit, Add Child)
4. ✅ Status badges
5. ✅ Child count display

### Should-Have Features
1. 🔄 Expand All / Collapse All
2. 🔄 Search across all columns
3. 🔄 Sort by any column
4. 🔄 State persistence (localStorage)
5. 🔄 Keyboard navigation

### Nice-to-Have Features
1. 💡 Drag-and-drop reordering
2. 💡 Bulk actions (multi-select)
3. 💡 Export hierarchy
4. 💡 Breadcrumb trail
5. 💡 Quick jump to location

---

## Sources

1. **SAP Fiori Design System** - Tree Table component
2. **Salesforce Lightning Design** - Tree Grid (`lightning-tree-grid`)
3. **AWS Cloudscape** - Table with Expandable Rows pattern
4. **IBM Carbon Design System** - Tree View component
5. **Material React Table** - Expanding Sub-Rows documentation
6. **Enterprise Table UX Design** - Denovers best practices
7. **Data Table Design UX Patterns** - Pencil & Paper analysis
8. **PatternFly Design System** - Tree View design guidelines

---

## Next Steps

1. **Decision**: Choose Option 5 (Expandable Table) as primary interface
2. **Design**: Create React component matching the HTML mockup
3. **Database**: Verify parent-child relationships are properly modeled
4. **API**: Build recursive endpoint for hierarchy with all attributes
5. **Testing**: Test with real data (your 182 gauges, facilities, buildings, zones)
6. **Iteration**: Gather user feedback and refine

**Key Validation Question:**
> "Do users need to compare multiple facilities/buildings side-by-side and see their attributes at a glance?"

If **YES** → **Option 5 (Tree Table)** ✅
If **NO** → **Option 2 (Tree View)** is acceptable

Based on your inventory management context, the answer is almost certainly **YES**.
