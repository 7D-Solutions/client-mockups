# Database Implementation Checklist

**Reference**: DATABASE_SCHEMA_FINAL.md for all SQL statements

## Pre-Implementation
- [ ] Backup existing database
- [ ] Review current gauges table structure
- [ ] Verify foreign key references (users table exists)

## Create Supporting Tables (Lines 207-337 in schema doc)
- [ ] gauge_categories
- [ ] gauge_id_config  
- [ ] gauge_companion_history
- [ ] gauge_system_config

## Create Specification Tables (Lines 59-203 in schema doc)
- [ ] gauge_thread_specifications
- [ ] gauge_hand_tool_specifications
- [ ] gauge_large_equipment_specifications
- [ ] gauge_calibration_standard_specifications

## Modify Gauges Table (Lines 28-54 in schema doc)
- [ ] Run ALTER TABLE to add new columns
- [ ] Verify all indexes created
- [ ] Verify all foreign keys created

## Initial Data
- [ ] Insert gauge_categories records
- [ ] Insert gauge_system_config defaults
- [ ] Application configures prefixes in gauge_id_config

## Verification
- [ ] Test foreign key constraints
- [ ] Test unique constraints
- [ ] Run sample queries from schema doc
- [ ] Verify no errors in database log

## Post-Implementation
- [ ] Document any deviations
- [ ] Update connection strings if needed
- [ ] Grant permissions to application user