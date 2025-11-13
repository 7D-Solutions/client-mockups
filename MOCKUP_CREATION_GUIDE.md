# 7D Solutions - Mockup Creation Guide

Complete guide for creating client mockups using the 7D Solutions UI Kit.

## 🎯 Overview

This system allows you to quickly create interactive mockups for client demonstrations. Each mockup:
- Uses the shared 7D Solutions UI Kit for consistent design
- Runs independently (isolated from other mockups)
- Deploys to Railway with its own URL
- Stores data in browser session (no database needed)
- Organized by client for easy management

## 📁 Project Structure

```
C:\Users\7d.vision\Projects\
├── 7D Solutions\                       ← MAIN FOLDER
│   ├── ui-kit\                         ← Shared design system
│   │   ├── css\
│   │   │   ├── tokens.css              ← Colors, spacing, typography
│   │   │   ├── reset.css               ← CSS reset
│   │   │   └── components.css          ← All UI components
│   │   ├── js\
│   │   │   └── mockup-core.js          ← Interactive utilities
│   │   ├── README.md
│   │   └── EXTRACTION_REPORT.md
│   ├── clients\                        ← All client mockups
│   │   ├── _template\                  ← Copy this for new mockups
│   │   │   ├── index.html
│   │   │   ├── package.json
│   │   │   └── README.md
│   │   ├── besteman-land-cattle\       ← Example client
│   │   │   └── cattle-tracker\         ← Their mockup
│   │   │       ├── index.html
│   │   │       ├── package.json
│   │   │       └── README.md
│   │   └── [new-client]\               ← Add new clients here
│   │       └── [their-mockup]\
│   └── MOCKUP_CREATION_GUIDE.md        ← This file
└── Fire-Proof-ERP-Sandbox\             ← Main ERP project
```

## 🚀 Creating a New Mockup (5-Minute Quickstart)

### Step 1: Create Client Folder

```bash
cd "C:\Users\7d.vision\Projects\7D Solutions\clients"
mkdir new-client-name
cd new-client-name
```

### Step 2: Copy the Template

```bash
cp -r ../_template mockup-name
cd mockup-name
```

**Example**:
```bash
cd "C:\Users\7d.vision\Projects\7D Solutions\clients"
mkdir acme-corp
cd acme-corp
cp -r ../_template inventory-system
cd inventory-system
```

### Step 3: Customize the HTML

Open `index.html` and update:

1. **Title & Branding**
```html
<title>Your App Name - 7D Solutions</title>
<div class="app-logo">🎯 Your App Name</div>
```

2. **Custom Colors (Optional)**
```css
<style>
  :root {
    --color-primary: #YOUR_BRAND_COLOR;
    --color-primary-dark: #DARKER_SHADE;
    --color-primary-light: #LIGHTER_SHADE;
  }
</style>
```

3. **Field Names**
- Change "Items" to your entity (e.g., "Customers", "Orders", "Inventory")
- Update table headers to match your data
- Modify form fields for your specific needs

### Step 4: Test Locally

1. Open `index.html` in a web browser
2. Add some data
3. Test all features (add, edit, delete, search)

### Step 5: Deploy to Railway

**Option A: GitHub + Railway (Recommended)**
1. Create GitHub repo for this mockup
2. Push code: `git init && git add . && git commit -m "Initial mockup" && git push`
3. In Railway: New Project → Deploy from GitHub
4. Done! Get your URL: `https://your-mockup-xxx.up.railway.app`

**Option B: Railway CLI**
```bash
npm install
railway login
railway init
railway up
```

### Step 6: Configure Custom Domain

In Railway Settings → Networking → Custom Domain:
- Add: `test.7dsolutions.com/client-name-mockup`
- Update DNS with Railway's CNAME

### Step 7: Share with Client

Send them: `test.7dsolutions.com/client-name-mockup`

## 🎨 Customization Guide

### Changing Colors/Branding

Each mockup can have its own color scheme:

```css
:root {
  --color-primary: #8B4513;        /* Your brand color */
  --color-primary-dark: #654321;   /* Darker shade */
  --color-primary-light: #A0522D;  /* Lighter shade */
}
```

