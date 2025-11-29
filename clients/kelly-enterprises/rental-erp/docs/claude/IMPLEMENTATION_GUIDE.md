# 🛠️ Fireproof Gauge System - Implementation Guide
*Complete technical implementation roadmap for developers*

**Version:** 2.1  
**Updated:** January 31, 2025

> **📋 Prerequisites**: This guide implements the specifications defined in [SYSTEM_SPECIFICATIONS.md](SYSTEM_SPECIFICATIONS.md). Read that document first to understand WHAT needs to be built before reading HOW to build it.

## 📊 Revised Implementation Order

Based on business impact and technical dependencies, the phases should be implemented in this order:

1. **Phase 0**: Permission System Foundation (unchanged)
2. **Phase 1**: Equipment Type and Category Management (moved up)
3. **Phase 2**: Return Workflow Implementation (moved up)
4. **Phase 3**: Status Management System (moved down)
5. **Phase 4**: Edit Interface (moved down)
6. **Phase 5**: Sealed Gauge Approval Workflow (moved down)
7. **Phase 6**: Internal Calibration Forms (unchanged)
8. **Phase 7**: Notification System (unchanged)

> **📖 Rationale**: See [PHASE_ORDER_RATIONALE.md](PHASE_ORDER_RATIONALE.md) for detailed reasoning behind this order.

## 🎯 Implementation Phases

### Phase 0: Permission System Foundation (NEW - Start Here)
**Goal**: Implement the 5-tier role hierarchy and flexible permission system

#### Database Changes Required

**1. Create roles and permissions tables:**
```sql
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  level INT NOT NULL, -- 1=Super Admin, 2=Admin, 3=QC Supervisor, 4=QC, 5=Regular User
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50) -- 'gauge', 'user', 'calibration', 'system'
);

CREATE TABLE role_permissions (
  role_id INT,
  permission_id INT,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE user_permission_overrides (
  user_id INT,
  permission_id INT,
  granted BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);
```

**2. Update users table:**
```sql
ALTER TABLE users ADD COLUMN role_id INT;
ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES roles(id);
```

#### Backend Implementation

**1. Permission checking middleware:**
```javascript
const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    const userPermissions = await getUserPermissions(req.user.id);
    if (userPermissions.includes(permissionName)) {
      next();
    } else {
      res.status(403).json({ error: 'Permission denied' });
    }
  };
};
```

**2. User creation authority:**
```javascript
const canCreateRole = (creatorRole, targetRole) => {
  const hierarchy = {
    'Super Admin': ['Admin', 'QC Supervisor', 'QC', 'Regular User'],
    'Admin': ['QC Supervisor', 'QC', 'Regular User'],
    'QC Supervisor': [],
    'QC': [],
    'Regular User': []
  };
  return hierarchy[creatorRole]?.includes(targetRole) || 
         (creatorRole === 'Super Admin' && targetRole === 'Super Admin');
};
```

#### Frontend Implementation

**1. Permission management interface:**
- Role defaults editor (Admin/Super Admin only)
- Individual user permission overrides
- Visual permission matrix

#### Testing Checklist
- [ ] 5 roles created with proper hierarchy
- [ ] User creation follows authority rules
- [ ] Base permissions work correctly
- [ ] Individual overrides function properly
- [ ] Frontend shows/hides based on permissions

---

### Phase 1: Edit Interface
**Goal**: Get Admin edit functionality working exactly as specified

#### Frontend Changes Required

**1. Details View Modal Updates:**
```javascript
// Add edit mode state
const [isEditMode, setIsEditMode] = useState(false);
const [editedGauge, setEditedGauge] = useState(null);
const [validationErrors, setValidationErrors] = useState({});

// Edit button visibility
{userRole === 'admin' && !isEditMode && (
  <button onClick={() => enterEditMode()}>Edit</button>
)}

// Edit mode buttons
{isEditMode && (
  <>
    <button onClick={() => saveChanges()}>Save</button>
    <button onClick={() => confirmCancel()}>Cancel</button>
  </>
)}
```

**2. Field Rendering Logic:**
```javascript
// Make all fields editable except timestamps/history
const renderField = (fieldName, value) => {
  const isReadOnly = ['created_at', 'updated_at', 'audit_history'].includes(fieldName);
  
  if (isEditMode && !isReadOnly) {
    return <input 
      value={editedGauge[fieldName]} 
      onChange={(e) => updateField(fieldName, e.target.value)}
      className={validationErrors[fieldName] ? 'error-highlight' : ''}
    />;
  }
  return <span>{value}</span>;
};
```

