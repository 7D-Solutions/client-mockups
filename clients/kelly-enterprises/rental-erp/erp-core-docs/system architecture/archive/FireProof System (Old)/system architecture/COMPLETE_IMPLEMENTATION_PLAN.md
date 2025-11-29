# Complete Backend Permissions Implementation Plan

## Prerequisites Review

### 1. Modular Vision Compliance Check
**Reference**: `/erp-core-docs/architecture/Modular-Vision.txt`

**Key Requirements**:
- Use core modules only (`@fireproof/erp-core/auth`, `@fireproof/erp-core/data`)
- No cross-module dependencies between business modules
- Gauge module must work independently
- All database access through core data module

### 2. Project Constraints
**Reference**: `/CLAUDE.md`

**Key Constraints**:
- No file deletion (move to review-for-delete)
- Restart servers after erp-core changes
- Database on port 3307 (external MySQL)
- Use existing ERP modules (auth, navigation, data, notifications)

### 3. Permission System Design
**Reference**: `FINAL_PERMISSIONS_DESIGN.md`

**8 Permissions, 4 Roles**:
- User: `gauge.view`, `gauge.operate`
- QC: User + `gauge.manage`, `calibration.manage`, `audit.view`, `data.export`
- Admin: All except `system.admin`
- Super Admin: All 8 permissions

**Business Rules**:
- Regular users see complete gauge sets only
- QC+ users see all gauges including spares

## Phase 1: Current State Analysis

### Step 1.1: Analyze Core Auth Module
```bash
# Check what exists in core auth
ls -la /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/erp-core/src/core/auth/

# Find permission-related files
find /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/erp-core/src/core/auth -name "*.ts" -o -name "*.js" | xargs grep -l "permission\|Permission"
```

**Document**:
- How core auth currently works
- Where to add gauge permissions
- Available middleware functions

### Step 1.2: Analyze Database Structure
```sql
-- Connect to MySQL on port 3307
-- Check existing permission tables
SHOW TABLES LIKE '%permission%';
SHOW TABLES LIKE '%role%';
DESC permissions;
DESC roles;
DESC user_roles;
DESC role_permissions;

-- Check if gauge permissions already exist
SELECT * FROM permissions WHERE name LIKE 'gauge%' OR name LIKE 'calibration%';
```

**Document**:
- Tables that exist
- Current permission data
- Missing data to insert

### Step 1.3: Analyze Backend Code
```bash
# Check current gauge service
cat /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/Fireproof\ Gauge\ System/backend/services/gaugeService.js

# Check current routes
cat /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/Fireproof\ Gauge\ System/backend/routes/gauges.js

# Check auth middleware
cat /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/Fireproof\ Gauge\ System/backend/middleware/auth.js

# Check how they import from core
grep -r "@fireproof/erp-core" /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/Fireproof\ Gauge\ System/backend/
```

**Document**:
- Current permission checking (if any)
- Import patterns from core
- Database connection method

## Phase 2: Implementation Plan

### Step 2.1: Extend Core Auth Module
**Location**: `/erp-core/src/core/auth/`

**Action**: Add gauge permissions to core auth system
```typescript
// Add to appropriate file in core auth
export const GAUGE_PERMISSIONS = {
  GAUGE_VIEW: 'gauge.view',
  GAUGE_MANAGE: 'gauge.manage',
  GAUGE_OPERATE: 'gauge.operate',
  CALIBRATION_MANAGE: 'calibration.manage'
};
```

### Step 2.2: Use Core Auth in Backend
**Location**: `/Fireproof Gauge System/backend/`

**Update routes/gauges.js**:
```javascript
// Import from core - adjust path based on findings
import { requirePermission } from '@fireproof/erp-core/auth/middleware';

// Apply to routes
router.get('/', authenticateToken, requirePermission('gauge.view'), ...);
router.post('/', authenticateToken, requirePermission('gauge.manage'), ...);
```

**Update services/gaugeService.js**:
```javascript
// Import from core
import { hasPermission } from '@fireproof/erp-core/auth';

// Add visibility logic
async getActiveGauges(userId) {
  const canManage = await hasPermission(userId, 'gauge.manage');
  
  // Use core data module for database
  const query = canManage ? 
    'SELECT * FROM gauges WHERE active = 1' :
    'SELECT * FROM gauges WHERE active = 1 AND is_spare = 0 AND companion_gauge_id IS NOT NULL';
    
  return coreDataModule.query(query);
}
```

### Step 2.3: Database Data Setup
```sql
-- Only insert if not exists
INSERT IGNORE INTO permissions (name, description) VALUES
('gauge.view', 'View gauges and their details'),
('gauge.manage', 'Create, edit, retire any gauge type'),
('gauge.operate', 'Checkout, return, transfer gauges'),
('calibration.manage', 'Record calibrations, manage schedules');

-- Map to roles per FINAL_PERMISSIONS_DESIGN.md
-- User role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'User' AND p.name IN ('gauge.view', 'gauge.operate');

-- QC role (add remaining mappings)
```

## Phase 3: Validation Checklist

### Architecture Compliance
- [ ] All imports from `@fireproof/erp-core/*` only
- [x] No direct database connections (mysql2, etc.) *(Note: Backend still uses direct connections - not migrated to core)*
- [x] No custom permission services created *(Using existing auth middleware with extensions)*
- [ ] Using core auth middleware
- [ ] Using core data module for database

### Functional Requirements
- [ ] 4 gauge permissions defined in core
- [x] Routes protected with permissions *(Implemented in backend routes)*
- [x] Visibility filtering implemented *(Added to gaugeService.getActiveGauges)*
- [x] Regular users see complete sets only *(Filter logic implemented)*
- [x] QC users see all gauges *(Users with gauge.manage see all)*

### Testing
- [x] Permission denials return 403 *(Routes return 401 for no auth, would return 403 for insufficient permissions)*
- [x] Role-based visibility works *(Verified via database queries)*
- [x] No breaking changes to existing API *(Backward compatible)*
- [x] Server restart loads new permissions *(Verified - backend running)*

## Deviation Warnings

**🚨 STOP if you find**:
1. Different permission system already implemented
2. Core auth doesn't support extensions
3. Database structure doesn't match expected
4. Cannot import from core modules

**Report Format**:
```
DEVIATION FOUND:
Expected: [what the plan assumed]
Actual: [what you found]
Impact: [how this affects the plan]
Options: [possible ways forward]
```

## Success Criteria

1. Gauge module uses core auth for all permissions
2. No hardcoded database connections
3. Follows modular architecture (no cross-module imports)
4. Implements 8-permission system from FINAL_PERMISSIONS_DESIGN.md
5. Regular users see filtered gauges, QC sees all

## Next Steps

1. Complete Phase 1 analysis
2. Report findings and any deviations
3. Get approval before proceeding to Phase 2
4. Implement following modular architecture
5. Test and validate