# Fire-Proof ERP Frontend Button Catalog

This document provides a comprehensive catalog of all buttons in the modular Fire-Proof ERP frontend application, organized by module and component.

## Overview

The application uses a centralized Button component (`/infrastructure/components/Button.tsx`) with the following variants:
- **primary** - Main actions (blue)
- **secondary** - Secondary actions (gray)
- **success** - Positive actions (green)
- **warning** - Caution actions (orange)
- **danger** - Destructive actions (red)
- **info** - Informational actions (light blue)
- **default** - Standard actions
- **outline** - Bordered variant

## Button Catalog by Module

### Infrastructure Components

#### Login Screen (`/infrastructure/components/LoginScreen.tsx`)
| Button Text | State | Purpose | Variant |
|------------|-------|---------|---------|
| Sign In | Default | Submit login credentials | primary |
| Signing in... | Loading | Login in progress | primary |

#### Main Layout (`/infrastructure/components/MainLayout.tsx`)
| Button Text | Purpose | Location |
|------------|---------|----------|
| Logout | Sign out current user | Header |
| Gauge Management | Navigate to gauge management | Tab Navigation |
| My Dashboard | Navigate to personal dashboard | Tab Navigation |
| Admin | Navigate to admin panel (admin only) | Tab Navigation |

#### Modal Base (`/infrastructure/components/Modal.tsx`)
| Button | Purpose |
|--------|---------|
| × | Close modal (aria-label: "Close modal") |

#### Password Modal (`/infrastructure/components/PasswordModal.tsx`)
| Button Text | Purpose | Variant |
|------------|---------|---------|
| Cancel | Cancel password change | secondary |
| Change Password | Submit password change | primary |
| Changing... | Password change in progress | primary |
| Show/Hide | Toggle password visibility | - |
| Copy | Copy password to clipboard | - |
| ✓ Copied | Password copied confirmation | - |

#### Reject Modal (`/infrastructure/components/RejectModal.tsx`)
| Button Text | Purpose | Variant |
|------------|---------|---------|
| Cancel | Cancel rejection | secondary |
| Reject | Submit rejection | danger |
| Rejecting... | Rejection in progress | danger |

### Core Components

#### Confirm Modal (`/components/ConfirmModal.tsx`)
| Button Text | Purpose | Variant |
|------------|---------|---------|
| {cancelText} | Dynamic cancel button | secondary |
| {confirmText} | Dynamic confirm button | varies |
| Processing... | Action in progress | varies |

#### Edit Gauge Modal (`/components/EditGaugeModal.tsx`)
| Button Text | Purpose | Context |
|------------|---------|---------|
| Save Changes | Save gauge edits | Main modal |
| Cancel | Cancel editing | Main modal |
| Yes, Save Changes | Confirm save | Confirmation dialog |
| Cancel | Cancel save confirmation | Confirmation dialog |

#### Gauge Details Modal (`/components/GaugeDetailsModal.tsx`)
| Button Text | Purpose | Location |
|------------|---------|----------|
| Details | View gauge details | Tab |
| History | View gauge history | Tab |
| Calibration Certs | View calibration certificates | Tab |
| Edit | Edit gauge information | Action |
| Checkout | Check out gauge | Action |
| Return | Return gauge | Action |
| Transfer | Transfer gauge | Action |
| Close | Close modal | Footer |

#### QC Approvals Modal (`/components/QCApprovalsModal.tsx`)
| Button Text | Purpose | Context |
|------------|---------|---------|
| Approve | Approve individual gauge | Row action |
| Fail | Fail individual gauge | Row action |
| Cancel | Cancel QC review | Footer |
| Approve QC | Bulk approve selected | Footer |
| Approving... | Approval in progress | Footer |
| Fail QC | Bulk fail selected | Footer |
| Recording... | Failure recording in progress | Footer |

#### Transfer Modals

##### Transfer Modal (`/components/TransferModal.tsx`)
| Button Text | Purpose |
|------------|---------|
| Cancel | Cancel transfer |
| Transfer Gauge | Submit transfer |
| Transferring... | Transfer in progress |