**3. Validation Implementation:**
```javascript
const validateForm = () => {
  const errors = {};
  // Add validation logic for required fields
  if (!editedGauge.name) errors.name = 'Required';
  if (!editedGauge.type) errors.type = 'Required';
  
  setValidationErrors(errors);
  
  if (Object.keys(errors).length > 0) {
    showMessage("Please complete all required fields");
    return false;
  }
  return true;
};
```

**4. Cancel Confirmation:**
```javascript
const confirmCancel = () => {
  if (hasUnsavedChanges()) {
    if (confirm("Are you sure? You'll lose unsaved changes")) {
      exitEditMode();
    }
  } else {
    exitEditMode();
  }
};
```

#### Backend Changes Required
1. **Update PUT endpoint** for gauge editing (ensure all fields can be updated)
2. **Add validation** on backend for required fields
3. **Audit logging** for edit changes
4. **Role checking** to ensure only admin can edit

#### Testing Checklist
- [ ] Edit button only shows for admin users
- [ ] All fields become editable except timestamps/history  
- [ ] Save validates and shows field highlights for errors
- [ ] Cancel shows confirmation dialog
- [ ] Changes persist after save
- [ ] Audit log entries created

---

### Phase 2: Status Management System
**Goal**: Implement the midnight job and manual status changes

#### Database Changes Required

**1. Add status transition audit table:**
```sql
CREATE TABLE status_transitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gauge_id VARCHAR(50),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by INT, -- user_id, NULL for system
  change_reason VARCHAR(255),
  change_type ENUM('automatic', 'manual'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**2. Add reason dropdowns table:**  
```sql
CREATE TABLE status_change_reasons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reason VARCHAR(100),
  applicable_statuses JSON,
  active BOOLEAN DEFAULT 1
);
```

#### Backend Implementation

**1. Daily midnight job:**
```javascript
// Add to cron scheduler
const updateCalibrationStatus = async () => {
  const overdue = await db.query(`
    SELECT * FROM gauges 
    WHERE calibration_due_date < CURDATE() 
    AND status = 'active'
  `);
  
  for (const gauge of overdue) {
    await updateGaugeStatus(
      gauge.gauge_id, 
      'calibration_due', 
      null, // system change
      'automatic', 
      'Daily calibration check'
    );
  }
};
```

**2. Manual status change endpoint:**
```javascript
app.put('/api/gauges/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { new_status, reason, custom_reason } = req.body;
  
  await updateGaugeStatus(
    req.params.id,
    new_status,
    req.user.id,
    'manual',
    custom_reason || reason
  );
});
```

#### Frontend Changes
1. **Add status change modal** with dropdown + custom text
2. **Show notifications** for calibration due while checked out
3. **Audit log display** in gauge history

---

### Phase 3: Return Workflow Implementation  
**Goal**: Implement the two-step return process

#### Key Components
1. **Return condition selection** (Good/Damaged/Needs Cleaning)
2. **QC acceptance workflow** with location confirmation
3. **"Pending QC" status** and visibility

#### Database Changes
```sql
ALTER TABLE gauges ADD COLUMN return_condition VARCHAR(50);
ALTER TABLE gauges ADD COLUMN return_notes TEXT;
ALTER TABLE gauges ADD COLUMN returned_by INT;
ALTER TABLE gauges ADD COLUMN return_date TIMESTAMP;
```

#### Workflow Implementation
1. **User return modal** with condition selection
2. **QC acceptance queue** showing pending returns
3. **Location confirmation** dialog with update option
4. **Flexible QC responses** (Select Location / Pending QC)

---

### Phase 4: Sealed Gauge Approval Workflow
**Goal**: QC/Admin approval required for sealed gauge checkout

#### Implementation Requirements
1. **Approval request system**
2. **"Pending QC" checkout status**  
3. **Notification to users** (basic message for now)
4. **Seal break tracking** with authorization

---

### Phase 5: Equipment Type and Category Management (NEW)
**Goal**: Implement 4 equipment types with category-driven data entry

#### Database Changes Required

**1. Update equipment/gauge tables:**
```sql
ALTER TABLE gauges ADD COLUMN equipment_type ENUM('thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard');
ALTER TABLE gauges ADD COLUMN category VARCHAR(50);
ALTER TABLE gauges ADD COLUMN manufacturer VARCHAR(100);
ALTER TABLE gauges ADD COLUMN model_number VARCHAR(100);
ALTER TABLE gauges ADD COLUMN resolution_accuracy VARCHAR(50);
ALTER TABLE gauges ADD COLUMN certification_number VARCHAR(100);
ALTER TABLE gauges ADD COLUMN original_cert_date DATE;

