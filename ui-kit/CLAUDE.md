# CLAUDE.md - UI Kit Context for AI Assistants

**Project**: 7D Solutions UI Kit
**Purpose**: Reusable design system for rapid mockup and application development
**Location**: `/mnt/c/Users/7d.vision/Projects/7D Solutions/ui-kit/`

---

## Project Overview

This UI Kit is a centralized design system extracted from FireProof ERP, providing production-ready components, utilities, and patterns for building client mockups and applications. It enables rapid development while maintaining consistency across projects.

## Directory Structure

```
ui-kit/
├── css/
│   ├── tokens.css          # Design tokens (colors, spacing, typography)
│   ├── reset.css           # CSS reset
│   └── components.css      # UI components (buttons, forms, tables, modals)
├── js/
│   └── mockup-core.js      # JavaScript utilities (stores, modals, toasts, forms)
├── templates/
│   └── starter-template.html  # Complete starter template
├── README.md               # User-facing documentation
├── FEATURES.md            # Detailed component documentation
├── EXTRACTION_REPORT.md   # History and extraction details
└── CLAUDE.md             # This file - AI assistant context
```

## Core Philosophy

1. **Single Source of Truth**: All shared components live in the UI Kit
2. **Extract and Enhance**: Discover patterns in projects → extract to UI Kit → all projects benefit
3. **Production-Ready**: All code extracted from working FireProof ERP production system
4. **Session-Based**: Mockups use session storage for demo data (no backend required)

## Available Components

### CSS Components (components.css)

**Layout**:
- `.container` - Centered content wrapper
- `.page-header` - Page header section
- `.page-title` - Page title
- `.page-actions` - Action button area

**Buttons**:
- `.btn` - Base button
- `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`
- `.btn-sm` - Small variant

**Forms**:
- `.form-group` - Form field wrapper
- `.form-label` - Field label
- `.form-control` - Input/select/textarea
- `.filter-bar`, `.filter-group` - Filter controls

**Tables**:
- `.datatable-container` - Table wrapper
- `.datatable-toolbar` - Toolbar above table
- `.datatable` - Data table
- `.table-wrapper` - Scrollable wrapper

**Cards & Badges**:
- `.card`, `.card-header`, `.card-body`
- `.badge`, `.badge-success`, `.badge-info`, `.badge-warning`, `.badge-danger`

**Modals**:
- `.modal` - Modal dialog
- `.modal-backdrop` - Dark overlay
- `.modal-header`, `.modal-body`, `.modal-footer`

**Pagination**:
- `.pagination` - Pagination container
- `.pagination-info` - Info text (e.g., "Showing 1-10 of 45")
- `.pagination-controls` - Page buttons
- `.page-btn` - Page button

### JavaScript Utilities (mockup-core.js)

**MockupStore** - Session-based data management:
```javascript
const store = new MockupStore('store-name');
store.add({ name: 'Item' });           // Add with auto-generated ID
store.getAll();                         // Get all items
store.getById(id);                      // Get by ID
store.update(id, { name: 'Updated' }); // Update
store.delete(id);                       // Delete
store.search('query', ['field1', 'field2']); // Exact match search
```

**ModalManager** - Modal control:
```javascript
ModalManager.show('modal-id');  // Show modal + backdrop + lock scroll
ModalManager.hide('modal-id');  // Hide modal + restore scroll
```

**Toast** - Notifications:
```javascript
Toast.success('Saved!');
Toast.error('Failed!');
Toast.warning('Warning!');
Toast.info('Info message');
```

**FormUtils** - Form helpers:
```javascript
FormUtils.getFormData('form-id');      // Extract form data as object
FormUtils.setFormData('form-id', data); // Populate form from object
FormUtils.clearForm('form-id');         // Reset form
FormUtils.validate('form-id');          // Validate form
```

**DateUtils** - Date formatting:
```javascript
DateUtils.formatDate('2025-01-15');     // → 1/15/2025
DateUtils.formatDateTime('2025-01-15'); // → 1/15/2025, 12:00 PM
DateUtils.getToday();                   // → 2025-01-15
```

