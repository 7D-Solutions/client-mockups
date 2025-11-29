# Gauge Standardization Master Specification

## Executive Summary
This document consolidates all gauge standardization specifications developed through detailed design sessions. It covers Thread Gauges, Hand Tools, Large Equipment, and Calibration Standards with complete workflows, business rules, and implementation requirements.

## Table of Contents
1. [Overall System Design](#overall-system-design)
2. [Thread Gauge Standardization](#thread-gauge-standardization)
3. [Hand Tool Standardization](#hand-tool-standardization)
4. [Large Equipment Standardization](#large-equipment-standardization)
5. [Calibration Standards Standardization](#calibration-standards-standardization)
6. [System Features](#system-features)
7. [Implementation Requirements](#implementation-requirements)

## Overall System Design

### Core Principles
1. **Category-Driven Workflow**: Equipment Type → Category → Dynamic Form
2. **Standardized Naming**: System-generated names based on specifications
3. **Dual ID System**: System IDs + optional custom IDs for legacy support
4. **Configurable Prefixes**: 2-4 character prefixes customizable during setup
5. **Traceability**: Serial numbers track physical items, IDs track system positions

### Universal Flow
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

## Thread Gauge Standardization

### Categories and Workflow

**Equipment Type**: Thread Gauge

**Thread Types**:
1. Standard (uses decimal format: .500-20, .112-40)
2. Metric (M10x1.5)
3. ACME (.750-6 ACME)
4. NPT (.500-14 NPT) - Single gauges only
5. STI (follows standard pattern)
6. Spiralock (follows standard pattern)

**Gauge Types**:
- Plug (External threads)
- Ring (Internal threads)

**Thread Forms** (Standard only):
- UN (Unified)
- UNJR (Unified with controlled root radius)
- UNS (Unified Special)

**Classes**:
- Plug Standard: 1A, 2A, 3A
- Ring Standard: 1B, 2B, 3B
- Plug Metric: 4g, 6g, 6h
- Ring Metric: 4G, 6G, 6H
- ACME: 2G, 3G (General), 4C, 5C (Centralizing)

### ID Structure

**Format**: `[Type][Sequential][Suffix]`

- **SP** = Standard Plug (SP0001A/B)
- **SR** = Standard Ring (SR0001A/B)
- **MP** = Metric Plug (MP0001A/B)
- **MR** = Metric Ring (MR0001A/B)
- **NPT** = NPT threads (NPT0001 - no A/B)
- **AC** = ACME threads (AC0001A/B)
- **ST** = STI threads (ST0001A/B)
- **SL** = Spiralock threads (SL0001A/B)

**Suffixes**:
- A = GO gauge
- B = NO GO gauge
- -LH = Left Hand thread
- No suffix for NPT (single gauges)

**Sequential Numbering**: 0001-9999, then 10000+ (never resets)

### Companion System

**GO/NO GO Pairing**:
- All thread gauges except NPT require pairs
- Companion field links: SP0001A ↔ SP0001B
- Empty companion = spare gauge
- Sets checkout together, not individually

**Visibility Rules**:
- Regular users: See complete sets only
- QC/Admin: See everything (sets, spares, incomplete)

### Form Fields by Seal Status

**SEALED Gauges**:
- Serial Number* (required)
- Gauge ID (optional - can be spare)
- Seal Status* = Sealed
- Initial Calibration Date (disabled/greyed)
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

### Special Cases

**NPT Threads**:
- Single gauges only (no GO/NO GO)
- ID format: NPT0001 (no A/B suffix)
- Used for taper thread engagement depth

**ACME Multi-Start**:
- Options: Single Start, 2-START, 3-START, 4-START
- Format: `.750-6 ACME 4C 2-START Thread Plug Gauge GO`

**Set Creation Options**:
1. Create new set (both gauges at once)
2. Create from existing spares
3. "Both (Set)" option creates two linked entries

**New Set Creation**:
```
Suggested Set ID: SP0025 (next available)
Or enter custom: SP[____]

GO Serial*: [___________]
NO GO Serial*: [___________]

This will create:
- SP0025A (.500-20 UN 2A Thread Plug Gauge GO)
- SP0025B (.500-20 UN 2A Thread Plug Gauge NO GO)
```

### Spare Management

**Types**:
1. New sealed spares (no gauge ID)
2. Orphaned unsealed spares (from broken sets)

**Search**: Available by size without gauge ID assignment

**Mixed Seal Status**: Allowed but system prefers matching

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

Example:
- SP1001A (S/N: ABC123) damaged
- Spare (S/N: XYZ789) becomes new SP1001A
- SP1001B companion updated to point to new serial

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

### Calibration Clock Rules
- **Unsealed gauge**: Due date = Calibration date + frequency
- **Sealed gauge**: Due date = Unseal date + frequency (clock starts when unsealed)

### Search and Display

**Smart Search**:
- Type ".500" → finds all .500" gauges
- Type "2A" → finds all class 2A gauges
- Type "GO" → finds all GO gauges

**User Interface Display**:
```
.500-20 UN 2A Thread Plug Gauge Set
Set ID: SP1001
├── GO: SP1001A (Serial: ABC123) - Cal Due: 01/2025
└── NO GO: SP1001B (Serial: NOGO-12346) - Cal Due: 03/2025
Location: Bin A-15
[Checkout Set]
```

### Retirement and Archival

**Soft Delete Process**:
- Status → "retired"
- is_deleted → 1
- Removed from active searches
- Full history preserved for admin/compliance

**Retired Gauge Options**:
- Can become spares if functional
- Stay retired if damaged
- Maintain complete calibration history

## Hand Tool Standardization

### Categories and Workflow

**Equipment Type**: Hand Tool

**Tool Types**:
1. Caliper
2. Micrometer  
3. Depth Gauge
4. Bore Gauge

**Format Options**:
- Digital
- Dial

### Form Fields

**Standard Fields**:
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

### Key Specifications

- **Never sealed** (always unsealed state)
- **Range validation**: Min must be < Max
- **Auto-generated names**: `0-6" Digital Caliper`

### ID Format
- **Decision**: Simple sequential format
- **Examples**: CA0001, MI0001, DG0001, BG0001
- **Rationale**: Format (digital/dial) is data stored separately

## Large Equipment Standardization

### Categories and Workflow

**Equipment Type**: Large Equipment

**Equipment Categories**:
1. CMM (Coordinate Measuring Machine)
2. Optical Comparator
3. Height Gauge
4. Surface Plate
5. Hardness Tester
6. Force/Torque Tester

### Form Fields

**All equipment types use same fields**:
```
Equipment ID: [LE0001] (auto-generated)
Serial Number*: [___________]
Manufacturer*: [___________]
Model*: [___________]
Location*: [QC ▼ / Production Floor] (admin-expandable)
Calibration Frequency: [365 days] (admin default)
Initial Calibration Date*: [___________]
Calibration Certificate #*: [___________]
Description: [___________] (optional)
```

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

### Key Specifications

- **Cannot be checked out** (fixed location)
- **No access restrictions** (any employee)
- **Status options**: In Service, Out for Calibration, Under Maintenance, Out of Service
- **Auto-generated names**: `Mitutoyo PJ-300 Optical Comparator`

### ID Format
- **Format**: LE0001 (unified sequential for all large equipment)
- **Configurable**: Prefix can be customized during initial setup

## Calibration Standards Standardization

### Categories and Workflow

**Equipment Type**: Calibration Standard

**Standard Types**:
1. Gauge Block
2. Master Ring  
3. Master Plug
4. Reference Standard

### Form Fields

**All calibration standards use these fields**:
```
Equipment ID: CS[0001] (auto-generated)
Standard Type*: [Gauge Block ▼]
Serial Number*: [___________]
Manufacturer*: [___________]
Model*: [___________]
Nominal Value*: [___________]
Uncertainty (±)*: [___________]
Units*: [inches ▼ / mm / microinches]
Traceability Organization: [NIST ▼ / NPL / PTB]
Traceability Certificate #: [___________]
Location*: [Standards Lab ▼ / QC Lab]
Initial Calibration Date*: [___________]
Calibration Certificate #*: [___________]
Calibration Frequency: [365 days] (admin default)
Description: [___________] (optional)
```

### Key Specifications

- **High security**: Access restricted to qualified personnel
- **Environmental requirements**: Often require controlled temperature/humidity
- **Cannot be checked out**: Fixed location in standards lab
- **Traceability required**: Must maintain chain to national standards
- **Auto-generated names**: `0.1000" Grade 0 Gauge Block`
- **Special calibration**: Often sent to specialized labs

### ID Format
- **Format**: CS0001 (unified sequential for all standards)
- **Configurable**: Prefix can be customized during initial setup

## System Features

### Dual ID System
- **System Gauge ID**: Standardized format (SP0001A, CA0001, LE0001, CS0001)
- **Custom ID**: Optional field for customer's existing numbering
- **Display Preferences**: User can choose to display system ID, custom ID, or both
- **Search**: Works with either ID type

### Configurable ID Prefixes ✓
- **Setup Only**: Prefixes can be customized during initial system setup
- **Format**: 2-4 characters (e.g., SP, CAL, LGEQ, CSTD)
- **Locking**: Prefixes lock after first gauge is created
- **Validation**: System prevents duplicate prefixes
- **Decision Status**: RESOLVED

### Hand Tool ID Format ✓
- **Decision**: Simple sequential format
- **Examples**: CA0001, MI0001, DG0001, BG0001
- **Rationale**: Format (digital/dial) is data stored separately
- **Decision Status**: RESOLVED

### Large Equipment ID Format ✓
- **Decision**: Unified sequential format
- **Examples**: LE0001 for all types (CMM, Optical Comparator, etc.)
- **Rationale**: Small quantities don't benefit from type-specific prefixes
- **Decision Status**: RESOLVED

### Thread Gauge Categories ✓
- **Decision**: Simplified to "Standard" category for all decimal threads
- **Combined**: Previous "Fractional" and "Numbered" categories
- **Rationale**: Both use decimal format (.500-20, .112-40), no user-facing distinction
- **Decision Status**: RESOLVED

## Pending Decisions

### Remaining Decision

1. **Terminology Confirmation**
   - "Calibrate Before Use" vs "Verify Before Use"
   - **Status**: Need exact terminology from domain expert
   - **Context**: Applies to hand tools without fixed calibration schedules

## Implementation Requirements

### Database Architecture

**Multi-Table Design**: 
- Main `gauges` table with shared fields only
- Four separate specification tables for type-specific data
- Avoids wide table with 60+ columns and numerous NULLs

**New Tables**:
1. `gauge_categories`: Equipment types and categories
2. `gauge_id_config`: Configurable prefix management
3. `gauge_companion_history`: GO/NO GO change tracking
4. `gauge_thread_specifications`: Thread gauge specific fields
5. `gauge_hand_tool_specifications`: Hand tool specific fields
6. `gauge_large_equipment_specifications`: Large equipment fields
7. `gauge_calibration_standard_specifications`: Standards fields
8. `gauge_system_config`: System-wide settings

**Modified Tables**:
- `gauges`: Add equipment_category, system_gauge_id, custom_id, companion_gauge_id, standardized_name, etc.

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

### Validation Requirements

**Thread Gauges**:
- Size format validation (decimal for standard, M for metric)
- Class validation per gauge type
- Companion relationship integrity
- Validation patterns:
  - Standard: `/^\.(\d{3})-(\d+)\s+(UN|UNJR|UNS)\s+(\d+[A-B])$/`
  - Metric: `/^M(\d+)x([\d.]+)\s+(\d+[g-h|G-H])$/`
  - NPT: `/^\.(\d{3})-(\d+)\s+NPT$/`
  - ACME Single: `/^\.(\d{3})-(\d+)\s+ACME\s+([2-5][GC])$/`
  - ACME Multi: `/^\.(\d{3})-(\d+)\s+ACME\s+([2-5][GC])\s+(\d)-START$/`

**Hand Tools**:
- Range validation (Min < Max)
- Resolution from approved list
- Employee selection for employee-owned

**Large Equipment**:
- Unique serial numbers
- Valid location selection
- Due date calculations

### Admin Configuration

**Calibration Frequency Defaults**:
- Thread Gauges: 730 days (2 years)
- Hand Tools: 365 days (1 year)
- Large Equipment: 365 days (varies by type)
- All configurable by admin

**Location Management**:
- Add/edit location options
- Set defaults per equipment type

**ID Pattern Configuration**:
- Configurable 2-4 character prefixes during initial setup
- Prefixes lock after first gauge created
- Format: [PREFIX][SEQUENCE] (e.g., SP0001, CAL0025, LGEQ0100)
- No complex token patterns - keep it simple

## Why This Design Works

- **Clean Architecture**: Multi-table design avoids 60+ column tables with NULLs
- **Flexibility**: Configurable prefixes + custom IDs support any numbering system
- **Scalability**: Easy to add new equipment types without modifying existing tables
- **User-Friendly**: Dual ID system lets users work with familiar numbers
- **Compliance Ready**: Full audit trails for GO/NO GO companion changes
- **Simple**: 4 equipment types, clean separation, straightforward workflows

---

*This master specification represents the complete gauge standardization system with 4 equipment types, multi-table architecture, and flexible ID management. Updated to reflect all design decisions from the database architecture session.*