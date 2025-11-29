# Frontend Architecture Action Plan

**Created**: After thorough backend analysis and system documentation review  
**Purpose**: Define concrete steps to build a compliant, maintainable frontend that aligns with Fire-Proof ERP system requirements

## Executive Summary

Our analysis revealed that while the basic module structure aligns with the backend (~70%), we're missing critical system compliance requirements including state auditing, canonical messages, validation patterns, and accessibility enforcement. This plan addresses all gaps systematically.

## Phase 1: System Compliance Audit (Days 1-2)

### 1.1 Create Compliance Checklist
- [ ] Review all system documentation sections
  - [ ] [TA] Technical Architecture - All prime directives
  - [ ] [SS] System Specs - Error messages, workflows, acceptance tests
  - [ ] [DB] Database Reference - Validation patterns, permissions
  - [ ] [FE] Frontend Guide - Design tokens, components, accessibility
- [ ] Create `FRONTEND_SYSTEM_COMPLIANCE.md` with requirement mappings
- [ ] Identify all canonical requirements (events, errors, validation)

### 1.2 Document Missing Patterns
- [ ] State change auditing implementation
- [ ] Canonical error message handling
- [ ] Validation pattern library
- [ ] Event system with versioning
- [ ] Permission checking framework
- [ ] Accessibility enforcement

## Phase 2: Architecture Refinement (Days 3-4)

### 2.1 Update Frontend Structure
```
frontend/src/
├── infrastructure/          # Rename from 'core'
│   ├── audit/              # NEW - State change auditing
│   │   ├── hooks/          # useAuditedState, useAuditedEffect
│   │   ├── middleware/     # Store audit middleware
│   │   └── service.ts      # Audit logging service
│   ├── errors/             # NEW - Canonical error handling
│   │   ├── messages.ts     # From [SS §8]
│   │   ├── handlers.ts     # Error display logic
│   │   └── boundaries.tsx  # Error boundary components
│   ├── validation/         # NEW - Shared validation
│   │   ├── patterns.ts     # From [DB §4]
│   │   ├── schemas/        # Zod schemas
│   │   └── messages.ts     # Validation error messages
│   ├── accessibility/      # NEW - A11y enforcement
│   │   ├── audit.ts        # axe-core integration
│   │   ├── components.tsx  # Accessible base components
│   │   └── hooks.ts        # useA11y hooks
│   ├── events/             # Enhanced with canonical events
│   │   ├── canonical.ts    # From [TA §4.1]
│   │   ├── bus.ts          # Event bus implementation
│   │   └── types.ts        # ModuleEvent<T> with versioning
│   ├── auth/               # Permission framework
│   │   ├── hooks.ts        # usePermission, useRole
│   │   ├── guards.tsx      # PermissionGuard component
│   │   └── context.tsx     # Auth context provider
│   ├── api/                # API client with versioning
│   │   ├── client.ts       # Versioned axios instances
│   │   ├── interceptors.ts # Auth, error handling
│   │   └── types.ts        # API response types
│   └── notifications/      # User messaging
│       ├── toast.tsx       # Toast notifications
│       ├── alerts.tsx      # Alert system
│       └── service.ts      # Notification service
```

### 2.2 Create Implementation Patterns
- [ ] `FRONTEND_PATTERNS.md` - How to use each infrastructure component
- [ ] `API_VERSIONING_STRATEGY.md` - v1/v2 handling approach
- [ ] `STATE_AUDIT_GUIDE.md` - When and how to audit state changes

## Phase 3: Auth Module POC (Days 5-7)

### 3.1 Implement Auth Module
```
modules/auth/
├── index.ts                # Module descriptor
├── routes/
│   └── index.tsx          # Route definitions
├── components/
│   ├── LoginForm.tsx      # With validation & audit
│   ├── UserProfile.tsx    # With permissions
│   └── PasswordReset.tsx  # With canonical errors
├── services/
│   └── authApi.ts         # Versioned API calls
├── validation/
│   ├── schemas.ts         # Login/password schemas
│   └── rules.ts           # Password complexity rules
└── hooks/
    ├── useLogin.ts        # Audited login flow
    └── useProfile.ts      # Permission-aware profile
```

### 3.2 Validate All Patterns
- [ ] State auditing works correctly
- [ ] Canonical errors display properly
- [ ] Validation follows [DB] patterns
- [ ] Events use canonical types
- [ ] Permissions enforce correctly
- [ ] Accessibility passes audit

### 3.3 Document Learnings
- [ ] Update patterns based on POC findings
- [ ] Create decision log for technology choices
- [ ] Document any deviations from plan

## Phase 4: Infrastructure Implementation (Days 8-10)

### 4.1 Core Infrastructure Components

#### Audit System
```typescript
// infrastructure/audit/hooks/useAuditedState.ts
export const useAuditedState = <T>(
  initialValue: T,
  auditContext: string
): [T, (value: T) => void] => {
  const [state, setState] = useState(initialValue);
  const { user } = useAuth();
  
  const setAuditedState = (newValue: T) => {
    auditService.log({
      context: auditContext,
      oldValue: state,
      newValue,
      userId: user.id,
      timestamp: new Date()
    });
    setState(newValue);
  };
  
  return [state, setAuditedState];
};
```

#### Canonical Errors
```typescript
// infrastructure/errors/messages.ts
export const CANONICAL_ERRORS = {
  // From [SS §8] - EXACT messages required
  GAUGE_SEALED: "Gauge is sealed and cannot be checked out",
  CALIBRATION_DUE: "Gauge calibration is due and cannot be checked out",
  INSUFFICIENT_PERMISSION: "You do not have permission to perform this action",
  // ... complete list from SS
} as const;
```

