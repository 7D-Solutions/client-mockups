# Custom Prefix Configuration System

**Date:** 2025-01-28
**Purpose:** Document user-configurable prefix settings for gauge identification
**Status:** Planning

---

## Overview

The Fire-Proof ERP system allows administrators to customize prefixes used for generating gauge identifiers. This provides flexibility for different organizational naming conventions while maintaining systematic tracking.

## Prefix Usage by Equipment Type

### Thread Gauges

**Prefixes apply to:** Set IDs (not individual gauges)

**Individual Thread Gauge:**
```
gauge_id: "12345"        ← Serial number (user enters)
set_id: NULL             ← Not yet paired
```

**Paired Thread Gauge Set:**
```
Gauge 1: gauge_id: "12345", set_id: "SP1001"
Gauge 2: gauge_id: "12346", set_id: "SP1001"
                                    ↑
                           Generated from prefix config
```

**Set ID Generation:**
1. User pairs two thread gauges
2. System looks up category prefix (e.g., "SP" for Standard Plug)
3. System generates next sequence: `{prefix}{sequence}` → "SP1001"
4. User can accept or override to custom value

### Hand Tools

**Prefixes apply to:** Gauge IDs (system-generated)

**Hand Tool Creation:**
```
Category: Caliper → Prefix: "CA"
System generates: gauge_id: "CA0001"
                            ↑
                  Generated from prefix config
```

**User cannot override** - system-generated ID is permanent for hand tools.

### Large Equipment & Calibration Standards

**Prefixes apply to:** Gauge IDs (system-generated)

Similar to hand tools - prefix-based generation for tracking equipment.

---

## Prefix Configuration Table

**Database Table:** `gauge_id_config`

```sql
CREATE TABLE gauge_id_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,           -- Links to gauge_categories
  gauge_type VARCHAR(20),             -- 'plug', 'ring', or NULL
  prefix VARCHAR(4) NOT NULL,         -- 2-4 character prefix
  current_sequence INT DEFAULT 0,     -- Current counter
  is_locked BOOLEAN DEFAULT FALSE,    -- Prevent changes
  locked_at TIMESTAMP NULL,

  CONSTRAINT chk_prefix_format
    CHECK (LENGTH(prefix) BETWEEN 2 AND 4 AND prefix REGEXP '^[A-Z]+$'),
  UNIQUE KEY unique_prefix (prefix),
  UNIQUE KEY unique_config (category_id, gauge_type)
);
```

---

## Default Prefix Assignments

### Thread Gauges (Set IDs)

| Category | Gauge Type | Default Prefix | Example Set ID |
|----------|-----------|----------------|----------------|
| Standard | Plug | SP | SP0001 |
| Standard | Ring | SR | SR0001 |
| Metric | Plug | MP | MP0001 |
| Metric | Ring | MR | MR0001 |
| ACME | Plug/Ring | AC | AC0001 |
| NPT | Plug/Ring | NPT | NPT0001 |
| STI | Plug/Ring | ST | ST0001 |
| Spiralock | Plug/Ring | SL | SL0001 |

### Hand Tools (Gauge IDs)

| Category | Default Prefix | Example Gauge ID |
|----------|----------------|------------------|
| Caliper | CA | CA0001 |
| Micrometer | MI | MI0001 |
| Depth Gauge | DP | DP0001 |
| Bore Gauge | BO | BO0001 |

### Large Equipment (Gauge IDs)

| Category | Default Prefix | Example Gauge ID |
|----------|----------------|------------------|
| CMM | CMM | CMM0001 |
| Optical Comparator | OC | OC0001 |
| Height Gauge | HG | HG0001 |
| Surface Plate | SP | SP0001 |
| Hardness Tester | HT | HT0001 |
| Force/Torque Tester | FT | FT0001 |

### Calibration Standards (Gauge IDs)

| Category | Default Prefix | Example Gauge ID |
|----------|----------------|------------------|
| Gauge Block | GB | GB0001 |
| Master Ring | MR | MR0001 |
| Master Plug | MP | MP0001 |
| Reference Standard | RS | RS0001 |

---

## Admin Configuration Interface

### Prefix Customization Options

**Admins can configure:**

1. **Prefix Value** (2-4 uppercase letters)
   - Example: Change "CA" to "CAL" for Calipers
   - Result: gauge_id becomes "CAL0001" instead of "CA0001"

2. **Sequence Start**
   - Set starting number for counter
   - Default: 0 (first generated ID is 0001)
   - Use case: Start at 1000 for "SP1000" instead of "SP0001"

3. **Lock Configuration**
   - Prevent further changes to prefix/sequence
   - Use after initial setup to maintain consistency
   - Cannot unlock without database access

### Configuration Workflow

```
Admin Panel → Gauge Configuration → Prefix Management

[Category Selection]
Equipment Type: Thread Gauge
Category: Standard Plug
Gauge Type: Plug

[Current Configuration]
Prefix: SP
Current Sequence: 125
Status: Unlocked

[Edit Options]
New Prefix: [SP___] (2-4 letters, uppercase)
Reset Sequence: [125___] (optional)
Lock Configuration: [ ] Prevent future changes

[Save] [Cancel]
```

### Validation Rules

**System enforces:**

