# Modal Duplicate Cleanup Implementation Plan

**Persona Required**: `--persona-architect`  
**Risk Level**: ZERO (Validated by 3 independent Claude instances)  
**Status**: Ready for immediate execution

## Executive Summary
Delete 3 duplicate modal files from `/src/components/` directory. Keep module-specific versions in `/src/modules/gauge/components/`. Zero risk confirmed through comprehensive analysis.

## Pre-Execution Validation
```bash
# Navigate to frontend directory first
cd frontend

# Verify no active imports exist
grep -Er "from.*components/(GaugeModalManager|QCApprovalsModal|TransferModal)" frontend/src --include="*.tsx"
# Expected: No output

# Confirm files exist before deletion
ls -la src/components/GaugeModalManager.tsx src/components/QCApprovalsModal.tsx src/components/TransferModal.tsx
# Expected: All three files listed
```

## Implementation Steps

### Step 1: Delete GaugeModalManager (breaks dependency chain)
```bash
rm src/components/GaugeModalManager.tsx
npm run build
# Expected: Build succeeds
```

### Step 2: Verify TransferModal orphaned
```bash
grep -Er "components/TransferModal" frontend/src --include="*.tsx"
# Expected: No output (dependency broken by Step 1)
```

### Step 3: Delete remaining duplicates
```bash
rm src/components/QCApprovalsModal.tsx
rm src/components/TransferModal.tsx
```

### Step 4: Final validation
```bash
npm run build && npm run lint
# Expected: Both commands succeed

# Verify deletions
ls src/components/GaugeModalManager.tsx src/components/QCApprovalsModal.tsx src/components/TransferModal.tsx
# Expected: "No such file or directory" for all
```

### Step 5: Create architectural guidelines
```bash
mkdir -p frontend/docs/architectural-guidelines

# Create component placement guidelines document
# Use TodoWrite to track this documentation task
```

## Success Criteria
- [ ] All 3 duplicate files deleted
- [ ] Build passes without errors
- [ ] Lint passes without errors  
- [ ] Module versions remain in `/src/modules/gauge/components/`
- [ ] Documentation created for future prevention

## Files Being Deleted
1. `src/components/GaugeModalManager.tsx` (unused, broken imports)
2. `src/components/QCApprovalsModal.tsx` (unused duplicate) 
3. `src/components/TransferModal.tsx` (orphaned after step 1)

## Rollback (if needed)
```bash
git checkout src/components/GaugeModalManager.tsx
git checkout src/components/QCApprovalsModal.tsx
git checkout src/components/TransferModal.tsx
```

## Expected Outcome
- ~1000 lines of dead code eliminated
- Clear module boundaries established
- Single source of truth for each modal component
- Prevention guidelines documented