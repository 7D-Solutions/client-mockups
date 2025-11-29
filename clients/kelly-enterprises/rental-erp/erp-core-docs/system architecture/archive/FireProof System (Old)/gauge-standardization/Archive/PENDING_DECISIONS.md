# Gauge Standardization - Decisions Record

## RESOLVED DECISIONS

### 1. Hand Tool ID Format ✓
**Decision**: Option A - Simple sequential format
- Format: `CA0001` (Caliper), `MI0001` (Micrometer), `DG0001` (Depth Gauge), `BG0001` (Bore Gauge)
- Rationale: Format (digital/dial) is data, not identity. Stored in separate column for flexibility.

**Status**: RESOLVED

---

### 2. Large Equipment ID Format ✓
**Decision**: Option A - Unified sequential format
- Format: `LE0001` for all large equipment types
- Rationale: Small quantities don't benefit from type-specific prefixes. Simplicity preferred.

**Status**: RESOLVED

---

### 3. ID Prefix Configuration ✓
**Decision**: Configurable prefixes during initial setup only
- Format: 2-4 character prefixes (e.g., SP, CAL, LGEQ)
- Implementation: Prefixes lock after first gauge created
- Rationale: Flexibility for new installations without operational complexity

**Status**: RESOLVED

---

### 4. Database Architecture ✓
**Decision**: Multi-table approach with separate specification tables
- Structure: Main gauges table + 4 specification tables
- Tables: gauge_thread_specifications, gauge_hand_tool_specifications, gauge_large_equipment_specifications, gauge_calibration_standard_specifications
- Rationale: Avoids 60+ column table with numerous NULLs, provides clean separation of concerns

**Status**: RESOLVED

---

### 5. Dual ID System ✓
**Decision**: System ID + Custom ID with display preferences
- Fields: system_gauge_id (required) + custom_id (optional)
- Display: User preference - system only, custom only, or both
- Search: Works with either ID
- Rationale: Supports legacy numbering while maintaining system consistency

**Status**: RESOLVED

---

### 6. Calibration Standards ✓
**Decision**: Added as 4th equipment type
- Prefix: CS (e.g., CS0001)
- Specifications: standard_type, nominal_value, uncertainty
- Rationale: Distinct requirements from other gauge types

**Status**: RESOLVED

---

### 7. Companion Tracking ✓
**Decision**: companion_gauge_id with separate history table
- Implementation: Self-referential FK + gauge_companion_history table
- Rationale: Fast current state queries + complete audit trail for compliance

**Status**: RESOLVED

---

## PENDING DECISIONS

### 1. Calibrate/Verify Before Use Terminology
**Question**: What is the correct terminology for hand tools?
- "Calibrate Before Use"
- "Verify Before Use"
- Something else?

**Context**: This applies to hand tools that don't have a fixed calibration schedule but must be verified before each use.

**Status**: Need exact terminology from domain expert

---

## Decision Record

| Decision | Date | Made By | Choice |
|----------|------|---------|--------|
| Thread Gauge Format | 2024-08-13 | Domain Expert | Decimal only (.500-20, no fractions) |
| Hand Tool ID Format | 2024-08-14 | Database Design Session | Option A: Simple sequential (CA0001) |
| Large Equipment ID Format | 2024-08-14 | Database Design Session | Option A: Unified (LE0001) |
| Database Architecture | 2024-08-14 | Database Design Session | Multi-table with 4 spec tables |
| Dual ID System | 2024-08-14 | Database Design Session | system_gauge_id + custom_id |
| Calibration Standards | 2024-08-14 | Database Design Session | Added as 4th equipment type |
| Companion Tracking | 2024-08-14 | Database Design Session | companion_gauge_id + history table |
| Configurable Prefixes | 2024-08-14 | Database Design Session | Setup-only, 2-4 chars, locks after use |