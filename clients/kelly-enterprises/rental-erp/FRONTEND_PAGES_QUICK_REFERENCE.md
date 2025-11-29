# Frontend Pages - Quick Reference

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Files | 55 |
| Active Routed Pages | 23 (modules) + 4 (test) = 27 |
| Unlinked Pages | 1 (ComponentShowcase.tsx) |
| Deprecated .old Files | 11 |
| Lines of Code (Pages) | ~5,200 |

---

## Unlinked/Unrouted Pages

### ComponentShowcase.tsx
- **Location**: `/frontend/src/pages/ComponentShowcase.tsx`
- **Lines**: 240
- **Status**: NOT ROUTED
- **Action Needed**: Route it or delete it
- **CSS**: ✅ Exists at `frontend/src/tests/demo-pages/ComponentShowcase.module.css`

---

## Deprecated Files (Move to /review-for-delete/)

### Gauge Module (2 files)
```
frontend/src/modules/gauge/pages/GaugeList.old.tsx (269 lines)
frontend/src/modules/gauge/pages/MyGauges.old.tsx (233 lines)
```

### Admin Module (7 files)
```
frontend/src/modules/admin/pages/UserManagement.old.tsx
frontend/src/modules/admin/pages/RoleManagement.old.tsx
frontend/src/modules/admin/pages/AuditLogs.old.tsx
frontend/src/modules/admin/pages/GaugeManagement.old.tsx
frontend/src/modules/admin/pages/FacilityManagementPage.old.tsx
frontend/src/modules/admin/pages/BuildingManagementPage.old.tsx
frontend/src/modules/admin/pages/ZoneManagementPage.old.tsx
```

### Inventory Module (2 files)
```
frontend/src/modules/inventory/pages/StorageLocationsPage.old.tsx (514 lines)
frontend/src/modules/inventory/pages/LocationDetailPage.old.tsx (473 lines)
```

**Command to move all at once**:
```bash
mkdir -p review-for-delete/frontend/pages-deprecated
mv frontend/src/modules/*/pages/*.old.tsx review-for-delete/frontend/pages-deprecated/
```

---

## All Active Routes

### Gauge Module (8 routes)
- `/gauges/` → GaugeList
- `/gauges/list` → GaugeList
- `/gauges/my-gauges` → MyGauges
- `/gauges/qc` → QCPage
- `/gauges/sets/:setId` → SetDetailsPage
- `/gauges/calibration-management` → CalibrationManagementPage
- `/gauges/returned-customer-gauges` → ReturnedCustomerGaugesPage
- `/gauges/spare-inventory` → SpareInventoryPage
- `/gauges/create` → CreateGaugePage

### Admin Module (9 routes)
- `/admin/` → AdminDashboard
- `/admin/dashboard` → AdminDashboard
- `/admin/users` → UserManagement
- `/admin/roles` → RoleManagement
- `/admin/settings` → SystemSettings
- `/admin/audit` → AuditLogs
- `/admin/gauges` → GaugeManagement
- `/admin/facilities` → FacilityManagementPage
- `/admin/buildings` → BuildingManagementPage
- `/admin/zones` → ZoneManagementPage

### Inventory Module (4 routes)
- `/inventory/` → InventoryDashboard
- `/inventory/locations` → StorageLocationsPage
- `/inventory/location/:locationCode` → LocationDetailPage
- `/inventory/movements` → MovementHistoryPage

### User Module (2 routes)
- `/user/` → UserProfile
- `/user/profile` → UserProfile
- `/user/settings` → UserSettings

### Test Routes (4 routes - Remove before production)
- `/test/buttons` → ButtonTest
- `/test/css` → CSSTest
- `/test/error-boundary` → ErrorBoundaryTest
- `/test/icons` → IconTest

### Root Shortcuts
- `/` → Redirects to `/gauges/list`
- `/dashboard` → Redirects to `/gauges/my-gauges`
- `*` (catch-all) → Redirects to `/gauges/list`

---

## Files to Review

### Unrouted
```
❌ /frontend/src/pages/ComponentShowcase.tsx (240 lines)
   Decision: Route it or move to review-for-delete
```

### Deprecated (untracked, git status: ??)
```
⚠️  11 .old.tsx files across 3 modules
    Recommendation: Move all to review-for-delete
```

