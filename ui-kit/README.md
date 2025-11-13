# FireProof UI Kit

Reusable UI foundation for 7D Solutions mockups and applications.

## Purpose

Centralized design system and components that can be shared across:
- Client mockups
- Production applications
- Internal tools

## Contents

### CSS Files
- **`css/tokens.css`** - Design tokens (colors, spacing, typography)
- **`css/reset.css`** - CSS reset for consistency
- **`css/components.css`** - UI components (buttons, forms, tables, etc.)

### JavaScript Files
- **`js/mockup-core.js`** - Interactive mockup utilities
  - `MockupStore` - Session-based data storage
  - `ModalManager` - Modal dialog control
  - `Toast` - Notification system
  - `FormUtils` - Form handling utilities
  - `TableRenderer` - Dynamic table rendering
  - `DateUtils` - Date formatting helpers

## Usage

### In HTML Files

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Mockup</title>

  <!-- FireProof UI Kit -->
  <link rel="stylesheet" href="../fireproof-ui-kit/css/tokens.css">
  <link rel="stylesheet" href="../fireproof-ui-kit/css/reset.css">
  <link rel="stylesheet" href="../fireproof-ui-kit/css/components.css">
  <script src="../fireproof-ui-kit/js/mockup-core.js"></script>
</head>
<body>
  <!-- Your content here -->
</body>
</html>
```

### Folder Structure

```
C:\Users\7d.vision\Projects\
├── fireproof-ui-kit\          ← Shared foundation
│   ├── css\
│   ├── js\
│   └── README.md
├── cattle-tracker\             ← Client mockup 1
│   └── index.html
├── inventory-system\           ← Client mockup 2
│   └── index.html
└── restaurant-pos\             ← Client mockup 3
    └── index.html
```

## Customization

### Theming

Override CSS variables in your mockup to change colors/branding:

```css
:root {
  --color-primary: #your-brand-color;
  --color-secondary: #your-secondary-color;
}
```

### Adding Components

When you discover a new pattern in a mockup:
1. Add it to `fireproof-ui-kit/css/components.css`
2. All other mockups can now use it
3. Single source of truth for improvements

## Development Workflow

1. **Start new mockup**: Copy template, link to UI kit
2. **Build features**: Use kit components and utilities
3. **Discover improvements**: Update kit for everyone's benefit
4. **Deploy**: Each mockup is independent Railway project

## Components Reference

### Buttons
- `.btn` - Base button
- `.btn-primary` - Primary action
- `.btn-secondary` - Secondary action
- `.btn-danger` - Destructive action
- `.btn-success` - Success/confirm action
- `.btn-sm` - Small size variant

### Forms
- `.form-group` - Form field container
- `.form-label` - Field label
- `.form-control` - Input, textarea, select

### Tables
- `.table-container` - Table wrapper
- `.table` - Data table

### Cards
- `.card` - Card container
- `.card-header` - Card header
- `.card-body` - Card content

### Badges
- `.badge` - Base badge
- `.badge-success`, `.badge-info`, `.badge-warning`, `.badge-danger`

### Modals
- Use `ModalManager.show('modal-id')` and `ModalManager.hide('modal-id')`

### Layout
- `.container` - Centered content container
- `.page-header` - Page header section
- `.page-title` - Page title
- `.page-actions` - Action buttons area

## Version History

- **v1.0** - Initial extraction from FireProof ERP
  - Core CSS tokens and components
  - JavaScript utilities for mockups
  - Session-based data storage
