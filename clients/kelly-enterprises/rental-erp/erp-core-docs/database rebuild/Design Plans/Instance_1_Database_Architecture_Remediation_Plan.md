# Database Architecture Remediation Plan - Instance 1

**Date**: 2025-01-25  
**Author**: Database Architect Instance 1  
**Purpose**: Comprehensive remediation plan based on AI forensics actionable report

## Executive Summary

This plan addresses critical database architecture failures identified through forensic analysis of the Fireproof ERP system. The analysis revealed 12 consensus findings with agreement levels ranging from 1/6 to 6/6 across AI instances and auditors.

## Critical Issues Summary

### 1. Security Model Failure (Agreement: 6/6)
- **Issue**: Complete absence of access control - `core_permissions`, `core_roles`, and `core_role_permissions` contain no records
- **Impact**: No authorization enforcement; navigation references non-existent permission IDs
- **Severity**: CRITICAL

### 2. Missing Core Tables (Agreement: 5/6)
- **Issue**: `gauge_calibrations`, `checkouts`, `core_data_state_logs`, `core_notification_queue` tables absent
- **Impact**: Core workflows non-functional; foreign keys broken
- **Severity**: CRITICAL

### 3. Data Integrity Violations
- **Issue**: Self-referential companion gauges, orphaned records, timestamp integrity compromised
- **Impact**: Business logic violations, data corruption risk
- **Severity**: HIGH

### 4. Hidden Database Logic
- **Issue**: 11 undocumented stored procedures with root privileges, scheduled events bypassing application
- **Impact**: Unaudited data modifications, security risk
- **Severity**: HIGH

### 5. Audit System Non-Compliance
- **Issue**: Incorrectly named table, missing fields, broken hash chain
- **Impact**: No integrity guarantee, non-compliant with [DB §7]
- **Severity**: HIGH

## Phased Implementation Plan

### Phase 1: Foundation (Partially Completed)
**Status**: In Progress  
**Completed Items**:
- ✓ gauge_transactions.user_id → actor_user_id
- ✓ gauge_location_history table creation
- ✓ gauge_companion_history columns addition
- ✓ gauges.gauge_suffix column

**Outstanding Items**:
- ❌ Core security model implementation
- ❌ Audit system compliance

### Phase 2: Security Model Implementation
**Priority**: 1 (CRITICAL)  
**Duration**: 2-3 days  
**Dependencies**: None

#### 2.1 Seed Permissions (per [DB §1.1])
```sql
-- Create 8 core permissions
INSERT INTO core_permissions (id, name, description) VALUES
(1, 'gauge.view', 'View gauge information'),
(2, 'gauge.create', 'Create new gauges'),
(3, 'gauge.update', 'Update gauge information'),
(4, 'gauge.delete', 'Delete gauges'),
(5, 'calibration.manage', 'Manage calibrations'),
(6, 'checkout.manage', 'Manage checkouts'),
(7, 'reports.view', 'View reports'),
(8, 'admin.all', 'Full administrative access');
```

#### 2.2 Seed Roles (per [DB §1.2])
```sql
-- Create 4 core roles
INSERT INTO core_roles (id, name, description) VALUES
(1, 'Admin', 'System administrator'),
(2, 'Manager', 'Department manager'),
(3, 'Technician', 'Calibration technician'),
(4, 'User', 'Standard user');
```

#### 2.3 Role-Permission Mappings (per [DB §1.3])
```sql
-- Map roles to permissions
INSERT INTO core_role_permissions (role_id, permission_id) VALUES
-- Admin: all permissions
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8),
-- Manager: all except admin
(2, 1), (2, 2), (2, 3), (2, 5), (2, 6), (2, 7),
-- Technician: view, update, calibration
(3, 1), (3, 3), (3, 5),
-- User: view only
(4, 1), (4, 7);
```

#### 2.4 Update Navigation
```sql
-- Update navigation with valid permission IDs
UPDATE core_navigation SET required_permission_id = 1 WHERE path LIKE '/gauges%';
UPDATE core_navigation SET required_permission_id = 5 WHERE path LIKE '/calibration%';
UPDATE core_navigation SET required_permission_id = 6 WHERE path LIKE '/checkout%';
UPDATE core_navigation SET required_permission_id = 8 WHERE path LIKE '/admin%';
```

### Phase 3: Audit System Compliance
**Priority**: 1 (CRITICAL)  
**Duration**: 1-2 days  
**Dependencies**: Phase 2

