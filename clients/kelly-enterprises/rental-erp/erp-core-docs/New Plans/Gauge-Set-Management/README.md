# Gauge Set Management Plan

**Status**: 🟡 Planning Phase
**Created**: 2025-11-05
**Priority**: 🔴 CRITICAL (Data integrity issue)

---

## Overview

This plan addresses critical issues and gaps in gauge set (GO/NO-GO pair) lifecycle management, including:

- ✅ **FIXED**: Serial number preservation in gauge sets
- 🔴 **CRITICAL**: Set ID reuse causing audit trail confusion
- ⚠️ **MISSING**: Retire set operation
- ⚠️ **GAPS**: Unclear business rules for set operations
- ⚠️ **UI**: No frontend for replace/unpair/retire operations

---

## Documents in This Plan

### 📋 [GAUGE-SET-MANAGEMENT-PLAN.md](./GAUGE-SET-MANAGEMENT-PLAN.md)
**Comprehensive implementation plan** covering:
- Current state analysis
- Business rules & scenarios (5 detailed workflows)
- Critical issue: Set ID reuse prevention
- Missing operation: Retire set
- Database schema review
- API endpoints (6 new endpoints needed)
- Frontend UI requirements (4 new components)
- 4-phase implementation plan (4 weeks)
- Testing strategy
- Risk analysis
- Overengineering review

**Audience**: Developers, Technical Leads, Project Managers

---

### 📖 [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
**Quick decision guide** with:
- Visual decision tree
- Operation comparison chart
- 5 common scenarios with solutions
- Key rules (NEVER/ALWAYS)
- Status definitions
- Error message meanings
- Permission requirements

**Audience**: Operators, QC Staff, Supervisors

---

## Critical Issues Summary

### 🚨 Issue #1: Set ID Reuse Bug (IN PRODUCTION NOW)

**Problem**:
```
Day 1: Create set SP0222 (ABC123 + DEF456)
Day 2: Unpair SP0222
Day 3: Create new set SP0222 (XYZ789 + LMN012) ✅ ALLOWED!
```

**Impact**: Historical audit trail becomes ambiguous - which gauges were in "SP0222" on any given date?

**Fix**: Add historical usage check before allowing set creation (2,900 tokens)

**Timeline**: Deploy within 1 week (Phase 1)

---

### 🔴 Issue #2: No Production Safety Nets

**Missing**:
- ❌ No rollback strategy for deployment
- ❌ No migration script for existing sets
- ❌ No performance benchmarks or load testing
- ❌ No monitoring/alerting for operations

**Fix**: Phase 1.5 - Production Readiness (3,800 tokens)

**Impact**: Deployment risk, no recovery path if issues arise

**Timeline**: Deploy with Phase 1 (same week)

---

## Key Business Rules

| Operation | Use When | Preserves Set ID? | Gauges Reusable? |
|-----------|----------|-------------------|------------------|
| **REPLACE** | 1 damaged, spare available | ✅ YES | Old gauge: YES |
| **SOFT DELETE** | 1 lost, no spare yet | ✅ YES | Lost gauge: NO |
| **UNPAIR** | Wrong pairing (both wrong) | ❌ NO | Both: YES |
| **RETIRE SET** | Both worn out | ✅ YES | Both: NO |
| **KEEP PAIRED** | Both need calibration | ✅ YES | N/A |

---

## Implementation Phases

### Token-Based Estimates

**Baseline**: 40,700 tokens | **With Buffer**: 50,000 tokens | **Cost**: ~$0.85

### Phase 1: Critical Fixes 🔥
- [x] Serial number preservation (COMPLETED)
- [ ] Set ID reuse prevention (2,900 tokens)
- [ ] Add retire set operation (4,100 tokens)
- [ ] Rollback strategy & migration (3,100 tokens)
- **Total**: 10,100 tokens

### Phase 1.5: Production Readiness 🛡️ (NEW)
- [ ] Monitoring & alerts (1,900 tokens)
- [ ] Load testing (1,900 tokens)
- **Total**: 3,800 tokens

### Phase 2: Core Operations 🔧
- [ ] Replace gauge API (3,300 tokens)
- [ ] Set history API (2,300 tokens)
- [ ] Incomplete sets monitoring (2,000 tokens)
- [ ] Check availability endpoint (1,300 tokens)
- **Total**: 8,900 tokens

### Phase 3: Frontend UI 🎨
- [ ] Set detail view (4,000 tokens)
- [ ] Replace gauge modal (3,500 tokens)
- [ ] Set action modal - consolidated (2,200 tokens)
- [ ] Incomplete sets widget (2,200 tokens)
- [ ] Set creation validation (1,500 tokens)
- **Total**: 13,400 tokens

### Phase 4: Documentation & Training 📚
- [ ] Update documentation (2,500 tokens)
- [ ] Create training materials (2,000 tokens)
- **Total**: 4,500 tokens

**Project Total**: 40,700 tokens (~4-5 sessions)

---

## Success Criteria

### Must Have ✅
- [ ] Set ID reuse prevented (historical check)
- [ ] Retire set operation functional
- [ ] Replace gauge works via API
- [ ] All unit tests pass
- [ ] Zero data integrity issues

