# Fireproof ERP — Consolidated Forensic Report (AI Instances + AI Auditors)

**Scope:** Unified actionable report consolidating the findings of 4 AI forensic instances and 2 AI auditors, cross‑referenced against the v2.0/v2.1 documentation set ([SS]【105†source】, [DB]【107†source】, [TA]【103†source】, [FE]【108†source】, [AI Index]【104†source】, [Developer Handbook]【106†source】) and the latest database dump.

---

## Verified Consensus Findings

### 1. Permissions and Roles Missing  
- **Agreement:** 6/6  
- **Description:** `core_permissions`, `core_roles`, and `core_role_permissions` contain no records. Navigation menus reference IDs that don’t exist.  
- **Impact:** Complete lack of access control; security model absent.  
- **Action:** Seed the 4 roles and 8 permissions required by [DB §1]【107†source】, map them correctly, and ensure navigation enforces them.

### 2. Missing Core Tables  
- **Agreement:** 5/6  
- **Description:** `gauge_calibrations` and `checkouts` are absent despite being referenced by FKs and workflows in [SS §6]【105†source】. Additional gaps: `core_data_state_logs`, `core_notification_queue`.  
- **Impact:** Calibration and checkout workflows cannot function; FKs are broken.  
- **Action:** Create required tables with schema and constraints per [DB §3]【107†source】.

### 3. Gauge Status Enum Drift  
- **Agreement:** 5/6  
- **Description:** Current enum includes `pending_unseal` and lacks `pending_transfer`, `at_calibration` defined in [SS §2.1]【105†source】.  
- **Impact:** State machine in [SS §6]【105†source】 cannot align with DB.  
- **Action:** Align enum strictly to spec; backfill data into valid states.

### 4. Navigation Bypass via Permission IDs  
- **Agreement:** 4/6  
- **Description:** `core_navigation` references nonexistent IDs. Auditor Two confirms column is `required_permission_id`.  
- **Impact:** Navigation functions without valid permissions, enabling silent bypass.  
- **Action:** Update nav rows to reference valid seeded permission IDs.

### 5. Companion Gauge Logic Weaknesses  
- **Agreement:** 4/6  
- **Description:** `gauges.companion_gauge_id` allows self/circular references; spare gauges can have companions. Violates [DB §4.2, §4.3]【107†source】.  
- **Impact:** Breaks GO/NO GO pairing rules; calibration invalid.  
- **Action:** Add CHECK constraints and cleanup data accordingly.

### 6. Orphaned Data and Deleted Users  
- **Agreement:** 4–5/6  
- **Description:** `gauge_notes` references non‑existent gauges; audit logs show users 1–6 deleted.  
- **Impact:** Compromises traceability and accountability.  
- **Action:** Clean orphan records; reconcile or nullify deleted user references.

### 7. Audit System Weaknesses  
- **Agreement:** 4/6  
- **Description:** `audit_logs` should be `core_audit_logs`; fields missing; hash chain broken.  
- **Impact:** Non‑compliant with [DB §7]【107†source】. Cannot ensure historical integrity.  
- **Action:** Rename table, add fields, enforce proper hash chaining and digital signatures.

### 8. Undocumented Stored Procedures  
- **Agreement:** 3/6  
- **Description:** 11 undocumented procedures exist (e.g., `ModifyEnumIfMissing`, `pair_thread_gauges`), running with DEFINER=root.  
- **Impact:** Hidden schema/data modifications without audit.  
- **Action:** Disable/drop; reimplement required logic in application layer with audit coverage.

### 9. JSON Columns Unvalidated  
- **Agreement:** 3/6  
- **Description:** 9 JSON fields (e.g., `core_events.payload`, `core_notifications.data`) lack schema validation.  
- **Impact:** Potential for SQLi, XSS, privilege escalation.  
- **Action:** Apply JSON schema constraints; sanitize existing payloads.

### 10. Timestamp Integrity Defects  
- **Agreement:** 3/6  
- **Description:** `created_at` columns incorrectly update on row modification.  
- **Impact:** Corrupts historical record of data creation.  
- **Action:** Redefine `created_at` as immutable; add separate `updated_at`.

### 11. Scheduled Event `expire_transfer_requests`  
- **Agreement:** 1/6 (Auditor Two exclusive)  
- **Description:** Enabled event autonomously modifies/deletes transfer data.  
- **Impact:** Application logic bypassed; hidden automation risk.  
- **Action:** Disable event; re‑implement expiry logic in backend services per [TA §4]【103†source】.

### 12. Performance, Indexing, Charset Hygiene  
- **Agreement:** 2–3/6  
- **Description:** Missing FK indexes, redundant indexes, inconsistent charsets.  
- **Impact:** Reduced performance and portability.  
- **Action:** Add FK indexes, drop duplicates, standardize to `utf8mb4`.

---

## Actionable Remediation Plan

- **Seed security model**: Implement 4 roles, 8 permissions, mappings; enforce in navigation and workflows.
- **Rebuild missing tables**: `gauge_calibrations`, `checkouts`, `core_data_state_logs`, `core_notification_queue`.
- **Align enums**: Modify `gauges.status` enum to exact states in [SS §2.1]【105†source】.
- **Harden companion/spare rules**: Add CHECK constraints; cleanup orphaned/circular references.
- **Audit trail compliance**: Rename audit table; add missing fields; fix hash chain.
- **Disable hidden automations**: Drop undocumented stored procedures; disable scheduled event `expire_transfer_requests`.
- **Secure JSON fields**: Add validation constraints; sanitize data.
- **Correct timestamps**: Immutable `created_at`; add `updated_at`.
- **Data cleanup**: Resolve orphaned notes; reconcile deleted user references.
- **Optimize schema**: Add indexes on FKs; remove redundant indexes; unify charset.

---

## Conclusion

This consolidated forensic review confirms the database is critically compromised: no access control, missing workflow tables, schema drift, audit gaps, hidden automations, and exploitable columns. The remediation plan above must be executed comprehensively to restore compliance with [SS], [DB], [TA], and [FE] specifications.