#### Event System
```typescript
// infrastructure/events/types.ts
export interface ModuleEvent<T = unknown> {
  type: keyof typeof CANONICAL_EVENTS;
  source: string;
  timestamp: Date;
  payload: T;
  version: string; // Schema version
  userId: string;
}
```

### 4.2 Testing Infrastructure
- [ ] Unit tests for all hooks
- [ ] Integration tests for auth flow
- [ ] Accessibility tests with jest-axe
- [ ] Event system tests

## Phase 5: Gauge Module Planning (Days 11-12)

### 5.1 Analyze Gauge Complexity
- [ ] Map all backend services to frontend components
- [ ] Identify shared state requirements
- [ ] Plan component lazy loading strategy
- [ ] Design validation schema hierarchy

### 5.2 Create Gauge Module Structure
```
modules/gauge/
├── index.ts                # Module descriptor
├── routes/
│   ├── index.tsx          # Route aggregator with ordering
│   ├── operations.tsx     # Basic CRUD routes
│   ├── tracking.tsx       # Checkout/return routes
│   ├── transfers.tsx      # Transfer routes
│   └── reports.tsx        # Reporting routes
├── components/
│   ├── shared/            # Shared gauge components
│   ├── operations/        # List, detail, search
│   ├── tracking/          # Checkout, return flows
│   ├── transfers/         # Transfer workflows
│   └── reports/           # Report views
├── services/
│   ├── gaugeApi.ts        # Organized by operation type
│   └── types.ts           # API types
├── validation/
│   ├── schemas/           # Gauge validation schemas
│   ├── patterns.ts        # Thread gauge regex, etc.
│   └── rules.ts           # Business validation rules
├── stores/
│   ├── gaugeStore.ts      # Main gauge state
│   ├── checkoutStore.ts   # Active checkouts
│   └── middleware.ts      # Audit middleware
└── hooks/
    ├── useGaugeList.ts    # List with filters
    ├── useCheckout.ts     # Checkout flow
    └── useTransfer.ts     # Transfer flow
```

## Phase 6: Gauge Module Implementation (Days 13-20)

### 6.1 Incremental Development
- [ ] Week 1: Basic operations (list, detail, search)
- [ ] Week 2: Checkout/return workflows
- [ ] Week 3: Transfers and unseals
- [ ] Week 4: Calibration and reports

### 6.2 Continuous Validation
- [ ] Daily: Accessibility audit
- [ ] Per feature: Canonical compliance check
- [ ] Per workflow: State audit verification
- [ ] Per API: Version compatibility test

## Phase 7: Integration Testing (Days 21-23)

### 7.1 Full System Tests
- [ ] All canonical events fire correctly
- [ ] State changes are fully audited
- [ ] Permissions enforce across modules
- [ ] API versioning works correctly
- [ ] Accessibility meets WCAG 2.1 AA

### 7.2 Performance Testing
- [ ] Bundle size analysis
- [ ] Route lazy loading verification
- [ ] API call optimization
- [ ] State management efficiency

## Phase 8: Documentation & Handoff (Days 24-25)

### 8.1 Technical Documentation
- [ ] Architecture decision records
- [ ] Pattern implementation guides
- [ ] Module development guide
- [ ] Troubleshooting guide

### 8.2 Compliance Documentation
- [ ] System requirement mappings
- [ ] Audit trail documentation
- [ ] Accessibility compliance report
- [ ] Security review checklist

## Success Criteria

### Must Have (Non-Negotiable)
- [ ] All Prime Directives implemented
- [ ] Canonical messages/events used exclusively
- [ ] State changes fully audited
- [ ] Accessibility enforced (WCAG 2.1 AA)
- [ ] Backend API alignment perfect
- [ ] All validation patterns from [DB] implemented

### Should Have (Important)
- [ ] API versioning strategy proven
- [ ] Event bus with <10ms latency
- [ ] Permission checks <1ms
- [ ] 90%+ code coverage
- [ ] Bundle size <500KB initial

### Nice to Have (Future)
- [ ] Storybook for all components
- [ ] E2E tests with Playwright
- [ ] Performance monitoring
- [ ] Feature flags system

## Risk Mitigation

### High Risk Areas
1. **State Auditing Performance** - Mitigation: Batch audit logs
2. **Gauge Module Complexity** - Mitigation: Incremental development
3. **API Version Migration** - Mitigation: Dual support period
4. **Accessibility Compliance** - Mitigation: Continuous testing

### Contingency Plans
- If audit system impacts performance: Implement async queue
- If gauge module too complex: Split into feature flags
- If accessibility fails: Dedicated remediation sprint

## Timeline Summary

- **Days 1-2**: System compliance audit
- **Days 3-4**: Architecture refinement  
- **Days 5-7**: Auth module POC
- **Days 8-10**: Infrastructure implementation
- **Days 11-12**: Gauge module planning
- **Days 13-20**: Gauge module implementation
- **Days 21-23**: Integration testing
- **Days 24-25**: Documentation & handoff

**Total Duration**: 5 weeks with single developer

## Next Immediate Actions

1. Start system compliance audit TODAY
2. Create `FRONTEND_SYSTEM_COMPLIANCE.md` 
3. Set up infrastructure folder structure
4. Begin auth module POC by Day 5

---

**Remember**: The system docs are the contract. Every decision must trace back to a requirement. When in doubt, check the docs.