### Should Have ⭐
- [ ] Set detail view with actions
- [ ] Replace gauge modal UI
- [ ] Incomplete sets dashboard widget
- [ ] Set history display

### Nice to Have 💎
- [ ] Training videos
- [ ] Interactive decision tree
- [ ] Email alerts for incomplete sets
- [ ] Suggested replacement recommendations

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Set ID reuse in production | 🔴 HIGH | 🔴 HIGH | Deploy Phase 1 ASAP + feature flag |
| No rollback strategy | 🔴 HIGH | 🟡 MEDIUM | Add Phase 1.5 (rollback + migration) |
| Performance on history check | 🟡 MEDIUM | 🟡 MEDIUM | Add database index + load testing |
| No historical data migration | 🟡 MEDIUM | 🔴 HIGH | Migration script with verification |
| Frontend UX complexity | 🟡 MEDIUM | 🟡 MEDIUM | User testing, clear flows |
| Training adoption | 🟢 LOW | 🟡 MEDIUM | Clear documentation, supervisor buy-in |

**Overall Risk**: 🟡 MEDIUM-HIGH (reduced from HIGH with Phase 1.5 additions)

**New Confidence Level**: 85% (up from 75% after adding production safety nets)

---

## Technical Details

### New API Endpoints
```
POST /api/gauge-sets/:setId/replace       - Replace gauge in set
POST /api/gauge-sets/:setId/unpair        - Break set (rare)
POST /api/gauge-sets/:setId/retire        - Retire both gauges
GET  /api/gauge-sets/:setId/history       - Complete audit trail
GET  /api/gauge-sets/incomplete           - Monitor incomplete sets
GET  /api/gauge-sets/check-availability/:setId - Validate before create
```

### Database Changes
```sql
-- Add index for fast historical lookup
CREATE INDEX idx_set_history_lookup
ON gauge_set_history(set_id, created_at DESC);
```

### New Frontend Components
- `<SetDetailView />` - Display set with actions
- `<ReplaceGaugeModal />` - Replace gauge workflow
- `<IncompleteSetsWidget />` - Dashboard alert
- `<SetIdValidator />` - Pre-create validation

---

## Related Documentation

- [Serial Number Fix](../../database%20rebuild/) - Fixed gauge_id preservation
- [Gauge Module Structure](../../../system%20architecture/Fireproof%20Docs%202.0/) - Overall architecture
- [Audit Trail System](../../../system%20architecture/) - Historical tracking

---

## Next Steps

1. ✅ Plan created and reviewed (DONE)
2. ⏳ Team review meeting (30 min)
3. ⏳ Stakeholder approval for Phase 1
4. ⏳ Create Jira tickets
5. ⏳ Begin Phase 1 implementation

---

## Questions or Concerns?

**Technical questions**: Contact development team
**Business rules**: Contact QC supervisor
**Timeline concerns**: Contact project manager
**Documentation**: Refer to QUICK-REFERENCE.md

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-05 | Initial plan creation | Claude (AI) |

---

## Approval Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| QC Supervisor | | | |
| Project Manager | | | |
| Operations Manager | | | |

---

**Plan Status**: 🟡 Pending Approval
**Next Review**: 2025-11-06

---

## Implementation Scope: What Claude Code Can Do

### ✅ Claude Code CAN Implement (Automated)

**Code Generation** (~35K tokens):
- Backend services (JavaScript)
- Frontend components (TypeScript/React)
- API endpoints and routes
- Database queries and migrations
- Unit tests (Jest)
- Integration tests
- Feature flag logic (environment variable checks)
- Error handling and validation

**Documentation** (~5K tokens):
- Code comments
- API documentation
- User guides
- Migration scripts

**What You'll Get**: Working code, tests, and docs ready to deploy

---

### ⚠️ Requires Manual Setup (Outside Claude Code)

**Infrastructure** (Manual):
- Run database migrations (`mysql < migration.sql`)
- Set environment variables (`FEATURE_SET_ID_REUSE_CHECK=true`)
- Restart Docker containers (`docker-compose restart backend`)
- Create database indexes (provided SQL, you run it)

**Monitoring** (Manual):
- Set up Prometheus/Datadog (config provided, you deploy)
- Configure alerts (thresholds provided, you implement)
- Run load tests (test code provided, you execute)

**Operations** (Manual):
- Execute migration script
- Verify migration results
- Monitor performance metrics
- Perform rollback if needed

**What You Need To Do**: Deploy infrastructure, run scripts, configure monitoring

---

### Token Allocation Breakdown

```
Automated Implementation:
- Backend code:        18,900 tokens (46%)
- Frontend code:       10,500 tokens (26%)
- Tests:               13,200 tokens (32%)
- Documentation:        6,600 tokens (16%)
─────────────────────────────────────
Total Claude Output:   40,700 tokens

Manual Setup:
- Infrastructure:      Provided as reference only
- Monitoring:          Provided as configuration templates
- Operations:          Provided as step-by-step procedures
```

**Note**: Phase 1.5 (Production Readiness) provides templates and procedures for monitoring/load testing, but actual infrastructure setup is manual.
