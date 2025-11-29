# CSV Gauge Migration Plan

## Source Data
- **File**: `backend/scripts/gages.csv`
- **Records**: 409 real gauge records
- **Format**: Code, Description, Location, Suppl Cal Date, Suppl Cal Due, In Service, Sent 2 Cal, User, Cal Due

## Field Mappings

### CSV → Database
- **Code** → SET ID (create {code}-A for GO gauge, {code}-B for NO GO gauge)
- **Description** → Used to detect category, gauge type, and thread specs
- **Location** → storage_location (create if doesn't exist)
- **Suppl Cal Date** → supplier_calibrate_date (last calibration by supplier)
- **Suppl Cal Due** → supplier_calibrate_due (when supplier cert expires)
- **In Service** → Determines sealed status: has date = unsealed, no date = sealed
- **Cal Due** → calibration_due (when OUR next calibration is due)

### Auto-Detection Rules

**Category Detection** (from Description):
- UNC/UNF/UNEF → Standard
- M{number} → Metric
- NPT/NPTF → NPT
- STI → STI
- Spiralock → Spiralock
- ACME → ACME

**Gauge Type** (from Description):
- 2A/3A → ring gauge (external threads)
- 2B/3B → plug gauge (internal threads)

**Thread Specifications** (parse from Description):
- Example: ".250-28 UNF-3B" → thread_size: ".250-28", thread_form: "UNF", thread_class: "3B"

**Set vs Single Gauge**:
- **Single Gauge Indicators**: "GO ONLY", "NO GO ONLY", "NO-GO ONLY", "NEEDS HANDLE", "WEIGHT", or code ends with A/B
- **Everything Else**: Treat as SET (create both GO and NO GO)

## Migration Approach

### Current System Gap
The API does not currently support creating unsealed gauges with calibration history. Need to implement:
1. Accept `is_sealed: false` during gauge creation
2. Accept calibration date fields (supplier_calibrate_date, supplier_calibrate_due, calibration_due)
3. Set up calibration schedule when gauge created as unsealed

### Migration Method
- Use POST `/api/gauges/v2/create-set` endpoint for gauge sets
- Pre-create all storage locations from CSV
- Generate JWT token for API authentication
- Create gauge sets with proper sealed status and calibration data
- Flag uncertain items for manual review

### Migration Script
- **Location**: `backend/scripts/migrate-csv-gauge-data.js`
- **Status**: Ready, waiting for API functionality to be implemented
- **Execution**: Run via Docker container after API updates

## Next Steps
1. Implement API support for creating unsealed gauges with calibration history
2. Test API with sample CSV records
3. Execute full migration
4. Generate data quality report
5. Review flagged items