-- For calibration standards special handling
ALTER TABLE gauges ADD COLUMN can_checkout BOOLEAN DEFAULT TRUE;
ALTER TABLE gauges ADD COLUMN requires_calibration BOOLEAN DEFAULT TRUE;
```

**2. Create category configuration table:**
```sql
CREATE TABLE equipment_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_type VARCHAR(50),
  category_name VARCHAR(50),
  required_fields JSON,
  naming_format VARCHAR(200),
  validation_rules JSON,
  active BOOLEAN DEFAULT TRUE
);
```

#### Backend Implementation

**1. Category-driven validation:**
```javascript
const validateEquipmentEntry = async (equipmentData) => {
  const category = await getCategory(equipmentData.equipment_type, equipmentData.category);
  const requiredFields = category.required_fields;
  
  for (const field of requiredFields) {
    if (!equipmentData[field]) {
      throw new Error(`${field} is required for ${category.category_name}`);
    }
  }
  
  // Validate naming format
  if (!matchesFormat(equipmentData.name, category.naming_format)) {
    throw new Error(`Name must follow format: ${category.naming_format}`);
  }
};
```

**2. Special handling for Calibration Standards:**
```javascript
// Calibration Standards cannot be checked out
if (gauge.equipment_type === 'calibration_standard') {
  gauge.can_checkout = false;
  gauge.requires_calibration = false;
}
```

#### Frontend Implementation

**1. Multi-step entry form:**
- Step 1: Select Equipment Type
- Step 2: Select Category (filtered by type)
- Step 3: Dynamic form fields based on category

**2. Format enforcement:**
- Input masks for standard formats
- Real-time validation feedback
- Format examples shown

---

### Phase 6: Internal Calibration Forms (NEW)
**Goal**: Implement hand tool calibration forms with 3-point verification

#### Database Changes Required

```sql
CREATE TABLE calibration_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tool_id VARCHAR(50),
  technician_id INT,
  calibration_date DATE,
  zero_point_result ENUM('pass', 'fail'),
  zero_point_value DECIMAL(10,4),
  test_point_1_result ENUM('pass', 'fail'),
  test_point_1_value DECIMAL(10,4),
  test_point_2_result ENUM('pass', 'fail'),
  test_point_2_value DECIMAL(10,4),
  test_point_3_result ENUM('pass', 'fail'),
  test_point_3_value DECIMAL(10,4),
  overall_result ENUM('pass', 'fail'),
  adjustment_performed BOOLEAN DEFAULT FALSE,
  calibration_standard_id VARCHAR(50),
  certified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_id) REFERENCES gauges(gauge_id),
  FOREIGN KEY (technician_id) REFERENCES users(id),
  FOREIGN KEY (calibration_standard_id) REFERENCES gauges(gauge_id)
);
```

#### Backend Implementation

```javascript
app.post('/api/calibration/internal', checkPermission('perform_calibration'), async (req, res) => {
  const { tool_id, measurements, standard_used } = req.body;
  
  // Validate standard is active
  const standard = await getGauge(standard_used);
  if (standard.equipment_type !== 'calibration_standard' || standard.status !== 'active') {
    return res.status(400).json({ error: 'Invalid calibration standard' });
  }
  
  // Save calibration record
  const result = await saveCalibrationRecord({
    ...measurements,
    technician_id: req.user.id,
    calibration_standard_id: standard_used
  });
  
  // Update tool status if failed
  if (result.overall_result === 'fail') {
    await updateGaugeStatus(tool_id, 'out_of_service', 'Failed calibration');
  }
});
```

---

### Phase 7: Notification System (NEW)
**Goal**: Implement in-app notifications with user preferences

#### Database Changes Required

```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  type VARCHAR(50),
  title VARCHAR(200),
  message TEXT,
  link VARCHAR(200),
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notification_preferences (
  user_id INT PRIMARY KEY,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  summary_frequency ENUM('daily', 'weekly') DEFAULT 'daily',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notification_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) UNIQUE,
  subject_template VARCHAR(200),
  body_template TEXT,
  variables JSON,
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Backend Implementation

