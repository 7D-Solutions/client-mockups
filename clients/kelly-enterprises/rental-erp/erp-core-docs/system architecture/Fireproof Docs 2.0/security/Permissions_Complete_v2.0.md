# Permissions Complete v2.0

**Version:** 2.0  
**Date:** 2025-09-05  
**Purpose:** Complete permission system and validation reference for production-ready security

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Core Permissions](#core-permissions-8-total)
3. [User Roles](#user-roles-4-total)
4. [Permission Matrix](#permission-matrix)
5. [Validation Rules](#validation-rules)
6. [Implementation Details](#implementation-details)
7. [Security Considerations](#security-considerations)

---

> **Note**: This document consolidates permissions design and validation rules from multiple sources based on 4-instance collaboration analysis.

## Executive Summary

This document defines the production-ready permission system for the gauge standardization module. The design prioritizes security through simplicity, using 8 core permissions and 4 user roles to handle all access control requirements.

## Core Permissions (8 Total)

```sql
-- Permission definitions
INSERT INTO core_permissions (name, description) VALUES
('gauge.view', 'View gauges and details'),
('gauge.operate', 'Checkout, return, transfer gauges'),
('gauge.manage', 'Create, edit, retire gauges'),
('calibration.manage', 'Record calibration results, manage calibration'),
('user.manage', 'Create/edit users, assign roles'),
('system.admin', 'System configuration, recovery tools'),
('audit.view', 'View audit logs'),
('data.export', 'Export reports');
```

## User Roles (4 Total)

```sql
INSERT INTO core_roles (name) VALUES
('User'),
('QC'),
('Admin'),
('Super Admin');
```

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

## Role → Permission Mapping

```sql
-- User
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.name='User' AND p.name IN ('gauge.view','gauge.operate');

-- QC
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.name='QC' AND p.name IN ('gauge.view','gauge.operate','gauge.manage','calibration.manage','audit.view','data.export');

-- Admin
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.name='Admin' AND p.name IN ('gauge.view','gauge.operate','gauge.manage','calibration.manage','audit.view','data.export','user.manage');

-- Super Admin
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.name='Super Admin';
```

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
- Create new user accounts
- Edit existing users
- Assign roles and permissions
- Deactivate/reactivate accounts
- View user activity

### system.admin
**Operations Covered**:
- System configuration changes
- Database maintenance
- ID prefix configuration
- Category management
- System recovery operations

### audit.view
**Operations Covered**:
- View all audit logs
- Generate audit reports
- Track gauge history
- Monitor system access

### data.export
**Operations Covered**:
- Export gauge reports
- Generate calibration schedules
- Create inventory reports
- Export audit logs

## Validation Rules

### Prime Directives
1. **Never bypass validation** — all gauge IDs, categories, and standards must match regex rules.
2. **Audit all changes** — log old/new values with actor + timestamp.
3. **Roles are fixed (4)** — User, QC, Admin, Super Admin.
4. **Permissions are fixed (8)** — deny by default, explicit grant only.
5. **Gauge IDs immutable** after creation (only notes, manufacturer, etc. editable).
6. **Companion rules enforced** — A/B pairs required, stored in `gauge_companion_history`.
7. **Transactions for ID generation** — prefix lock prevents race conditions.

### Thread Gauge Validation Regex
- **Standard (UNC/UNF/UN/UNEF)**: `^\\d+(/\\d+)?-\\d+\\s+[0-9]+[A-Za-z]?$`
- **Metric**: `^M\\d+(\\.\\d+)?x\\d+(\\.\\d+)?\\s+[0-9]+[a-z]$`
- **NPT**: `^\\d+(/\\d+)?-\\d+\\s+NPT$`
- **ACME**: `^\\d+(/\\d+)?-\\d+\\s+ACME$`

### Companion Rules
- Every `plug` gauge with suffix `A` must have a `companion_gauge_id` pointing to suffix `B`.
- Every `ring` gauge with suffix `A` must have a companion `B`.
- If a companion link changes, record in `gauge_companion_history`.

### Spare Rules
- `is_spare=1` must not be counted in complete sets.
- Spare gauges must have unique system_gauge_id but can share specs.
- Spare gauges cannot be checked out until assigned to a gauge ID.

### Access Control Validation
- All operations must check user permissions before execution
- Sealed gauge operations require `calibration.manage` permission
- System configuration requires `system.admin` permission
- User creation requires `user.manage` permission

### Data Integrity Rules
- All gauge modifications must be audited
- Companion relationships must be bidirectional
- Serial numbers must be unique across all gauges
- Calibration certificates must be linked to serial numbers, not gauge IDs

## Security Implementation

### Authentication Requirements
- All users must be authenticated before accessing system
- Session management with appropriate timeouts
- Password requirements and rotation policies

### Authorization Enforcement
- Permission checks on all operations
- Role-based access control (RBAC) implementation
- Deny by default - explicit permission grants only

### Audit Requirements
- All changes must be logged with timestamp and user
- Immutable audit trail
- Regular audit log backups

### Data Protection
- Sensitive data encryption at rest
- Secure transmission protocols
- Regular security assessments

## Implementation Notes

**Migration from Legacy Systems**:
- 5-tier role system has been consolidated to 4 roles
- Permission mapping ensures no functionality loss
- Legacy user roles must be migrated to new structure

**Integration Points**:
- Authentication system integration
- Audit logging system
- Database constraints and triggers
- Frontend permission checking

**Testing Requirements**:
- Unit tests for all permission checks
- Integration tests for role assignments
- Security penetration testing
- Audit trail verification

---

## Related Documents
- UI_Workflows_Guide_v1.0.md (for user interface permissions)
- Gauge_Standardization_v2.0.md (for gauge-specific rules)
- System_Specs_Implementation_Guide_v3.2.md (for technical implementation)

**Consolidation Notes**:
- Merged business permission rules from FINAL_PERMISSIONS_DESIGN.txt
- Integrated validation patterns from Permissions_and_Validation_Reference_v1.0.md
- Resolved 4-role vs 5-tier conflict in favor of 4-role system
- Added comprehensive security implementation guidelines