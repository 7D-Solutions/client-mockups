# Fireproof ERP — Permissions & Validation Reference
**Version:** 1.0  
**Date:** 2025‑08‑23  
**Scope:** Canonical source of truth for roles, permissions, and validation rules.  
**Sources:** FINAL_PERMISSIONS_DESIGN.txt, GAUGE_STANDARDIZATION_COMPLETE.txt

## Table of Contents

1. [Prime Directives](#prime-directives)
2. [Roles & Permissions](#roles--permissions)
   - 2.1 [Permissions (8)](#permissions-8)
   - 2.2 [Roles (4)](#roles-4)
   - 2.3 [Role → Permission Mapping](#role--permission-mapping)
3. [Validation Rules](#validation-rules)
   - 3.1 [Thread Gauge Regex](#thread-gauge-regex)
   - 3.2 [Companion Rules](#companion-rules)
   - 3.3 [Spare Rules](#spare-rules)
   - 3.4 [Other Equipment Validation](#other-equipment-validation)
4. [ID Generation Logic](#id-generation-logic)
5. [Common Queries](#common-queries)
6. [Audit Requirements](#audit-requirements)

---

## 1. Prime Directives
1. **Never bypass validation** — all gauge IDs, categories, and standards must match regex rules.  
2. **Audit all changes** — log old/new values with actor + timestamp.  
3. **Roles are fixed (4)** — User, QC, Admin, Super Admin.  
4. **Permissions are fixed (8)** — deny by default, explicit grant only.  
5. **Gauge IDs immutable** after creation (only notes, manufacturer, etc. editable).  
6. **Companion rules enforced** — A/B pairs required, stored in `gauge_companion_history`.  
7. **Transactions for ID generation** — prefix lock prevents race conditions.  

---

## 2. Roles & Permissions

### 2.1 Permissions (8)
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

### 2.2 Roles (4)
```sql
INSERT INTO core_roles (name) VALUES
 ('User'),
 ('QC'),
 ('Admin'),
 ('Super Admin');
```

### 2.3 Role → Permission Mapping
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

## 3. Validation Rules

### 3.1 Thread Gauge Regex
- **Standard (UNC/UNF/UN/UNEF):** `^\\d+(/\\d+)?-\\d+\\s+[0-9]+[A-Za-z]?$`  
- **Metric:** `^M\\d+(\\.\\d+)?x\\d+(\\.\\d+)?\\s+[0-9]+[a-z]$`  
- **NPT:** `^\\d+(/\\d+)?-\\d+\\s+NPT$`  
- **ACME:** `^\\d+(/\\d+)?-\\d+\\s+ACME$`  

### 3.2 Companion Rules
- Every `plug` gauge with suffix `A` must have a `companion_gauge_id` pointing to suffix `B`.  
- Every `ring` gauge with suffix `A` must have a companion `B`.  
- If a companion link changes, record in `gauge_companion_history`.  

### 3.3 Spare Rules
- `is_spare=1` must not be counted in complete sets.  
- Spare gauges must have unique system_gauge_id but can share specs.  

### 3.4 Other Equipment Validation
- **Hand Tools**: Tool type must be in ('caliper', 'micrometer', 'depth_gauge', 'bore_gauge')
- **Large Equipment**: Fixed location equipment cannot be checked out
- **Calibration Standards**: Access restricted to qualified personnel only

---

## 4. ID Generation Logic

```sql
-- Lock row for prefix and increment
UPDATE gauge_id_config
SET current_sequence = current_sequence + 1, is_locked = TRUE
WHERE prefix = 'SP' AND is_locked = FALSE;

-- Generate ID
SELECT CONCAT(prefix, LPAD(current_sequence, 4, '0'), 'A') AS next_id
FROM gauge_id_config
WHERE prefix = 'SP';

-- Release lock
UPDATE gauge_id_config SET is_locked = FALSE WHERE prefix='SP';
```

---

## 5. Common Queries

### 5.1 Find Complete GO/NO GO Pairs
```sql
SELECT a.id AS plug_id, b.id AS ring_id
FROM gauges a
JOIN gauges b ON a.companion_gauge_id=b.id
WHERE a.gauge_suffix='A' AND b.gauge_suffix='B';
```

### 5.2 Find Available Spares
```sql
SELECT * FROM gauges WHERE is_spare=1 AND status='available';
```

### 5.3 Next Calibration Due
```sql
SELECT * FROM gauges
WHERE calibration_due_date <= CURDATE()
AND status NOT IN ('retired','out_of_service');
```

---

## 6. Audit Requirements
- Every insert/update/delete in `gauges`, `*_specifications`, `gauge_id_config`, `gauge_system_config`, `gauge_companion_history` must log to `audit_logs`.  
- Fields: `{ entity, entity_id, action, old_value, new_value, actor_id, reason, created_at }`.

---

**End of Database & Permissions Reference (v1.0)**
