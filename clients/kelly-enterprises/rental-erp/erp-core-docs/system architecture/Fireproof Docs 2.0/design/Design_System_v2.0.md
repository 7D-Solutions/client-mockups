# Design System v2.0 - Infrastructure Component Reference

**Version:** 2.0  
**Date:** 2025-09-15  
**Purpose:** Complete design system specifications for the Fireproof Gauge System (infrastructure component reference only)

## ⚠️ CRITICAL: DO NOT IMPLEMENT CSS DIRECTLY

> **🚨 MANDATORY IMPLEMENTATION NOTICE:**
> 
> **ALL CSS IMPLEMENTATION IS PROHIBITED!**
> 
> This document contains design specifications that are **ALREADY IMPLEMENTED** in infrastructure components. Direct CSS implementation violates project architecture.
> 
> **✅ REQUIRED APPROACH:**
> - Use infrastructure components only
> - Follow patterns in [Visual_Style_Guide_v1.0.md](./Visual_Style_Guide_v1.0.md)
> - Follow infrastructure component architecture patterns
> 
> **❌ PROHIBITED:**
> - Creating CSS files or modules
> - Implementing visual styles directly
> - Using className-based styling
> 
> **This document serves as REFERENCE ONLY for infrastructure component maintainers.**

---

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Layout Architecture](#layout-architecture)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Component Library](#component-library)
6. [Spacing System](#spacing-system)
7. [Shadow System](#shadow-system)
8. [Status Indicators](#status-indicators)
9. [Interactive Elements](#interactive-elements)
10. [Responsive Design](#responsive-design)

---

## Design Philosophy

The Fireproof Gauge System employs a **card-based interface** with a distinctive **blue brand identity**. The design emphasizes clarity, functionality, and visual hierarchy through consistent spacing, shadows, and color coding.

### Core Principles
1. **Blue Canvas**: Full-page blue backdrop (#2c72d5) creates brand immersion
2. **White Cards**: Content lives in elevated white cards with rounded corners
3. **Status Colors**: Functional colors convey system states at a glance
4. **Consistent Spacing**: 4px base unit ensures visual rhythm
5. **Depth Through Shadows**: Multi-level shadow system creates hierarchy
6. **Responsive First**: Mobile-friendly with desktop optimization

## Layout Architecture

### Page Structure
```
┌─────────────────────────────────────────┐
│          Blue Background (#2c72d5)       │
│  ┌─────────────────────────────────┐    │
│  │     Header Card (White)         │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │   Navigation Tabs (Segmented)   │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │   Summary Cards (3 Vertical)    │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │   Inventory Card (Near Full)    │    │
│  │   - Header + Alerts              │    │
│  │   - Filters                      │    │
│  │   - Scrollable Gauge List       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Container System
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}
```

## Component Library

### 1. Navigation System

#### Segmented Tabs
```css
/* Full-width segmented navigation */
.main-nav {
  display: flex;
  width: 100%;
  margin-bottom: 1rem;
}

.nav-tab {
  flex: 1;
  background: #fff;
  border: 1px solid #fff;
  padding: 0.6rem 0;
  font-weight: bold;
  cursor: pointer;
  text-align: center;
  transition: background 0.2s, border-color 0.2s;
}

/* Rounded corners for first/last tabs */
.nav-tab.first { border-radius: 20px 0 0 20px; }
.nav-tab.last { border-radius: 0 20px 20px 0; }

/* Active state */
.nav-tab.active {
  background: #0052cc;
  color: #fff;
  border-color: #0052cc;
}
```

### 2. Card Components

#### Summary Cards (Vertical Layout)
```css
.card {
  background: #fff;
  flex: 1;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;      /* Vertical layout */
  align-items: center;         /* Center content */
  justify-content: center;
  text-align: center;
  min-height: 80px;
}

/* Title styling */
.card h3 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  font-size: 1rem;
  color: #222;
}

/* Number display group */
.number-group {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
}

.big-num {
  font-size: 2rem;
  font-weight: bold;
  color: #2c72d5;
  line-height: 1;
}

.small-label {
  font-size: 0.9rem;
  color: #666;
}
```

#### Inventory Card (Main Content)
```css
.inventory-card {
  background: #fff;
  border-radius: 16px 16px 12px 12px;
  padding: 1.5rem 1.5rem;
  margin-bottom: 3rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  height: calc(100vh - 20px);  /* Near full-screen for maximum visibility */
  display: flex;
  flex-direction: column;
}

/* Header with title and alerts on same line */
.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
```

#### Alert Cards
```css
.admin-alerts {
  display: flex;
  margin-bottom: 1.5rem;
  justify-content: space-evenly;  /* Equal spacing from edges and between */
  align-items: center;
  gap: 1rem;
}

.admin-alert-item {
  flex: 0 0 250px;
  min-width: 200px;
  max-width: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: all 0.2s ease;
  cursor: pointer;
  text-align: center;
}

/* QC Alert (Yellow) */
.admin-alert-item:first-child {
  background: #ffc107;
  border-color: #ffc107;
  color: #212529;
}

/* Unseal Alert (Orange Gradient) */
.admin-alert-item:last-child {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  border-color: #ff9800;
  color: white;
}
```

### 3. List Components

#### Gauge Rows with Scroll Snapping
```css
/* Scrollable content with snap behavior */
.gauge-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
  scroll-snap-type: y mandatory;     /* Enable vertical snapping */
  scroll-padding-top: 0.5rem;
}

/* Gauge row styling */
.gauge-row {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12px;
  padding: 0.6rem 1rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Snap every odd row for 2-row scroll groups */
.gauge-row:nth-child(odd) {
  scroll-snap-align: start;
}

.gauge-row:hover {
  background: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

### 4. Button System

#### Standard Button Sizes
```css
/* Base button styles */
button {
  padding: 0.5rem 0.8rem;
  font-size: 0.85rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.1s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

/* Modal buttons (larger) */
.modal-actions button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  min-width: 120px;
  justify-content: center;
}
```

#### Button Color Variants
```css
/* Success - Green */
.save-btn, .checkin-btn {
  background: #28a745;
  color: #fff;
}

/* Primary - Blue */
.checkout-btn {
  background: #007bff;
  color: #fff;
}

/* Info - Teal */
.edit-btn, .transfer-btn {
  background: #17a2b8;
  color: #fff;
}

/* Warning - Yellow */
.pending-btn {
  background: #ffc107;
  color: #212529;
}

/* Danger - Red */
.danger-btn {
  background: #dc3545;
  color: #fff;
}

/* Secondary - Gray */
.cancel-btn {
  background: #6c757d;
  color: #fff;
}

/* Special - Orange Gradient */
.status-btn.pending {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
  animation: pulse-glow 2s infinite;
}
```

### 5. Modal System

#### Modal Layout
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* Wide modal variant */
.modal-wide {
  max-width: 800px;
}
```

### 6. Form Elements

```css
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2c72d5;
  box-shadow: 0 0 0 2px rgba(44, 114, 213, 0.1);
}
```

## Color System

### Brand Colors
- **Primary Blue**: `#2c72d5` - Main brand color
- **Primary Dark**: `#0052cc` - Active states
- **Blue Background**: `#2c72d5` - Full page backdrop

### Status Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Success Green | `#28a745` | Available, Check-in, Save |
| Warning Yellow | `#ffc107` | Pending, QC Review |
| Danger Red | `#dc3545` | Issues, Delete, Overdue |
| Info Blue | `#17a2b8` | Edit, Transfer, Information |
| Orange | `#ff9800` | Unseal Requests (gradient) |

### Neutral Palette
```css
--white: #ffffff;
--gray-50: #f8f9fa;   /* Light backgrounds */
--gray-100: #e9ecef;  /* Borders */
--gray-300: #ced4da;  /* Input borders */
--gray-600: #495057;  /* Secondary text */
--gray-800: #212529;  /* Primary text */
```

## Typography

### Font Stack
```css
font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif;
```

### Type Scale
| Name | Size | Usage |
|------|------|-------|
| xs | 0.75rem | Tags, small labels |
| sm | 0.85rem | Buttons, secondary text |
| base | 0.9rem | Body text |
| md | 0.95rem | Form inputs |
| lg | 1rem | Primary content |
| xl | 1.1rem | Subheadings |
| 2xl | 1.25rem | Section titles |
| 3xl | 1.5rem | Modal headers |
| 4xl | 1.6rem | Page title |

### Font Weights
- **Normal**: 400 - Body text
- **Medium**: 500 - Subtle emphasis
- **Semibold**: 600 - Headers, labels
- **Bold**: 700 - Important numbers

## Spacing System

### Base Unit: 4px (0.25rem)
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

### Common Patterns
- **Card padding**: 1.5rem (24px)
- **Button padding**: 0.5rem 0.8rem
- **Modal padding**: 2rem (32px)
- **Row gap**: 0.5rem (8px)
- **Section margin**: 1rem (16px)

## Shadow System

```css
--shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
--shadow-md: 0 2px 8px rgba(0,0,0,0.1);
--shadow-lg: 0 4px 12px rgba(0,0,0,0.15);
--shadow-xl: 0 8px 24px rgba(0,0,0,0.2);
--shadow-2xl: 0 10px 40px rgba(0,0,0,0.3);
```

### Contextual Shadows
```css
/* Warning glow */
--shadow-warning: 0 2px 8px rgba(255, 152, 0, 0.3);

/* Success glow */
--shadow-success: 0 2px 8px rgba(76, 175, 80, 0.3);

/* Primary blue */
--shadow-primary: 0 8px 25px rgba(0, 82, 204, 0.4);
```

## Border Radius

```css
--radius-sm: 4px;      /* Small elements */
--radius-md: 6px;      /* Default */
--radius-lg: 8px;      /* Buttons, inputs */
--radius-xl: 12px;     /* Cards */
--radius-2xl: 16px;    /* Modals */
--radius-round: 20px;  /* Pills, tabs */
```

## Animation Patterns

### Transitions
```css
/* Standard transition */
transition: all 0.2s ease;

/* Fast feedback */
transition: transform 0.1s;

/* Smooth modals */
transition: all 0.3s ease;
```

### Keyframe Animations
```css
/* Pulse glow for urgent items */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
  }
  50% {
    box-shadow: 0 4px 16px rgba(255, 152, 0, 0.5);
  }
}

/* Flash for alerts */
@keyframes flash {
  0%, 50% {
    opacity: 1;
    transform: scale(1);
  }
  25% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

/* Slide in for notifications */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -45%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
```

## Interaction States

### Hover Effects
```css
/* Lift on hover */
element:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Scale buttons */
button:hover {
  transform: scale(1.05);
}

/* Background change */
.interactive:hover {
  background: #f8f9fa;
}
```

### Active States
```css
/* Pressed effect */
element:active {
  transform: translateY(0);
}

/* Active card */
.card.active {
  background: #0052cc;
  color: #fff;
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 82, 204, 0.4);
}
```

### Focus States
```css
/* Input focus */
input:focus {
  outline: none;
  border-color: #2c72d5;
  box-shadow: 0 0 0 2px rgba(44, 114, 213, 0.1);
}

/* Keyboard navigation */
:focus-visible {
  outline: 2px solid #2c72d5;
  outline-offset: 2px;
}
```

## Responsive Patterns

### Breakpoints
```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

### Mobile Adjustments
```css
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
  
  .grid {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
    padding: 1.5rem;
  }
}
```

## Z-Index Scale

```css
--z-dropdown: 100;
--z-sticky: 200;
--z-fixed: 300;
--z-modal-backdrop: 1000;
--z-modal: 1050;
--z-notification: 10000;
```

## Implementation Guidelines

### Component Composition
1. Start with semantic HTML structure
2. Apply base component class (e.g., `.card`, `.btn`)
3. Add variant classes (e.g., `.card.active`, `.btn-primary`)
4. Include state classes as needed (e.g., `:hover`, `:disabled`)

### Naming Conventions
- **Components**: `.component-name` (e.g., `.gauge-row`)
- **Elements**: `.component-element` (e.g., `.gauge-info`)
- **Modifiers**: `.component--modifier` (e.g., `.card--active`)
- **States**: `.is-state` or `:pseudo` (e.g., `.is-loading`, `:hover`)

### Performance Considerations
1. Use CSS transforms for animations (GPU acceleration)
2. Avoid excessive box-shadow on scrollable elements
3. Implement scroll-snap for better mobile experience
4. Use `will-change` sparingly for known animations

### Accessibility Requirements
- Maintain 4.5:1 contrast ratio for normal text
- Provide focus indicators for keyboard navigation
- Use semantic HTML elements
- Include ARIA labels for icon-only buttons
- Ensure touch targets are minimum 44x44px

## Migration from v1

### Key Changes
1. **Summary Cards**: Changed from horizontal to vertical layout
2. **Inventory Height**: Increased to `calc(100vh - 20px)`
3. **Alert Positioning**: Moved to header level with `space-evenly`
4. **Scroll Behavior**: Added snap scrolling for gauge rows
5. **Button Consistency**: Unified padding and sizing across all buttons

### Deprecated Patterns
- Inline styles (move to classes)
- Fixed pixel values (use rem units)
- Hard-coded colors (use CSS variables)
- Deep nesting (flatten selectors)

## Testing Checklist

### Visual Consistency
- [ ] All buttons have 12px border radius
- [ ] Cards use appropriate shadow levels
- [ ] Colors match the defined palette
- [ ] Spacing follows the 4px grid

### Functionality
- [ ] Scroll snapping works on gauge list
- [ ] Modals are properly centered
- [ ] Hover states provide feedback
- [ ] Focus states are visible

### Responsive Behavior
- [ ] Layout adapts at 768px breakpoint
- [ ] Touch targets are adequate on mobile
- [ ] Text remains readable at all sizes
- [ ] No horizontal scroll on mobile

### Performance
- [ ] Animations run at 60fps
- [ ] Scroll performance is smooth
- [ ] No layout shifts during interaction
- [ ] Page loads under 3 seconds

---

*Last Updated: January 2025*
*Version: 2.0*