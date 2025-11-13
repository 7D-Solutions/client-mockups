# UI Kit Features

Advanced features extracted from FireProof ERP for use in mockups.

## Table of Contents
- [Column Customization](#column-customization)

---

## Column Customization

**Source**: FireProof ERP - Gauge Management
**Extracted**: November 2025
**Status**: Production-Ready

### Overview

Column customization allows users to:
- Show/hide columns via checkboxes
- Reorder columns via drag-and-drop
- Reset columns to default configuration
- Persist preferences in session storage

### Visual Design

**Edit Mode ON:**
```
┌─────────────────────────────────────────────────┐
│ ⚙️ ✓ Done Editing [EDIT MODE]  Reset Columns   │
└─────────────────────────────────────────────────┘
┌────────────────────────────────────────────────┐
│ ⋮⋮ [✓] Show   │ ⋮⋮ [✓] Show   │ [ ] Show      │
│    Tag ID      │    Breed       │   Weight      │
└────────────────────────────────────────────────┘
```

**Edit Mode OFF:**
```
┌─────────────────────────────────────────────────┐
│ ⚙️ Edit Columns                                 │
└─────────────────────────────────────────────────┘
┌────────────────────────────────────────────────┐
│ Tag ID         │ Breed          │               │
└────────────────────────────────────────────────┘
```

### Implementation

#### 1. Data Structure

```javascript
// Default column configuration
const defaultColumns = [
    { id: 'tagId', label: 'Tag ID', visible: true, locked: true },
    { id: 'breed', label: 'Breed', visible: true },
    { id: 'age', label: 'Age', visible: true },
    { id: 'weight', label: 'Weight', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'actions', label: 'Actions', visible: true }
];

// Working copy (modified by user)
let columns = [...defaultColumns];

// Edit mode state
let isEditMode = false;

// Drag state
let draggedColumnIndex = null;
let dragOverColumnIndex = null;
```

#### 2. Session Storage

```javascript
// Load preferences from session storage
function loadColumnPreferences() {
    const saved = sessionStorage.getItem('cattle-columns');
    if (saved) {
        try {
            const savedCols = JSON.parse(saved);
            // Merge with defaults to handle any new columns
            columns = defaultColumns.map(def => {
                const saved = savedCols.find(s => s.id === def.id);
                return saved ? { ...def, ...saved } : def;
            });
        } catch (e) {
            console.error('Failed to load column preferences:', e);
        }
    }
}

// Save preferences to session storage
function saveColumnPreferences() {
    sessionStorage.setItem('cattle-columns', JSON.stringify(columns));
}

// Call on page load
loadColumnPreferences();
```

#### 3. HTML Structure

```html
<!-- Toolbar with buttons -->
<div class="datatable-toolbar">
    <div class="toolbar-left">
        <span class="record-count">Showing <strong>21</strong> items</span>
    </div>
    <div style="display: flex; gap: 12px; align-items: center;">
        <button class="btn btn-secondary" onclick="toggleEditMode()" id="edit-columns-btn">
            ⚙️ Edit Columns
        </button>
        <button class="btn btn-secondary" onclick="resetColumns()" id="reset-columns-btn" style="display: none;">
            Reset Columns
        </button>
    </div>
</div>

<!-- Table (headers are rendered dynamically) -->
<table id="data-table">
    <thead>
        <tr id="table-header">
            <!-- Dynamically rendered -->
        </tr>
    </thead>
    <tbody id="table-body">
        <!-- Dynamically rendered -->
    </tbody>
</table>
```

#### 4. CSS Styles

```css
/* Edit mode styling */
.table-edit-mode th {
    position: relative;
    padding-top: 50px !important;
}

.table-edit-mode th.sortable {
    cursor: move;
}

/* Checkbox above columns */
.column-checkbox-wrapper {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.column-checkbox-label {
    font-size: 11px;
    color: var(--color-text-light);
    font-weight: normal;
}

/* Drag handle */
.drag-handle {
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
    color: var(--color-text-light);
    cursor: move;
    opacity: 0.4;
    transition: opacity 0.2s;
}

.table-edit-mode th:hover .drag-handle {
    opacity: 0.8;
}

/* Drag visual feedback */
.dragging {
    opacity: 0.5;
    background: var(--color-bg-light) !important;
}

.drag-over {
    border-left: 3px solid var(--color-primary) !important;
}

/* Edit mode badge */
.edit-mode-badge {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    background: var(--color-warning);
    color: white;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
}
```

#### 5. Core Functions

```javascript
// Toggle edit mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    const table = document.getElementById('data-table');
    const btn = document.getElementById('edit-columns-btn');
    const resetBtn = document.getElementById('reset-columns-btn');

    if (isEditMode) {
        table.classList.add('table-edit-mode');
        btn.innerHTML = '✓ Done Editing<span class="edit-mode-badge">EDIT MODE</span>';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        resetBtn.style.display = 'inline-block';
    } else {
        table.classList.remove('table-edit-mode');
        btn.innerHTML = '⚙️ Edit Columns';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        resetBtn.style.display = 'none';
    }

    renderTable();
}

// Reset columns to default
function resetColumns() {
    columns = defaultColumns.map(col => ({ ...col }));
    saveColumnPreferences();
    renderTable();
    Toast.success('Columns reset to default');
}

// Toggle column visibility
function toggleColumnVisibility(columnId) {
    const column = columns.find(c => c.id === columnId);
    if (column && !column.locked) {
        column.visible = !column.visible;
        saveColumnPreferences();
        renderTable();
    }
}

// Drag and drop handlers
function handleDragStart(e, index) {
    draggedColumnIndex = index;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const th = e.currentTarget;
    document.querySelectorAll('th').forEach(header => {
        header.classList.remove('drag-over');
    });
    if (draggedColumnIndex !== index) {
        th.classList.add('drag-over');
        dragOverColumnIndex = index;
    }
    return false;
}

function handleDrop(e, index) {
    e.stopPropagation();
    e.preventDefault();
    if (draggedColumnIndex !== index && draggedColumnIndex !== null) {
        const draggedCol = columns[draggedColumnIndex];
        const newColumns = [...columns];
        newColumns.splice(draggedColumnIndex, 1);
        newColumns.splice(index, 0, draggedCol);
        columns = newColumns;
        saveColumnPreferences();
        renderTable();
    }
    return false;
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('th').forEach(header => {
        header.classList.remove('drag-over');
    });
    draggedColumnIndex = null;
    dragOverColumnIndex = null;
}
```

#### 6. Dynamic Table Rendering

```javascript
function renderTableHeaders() {
    const thead = document.getElementById('table-header');
    let html = '';

    columns.forEach((col, index) => {
        // In edit mode, show ALL columns (including hidden ones)
        // In normal mode, show only visible columns
        if (isEditMode || col.visible) {
            // Drag attributes for edit mode
            const draggable = isEditMode && !col.locked ? 'draggable="true"' : '';
            const dragHandlers = isEditMode && !col.locked ?
                `ondragstart="handleDragStart(event, ${index})"
                 ondragover="handleDragOver(event, ${index})"
                 ondrop="handleDrop(event, ${index})"
                 ondragend="handleDragEnd(event)"` : '';

            // Checkbox in edit mode (only for unlocked columns)
            const checkbox = isEditMode && !col.locked ? `
                <div class="column-checkbox-wrapper">
                    <input
                        type="checkbox"
                        ${col.visible ? 'checked' : ''}
                        onchange="toggleColumnVisibility('${col.id}')"
                        onclick="event.stopPropagation()"
                    >
                    <span class="column-checkbox-label">Show</span>
                </div>
            ` : '';

            // Drag handle in edit mode (only for unlocked columns)
            const dragHandle = isEditMode && !col.locked ? '<span class="drag-handle">⋮⋮</span>' : '';

            html += `<th ${draggable} ${dragHandlers} data-column-id="${col.id}">
                ${dragHandle}
                ${checkbox}
                ${col.label}
            </th>`;
        }
    });

    thead.innerHTML = html;
}

function renderTableBody(data) {
    const tbody = document.getElementById('table-body');
    let html = '';

    data.forEach(item => {
        html += '<tr>';
        columns.forEach(col => {
            // In edit mode, show ALL columns. In normal mode, show only visible columns
            if (isEditMode || col.visible) {
                html += `<td>${item[col.id] || '—'}</td>`;
            }
        });
        html += '</tr>';
    });

    tbody.innerHTML = html;
}

function renderTable() {
    renderTableHeaders();
    renderTableBody(yourDataArray);
}
```

### Key Features

✅ **Show/Hide Columns**: Checkboxes above each column header
✅ **Drag-and-Drop Reordering**: Move columns by dragging column headers
✅ **Locked Columns**: Tag ID and Actions cannot be hidden or moved
✅ **Session Persistence**: Preferences saved to session storage
✅ **Reset to Default**: One-click restore of original configuration
✅ **Visual Feedback**: Drag handles (⋮⋮), edit mode badge, dragging states
✅ **Edit Mode Toggle**: Clean switch between normal and edit modes

### Usage in New Mockups

1. Copy the defaultColumns structure
2. Copy all CSS from the cattle-tracker example
3. Copy the 8 core functions (toggleEditMode, resetColumns, etc.)
4. Copy the HTML toolbar structure
5. Update renderTableHeaders() and renderTableBody() to use your data
6. Call loadColumnPreferences() on page load

### FireProof ERP Reference

**Source File**: `/frontend/src/infrastructure/hooks/useColumnManager.ts`
**Component**: `/frontend/src/infrastructure/components/DataTable.tsx`
**Lines**: 236-255 (resetToDefault), 402-418 (Reset button UI)

---

## Pagination

**Source**: FireProof ERP - Infrastructure Components
**Extracted**: November 2025
**Status**: Production-Ready

### Overview

Smart pagination component with dynamic page number display, configurable items per page, and automatic hiding when only one page exists.

### Visual Design

**Multiple Pages:**
```
┌─────────────────────────────────────────────────────┐
│ Showing 11-20 of 45 cows                            │
│                                                      │
│ « 1  2  [3]  4  5  »                                │
└─────────────────────────────────────────────────────┘
```

**Single Page (auto-hidden):**
```
┌─────────────────────────────────────────────────────┐
│ Showing 1-21 of 21 cows                             │
│                                                      │
│ (no pagination controls shown)                      │
└─────────────────────────────────────────────────────┘
```

### Implementation

#### 1. Pagination State

```javascript
// Pagination state variables
let currentPage = 1;
let itemsPerPage = 10; // Default: 10 items per page

// Calculate pagination
const totalItems = data.length;
const totalPages = Math.ceil(totalItems / itemsPerPage);

// Validate current page
if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
}
if (currentPage < 1) {
    currentPage = 1;
}

// Get paginated slice
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
const paginatedData = data.slice(startIndex, endIndex);
```

#### 2. HTML Structure

```html
<div class="pagination">
    <div class="pagination-info">
        Showing <span id="pagination-info">0-0 of 0</span> items
    </div>
    <div class="pagination-controls">
        <!-- Rendered dynamically by renderPaginationControls() -->
    </div>
</div>
```

#### 3. Render Function

```javascript
function renderPaginationControls(totalPages) {
    const paginationControls = document.querySelector('.pagination-controls');

    // Auto-hide if only one page
    if (totalPages <= 1) {
        paginationControls.style.display = 'none';
        return;
    }

    paginationControls.style.display = 'flex';

    // Generate page numbers (max 7 visible)
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 7;

        if (totalPages <= maxVisible) {
            // Show all pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first, last, and pages around current
            pages.push(1);
            let start = Math.max(2, currentPage - 2);
            let end = Math.min(totalPages - 1, currentPage + 2);

            if (start > 2) pages.push('...');

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages - 1) pages.push('...');
            if (totalPages > 1) pages.push(totalPages);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();
    let html = '';

    // Previous button
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})"
             ${currentPage === 1 ? 'disabled' : ''}>«</button>`;

    // Page numbers
    pageNumbers.forEach(page => {
        if (page === '...') {
            html += `<span style="padding: 0 12px; display: flex; align-items: center;
                     color: var(--color-text-light);">...</span>`;
        } else {
            html += `<button class="page-btn ${page === currentPage ? 'active' : ''}"
                     onclick="goToPage(${page})" ${page === currentPage ? 'disabled' : ''}>${page}</button>`;
        }
    });

    // Next button
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})"
             ${currentPage === totalPages ? 'disabled' : ''}>»</button>`;

    paginationControls.innerHTML = html;
}

// Navigate to page
function goToPage(page) {
    currentPage = page;
    renderData(); // Re-render with new page
}
```