### Test Routes
```
⚠️  4 test routes under /test/ namespace
    Status: Should be removed or guarded before production
```

---

## Routing Architecture

### Main Router (App.tsx)
- 11 routes defined
- Module routes imported and integrated
- Error boundaries wrap module routes
- QueryClient configured for React Query
- Toast container for notifications

### Module Routes Pattern
Each module (gauge, admin, inventory, user) has:
- `routes.tsx` - Route definitions
- `pages/` directory - Page components
- `pages/index.ts` - Exports all pages

### Consistency Check
✅ All modules follow same structure
✅ All pages properly exported
✅ All routes properly defined
✅ No circular dependencies

---

## Quick Cleanup Script

To move deprecated .old files:
```bash
#!/bin/bash
cd /mnt/c/users/7d.vision/projects/fire-proof-erp-sandbox

# Create destination directory
mkdir -p review-for-delete/frontend/deprecated-pages

# Move all .old.tsx files
for file in frontend/src/modules/*/pages/*.old.tsx; do
    if [ -f "$file" ]; then
        mv "$file" review-for-delete/frontend/deprecated-pages/
        echo "Moved $(basename $file)"
    fi
done

echo "Cleanup complete"
```

---

## Production Checklist

Before deploying to production:
- [ ] Remove or guard all `/test/*` routes
- [ ] Decide on ComponentShowcase: route it or delete it
- [ ] Remove deprecated .old files
- [ ] Verify all module pages are routed
- [ ] Test all routes work correctly
- [ ] Remove test imports from App.tsx if deleting test pages

---

## File Paths Reference

### Active Module Page Files (23 total)

Gauge (8):
- `/frontend/src/modules/gauge/pages/GaugeList.tsx`
- `/frontend/src/modules/gauge/pages/MyGauges.tsx`
- `/frontend/src/modules/gauge/pages/QCPage.tsx`
- `/frontend/src/modules/gauge/pages/SetDetailsPage.tsx`
- `/frontend/src/modules/gauge/pages/CalibrationManagementPage.tsx`
- `/frontend/src/modules/gauge/pages/ReturnedCustomerGaugesPage.tsx`
- `/frontend/src/modules/gauge/pages/SpareInventoryPage.tsx`
- `/frontend/src/modules/gauge/pages/CreateGaugePage.tsx`

Admin (9):
- `/frontend/src/modules/admin/pages/AdminDashboard.tsx`
- `/frontend/src/modules/admin/pages/UserManagement.tsx`
- `/frontend/src/modules/admin/pages/RoleManagement.tsx`
- `/frontend/src/modules/admin/pages/SystemSettings.tsx`
- `/frontend/src/modules/admin/pages/AuditLogs.tsx`
- `/frontend/src/modules/admin/pages/GaugeManagement.tsx`
- `/frontend/src/modules/admin/pages/FacilityManagementPage.tsx`
- `/frontend/src/modules/admin/pages/BuildingManagementPage.tsx`
- `/frontend/src/modules/admin/pages/ZoneManagementPage.tsx`

Inventory (4):
- `/frontend/src/modules/inventory/pages/InventoryDashboard.tsx`
- `/frontend/src/modules/inventory/pages/StorageLocationsPage.tsx`
- `/frontend/src/modules/inventory/pages/LocationDetailPage.tsx`
- `/frontend/src/modules/inventory/pages/MovementHistoryPage.tsx`

User (2):
- `/frontend/src/modules/user/pages/UserProfile.tsx`
- `/frontend/src/modules/user/pages/UserSettings.tsx`

### Test Page Files (5 total)
- `/frontend/src/pages/ButtonTest.tsx` (202 lines) ✅
- `/frontend/src/pages/CSSTest.tsx` (16 lines) ✅
- `/frontend/src/pages/ErrorBoundaryTest.tsx` (80 lines) ✅
- `/frontend/src/pages/IconTest.tsx` (91 lines) ✅
- `/frontend/src/pages/ComponentShowcase.tsx` (240 lines) ❌

### Route Configuration Files
- `/frontend/src/App.tsx`
- `/frontend/src/modules/gauge/routes.tsx`
- `/frontend/src/modules/admin/routes.tsx`
- `/frontend/src/modules/inventory/routes.tsx`
- `/frontend/src/modules/user/routes.tsx`

---

**Last Updated**: 2025-11-06  
**Status**: Analysis Complete