## Advanced Features (See FEATURES.md)

### Column Customization
**Source**: FireProof ERP Gauge Management
- Show/hide columns via checkboxes
- Drag-and-drop column reordering
- Reset to default configuration
- Session storage persistence

### Pagination
**Source**: FireProof ERP Infrastructure
- Dynamic page number generation (max 7 visible)
- Auto-hide when only 1 page
- Previous/Next navigation
- Configurable items per page (default: 10)

**Implementation Pattern**:
```javascript
let currentPage = 1;
let itemsPerPage = 10;

// In render function:
const totalPages = Math.ceil(data.length / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = Math.min(startIndex + itemsPerPage, data.length);
const paginatedData = data.slice(startIndex, endIndex);

renderPaginationControls(totalPages);
```

See FEATURES.md for complete implementation code.

## Creating a New Mockup/Application

### Quick Start

1. **Copy starter template**:
   ```bash
   cp ui-kit/templates/starter-template.html my-new-app/index.html
   ```

2. **Update paths** in HTML:
   ```html
   <link rel="stylesheet" href="../ui-kit/css/tokens.css">
   <script src="../ui-kit/js/mockup-core.js"></script>
   ```

3. **Customize**:
   - Update page title and header
   - Define data model in MockupStore
   - Add table columns
   - Customize form fields

4. **Test locally**:
   Open `index.html` in browser - no server needed!

### Folder Structure Pattern

```
7D Solutions/
├── ui-kit/                    ← Shared foundation (this repository)
├── clients/
│   └── client-name/
│       └── app-name/
│           ├── index.html     ← Your application
│           └── README.md      ← App-specific docs
```

## Development Patterns

### Pattern 1: Data Table with CRUD
```javascript
// 1. Initialize store
const itemStore = new MockupStore('items');

// 2. Render function with pagination
function renderTable() {
    let items = itemStore.getAll();

    // Pagination
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = items.slice(startIndex, startIndex + itemsPerPage);

    renderPaginationControls(totalPages);

    // Render rows
    tbody.innerHTML = paginatedItems.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>
                <button onclick="editItem('${item.id}')">Edit</button>
                <button onclick="deleteItem('${item.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// 3. CRUD functions
function saveItem(e) {
    e.preventDefault();
    const data = FormUtils.getFormData('item-form');
    itemStore.add(data);
    ModalManager.hide('item-modal');
    renderTable();
    Toast.success('Saved!');
}

function editItem(id) {
    const item = itemStore.getById(id);
    FormUtils.setFormData('item-form', item);
    ModalManager.show('item-modal');
}

function deleteItem(id) {
    if (confirm('Delete?')) {
        itemStore.delete(id);
        renderTable();
        Toast.success('Deleted!');
    }
}
```

### Pattern 2: Filtering
```javascript
function applyFilters() {
    let items = itemStore.getAll();

    // Text search
    const searchTerm = document.getElementById('search').value.toLowerCase();
    if (searchTerm) {
        items = items.filter(item =>
            item.name.toLowerCase().includes(searchTerm)
        );
    }

    // Dropdown filter
    const status = document.getElementById('status-filter').value;
    if (status) {
        items = items.filter(item => item.status === status);
    }

    renderTable(items);
}
```

### Pattern 3: Master-Detail with Tabs
```javascript
function showDetail(itemId) {
    const item = itemStore.getById(itemId);
    const relatedData = relatedStore.search(item.id, ['parentId']);

    // Render detail modal with tabs
    document.getElementById('detail-body').innerHTML = `
        <div class="history-tabs">
            <button class="history-tab active" data-tab="info">Info</button>
            <button class="history-tab" data-tab="history">History</button>
        </div>
        <div class="tab-content active" data-tab="info">
            ${renderInfo(item)}
        </div>
        <div class="tab-content" data-tab="history">
            ${renderHistory(relatedData)}
        </div>
    `;

    ModalManager.show('detail-modal');
    attachTabListeners();
}

function attachTabListeners() {
    document.querySelectorAll('.history-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            document.querySelectorAll('.history-tab').forEach(t =>
                t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c =>
                c.classList.remove('active'));
            this.classList.add('active');
            document.querySelector(`[data-tab="${tabName}"].tab-content`)
                .classList.add('active');
        });
    });
}
```

