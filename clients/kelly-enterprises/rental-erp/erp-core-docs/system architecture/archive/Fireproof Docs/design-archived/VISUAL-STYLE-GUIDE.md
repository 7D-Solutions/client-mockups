# Fireproof Gauge System - Visual Style Guide

## Quick Reference Implementation Patterns

### 1. Page Layout Template
```jsx
<body style="background: #2c72d5">
  <div className="container">
    {/* Header Card */}
    <div className="header-card">
      <div className="left">
        <i className="fas fa-fire-flame-curved"></i>
        <div>
          <h1>Fire Gauge Tracking System</h1>
          <p>Logged in as: {user.name}</p>
        </div>
      </div>
      <div>
        <button className="refresh-btn">
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
        <button className="logout-btn">Logout</button>
      </div>
    </div>

    {/* Navigation */}
    <nav className="main-nav">
      <button className="nav-tab first active">Gauge Management</button>
      <button className="nav-tab">Gauge Transfers</button>
      <button className="nav-tab last">Admin Panel</button>
    </nav>

    {/* Content Area */}
    <div className="content">
      {/* Components go here */}
    </div>
  </div>
</body>
```

### 2. Summary Cards Pattern
```jsx
{/* Vertical layout with centered content */}
<div className="summary-cards">
  <div className="card interactive-card">
    <h3>
      <i className="fas fa-check-circle"></i> Current
    </h3>
    <div className="number-group">
      <span className="big-num">42</span>
      <span className="small-label">gauges</span>
    </div>
  </div>
  
  <div className="card interactive-card">
    <h3>
      <i className="fas fa-clock"></i> Due Soon
    </h3>
    <div className="number-group">
      <span className="big-num">7</span>
      <span className="small-label">gauges</span>
    </div>
  </div>
  
  <div className="card interactive-card active">
    <h3>
      <i className="fas fa-exclamation-circle"></i> Issues
    </h3>
    <div className="number-group">
      <span className="big-num">3</span>
      <span className="small-label">gauges</span>
    </div>
  </div>
</div>
```

### 3. Inventory Card with Header Alerts
```jsx
<div className="inventory-card">
  {/* Header with title and alerts on same line */}
  <div className="inventory-header">
    <h2>
      <i className="fas fa-list"></i> Gauge Inventory
    </h2>
    
    {/* Alert cards positioned with space-evenly */}
    {hasAlerts && (
      <div className="admin-alerts">
        <div className="admin-alert-item">
          <div className="admin-alert-info">
            <div className="admin-alert-title">5 Pending QC</div>
            <p>Click to review</p>
          </div>
        </div>
        
        <div className="admin-alert-item">
          <div className="admin-alert-info">
            <div className="admin-alert-title">3 Unseal Requests</div>
            <p>Review needed</p>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Filter Bar */}
  <div className="filter-bar">
    <input type="text" placeholder="Search gauges..." />
    <select>
      <option>All Locations</option>
      <option>Shop A</option>
      <option>Shop B</option>
    </select>
    <select>
      <option>All Status</option>
      <option>Available</option>
      <option>Checked Out</option>
    </select>
  </div>

  {/* Scrollable content with snap */}
  <div className="gauge-content">
    {gauges.map(gauge => (
      <div className="gauge-row">
        {/* Gauge row content */}
      </div>
    ))}
  </div>
</div>
```

### 4. Gauge Row Component
```jsx
<div className="gauge-row">
  <div className="gauge-info">
    <a href="#">{gauge.gauge_id}</a>
    <p>{gauge.gauge_name}</p>
    <p>
      <i className="fas fa-map-marker-alt"></i> {gauge.location}
      <span className="tag success">
        <i className="fas fa-check-circle"></i> Available
      </span>
    </p>
  </div>
  
  <div className="gauge-actions">
    <button className="edit-btn">
      <i className="fas fa-edit"></i> Edit
    </button>
    <button className="checkout-btn">
      <i className="fas fa-sign-out-alt"></i> Checkout
    </button>
    <button className="transfer-btn">
      <i className="fas fa-exchange-alt"></i> Transfer
    </button>
  </div>
</div>
```

### 5. Modal Implementation
```jsx
<div className="modal-overlay">
  <div className="modal-content">
    <div className="modal-header">
      <h2>Modal Title</h2>
      <button className="close-btn">&times;</button>
    </div>
    
    <form>
      <div className="form-group">
        <label>Field Label</label>
        <input type="text" placeholder="Enter value" />
      </div>
      
      <div className="form-group">
        <label>Select Option</label>
        <select>
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      </div>
    </form>
    
    <div className="modal-actions">
      <button className="cancel-btn">
        <i className="fas fa-times"></i> Cancel
      </button>
      <button className="save-btn">
        <i className="fas fa-save"></i> Save
      </button>
    </div>
  </div>
</div>
```

### 6. Button Usage Guide

#### Standard Action Buttons (0.5rem 0.8rem padding)
```jsx
{/* Success - Green */}
<button className="save-btn">
  <i className="fas fa-save"></i> Save
</button>
<button className="checkin-btn">
  <i className="fas fa-sign-in-alt"></i> Check In
</button>

{/* Primary - Blue */}
<button className="checkout-btn">
  <i className="fas fa-sign-out-alt"></i> Checkout
</button>

{/* Info - Teal */}
<button className="edit-btn">
  <i className="fas fa-edit"></i> Edit
</button>
<button className="transfer-btn">
  <i className="fas fa-exchange-alt"></i> Transfer
</button>

{/* Warning - Yellow */}
<button className="pending-btn" disabled>
  <i className="fas fa-clock"></i> Pending
</button>

{/* Danger - Red */}
<button className="danger-btn">
  <i className="fas fa-trash"></i> Delete
</button>

{/* Secondary - Gray */}
<button className="cancel-btn">
  <i className="fas fa-times"></i> Cancel
</button>

{/* Special - Orange Gradient with Animation */}
<button className="status-btn pending">
  <i className="fas fa-unlock"></i> Unseal Pending
</button>
```

