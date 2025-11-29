# Gauge Standardization Complete Specification

## Overview
This document captures the complete gauge entry standardization system as designed through detailed requirements gathering. It covers the category-driven workflow, naming conventions, ID structure, and traceability requirements.

**Note**: This specification extends and refines the requirements in SYSTEM_SPECIFICATIONS.md with implementation-ready details. Where this document differs from SYSTEM_SPECIFICATIONS.md (e.g., decimal format vs fractions), this document represents the agreed-upon implementation approach.

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

## Gauge ID Structure

### ID Format
- **SP** = Standard Plug
- **SR** = Standard Ring
- **MP** = Metric Plug
- **MR** = Metric Ring
- **XXXX** = Sequential number (e.g., 1001)
- **A/B** = GO (A) or NO GO (B)
- **-LH** = Left Hand thread suffix (when applicable)

### Examples
- SP1001A = Standard Plug GO gauge
- SP1001B = Standard Plug NO GO gauge
- SP1001 = The set (contains both A & B)
- SP1001A-LH = Standard Plug GO gauge, Left Hand thread

### Admin Configuration
Admin can configure ID patterns:
```
Plug Gauge Format: [SP]-[YYYY]-[###]
Available tokens: [PG/RG], [DEPT], [YYYY], [YY], [###], [CAT]
```

## Naming Standardization

### Format Rules
All thread gauges use decimal format (no fractions):
- Fractional: 1/2-20 → `.500-20`
- Numbered: 4-40 → `.112-40`
- Custom sizes: `.307-32`
- Metric: `M10x1.5` (stays as-is)

### Generated Names
System automatically generates standardized names:
- `.500-20 UN 2A Thread Plug Gauge GO`
- `.250-20 UN 2B Thread Ring Gauge NO GO`
- `M10x1.5 6g Thread Plug Gauge GO`

## Form Entry Rules

### Dynamic Field Requirements

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

### Thread Size Entry
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

### Additional Fields
- Manufacturer* (required)
- Location: [QC Storage] (default)
- Serial Number: (optional for some types)
- Comments: (optional)
- Calibration Frequency: 365 days (admin-set default, requires approval to change)

## Set Management and Pairing

### Companion Gauge System
- GO and NO GO gauges are linked via companion field
- SP1001A companion → SP1001B
- SP1001B companion → SP1001A
- Empty companion field = spare gauge

### Display to Users
```
Search: .500-20 2A

Results:
□ .500-20 UN 2A Thread Plug Gauge Set (SP1001)
   └── Contains: GO (S/N: ABC123) + NO GO (S/N: NOGO-12346)

Individual spares:
□ .500-20 UN 2A Thread Plug Gauge GO - Spare
   Gauge ID: [Not Assigned] | S/N: GO-98765
```

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
- Typically only need GO gauge (no NO GO)
- Tapered thread checking depth of engagement

### ACME Threads
- Classes: 2G, 3G, 4C (different from standard)
- May include multi-start designation
- Left-hand thread option

### Other Equipment Types
**Note**: This specification focuses on Thread Gauge standardization. For complete requirements on other equipment types, refer to SYSTEM_SPECIFICATIONS.md:

- **Hand Tools** (Section 8): Calipers, Micrometers, etc. with naming format `0-6" Digital Caliper`
- **Large Equipment** (Section 8): CMM, Optical Comparator with specific format requirements
- **Calibration Standards** (Section 8): Special handling with no recalibration workflow
- **Internal Calibration Forms** (Section 9): 3-point verification pattern for hand tools

## Retirement and Archival

### Soft Delete Process
When gauge set is retired:
- Status → "retired"
- is_deleted → 1
- Removed from active searches
- Full history preserved for admin/compliance

### Spare Inventory
Retired gauge serials can:
- Become spares again if functional
- Stay retired if damaged
- Maintain complete history

## Implementation Notes

### Validation Patterns
Thread size formats to validate:
- Standard: `/^\.(\d{3})-(\d+)\s+(UN|UNJR|UNS)\s+(\d+[A-B])$/`
- Metric: `/^M(\d+)x([\d.]+)\s+(\d+[g-h|G-H])$/`
- NPT: `/^\.(\d{3})-(\d+)\s+NPT$/`

### Required Backend Services
1. Gauge standardization service for name generation
2. Serial number tracking with audit trail
3. Companion gauge management
4. Dynamic form field validation

### Database Considerations
- Serial number as unique identifier
- Gauge ID represents position/role
- Companion relationships tracked
- Complete audit trail for all changes
- Soft delete for retirement

---

*This specification represents the complete gauge standardization system as designed through detailed requirements analysis.*