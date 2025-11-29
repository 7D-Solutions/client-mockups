# Legacy Frontend Buttons Inventory

This document provides a comprehensive inventory of all buttons found in the legacy frontend application, organized by category and shown exactly as they appear to users.

## Authentication & System Navigation

### Login/Logout
- **Sign In** - Primary login button
  - Loading state: **Signing in...**
- **Logout** - Header logout button

## Main Navigation & Dashboard

### User Dashboard Tabs
- **My Personal Tools**
- **Items I've Checked Out**
- **Pending Transfers**

### Gauge Filter Tabs
- **All** (shows count)
- **Large Equipment** (shows count)
- **Company Hand Tools** (shows count)
- **Employee Hand Tools** (shows count)
- **Thread Gauges** (shows count)
  - **All Thread** (sub-tab with count)
  - **Ring** (sub-tab with count)
  - **Plug** (sub-tab with count)

## Gauge Management Actions

### Primary Actions (Row-level)
- **Edit** - Opens edit modal
- **Checkin** - Check in a gauge
- **Checkout** - Check out a gauge
- **Transfer** - Transfer to another user
- **Transfer Pending** - Shows for pending transfers
- **Transfer Waiting** - Shows for waiting transfers

### Status-based Buttons (Disabled states)
- **Pending QC** - Disabled, shows QC status
- **Out of Service** - Disabled, shows service status
- **Calibration Due** - Disabled, shows calibration status
- **Pending Unseal** - Disabled, shows unseal status

## Modal Buttons

### Standard Modal Actions
- **Save Changes** - Save edits
- **Create Gauge** - Create new gauge
- **Transfer Gauge** - Complete transfer
- **Cancel** - Cancel action
- **Close** - Close modal
- **Save** - Generic save button
- **×** - Close button (top-right)

### Transfer-specific Actions
- **Accept Transfer**
- **Reject Transfer**
- **Yes, Accept Transfer** - Confirmation
- **Yes, Reject Transfer** - Confirmation
- **Go Back** - Return to previous
- **Accepting...** - Loading state
- **Rejecting...** - Loading state
- **Cancel Transfer** - Cancel pending transfer

### Check-in/Check-out Confirmations
- **Yes, Check Out**
- **Yes, Check-in**
- **Yes, Return on Their Behalf** - Cross-user return scenario

### QC Approval Actions
- **Approve** - Approve single item
- **Reject** - Reject single item
- **Update Status** - Update QC status
- **Yes, Approve** - Confirmation
- **Bulk Approve** - Approve multiple
- **Bulk Reject** - Reject multiple

## Admin Panel

### Admin Navigation
- **User Management**
- **System Settings**
- **Reports**
- **Data Management**
- **Rejection Reasons**
- **System Recovery**

### User Management Actions
- **Add User** - Opens add user modal
- **Create User** - Submit new user (context: new)
- **Update User** - Submit user changes (context: edit)
- **Edit User** - Edit user details
- **Delete User** - Delete user
- **Set Password** - Set user password
- **Reset Password** - Reset user password

### System Settings Actions
- **Save Settings** - Save system settings
- **Database Backup** - Create backup
- **Export Audit Log** - Export logs
- **Clear Cache** - Clear system cache

### Reports Actions
- **Generate [Report Type] Report** - Dynamic report generation
- **Export [Report Type] Report** - Dynamic report export

### Data Management Actions
- **Import Data**
- **Export All Gauge Data**
- **Export Calibration Records**
- **Validate Data Integrity**
- **Clean Duplicate Records**
- **Archive Old Records**
- **Bulk Update Gauges**
- **Recalculate Calibration Status**

## System Recovery Tool

### Recovery Actions
- **Search for Issues** - Initiate search
- **Proceed with Recovery** - Start recovery
- **Confirm Recovery** - Final confirmation
- **Cancel** - Cancel recovery

## Special Feature Buttons

### Sealed Gauge Actions
- **Request to Unseal** - Request unseal permission
- **Yes, Proceed** - Confirm unseal request
- **Confirm Unseal** - Final unseal confirmation

### Review Modal Actions
- **Approve Removal** - Approve gauge removal
- **Add Note** - Add review note
- **Close** - Close review modal

### Certificate Actions (Gauge Details)
- **View Certificate** - View calibration certificate
- **Download Certificate** - Download certificate

## Button Features & States

### Dynamic Elements
- **Icons**: Many buttons include FontAwesome icons (fa-check, fa-times, fa-edit, etc.)
- **Loading States**: Buttons show spinner and "..." during processing
- **Counts**: Tab buttons show counts in parentheses
- **Conditional Text**: Some buttons change text based on context
- **Disabled States**: Buttons disable with status messages

### Button Styling Classes
- **Primary**: `save-btn`, `checkout-btn`, `checkin-btn`
- **Secondary**: `cancel-btn`, `edit-btn`, `transfer-btn`
- **Danger**: `danger-btn`, `delete-btn`
- **Warning**: `warning-btn`
- **Status**: `pending-btn`, `status-btn`
- **Navigation**: `nav-tab`

## Transfer Receive Button States

The Transfer Receive button has multiple states:
- **Pending Transfers ([count])** - Shows count of pending transfers
- **Accept Transfer** - When transfers are available
- **Reject Transfer** - Option to reject transfer
- Loading states for accept/reject actions

---

*Note: This inventory includes all buttons as they appear to end users in the legacy frontend application. Dynamic text elements are noted where applicable.*