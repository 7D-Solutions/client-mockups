# Service Quality Check - Claude Code Commands

## Purpose

Check if backend services follow the service-architecture-standards:
1. NO direct pool imports in service layer
2. Use BaseService.executeInTransaction (not manual transaction management)
3. Use structured logging (not console.log)
4. Proper service registration patterns

**SuperClaude Integration**: 
- **Auto-Activate Personas**: `--persona-backend --persona-analyzer --persona-architect`
- **Auto-Activate Flags**: `--think --analyze --focus quality`

**Related Documents:**
- `/CLAUDE.md` - Backend architectural standards
- `/backend/src/infrastructure/services/BaseService.js` - Transaction pattern reference

## Commands to Execute

**Step 1: Count services**
```bash
cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend/src
echo "Total services: $(find . -name "*Service.js" -type f | wc -l)"
echo "Infrastructure: $(find . -name "*Service.js" -path "*/infrastructure/*" | wc -l)"
echo "Business: $(find . -name "*Service.js" ! -path "*/infrastructure/*" | wc -l)"
```

**Step 2: Find pool access violations**
```bash
echo -e "\n=== POOL ACCESS VIOLATIONS ==="
for file in $(find . -name "*Service.js" -not -path "*/infrastructure/*" -type f); do
  if grep -q "extends BaseService" "$file" 2>/dev/null && grep -q "pool\.getConnection\|await pool\." "$file" 2>/dev/null; then
    count=$(grep -c "pool\.getConnection\|await pool\." "$file" 2>/dev/null)
    echo "$(basename "$file"): $count instances"
  fi
done
```

**Step 3: Find transaction violations**
```bash
echo -e "\n=== TRANSACTION VIOLATIONS ==="
for file in $(find . -name "*Service.js" -not -path "*/infrastructure/*" -type f); do
  count=$(grep -c "beginTransaction\|connection\.commit\|connection\.rollback" "$file" 2>/dev/null || echo 0)
  if [ "$count" -gt 0 ]; then
    echo "$(basename "$file"): $count manual transactions"
  fi
done
```

**Step 4: Find console.log usage**
```bash
echo -e "\n=== CONSOLE.LOG USAGE ==="
for file in $(find . -name "*Service.js" -type f); do
  count=$(grep -c "console\." "$file" 2>/dev/null || echo 0)
  if [ "$count" -gt 0 ]; then
    echo "$(basename "$file"): $count console statements"
  fi
done
```

**Step 5: Find TODO items**
```bash
echo -e "\n=== TODO ITEMS ==="
for file in $(find . -name "*Service.js" -type f); do
  if grep -q "TODO\|FIXME" "$file" 2>/dev/null; then
    echo "$(basename "$file"):"
    grep -n "TODO\|FIXME" "$file" 2>/dev/null | head -2
  fi
done
```

**Step 6: Check service registration**
```bash
echo -e "\n=== SERVICE REGISTRATION ==="
registered=$(grep -c "require.*services/" "bootstrap/registerServices.js" 2>/dev/null || echo 0)
business=$(find . -name "*Service.js" -not -path "*/infrastructure/*" -type f | wc -l)
echo "Registered: $registered"
echo "Business services: $business"
[ "$registered" -lt "$business" ] && echo "Missing: $((business - registered))"
```

**Step 7: Generate fix commands**
```bash
echo -e "\n=== FIX COMMANDS ==="
# Pool violations
for file in $(find . -name "*Service.js" -not -path "*/infrastructure/*" -type f); do
  if grep -q "pool\.getConnection\|await pool\." "$file" 2>/dev/null; then
    echo "/improve $file --focus architecture --persona-backend"
  fi
done

# Transaction violations
for file in $(find . -name "*Service.js" -not -path "*/infrastructure/*" -type f); do
  if grep -q "beginTransaction" "$file" 2>/dev/null; then
    echo "/improve $file --focus architecture --persona-backend"
  fi
done

# TODO implementations
for file in $(find . -name "*Service.js" -type f); do
  if grep -q "TODO\|FIXME" "$file" 2>/dev/null; then
    echo "/implement $file --focus architecture --persona-backend"
  fi
done

echo -e "\nVALIDATION:"
echo "/analyze backend/src/modules --focus quality --validate --persona-architect"
```