**Popular Color Schemes:**
- **Professional Blue**: `#2c72d5`
- **Nature Green**: `#28a745`
- **Cattle Brown**: `#8B4513` (Besteman Land & Cattle)
- **Industrial Gray**: `#6c757d`
- **Energy Orange**: `#ff6b35`

### Adding Custom Fields

1. **Add to Form**
```html
<div class="form-group">
  <label class="form-label" for="your-field">Your Field *</label>
  <input type="text" class="form-control" id="your-field" name="yourField" required>
</div>
```

2. **Add to Table**
```javascript
const columns = [
  { field: 'yourField' },
  // ... other columns
];
```

3. **Add to View Modal**
```html
<div>
  <div class="text-muted">Your Field</div>
  <div id="view-your-field"></div>
</div>
```

```javascript
document.getElementById('view-your-field').textContent = item.yourField;
```

### Adding Statistics Dashboard

```html
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value" id="your-stat">0</div>
    <div class="stat-label">Your Metric</div>
  </div>
</div>
```

```javascript
function updateStats() {
  const items = store.getAll();
  document.getElementById('your-stat').textContent = items.filter(i => i.condition).length;
}
```

## 🔧 7D Solutions UI Kit Reference

### File Paths

From template: `../../ui-kit/`
From client mockup: `../../../ui-kit/`

```html
<!-- In _template/index.html -->
<link rel="stylesheet" href="../../ui-kit/css/tokens.css">
<link rel="stylesheet" href="../../ui-kit/css/reset.css">
<link rel="stylesheet" href="../../ui-kit/css/components.css">
<script src="../../ui-kit/js/mockup-core.js"></script>

<!-- In clients/client-name/mockup-name/index.html -->
<link rel="stylesheet" href="../../../ui-kit/css/tokens.css">
<link rel="stylesheet" href="../../../ui-kit/css/reset.css">
<link rel="stylesheet" href="../../../ui-kit/css/components.css">
<script src="../../../ui-kit/js/mockup-core.js"></script>
```

### Available CSS Classes

**Buttons:**
- `.btn` `.btn-primary` `.btn-secondary` `.btn-danger` `.btn-success`
- `.btn-sm` (smaller size)

**Forms:**
- `.form-group` (container)
- `.form-label` (labels)
- `.form-control` (inputs, selects, textareas)

**Tables:**
- `.table-container` (wrapper with shadow)
- `.table` (data table)

**Cards:**
- `.card` `.card-header` `.card-body` `.card-title`

**Badges:**
- `.badge` `.badge-success` `.badge-info` `.badge-warning` `.badge-danger` `.badge-secondary`

**Layout:**
- `.container` (centered content)
- `.page-header` `.page-title` `.page-actions`
- `.d-flex` `.justify-between` `.align-center` `.gap-3`

### Available JavaScript Utilities

**Data Storage:**
```javascript
const store = new MockupStore('your-store-name');
store.getAll()              // Get all items
store.getById(id)           // Get single item
store.add(data)             // Add new item
store.update(id, data)      // Update item
store.delete(id)            // Delete item
store.search(query, fields) // Search items
store.clear()               // Clear all data
```

**Modals:**
```javascript
ModalManager.show('modal-id')
ModalManager.hide('modal-id')
ModalManager.confirm('Message?', () => { /* callback */ })
```

**Notifications:**
```javascript
Toast.success('Success message')
Toast.error('Error message')
Toast.warning('Warning message')
Toast.info('Info message')
```

**Forms:**
```javascript
FormUtils.getFormData('form-id')       // Get form values as object
FormUtils.setFormData('form-id', data) // Populate form
FormUtils.clearForm('form-id')         // Reset form
FormUtils.validate('form-id')          // Check validity
```

**Tables:**
```javascript
TableRenderer.render('table-id', data, columns)
```

**Dates:**
```javascript
DateUtils.formatDate(dateString)     // Format as date
DateUtils.formatDateTime(dateString) // Format as date + time
DateUtils.getToday()                 // Get today's date (YYYY-MM-DD)
```

