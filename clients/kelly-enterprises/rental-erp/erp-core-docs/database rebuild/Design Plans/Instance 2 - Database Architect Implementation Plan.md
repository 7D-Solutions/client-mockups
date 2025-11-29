# Instance 2 - Database Architect Implementation Plan

**Role**: Database Architect  
**Date**: 2025-08-25  
**Scope**: Complete database rebuild based on forensic findings  
**Priority**: CRITICAL - System has no access control and missing core tables

---

## Executive Summary

This implementation plan addresses critical database architecture failures identified across 6 AI forensic instances and 2 auditors. The database currently operates without any access control, is missing essential workflow tables, contains hidden automations, and violates core architectural principles.

**Critical Issues**:
- 🚨 **Zero security records** - Complete access control bypass
- 🚨 **Missing core tables** - Workflows cannot function
- ⚠️ **Hidden automations** - 11 stored procedures + 1 scheduled event
- ⚠️ **Data integrity violations** - Self-referencing companions, orphaned records
- ⚠️ **Audit trail broken** - Mutable timestamps, no hash chain

---

## Phase 1: Security Foundation [CRITICAL - Day 1 Morning]

### 1.1 Seed Core Security Model
- [ ] **Insert 4 core roles** per [DB §1]
  ```sql
  INSERT INTO core_roles (name, description, is_system_role, is_active) VALUES
  ('admin', 'System Administrator', 1, 1),
  ('user', 'Standard User', 1, 1),
  ('viewer', 'Read-Only Viewer', 1, 1),
  ('qc_operator', 'Quality Control Operator', 1, 1);
  ```

- [ ] **Insert 8 core permissions** per specification
  ```sql
  INSERT INTO core_permissions (name, code, module, description) VALUES
  ('View Gauges', 'gauge.view', 'gauge', 'View gauge listing and details'),
  ('Manage Gauges', 'gauge.manage', 'gauge', 'Create, edit, delete gauges'),
  ('Calibrate Gauges', 'gauge.calibrate', 'gauge', 'Perform calibrations'),
  ('QC Operations', 'gauge.qc', 'gauge', 'Perform QC checks'),
  ('Transfer Gauges', 'gauge.transfer', 'gauge', 'Transfer between locations'),
  ('Unseal Gauges', 'gauge.unseal', 'gauge', 'Request and approve unsealing'),
  ('View Reports', 'gauge.reports', 'gauge', 'View gauge reports'),
  ('System Admin', 'system.admin', 'core', 'Full system administration');
  ```

- [ ] **Create role-permission mappings**
  ```sql
  -- Admin gets all permissions
  INSERT INTO core_role_permissions (role_id, permission_id)
  SELECT 1, id FROM core_permissions;
  
  -- User gets standard permissions
  INSERT INTO core_role_permissions (role_id, permission_id)
  SELECT 2, id FROM core_permissions 
  WHERE code IN ('gauge.view', 'gauge.transfer', 'gauge.reports');
  
  -- Viewer gets read-only
  INSERT INTO core_role_permissions (role_id, permission_id)
  SELECT 3, id FROM core_permissions 
  WHERE code IN ('gauge.view', 'gauge.reports');
  
  -- QC Operator gets QC permissions
  INSERT INTO core_role_permissions (role_id, permission_id)
  SELECT 4, id FROM core_permissions 
  WHERE code IN ('gauge.view', 'gauge.qc', 'gauge.calibrate');
  ```

### 1.2 Fix Navigation Permission References
- [ ] **Map navigation items to actual permissions**
  ```sql
  UPDATE core_navigation SET required_permission_id = 
    (SELECT id FROM core_permissions WHERE code = 'gauge.view')
  WHERE path = '/gauges';
  
  UPDATE core_navigation SET required_permission_id = 
    (SELECT id FROM core_permissions WHERE code = 'gauge.calibrate')
  WHERE path = '/gauges/calibrations';
  
  UPDATE core_navigation SET required_permission_id = 
    (SELECT id FROM core_permissions WHERE code = 'gauge.qc')
  WHERE path = '/gauges/qc';
  
  UPDATE core_navigation SET required_permission_id = 
    (SELECT id FROM core_permissions WHERE code = 'gauge.reports')
  WHERE path = '/gauges/reports';
  ```

