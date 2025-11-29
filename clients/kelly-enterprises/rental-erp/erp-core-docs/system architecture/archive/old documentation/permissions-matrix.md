# Fireproof Gauge System - Complete Permissions Matrix

**Generated:** January 30, 2025  
**Purpose:** Comprehensive list of all system permissions for implementation

## Permission Categories

### 1. User Management Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `create_super_admin` | Create Super Admin Users | Can create new Super Admin accounts | Super Admin |
| `create_admin` | Create Admin Users | Can create new Admin accounts | Super Admin |
| `create_qc_supervisor` | Create QC Supervisor Users | Can create new QC Supervisor accounts | Super Admin, Admin |
| `create_qc` | Create QC Users | Can create new QC accounts | Super Admin, Admin |
| `create_regular_user` | Create Regular Users | Can create new Regular User accounts | Super Admin, Admin |
| `edit_user` | Edit User Information | Can modify user details | Super Admin, Admin |
| `deactivate_user` | Deactivate Users | Can deactivate user accounts | Super Admin, Admin |
| `reset_password` | Reset User Passwords | Can reset passwords for other users | Super Admin, Admin |
| `manage_permissions` | Manage User Permissions | Can grant/revoke individual permissions | Super Admin |
| `edit_role_defaults` | Edit Role Default Permissions | Can modify default permissions for roles | Super Admin |

### 2. Gauge/Equipment Management Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `create_gauge` | Create New Gauges | Can add new gauges/equipment to system | Super Admin, Admin, QC Supervisor |
| `edit_gauge` | Edit Gauge Information | Can modify gauge details | Super Admin, Admin |
| `retire_gauge` | Retire Gauges | Can retire gauges from active use | Super Admin, Admin |
| `delete_gauge` | Delete Gauges | Can permanently delete gauge records | Super Admin |
| `view_all_gauges` | View All Gauges | Can see all gauges regardless of status | Super Admin, Admin, QC Supervisor, QC |
| `view_retired_gauges` | View Retired Gauges | Can see retired gauges in searches | Super Admin, Admin |
| `manage_categories` | Manage Equipment Categories | Can add/edit equipment categories | Super Admin, Admin |

### 3. Checkout/Return Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `checkout_gauge` | Checkout Gauges | Can checkout available gauges | All Roles |
| `checkout_sealed_gauge` | Request Sealed Gauge Checkout | Can request checkout of sealed gauges | All Roles |
| `approve_sealed_checkout` | Approve Sealed Checkouts | Can approve sealed gauge checkout requests | Super Admin, Admin, QC Supervisor, QC |
| `return_gauge` | Return Gauges | Can return checked out gauges | All Roles |
| `transfer_gauge` | Transfer Gauge Assignment | Can transfer gauges between users | All Roles |
| `accept_returns` | Accept Gauge Returns | Can process returned gauges from pending queue | Super Admin, Admin, QC Supervisor, QC |
| `force_return` | Force Gauge Return | Can force return of gauge from another user | Super Admin, Admin |

### 4. Calibration Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `send_external_calibration` | Send for External Calibration | Can send gauges out for calibration | Super Admin, Admin, QC Supervisor, QC |
| `perform_internal_calibration` | Perform Internal Calibration | Can perform calibration on hand tools | Super Admin, Admin, QC Supervisor, QC |
| `mark_calibration_failed` | Mark Calibration as Failed | Can mark gauges as failed calibration | Super Admin, Admin, QC Supervisor, QC |
| `change_calibration_frequency` | Change Calibration Frequency | Can modify gauge calibration intervals | Super Admin, Admin, QC Supervisor, QC |
| `accept_calibration_cert` | Accept Calibration Certificates | Can accept/reject calibration certificates | Super Admin, Admin, QC Supervisor, QC |
| `override_calibration_due` | Override Calibration Due Date | Can manually adjust calibration due dates | Super Admin, Admin |
| `view_calibration_history` | View Calibration History | Can see full calibration history | Super Admin, Admin, QC Supervisor, QC |