#### 4. Usage in Render Functions

```javascript
function renderTable() {
    let data = getFilteredData();

    // Apply sorting
    if (currentSort.field) {
        data = sortData(data, currentSort.field, currentSort.direction);
    }

    // Calculate pagination
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Get paginated slice
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedData = data.slice(startIndex, endIndex);

    // Update info text
    const startItem = totalItems > 0 ? startIndex + 1 : 0;
    document.getElementById('pagination-info').textContent =
        `${startItem}-${endIndex} of ${totalItems}`;

    // Render pagination controls
    renderPaginationControls(totalPages);

    // Render paginated data
    renderRows(paginatedData);
}
```

### Key Features

✅ **Dynamic Page Numbers**: Shows max 7 page buttons with ellipsis for large datasets
✅ **Auto-Hide**: Pagination controls hidden when only 1 page exists
✅ **Smart Navigation**: Previous/Next buttons with proper disabled states
✅ **Page Validation**: Automatically corrects invalid page numbers
✅ **Filtered Data Support**: Works seamlessly with filtering and sorting
✅ **Configurable Page Size**: Adjustable `itemsPerPage` constant
✅ **Info Display**: Shows "X-Y of Z items" for user awareness

### Configuration Options

```javascript
// Adjust items per page
let itemsPerPage = 25; // Default: 10

// Common values: 10, 25, 50, 100
```

### FireProof ERP Reference

**Source Component**: `/frontend/src/infrastructure/components/Pagination.tsx`
**Hook**: `/frontend/src/infrastructure/hooks/usePagination.ts`
**Constants**: `/frontend/src/infrastructure/constants/pagination.ts`
**Lines**: 23-125 (component), 72-73 (offset calculation)

### Usage in New Mockups

1. Copy pagination state variables (`currentPage`, `itemsPerPage`)
2. Add pagination calculation logic to render functions
3. Copy `renderPaginationControls()` and `goToPage()` functions
4. Copy pagination HTML structure
5. Update info text with current page range
6. Call `renderPaginationControls(totalPages)` after calculating pages

---

## Future Features to Add

- [ ] Export to CSV/Excel
- [ ] Advanced filtering
- [ ] Bulk actions
- [ ] Inline editing
- [ ] Column width resizing
