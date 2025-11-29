# Gauge Set Management - Quick Reference Guide

**For**: Operators, QC Staff, Managers
**Purpose**: Quick decision guide for gauge set operations

---

## Decision Tree: What Operation Should I Use?

```
┌─────────────────────────────────────────────────────────────┐
│ START: Something needs to happen with a gauge set          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
          ┌───────────────────────────────┐
          │ What's the situation?         │
          └───────┬───────────────────────┘
                  │
      ┌───────────┼───────────┬──────────────┬──────────────┐
      │           │           │              │              │
      ▼           ▼           ▼              ▼              ▼
┌──────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐ ┌─────────┐
│ 1 gauge  │ │ Both    │ │Wrong    │ │ Both worn   │ │ Need    │
│ damaged  │ │ need    │ │pairing  │ │ out         │ │ cal     │
└────┬─────┘ └────┬────┘ └────┬────┘ └──────┬───────┘ └────┬────┘
     │            │            │             │              │
     ▼            ▼            ▼             ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│ Do you have a compatible spare?                            │
│ ┌──YES──┐                                    ┌──NO──┐      │
│ │       │                                    │      │      │
│ ▼       │                                    ▼      │      │
│ REPLACE │                                    SOFT   │      │
│ GAUGE   │                                    DELETE │      │
└─────────┘                                    └──────┘      │
     │                                              │         │
     │            UNPAIR SET                  RETIRE SET      │
     │            (Break set)                (Both deleted)   │
     │                 │                          │           │
     │                 │                          │           │
     ▼                 ▼                          ▼           │
                                                              │
                                                     KEEP     │
                                                     PAIRED   │
                                                              │
                                                              ▼
```

---

## Operation Comparison Chart

| Operation | When to Use | Set Status After | Old Gauge Status | Example |
|-----------|-------------|------------------|------------------|---------|
| **REPLACE** | 1 gauge damaged, spare available | ✅ Complete (same ID) | Unpaired spare | GO gauge cracked, replace with spare |
| **SOFT DELETE** | 1 gauge lost, no spare yet | ⚠️ Incomplete | Deleted | NO-GO lost in field, waiting for replacement |
| **UNPAIR** | Wrong pairing, both gauges wrong | ❌ Destroyed | Both become spares | Accidentally paired different thread sizes |
| **RETIRE SET** | Both gauges end of life | ❌ Retired | Both deleted | Both worn out, removing from service |
| **KEEP PAIRED** | Both need calibration | ✅ Complete | N/A - stays in set | Annual calibration due for both |

---

## Common Scenarios & Solutions

### Scenario 1: Damaged Gauge 🔧
**Problem**: GO gauge (ABC123) in set SP0222 is damaged during use.

**Solution**: REPLACE
1. Find compatible unpaired spare (e.g., XYZ789)
2. Click "Replace Gauge" on set detail page
3. Select "GO Gauge"
4. Choose spare XYZ789
5. Enter reason: "Damaged during inspection"
6. Confirm replacement

**Result**:
- ✅ Set SP0222 remains complete
- ✅ New GO gauge: XYZ789
- ✅ Old gauge ABC123 becomes spare (can be repaired/recalibrated)

---

### Scenario 2: Lost Gauge 🔍
**Problem**: NO-GO gauge (DEF456) permanently lost.

**Solution**: SOFT DELETE (wait for spare)
1. Report gauge as lost
2. System marks gauge as deleted
3. Set appears in "Incomplete Sets" dashboard
4. When replacement arrives, use REPLACE operation

**Result**:
- ⚠️ Set SP0222 incomplete (cannot use until replaced)
- ✅ Set ID preserved for when replacement arrives
- ✅ Remaining gauge (ABC123) tracked

---

### Scenario 3: Wrong Pairing ❌
**Problem**: Set SP0222 has 1/4-20 GO + 1/2-13 NO-GO (different thread sizes!).

**Solution**: UNPAIR
1. Navigate to set detail page
2. Click "Unpair Set"
3. Enter reason: "Incorrect specifications - different thread sizes"
4. Confirm unpair

**Result**:
- ❌ Set SP0222 destroyed (no longer exists)
- ✅ Both gauges become unpaired spares
- ✅ Can now pair each with correct companion