#### 3.1 Rename and Enhance Audit Table
```sql
-- Rename table
RENAME TABLE audit_logs TO core_audit_logs;

-- Add missing columns
ALTER TABLE core_audit_logs
ADD COLUMN hash_chain VARCHAR(64) NOT NULL AFTER changes,
ADD COLUMN previous_hash VARCHAR(64) NULL AFTER hash_chain,
ADD COLUMN signature TEXT NULL AFTER previous_hash,
ADD COLUMN verified BOOLEAN DEFAULT FALSE AFTER signature,
ADD INDEX idx_hash_chain (hash_chain),
ADD INDEX idx_previous_hash (previous_hash);
```

#### 3.2 Fix Timestamp Integrity
```sql
-- Make created_at immutable
ALTER TABLE core_audit_logs 
MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at where missing
ALTER TABLE gauges 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

### Phase 4: Create Missing Core Tables
**Priority**: 2 (HIGH)  
**Duration**: 2-3 days  
**Dependencies**: Phase 3

#### 4.1 gauge_calibrations Table
```sql
CREATE TABLE gauge_calibrations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gauge_id INT NOT NULL,
  calibration_date DATE NOT NULL,
  due_date DATE NOT NULL,
  certificate_number VARCHAR(100),
  calibrated_by VARCHAR(255),
  status ENUM('scheduled', 'in_progress', 'completed', 'failed') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  CONSTRAINT fk_gc_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  CONSTRAINT fk_gc_user FOREIGN KEY (created_by) REFERENCES core_users(id),
  INDEX idx_gauge_due (gauge_id, due_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 4.2 checkouts Table
```sql
CREATE TABLE checkouts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gauge_id INT NOT NULL,
  checked_out_to INT NOT NULL,
  checked_out_by INT NOT NULL,
  checkout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expected_return_date DATE,
  actual_return_date DATE NULL,
  purpose TEXT,
  status ENUM('checked_out', 'returned', 'overdue') DEFAULT 'checked_out',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_co_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  CONSTRAINT fk_co_user_to FOREIGN KEY (checked_out_to) REFERENCES core_users(id),
  CONSTRAINT fk_co_user_by FOREIGN KEY (checked_out_by) REFERENCES core_users(id),
  INDEX idx_gauge_status (gauge_id, status),
  INDEX idx_user_checkouts (checked_out_to, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 4.3 core_data_state_logs Table
```sql
CREATE TABLE core_data_state_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  old_state JSON,
  new_state JSON,
  changed_by INT NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dsl_user FOREIGN KEY (changed_by) REFERENCES core_users(id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 4.4 core_notification_queue Table
```sql
CREATE TABLE core_notification_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  notification_type VARCHAR(50) NOT NULL,
  recipient_id INT NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  data JSON,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  priority INT DEFAULT 5,
  attempts INT DEFAULT 0,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nq_user FOREIGN KEY (recipient_id) REFERENCES core_users(id),
  INDEX idx_status_priority (status, priority),
  INDEX idx_recipient (recipient_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Phase 5: Fix Enum and Data Integrity
**Priority**: 2 (HIGH)  
**Duration**: 2 days  
**Dependencies**: Phase 4

#### 5.1 Align Gauge Status Enum
```sql
-- Update enum to match [SS §2.1]
ALTER TABLE gauges 
MODIFY COLUMN status ENUM(
  'available',
  'checked_out',
  'at_calibration',
  'pending_transfer',
  'unavailable',
  'missing',
  'damaged'
) NOT NULL DEFAULT 'available';

-- Migrate existing data
UPDATE gauges SET status = 'pending_transfer' WHERE status = 'pending_unseal';
```

#### 5.2 Companion Logic Constraints
```sql
-- Add CHECK constraints
ALTER TABLE gauges
ADD CONSTRAINT chk_no_self_companion 
  CHECK (companion_gauge_id IS NULL OR companion_gauge_id != id),
ADD CONSTRAINT chk_spare_no_companion 
  CHECK (NOT (gauge_type = 'spare' AND companion_gauge_id IS NOT NULL));

-- Clean up violations
UPDATE gauges SET companion_gauge_id = NULL 
WHERE companion_gauge_id = id OR gauge_type = 'spare';
```

#### 5.3 JSON Schema Validation
```sql
-- Add JSON schema constraints
ALTER TABLE core_events
ADD CONSTRAINT chk_event_payload 
  CHECK (JSON_VALID(payload) AND JSON_TYPE(payload) = 'OBJECT');

ALTER TABLE core_notifications
ADD CONSTRAINT chk_notification_data 
  CHECK (data IS NULL OR (JSON_VALID(data) AND JSON_TYPE(data) = 'OBJECT'));
```

### Phase 6: Remove Hidden Logic
**Priority**: 3 (MEDIUM)  
**Duration**: 2 days  
**Dependencies**: Phase 5

#### 6.1 Document and Remove Stored Procedures
```sql
-- Document existing procedures
SELECT ROUTINE_NAME, ROUTINE_DEFINITION, DEFINER 
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_SCHEMA = 'fai_db_sandbox';

-- Drop undocumented procedures
DROP PROCEDURE IF EXISTS ModifyEnumIfMissing;
DROP PROCEDURE IF EXISTS pair_thread_gauges;
-- ... continue for all 11 procedures
```

#### 6.2 Disable Scheduled Events
```sql
-- Disable scheduled event
ALTER EVENT expire_transfer_requests DISABLE;

-- Document for application layer implementation
SELECT EVENT_NAME, EVENT_DEFINITION 
FROM INFORMATION_SCHEMA.EVENTS 
WHERE EVENT_SCHEMA = 'fai_db_sandbox';

-- Drop after implementation in backend
DROP EVENT IF EXISTS expire_transfer_requests;
```

### Phase 7: Data Cleanup
**Priority**: 3 (MEDIUM)  
**Duration**: 1 day  
**Dependencies**: Phase 6

#### 7.1 Remove Orphaned Records
```sql
-- Delete orphaned gauge_notes
DELETE FROM gauge_notes 
WHERE gauge_id NOT IN (SELECT id FROM gauges);

-- Handle deleted user references
UPDATE gauge_transactions 
SET actor_user_id = NULL 
WHERE actor_user_id NOT IN (SELECT id FROM core_users);
```

### Phase 8: Performance Optimization
**Priority**: 4 (LOW)  
**Duration**: 1 day  
**Dependencies**: Phase 7

#### 8.1 Add Missing Indexes
```sql
-- Add FK indexes
ALTER TABLE gauge_transactions ADD INDEX idx_actor_user (actor_user_id);
ALTER TABLE gauge_notes ADD INDEX idx_gauge (gauge_id);
```

#### 8.2 Charset Standardization
```sql
-- Convert to utf8mb4
ALTER TABLE gauges CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Repeat for all tables
```

## Migration Strategy

### Execution Plan
1. **Environment Setup**
   - Development environment first
   - Staging validation
   - Production deployment

2. **Backup Strategy**
   - Full database backup before each phase
   - Transaction log backups
   - Verification of backup integrity

3. **Rollback Procedures**
   - Prepared rollback scripts for each phase
   - Transaction boundaries for atomic operations
   - Rollback testing in development

4. **Validation Scripts**
   - Post-migration verification for each phase
   - Data integrity checks
   - Application compatibility testing

### Risk Mitigation

1. **Operational Risks**
   - Execute during maintenance window
   - Minimize downtime with prepared scripts
   - Real-time monitoring during migration

2. **Data Risks**
   - Comprehensive backup strategy
   - Data validation between phases
   - Audit trail of all changes

3. **Application Risks**
   - Compatibility testing after each phase
   - Feature flag for gradual rollout
   - Rollback capability at each phase

## Success Metrics

1. **Security Compliance**
   - All roles and permissions properly seeded
   - Navigation enforcement functional
   - Audit trail complete and verified

2. **Data Integrity**
   - No orphaned records
   - All constraints enforced
   - JSON validation active

3. **Performance Targets**
   - Query performance maintained or improved
   - Index usage optimized
   - No blocking operations

4. **Application Functionality**
   - All workflows operational
   - No regression in features
   - Clean error logs

## Conclusion

This comprehensive remediation plan addresses all 12 consensus findings from the forensic report. The phased approach ensures minimal disruption while establishing a secure, compliant database architecture that aligns with the Fireproof ERP v2.0 specifications.

The plan prioritizes critical security and integrity issues first, followed by functional enhancements and optimizations. Each phase builds upon the previous, creating a solid foundation for the application layer.

**Total Estimated Duration**: 12-15 days  
**Critical Path**: Phases 2-4 (5-8 days)  
**Risk Level**: High initially, reducing to Low after Phase 4