# Gauge Standardization Database Design

## Overview
This document outlines the database design decisions made for the gauge standardization system, focusing on the GO/NO GO companion relationship structure and thread gauge specifications.

## Core Design Principles

### Key Concepts
1. **Serial Numbers**: Track physical gauges (permanent)
2. **Gauge IDs**: Track system positions (e.g., SP0001A)
3. **Companion System**: GO/NO GO pairs tracked by both current serial and gauge ID
4. **Spare Management**: Gauges without assigned IDs

### Design Decisions Made Together
- **Companion Tracking**: Both by gauge ID and serial number history  
- **Thread Specifications**: Structured columns (not JSON) for searchability and indexing
- **Set Integrity**: Incomplete sets remain orphaned until dissolved
- **ID Assignment**: Same gauge position can have different serial numbers over time
- **Self-referential FK**: Chosen over junction table for companion relationships

## Column Design for Gauges Table

### Thread Gauge Specific Columns

```sql
-- Thread gauge specific columns
ALTER TABLE gauges ADD COLUMN
  -- Core thread specifications
  thread_size VARCHAR(20),          -- '.500-20', 'M10x1.5', '.750-6'
  thread_type VARCHAR(20),          -- 'standard', 'metric', 'acme', 'npt', 'sti', 'spiralock'
  thread_form VARCHAR(10),          -- 'UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ', 'UNJR', 'NPT', 'NPTF'
  thread_class VARCHAR(10),         -- '2A', '3B', '6g', '6G', '2G', '4C', 'L1', 'L2', 'L3'
  gauge_type VARCHAR(10),           -- 'plug', 'ring'
  
  -- Special attributes
  thread_hand VARCHAR(5) DEFAULT 'RH',  -- 'RH', 'LH' (right/left hand)
  acme_starts INT DEFAULT 1,            -- 1, 2, 3, 4 (for ACME multi-start)
  
  -- System fields
  system_gauge_id VARCHAR(20),      -- 'SP0001A', 'MR0015B', 'NPT0001'
  gauge_suffix CHAR(1),             -- 'A' (GO), 'B' (NO GO), NULL (NPT/spares)
  companion_gauge_id INT,           -- FK to gauges.id
  is_spare BOOLEAN DEFAULT FALSE,
  
  -- Indexes for search performance
  INDEX idx_thread_search (thread_size, thread_type, thread_class, gauge_suffix),
  INDEX idx_spare_search (is_spare, thread_size, gauge_suffix),
  INDEX idx_system_id (system_gauge_id),
  INDEX idx_companion (companion_gauge_id);
```

## Thread Classes Reference

### UN Series (Standard)
- **Forms**: UN, UNF, UNEF, UNS, UNR, UNJ, UNJR
- **External Classes**: 1A, 2A, 3A
- **Internal Classes**: 1B, 2B, 3B

### Metric ISO
- **External Classes**: 4g, 6g, 6h, 6e, 6f
- **Internal Classes**: 4G, 6G, 6H

### ACME
- **General Purpose**: 2G, 3G, 4G
- **Centralizing**: 2C, 3C, 4C, 5C
- **Multi-Start Options**: 1, 2, 3, 4

### NPT/NPTF
- **Forms**: NPT (standard), NPTF (dryseal)
- **Classes**: L1 (hand tight), L2 (external wrench), L3 (internal wrench)
- **Single gauges only** (no GO/NO GO pairs)

## Validation Rules

```sql
-- Thread form validation
ALTER TABLE gauges ADD CONSTRAINT chk_thread_form
  CHECK (
    (thread_type = 'standard' AND thread_form IN ('UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ', 'UNJR')) OR
    (thread_type = 'npt' AND thread_form IN ('NPT', 'NPTF')) OR
    (thread_type NOT IN ('standard', 'npt') AND thread_form IS NULL)
  );

-- Gauge suffix validation
ALTER TABLE gauges ADD CONSTRAINT chk_gauge_suffix  
  CHECK (
    (thread_type = 'npt' AND gauge_suffix IS NULL) OR
    (thread_type != 'npt' AND gauge_suffix IN ('A', 'B')) OR
    (is_spare = TRUE AND gauge_suffix IS NULL)
  );

-- ACME starts validation
ALTER TABLE gauges ADD CONSTRAINT chk_acme_starts
  CHECK (
    (thread_type = 'acme' AND acme_starts BETWEEN 1 AND 4) OR
    (thread_type != 'acme' AND acme_starts = 1)
  );

-- Thread class validation
ALTER TABLE gauges ADD CONSTRAINT chk_thread_class
  CHECK (
    -- NPT can have L1, L2, L3 or NULL
    (thread_type = 'npt' AND (thread_class IN ('L1', 'L2', 'L3') OR thread_class IS NULL)) OR
    -- Standard threads follow [1-3][AB] pattern
    (thread_type = 'standard' AND thread_class REGEXP '^[1-3][AB]$') OR
    -- Metric follows case-sensitive pattern
    (thread_type = 'metric' AND thread_class REGEXP '^[4-6][gGhHeEfF]$') OR
    -- ACME follows [2-5][GC] pattern
    (thread_type = 'acme' AND thread_class REGEXP '^[2-5][GC]$') OR
    -- STI and Spiralock may have their own patterns
    (thread_type IN ('sti', 'spiralock'))
  );
```