### 5. Status Management Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `change_gauge_status` | Change Gauge Status | Can manually change gauge status | Super Admin, Admin |
| `mark_out_of_service` | Mark Out of Service | Can mark gauge as out of service | Super Admin, Admin, QC Supervisor, QC |
| `mark_damaged` | Mark as Damaged | Can mark returned gauge as damaged | Super Admin, Admin |
| `approve_repair` | Approve Gauge Repair | Can approve repair actions | Super Admin, Admin, QC Supervisor |

### 6. Reporting & Analytics Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `view_audit_logs` | View Audit Logs | Can view system audit trails | Super Admin, Admin |
| `export_data` | Export Data | Can export gauge and calibration data | Super Admin, Admin, QC Supervisor |
| `view_usage_analytics` | View Usage Analytics | Can access gauge usage analytics dashboard | Super Admin, Admin, QC Supervisor |
| `generate_reports` | Generate Reports | Can create system reports | Super Admin, Admin, QC Supervisor |
| `view_all_history` | View All History | Can see complete history for all gauges | Super Admin, Admin |

### 7. System Configuration Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `system_configuration` | System Configuration | Can modify system settings | Super Admin |
| `manage_locations` | Manage Locations | Can add/edit physical locations | Super Admin, Admin |
| `manage_notification_templates` | Manage Notification Templates | Can edit notification message templates | Super Admin, Admin |
| `view_system_health` | View System Health | Can see system health metrics | Super Admin, Admin |
| `perform_maintenance` | Perform System Maintenance | Can put system in maintenance mode | Super Admin |

### 8. Notification Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `send_system_announcements` | Send System Announcements | Can send system-wide notifications | Super Admin, Admin |
| `manage_own_notifications` | Manage Own Notifications | Can configure personal notification preferences | All Roles |
| `view_all_notifications` | View All Notifications | Can see all system notifications | Super Admin |

### 9. Special Equipment Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `manage_calibration_standards` | Manage Calibration Standards | Can add/edit calibration standards | Super Admin, Admin, QC Supervisor |
| `use_calibration_standards` | Use Calibration Standards | Can select standards for internal calibration | Super Admin, Admin, QC Supervisor, QC |
| `checkout_large_equipment` | Checkout Large Equipment | Can checkout large equipment | Super Admin, Admin |
| `edit_calibration_standards` | Edit Calibration Standards | Can edit calibration standard details | Super Admin, Admin |

### 10. Data Entry Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `create_thread_gauge` | Create Thread Gauges | Can add new thread gauges | Super Admin, Admin, QC Supervisor |
| `create_hand_tool` | Create Hand Tools | Can add new hand tools | Super Admin, Admin, QC Supervisor |
| `create_large_equipment` | Create Large Equipment | Can add new large equipment | Super Admin, Admin |
| `create_calibration_standard` | Create Calibration Standards | Can add new calibration standards | Super Admin, Admin, QC Supervisor |
| `bypass_naming_validation` | Bypass Naming Validation | Can save items without following naming standards | Super Admin |

### 11. View Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `view_checkout_history` | View Checkout History | Can see who has checked out gauges | All Roles |
| `view_return_history` | View Return History | Can see return history and conditions | All Roles |
| `view_pending_qc` | View Pending QC Queue | Can see items awaiting QC acceptance | All Roles |
| `view_sealed_gauges` | View Sealed Gauge Status | Can see which gauges are sealed | All Roles |
| `view_personal_items` | View Personal Items | Can see own assigned tools | All Roles |
| `view_calibration_forms` | View Calibration Forms | Can view internal calibration form results | Super Admin, Admin, QC Supervisor, QC |

### 12. Action-Specific Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `break_seal` | Break Gauge Seal | Implicit when sealed checkout is approved | Super Admin, Admin, QC Supervisor, QC |
| `update_gauge_location` | Update Gauge Location | Can change gauge physical location during return | Super Admin, Admin, QC Supervisor, QC |
| `add_return_notes` | Add Return Notes | Can add notes when returning gauges | All Roles |
| `select_return_condition` | Select Return Condition | Can mark gauge condition on return | All Roles |
| `skip_qc_acceptance` | Skip QC Acceptance | Can bypass QC acceptance queue | Super Admin |
| `view_edit_button` | View Edit Button | Can see edit button in gauge details | Super Admin, Admin |