1. **Prefix uniqueness** - No duplicate prefixes across all categories
2. **Format validation** - Must be 2-4 uppercase letters only
3. **Sequence integrity** - Cannot decrease sequence (prevents ID collisions)
4. **Lock protection** - Locked prefixes cannot be changed without admin override

---

## Usage Examples

### Example 1: Customizing Hand Tool Prefixes

**Scenario:** Company wants longer, more descriptive prefixes

**Before:**
```
Caliper: CA0001
Micrometer: MI0001
```

**After customization:**
```
Caliper: CAL0001     (changed CA → CAL)
Micrometer: MIC0001  (changed MI → MIC)
```

**Implementation:**
1. Admin navigates to Prefix Management
2. Selects "Hand Tool" → "Caliper"
3. Changes prefix from "CA" to "CAL"
4. System generates next gauge as "CAL0126" (continues sequence)

### Example 2: Department-Specific Thread Gauge Sets

**Scenario:** Quality Control wants QC-prefixed sets

**Before:**
```
Standard Plug Sets: SP0001, SP0002, SP0003
```

**After customization:**
```
Standard Plug Sets: QC0001, QC0002, QC0003
```

**Implementation:**
1. Admin changes Standard Plug prefix: SP → QC
2. Next paired thread gauges get set_id "QC0004"
3. User can still override to custom set_id if needed

### Example 3: Starting Sequence Mid-Range

**Scenario:** Migrating from legacy system, want to avoid ID collisions

**Legacy IDs:** SP0001 through SP0500 already exist

**Configuration:**
```
Prefix: SP
Starting Sequence: 500
Lock: Yes (after confirming no conflicts)
```

**Result:** New sets start at "SP0501", avoiding legacy conflicts

---

## Advanced Patterns (Future Enhancement)

### Pattern Tokens

**Potential future feature:** Template-based ID generation

```
Available Tokens:
[PREFIX] - Category prefix (SP, CA, etc.)
[YYYY]   - Current year (2025)
[YY]     - Two-digit year (25)
[####]   - Sequence number (0001, 0002, etc.)
[DEPT]   - Department code
[CAT]    - Category abbreviation

Example Patterns:
[PREFIX]-[YYYY]-[####]  → SP-2025-0001
[DEPT]-[PREFIX][####]    → QC-SP0001
[PREFIX][YY][####]       → SP250001
```

**Status:** Documented for future consideration, not currently implemented.

---

## Migration Strategy

### Applying Custom Prefixes to Existing Data

**Scenario:** System already has gauges, admin wants to change prefix

**Options:**

1. **New gauges only** (Recommended)
   - Change prefix in config
   - Existing gauges keep old IDs
   - New gauges use new prefix
   - Result: Mixed IDs (SP0001 + QC0126 coexist)

2. **Bulk rename** (Advanced, requires planning)
   - Export all affected gauges
   - Update gauge_id/set_id in bulk
   - Update all foreign key references
   - Run migration script
   - Verify all relationships intact

**Recommendation:** Option 1 (new gauges only) to avoid data integrity risks.

---

## Technical Implementation Notes

### ID Generation Service

**Service:** `GaugeIdService.js`
**Method:** `generateSystemId(categoryId, gaugeType, isGoGauge)`

**Process:**
1. Query `gauge_id_config` for category + gauge_type
2. Get current prefix and sequence (with row lock)
3. Increment sequence atomically
4. Format: `{prefix}{sequence.padStart(4, '0')}{suffix}`
5. Return generated ID

**Thread Gauge Suffix Logic:**
- `isGoGauge = true` → Add 'A' suffix (e.g., "SP0001A")
- `isGoGauge = false` → Add 'B' suffix (e.g., "SP0001B")
- `isGoGauge = null` → No suffix (NPT single gauges)

### Set ID Suggestion

**Service:** `GaugeSetService.js` (to be implemented)
**Method:** `suggestSetId(categoryId, gaugeType)`

**Process:**
1. Query prefix config for category
2. Generate next sequence
3. Format as set_id (no A/B suffix)
4. Return suggestion to user
5. User can accept or provide custom set_id

---

## Testing Checklist

**Prefix Configuration:**
- [ ] Admin can change prefix for each category
- [ ] System validates prefix format (2-4 uppercase letters)
- [ ] System prevents duplicate prefixes
- [ ] Sequence increments correctly after prefix change
- [ ] Locked prefixes cannot be modified

**ID Generation:**
- [ ] Hand tools generate correct gauge_id with custom prefix
- [ ] Thread gauge sets suggest correct set_id with custom prefix
- [ ] User can override suggested set_id
- [ ] Sequence numbers are unique and sequential
- [ ] No ID collisions after prefix changes

**Edge Cases:**
- [ ] Changing prefix mid-sequence creates valid new IDs
- [ ] System handles sequence rollover (9999 → 10000)
- [ ] Lock mechanism prevents accidental prefix changes
- [ ] Unlocking requires appropriate admin permissions

---

## Related Documentation

- **Gauge Standardization v2.0** - Overall gauge system design
- **Database Schema** - gauge_id_config table structure
- **GaugeIdService.js** - ID generation implementation
- **Admin Module** - Prefix management UI

---

**Document Status:** Planning - Ready for implementation review
