# Gauge Standardization - Business Rules and Workflows

## Overview
This document captures the business rules, workflows, and UI requirements for the gauge standardization system. For database schema and technical implementation, see DATABASE_SCHEMA_FINAL.md.

## Table of Contents
1. [Universal Workflow](#universal-workflow)
2. [Thread Gauge Business Rules](#thread-gauge-business-rules)
3. [Hand Tool Business Rules](#hand-tool-business-rules)
4. [Large Equipment Business Rules](#large-equipment-business-rules)
5. [Calibration Standards Business Rules](#calibration-standards-business-rules)
6. [System-Wide Business Rules](#system-wide-business-rules)
7. [UI Workflows and Display Rules](#ui-workflows-and-display-rules)

## Universal Workflow

### Equipment Creation Flow
```
Add New Equipment
    ↓
Select Equipment Type
    ↓
Select Category/Subcategory
    ↓
Review Selection
    ↓
Dynamic Form (fields based on selection)
    ↓
Validation & Creation
```

### Confirmation Process
After selections, user sees confirmation:
```
You are creating:
- [Equipment Type and Category]
- [Key Specifications]

[Approve] [Go Back] [Cancel]
```

## Thread Gauge Business Rules

### Visibility Rules
- **Regular Users**: See complete sets only (no orphaned gauges or spares)
- **QC/Admin**: See everything (sets, spares, incomplete pairs)

### Companion System Rules
- All thread gauges except NPT require GO/NO GO pairs
- Companion field links: SP0001A ↔ SP0001B
- Empty companion field = spare gauge
- Sets checkout together, not individually
- System prefers matching seal status when pairing

### Form Fields by Seal Status

**SEALED Gauges**:
- Serial Number* (required)
- Gauge ID (optional - can be spare)
- Seal Status* = Sealed
- Initial Calibration Date (disabled/greyed out)
- Calibration Certificate #* (required)

**UNSEALED Gauges**:
- Serial Number* (required)
- Gauge ID* (required - must be assigned)
- Seal Status* = Unsealed  
- Initial Calibration Date* (required)
- Calibration Certificate #* (required)

### Naming Convention
**Format**: `[Size] [Thread] [Class] Thread [Type] Gauge [GO/NO GO]`

Examples:
- `.500-20 UN 2A Thread Plug Gauge GO`
- `M10x1.5 6g Thread Plug Gauge NO GO`
- `.750-6 ACME 2G Thread Plug Gauge GO`
- `.500-14 NPT Thread Plug Gauge` (no GO/NO GO)

### Special Thread Rules

**NPT Threads**:
- Single gauges only (no GO/NO GO)
- Used for taper thread engagement depth
- No A/B suffix in ID

**ACME Multi-Start**:
- Options: Single Start, 2-START, 3-START, 4-START
- Format: `.750-6 ACME 4C 2-START Thread Plug Gauge GO`

**Left-Hand Threads**:
- Display suffix: -LH (e.g., SP0001A-LH)
- Display only - not stored in gauge ID

### Set Creation Options
1. Create new set (both gauges at once)
2. Create from existing spares
3. "Both (Set)" option creates two linked entries

### New Set Creation UI
```
Suggested Set ID: SP0025 (next available)
Or enter custom: SP[____]

GO Serial*: [___________]
NO GO Serial*: [___________]

This will create:
- SP0025A (.500-20 UN 2A Thread Plug Gauge GO)
- SP0025B (.500-20 UN 2A Thread Plug Gauge NO GO)
```

### Spare Management Rules

**Spare Display (QC/Admin Only)**:
```
Gauge Management > Spare Inventory

Available Spares:
┌────────────────────────────────────────────────┐
│ □ .500-20 UN 2A GO | S/N: GO-98765 | Unsealed │
│ □ .500-20 UN 2A GO | S/N: GO-12345 | Sealed   │
│ □ .500-20 UN 2A NO GO | S/N: NOGO-23456 | Sealed │
└────────────────────────────────────────────────┘
```

**Creating Sets from Spares**:
```
Best Matches (Same Seal Status):
○ GO: GO-12345 (Sealed) + NO GO: NOGO-23456 (Sealed) ✓
○ GO: GO-98765 (Unsealed) + NO GO: NOGO-11111 (Unsealed) ✓

Other Options (Mixed Status):
○ GO: GO-12345 (Sealed) + NO GO: NOGO-11111 (Unsealed) ⚠️
```

### Replacement Workflow
When replacing damaged gauge:
1. Original gauge marked damaged
2. Spare assigned to gauge ID position
3. Companion links maintained
4. Full audit trail created

### Calibration Clock Rules
- **Unsealed gauge**: Due date = Calibration date + frequency
- **Sealed gauge**: Due date = Unseal date + frequency (clock starts when unsealed)

## Hand Tool Business Rules

### Key Specifications
- **Never sealed** (always unsealed state)
- **Range validation**: Min must be < Max
- **Auto-generated names**: `0-6" Digital Caliper`

### Ownership Rules

**Company-Owned**:
- Stored at company location
- Available for checkout
- Location tracking required
- Appears in main search

**Employee-Owned**:
- No checkout (employee keeps)
- No location tracking
- Calibration tracking only
- Only in employee's dashboard
- Not available to others

### Calibration Options
1. **Standard Schedule**: Default 365 days
2. **Verify Before Use**: No fixed schedule
   - Quick verification at checkout
   - Pass = proceed
   - Fail = block checkout

### Form Fields
```
Serial Number*: [___________]
Gauge ID: [CA0001] (auto-generated)
Range*: Min [___] Max [___] Unit: [inches ▼ / mm]
Resolution*: [0.0005" ▼] (dropdown)
Manufacturer*: [___________]
Ownership*: [Company ▼ / Employee]
Initial Calibration Date*: [___________] (always required)
Calibration Certificate #*: [___________]
Calibration Frequency: [365 days] (admin default)
```

**Conditional Fields**:
- If Company: Location required
- If Employee: Owner selection required

## Large Equipment Business Rules

### Key Specifications
- **Cannot be checked out** (fixed location)
- **No access restrictions** (any employee can use)
- **Status options**: In Service, Out for Calibration, Under Maintenance, Out of Service
- **Auto-generated names**: `Mitutoyo PJ-300 Optical Comparator`

### Location Management
- Simple dropdown: QC, Production Floor
- Admin can add locations via settings
- Location changes allowed (no complex workflow)

### Calibration Tracking
**Options**:
1. In-house calibration
2. On-site service (vendor comes to you)

**Tracking Fields**:
- Calibration Date
- Due Date
- Certificate Number
- Pass/Fail
- Provider (Internal or Company Name)

## Calibration Standards Business Rules

### Key Specifications
- **High security**: Access restricted to qualified personnel
- **Environmental requirements**: Often require controlled temperature/humidity
- **Cannot be checked out**: Fixed location in standards lab
- **Traceability required**: Must maintain chain to national standards
- **Auto-generated names**: `0.1000" Grade 0 Gauge Block`
- **Special calibration**: Often sent to specialized labs

### Required Fields
- Standard Type (Gauge Block, Master Ring, Master Plug, Reference Standard)
- Nominal Value with Uncertainty (±)
- Traceability Organization and Certificate
- Location (restricted to Standards Lab, QC Lab)

## System-Wide Business Rules

### ID Generation Rules
- Sequential numbering: 0001-9999, then 10000+ (never resets)
- Thread-safe generation for concurrent operations
- Prefixes lock after first gauge created
- Each equipment type maintains its own sequence

### Search and Display Rules

**Smart Search**:
- Type ".500" → finds all .500" gauges
- Type "2A" → finds all class 2A gauges
- Type "GO" → finds all GO gauges
- Works with either system ID or custom ID

**User Interface Display**:
```
.500-20 UN 2A Thread Plug Gauge Set
Set ID: SP1001
├── GO: SP1001A (Serial: ABC123) - Cal Due: 01/2025
└── NO GO: SP1001B (Serial: NOGO-12346) - Cal Due: 03/2025
Location: Bin A-15
[Checkout Set]
```

### Retirement Rules

**Soft Delete Process**:
- Status → "retired"
- is_deleted → 1
- Removed from active searches
- Full history preserved for admin/compliance

**Retired Gauge Options**:
- Can become spares if functional
- Stay retired if damaged
- Maintain complete calibration history

### Audit Trail Requirements
```
Companion Change History:
Date: 2025-01-15 14:30
Action: Companion Changed
Gauge: SP1001B (NOGO-12346)
Old Companion: SP1001A (GO-12345)
New Companion: SP1001A (GO-98765)
Reason: GO gauge damaged during use
Changed By: John Smith (QC)
```

## UI Workflows and Display Rules

### Equipment Selection UI
1. Clear category selection with visual hierarchy
2. Confirmation step before form display
3. Dynamic form generation based on selections
4. Contextual help for each field

### Display Preferences
- User can choose: System ID only, Custom ID only, or Both
- Set-based display for thread gauges
- Individual display for other equipment types
- Role-based visibility controls

### Validation Rules
- Real-time validation as user types
- Clear error messages with correction hints
- Prevent form submission until all required fields valid
- Smart defaults based on equipment type

## Implementation Requirements

### Backend Services Needed

1. **Standardization Service**
   - Name generation based on rules
   - ID generation with sequential numbering
   - Validation patterns per type

2. **Companion Management**
   - Link/unlink GO and NO GO gauges
   - Set creation workflows
   - Spare matching algorithms

3. **API Endpoints**
   - Category configuration retrieval
   - Next ID generation
   - Set creation (both new and from spares)
   - Validation endpoints

### Frontend Components

1. **CategorySelectionModal**
   - Multi-step selection process
   - Dynamic subcategory loading
   - Confirmation before form

2. **Refactored CreateGaugeModal**
   - Dynamic form generation
   - Conditional field display
   - Seal status logic

3. **Enhanced Search**
   - Set vs individual display
   - Role-based visibility
   - Spare inventory views

### Validation Patterns

**Thread Gauges**:
- Standard: `/^\.(\d{3})-(\d+)\s+(UN|UNJR|UNS)\s+(\d+[A-B])$/`
- Metric: `/^M(\d+)x([\d.]+)\s+(\d+[g-h|G-H])$/`
- NPT: `/^\.(\d{3})-(\d+)\s+NPT$/`
- ACME Single: `/^\.(\d{3})-(\d+)\s+ACME\s+([2-5][GC])$/`
- ACME Multi: `/^\.(\d{3})-(\d+)\s+ACME\s+([2-5][GC])\s+(\d)-START$/`

### Admin Configuration

**Calibration Frequency Defaults**:
- Thread Gauges: 730 days (2 years)
- Hand Tools: 365 days (1 year)
- Large Equipment: 365 days (varies by type)
- Calibration Standards: 365 days (admin default)
- All configurable by admin

**Location Management**:
- Add/edit location options
- Set defaults per equipment type

**ID Pattern Configuration**:
- Configurable 2-4 character prefixes during initial setup
- Prefixes lock after first gauge created
- Format: [PREFIX][SEQUENCE] (e.g., SP0001, CAL0025, LGEQ0100)
- No complex token patterns - keep it simple

---

*This document captures the business logic and workflows that complement the technical database design in DATABASE_SCHEMA_FINAL.md*