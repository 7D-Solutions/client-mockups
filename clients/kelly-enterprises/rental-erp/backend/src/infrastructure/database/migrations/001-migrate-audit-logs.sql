-- Migration: Migrate core_audit_log to audit_logs with enhanced security features
-- Date: 2025-08-20
-- Purpose: Update audit system to support tamper-proof logging with hash chains and digital signatures

-- Step 1: Create new audit_logs table with enhanced security features
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NULL,
    record_id INT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    event_type VARCHAR(50) DEFAULT 'system',
    severity_level VARCHAR(20) DEFAULT 'medium',
    hash_chain VARCHAR(64) NULL,
    digital_signature VARCHAR(128) NULL,
    previous_hash VARCHAR(64) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_user_id (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_table_record (table_name, record_id),
    INDEX idx_audit_timestamp (timestamp),
    INDEX idx_audit_event_type (event_type),
    INDEX idx_audit_severity (severity_level),
    INDEX idx_audit_hash_chain (hash_chain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Migrate existing data from core_audit_log to audit_logs
INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    details,
    ip_address,
    user_agent,
    event_type,
    severity_level,
    timestamp
)
SELECT 
    user_id,
    action,
    entity_type as table_name,
    entity_id as record_id,
    JSON_OBJECT(
        'old_values', old_values,
        'new_values', new_values,
        'module_id', module_id
    ) as details,
    ip_address,
    user_agent,
    CASE 
        WHEN action IN ('login', 'logout') THEN 'authentication'
        WHEN action IN ('create', 'update', 'delete') THEN 'data_modification'
        WHEN action LIKE '%error%' THEN 'system'
        WHEN action LIKE '%failed%' THEN 'security'
        ELSE 'other'
    END as event_type,
    CASE 
        WHEN action = 'delete' THEN 'critical'
        WHEN action IN ('create', 'update') THEN 'high'
        WHEN action IN ('login', 'logout') THEN 'low'
        WHEN action LIKE '%error%' THEN 'error'
        WHEN action LIKE '%failed%' THEN 'warning'
        ELSE 'medium'
    END as severity_level,
    created_at as timestamp
FROM core_audit_log
ORDER BY id;

-- Step 3: Create backup table for core_audit_log (don't delete original)
CREATE TABLE core_audit_log_backup AS SELECT * FROM core_audit_log;

-- Step 4: Add comment to indicate migration completed
ALTER TABLE audit_logs COMMENT = 'Enhanced audit log table with tamper-proof features - migrated from core_audit_log';
ALTER TABLE core_audit_log_backup COMMENT = 'Backup of original core_audit_log before migration to audit_logs';