### 13. Problem Reporting Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `report_problem` | Report System Problem | Can use Report Problem feature | All Roles |
| `view_problem_reports` | View Problem Reports | Can see all submitted problem reports | Super Admin, Admin |
| `resolve_problem_reports` | Resolve Problem Reports | Can mark problem reports as resolved | Super Admin, Admin |

### 14. Future Enhancement Permissions

| Permission ID | Permission Name | Description | Default Roles |
|--------------|-----------------|-------------|---------------|
| `access_mobile_interface` | Access Mobile Interface | Can use mobile version of system | All Roles |
| `use_qr_scanner` | Use QR Scanner | Can scan QR codes for gauge lookup | All Roles |
| `view_predictive_analytics` | View Predictive Analytics | Can see predictive maintenance suggestions | Super Admin, Admin, QC Supervisor |
| `manage_integrations` | Manage System Integrations | Can configure external system connections | Super Admin |

## Permission Implementation Notes

### Configurable Permissions Strategy

1. **Base Role Assignment**: Each role gets default permissions as listed above
2. **Role Customization**: Super Admin can modify which permissions each role gets by default
3. **Individual Overrides**: Any permission can be granted/revoked for specific users
4. **Permission Inheritance**: Permissions do not inherit up the hierarchy - each must be explicitly granted

### Frontend Implementation

```javascript
// Permission check example
const canUserEdit = hasPermission(user, 'edit_gauge');

// Multiple permission check
const canManageCalibration = hasAnyPermission(user, [
  'send_external_calibration',
  'perform_internal_calibration',
  'override_calibration_due'
]);
```

### Database Storage

Permissions should be stored in the tables defined in the Implementation Guide:
- `permissions` - Master list of all permissions
- `role_permissions` - Default permissions per role
- `user_permission_overrides` - Individual user overrides

### Future Permission Additions

As new features are added, new permissions should follow the naming convention:
- Use snake_case
- Start with verb (view_, edit_, create_, delete_, manage_)
- Be specific about the resource
- Document default role assignment

## Total Permission Count: 74 Permissions

### Permissions by Category:
- User Management: 10 permissions
- Gauge/Equipment Management: 7 permissions  
- Checkout/Return: 8 permissions
- Calibration: 7 permissions
- Status Management: 4 permissions
- Reporting & Analytics: 5 permissions
- System Configuration: 5 permissions
- Notifications: 3 permissions
- Special Equipment: 4 permissions
- Data Entry: 5 permissions
- View Permissions: 6 permissions
- Action-Specific: 6 permissions
- Problem Reporting: 3 permissions
- Future Enhancements: 4 permissions

## Permission Groups for UI

To simplify the permission management interface, permissions should be organized into logical groups:

### 1. **User & Access Management**
- All user creation permissions (create_super_admin, create_admin, etc.)
- User editing and management (edit_user, deactivate_user, reset_password)
- Permission management (manage_permissions, edit_role_defaults)
- Total: 10 permissions

### 2. **Equipment Management**
- Create permissions for all equipment types
- Edit and retire gauge permissions
- Category and location management
- Special equipment handling
- Total: 16 permissions

### 3. **Daily Operations**
- Checkout/return/transfer operations
- View permissions for daily work
- Return condition and notes
- Seal breaking and approvals
- Total: 20 permissions

### 4. **Calibration & Quality**
- All calibration-related permissions
- Calibration form access
- Certificate management
- Frequency and due date control
- Total: 13 permissions

### 5. **Administration & Configuration**
- System configuration
- Notification template management
- Status change permissions
- Problem report management
- Total: 15 permissions

### 6. **Reporting & Analytics**
- View analytics and reports
- Export capabilities
- Audit log access
- History viewing
- Total: 6 permissions

### 7. **Future/Advanced Features**
- Mobile access
- QR scanning
- Predictive analytics
- System integrations
- Total: 4 permissions

## Audit Requirements

All permission usage should be logged:
- Permission checks that result in denial
- Permission grants/revokes
- Role default changes
- Critical permission usage (delete, system configuration)

---

*This document should be updated whenever new permissions are identified during development.*