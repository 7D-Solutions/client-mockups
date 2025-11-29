# AI Implementation Specification - Fireproof Gauge System

## CRITICAL RULES - ALWAYS FOLLOW

### Page Structure
```css
body { background: #2c72d5; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 32px; }
```

### Component Heights
```css
.inventory-card { height: calc(100vh - 20px); } /* NEVER use -140px or other values */
```

### Card Layouts
```css
/* Summary Cards - VERTICAL LAYOUT */
.card {
  padding: 0.75rem 1rem;  /* SPECIFIC for summary cards */
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 80px;
}
```

### Alert Positioning
```css
/* Alerts in header - SAME LINE as title */
.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-alerts {
  justify-content: space-evenly; /* NOT center, NOT flex-start */
  gap: 1rem;
}
```

### Scroll Behavior
```css
.gauge-content {
  scroll-snap-type: y mandatory;
  scroll-padding-top: 0.5rem;
}
.gauge-row:nth-child(odd) {
  scroll-snap-align: start;
}
```

### Button Sizes - STRICT RULES
```css
/* Action buttons in rows */
.gauge-actions button,
.user-actions button,
.save-btn,
.cancel-btn {
  padding: 0.5rem 0.8rem;
  font-size: 0.85rem;
  border-radius: 12px;
}

/* Modal buttons ONLY */
.modal-actions button {
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  border-radius: 8px;
  min-width: 120px;
}
```

### Navigation Tabs
```css
.nav-tab.first { border-radius: 20px 0 0 20px; }
.nav-tab.middle { border-radius: 0; margin-left: -1px; }
.nav-tab.last { border-radius: 0 20px 20px 0; margin-left: -1px; }
```

## COLOR ASSIGNMENTS - EXACT USAGE

### Button Colors by Function
- **save-btn, checkin-btn**: `#28a745` (green)
- **checkout-btn**: `#007bff` (blue) 
- **edit-btn, transfer-btn**: `#17a2b8` (teal)
- **pending-btn**: `#ffc107` (yellow)
- **danger-btn**: `#dc3545` (red)
- **cancel-btn**: `#6c757d` (gray)
- **status-btn.pending**: `linear-gradient(135deg, #ff9800, #f57c00)` + pulse animation

### Alert Card Colors
- **First alert (QC)**: `background: #ffc107; color: #212529;`
- **Last alert (Unseal)**: `background: linear-gradient(135deg, #ff9800, #f57c00); color: white;`

## COMPONENT PATTERNS - COPY EXACTLY

### Summary Card Structure
```jsx
<div className="card interactive-card">
  <h3><i className="fas fa-icon"></i> Title</h3>
  <div className="number-group">
    <span className="big-num">42</span>
    <span className="small-label">units</span>
  </div>
</div>
```

### Inventory Header with Alerts
```jsx
<div className="inventory-header">
  <h2><i className="fas fa-list"></i> Gauge Inventory</h2>
  {hasAlerts && (
    <div className="admin-alerts">
      {/* Alert cards here */}
    </div>
  )}
</div>
```

### Gauge Row Actions
```jsx
<div className="gauge-actions">
  <button className="edit-btn">Edit</button>
  <button className="checkout-btn">Checkout</button>
  <button className="transfer-btn">Transfer</button>
</div>
```

## SPACING VALUES - USE THESE ONLY

- Summary card padding: `0.75rem 1rem`
- Inventory card padding: `1.5rem`
- Row padding: `0.6rem 1rem`
- Button padding: `0.5rem 0.8rem` (actions) or `0.75rem 1.5rem` (modals)
- Modal padding: `2rem`
- Gap between elements: `0.5rem` or `1rem`

## BORDER RADIUS - FIXED VALUES

- Buttons: `12px` (standard), `8px` (modal buttons)
- Cards: `8px` (summary), `12px` (gauge rows), `16px` (modals)
- Navigation tabs: `20px` (ends only)
- Inventory card: `16px 16px 12px 12px`

## Z-INDEX HIERARCHY

```css
--z-modal-backdrop: 1000;
--z-modal: 1050;
--z-notification: 10000;
```

## SHADOW VALUES

```css
/* Standard shadows */
box-shadow: 0 2px 6px rgba(0,0,0,0.08);  /* Summary cards */
box-shadow: 0 2px 8px rgba(0,0,0,0.1);   /* Gauge rows */
box-shadow: 0 4px 12px rgba(0,0,0,0.15); /* Hover state */
box-shadow: 0 8px 24px rgba(0,0,0,0.2);  /* Modals */

/* Special shadows */
box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);  /* Orange glow */
box-shadow: 0 8px 25px rgba(0, 82, 204, 0.4);  /* Active blue */
```

## FONT SIZES - EXACT VALUES

```css
0.75rem  /* Tags */
0.85rem  /* Buttons, secondary text */
0.9rem   /* Body text */
0.95rem  /* Modal buttons */
1rem     /* Primary content */
1.25rem  /* Section titles */
1.5rem   /* Modal headers */
2rem     /* Big numbers in cards */
```

## HOVER EFFECTS - STANDARD PATTERNS

```css
/* Lift effect */
:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Scale effect (buttons only) */
button:hover {
  transform: scale(1.05);
}

/* Background change */
.row:hover {
  background: #f8f9fa;
}
```

## ANIMATIONS - USE AS-IS

```css
/* Pulse glow - for pending items */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3); }
  50% { box-shadow: 0 4px 16px rgba(255, 152, 0, 0.5); }
}

/* Flash - for alerts */
@keyframes flash {
  0%, 50% { opacity: 1; transform: scale(1); }
  25% { opacity: 0.7; transform: scale(1.05); }
}
```

## COMMON MISTAKES TO AVOID

1. **NEVER** use `calc(100vh - 140px)` for inventory card
2. **NEVER** use horizontal layout for summary cards
3. **NEVER** use `justify-content: center` for admin alerts
4. **NEVER** mix button padding sizes outside their context
5. **NEVER** forget the pulse animation on pending status buttons
6. **NEVER** use different border radius than specified

## WHEN CREATING NEW COMPONENTS

1. Check this spec first for existing patterns
2. Use exact color hex values, not "similar" ones
3. Maintain 4px spacing grid (0.25rem base)
4. Test hover and active states
5. Verify responsive behavior at 768px breakpoint

---
*This specification is optimized for AI parsing. Follow exactly as written.*