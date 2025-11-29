# AdminRepository.js Refactoring Plan

**Status**: High Priority - 909 lines, 94 methods
**Priority**: #3
**Location**: `backend/src/modules/admin/repositories/AdminRepository.js`

---

## Problem Analysis

**God Object Pattern**:
- Single repository handles all admin operations
- 94 methods covering user management, gauge management, audit, statistics
- Mixed responsibilities
- Hard to maintain and test

**Responsibilities Identified**:
1. User management (create, update, roles, permissions)
2. Gauge administrative operations (bulk updates, admin views)
3. Audit log queries and reports
4. System statistics and dashboard data

---

## Refactoring Strategy

### Split into 4 Focused Repositories

```
AdminRepository.js (909 lines, 94 methods)
├── AdminUserRepository.js (user admin - ~250 lines, 25 methods)
├── AdminGaugeRepository.js (gauge admin - ~250 lines, 25 methods)
├── AdminAuditRepository.js (audit queries - ~200 lines, 20 methods)
└── AdminStatsRepository.js (statistics - ~209 lines, 24 methods)
```

---

## File 1: AdminUserRepository.js

**Purpose**: User administration operations

**Methods**:
```javascript
class AdminUserRepository extends BaseRepository {
  constructor() {
    super('users', 'id');
  }

  // User CRUD
  async getAllUsers(connection = null)
  async getUserById(userId, connection = null)
  async createUser(userData, connection = null)
  async updateUser(userId, updates, connection = null)
  async deleteUser(userId, connection = null)
  async activateUser(userId, connection = null)
  async deactivateUser(userId, connection = null)

  // Role management
  async getUserRoles(userId, connection = null)
  async assignRole(userId, roleId, connection = null)
  async removeRole(userId, roleId, connection = null)
  async updateUserRoles(userId, roleIds, connection = null)

  // Permission management
  async getUserPermissions(userId, connection = null)
  async assignPermission(userId, permissionId, connection = null)
  async removePermission(userId, permissionId, connection = null)

  // User queries
  async getUsersByRole(roleId, connection = null)
  async getUsersByDepartment(departmentId, connection = null)
  async getActiveUsers(connection = null)
  async getInactiveUsers(connection = null)
  async searchUsers(criteria, connection = null)

  // User statistics
  async getUserCount(connection = null)
  async getUserCountByRole(connection = null)
  async getUserCountByDepartment(connection = null)

  // Password management
  async updatePassword(userId, hashedPassword, connection = null)
  async setMustChangePassword(userId, mustChange, connection = null)
}
```

**Lines**: ~250

---

## File 2: AdminGaugeRepository.js

**Purpose**: Administrative gauge operations

**Methods**:
```javascript
class AdminGaugeRepository extends BaseRepository {
  constructor() {
    super('gauges', 'id');
  }

  // Bulk operations
  async bulkUpdateStatus(gaugeIds, status, connection = null)
  async bulkUpdateCategory(gaugeIds, categoryId, connection = null)
  async bulkUpdateOwnership(gaugeIds, ownership, connection = null)
  async bulkDelete(gaugeIds, connection = null)
  async bulkActivate(gaugeIds, connection = null)
  async bulkDeactivate(gaugeIds, connection = null)

  // Admin-only queries
  async getAllGaugesAdmin(filters, connection = null)
  async getDeletedGauges(connection = null)
  async getInactiveGauges(connection = null)
  async getPendingApprovals(connection = null)
  async getOutOfServiceGauges(connection = null)

  // Data integrity
  async findOrphanedGauges(connection = null)
  async findInvalidSpecifications(connection = null)
  async findMissingCategories(connection = null)
  async validateGaugeData(connection = null)

  // Cleanup operations
  async cleanupOrphanedRecords(connection = null)
  async archiveOldGauges(cutoffDate, connection = null)
  async purgeDeletedGauges(connection = null)

  // Migration support
  async migrateGaugeData(transformation, connection = null)
  async updateAllGaugeFields(fieldUpdates, connection = null)

  // Statistics
  async getGaugeCountByStatus(connection = null)
  async getGaugeCountByCategory(connection = null)
  async getGaugeCountByEquipmentType(connection = null)
  async getGaugeStatistics(connection = null)
}
```

**Lines**: ~250

---

## File 3: AdminAuditRepository.js

**Purpose**: Audit log queries and reporting

**Methods**:
```javascript
class AdminAuditRepository extends BaseRepository {
  constructor() {
    super('audit_logs', 'id');
  }

  // Audit queries
  async getAllAuditLogs(filters, connection = null)
  async getAuditLogsByUser(userId, filters, connection = null)
  async getAuditLogsByModule(module, filters, connection = null)
  async getAuditLogsByAction(action, filters, connection = null)
  async getAuditLogsByEntity(entityType, entityId, connection = null)
  async getAuditLogsByDateRange(startDate, endDate, connection = null)

  // Security audit
  async getFailedLoginAttempts(userId, connection = null)
  async getUnauthorizedAccess(connection = null)
  async getPermissionChanges(connection = null)
  async getRoleChanges(connection = null)
  async getSecurityEvents(filters, connection = null)

  // Compliance reports
  async getComplianceReport(startDate, endDate, connection = null)
  async getUserActivityReport(userId, startDate, endDate, connection = null)
  async getModuleActivityReport(module, startDate, endDate, connection = null)

  // Audit statistics
  async getAuditCountByModule(connection = null)
  async getAuditCountByAction(connection = null)
  async getAuditCountByUser(connection = null)

  // Cleanup
  async cleanupOldAuditLogs(retentionDays, connection = null)
  async archiveAuditLogs(cutoffDate, connection = null)
}
```