## Common Customizations

### Custom Colors/Branding
```css
:root {
    --color-primary: #your-brand-color;
    --color-primary-dark: #darker-shade;
    --color-primary-light: #lighter-shade;
}
```

### Custom Table Styles
```css
.datatable thead {
    background: var(--color-primary);
    color: white;
}

.datatable tbody tr:hover {
    background: var(--color-bg-light);
}
```

### Custom Modal Sizes
```html
<div id="large-modal" class="modal" style="max-width: 900px;">
```

## Important Notes

### MockupStore Search Behavior
⚠️ **IMPORTANT**: `store.search()` uses **EXACT MATCH** (===), not partial matching.
```javascript
// ✅ CORRECT - Exact match
calfStore.search('#H-1788', ['cattleId']); // Finds items where cattleId === '#H-1788'

// ❌ WRONG - Will NOT find partial matches
calfStore.search('H-1788', ['cattleId']); // Won't match '#H-1788-C1'
```

### Z-Index Layers
Modal stacking (highest on top):
- Form modals (cow, calf, work): `z-index: 100001`
- Detail modals: `z-index: 99999`
- Modal backdrop: `z-index: 99998`
- Dropdowns: `z-index: 1000`

### Session Storage
All MockupStore data is stored in `sessionStorage` and persists only for the browser session. Data is lost when tab/browser closes (perfect for demos).

## Testing Checklist

When creating a new mockup, verify:
- ✅ All CRUD operations work (Create, Read, Update, Delete)
- ✅ Modals open/close properly without scroll lock issues
- ✅ Pagination works correctly (controls show/hide appropriately)
- ✅ Filters apply correctly and reset properly
- ✅ Forms validate required fields
- ✅ Toast notifications appear and disappear
- ✅ Search uses exact match for related data
- ✅ Mobile responsive (test on small screens)
- ✅ No console errors

## Troubleshooting

### Modal appears behind content
- Check z-index values (see Z-Index Layers above)
- Ensure no parent has `overflow: hidden` creating stacking context

### Pagination shows wrong page count
- Verify pagination calculation: `Math.ceil(totalItems / itemsPerPage)`
- Check `renderPaginationControls()` is called after filtering

### Search returns wrong results
- Remember: `search()` uses exact match, not `.includes()`
- Use exact field values including prefixes (#, etc.)

### Data not persisting
- Check `MockupStore` name is unique per data type
- Remember: sessionStorage clears on browser close (intentional)

## Contributing to UI Kit

When you discover a useful pattern:
1. Test it thoroughly in your mockup
2. Extract the CSS/JS to UI Kit
3. Document it in FEATURES.md
4. Update CLAUDE.md if it changes patterns
5. All other projects can now use it!

## Reference Projects

**Cattle Tracker**: `/mnt/c/Users/7d.vision/Projects/7D Solutions/clients/besteman-land-cattle/cattle-tracker/`
- Complete example with:
  - Column customization
  - Pagination (table + card views)
  - Master-detail with tabs
  - Nested data (cow → calves → work history)
  - Filtering and sorting

**FireProof ERP**: `/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/`
- Original source for all patterns
- Check `/frontend/src/infrastructure/` for reference implementations

## Version History

- **v1.1** (Nov 2025): Added pagination feature and documentation
- **v1.0** (Nov 2025): Initial extraction from FireProof ERP

## Questions?

See detailed documentation:
- **FEATURES.md**: Complete implementation guides with code examples
- **README.md**: User-facing quick reference
- **starter-template.html**: Working example with all patterns

---

**Remember**: This UI Kit enables you to build production-quality mockups in minutes, not hours!
