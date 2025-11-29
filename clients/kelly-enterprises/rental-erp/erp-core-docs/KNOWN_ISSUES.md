# Known Issues - Fire-Proof ERP

**Last Updated**: 2025-10-23

## Active Issues

### 🔴 Critical

#### Issue #1: Overdue Gauge Checkout Prevention Not Enforced
**Date Reported**: 2025-10-23
**Date Fixed**: 2025-10-23
**Module**: Gauge Management
**Severity**: Critical
**Status**: ✅ Fixed

**Description**:
Gauges showing as "overdue" (for calibration) are still allowed to be checked out. The system should prevent checkout of overdue gauges to ensure calibration compliance.

**Reproduction**:
1. Navigate to gauge list
2. Identify gauge marked as "overdue" (e.g., Gauge MP0006)
3. Click on the gauge
4. Observe that "Checkout" option is available
5. System allows checkout to proceed

**Expected Behavior**:
- Overdue gauges should not display checkout option
- If checkout is attempted, system should block with clear error message: "This gauge is overdue for calibration and cannot be checked out"
- Gauge status should indicate it's unavailable for checkout until calibration is completed

**Affected Components**:
- Frontend: Gauge detail view checkout button logic
- Backend: Checkout validation endpoint
- Database: Calibration due date checking logic

**Example Case**:
- Gauge ID: MP0006
- Status: Overdue for calibration
- Current Behavior: Checkout allowed ❌
- Expected Behavior: Checkout blocked ✅

**Impact**:
- High: Compromises calibration compliance
- High: Safety risk if uncalibrated gauges are used
- Medium: Audit trail issues

**Priority**: P0 (Must Fix)

**Fix Applied**:
1. Backend validation added to `OperationsService.checkoutGauge()`:
   - Added `checkCalibrationStatus()` method to query gauge calibration due dates
   - Blocks checkout if `due_date < NOW()` with error: `calibration_overdue`
   - Returns clear message: "This gauge is overdue for calibration and cannot be checked out"

2. Frontend UI updated in `GaugeDetail.tsx`:
   - Checkout button hidden for gauges with `calibration_status === 'Expired'`
   - Disabled button shown with red warning text: "Overdue for calibration"

**Testing**:
- Gauge MP0006 (overdue since 2025-06-17) should now:
  - Show disabled checkout button with warning message
  - Return error if checkout is attempted via API

**Files Modified**:
- Backend: `/backend/src/modules/gauge/services/OperationsService.js` (lines 54-64, 312-343)
- Frontend: `/frontend/src/modules/gauge/components/GaugeDetail.tsx` (lines 357-373)

---

## Issue Template

```markdown
#### Issue #N: [Short Title]
**Date Reported**: YYYY-MM-DD
**Module**: [Module Name]
**Severity**: Critical | High | Medium | Low
**Status**: Open | In Progress | Fixed | Won't Fix

**Description**:
[Detailed description]

**Reproduction**:
[Steps to reproduce]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What currently happens]

**Impact**:
[Business/technical impact]

**Priority**: P0 | P1 | P2 | P3
```

---

## Resolved Issues

(No resolved issues yet)

---

## Notes

- Issues are tracked here for visibility and prioritization
- Critical issues (P0) should be addressed immediately
- See GitHub issues for detailed technical discussions
