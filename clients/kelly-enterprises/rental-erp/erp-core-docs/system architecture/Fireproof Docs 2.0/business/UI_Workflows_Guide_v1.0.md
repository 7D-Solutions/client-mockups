# UI Workflows Guide v1.0

**Version:** 1.0  
**Date:** 2025-09-05  
**Purpose:** User interface workflows and interaction patterns for the Fireproof Gauge System

## Table of Contents
1. [Edit Interface Structure](#1-edit-interface-structure)
2. [Status Management UI](#2-status-management-ui)
3. [User Experience Flows](#3-user-experience-flows)
4. [Error Handling UI](#4-error-handling-ui)
5. [Return Process UI](#5-return-process-ui)
6. [Calibration Workflow UI](#6-calibration-workflow-ui)

---

## 1. Edit Interface Structure

### Permission Model
- **Admin Only**: Edit button only appears for Admin users
- **Regular Users**: No edit button visible, no edit access

### Edit Mode Flow
1. **Admin sees "Edit" button** in details view
2. **Click "Edit"** → Details view switches to edit mode
3. **All fields become editable** except timestamps and history
4. **"Save" and "Cancel" buttons** appear
5. **Save with validation errors** → Highlight invalid fields + show general "missing fields" message
6. **Cancel** → Confirm dialog "Are you sure? You'll lose unsaved changes"
7. **Successful save** → Return to view mode with updated data

### Field Editability
- **Editable (Descriptive Only)**: 
  - Manufacturer (typo corrections)
  - Model number (typo corrections)
  - Serial number (if missing)
  - Storage location
  - Notes/comments
- **Never Editable (Identity & Operational)**: 
  - Gauge ID
  - Type (caliper, micrometer, thread gauge, etc.)
  - Size/specifications (thread class, range, etc.)
  - Seal status
  - Calibration due date
  - Unsealed date
  - All timestamps and history
- **Edit Restrictions**: Admin/QC roles only can edit

---

## 2. Status Management UI

### Automatic Status Changes
- **Daily Background Job**: Runs just after midnight
- **Individual Logging**: Each gauge status change logged in audit trail
- **Checked-Out Behavior**: Gauges stay checked out but show calibration due notification
- **Notification Scope**: All users notified (person with checkout + Admin/QC)

### Manual Status Changes
- **Admin Override**: Can manually change any status transition
- **Reason Required**: Dropdown for reason + custom text field
- **Audit Logging**: All manual changes logged with who/when/why

### Status Behavior
- **Single Status**: "Calibration due" regardless of how overdue
- **Permission Levels**: User authority determines who can make calibration decisions
- **All Changes Logged**: Both automatic and manual status changes

---

## 3. User Experience Flows

### Search & Organization
- **Sort Order**: By size
- **Search Bar**: Available for quick finding
- **Categories**: 3 main categories (2 existing + NPT)
- **Sub-Categories**: Metric and Standard for plug and ring gauges
- **Location Display**: Show on all checkout-able gauge cards
- **Search Results**: Same info as main list

### Checkout Flows
- **Regular Gauges**: Immediate checkout with confirmation window
- **Sealed Gauges**: Requires QC/Admin approval → "Pending QC" status → User notified *(notification system details for future)*
- **Calibration Due Gauges**: 
  - CANNOT be checked out - system prevents checkout entirely
  - Error message: "This gauge is calibration due and cannot be checked out"
  - Visual indicator: Red flashing in row view to warn all users
  - Must be calibrated before returning to service
- **Race Conditions**: Show error message with who has it checked out

### Return Flows
1. **User Return**: Goes to "gauge bin" → "Pending QC" status
2. **QC Acceptance**: "Was this returned to [Location]?"
   - **Yes**: Accept with that location
   - **No**: Choose "Select Bin Location" OR "Pending QC" (optional reason/note)
3. **Visibility**: "Pending QC" gauges visible to everyone
4. **History Access**: Everyone can see who returned it and when

### Interaction Design
- **Confirmations**: Required for important actions, checkout, calibration
- **No Keyboard Shortcuts**: Mouse/touch interactions only
- **No Time Limits**: Gauges can stay "Pending QC" indefinitely

---

## 4. Error Handling UI

### Database Failures
- **Retry Logic**: Auto-retry once → Manual retry option with Retry/Cancel buttons
- **Transaction Safety**: Rollback prevents partial updates

### System Availability
- **Server Downtime**: Maintenance message → Auto-retry every 30 seconds → Resume when available
- **Connection Loss**: Show "Connection lost" → User restarts action with fresh data when reconnected

### User Input Validation
- **Live Validation**: While typing + Final validation on save
- **Error Display**: Highlight invalid fields + general "missing fields" message

### Unexpected Errors
- **Generic Messages**: "Something went wrong" (no technical details to users)
- **Problem Reporting**: "Report Problem" button → Automatically captures system details + user description

---

## 5. Return Process UI

### Who Can Return
- **ANYONE can return ANY gauge** (not restricted to checkout person)
- Example: John checks out gauge → Mary can return it
- Rationale: User might be absent/leave company, flexibility needed

### Condition Selection
- **Condition Options**: "Good", "Damaged", "Needs Cleaning"
- **Damaged Handling**: Flagged but follows same workflow
- **Consistent Process**: Same QC process regardless of condition

### Transfer Requirements
- **ONLY the person who checked out can initiate transfer** (security measure)
- Gauge must be in checked_out status to transfer
- Example: John checks out → only John can transfer to Mary

---

## 6. Calibration Workflow UI

### Send to Calibration Process
- **Access Control**: QC/Admin roles only
- **Batch Selection**: Allow selecting multiple gauges to send together
- **Tracking**: Simple status change to "at_calibration" (no vendor tracking initially)
- **No Batch Relationships**: Don't track which gauges were sent together
- **Future Enhancement**: Full tracking with vendor, tracking numbers, expected return dates

### Receive from Calibration Process
- **Access Control**: QC/Admin roles only
- **Required Upload**: Certificate upload is mandatory (not optional)
- **Data Capture**:
  - Pass/Fail status (required)
  - Certificate number/reference (required)
  - Notes from calibration service (optional)
  - New calibration due date (regular gauges only, NOT sealable gauges)
- **Automatic Seal Status**: All gauges return from calibration as SEALED
- **Failed Calibrations**: 
  - Automatically move to "out_of_service" status
  - Likely to be soft deleted but data retained for records

---

## Implementation Notes

> **⚠️ IMPORTANT**: These are production-ready UI specifications that should be implemented exactly as specified. Every workflow represents extensive design work and careful consideration of user experience and business requirements.

**Design Session Context**: July 30, 2025 comprehensive design session  
**Status**: Ready for implementation  
**Related Documents**: 
- GAUGE_STANDARDIZATION_MASTER_SPEC.md (for gauge-specific workflows)
- System_Specs_Implementation_Guide_v3.2.md (for technical implementation)