## 📋 Example Mockup Ideas

### Inventory Management
- Fields: SKU, name, quantity, location, reorder level
- Actions: Adjust stock, transfer, reorder
- Stats: Total items, low stock alerts, value

### Customer Management
- Fields: Name, email, phone, status, since date
- Actions: Contact, assign rep, mark inactive
- Stats: Total customers, active, new this month

### Order Tracking
- Fields: Order #, customer, total, status, date
- Actions: View details, update status, invoice
- Stats: Total orders, pending, completed, revenue

### Asset Tracking
- Fields: Asset tag, type, location, condition, value
- Actions: Check out, transfer, maintenance
- Stats: Total assets, in use, in maintenance

### Service Tickets
- Fields: Ticket #, customer, priority, status, assigned to
- Actions: Assign, update, resolve, escalate
- Stats: Open tickets, resolved today, average time

## 🚂 Railway Deployment Details

### Initial Setup

1. **Create package.json** (already included in template)
```json
{
  "name": "client-mockup-name",
  "version": "1.0.0",
  "scripts": {
    "start": "npx serve . -p $PORT"
  },
  "dependencies": {
    "serve": "^14.2.1"
  }
}
```

2. **Deploy**
   - Railway auto-detects Node.js project
   - Runs `npm install && npm start`
   - Serves static files on dynamic port

3. **Custom Domain** (Optional)
   - Railway Settings → Networking → Custom Domain
   - Add: `client-name.test.7dsolutions.com`
   - Update DNS with Railway's CNAME

### Cost Estimate

- Simple mockup: **~$0.01 - $0.10/month**
- Only charged when accessed
- Hobby plan includes $5/month credit

## 🔄 Updating the UI Kit

When you discover improvements while building mockups:

1. **Update ui-kit files**
   ```bash
   cd "C:\Users\7d.vision\Projects\7D Solutions\ui-kit"
   # Edit css/components.css or js/mockup-core.js
   ```

2. **All mockups automatically benefit**
   - They link to the same kit files
   - Redeploy mockup to pick up changes

3. **Version control**
   - Consider versioning the UI kit
   - Document changes in `ui-kit/README.md`

## 💡 Best Practices

### DO:
✅ Keep mockups simple and focused
✅ Use session storage (no backend complexity)
✅ Test on mobile devices
✅ Include realistic sample data
✅ Organize by client name
✅ Document custom features in mockup README

### DON'T:
❌ Over-engineer mockups (keep it simple)
❌ Mix multiple apps in one mockup
❌ Hardcode client data (session only)
❌ Skip testing before sharing with client
❌ Create loose folders in Projects root

## 🗂️ Organization Tips

### Multiple Mockups for One Client

```
clients/
└── acme-corp/
    ├── inventory-system/
    ├── order-tracking/
    └── customer-portal/
```

### Archive Old Mockups

```
clients/
├── _archive/
│   └── old-client/
│       └── deprecated-mockup/
└── active-client/
    └── current-mockup/
```

## 🆘 Troubleshooting

### Mockup not loading
- Check browser console for errors
- Verify paths to ui-kit files (../../ or ../../../)
- Ensure `mockup-core.js` loads before your scripts

### Data not persisting
- Expected! Session storage clears on browser close
- This is a feature for clean demos

### Railway deployment fails
- Check `package.json` is present
- Verify `serve` is in dependencies
- Check Railway logs for errors

### UI looks broken
- Verify all 3 CSS files are linked
- Check for CSS syntax errors in custom styles
- Clear browser cache
- Verify correct path depth to ui-kit

### Wrong path to UI kit
Template is 2 levels deep: `../../ui-kit/`
Client mockup is 3 levels deep: `../../../ui-kit/`

## 📞 Support

For help with mockups:
- Check existing mockups for examples (`besteman-land-cattle/cattle-tracker`)
- Review `ui-kit/README.md`
- Review `ui-kit/EXTRACTION_REPORT.md`
- Test locally before deploying

---

**Happy Mockup Building! 🚀**

*Last Updated: November 2024*
*7D Solutions - Professional Mockup System*