## Companion Management Tables

```sql
-- Track companion relationships and history
CREATE TABLE gauge_companion_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    gauge_id INT NOT NULL,
    old_companion_id INT,
    new_companion_id INT,
    old_companion_serial VARCHAR(100),
    new_companion_serial VARCHAR(100),
    change_reason VARCHAR(255),
    changed_by INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gauge_id) REFERENCES gauges(id),
    FOREIGN KEY (old_companion_id) REFERENCES gauges(id),
    FOREIGN KEY (new_companion_id) REFERENCES gauges(id),
    FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_gauge_history (gauge_id, changed_at)
) ENGINE=InnoDB;
```

## Example Scenarios

### 1. Standard Thread Plug Set Creation
```sql
-- GO Gauge
thread_size = '.500-20'
thread_type = 'standard'  
thread_form = 'UN'
thread_class = '2A'
gauge_type = 'plug'
system_gauge_id = 'SP0025A'
gauge_suffix = 'A'
is_spare = FALSE

-- NO GO Gauge (identical except suffix)
system_gauge_id = 'SP0025B'
gauge_suffix = 'B'
```

### 2. NPT Single Gauge
```sql
thread_size = '.500-14'
thread_type = 'npt'
thread_form = 'NPT'  -- or 'NPTF' for dryseal
thread_class = 'L1'  -- or NULL if not specified
gauge_type = 'plug'
system_gauge_id = 'NPT0001'
gauge_suffix = NULL  -- No A/B for NPT
companion_gauge_id = NULL
```

### 3. Metric Ring Gauge
```sql
thread_size = 'M10x1.5'
thread_type = 'metric'
thread_form = NULL
thread_class = '6G'  -- Uppercase G for ring
gauge_type = 'ring'
system_gauge_id = 'MR0001A'
gauge_suffix = 'A'
```

### 4. ACME Multi-Start
```sql
thread_size = '.750-6'
thread_type = 'acme'
thread_form = NULL
thread_class = '4C'  -- Centralizing
gauge_type = 'plug'
acme_starts = 2  -- 2-START
system_gauge_id = 'AC0015A'
gauge_suffix = 'A'
```

## Search Queries

### Find Matching Spares
```sql
SELECT * FROM gauges 
WHERE thread_size = '.500-20' 
  AND thread_form = 'UN' 
  AND thread_class = '2A'
  AND gauge_suffix = 'A'  -- for GO
  AND is_spare = TRUE;
```

### Find Complete Sets
```sql
SELECT g1.*, g2.serial_number as companion_serial
FROM gauges g1
JOIN gauges g2 ON g1.companion_gauge_id = g2.id
WHERE g1.gauge_suffix = 'A'  -- Start with GO gauges
  AND g1.is_spare = FALSE
  AND g2.is_spare = FALSE;
```

### Find Orphaned Gauges
```sql
SELECT * FROM gauges
WHERE companion_gauge_id IS NULL
  AND is_spare = FALSE
  AND thread_type != 'npt';  -- NPT doesn't need companions
```

## User Interface Flow

### Equipment Creation Process
```
Add New Equipment
    ↓
Select Equipment Type (Thread Gauge, Hand Tool, Large Equipment)
    ↓
Select Category/Subcategory (Standard → Plug/Ring, etc.)
    ↓
Review Selection (with Continue/Start Over/Cancel options)
    ↓
Dynamic Form (fields based on selection)
    ↓
Validation & Creation
```

### Thread Gauge Form Fields
```
Thread Size*: [.500-20]
Thread Form:  [UN ▼] (dropdown: UN, UNC, UNF, UNEF, UNS, UNR, UNJ, UNJR for Standard)
                     (dropdown: NPT, NPTF for NPT threads)
                     (blank for Metric, ACME, STI, Spiralock)
Thread Class*: [2A ▼] (dropdown based on gauge type and thread type)
Thread Hand:   [RH ▼] (RH/LH dropdown)
Multi-Start:   [1 ▼] (1, 2, 3, 4 - ACME only)

Serial Number*: [___________]
Seal Status*:   [Sealed ▼] (Sealed/Unsealed)
Calibration Certificate #*: [___________]

Create as:
○ Create new set (both gauges at once)
○ Create from existing spares  
○ Single spare gauge
```

### Set Creation Options
For "Create new set":
```
Suggested Set ID: SP0025 (next available)
Or enter custom: SP[____]

GO Serial*: [___________]
NO GO Serial*: [___________]

This will create:
- SP0025A (.500-20 UN 2A Thread Plug Gauge GO)
- SP0025B (.500-20 UN 2A Thread Plug Gauge NO GO)
```

### Thread Form Selection Logic
**Manual Selection Approach**: User selects thread form from dropdown rather than auto-population to avoid overcomplicating the system.

