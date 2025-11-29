# Database Migration Guide

**Version:** 1.0  
**Date:** 2025-09-05  
**Purpose:** Guide for migrating from legacy wide-table structure to normalized gauge standardization schema

## Migration Overview

This guide provides step-by-step instructions for migrating from the legacy single-table gauge structure to the normalized multi-table architecture defined in DATABASE_COMPLETE_SCHEMA.md.

## Pre-Migration Checklist

- [ ] Backup entire database
- [ ] Document current gauge_id values for mapping
- [ ] Identify all NULL columns in current structure
- [ ] Review DATABASE_COMPLETE_SCHEMA.md thoroughly
- [ ] Test migration scripts in development environment

## Migration Phases

### Phase 1: Core Infrastructure Setup

**1.1 Create Core Tables** (if not existing)
```sql
-- Refer to DATABASE_COMPLETE_SCHEMA.md for complete core table definitions
-- This phase ensures all core infrastructure is in place
```

### Phase 2: Gauge Standardization Tables

**2.1 Create Category Tables**
```sql
-- Create gauge_categories table
CREATE TABLE gauge_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_type ENUM('thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard') NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipment_type (equipment_type, is_active),
  UNIQUE KEY unique_category (equipment_type, category_name)
) ENGINE=InnoDB;

-- Populate categories
INSERT INTO gauge_categories (equipment_type, category_name, display_order) VALUES
('thread_gauge', 'Standard', 1),
('thread_gauge', 'Metric', 2),
('thread_gauge', 'ACME', 3),
('thread_gauge', 'NPT', 4),
('hand_tool', 'Caliper', 1),
('hand_tool', 'Micrometer', 2),
-- Continue with all categories from DATABASE_COMPLETE_SCHEMA.md
```

**2.2 Create Specification Tables**
```sql
-- Create all 4 specification tables
-- See DATABASE_COMPLETE_SCHEMA.md sections 2-5 for complete definitions
```

### Phase 3: Data Migration

**3.1 Identify Equipment Types**
```sql
-- Map existing type values to new equipment_category
UPDATE gauges 
SET equipment_category = CASE
    WHEN type LIKE '%thread%' OR type LIKE '%plug%' OR type LIKE '%ring%' THEN 'thread_gauge'
    WHEN type LIKE '%caliper%' OR type LIKE '%micrometer%' THEN 'hand_tool'
    WHEN type LIKE '%cmm%' OR type LIKE '%comparator%' THEN 'large_equipment'
    WHEN type LIKE '%standard%' OR type LIKE '%block%' THEN 'calibration_standard'
    ELSE NULL
END;
```

**3.2 Migrate Thread Gauge Specifications**
```sql
-- Extract thread specifications from wide table
INSERT INTO gauge_thread_specifications (
    gauge_id,
    thread_size,
    thread_type,
    thread_form,
    thread_class,
    gauge_type
)
SELECT 
    id,
    CONCAT(IFNULL(range_min, ''), '-', IFNULL(range_max, '')),
    'standard', -- Default, needs manual review
    'UN', -- Default, needs manual review
    '2A', -- Default, needs manual review
    CASE 
        WHEN type LIKE '%plug%' THEN 'plug'
        WHEN type LIKE '%ring%' THEN 'ring'
        ELSE 'plug'
    END
FROM gauges
WHERE equipment_category = 'thread_gauge';
```

**3.3 Generate System IDs**
```sql
-- Generate standardized IDs for existing gauges
-- This requires application logic to properly sequence
-- Pseudo-code:
-- For each category:
--   Get next sequence from gauge_id_config
--   Generate system_gauge_id with proper prefix
--   Update gauge record
```

**3.4 Identify and Link Companions**
```sql
-- Find potential GO/NO GO pairs based on naming patterns
-- This requires manual review and verification
SELECT 
    g1.id as go_id,
    g1.gauge_id as go_legacy_id,
    g2.id as nogo_id,
    g2.gauge_id as nogo_legacy_id
FROM gauges g1
JOIN gauges g2 ON 
    g1.equipment_category = 'thread_gauge' AND
    g2.equipment_category = 'thread_gauge' AND
    g1.type = g2.type AND
    g1.id != g2.id AND
    g1.gauge_id LIKE '%GO%' AND
    g2.gauge_id LIKE '%NO%GO%';
```

### Phase 4: Cleanup and Validation

**4.1 Data Integrity Checks**
```sql
-- Verify all gauges have equipment_category
SELECT COUNT(*) FROM gauges WHERE equipment_category IS NULL;

-- Verify all categorized gauges have specifications
SELECT g.id, g.equipment_category
FROM gauges g
LEFT JOIN gauge_thread_specifications ts ON g.id = ts.gauge_id
LEFT JOIN gauge_hand_tool_specifications ht ON g.id = ht.gauge_id
LEFT JOIN gauge_large_equipment_specifications le ON g.id = le.gauge_id
LEFT JOIN gauge_calibration_standard_specifications cs ON g.id = cs.gauge_id
WHERE g.equipment_category IS NOT NULL
AND ts.gauge_id IS NULL 
AND ht.gauge_id IS NULL 
AND le.gauge_id IS NULL 
AND cs.gauge_id IS NULL;
```

**4.2 Archive Old Columns** (Optional - after verification)
```sql
-- Create backup table with old structure
CREATE TABLE gauges_legacy_backup AS SELECT * FROM gauges;

-- Remove deprecated columns (only after thorough testing)
-- ALTER TABLE gauges DROP COLUMN old_column_name;
```

## Rollback Plan

If migration fails:

1. **Immediate Rollback**
```sql
-- Drop new tables (if safe)
DROP TABLE IF EXISTS gauge_thread_specifications;
DROP TABLE IF EXISTS gauge_hand_tool_specifications;
DROP TABLE IF EXISTS gauge_large_equipment_specifications;
DROP TABLE IF EXISTS gauge_calibration_standard_specifications;

-- Restore from backup
-- Use database backup taken in pre-migration phase
```

2. **Partial Rollback**
- Keep structure but clear migrated data
- Re-run migration with fixes

## Post-Migration Validation

1. **Verify Record Counts**
```sql
SELECT equipment_category, COUNT(*) 
FROM gauges 
GROUP BY equipment_category;
```

2. **Verify Specifications**
```sql
-- Check each specification table has expected records
SELECT 'thread' as type, COUNT(*) FROM gauge_thread_specifications
UNION ALL
SELECT 'hand_tool', COUNT(*) FROM gauge_hand_tool_specifications
-- Continue for all types
```

3. **Test Application Functionality**
- All CRUD operations
- Search functionality
- Reporting accuracy

## Common Issues and Solutions

### Issue: NULL equipment_category
**Solution**: Manual review required - examine type field and other attributes

### Issue: Missing specifications
**Solution**: Create default records with minimal required fields, flag for review

### Issue: Companion pairing errors
**Solution**: Use gauge_companion_history to track manual corrections

## Migration Timeline Estimate

- Phase 1: 1 hour (infrastructure)
- Phase 2: 2 hours (new tables)
- Phase 3: 4-8 hours (data migration, depends on data volume)
- Phase 4: 2-4 hours (validation and cleanup)
- **Total**: 1-2 days including testing

---

*Always test migrations in a development environment before production deployment*