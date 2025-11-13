# Quick Start Guide - Spin Up a New Application in 5 Minutes

This guide walks you through creating a new mockup/application using the 7D Solutions UI Kit.

## Step 1: Create Project Structure (1 minute)

```bash
# Navigate to clients directory
cd "/mnt/c/Users/7d.vision/Projects/7D Solutions/clients"

# Create your project folders
mkdir -p your-client-name/app-name
cd your-client-name/app-name

# Copy starter template
cp ../../ui-kit/templates/starter-template.html index.html
```

## Step 2: Customize Basic Information (1 minute)

Open `index.html` and update:

```html
<!-- Change title -->
<title>Your App Name - 7D Solutions</title>

<!-- Change page header -->
<h1 class="page-title">📊 Your App Name</h1>

<!-- Change button text -->
<button class="btn btn-primary" onclick="showModal('add-modal')">➕ Add New Record</button>
```

## Step 3: Define Your Data Model (1 minute)

Update the `MockupStore` initialization:

```javascript
// Change store name to match your domain
const dataStore = new MockupStore('your-records');

// Update sample data structure
if (dataStore.getAll().length === 0) {
    const sampleData = [
        {
            name: 'Sample Record 1',
            category: 'Category A',
            status: 'active',
            date: '2025-01-15',
            amount: 1500
        },
        {
            name: 'Sample Record 2',
            category: 'Category B',
            status: 'pending',
            date: '2025-01-16',
            amount: 2300
        },
    ];
    sampleData.forEach(item => dataStore.add(item));
}
```

## Step 4: Customize Table Columns (1 minute)

Update the table header and body rendering:

```html
<!-- Update table headers -->
<thead>
    <tr>
        <th>Name</th>
        <th>Category</th>
        <th>Status</th>
        <th>Amount</th>
        <th>Date</th>
        <th>Actions</th>
    </tr>
</thead>
```

```javascript
// Update table body rendering in renderTable()
html += `
    <tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td><span class="badge badge-${item.status === 'active' ? 'success' : 'warning'}">${item.status}</span></td>
        <td>$${item.amount.toLocaleString()}</td>
        <td>${item.date}</td>
        <td>
            <button class="btn btn-sm btn-secondary" onclick="editItem('${item.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteItem('${item.id}')">Delete</button>
        </td>
    </tr>
`;
```

## Step 5: Customize Form Fields (1 minute)

Update the modal form to match your data model:

```html
<form id="item-form" onsubmit="saveItem(event)">
    <div class="form-group">
        <label class="form-label">Name *</label>
        <input type="text" class="form-control" id="item-name" required>
    </div>

    <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-control" id="item-category">
            <option value="Category A">Category A</option>
            <option value="Category B">Category B</option>
            <option value="Category C">Category C</option>
        </select>
    </div>

    <div class="form-group">
        <label class="form-label">Amount</label>
        <input type="number" class="form-control" id="item-amount" step="0.01">
    </div>

    <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="item-status">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
        </select>
    </div>

    <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" class="form-control" id="item-date">
    </div>
</form>
```

Update the `saveItem()` function:

```javascript
function saveItem(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('item-name').value,
        category: document.getElementById('item-category').value,
        amount: parseFloat(document.getElementById('item-amount').value),
        status: document.getElementById('item-status').value,
        date: document.getElementById('item-date').value
    };

    dataStore.add(data);
    closeModal('add-modal');
    renderTable();
    Toast.success('Record saved successfully!');
}
```

## Step 6: Test Your Application

1. Open `index.html` in your browser
2. Test CRUD operations:
   - Click "Add New Record" → Fill form → Save
   - Click "Edit" on a row → Modify → Save
   - Click "Delete" on a row → Confirm
3. Test pagination:
   - Add more records to see pagination appear
   - Navigate between pages
4. Test filters (if you added them)

## Done! 🎉

You now have a fully functional application with:
- ✅ Data table with pagination
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Modal forms
- ✅ Toast notifications
- ✅ Session storage (data persists during session)
- ✅ Mobile responsive design

## Common Next Steps

### Add Filtering

```html
<!-- Add filter bar before datatable-container -->
<div class="filter-bar">
    <div class="filter-group">
        <label>Search</label>
        <input type="text" class="form-control" id="search-input" placeholder="Search..." onkeyup="applyFilters()">
    </div>
    <div class="filter-group">
        <label>Category</label>
        <select class="form-control" id="category-filter" onchange="applyFilters()">
            <option value="">All</option>
            <option value="Category A">Category A</option>
            <option value="Category B">Category B</option>
        </select>
    </div>
    <button class="btn btn-secondary" onclick="clearFilters()">Clear</button>
</div>
```

```javascript
function applyFilters() {
    let items = dataStore.getAll();

    const search = document.getElementById('search-input').value.toLowerCase();
    if (search) {
        items = items.filter(item =>
            item.name.toLowerCase().includes(search)
        );
    }

    const category = document.getElementById('category-filter').value;
    if (category) {
        items = items.filter(item => item.category === category);
    }

    renderTable(items);
}
```

### Add Sorting

```javascript
let currentSort = { field: null, direction: 'asc' };

function sortTable(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    renderTable();
}

// In renderTable(), before pagination:
if (currentSort.field) {
    items.sort((a, b) => {
        const aVal = a[currentSort.field];
        const bVal = b[currentSort.field];
        const multiplier = currentSort.direction === 'asc' ? 1 : -1;
        return aVal > bVal ? multiplier : -multiplier;
    });
}

// Update table headers:
<th onclick="sortTable('name')">Name ↕</th>
```

### Add Export to CSV

```javascript
function exportData() {
    const items = dataStore.getAll();
    const csv = [
        ['Name', 'Category', 'Status', 'Amount', 'Date'],
        ...items.map(item => [
            item.name,
            item.category,
            item.status,
            item.amount,
            item.date
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-export.csv';
    a.click();

    Toast.success('Exported successfully!');
}
```

### Add Card View (Alternative to Table)

See the Cattle Tracker project for a complete example of implementing card view with view toggle.

## Need More?

- **Complex Features**: See `FEATURES.md` for column customization, master-detail patterns, tabs
- **Code Examples**: Check the Cattle Tracker project
- **AI Assistant Help**: See `CLAUDE.md` for detailed patterns and troubleshooting
- **Styling**: Customize CSS variables in `<style>` section of your HTML

## Tips for Success

1. **Start Simple**: Get basic CRUD working first, then add features
2. **Test Often**: Open in browser frequently to catch issues early
3. **Use Toast**: Add Toast notifications for user feedback on all actions
4. **Mobile First**: Test on small screens - components are already responsive
5. **Session Storage**: Data clears on browser close - perfect for demos
6. **Extract Patterns**: If you build something useful, add it to the UI Kit!

---

**Questions?** Reference the comprehensive documentation:
- `README.md` - Component reference
- `FEATURES.md` - Detailed implementation guides
- `CLAUDE.md` - AI assistant context and patterns