- **UN Series**: Manual selection from UN, UNC, UNF, UNEF, UNS, UNR, UNJ, UNJR
- **NPT Series**: Manual selection from NPT, NPTF (same pitch, different sealing method)
- **Other Types**: No thread form required (Metric, ACME, STI, Spiralock)

## ID Generation Strategy

### Sequential Numbering Approach
- Each thread type prefix maintains its own sequence
- Format: `[Prefix][4-digit-number][Suffix]`
- Never reset sequences, continue infinitely (0001→9999→10000+)
- Thread-safe generation for concurrent operations

### ID Prefixes by Thread Type
- **SP**: Standard Plug
- **SR**: Standard Ring  
- **MP**: Metric Plug
- **MR**: Metric Ring
- **AC**: ACME Plug & Ring
- **ST**: STI Plug & Ring
- **SL**: Spiralock Plug & Ring
- **NPT**: NPT Single Gauges

### Suffix Rules
- **A**: GO gauge
- **B**: NO GO gauge  
- **None**: NPT gauges (single gauges) or spare gauges without assigned IDs

## Category Table Design

Based on the master specification, we only need categories - not subcategories. The attributes like Plug/Ring (gauge type) and Digital/Dial (format) are fields on the gauge record itself.

```sql
CREATE TABLE gauge_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    equipment_type ENUM('thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'),
    category_name VARCHAR(100),
    category_code VARCHAR(20),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_equipment_type (equipment_type, is_active)
);

-- Sample data based on master spec
INSERT INTO gauge_categories (equipment_type, category_name, category_code, display_order) VALUES
-- Thread Gauge Categories
('thread_gauge', 'Standard', 'STD', 1),
('thread_gauge', 'Metric', 'MET', 2),
('thread_gauge', 'ACME', 'ACME', 3),
('thread_gauge', 'NPT', 'NPT', 4),
('thread_gauge', 'STI', 'STI', 5),
('thread_gauge', 'Spiralock', 'SPL', 6),

-- Hand Tool Categories
('hand_tool', 'Caliper', 'CAL', 1),
('hand_tool', 'Micrometer', 'MIC', 2),
('hand_tool', 'Depth Gauge', 'DEP', 3),
('hand_tool', 'Bore Gauge', 'BOR', 4),

-- Large Equipment Categories
('large_equipment', 'CMM', 'CMM', 1),
('large_equipment', 'Optical Comparator', 'OPT', 2),
('large_equipment', 'Height Gauge', 'HGT', 3),
('large_equipment', 'Surface Plate', 'SRF', 4),
('large_equipment', 'Hardness Tester', 'HRD', 5),
('large_equipment', 'Force/Torque Tester', 'FRC', 6),

-- Calibration Standard Categories
('calibration_standard', 'Gauge Block', 'GB', 1),
('calibration_standard', 'Master Ring', 'MR', 2),
('calibration_standard', 'Master Plug', 'MP', 3),
('calibration_standard', 'Reference Standard', 'RS', 4);
```

## Updated Gauge Table Columns

Based on the simplified design, the gauges table needs these additional columns:

```sql
-- Add category reference
ALTER TABLE gauges ADD COLUMN
  category_id INT,
  FOREIGN KEY (category_id) REFERENCES gauge_categories(id);

-- Hand tool specific columns
ALTER TABLE gauges ADD COLUMN
  format VARCHAR(20), -- 'digital', 'dial' for hand tools
  range_min DECIMAL(10,4), -- Already exists in current schema
  range_max DECIMAL(10,4), -- Already exists in current schema
  resolution DECIMAL(10,6); -- Resolution value for hand tools

-- The gauge_type column handles Plug/Ring for thread gauges
-- Other fields like manufacturer, model already exist
```

## Additional Design Decisions

### Calibration Receiving Process
When gauges return from external calibration:
- **Status**: Changes from `out_for_calibration` to `sealed` (thread gauges) or `available` (others)
- **Seal Status**: Automatically set to `sealed` for thread gauges
- **Calibration Dates**: 
  - For sealed gauges: No last_calibration_date needed, calibration clock starts on unseal
  - For unsealed gauges: Update last_calibration_date and calculate due date
- **Certificate**: Store new certificate number

### Seal Status and Calibration Rules
- **Sealed Gauges**: Calibration due date = Unseal date + frequency (not certificate date)
- **Mixed Seal Status Sets**: Allowed but system prefers matching seal status
- **Calibration of Sets**: Entire GO/NO GO set sent together for calibration

### Set Management
- **Set Dissolution**: Manual process by Admin/QC (not automatic when gauge damaged)
- **Incomplete Sets**: Can be repaired by adding matching spare or new gauge
- **Orphaned Gauges**: Result from manual set dissolution, become spares

### Special Calibration Options
- **"Verify Before Use"**: 
  - No fixed calibration schedule (calibration_due_date = NULL)
  - Quick verification required at checkout
  - Pass allows checkout, fail blocks it

## Questions Still To Resolve
1. Category and subcategory table design ✓
2. Migration strategy for existing data
3. Hand tool and large equipment columns ✓
4. Hand Tool ID Format (pending: CA0001 vs DCA0001)
5. Large Equipment ID Format (pending: LE0001 vs CMM001)