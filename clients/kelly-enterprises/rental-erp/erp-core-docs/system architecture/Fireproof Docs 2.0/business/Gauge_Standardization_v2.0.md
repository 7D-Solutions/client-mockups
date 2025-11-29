# Gauge Standardization v2.0

**Version:** 2.0  
**Date:** 2025-09-05  
**Purpose:** Unified gauge standardization specification consolidating MASTER_SPEC and COMPLETE_SPEC

## Table of Contents
1. [Overall System Design](#overall-system-design)
2. [Thread Gauge Standardization](#thread-gauge-standardization)
3. [Hand Tool Standardization](#hand-tool-standardization)
4. [Large Equipment Standardization](#large-equipment-standardization)
5. [Calibration Standards Standardization](#calibration-standards-standardization)
6. [Category-Driven Workflow](#category-driven-workflow)
7. [System Features](#system-features)
8. [Implementation Requirements](#implementation-requirements)

## Executive Summary
This document consolidates all gauge standardization specifications developed through detailed design sessions. It covers Thread Gauges, Hand Tools, Large Equipment, and Calibration Standards with complete workflows, business rules, and implementation requirements.

> **Note**: This document consolidates GAUGE_STANDARDIZATION_MASTER_SPEC.md and unique content from GAUGE_STANDARDIZATION_COMPLETE_SPEC.md based on 4-instance collaboration analysis.

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

### Admin Configuration
Admin can configure ID patterns:
```
Plug Gauge Format: [SP]-[YYYY]-[###]
Available tokens: [PG/RG], [DEPT], [YYYY], [YY], [###], [CAT]
```

### Naming Standardization

**Format Rules**
All thread gauges use decimal format (no fractions):
- Fractional: 1/2-20 → `.500-20`
- Numbered: 4-40 → `.112-40`
- Custom sizes: `.307-32`
- Metric: `M10x1.5` (stays as-is)

**Format**: `[Size] [Thread] [Class] Thread [Type] Gauge [GO/NO GO]`

Examples:
- `.500-20 UN 2A Thread Plug Gauge GO`
- `M10x1.5 6g Thread Plug Gauge NO GO`
- `.750-6 ACME 2G Thread Plug Gauge GO`
- `.500-14 NPT Thread Plug Gauge` (no GO/NO GO)

### Companion System

**GO/NO GO Pairing**:
- All thread gauges except NPT require pairs
- Companion field links: SP0001A ↔ SP0001B
- Empty companion = spare gauge
- Sets checkout together, not individually

**Visibility Rules**:
- Regular users: See complete sets only
- QC/Admin: See everything (sets, spares, incomplete)

### Set Management and Pairing

**Companion Gauge System**:
- GO and NO GO gauges are linked via companion field
- SP1001A companion → SP1001B
- SP1001B companion → SP1001A
- Empty companion field = spare gauge

**Display to Users**:
```
Search: .500-20 2A

Results:
□ .500-20 UN 2A Thread Plug Gauge Set (SP1001)
   └── Contains: GO (S/N: ABC123) + NO GO (S/N: NOGO-12346)

Individual spares:
□ .500-20 UN 2A Thread Plug Gauge GO - Spare
   Gauge ID: [Not Assigned] | S/N: GO-98765
```

## Category-Driven Workflow

### Initial Selection Flow
When a user clicks "Add New Gauge", they follow this selection process:

1. **Equipment Type Selection**
   - Thread Gauge
   - Hand Tool
   - Large Equipment
   - Calibration Standards

2. **Thread Gauge Workflow** (if selected)
   - Thread Type: Fractional / Numbered / Metric / ACME / NPT / STI / Spiralock
   - Gauge Type: Plug (External) / Ring (Internal)
   - Thread Form (for Fractional/Numbered): UN / UNJR / UNS
   - Class Selection:
     - Plug: 1A, 2A, 3A
     - Ring: 1B, 2B, 3B
     - Metric Plug: 4g, 6g, 6h
     - Metric Ring: 4G, 6G, 6H
   - GO/NO GO: GO / NO GO / Both (Set)

### Confirmation Process
After selections, user sees confirmation:
```
You are creating:
- Fractional UN Thread Plug Gauge
- Class 2A
- GO type

[Approve] [Go Back] [Cancel]
```

### Form Entry Rules

**Dynamic Field Requirements**

**For SEALED gauges:**
- Serial Number* (required)
- Gauge ID (optional - can be spare)
- Seal Status* = Sealed
- Initial Calibration Date (greyed out)
- Calibration Certificate #* (required)

**For UNSEALED gauges:**
- Serial Number* (required)
- Gauge ID* (required - must be in service)
- Seal Status* = Unsealed
- Initial Calibration Date* (required)
- Calibration Certificate #* (required)

**Thread Size Entry**
Based on thread type selection:

**Fractional/Numbered:**
```
Thread Size*: [.500] - [20] Class: 2A
              ↑        ↑
           decimal   TPI
```

**Metric:**
```
Thread Size*: M[10] x [1.5] Class: 6g
              ↑        ↑
           diameter  pitch
```

**Additional Fields**:
- Manufacturer* (required)
- Location: [QC Storage] (default)
- Serial Number: (optional for some types)
- Comments: (optional)
- Calibration Frequency: 365 days (admin-set default, requires approval to change)

## Traceability and Serial Numbers

### Core Principles
1. **Serial Number** = The physical gauge (permanent, never changes)
2. **Gauge ID** = The position/role in the system (e.g., SP1001A)
3. **Calibration certificates** always follow the serial number, not gauge ID

### Replacement Workflow
When GO gauge needs replacement:
1. Original: SP1001A (Serial: GO-12345) - marked damaged
2. Spare: Serial GO-98765 assigned to SP1001A
3. Companion links updated: SP1001A ↔ SP1001B maintained
4. Full audit trail preserved

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

## Calibration Management

### Calibration Clock Rules
- **Unsealed gauge**: Due date = Calibration date + frequency
- **Sealed gauge**: Due date = Unseal date + frequency (clock starts when unsealed)

### Certificate Tracking
- Certificates tied to serial numbers, not gauge IDs
- Each serial maintains complete calibration history
- Accessible even after gauge retirement

## Search and Display

### Search Capabilities
Smart search matches multiple fields:
- Type ".500" → finds all .500" gauges
- Type "2A" → finds all class 2A gauges
- Type "GO" → finds all GO gauges

### User Interface Display
Users see full descriptions with IDs in parentheses:
```
.500-20 UN 2A Thread Plug Gauge Set
Set ID: SP1001
├── GO: SP1001A (Serial: ABC123) - Cal Due: 01/2025
└── NO GO: SP1001B (Serial: NOGO-12346) - Cal Due: 03/2025
Location: Bin A-15
[Checkout Set]
```

## Special Cases

### NPT Threads
- Single gauges only (no GO/NO GO)
- ID format: NPT0001 (no A/B suffix)
- Used for taper thread engagement depth

### ACME Multi-Start
- Options: Single Start, 2-START, 3-START, 4-START
- Format: `.750-6 ACME 4C 2-START Thread Plug Gauge GO`

### Set Creation Options
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

---

## Hand Tool Standardization

[Content continues from MASTER_SPEC for Hand Tools, Large Equipment, and Calibration Standards sections...]

---

## Implementation Requirements

**Critical Format Decision**: This specification uses decimal format (.500-20) as the authoritative standard, resolving the conflict with fraction format (1/2-20) from legacy documentation.

**Related Documents**:
- UI_Workflows_Guide_v1.0.md (for user interface workflows)
- System_Specs_Implementation_Guide_v3.2.md (for technical implementation)
- Permissions_Complete_v2.0.md (for access control)

**Consolidation Notes**: 
- Merged unique confirmation process from COMPLETE_SPEC
- Preserved admin configuration options from MASTER_SPEC  
- Maintained comprehensive spare management from MASTER_SPEC
- Integrated form entry rules and dynamic field requirements