```javascript
const sendNotification = async (userId, type, data) => {
  const prefs = await getUserNotificationPreferences(userId);
  
  if (prefs.in_app_enabled) {
    const template = await getNotificationTemplate(type);
    const message = fillTemplate(template, data);
    
    await createNotification({
      user_id: userId,
      type: type,
      title: message.subject,
      message: message.body,
      link: data.link
    });
    
    // Send real-time update via WebSocket
    io.to(`user_${userId}`).emit('new_notification', message);
  }
};
```

---

## 🔧 Technical Architecture Decisions

### Database Schema Additions Needed
```sql
-- Status management
ALTER TABLE gauges ADD COLUMN last_status_change TIMESTAMP;
ALTER TABLE gauges ADD COLUMN status_change_reason VARCHAR(255);

-- Return workflow  
ALTER TABLE gauges ADD COLUMN return_condition VARCHAR(50);
ALTER TABLE gauges ADD COLUMN qc_notes TEXT;

-- Sealed gauge management
ALTER TABLE gauges ADD COLUMN seal_broken_by INT;
ALTER TABLE gauges ADD COLUMN seal_authorized_by INT; 
ALTER TABLE gauges ADD COLUMN seal_break_date TIMESTAMP;

-- Approval workflow
CREATE TABLE checkout_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gauge_id VARCHAR(50),
  requested_by INT,
  approved_by INT,
  status ENUM('pending', 'approved', 'denied'),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL
);
```

### API Endpoints to Implement
```javascript
// Edit interface
PUT /api/gauges/:id - Update gauge (admin only)

// Status management  
PUT /api/gauges/:id/status - Change status (admin only)
GET /api/status-change-reasons - Get dropdown options

// Return workflow
POST /api/gauges/:id/return - User return with condition
PUT /api/gauges/:id/accept-return - QC acceptance
GET /api/pending-returns - QC queue

// Sealed gauge approval
POST /api/gauges/:id/request-checkout - Request sealed checkout
PUT /api/checkout-approvals/:id - Approve/deny request
GET /api/my-requests - User's pending requests
```

### Frontend Component Structure
```
components/
├── EditInterface/
│   ├── EditModeToggle.jsx
│   ├── EditableField.jsx  
│   └── ValidationMessage.jsx
├── StatusManagement/
│   ├── StatusChangeModal.jsx
│   └── CalibrationNotification.jsx
├── ReturnWorkflow/
│   ├── ReturnModal.jsx
│   ├── QCAcceptanceModal.jsx
│   └── PendingQueueList.jsx
└── SealedGauges/
    ├── ApprovalRequest.jsx
    └── ApprovalQueue.jsx
```

### Frontend Style Guide
The system uses a comprehensive design system documented in `/frontend/src/styles/`:

#### Core Design System
- **Primary Theme**: #2c72d5 (blue) - Used for headers, links, primary actions
- **Typography**: 'Segoe UI' font family with consistent sizing (0.85rem - 2.4rem)
- **Border Radius**: 8px-16px consistently across components
- **Shadows**: Standard 0 4px 12px rgba(0,0,0,0.1) for elevation
- **Spacing**: rem-based with consistent gaps (0.5rem, 1rem, 1.5rem)

#### Color Palette
```css
/* Status Colors - Use these for gauge states */
--success: #28a745;    /* Available, Good condition */
--warning: #ffc107;    /* Due soon, Pending states */
--danger: #dc3545;     /* Overdue, Calibration due */
--info: #17a2b8;       /* At calibration, Info states */
--secondary: #6c757d;  /* Neutral actions */
```

#### Button System (Pre-defined Classes)
```css
.edit-btn       /* Light grey - Admin edit actions */
.checkout-btn   /* Blue primary - Main user action */
.checkin-btn    /* Green success - Return actions */
.transfer-btn   /* Teal info - Transfer operations */
.pending-btn    /* Yellow warning - Waiting states */
.danger-btn     /* Red danger - Blocked actions */
```