- [ ] **Validate all navigation paths**
  ```sql
  SELECT n.*, p.code 
  FROM core_navigation n
  LEFT JOIN core_permissions p ON n.required_permission_id = p.id
  WHERE n.required_permission_id IS NOT NULL;
  ```

### 1.3 Assign Admin User
- [ ] **Ensure at least one admin exists**
  ```sql
  INSERT INTO core_user_roles (user_id, role_id)
  SELECT 1, 1 WHERE NOT EXISTS (
    SELECT 1 FROM core_user_roles WHERE user_id = 1 AND role_id = 1
  );
  ```

**Validation Checkpoint**: 
- [ ] Verify permissions table has 8 records
- [ ] Verify roles table has 4 records
- [ ] Verify role_permissions has correct mappings
- [ ] Test login with admin user

---

## Phase 2: Core Tables Creation [CRITICAL - Day 1 Afternoon]

### 2.1 Create gauge_calibrations Table
- [ ] **Create calibration tracking table**
  ```sql
  CREATE TABLE gauge_calibrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gauge_id INT NOT NULL,
    calibration_date DATE NOT NULL,
    due_date DATE NOT NULL,
    performed_by INT NOT NULL,
    certificate_number VARCHAR(50),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    pressure DECIMAL(6,2),
    standard_used VARCHAR(100),
    result ENUM('pass', 'fail', 'conditional') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (gauge_id) REFERENCES gauges(id),
    FOREIGN KEY (performed_by) REFERENCES core_users(id),
    FOREIGN KEY (created_by) REFERENCES core_users(id),
    INDEX idx_gauge_cal (gauge_id),
    INDEX idx_due_date (due_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ```

### 2.2 Create checkouts Table
- [ ] **Create checkout workflow table**
  ```sql
  CREATE TABLE checkouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gauge_id INT NOT NULL,
    checked_out_to INT NOT NULL,
    checkout_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_return_date DATE,
    actual_return_date TIMESTAMP NULL,
    purpose VARCHAR(255),
    project_number VARCHAR(50),
    location VARCHAR(100),
    notes TEXT,
    created_by INT NOT NULL,
    returned_by INT,
    FOREIGN KEY (gauge_id) REFERENCES gauges(id),
    FOREIGN KEY (checked_out_to) REFERENCES core_users(id),
    FOREIGN KEY (created_by) REFERENCES core_users(id),
    FOREIGN KEY (returned_by) REFERENCES core_users(id),
    INDEX idx_gauge_checkout (gauge_id),
    INDEX idx_user_checkout (checked_out_to),
    INDEX idx_return_date (expected_return_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ```

### 2.3 Create core_data_state_logs Table
- [ ] **Create state machine tracking**
  ```sql
  CREATE TABLE core_data_state_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    from_state VARCHAR(50),
    to_state VARCHAR(50) NOT NULL,
    transition_reason VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES core_users(id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ```

### 2.4 Create core_notification_queue Table
- [ ] **Create async notification queue**
  ```sql
  CREATE TABLE core_notification_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    recipient_id INT NOT NULL,
    subject VARCHAR(255),
    body TEXT,
    metadata JSON,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    status ENUM('pending', 'processing', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    scheduled_for TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    attempts INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (recipient_id) REFERENCES core_users(id),
    FOREIGN KEY (created_by) REFERENCES core_users(id),
    INDEX idx_status_scheduled (status, scheduled_for),
    INDEX idx_recipient (recipient_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ```

### 2.5 Rename and Fix Audit Table
- [ ] **Rename audit_logs to core_audit_logs**
  ```sql
  RENAME TABLE audit_logs TO core_audit_logs;
  ```

- [ ] **Add missing audit fields**
  ```sql
  ALTER TABLE core_audit_logs
  ADD COLUMN hash_chain VARCHAR(64) AFTER changes,
  ADD COLUMN digital_signature TEXT AFTER hash_chain,
  ADD COLUMN previous_hash VARCHAR(64) AFTER digital_signature,
  ADD INDEX idx_hash_chain (hash_chain);
  ```

