# 🧠 THINKING TAG INSTRUCTIONS

## **MANDATORY**: Use `<thinking>` tags for EVERY step

### **Simple Format**:
```xml
<thinking>
Doing: [Current step]
Expect: [What should happen]  
Plan: [Exact changes]
Check: [How to verify]
</thinking>
```

### **Three Rules**:
1. **THINK FIRST** - Before every Read/Edit/Bash command
2. **CHECK AFTER** - Verify results match expectations  
3. **MARK COMPLETE** - Only after validation passes

### **Example**:
```xml
<thinking>
Doing: Read MainLayout.tsx to find circular dependency
Expect: Import from ../../modules/user/components/PasswordModal on line 8
Plan: Will replace with event-driven modal system
Check: Grep for any other PasswordModal imports
</thinking>
```

### **Error Format**:
```xml
<thinking>
Error: [What failed]
Why: [Root cause]
Fix: [Solution]
</thinking>
```

**SUCCESS = THINK → EXECUTE → VERIFY → MARK [✅]**