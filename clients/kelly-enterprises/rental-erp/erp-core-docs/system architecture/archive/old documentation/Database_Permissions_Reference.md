# Fireproof ERP — Database & Permissions Reference
**Version:** 1.0  
**Date:** 2025‑08‑23  
**Scope:** Canonical source of truth for schema, roles, permissions, validation rules.  
**Sources:** FINAL_PERMISSIONS_DESIGN.txt, GAUGE_STANDARDIZATION_COMPLETE.txt

---

## 0) Prime Directives
1. **Never bypass validation** — all gauge IDs, categories, and standards must match regex rules.  
2. **Audit all changes** — log old/new values with actor + timestamp.  
3. **Roles are fixed (4)** — User, QC, Admin, Super Admin.  
4. **Permissions are fixed (8)** — deny by default, explicit grant only.  
5. **Gauge IDs immutable** after creation (only notes, manufacturer, etc. editable).  
6. **Companion rules enforced** — A/B pairs required, stored in `gauge_companion_history`.  
7. **Transactions for ID generation** — prefix lock prevents race conditions.  

---

## 1) Roles & Permissions

### 1.1 Permissions (8)
```sql
INSERT INTO core_permissions (name, description) VALUES
 ('gauge.view', 'View gauges and details'),
 ('gauge.operate', 'Checkout, return, transfer gauges'),
 ('gauge.manage', 'Create, edit, retire gauges'),
 ('calibration.manage', 'Record calibration results, manage calibration'),
 ('user.manage', 'Create/edit users, assign roles'),
 ('system.admin', 'System configuration, recovery tools'),
 ('audit.view', 'View audit logs'),
 ('data.export', 'Export reports');
```

### 1.2 Roles (4)
```sql
INSERT INTO core_roles (name) VALUES
 ('User'),
 ('QC'),
 ('Admin'),
 ('Super Admin');
```

### 1.3 Role → Permission Mapping
```sql
-- User
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.name='User' AND p.name IN ('gauge.view','gauge.operate');

-- QC
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.name='QC' AND p.name IN ('gauge.view','gauge.operate','gauge.manage','calibration.manage','audit.view','data.export');

-- Admin
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.name='Admin' AND p.name IN ('gauge.view','gauge.operate','gauge.manage','calibration.manage','audit.view','data.export','user.manage');

-- Super Admin
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.name='Super Admin';
```

---

## 2) Gauge Schema Extensions

### 2.1 Gauges Table
```sql
ALTER TABLE gauges
  ADD COLUMN equipment_category ENUM('thread_gauge','hand_tool','large_equipment','standard') NOT NULL,
  ADD COLUMN system_gauge_id VARCHAR(50) UNIQUE,
  ADD COLUMN companion_gauge_id BIGINT UNSIGNED NULL,
  ADD COLUMN is_spare BOOLEAN DEFAULT 0,
  ADD COLUMN standardized_name VARCHAR(255);
```

### 2.2 Gauge Categories
```sql
CREATE TABLE gauge_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  equipment_category ENUM('thread_gauge','hand_tool','large_equipment','standard') NOT NULL
);
```

### 2.3 Gauge Companion History
```sql
CREATE TABLE gauge_companion_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  gauge_id BIGINT NOT NULL,
  companion_gauge_id BIGINT,
  old_serial VARCHAR(100),
  new_serial VARCHAR(100),
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 Gauge System Config
```sql
CREATE TABLE gauge_system_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prefix VARCHAR(10) UNIQUE NOT NULL,
  description VARCHAR(255),
  last_number INT NOT NULL DEFAULT 0,
  locked BOOLEAN DEFAULT 0
);
```

---

## 3) Specification Tables

### 3.1 Thread Gauge Specifications
```sql
CREATE TABLE gauge_thread_specifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gauge_id BIGINT NOT NULL,
  thread_type ENUM('UNC','UNF','UN','UNEF','ACME','NPT','Metric','STI','Spiralock'),
  thread_size VARCHAR(50) NOT NULL,
  thread_class VARCHAR(10) NOT NULL,
  gauge_type ENUM('plug','ring') NOT NULL,
  gauge_suffix ENUM('A','B') NULL,
  UNIQUE(gauge_id)
);
```

### 3.2 Hand Tool Specifications
```sql
CREATE TABLE gauge_handtool_specifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gauge_id BIGINT NOT NULL,
  tool_type VARCHAR(50),
  range VARCHAR(50),
  manufacturer VARCHAR(100),
  resolution VARCHAR(50),
  UNIQUE(gauge_id)
);
```

### 3.3 Large Equipment Specifications
```sql
CREATE TABLE gauge_large_equipment_specifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gauge_id BIGINT NOT NULL,
  equipment_type VARCHAR(50),
  capacity VARCHAR(50),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial VARCHAR(100),
  accuracy VARCHAR(50),
  UNIQUE(gauge_id)
);
```

### 3.4 Calibration Standards Specifications
```sql
CREATE TABLE gauge_standard_specifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gauge_id BIGINT NOT NULL,
  standard_type VARCHAR(50),
  traceability_no VARCHAR(100),
  certification_date DATE,
  location VARCHAR(100),
  UNIQUE(gauge_id)
);
```

---

## 4) Validation Rules

### 4.1 Thread Gauge Regex
- **Standard (UNC/UNF/UN/UNEF):** `^\\d+(/\\d+)?-\\d+\\s+[0-9]+[A-Za-z]?$`  
- **Metric:** `^M\\d+(\\.\\d+)?x\\d+(\\.\\d+)?\\s+[0-9]+[a-z]$`  
- **NPT:** `^\\d+(/\\d+)?-\\d+\\s+NPT$`  
- **ACME:** `^\\d+(/\\d+)?-\\d+\\s+ACME$`  

### 4.2 Companion Rules
- Every `plug` gauge with suffix `A` must have a `companion_gauge_id` pointing to suffix `B`.  
- Every `ring` gauge with suffix `A` must have a companion `B`.  
- If a companion link changes, record in `gauge_companion_history`.  

### 4.3 Spare Rules
- `is_spare=1` must not be counted in complete sets.  
- Spare gauges must have unique system_gauge_id but can share specs.  

---

## 5) ID Generation Logic

```sql
-- Lock row for prefix and increment
UPDATE gauge_system_config
SET last_number = last_number + 1, locked = 1
WHERE prefix = 'SP' AND locked = 0;

-- Generate ID
SELECT CONCAT(prefix, LPAD(last_number, 4, '0')) AS next_id
FROM gauge_system_config
WHERE prefix = 'SP';

-- Release lock
UPDATE gauge_system_config SET locked=0 WHERE prefix='SP';
```

---

## 6) Common Queries

### 6.1 Find Complete GO/NO GO Pairs
```sql
SELECT a.id AS plug_id, b.id AS ring_id
FROM gauges a
JOIN gauges b ON a.companion_gauge_id=b.id
WHERE a.gauge_suffix='A' AND b.gauge_suffix='B';
```

### 6.2 Find Available Spares
```sql
SELECT * FROM gauges WHERE is_spare=1 AND status='available';
```

### 6.3 Next Calibration Due
```sql
SELECT * FROM gauges
WHERE calibration_due_date <= CURDATE()
AND status NOT IN ('retired','out_of_service');
```

---

## 7) Audit Requirements
- Every insert/update/delete in `gauges`, `*_specifications`, `gauge_system_config`, `gauge_companion_history` must log to `audit_logs`.  
- Fields: `{ entity, entity_id, action, old_value, new_value, actor_id, reason, created_at }`.

---

**End of Database & Permissions Reference (v1.0)**