##### Transfer Receive Modal (`/components/TransferReceiveModal.tsx`)
| Button Text | Purpose | Context |
|------------|---------|---------|
| Accept Transfer | Accept incoming transfer | Main action |
| Reject Transfer | Reject incoming transfer | Main action |
| Close | Close modal | Alternative |
| Yes, Accept Transfer | Confirm acceptance | Confirmation |
| Accepting... | Acceptance in progress | Confirmation |
| Cancel | Cancel accept action | Confirmation |
| Yes, Reject Transfer | Confirm rejection | Rejection dialog |
| Rejecting... | Rejection in progress | Rejection dialog |
| Go Back | Return to previous step | Rejection dialog |

##### Transfer Pending Modal (`/components/TransferPendingModal.tsx`)
| Button Text | Purpose |
|------------|---------|
| Close | Close modal |
| Cancel Transfer | Cancel pending transfer |
| Cancelling... | Cancellation in progress |

### Admin Module

#### Add User Modal (`/admin/components/AddUserModal.tsx`)
| Button Text | Purpose | Variant |
|------------|---------|---------|
| Cancel | Cancel user creation | secondary |
| Create User | Submit new user | primary |
| Creating... | Creation in progress | primary |

#### User Details Modal (`/admin/components/UserDetailsModal.tsx`)
| Button Text | Purpose | Mode |
|------------|---------|------|
| Close | Close modal | View mode |
| Edit User | Switch to edit mode | View mode |
| Cancel | Cancel editing | Edit mode |
| Save Changes | Save user changes | Edit mode |
| Saving... | Save in progress | Edit mode |

#### Reset Password Modal (`/admin/components/ResetPasswordModal.tsx`)
| Button Text | Purpose | Context |
|------------|---------|---------|
| Cancel | Cancel password reset | Main |
| Reset Password | Submit password reset | Main |
| Resetting... | Reset in progress | Main |
| Show/Hide | Toggle password visibility | Password field |
| Copy | Copy temporary password | Success state |
| ✓ Copied | Copy confirmation | Success state |
| Done | Close after success | Success state |

#### User Management Page (`/admin/pages/UserManagement.tsx`)
| Button Text | Purpose | Location |
|------------|---------|----------|
| Add New User | Open add user modal | Page header |
| Edit | Edit user | Table row |
| Reset Password | Reset user password | Table row |
| Delete | Delete user | Table row |

#### Audit Logs Page (`/admin/pages/AuditLogs.tsx`)
| Button Text | Purpose |
|------------|---------|
| Clear Filters | Clear all log filters |
| Previous | Previous page of logs |
| Next | Next page of logs |

### Gauge Module

#### Create Gauge Modal (`/gauge/components/CreateGaugeModal.tsx`)
| Button Text | Purpose | Variant |
|------------|---------|---------|
| Cancel | Cancel gauge creation | secondary |
| Create Gauge | Submit new gauge | primary |
| Creating... | Creation in progress | primary |

#### Gauge Filters (`/gauge/components/GaugeFilters.tsx`)
| Button Text | Purpose |
|------------|---------|
| Clear Filters | Clear all active filters |

#### Gauge Inventory (`/gauge/components/GaugeInventory.tsx`)
| Button Text | Purpose | Type |
|------------|---------|------|
| Create New Gauge | Open create gauge modal | Action |
| Check In | Check in gauge | Action |
| Review | Review gauge needing review | Action |
| Clear All | Clear all filters | Filter |
| All Gauges | View all gauges | Category tab |
| Large Equipment | View large equipment | Category tab |
| Company Hand Tools | View company tools | Category tab |
| Employee Hand Tools | View employee tools | Category tab |
| Thread Gauges | View thread gauges | Category tab |
| Serial # | Sort by serial number | Sort |
| Type | Sort by type | Sort |
| Status | Sort by status | Sort |
| Date | Sort by date | Sort |