**Lines**: ~200

---

## File 4: AdminStatsRepository.js

**Purpose**: System statistics and dashboard data

**Methods**:
```javascript
class AdminStatsRepository extends BaseRepository {
  constructor() {
    super();
  }

  // Dashboard statistics
  async getDashboardStats(connection = null)
  async getSystemHealth(connection = null)
  async getRecentActivity(limit, connection = null)

  // User statistics
  async getTotalUsers(connection = null)
  async getActiveUsersCount(connection = null)
  async getUsersByRole(connection = null)
  async getUserLoginStats(connection = null)
  async getUserActivityStats(connection = null)

  // Gauge statistics
  async getTotalGauges(connection = null)
  async getGaugesByStatus(connection = null)
  async getGaugesByCategory(connection = null)
  async getGaugesByEquipmentType(connection = null)
  async getCalibrationStats(connection = null)
  async getCheckoutStats(connection = null)

  // System statistics
  async getDatabaseSize(connection = null)
  async getTableSizes(connection = null)
  async getRecordCounts(connection = null)

  // Performance statistics
  async getAverageResponseTime(connection = null)
  async getSlowQueries(limit, connection = null)
  async getErrorRates(connection = null)

  // Trend analysis
  async getUserGrowthTrend(days, connection = null)
  async getGaugeGrowthTrend(days, connection = null)
  async getActivityTrend(days, connection = null)

  // Reports
  async generateMonthlyReport(month, year, connection = null)
  async generateQuarterlyReport(quarter, year, connection = null)
  async generateAnnualReport(year, connection = null)
}
```

**Lines**: ~209

---

## Implementation Steps

### Step 1: Create AdminStatsRepository
**Why First**: Fewest dependencies

1. Create file and implement statistics methods
2. Update AdminStatsService to use new repository
3. Test statistics endpoints

### Step 2: Create AdminAuditRepository
**Why Second**: Clear boundary, no circular dependencies

1. Create file and implement audit methods
2. Update AdminAuditService
3. Test audit log endpoints

### Step 3: Create AdminUserRepository
**Why Third**: Core admin functionality

1. Create file and implement user admin methods
2. Update AdminUserService
3. Test user management endpoints

### Step 4: Create AdminGaugeRepository
**Why Fourth**: May depend on user repository

1. Create file and implement gauge admin methods
2. Update AdminGaugeService
3. Test gauge admin endpoints

### Step 5: Clean Up Original AdminRepository
1. Remove all extracted methods
2. Update any remaining references
3. Consider deprecating or removing if empty

---

## Service Layer Updates

### Before
```javascript
const adminRepository = new AdminRepository();

// All operations through one repository
await adminRepository.getAllUsers();
await adminRepository.getDashboardStats();
await adminRepository.getAuditLogs();
await adminRepository.bulkUpdateGauges();
```

### After
```javascript
const adminUserRepository = new AdminUserRepository();
const adminGaugeRepository = new AdminGaugeRepository();
const adminAuditRepository = new AdminAuditRepository();
const adminStatsRepository = new AdminStatsRepository();

// Use specific repository for each concern
await adminUserRepository.getAllUsers();
await adminStatsRepository.getDashboardStats();
await adminAuditRepository.getAuditLogs();
await adminGaugeRepository.bulkUpdateGauges();
```

---

## Services Requiring Updates

1. **AdminUserService** → Use AdminUserRepository
2. **AdminGaugeService** → Use AdminGaugeRepository
3. **AdminAuditService** → Use AdminAuditRepository
4. **AdminStatsService** → Use AdminStatsRepository
5. **AdminDashboardService** → Use multiple repositories

---

## Benefits

### Before
- ❌ 909 lines (overwhelming)
- ❌ 94 methods (hard to find)
- ❌ Mixed responsibilities
- ❌ Hard to test specific areas

### After
- ✅ 4 files × ~200-250 lines
- ✅ ~20-25 methods per file
- ✅ Clear responsibilities
- ✅ Easy to test individual concerns

---

## Acceptance Criteria

- ✅ All 94 methods accounted for
- ✅ All admin services updated
- ✅ All tests passing
- ✅ Each repository < 300 lines
- ✅ Clear JSDoc documentation
- ✅ No circular dependencies

---

**Status**: Ready for implementation
**Impact**: High - improves admin code organization
**Risk**: Medium - requires service layer updates
