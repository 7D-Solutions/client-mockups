# QC Wrong Gauge Reconciliation Workflow

**Date**: 2025-10-23
**Status**: Future Enhancement
**Priority**: Medium

## Problem Statement

Currently, the QC Approval workflow handles scenarios where a user returns the correct gauge with physical issues (damage, contamination, missing parts). However, there is no proper workflow for handling when a user returns the **wrong gauge** entirely.

## Current Limitation

When a wrong gauge is returned:
- The system has no way to keep the original checkout open (user still has the real gauge)
- The physical gauge that was returned needs to be identified and handled
- There's no mechanism to alert admins/supervisors for follow-up
- No reconciliation workflow exists to track down the missing gauge

## Proposed Solution

### Wrong Gauge Rejection Type

A special rejection type that:
1. **Keeps original checkout OPEN** - user still has the real gauge
2. **Creates reconciliation task** - flags for admin follow-up
3. **Identifies returned gauge** - scan/identify what was actually returned
4. **Tracks resolution** - workflow to resolve the mismatch

### Workflow Steps

1. **QC Inspector Detection**
   - Inspector scans returned gauge
   - System detects mismatch with expected gauge
   - Inspector confirms "wrong gauge" rejection

2. **System Actions**
   - Keep original checkout open (status: `'checked_out'`)
   - Create alert/task for admin dashboard
   - Record the gauge that was actually returned (if identifiable)
   - Flag user account for follow-up

3. **Admin Resolution**
   - Contact user to retrieve correct gauge
   - Investigate how wrong gauge was obtained
   - Resolve status of both gauges
   - Close reconciliation task

### Technical Requirements

- New rejection type: `'wrong_gauge_reconciliation'`
- New status or flag for gauges under investigation
- Admin dashboard for tracking reconciliation tasks
- Notification system for user follow-up
- Audit trail for resolution steps

## Business Impact

**Without this feature:**
- Inspectors must manually handle wrong gauge returns
- Risk of closing checkouts prematurely
- Lost visibility into gauge location discrepancies
- Manual coordination required for resolution

**With this feature:**
- Automated tracking of mismatched returns
- Clear workflow for resolution
- Better inventory accuracy
- Reduced administrative burden

## Related Systems

- QC Approval workflow
- Checkout/Return system
- Admin alerts/tasks
- Audit logging

## Implementation Considerations

- Should wrong gauge returns trigger immediate user notification?
- How long should reconciliation tasks remain open before escalation?
- Should users be blocked from future checkouts until resolved?
- Integration with existing alert/notification systems
- Database schema changes for reconciliation tracking

## Notes

- Deferred from initial QC rejection workflow implementation (2025-10-23)
- Focus on physical condition rejections first (damage, contamination, missing parts)
- Revisit when admin task/alert system is more mature