#### Gauge Row (`/gauge/components/GaugeRow.tsx`)
| Button Text | Purpose | State |
|------------|---------|-------|
| Checkin | Check in gauge | Active |
| Pending QC | QC pending status | Disabled |
| Out of Service | Out of service status | Disabled |
| Calibration Due | Calibration due status | Disabled |
| Pending Unseal | Pending unseal status | Disabled |
| Checkout | Check out gauge | Active |
| Transfer Pending | Cancel pending transfer | Active |
| Transfer Waiting | Accept incoming transfer | Active |
| Transfer | Initiate transfer | Active |

#### Check-in Modal (`/gauge/components/CheckinModal.tsx`)
| Button Text | Purpose | Variant |
|------------|---------|---------|
| Cancel | Cancel check-in | secondary |
| Check In | Submit check-in | primary |
| Checking in... | Check-in in progress | primary |

#### Gauge List Page (`/gauge/pages/GaugeList.tsx`)
| Button Text | Purpose |
|------------|---------|
| Retry | Retry loading gauges on error |

#### My Dashboard Page (`/gauge/pages/MyDashboard.tsx`)
| Button Text | Purpose | Context |
|------------|---------|---------|
| My Personal Tools | View personal tools | Tab |
| Items I've Checked Out | View checked out items | Tab |
| Pending Transfers | View pending transfers | Tab |
| Check In | Check in personal gauge | Action |
| Accept | Accept transfer | Transfer |
| Cancel | Cancel transfer | Transfer |

#### QC Page (`/gauge/pages/QCPage.tsx`)
| Button Text | Purpose |
|------------|---------|
| Open QC Approvals | Open QC approvals modal |

### User Module

#### User Profile Page (`/user/pages/UserProfile.tsx`)
| Button Text | Purpose | Mode |
|------------|---------|------|
| Edit Profile | Switch to edit mode | View |
| Cancel | Cancel profile editing | Edit |
| Save Changes | Save profile changes | Edit |
| Saving... | Save in progress | Edit |

#### User Settings Page (`/user/pages/UserSettings.tsx`)
| Button Text | Purpose |
|------------|---------|
| Change Password | Open password change modal |
| Save Preferences | Save user preferences |
| Saving... | Save in progress |

### Pages

#### Gauge Detail Page (`/pages/GaugeDetail.tsx`)
| Button Text | Purpose | Context |
|------------|---------|---------|
| ← Back | Return to gauge list | Default |
| ← Back to List | Return to gauge list | Alternative |
| Checkout | Check out gauge | Available gauge |
| Return | Return gauge | Checked out gauge |

## Button States

### Loading States
Most action buttons have corresponding loading states that show during async operations:
- Login → Logging in...
- Save → Saving...
- Create → Creating...
- Submit → Submitting...
- Transfer → Transferring...
- etc.

### Disabled States
Buttons are disabled in the following scenarios:
- During loading/processing
- Insufficient permissions
- Invalid form state
- Gauge status restrictions (e.g., "Pending QC", "Out of Service")

## Accessibility Features

1. All buttons include proper `aria-label` attributes where text is not self-explanatory
2. Loading states maintain button dimensions to prevent layout shift
3. Disabled states are communicated both visually and to screen readers
4. Modal close buttons include explicit aria-labels
5. Toggle buttons (Show/Hide) indicate current state

## Common Button Patterns

### Action Buttons
- Primary actions: Save, Create, Submit, Confirm
- Secondary actions: Cancel, Close, Back
- Destructive actions: Delete, Reject, Fail

### Navigation Buttons
- Tab navigation in dashboards
- Back buttons with arrow indicators
- Pagination controls (Previous/Next)

### Status Buttons
- Dynamic text based on gauge/user status
- Disabled state for unavailable actions
- Loading state during async operations

### Utility Buttons
- Clear/Reset filters
- Copy to clipboard
- Toggle visibility (passwords)
- Sort controls

## Design Consistency

All buttons follow the design system with:
- Consistent sizing (sm, md, lg)
- Predictable color coding by variant
- Uniform loading animations
- Standard disabled styling
- Consistent spacing and padding