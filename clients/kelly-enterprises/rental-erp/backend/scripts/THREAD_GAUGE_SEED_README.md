# Thread Gauge Seeding Scripts

This directory contains scripts for populating the database with realistic thread gauge data.

## Scripts

### 1. `seed-thread-gauges.js`
Main seeding script that populates the database with thread gauges.

**Features:**
- Generates ~150 thread gauges (configurable)
- Creates gauge sets (paired GO/NO-GO gauges)
- Creates spare gauges (unpaired GO and NO-GO)
- Creates individual gauges
- Includes sealed and unsealed gauges
- Covers multiple thread types (UNC, UNF, NPT, ACME)
- Includes both plug and ring gauges
- Automatically creates companion relationships for sets

**Usage:**

```bash
# Dry run (preview without making changes)
node backend/scripts/seed-thread-gauges.js --dry-run

# Execute with default count (150 gauges)
node backend/scripts/seed-thread-gauges.js

# Execute with custom count
node backend/scripts/seed-thread-gauges.js --count=200
```

**Distribution:**
- **60%** in sets (paired GO/NO-GO) - e.g., 90 gauges in 45 sets
- **30%** spares - e.g., 45 spare gauges
- **10%** individuals - e.g., 15 individual gauges

### 2. `verify-thread-gauge-seed.js`
Verification script to inspect thread gauges in the database.

**Usage:**

```bash
node backend/scripts/verify-thread-gauge-seed.js
```

**Output:**
- Total gauge count
- Breakdown by status, type, manufacturer
- Sealed vs unsealed counts
- Spare gauge counts
- Set counts and samples
- GO vs NO-GO distribution
- Data integrity checks

### 3. `delete-thread-gauges.js`
Soft-delete all thread gauges (sets `is_deleted = 1`).

**Usage:**

```bash
node backend/scripts/delete-thread-gauges.js
```

## Prerequisites

Before running the seed script:

1. **Database must be running** (MySQL on port 3307)
2. **Thread gauge category must exist** in `gauge_categories` table
3. **At least one active user** must exist in `core_users` table
4. **Environment variables** must be configured (`.env` file)

## Workflow

### Initial Setup

1. **Preview what will be created:**
   ```bash
   node backend/scripts/seed-thread-gauges.js --dry-run
   ```

2. **Execute the seed:**
   ```bash
   node backend/scripts/seed-thread-gauges.js
   ```

3. **Verify the results:**
   ```bash
   node backend/scripts/verify-thread-gauge-seed.js
   ```

### Reset and Re-seed

1. **Delete existing thread gauges:**
   ```bash
   node backend/scripts/delete-thread-gauges.js
   ```

2. **Re-seed with new data:**
   ```bash
   node backend/scripts/seed-thread-gauges.js
   ```

## Data Structure

### Gauge Sets (Paired)
Each set contains exactly 2 gauges:
- **GO gauge** (`is_go_gauge = 1`)
- **NO-GO gauge** (`is_go_gauge = 0`)
- Both share the same `set_id` (e.g., `SET-0001`)
- Both have matching specifications (thread size, type, class)
- Companion relationship recorded in `companion_history` table

Example:
```
SET-0001 (Sealed)
  GO:    TG-0001 - UNC 1/2-13 PLUG GO
  NO-GO: TG-0002 - UNC 1/2-13 PLUG NO-GO
```

### Spare Gauges
Individual GO or NO-GO gauges not paired with companions:
- `is_spare = 1`
- `set_id = NULL`
- Can be paired later with compatible spares
- Always unsealed (`is_sealed = 0`)

### Individual Gauges
Standard gauges not marked as spares:
- `is_spare = 0`
- `set_id = NULL`
- Available for checkout
- Can be sealed or unsealed

## Thread Specifications

The seed script includes realistic thread specifications:

### UNC (Unified National Coarse)
- 1/4-20, 5/16-18, 3/8-16, 7/16-14, 1/2-13, 9/16-12
- 5/8-11, 3/4-10, 7/8-9, 1-8, 1-1/8-7, 1-1/4-7
- Class: 2A

### UNF (Unified National Fine)
- 1/4-28, 5/16-24, 3/8-24, 7/16-20, 1/2-20
- 9/16-18, 5/8-18, 3/4-16, 7/8-14, 1-12
- Class: 2A

### NPT (National Pipe Thread)
- 1/8-27, 1/4-18, 3/8-18, 1/2-14
- 3/4-14, 1-11.5, 1-1/4-11.5, 1-1/2-11.5
- Class: NPT

### ACME
- 1/2-10, 5/8-8, 3/4-6, 1-5, 1-1/4-5
- Class: 2G

## Manufacturers

Realistic manufacturers included:
- Vermont Gage
- Thread Check
- Deltronic
- Meyer Gage
- Mahr
- Mitutoyo

## Database Tables

The seed script populates:

1. **`gauges`** - Main gauge records
   - Basic gauge information
   - Status, sealed state, spare flag
   - Set ID for paired gauges

2. **`gauge_thread_specifications`** - Thread-specific data
   - Thread size, type, class
   - Gauge type (plug/ring)
   - GO/NO-GO designation

3. **`companion_history`** - Pairing relationships
   - Links GO and NO-GO gauges
   - Tracks pairing/unpairing actions

## Customization

To modify the seed data:

1. **Change distribution percentages:**
   ```javascript
   const setsCount = Math.floor(TARGET_COUNT * 0.6 / 2); // 60% in sets
   const sparesCount = Math.floor(TARGET_COUNT * 0.3); // 30% spares
   ```

2. **Add/modify thread specifications:**
   ```javascript
   const THREAD_SPECS = {
     UNC: [
       { size: '1/4-20', class: '2A' },
       // Add more...
     ]
   };
   ```

3. **Change sealed/unsealed ratio:**
   ```javascript
   const isSealed = Math.random() > 0.5 ? 1 : 0; // 50/50 split
   ```

## Troubleshooting

### Error: "No thread_gauge category found"
**Solution:** Create a thread gauge category first:
```sql
INSERT INTO gauge_categories (name, equipment_type, prefix, default_calibration_days)
VALUES ('Thread Gauges', 'thread_gauge', 'TG', 365);
```

### Error: "No active users found"
**Solution:** Ensure at least one active user exists in `core_users` table.

### Error: "Duplicate entry for gauge_id"
**Solution:** Thread gauges with those IDs already exist. Either:
- Delete existing thread gauges first
- Modify the script to use a different prefix

## Safety Features

- **Dry-run mode** prevents accidental data creation
- **Transaction support** ensures all-or-nothing insertion
- **Rollback on error** prevents partial data corruption
- **Foreign key validation** ensures data integrity
- **Duplicate checking** prevents ID conflicts

## Notes

- The script uses transactions for atomicity
- All timestamps are set to current time
- Created_by user is automatically selected from active users
- Gauge IDs follow the category prefix pattern (e.g., `TG-0001`)
- Set IDs follow the format `SET-0001`, `SET-0002`, etc.