- [ ] **Fix timestamp columns**
  ```sql
  ALTER TABLE core_audit_logs
  MODIFY created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
  ```

**Validation Checkpoint**:
- [ ] Verify all tables created successfully
- [ ] Test foreign key relationships
- [ ] Verify indexes are present
- [ ] Check character sets are utf8mb4

---

## Phase 3: Data Integrity Enforcement [HIGH - Day 2 Morning]

### 3.1 Fix Gauge Status Enum
- [ ] **Backup current gauge data**
  ```sql
  CREATE TABLE gauges_backup_phase3 AS SELECT * FROM gauges;
  ```

- [ ] **Update status enum to match specification**
  ```sql
  -- First, migrate existing invalid states
  UPDATE gauges SET status = 'available' 
  WHERE status = 'pending_unseal';
  
  -- Then alter the enum
  ALTER TABLE gauges 
  MODIFY status ENUM(
    'available',
    'checked_out', 
    'calibration_due',
    'pending_qc',
    'out_of_service',
    'pending_transfer',
    'at_calibration',
    'retired'
  ) NOT NULL DEFAULT 'available';
  ```

### 3.2 Fix Companion Gauge Constraints
- [ ] **Add self-reference prevention**
  ```sql
  ALTER TABLE gauges
  ADD CONSTRAINT chk_no_self_companion 
  CHECK (companion_gauge_id IS NULL OR companion_gauge_id != id);
  ```

- [ ] **Add spare gauge companion prevention**
  ```sql
  ALTER TABLE gauges
  ADD CONSTRAINT chk_spare_no_companion
  CHECK (gauge_type != 'spare' OR companion_gauge_id IS NULL);
  ```

- [ ] **Clean up existing violations**
  ```sql
  -- Fix self-references
  UPDATE gauges SET companion_gauge_id = NULL 
  WHERE companion_gauge_id = id;
  
  -- Fix spare gauges with companions
  UPDATE gauges SET companion_gauge_id = NULL 
  WHERE gauge_type = 'spare' AND companion_gauge_id IS NOT NULL;
  ```

### 3.3 Clean Orphaned Data
- [ ] **Remove orphaned gauge_notes**
  ```sql
  DELETE FROM gauge_notes 
  WHERE gauge_id NOT IN (SELECT id FROM gauges);
  ```

- [ ] **Handle deleted user references**
  ```sql
  -- Option 1: Set to NULL
  UPDATE core_audit_logs SET user_id = NULL 
  WHERE user_id NOT IN (SELECT id FROM core_users);
  
  -- Option 2: Create placeholder user
  INSERT INTO core_users (id, username, email, first_name, last_name, is_active)
  VALUES (0, 'deleted_user', 'deleted@system.local', 'Deleted', 'User', 0);
  
  UPDATE core_audit_logs SET user_id = 0 
  WHERE user_id NOT IN (SELECT id FROM core_users WHERE id != 0);
  ```

**Validation Checkpoint**:
- [ ] Verify enum values match specification
- [ ] Confirm no self-referencing companions
- [ ] Confirm no spare gauges have companions
- [ ] Verify no orphaned records remain

---

## Phase 4: Remove Hidden Automations [HIGH - Day 2 Afternoon]

### 4.1 Document and Drop Stored Procedures
- [ ] **Export procedure definitions for documentation**
  ```sql
  SELECT ROUTINE_NAME, ROUTINE_DEFINITION 
  FROM INFORMATION_SCHEMA.ROUTINES 
  WHERE ROUTINE_SCHEMA = 'fai_db_sandbox' 
  AND ROUTINE_TYPE = 'PROCEDURE'
  INTO OUTFILE '/tmp/stored_procedures_backup.sql';
  ```

