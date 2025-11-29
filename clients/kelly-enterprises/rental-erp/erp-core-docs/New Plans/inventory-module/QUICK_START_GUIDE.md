# Inventory Module - Quick Start Guide

**Date**: 2025-10-30
**Status**: Ready for Use

---

## Accessing the Inventory Module

### Step 1: Log Out and Log Back In
⚠️ **IMPORTANT**: Since inventory permissions were just added, you must re-authenticate to get the new permissions.

1. Click your user menu (top right)
2. Click "Logout"
3. Log back in with your credentials

### Step 2: Navigate to Inventory
After logging back in, you should see the **Inventory** menu item in the main navigation:

```
📋 Navigation Menu:
├── Gauge Management
│   ├── Gauge List
│   └── Pending QC
├── Admin
│   └── User Management
└── 📦 Inventory (NEW!)
    ├── Dashboard
    └── Movement History
```

### Step 3: Explore the Dashboard
Click **Inventory** → **Dashboard** to see:
- Total items in inventory
- Number of storage locations
- Breakdown by item type (gauges, tools, parts)
- List of all storage locations with item counts
- Search functionality

---

## Navigation Routes

### Available Pages:
1. **Dashboard**: `/inventory`
   - Overview of all inventory locations and statistics
   - Search and filter locations
   - Click location to view details

2. **Location Details**: `/inventory/location/:locationCode`
   - Detailed view of items in specific location
   - Separate tables for gauges, tools, parts
   - Last moved timestamps

3. **Movement History**: `/inventory/movements`
   - Complete audit trail of all movements
   - Filter by item type (gauge, tool, part, equipment, material)
   - Filter by movement type (created, transfer, deleted)
   - Shows from → to locations with user information

---

## Permission Levels

### View Permission (`inventory.view.access`)
**Who has it**: All active users (18 users)

**Can do**:
- ✅ View inventory dashboard
- ✅ View storage locations
- ✅ View movement history
- ✅ Search inventory
- ❌ Cannot move items
- ❌ Cannot delete items

### Management Permission (`inventory.manage.full`)
**Who has it**: Admin users (admin@fireprooferp.com, james@7dmanufacturing.com, test@test.com)

**Can do**:
- ✅ Everything in View permission
- ✅ Move items between locations
- ✅ Remove items from inventory
- ✅ Perform bulk operations

---

## Troubleshooting

### "I don't see the Inventory menu"
**Solution**: Log out and log back in to refresh your permissions.

### "Access Denied" message
**Cause**: You don't have `inventory.view.access` permission.
**Solution**: Contact your administrator to request inventory access.

### "403 Forbidden" on API requests
**Cause**: Your current permission level doesn't allow this operation.
- View-only users cannot perform POST/DELETE operations
- Only users with `inventory.manage.full` can move/delete items

---

## Current Inventory Data

Since the inventory system is new, you'll initially see:
- Gauges that were created or returned **after** the inventory system was deployed
- Empty locations until items are moved
- Movement history only for items tracked by the system

**Legacy Data**: Gauges created before the inventory system may show in the gauge list but won't have inventory tracking. These will show `storage_location` from the gauge record.

---

## Testing the System

### Quick Test (View Permission):
1. Log in and navigate to `/inventory`
2. Verify you can see the dashboard
3. Click a location to view details
4. Navigate to Movement History

### Admin Test (Management Permission):
1. Log in as admin user
2. Navigate to `/inventory`
3. Verify you can see all pages
4. Test moving an item (API: POST /api/inventory/move)

### Permission Test:
1. Remove inventory permissions from a test user
2. Log in as that user
3. Attempt to access `/inventory`
4. Verify "Access Denied" message appears

---

## Next Steps

### For Users:
1. Log out and log back in
2. Explore the inventory dashboard
3. Report any issues or suggestions

### For Administrators:
1. Verify all users can access the inventory module
2. Assign `inventory.manage.full` to users who need management access
3. Monitor usage and audit trail
4. Plan data migration for legacy gauges if needed

---

## Support

For questions or issues with the inventory module:
1. Check this guide first
2. Review IMPLEMENTATION_PROGRESS.md for technical details
3. Check PERMISSION_SYSTEM_VERIFICATION.md for permission issues
4. Contact development team for bugs or feature requests

---

**Quick Access URLs**:
- Dashboard: http://localhost:3001/inventory
- Movement History: http://localhost:3001/inventory/movements
- Location Detail: http://localhost:3001/inventory/location/{locationCode}
