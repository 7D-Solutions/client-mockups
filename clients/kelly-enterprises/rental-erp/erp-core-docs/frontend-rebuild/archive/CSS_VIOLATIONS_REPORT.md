# CSS Violations Report

**Date:** 2025-09-09  
**Purpose:** Document all CSS violations against official design system

## Design System Requirements (from AI_Implementation_Spec_v1.0.md)

### Official Specifications:
```css
/* MUST USE THESE EXACT VALUES */
body { background: #2c72d5; }
.inventory-card { height: calc(100vh - 20px); } /* NEVER -140px */

/* Button Padding - STRICT */
.gauge-actions button { padding: 0.5rem 0.8rem; font-size: 0.85rem; }
.modal-actions button { padding: 0.75rem 1.5rem; font-size: 0.95rem; }

/* Colors - EXACT */
Primary: #2c72d5
Active: #0052cc
Success: #28a745
Warning: #ffc107
Danger: #dc3545
```

## Current Violations Found

### 1. Wrong calc() Values
```css
/* VIOLATION in index.css:478 */
.inventory-card { height: calc(100vh - 140px); } /* WRONG! Should be -20px */
```

### 2. Inline Style Overrides (238 occurrences)
```tsx
/* Example from Modal.tsx */
<div style={{
  padding: '20px',              /* Should use design token */
  backgroundColor: 'white',     /* Should use CSS class */
  borderRadius: '8px',         /* Violates 12px standard */
}}>
```

### 3. !important Abuse (87 instances)
```css
/* index.css has entire blocks of !important */
.tab-btn {
  background: #f8f9fa !important;
  color: #6c757d !important;
  padding: 0.5rem 1rem !important;
  font-size: 0.85rem !important;
  /* ... 8 more !important rules */
}
```

### 4. Mixed Styling Systems
```tsx
/* Same component uses 3 approaches */
className="flex items-center"    // Tailwind
style={{ display: 'flex' }}      // Inline
class="modal-content"            // Legacy CSS
```

### 5. Color Violations
```css
/* Using wrong blue */
.nav-tab.active { background: #0052cc; }  /* Correct */
.header-card { color: #2c72d5; }          /* Correct */
body { background: #2c72d5; }             /* Correct */

/* But then... */
.tag.info { background: #007bff; }        /* WRONG blue! */
.btn-primary { background: #0066cc; }     /* WRONG blue! */
```

### 6. Spacing Violations
Design system uses 4px grid (0.25rem base):
```css
/* Correct */
padding: 0.5rem 0.8rem;  /* Action buttons */

/* Violations */
padding: 20px;           /* Should be 1.25rem */
margin: 15px;            /* Not on 4px grid */
gap: 0.3rem;             /* Should be 0.25rem or 0.5rem */
```

### 7. Shadow Violations
```css
/* Design System Shadows */
--shadow-sm: 0 2px 6px rgba(0,0,0,0.08);
--shadow-md: 0 2px 8px rgba(0,0,0,0.1);

/* Current Implementation */
box-shadow: 0 10px 30px rgba(0,0,0,0.3);  /* WRONG */
box-shadow: 0 4px 6px rgba(0,0,0,0.1);    /* WRONG */
```

## Impact Analysis

1. **Visual Inconsistency**: UI doesn't match design specs
2. **Performance**: Style recalculations from inline styles
3. **Maintenance**: Can't update design system centrally
4. **Developer Confusion**: Which system to use?

## Required Fixes

1. **Create design-tokens.css** with exact values
2. **Remove ALL inline styles** (238 instances)
3. **Remove ALL !important** (87 instances)
4. **Fix calc() values**
5. **Standardize on ONE system** (Tailwind + CSS Modules)
6. **Add CSS linting** to enforce standards