- [ ] **Drop all stored procedures**
  ```sql
  DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
  DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
  DROP PROCEDURE IF EXISTS add_col_if_missing;
  DROP PROCEDURE IF EXISTS add_index_if_missing;
  DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;
  DROP PROCEDURE IF EXISTS DropFkIfExists;
  DROP PROCEDURE IF EXISTS DropIndexIfExists;
  DROP PROCEDURE IF EXISTS ensure_index;
  DROP PROCEDURE IF EXISTS generate_next_system_id;
  DROP PROCEDURE IF EXISTS ModifyEnumIfMissing;
  DROP PROCEDURE IF EXISTS pair_thread_gauges;
  ```

### 4.2 Disable Scheduled Events
- [ ] **Document event logic**
  ```sql
  SELECT EVENT_NAME, EVENT_DEFINITION, INTERVAL_VALUE, INTERVAL_FIELD
  FROM INFORMATION_SCHEMA.EVENTS
  WHERE EVENT_SCHEMA = 'fai_db_sandbox';
  ```

- [ ] **Disable the event**
  ```sql
  ALTER EVENT expire_transfer_requests DISABLE;
  ```

- [ ] **Drop the event**
  ```sql
  DROP EVENT IF EXISTS expire_transfer_requests;
  ```

**Validation Checkpoint**:
- [ ] Verify no procedures remain
- [ ] Verify no events remain
- [ ] Document application-layer replacements needed

---

## Phase 5: Security Hardening [MEDIUM - Day 3 Morning]

### 5.1 Add JSON Schema Validation
- [ ] **Add constraints to JSON columns**
  ```sql
  -- Example for core_events.payload
  ALTER TABLE core_events
  ADD CONSTRAINT chk_payload_json CHECK (
    JSON_VALID(payload) AND
    JSON_TYPE(payload) = 'OBJECT'
  );
  
  -- Example for core_notifications.data
  ALTER TABLE core_notifications
  ADD CONSTRAINT chk_notification_data CHECK (
    data IS NULL OR (
      JSON_VALID(data) AND
      JSON_TYPE(data) = 'OBJECT'
    )
  );
  ```

- [ ] **Sanitize existing JSON data**
  ```sql
  -- Identify invalid JSON
  SELECT id, payload FROM core_events 
  WHERE NOT JSON_VALID(payload);
  
  -- Fix or remove invalid entries
  UPDATE core_events SET payload = '{}' 
  WHERE NOT JSON_VALID(payload);
  ```

### 5.2 Implement Hash Chain for Audit
- [ ] **Initialize hash chain**
  ```sql
  -- Calculate hash for existing records
  UPDATE core_audit_logs 
  SET hash_chain = SHA2(CONCAT(
    IFNULL(table_name, ''),
    IFNULL(record_id, ''),
    IFNULL(action, ''),
    IFNULL(changes, ''),
    IFNULL(user_id, ''),
    IFNULL(created_at, '')
  ), 256)
  WHERE hash_chain IS NULL;
  
  -- Set previous_hash for chain
  UPDATE core_audit_logs a1
  JOIN core_audit_logs a2 ON a2.id = (
    SELECT MAX(id) FROM core_audit_logs 
    WHERE id < a1.id
  )
  SET a1.previous_hash = a2.hash_chain
  WHERE a1.previous_hash IS NULL;
  ```

**Validation Checkpoint**:
- [ ] Test JSON constraints with invalid data
- [ ] Verify hash chain integrity
- [ ] Confirm no NULL hashes in audit log

---

## Phase 6: Performance Optimization [LOW - Day 3 Afternoon]

### 6.1 Add Missing Indexes
- [ ] **Add foreign key indexes**
  ```sql
  -- Check for missing FK indexes
  SELECT 
    kcu.TABLE_NAME,
    kcu.COLUMN_NAME,
    kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  LEFT JOIN INFORMATION_SCHEMA.STATISTICS s 
    ON kcu.TABLE_NAME = s.TABLE_NAME 
    AND kcu.COLUMN_NAME = s.COLUMN_NAME
  WHERE kcu.REFERENCED_TABLE_NAME IS NOT NULL
    AND s.INDEX_NAME IS NULL
    AND kcu.TABLE_SCHEMA = 'fai_db_sandbox';
  
  -- Add missing indexes (example)
  CREATE INDEX idx_gauge_category ON gauges(category_id);
  CREATE INDEX idx_gauge_location ON gauges(location_id);
  ```

