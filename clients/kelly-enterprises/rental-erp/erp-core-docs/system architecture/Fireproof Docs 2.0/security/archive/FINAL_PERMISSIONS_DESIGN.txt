# Final Permissions Design for Gauge Standardization

**Date**: August 15, 2025  
**Status**: Approved for Implementation  
**Architecture**: 8 Permissions, 4 Roles

## Executive Summary

This document defines the production-ready permission system for the gauge standardization module. The design prioritizes security through simplicity, using 8 core permissions and 4 user roles to handle all access control requirements.

## Core Permissions (8 Total)

```sql
-- Permission definitions
INSERT INTO permissions (name, description) VALUES
('gauge.manage', 'Create, edit, retire any gauge type'),
('gauge.operate', 'Checkout, return, transfer gauges'),
('gauge.view', 'View gauges and their details'),
('calibration.manage', 'Record calibrations, manage schedules'),
('user.manage', 'Create, edit, deactivate users'),
('system.admin', 'System configuration and maintenance'),
('audit.view', 'View audit logs and history'),
('data.export', 'Export reports and data');
```

## User Roles (4 Total)

### User
**Permissions**: `gauge.view`, `gauge.operate`
- View gauges (complete sets only)
- Checkout/return/transfer gauges
- Request sealed gauge checkout (needs QC approval)
- View calibration history
- Cannot see spares or incomplete sets

### QC
**Permissions**: `gauge.view`, `gauge.operate`, `gauge.manage`, `calibration.manage`, `audit.view`, `data.export`
- Everything User can do
- View ALL gauges (including spares)
- Create/edit/retire gauges (all types)
- Manage GO/NO GO pairs
- Convert spares to complete sets
- Record calibration results
- Auto-approve sealed checkouts
- Approve sealed checkout requests from Users
- Export reports
- View audit logs

### Admin
**Permissions**: All except `system.admin`
- Everything QC can do
- Create/edit users
- Assign roles
- Deactivate accounts

### Super Admin
**Permissions**: All 8 permissions
- Everything Admin can do
- System configuration
- Gauge categories management
- ID prefix configuration
- System maintenance

## Permission Details

### gauge.manage
**Operations Covered**:
- Create new gauges (all equipment types)
- Edit gauge information
- Retire/activate gauges
- Manage GO/NO GO companion relationships
- Convert spare gauges to complete sets

### gauge.operate
**Operations Covered**:
- Checkout gauges
- Return gauges
- Transfer between users
- Add notes and comments
- Request sealed gauge checkout

### gauge.view
**Operations Covered**:
- View gauge listings
- View gauge details
- View calibration history
- View assignment history

**Business Rule**: Regular users see filtered view (complete sets only)

### calibration.manage
**Operations Covered**:
- Record calibration results
- Update calibration schedules
- Manage calibration certificates
- Automatic seal status updates
- Approve sealed gauge checkouts

### user.manage
**Operations Covered**:
- Create new users
- Edit user information
- Assign roles
- Deactivate accounts
- Reset passwords

### system.admin
**Operations Covered**:
- Modify gauge categories
- Configure ID prefixes
- System settings
- Maintenance operations

### audit.view
**Operations Covered**:
- View audit trails
- Access security logs
- Review permission usage
- Track system changes

### data.export
**Operations Covered**:
- Export gauge lists
- Generate calibration reports
- Create compliance documents
- Extract audit data

## Business Rules (Not Permissions)

These are enforced in the service layer, NOT through permissions:

1. **Equipment Type Rules**
   - Large equipment cannot be checked out
   - Thread gauges must be created as GO/NO GO pairs
   - Hand tools don't require sealing

2. **Seal Status Rules**
   - Calibration automatically seals gauge
   - Sealed checkout requires approval (auto-approved for QC+)
   - Seal breaks upon approved checkout

3. **Visibility Rules**
   - Users see complete sets only
   - QC+ see all gauges including spares
   - Spare gauge pairing limited to QC+

4. **Validation Rules**
   - Companion gauge matching for threads
   - Equipment-specific field requirements
   - Standardized naming conventions

## Database Schema

```sql
-- Core permission tables
CREATE TABLE permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_by INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);
```

## Implementation Pattern

```javascript
// Simple permission check
async function checkPermission(userId, permission) {
  const hasPermission = await permissionService.userHasPermission(userId, permission);
  if (!hasPermission) {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }
}

// Route implementation
router.post('/gauges',
  authenticateToken,
  async (req, res, next) => {
    await checkPermission(req.user.id, 'gauge.manage');
    next();
  },
  gaugeController.create
);

// Service layer with business rules
async createGauge(userId, gaugeData) {
  // Permission already checked in route
  
  // Business rules
  if (gaugeData.equipment_category === 'thread_gauge') {
    // Enforce GO/NO GO pair creation
    validateThreadGaugePair(gaugeData);
  }
  
  if (gaugeData.equipment_category === 'large_equipment') {
    gaugeData.can_checkout = false;
    gaugeData.fixed_location = true;
  }
  
  return await gaugeRepository.create(gaugeData);
}
```

## Security Principles

1. **Default Deny**: No permission = no access
2. **Explicit Grant**: All permissions must be explicitly assigned
3. **Audit Everything**: Log all permission checks and changes
4. **Simple Over Complex**: 8 permissions are easier to secure than 74
5. **Business Logic Separation**: Permissions control access, not behavior

## Migration Notes

- Start with role-based defaults
- Add individual permission overrides only when needed
- No complex inheritance chains
- No time-based permissions initially (add later if needed)
- No resource-based filtering initially (add later if needed)

## Success Metrics

- Permission check performance < 10ms
- Zero permission-related security incidents
- New developer onboarding < 1 hour
- Permission administration time < 5 minutes per user

## Conclusion

This 8-permission, 4-role system provides enterprise-grade security through simplicity. It aligns with the database structure, supports all business requirements, and scales from 10 to 10,000+ users without fundamental changes.