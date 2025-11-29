# FIXES NEEDED

## 1. Replace Invalid Status Values (7 files)
- `pending_qc` → `calibration_due`
- `requires_qc` → `calibration_due`
- `needs_qc` → `calibration_due`

### Affected Files:
- `/backend/src/modules/admin/services/AdminMaintenanceService.js`
- `/backend/src/modules/gauge/services/GaugeTrackingService.js` (line 146: `requires_qc`)
- `/backend/src/modules/gauge/repositories/CheckoutsRepo.js`
- `/backend/src/modules/gauge/routes/rejection-reasons.js`
- `/backend/src/modules/gauge/routes/gauges-v2.js`
- `/backend/src/modules/gauge/routes/gauge-qc.js`
- `/backend/src/modules/admin/routes/system-recovery.js`

## 2. Fix Column References
- `user.username` → `user.name`
- `req.user.username` → `req.user.name`

### Affected Files:
- `/backend/src/modules/admin/routes/system-recovery.js` (line 256: `req.user.username`)

## 3. Fix gauge_active_checkouts Assumptions
- Primary key is `gauge_id` not `id`
- No auto-increment field
- Update insert operations to not expect `insertId`

### Potentially Affected Files:
- Any file that inserts into `gauge_active_checkouts` and expects `insertId`
- CheckoutsRepo.js and related services

## 4. Update Test User References
- Change user ID 1 to user ID 7 (admin@fireproof.com)
- Or create user with ID 1
- Existing users: ID 7-14, 19-20

### Potentially Affected Files:
- Test files that hardcode user ID 1