- [ ] **Remove redundant indexes**
  ```sql
  -- Identify redundant indexes
  SELECT 
    s1.TABLE_NAME,
    s1.INDEX_NAME as redundant_index,
    s2.INDEX_NAME as covering_index
  FROM INFORMATION_SCHEMA.STATISTICS s1
  JOIN INFORMATION_SCHEMA.STATISTICS s2 
    ON s1.TABLE_NAME = s2.TABLE_NAME
    AND s1.COLUMN_NAME = s2.COLUMN_NAME
    AND s1.INDEX_NAME != s2.INDEX_NAME
    AND s1.SEQ_IN_INDEX = 1
    AND s2.SEQ_IN_INDEX = 1
  WHERE s1.TABLE_SCHEMA = 'fai_db_sandbox'
  GROUP BY s1.TABLE_NAME, s1.INDEX_NAME, s2.INDEX_NAME;
  ```

### 6.2 Character Set Standardization
- [ ] **Convert tables to utf8mb4**
  ```sql
  -- Generate conversion statements
  SELECT CONCAT(
    'ALTER TABLE ', TABLE_NAME, 
    ' CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
  ) AS conversion_sql
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'fai_db_sandbox'
    AND TABLE_COLLATION != 'utf8mb4_unicode_ci';
  ```

**Validation Checkpoint**:
- [ ] Run EXPLAIN on key queries
- [ ] Verify all tables use utf8mb4
- [ ] Check index usage statistics

---

## Rollback Procedures

### Phase 1 Rollback
```sql
DELETE FROM core_role_permissions;
DELETE FROM core_permissions;
DELETE FROM core_roles;
UPDATE core_navigation SET required_permission_id = NULL;
```

### Phase 2 Rollback
```sql
DROP TABLE IF EXISTS gauge_calibrations;
DROP TABLE IF EXISTS checkouts;
DROP TABLE IF EXISTS core_data_state_logs;
DROP TABLE IF EXISTS core_notification_queue;
RENAME TABLE core_audit_logs TO audit_logs;
```

### Phase 3 Rollback
```sql
-- Restore from backup
DROP TABLE gauges;
RENAME TABLE gauges_backup_phase3 TO gauges;
```

---

## Success Criteria

### Overall System Health
- [ ] All users can log in with appropriate permissions
- [ ] Navigation respects permission boundaries
- [ ] All workflows function end-to-end
- [ ] Audit trail captures all changes
- [ ] No hidden automations exist
- [ ] Performance meets baselines

### Specific Validations
- [ ] `SELECT COUNT(*) FROM core_permissions` returns 8
- [ ] `SELECT COUNT(*) FROM core_roles` returns 4
- [ ] All foreign keys have corresponding indexes
- [ ] No orphaned records exist
- [ ] All JSON columns validate properly
- [ ] Hash chain in audit log is unbroken

### Security Audit
- [ ] No tables accessible without permissions
- [ ] No stored procedures with DEFINER privileges
- [ ] No scheduled events modifying data
- [ ] All user actions traced in audit log

---

## Post-Implementation Tasks

1. **Update Application Code**
   - [ ] Implement transfer expiry logic in backend
   - [ ] Add gauge ID generation in application
   - [ ] Update state machine to use new enum values

2. **Documentation**
   - [ ] Update database schema documentation
   - [ ] Document new permission model
   - [ ] Create runbook for maintenance

3. **Monitoring**
   - [ ] Set up alerts for permission violations
   - [ ] Monitor audit log hash chain integrity
   - [ ] Track performance metrics

---

## Sign-Off

- [ ] Database Architect Review: ___________________ Date: ___________
- [ ] Security Team Review: _____________________ Date: ___________
- [ ] Application Team Review: __________________ Date: ___________
- [ ] Production Deployment Approval: ____________ Date: ___________

---

*This plan represents a complete database rebuild to address all critical findings. Each phase must be completed in order, with validation checkpoints preventing progression until all criteria are met.*