#### Modal Buttons (0.75rem 1.5rem padding)
```jsx
<div className="modal-actions">
  <button className="btn btn-secondary">Cancel</button>
  <button className="btn btn-primary">Continue</button>
  <button className="btn btn-success">Save Changes</button>
  <button className="btn btn-danger">Delete</button>
</div>
```

### 7. Status Tags
```jsx
{/* Success - Green */}
<span className="tag success">
  <i className="fas fa-check-circle"></i> Available
</span>

{/* Warning - Yellow */}
<span className="tag warning">
  <i className="fas fa-clock"></i> Due Soon
</span>

{/* Danger - Red */}
<span className="tag danger">
  <i className="fas fa-exclamation-circle"></i> Overdue
</span>

{/* Info - Blue */}
<span className="tag info">
  <i className="fas fa-info-circle"></i> Calibrating
</span>
```

### 8. Notification Patterns
```jsx
{/* Success Notification */}
<div className="notification notification-success">
  <div className="notification-content">
    <i className="fas fa-check-circle"></i>
    <span>Operation completed successfully!</span>
  </div>
</div>

{/* Error Notification */}
<div className="notification notification-error">
  <div className="notification-content">
    <i className="fas fa-exclamation-circle"></i>
    <span>An error occurred. Please try again.</span>
  </div>
</div>

{/* Info Notification */}
<div className="notification notification-info">
  <div className="notification-content">
    <i className="fas fa-info-circle"></i>
    <span>Processing your request...</span>
  </div>
</div>
```

### 9. Form Patterns
```jsx
{/* Standard Form Layout */}
<form>
  <div className="form-group">
    <label>Gauge ID</label>
    <input 
      type="text" 
      placeholder="Enter gauge ID"
      className="form-input"
    />
  </div>
  
  <div className="form-group">
    <label>Location</label>
    <select className="form-select">
      <option>Select location</option>
      <option>Shop A</option>
      <option>Shop B</option>
    </select>
  </div>
  
  <div className="form-group">
    <label>Notes</label>
    <textarea 
      className="form-textarea"
      rows="3"
      placeholder="Add any notes..."
    ></textarea>
  </div>
</form>
```

### 10. Special Effects

#### Pulse Glow Animation
```css
/* For urgent/pending items */
.pulse-glow {
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
  }
  50% {
    box-shadow: 0 4px 16px rgba(255, 152, 0, 0.5);
  }
}
```

#### Flash Animation
```css
/* For alerts needing attention */
.flashing {
  animation: flash 1.5s infinite;
  box-shadow: 0 0 10px rgba(255, 193, 7, 0.6);
}

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
```

## Color Palette Quick Reference

### Primary Colors
- Blue: `#2c72d5` ![#2c72d5](https://via.placeholder.com/15/2c72d5/000000?text=+)
- Dark Blue: `#0052cc` ![#0052cc](https://via.placeholder.com/15/0052cc/000000?text=+)

### Status Colors
- Success: `#28a745` ![#28a745](https://via.placeholder.com/15/28a745/000000?text=+)
- Warning: `#ffc107` ![#ffc107](https://via.placeholder.com/15/ffc107/000000?text=+)
- Danger: `#dc3545` ![#dc3545](https://via.placeholder.com/15/dc3545/000000?text=+)
- Info: `#17a2b8` ![#17a2b8](https://via.placeholder.com/15/17a2b8/000000?text=+)
- Orange: `#ff9800` ![#ff9800](https://via.placeholder.com/15/ff9800/000000?text=+)

### Neutral Colors
- White: `#ffffff` ![#ffffff](https://via.placeholder.com/15/ffffff/000000?text=+)
- Gray 50: `#f8f9fa` ![#f8f9fa](https://via.placeholder.com/15/f8f9fa/000000?text=+)
- Gray 100: `#e9ecef` ![#e9ecef](https://via.placeholder.com/15/e9ecef/000000?text=+)
- Gray 600: `#495057` ![#495057](https://via.placeholder.com/15/495057/000000?text=+)
- Gray 800: `#212529` ![#212529](https://via.placeholder.com/15/212529/000000?text=+)

## Common CSS Patterns

### Card Hover Effect
```css
.card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

### Button Hover Effect
```css
button:hover {
  transform: scale(1.05);
}

/* Alternative lift effect */
button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

### Active State
```css
.active {
  background: #0052cc;
  color: #fff;
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 82, 204, 0.4);
}
```

### Focus State
```css
input:focus {
  outline: none;
  border-color: #2c72d5;
  box-shadow: 0 0 0 2px rgba(44, 114, 213, 0.1);
}
```

## Responsive Breakpoints

```css
/* Mobile: < 640px */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */

@media (max-width: 768px) {
  /* Mobile styles */
  .container { padding: 0 16px; }
  .modal-content { width: 95%; }
  .grid { grid-template-columns: 1fr; }
}
```

---

*Use this guide for quick implementation reference. For detailed specifications, see DESIGN-SYSTEM-V2.md*