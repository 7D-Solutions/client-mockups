# Modal Quality Check - Claude Code Commands

## Purpose

Check if modals follow the modal-css-removal-plan:
1. NO CSS module files
2. Use infrastructure components (not raw HTML inputs)
3. Only minimal inline styles for layout (not visual styling)

**Related Documents:**
- `/erp-core-docs/frontend-rebuild/Plans/modal-css-removal-plan.md` - The plan being validated
- `/CLAUDE.md` - General styling rules (CSS modules for non-modal components)

## Commands to Execute

**Step 1: Navigate and count files**
```bash
cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src
find . -name "*Modal*.tsx" -type f | wc -l
```

**Step 2: Check for CSS module files (should NOT exist)**

```bash
echo "=== CHECKING FOR CSS MODULE FILES ==="
echo "Modals should NOT have .module.css files"
echo ""
find . -name "*Modal*.module.css" -type f | while read file; do
  echo "❌ FOUND: $file (should be removed)"
done
```

**Step 3: Check for raw HTML inputs (should use infrastructure components)**

```bash
echo ""
echo "=== CHECKING FOR RAW HTML INPUTS ==="
echo "Should use FormInput, FormCheckbox, FormSelect, FormTextarea instead"
echo ""

for file in $(find . -name "*Modal*.tsx" -type f); do
  raw_inputs=$(grep -c '<input\|<select\|<textarea' "$file" || echo 0)
  if [ "$raw_inputs" -gt 0 ]; then
    echo "❌ $(basename "$file"): $raw_inputs raw HTML inputs found"
  fi
done
```

**Step 4: Check inline styles count**

```bash
echo ""
echo "=== CHECKING INLINE STYLES COUNT ==="
echo "Files with many inline styles may need manual review"
echo ""

for file in $(find . -name "*Modal*.tsx" -type f); do
  count=$(grep -c 'style={{' "$file" || echo 0)
  basename_file=$(basename "$file")
  
  if [ "$count" -gt 15 ]; then
    echo "⚠️ HIGH: $basename_file has $count inline styles - manual check needed"
  elif [ "$count" -gt 8 ]; then
    echo "📋 MEDIUM: $basename_file has $count inline styles"
  fi
done
```

**Step 5: Summary Report**

```bash
echo ""
echo "=== MODAL QUALITY SUMMARY ==="
echo ""
echo "Issues to fix:"
echo "1. Remove any .module.css files found above"
echo "2. Replace raw HTML inputs with FormInput/FormCheckbox/FormSelect/FormTextarea"
echo "3. Move visual styling (colors, fonts, borders) to infrastructure components"
echo "4. Remove any className={styles.xxx} references (replace with inline styles or remove)"
echo ""
echo "Allowed inline styles (layout only):"
echo "- display, flex, grid, gap"
echo "- margin, padding (spacing)"
echo "- position, top, left, right, bottom"
echo "- alignItems, justifyContent, flexDirection"
echo "- width, height (when needed for layout)"
```

**Step 6: Check for broken className references**

```bash
echo ""
echo "=== CHECKING FOR BROKEN CLASSNAME REFERENCES ==="
echo "Modals should NOT have className={styles.xxx} references"
echo ""

for file in $(find . -name "*Modal*.tsx" -type f); do
  classname_count=$(grep -c 'className={styles\.' "$file" || echo 0)
  if [ "$classname_count" -gt 0 ]; then
    echo "🚨 CRITICAL: $(basename "$file") has $classname_count broken className references"
  fi
done
```

**Step 7: Manual verification (if needed)**

For files flagged in Step 4 with many inline styles, manually check to confirm they only contain:
- ✅ Layout properties: display, flex, grid, gap, margin, padding
- ✅ Positioning: position, top, left, alignItems, justifyContent
- ❌ Visual styling: colors, fonts, borders, shadows (should use infrastructure components)

## What Makes a Modal "Clean"

1. **NO .module.css file** - Removed/deleted
2. **NO className={styles.xxx}** - No references to non-existent styles
3. **NO raw HTML inputs** - Uses FormInput, FormCheckbox, etc.
4. **Minimal inline styles** - Only for layout arrangement
5. **Uses infrastructure components** - Modal, Button, Badge, etc. handle visual styling

## Example of a Clean Modal

```tsx
// ✅ GOOD - Clean modal following the plan
import { Modal, Button, FormInput } from '../infrastructure/components';

export function MyModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Example">
      <Modal.Body>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>  {/* ✅ Layout only */}
          <FormInput label="Name" />  {/* ✅ Infrastructure component */}
          <Button>Submit</Button>     {/* ✅ Infrastructure component */}
        </div>
      </Modal.Body>
    </Modal>
  );
}
```