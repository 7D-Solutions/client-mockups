# System Specs Implementation Guide v3.2

**Version:** 3.2  
**Date:** 2025-09-05  
**Purpose:** Business and UX behaviors expressed as implementable requirements for AI coding assistants

## Table of Contents
1. [Prime Directives](#0-prime-directives-for-ai-agents)
2. [Roles & Permissions](#1-roles--permissions)
3. [Entities & States](#2-entities--states)
4. [API Specifications](#3-api-specifications)
5. [Business Logic](#4-business-logic)
6. [User Interface Requirements](#5-user-interface-requirements)
7. [Validation Rules](#6-validation-rules)

---

## 0) Prime Directives (for AI Agents)
1. **Honor the 4‑role / 8‑permission model** (see §1.2). Deny by default.  
2. **Follow the exact workflows** and error messages below. Do not invent states.  
3. **No cross‑module imports** (use core services or events for cross‑module actions).  
4. **Soft‑delete only** for records marked “retired”. Preserve audit history.  
5. **Sealed ≠ usable**: sealed gauges cannot be checked out until unsealed/approved.  
6. **Calibration‑due gauges** may not be checked out under any circumstance.  
7. **All state changes are audited** (who, when, why).  
8. **Accessibility**: all modals and buttons have aria‑labels; confirm destructive actions.

---

## 1) Roles, Permissions, Visibility (Summary)
> Full SQL seeds + mappings are in *Database & Permissions – Schema Reference*.

### 1.1 Roles (4)
- **Super Admin** – full control, system admin tasks.  
- **Admin** – manage users, everything QC can do.  
- **QC** – manage gauges and calibrations, approve sealed checkouts, export, view audit.  
- **User** – view + operate (checkout/return/transfer) non‑sealed/non‑due gauges.

### 1.2 Permissions (8) — Names are canonical
- `gauge.view`, `gauge.operate`, `gauge.manage`, `calibration.manage`,  
  `user.manage`, `system.admin`, `audit.view`, `data.export`

### 1.3 Visibility
- **Users**: see **complete sets only** (no spares/incomplete).  
- **QC+**: see all (including spares/incomplete).

---

## 2) Entities & Canonical States

### 2.1 Gauge Status (single state at a time)
`available` | `checked_out` | `pending_qc` | `pending_transfer` | `at_calibration` | `calibration_due` | `out_of_service` | `retired`

**Rules:**  
- `calibration_due` blocks checkout.  
- `retired` hidden from non‑Admin by default.  
- Returns land in `pending_qc`.  
- “Send to calibration” sets `at_calibration`.  
- “Receive from calibration” (passed) seals gauge automatically; status remains **available** but **sealed=true** (see 2.2). Failed → `out_of_service`.

### 2.2 Seal State (boolean + dates)
- `sealed` (true/false)  
- `unsealed_at` (timestamp, null if sealed)
- For **sealable** gauges: **Due date = unsealed_at + frequency** (certificate date ignored).  
- Unsealed operation is permitted only after approval when originally sealed.

### 2.3 Calibration Due Logic
- **Unsealed**: due = certificate_date + frequency.  
- **Sealed**: due = unsealed_at + frequency.  
- Daily job recomputes due states (see §7.1).

### 2.4 Core Data Objects (minimal fields for API contracts)
- **Gauge**: id, system_gauge_id, name, equipment_category, category_id, gauge_suffix (A/B/null), companion_gauge_id, is_spare, status, sealed, unsealed_at, calibration_due_date, location, notes, created_at, updated_at.  
- **Checkout**: id, gauge_id, actor_user_id, target_user_id, notes, status_at (timestamp).  
- **UnsealRequest**: id, gauge_id, requester_id, reason, status: `pending_approval|approved|denied|cancelled`, created_at, decided_by, decided_at.  
- **CalibrationRecord**: id, gauge_id, method: `external|internal`, passed, certificate_no, performed_at, technician_id, notes, document_path (required if external and passed), created_at.  
- **Notification**: id, user_id, type, payload(json), read_at, created_at.

---

## 3) API Contracts (OpenAPI‑style, minimal)

### 3.1 Gauges
```
GET /api/gauges?status=&q=&category=&visibility=all|complete
200 [{ id, system_gauge_id, name, status, sealed, location, is_spare, gauge_suffix }]

GET /api/gauges/:id
200 { id, system_gauge_id, name, ... all fields ... }

POST /api/gauges/:id/checkout
Auth: gauge.operate
Body: { target_user_id?: number, note?: string }
Rules:
- deny if status in [calibration_due, at_calibration, pending_qc, retired]
- deny if sealed === true → require unseal request (§3.3)
- set status=checked_out; create Checkout row (actor=currentUser, target=target or self)
- return 409 if already checked_out; include holder info
200 { status: "checked_out", holder: {...} }

POST /api/gauges/:id/return
Auth: gauge.operate
Body: { condition: "good|damaged|needs_cleaning", note?: string, location?: string }
Rules:
- anyone may return any checked_out gauge
- set status=pending_qc
200 { status: "pending_qc" }

POST /api/gauges/:id/accept-return   // QC action
Auth: gauge.manage
Body: { returned_to_location?: string }   // if omitted, prompt to choose or leave pending_qc
Rules:
- sets status=available and updates location if provided
200 { status: "available", location }

POST /api/gauges/:id/transfer
Auth: gauge.operate
Body: { to_user_id: number, note?: string }
Rules:
- only the current holder can transfer
- status must be checked_out
- create new checkout assignment (actor=holder, target=to_user_id)
200 { status: "checked_out", holder: { id: to_user_id } }
```

### 3.2 Calibration
```
POST /api/calibrations/send
Auth: calibration.manage
Body: { gauge_ids: number[] }
Rules:
- set each status=at_calibration

POST /api/calibrations/receive
Auth: calibration.manage
Body: { gauge_id, passed: boolean, certificate_no?: string, document_path?: string, notes?: string, performed_at: ISO }
Rules:
- if passed && external → certificate_no & document_path required
- set sealed=true
- if passed: status remains available; recompute due_date per §2.3
- if failed: status=out_of_service
200 { status, sealed, calibration_due_date }
```

### 3.3 Unseal Requests (for sealed gauges)
```
POST /api/unseal-requests
Auth: gauge.operate
Body: { gauge_id, reason }
Rules:
- if gauge.sealed=false → 400
- Create UnsealRequest with status=pending_approval
- Return alternative matches (complete + unsealed) in payload suggestions[]
200 { request_id, status: "pending_approval", suggestions: [...] }

POST /api/unseal-requests/:id/approve
Auth: gauge.manage   // QC+
Rules:
- set request.status=approved
- set gauge.sealed=false; gauge.unsealed_at=now
- if gauge was at_calibration → 409 (cannot unseal in that state)

POST /api/unseal-requests/:id/deny
Auth: gauge.manage
Body: { reason }
Rules:
- status=denied
```

### 3.4 Recovery (Super Admin)
```
POST /api/recovery/:gaugeId/reset
Auth: system.admin
Body: { reason }
Effect:
- cancel pending_transfer, clear pending_qc
- set status = (calibration_due_date <= today ? "calibration_due" : "available")
- never changes sealed, unsealed_at, or calibration dates
```

### 3.5 Notifications
```
GET /api/notifications
Auth: *
200 [{ id, type, payload, created_at, read_at }]

POST /api/notifications/:id/read
Auth: *
200 { read_at }
```

---

## 4) Frontend — Screens, Components, and States

### 4.1 Primary Screens
- **Gauge List** (search, filters, category tabs)  
- **Gauge Details** (read‑only; Admin sees *Edit* button)  
- **Gauge Edit** (Admin/QC fields per §5.2)  
- **Checkout/Return/Transfer Modals**  
- **Calibration Console** (send/receive batches, upload certs)  
- **Unseal Request Flow** (request, suggestions, approval)  
- **QC Inbox** (Pending QC returns, unseal approvals)  
- **Recovery Tool** (Super Admin only)  
- **Notifications Center** (preferences panel optional)

### 4.2 Core Components (React)
- `<GaugeCard/>` props: { id, name, size, status, sealed, location, isSpare }  
- `<GaugeStatusBadge/>` props: { status }  
- `<SealTag/>` props: { sealed }  
- `<CheckoutModal/>`, `<ReturnModal/>`, `<TransferModal/>`  
- `<UnsealRequestModal/>` props: { gauge, onSubmit }  
- `<CalibrationReceiveForm/>` props: { gauge, onSubmit } (enforces cert/doc rules)  
- `<QCInboxTable/>` rows: pending_qc returns + unseal approvals

### 4.3 UX Rules
- **Confirmations**: checkout, return, approve/deny, unseal.  
- **Disabled actions** with tooltips when blocked by status or permissions.  
- **Red flashing row** for `calibration_due` in list.  
- **Accessible modals** (focus trap, ESC, aria).

---

## 5) Field Rules & Editability

### 5.1 Never Editable (identity/operational)
Gauge ID, type, size/specs, seal status, calibration due date, unsealed_at, timestamps/history.

### 5.2 Editable (Admin/QC)
Manufacturer, model, serial (if missing), storage location, notes.

### 5.3 Required Fields by Equipment (entry UI)
- **Thread Gauges**: ID, description, type (plug/ring), location, frequency, category, size/spec.  
- **Hand Tools**: ID, description, type, location, frequency, category, range, manufacturer, resolution/accuracy.  
- **Large Equipment**: ID, description, type, frequency, category, capacity/size, manufacturer, serial, model, accuracy.  
- **Calibration Standards**: ID, description, standard type, traceability cert, original cert date, storage location.  
> Strict validation formats live in the *Database & Permissions – Schema Reference* and must be enforced server‑side.

---

## 6) Workflow State Machines (canonical)

### 6.1 Checkout
`available → checked_out`  
Guards: not calibration_due, not sealed, not at_calibration, not pending_qc/transfer, not retired.

### 6.2 Return
`checked_out → pending_qc` (any user)  
QC Accept: `pending_qc → available` (+ optional location update).

### 6.3 Transfer
Holder only: `checked_out(holder=A) → checked_out(holder=B)` (atomic assignment update).

### 6.4 Unseal
Request: `sealed=true → UnsealRequest(pending_approval)`  
Approve: set `sealed=false`, `unsealed_at=now` (status unchanged).

### 6.5 Send/Receive Calibration
Send: `* → at_calibration` (QC only)  
Receive: if passed → `available` and `sealed=true`; if failed → `out_of_service`.

### 6.6 Recovery
`{pending_transfer|pending_qc|ghost} → available|calibration_due` (see §3.4).

---

## 7) Background Jobs & Notifications

### 7.1 Nightly Scheduler
- Recompute `calibration_due` based on rules in §2.3.  
- For checked‑out gauges that become due → send immediate notifications to holder + QC/Admin.

### 7.2 Notification Triggers
- Checkout blocked by due → to requester + QC/Admin.  
- Sealed checkout requested → to QC/Admin.  
- Unseal approved/denied → to requester.  
- Return pending QC → to QC inbox.  
- Calibration failed → to holder + QC/Admin.  
- Permission changes → to affected user.  
- Daily/weekly summaries per user preferences.

---

## 8) Error Messages (exact strings)
- **Checkout (sealed):** “This gauge is sealed. Request unseal to continue.”  
- **Checkout (due):** “This gauge is calibration due and cannot be checked out.”  
- **Checkout (already out):** “This gauge is already checked out by {name}.”  
- **Return (not out):** “Only checked‑out gauges can be returned.”  
- **Transfer (not holder):** “Only the current holder can transfer this gauge.”  
- **Calibration (missing cert):** “Certificate number and file are required for external passed calibrations.”  
- **Unseal (already unsealed):** “This gauge is already unsealed.”  
- **Recovery (forbidden):** “Recovery actions require system administrator privileges.”  
- **Generic:** “Something went wrong. Please try again.”

---

## 9) Acceptance Tests (high‑level)

### 9.1 Permissions
- User cannot approve unseal; QC can.  
- Admin can create users; QC cannot.  
- Super Admin can run recovery.

### 9.2 Checkout/Return
- Sealed gauge → unseal request flow enforced.  
- Due gauge → checkout blocked with correct message.  
- Return sets `pending_qc`; QC accept moves to `available`.

### 9.3 Calibration
- Send sets `at_calibration`.  
- Receive passed (external) requires certificate number + file; sets sealed=true.  
- Receive failed moves to `out_of_service`.

### 9.4 Unseal
- Request creates suggestions list of equivalent unsealed complete sets.  
- Approve sets sealed=false and unsealed_at=now.

### 9.5 Recovery
- Resets stuck states without altering calibration dates or seal state.

---

## 10) Deliverables for AI (Create These Files/Endpoints)

### 10.1 Backend (Node/Express or equivalent)
- Routes under `/api/gauges`, `/api/calibrations`, `/api/unseal-requests`, `/api/recovery`, `/api/notifications`.  
- Middleware: `authenticateToken`, `requirePermission(name)`  
- Services: `GaugeService`, `CalibrationService`, `UnsealService`, `RecoveryService`, `NotificationService`.  
- Audit logging helpers invoked on every state change.  
- Nightly scheduler job (cron) for calibration due recomputation + digests.

### 10.2 Frontend (React)
- Pages: `GaugesList.tsx`, `GaugeDetails.tsx`, `QCInbox.tsx`, `CalibrationConsole.tsx`, `RecoveryTool.tsx`.  
- Components: `GaugeCard`, `StatusBadge`, `SealTag`, `CheckoutModal`, `ReturnModal`, `TransferModal`, `UnsealRequestModal`, `CalibrationReceiveForm`, `QCInboxTable`.  
- State machines (xstate or simple reducers) matching §6.  
- Data hooks: `useGauges`, `useGauge(id)`, `useQCInbox`, `useNotifications`.

### 10.3 Testing
- Unit tests for guards (checkout blocked conditions).  
- Integration tests for API flows (checkout→return→QC accept).  
- E2E for unseal approval and calibration receive.

---

## 11) Implementation Notes
- Server must enforce all guards; UI disables but server is source of truth.  
- All POST/PUT endpoints return **fresh authoritative resource** on success.  
- Use transactions where state transitions touch multiple tables (checkout, transfer, receive).  
- Write consistent audit entries: `{entity, entity_id, action, old, new, actor_id, reason?, at}`.

---

## 12) Handover Checklist (Definition of Done)
- [ ] All endpoints in §3 implemented with permission checks.  
- [ ] UI flows in §4 working with exact error messages (§8).  
- [ ] Nightly scheduler operational; due statuses match rules.  
- [ ] Audit log entries for every state change.  
- [ ] Tests in §10.3 pass locally and in CI.  
- [ ] Docs linked from app footer (Help → System Specs).

---

**End of System Specifications – Implementation Guide (v3.2)**