**Important**: Set ID SP0222 CANNOT be reused!

---

### Scenario 4: Both Worn Out 🛑
**Problem**: Both gauges in set SP0222 are at end of service life.

**Solution**: RETIRE SET
1. Navigate to set detail page
2. Click "Retire Set"
3. Enter reason: "End of service life - excessive wear"
4. Confirm retirement

**Result**:
- ❌ Set SP0222 retired (removed from service)
- ❌ Both gauges deleted (cannot be reactivated)
- ✅ Historical data preserved
- ✅ Set ID cannot be accidentally reused

---

### Scenario 5: Calibration Due 📅
**Problem**: Both gauges in set SP0222 are due for annual calibration.

**Solution**: KEEP PAIRED (calibrate together)
1. Send entire set to calibration
2. Set status changes to "in_calibration"
3. After calibration, return to service as SP0222
4. Update calibration dates

**Result**:
- ✅ Set SP0222 remains complete
- ✅ Both gauges recalibrated
- ✅ Set identity preserved
- ✅ Historical continuity maintained

**Do NOT unpair for calibration!**
- Unpairing loses set identity
- Creates unnecessary work
- Breaks calibration history

---

## Key Rules to Remember

### 🚫 NEVER

1. **NEVER reuse a set ID** after unpair or retirement
   - System will prevent this
   - Maintains audit trail integrity

2. **NEVER unpair for calibration**
   - Keep set together during cal
   - Return to service as same set

3. **NEVER replace during checkout**
   - Must check in both gauges first
   - Safety and tracking requirement

4. **NEVER unpair when REPLACE will work**
   - Replace preserves set identity
   - Unpair should be rare (mistakes only)

### ✅ ALWAYS

1. **ALWAYS provide a reason**
   - All operations require explanation
   - Helps future troubleshooting

2. **ALWAYS check compatibility**
   - System validates specifications
   - Verify before attempting replace

3. **ALWAYS check incomplete sets**
   - Dashboard widget shows incomplete sets
   - Resolve within 7 days if possible

4. **ALWAYS verify set status**
   - Complete, Incomplete, or Retired
   - Affects what operations are allowed

---

## Status Definitions

| Status | Meaning | Can Use? | Actions Available |
|--------|---------|----------|-------------------|
| **Complete** | Both GO and NO-GO present | ✅ YES | Replace, Retire, Checkout, Calibrate |
| **Incomplete** | Missing GO or NO-GO | ❌ NO | Replace (to complete), Retire |
| **Retired** | Both gauges removed from service | ❌ NO | View history only |

---

## Error Messages & What They Mean

### "Set ID already exists"
- **Meaning**: Another active set has this ID
- **Solution**: Choose different ID for new set

### "Set ID was previously used"
- **Meaning**: This ID was used before (even if unpaired)
- **Solution**: Use suggested alternative ID
- **Why**: Prevents audit trail confusion

### "Cannot replace while checked out"
- **Meaning**: Gauges must be in storage for safety
- **Solution**: Check in both gauges first

### "Replacement must be unpaired spare"
- **Meaning**: New gauge already belongs to another set
- **Solution**: Choose different spare or unpair first

### "Specifications don't match"
- **Meaning**: Spare has wrong thread size/class/form
- **Solution**: Find compatible spare

---

## Who Can Do What?

| Operation | Permission Required | Role |
|-----------|-------------------|------|
| Create Set | `create_gauges` | QC Staff, Supervisor |
| Replace Gauge | `manage_gauges` | QC Staff, Supervisor |
| Unpair Set | `manage_gauges` + Reason | Supervisor only |
| Retire Set | `manage_gauges` + Reason | Supervisor only |
| View History | `view_gauges` | All staff |

---

## Need Help?

**Incomplete sets not resolved in 7 days?**
→ Contact supervisor for spare gauge order

**Unsure if pairing is correct?**
→ Use "Check Compatibility" before creating set

**Historical data questions?**
→ Use "View Set History" for complete audit trail

**System error during operation?**
→ Contact IT support with error message

---

**Last Updated**: 2025-11-05
**Document Version**: 1.0