#### Modal Standards
- **Standard Modal**: `.modal-content` (max-width: 500px)
- **Wide Modal**: `.modal-wide` (max-width: 800px) 
- **Form Layout**: `.edit-form-grid` for two-column forms
- **Actions**: `.modal-actions` with `.save-btn` and `.cancel-btn`

#### Implementation Rules
1. **Always use existing CSS classes** - Don't create duplicate styles
2. **Follow naming conventions** - Use kebab-case for CSS classes
3. **Maintain color consistency** - Use defined color variables
4. **Responsive design** - Grid layouts adapt to screen size
5. **Accessibility** - Focus states and proper contrast ratios included

---

## 📋 Implementation Success Criteria

### Phase 0 Complete When (Permission System)
- [ ] 5 roles created with proper hierarchy levels
- [ ] User creation follows authority rules
- [ ] Base role permissions function correctly
- [ ] Individual permission overrides work
- [ ] Frontend permission checks implemented

### Phase 1 Complete When (Edit Interface)
- [ ] Admin can edit any field inline in details view
- [ ] Validation highlights missing fields  
- [ ] Cancel confirmation works
- [ ] Changes save and audit log entries created
- [ ] Regular users cannot access edit mode

### Phase 2 Complete When (Status Management)
- [ ] Midnight job updates calibration status
- [ ] Manual status changes require reason
- [ ] All status changes are logged with who/when/why
- [ ] Checked-out gauges show notification when overdue

### Phase 3 Complete When (Return Workflow)
- [ ] Users can return with condition selection
- [ ] QC sees pending returns with location confirmation
- [ ] QC can update location or leave pending
- [ ] Everyone can see return history

### Phase 4 Complete When (Sealed Gauge Approval)
- [ ] Sealed gauge checkout requires approval
- [ ] QC/Admin can approve/deny requests
- [ ] Seal breaks are tracked with authorization
- [ ] Users are notified of approval decisions

### Phase 5 Complete When (Equipment Types)
- [ ] 4 equipment types with category-driven entry
- [ ] Naming format validation enforced
- [ ] Required fields validated by category
- [ ] Calibration Standards have special handling
- [ ] Category management interface functional

### Phase 6 Complete When (Internal Calibration)
- [ ] Hand tool calibration forms functional
- [ ] 3-point verification process works
- [ ] Pass/fail tolerances enforced
- [ ] Failed calibrations trigger status change
- [ ] Calibration Standards dropdown populated

### Phase 7 Complete When (Notifications)
- [ ] In-app notifications display properly
- [ ] User preferences save and apply
- [ ] All 9 notification triggers work
- [ ] Admin can edit message templates
- [ ] Real-time updates via WebSocket

---

## ⚠️ Critical Implementation Notes

1. **Never guess undefined behavior** - If something isn't specified, ask for clarification
2. **Test each phase completely** before moving to next
3. **Maintain audit trails** for all changes
4. **Role permissions are critical** - wrong access = security issue
5. **Status transitions must be atomic** - prevent partial updates
6. **User experience consistency** - all modals/confirmations follow same patterns

This roadmap ensures the system will be built exactly as designed with no ambiguity or missing pieces.

---

## Document Maintenance

### **Version History**

| Version | Date | Changes Made | Author | Impact |
|---------|------|--------------|--------|--------|
| 1.0 | 2025-07-30 | Initial implementation guide with 4-phase development approach and complete technical specifications | Lead Developer + System Architect | Complete |
| 2.0 | 2025-01-30 | Added Phase 0 (Permission System), Phase 5 (Equipment Types), Phase 6 (Internal Calibration), Phase 7 (Notifications) | System Architect | Major |

**Change Impact Levels:**
- **Major**: New phases, architectural changes, different tech stack
- **Minor**: Database schema updates, new API endpoints, component additions
- **Patch**: Code examples, styling updates, success criteria adjustments

### **Update Guidelines**
When updating implementation approach:
1. **Verify against System Specifications** - ensure technical solution still meets requirements
2. **Update phase dependencies** if implementation order changes  
3. **Revise success criteria** if technical approach changes
4. **Test that database schemas** remain consistent across phases

---

## Related Documents
- **[System Specifications](SYSTEM_SPECIFICATIONS.md)** - Complete behavioral requirements
- **[Vision Document](GAUGE_TRACKING_SYSTEM_VISION.md)** - Strategic direction and goals

---

*Document Version 2.0 | Created: July 30, 2025 | Updated: January 30, 2025 | Status: Complete*