# CSS Modal Cleanup Plan

## CRITICAL: 11 Broken Modal Components Need Immediate Fix

**Problem**: Components use undefined CSS classes: `modal-overlay`, `modal-content`, `modal-actions`, `modal-wide`

**Solution**: Migrate to CSS Modules (align with existing 33 components)

## ACTION 1: Create Base Modal CSS Module

**File**: `/frontend/src/styles/modal-base.module.css`
```css
.overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
}

.content {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.wide {
  max-width: 1200px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid #e9ecef;
}

.header {
  margin: 0 0 1rem 0;
  color: var(--color-primary);
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
```

## ACTION 2: Migrate 11 Broken Components

**Components to fix:**
1. EditGaugeModal.tsx
2. GaugeDetailsModal.tsx (components/)  
3. GaugeDetailsModal.tsx (modules/gauge/)
4. UnsealConfirmModal.tsx
5. UnsealRequestModal.tsx
6. UnsealRequestsModal.tsx
7. CheckinModal.tsx
8. CheckoutModal.tsx
9. TransferPendingModal.tsx
10. TransferReceiveModal.tsx
11. TransferModal.tsx (modules/gauge/)

**For each component, execute these steps:**

1. Create `ComponentName.module.css` file
2. Add to CSS file: `@import '../../styles/modal-base.module.css';`
3. Add to component: `import styles from './ComponentName.module.css';`
4. Replace all className strings:
   - `"modal-overlay"` → `{styles.overlay}`
   - `"modal-content"` → `{styles.content}` 
   - `"modal-content modal-wide"` → `{`${styles.content} ${styles.wide}`}`
   - `"modal-actions"` → `{styles.actions}`

## ACTION 3: Remove Dead ReactModal CSS

After all components migrated, remove unused ReactModal styles from `/frontend/src/index.css`:
- Delete lines 341-366 (.ReactModal__Overlay, .ReactModal__Content)  
- Delete lines 426-439 (modal size classes with ReactModal)
- Keep modal-header, modal-body, modal-footer (still used by some components)