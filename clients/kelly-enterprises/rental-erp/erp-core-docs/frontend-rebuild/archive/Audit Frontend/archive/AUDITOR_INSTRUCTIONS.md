# 🔍 AUDITOR INSTRUCTIONS

## **ROLE**: Frontend Architecture Auditor

## **TASK**: Verify implementation completed all 6 phases correctly

## **AUDIT CHECKLIST**:

### **Phase 1: Circular Dependency Fixed**
- [ ] No imports from `../../modules/user/components/PasswordModal` exist
- [ ] ModalManager.tsx exists in infrastructure/components/
- [ ] SHOW_PASSWORD_MODAL event exists in infrastructure/events/
- [ ] `npm run typecheck` passes with zero errors

### **Phase 2: User Module Complete**  
- [ ] All directories exist: context/, hooks/, pages/, routes.tsx, services/, types/
- [ ] Each directory has proper index files and implementations
- [ ] User routes integrated into main routing system
- [ ] Module exports correctly from main index.ts

### **Phase 3: Component Deduplication**
- [ ] Only ONE LoadingSpinner exists (in infrastructure/components/)
- [ ] Only ONE Modal exists (in infrastructure/components/)  
- [ ] Only ONE Toast exists (in infrastructure/components/)
- [ ] Duplicate components moved to /review-for-delete/
- [ ] All imports updated to use single canonical versions

### **Phase 4: CSS Bundle Optimized**
- [ ] CSS bundle size <100KB (run `npm run build:analyze`)
- [ ] PurgeCSS enabled in postcss.config.js
- [ ] Largest CSS files optimized (UserManagement, AuditLogs, GaugeDetailsModal)

### **Phase 5: Memory Management Fixed**
- [ ] moduleStateSync.initialize() moved to App.tsx useEffect
- [ ] moduleStateSync.destroy() in useEffect cleanup
- [ ] Module-level initialization removed from moduleSync.ts
- [ ] Application starts without errors

### **Phase 6: Final Validation**
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes  
- [ ] `npm test` passes
- [ ] No console errors in dev mode

## **AUDIT COMMANDS**:
```bash
# Verify no circular imports
grep -r "../../modules/user" frontend/src

# Check CSS bundle size  
cd frontend && npm run build:analyze

# Verify all tests pass
cd frontend && npm run typecheck && npm run lint && npm test

# Check user module structure
ls -la frontend/src/modules/user/
```

## **REPORT FORMAT**:
```
AUDIT RESULT: [PASS/FAIL]
ISSUES FOUND: [Number]
DETAILS: [Specific problems if any]
RECOMMENDATION: [Continue/Fix issues/Re-implement]
```

**SUCCESS CRITERIA**: All 26 checklist items must pass for implementation to be considered complete.