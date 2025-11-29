# Text Formatting Logic Consolidation Plan

**Target**: Consolidate scattered text formatting logic from 8+ files → 1 centralized `TextFormatRules.ts`  
**Pattern**: Follow proven equipment and status badge logic consolidation approach  
**Estimated Effort**: 3-4 hours (similar scope to equipment logic migration)

## 🎯 **Actionable Execution Plan for Claude Code**

### **Phase 1: Comprehensive Discovery & Analysis** (45 minutes)

#### **1.1 Analyze Current Text Formatting Patterns**
```bash
# Commands for Claude Code to execute:
grep -r "\.replace(/_/g" --include="*.tsx" src/
grep -r "\.charAt(0)\.toUpperCase" --include="*.tsx" src/
grep -r "\.replace(/\\b\\w/g" --include="*.tsx" src/
grep -r "\.toLowerCase()\.replace" --include="*.tsx" src/
grep -r "action\.slice(1)\.replace" --include="*.tsx" src/
```

#### **1.2 Identify All Text Formatting Patterns**
- **Equipment type formatting**: `equipment_type.replace(/_/g, ' ')`
- **Status text formatting**: `status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())`
- **Action text formatting**: `action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ')`
- **Generic string formatting**: Various underscore to space conversions
- **Capitalization patterns**: Title case, sentence case, uppercase transformations

#### **1.3 Analyze Function Duplication**
- **Search for duplicate functions**: Text formatting utilities scattered across files
- **Map formatting patterns** and identify common transformations
- **Document inconsistencies** between formatting implementations
- **Identify reusable formatting patterns**: underscore removal, capitalization, word transformations

### **Phase 2: Design Centralized TextFormatRules** (30 minutes)

#### **2.1 Create TextFormatRules.ts Architecture**
```typescript
// File to create: /frontend/src/infrastructure/business/textFormatRules.ts
export interface TextFormatConfig {
  text?: string;
  equipment_type?: string;
  status?: string;
  action?: string;
  [key: string]: any;
}

export const TextFormatRules = {
  // Core text formatting methods
  formatUnderscoreToSpace(text: string): string
  formatToTitleCase(text: string): string
  formatToSentenceCase(text: string): string
  formatEquipmentType(equipment_type: string): string
  formatStatusText(status: string): string
  formatActionText(action: string): string
  
  // Advanced formatting methods
  formatCamelCaseToWords(text: string): string
  formatSnakeCaseToWords(text: string): string
  formatKebabCaseToWords(text: string): string
  capitalizeFirstLetter(text: string): string
  capitalizeWords(text: string): string
  
  // Safe formatting with null/undefined handling
  safeFormat(text: string | null | undefined, formatter: (text: string) => string): string
}
```

#### **2.2 Text Formatting Design Principles**
- **Consistent transformations**: Standardize underscore → space, capitalization patterns
- **Safe handling**: Null/undefined input protection for all methods
- **Performance optimized**: Efficient regex patterns and string operations
- **Extensible design**: Easy to add new formatting patterns

### **Phase 3: Implementation** (1.5 hours)

#### **3.1 Create TextFormatRules.ts**
- **Write comprehensive text formatting methods**
- **Include JSDoc documentation** with usage examples
- **Add TypeScript interfaces** for type safety
- **Include null safety** and error handling
- **Add unit test examples** in comments

#### **3.2 Core Text Formatting Methods**
```typescript
// Essential methods to implement:
formatUnderscoreToSpace(text): string // "equipment_type" → "equipment type"
formatToTitleCase(text): string // "equipment type" → "Equipment Type"
formatToSentenceCase(text): string // "equipment type" → "Equipment type"
formatEquipmentType(equipment_type): string // Complete equipment type formatting
formatStatusText(status): string // Complete status text formatting
formatActionText(action): string // Complete action text formatting
safeFormat(text, formatter): string // Safe wrapper with null handling
```

#### **3.3 Advanced Formatting Methods**
```typescript
// Additional utility methods:
formatCamelCaseToWords(text): string // "equipmentType" → "Equipment Type"
formatSnakeCaseToWords(text): string // "equipment_type" → "Equipment Type" 
formatKebabCaseToWords(text): string // "equipment-type" → "Equipment Type"
capitalizeFirstLetter(text): string // "word" → "Word"
capitalizeWords(text): string // "some words" → "Some Words"
```

### **Phase 4: Systematic Migration** (1.5 hours)

#### **4.1 Priority Migration Order** (Evidence-Based)
1. **SystemSettings.tsx** - Equipment type formatting patterns
2. **GaugeDetail.tsx** - Action text formatting with complex logic
3. **GaugeFilters.tsx** - Status text formatting with capitalization
4. **Equipment display components** - Direct equipment_type.replace patterns
5. **Status display components** - Status text formatting
6. **Action history components** - Action text formatting
7. **Form components** - Input/label text formatting
8. **Dashboard components** - Display text formatting

#### **4.2 Migration Pattern for Each File**
```typescript
// Before (remove these patterns):
equipment_type.replace(/_/g, ' ')
action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ')
status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

// After (replace with):
import { TextFormatRules } from '../../../infrastructure/business/textFormatRules';
TextFormatRules.formatEquipmentType(equipment_type)
TextFormatRules.formatActionText(action)
TextFormatRules.formatStatusText(status)
```

#### **4.3 File-by-File Migration Commands**
```bash
# For each target file, execute in sequence:

# 1. Read current file to understand patterns
Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/[target-file]"

# 2. Add TextFormatRules import at top of file
Edit file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/[target-file]" 
     old_string="import { [existing-imports] } from '[path]';" 
     new_string="import { [existing-imports] } from '[path]';\nimport { TextFormatRules } from '../../../infrastructure/business/textFormatRules';"

# 3. Replace formatting patterns (use MultiEdit for multiple patterns per file)
MultiEdit file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/[target-file]" 
         edits="[
           {old_string: 'equipment_type.replace(/_/g, \" \")', new_string: 'TextFormatRules.formatEquipmentType(equipment_type)'},
           {old_string: 'action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, \" \")', new_string: 'TextFormatRules.formatActionText(action)'}
         ]"

# 4. Verify changes with Read tool
Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/[target-file]" offset="[line-near-changes]" limit="10"
```

#### **4.4 Common Replacement Patterns**
```typescript
// Pattern 1: Simple underscore replacement
text.replace(/_/g, ' ') → TextFormatRules.formatUnderscoreToSpace(text)

// Pattern 2: Title case conversion
text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) → TextFormatRules.formatToTitleCase(text)

// Pattern 3: Sentence case conversion  
text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g, ' ') → TextFormatRules.formatToSentenceCase(text)

// Pattern 4: Equipment-specific formatting
equipment_type.replace(/_/g, ' ') → TextFormatRules.formatEquipmentType(equipment_type)
```

### **Phase 5: ESLint Enforcement** (30 minutes)

#### **5.1 Add ESLint Rules to Prevent Future Violations**
```javascript
// Add to eslint.config.js:
{
  selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='replace'][arguments.0.value='/_/g'][arguments.1.value=' ']",
  message: 'Use TextFormatRules.formatUnderscoreToSpace() instead of direct .replace(/_/g, " ") formatting'
},
{
  selector: "BinaryExpression[operator='+'][left.type='CallExpression'][left.callee.property.name='toUpperCase'][right.type='CallExpression'][right.callee.property.name='replace']",
  message: 'Use TextFormatRules.formatToSentenceCase() instead of manual charAt().toUpperCase() + slice().replace() patterns'
},
{
  selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='replace'][arguments.0.value='/\\\\b\\\\w/g']",
  message: 'Use TextFormatRules.formatToTitleCase() instead of direct .replace(/\\b\\w/g, ...) formatting'
},
{
  selector: "MemberExpression[property.name='equipment_type'][parent.type='CallExpression'][parent.callee.property.name='replace']",
  message: 'Use TextFormatRules.formatEquipmentType() instead of direct equipment_type.replace() patterns'
}
```

#### **5.2 Create ESLint Test File**
```bash
# Create test file with violation patterns
Write file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/test-text-format-violations.tsx" 
      content="// Test file for ESLint text formatting rules
const badPattern1 = equipment_type.replace(/_/g, ' ');
const badPattern2 = action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ');
const badPattern3 = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());"

# Run ESLint to verify rules catch violations
Bash command="npm run lint src/test-text-format-violations.tsx 2>&1 | grep -E 'TextFormatRules|replace.*_/g'"

# Move test file to cleanup after verification
Bash command="mv /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/test-text-format-violations.tsx /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/cleanup/"
```

### **Phase 6: Verification & Cleanup** (30 minutes)

#### **6.1 Comprehensive Verification Commands**
```bash
# Commands for Claude Code to execute:
grep -r "\.replace(/_/g" --include="*.tsx" src/modules/
grep -r "\.charAt(0)\.toUpperCase" --include="*.tsx" src/modules/
grep -r "equipment_type\.replace" --include="*.tsx" src/modules/
grep -r "status\.replace.*_/g" --include="*.tsx" src/modules/
grep -r "action\.slice.*replace" --include="*.tsx" src/modules/

# Verify TextFormatRules usage:
grep -r "TextFormatRules\." --include="*.tsx" src/modules/
```

#### **6.2 Verification Checklist**
- ✅ **No hardcoded text formatting** in active components
- ✅ **All duplicate formatting functions removed**
- ✅ **ESLint rules active** and catching violations
- ✅ **Import statements added** to all migrated files
- ✅ **Text output preserved** - no visual changes to formatted text
- ✅ **Performance maintained** - no performance degradation
- ✅ **Null safety** - proper handling of undefined/null inputs

#### **6.3 Documentation Update**
```bash
# Add usage examples to TextFormatRules.ts
Edit file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/infrastructure/business/textFormatRules.ts"
     old_string="export const TextFormatRules = {"
     new_string="/**
 * Text Formatting Rules - Centralized text formatting logic
 * 
 * Usage Examples:
 * - TextFormatRules.formatEquipmentType('hand_tool') → 'Hand Tool'
 * - TextFormatRules.formatActionText('checkout_action') → 'Checkout Action'
 * - TextFormatRules.formatStatusText('out_of_service') → 'Out Of Service'
 */
export const TextFormatRules = {"

# Update Business Logic Consolidation Analysis document
Edit file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/erp-core-docs/system architecture/Reviews/Business-Logic-Consolidation-Analysis.md"
     old_string="1. **TextFormatRules.ts** - Consolidate text formatting logic"
     new_string="1. ✅ **~~TextFormatRules.ts~~** - COMPLETED: Consolidated text formatting logic from 8+ files"
```

## 🚨 **Critical Success Factors**

### **Pattern Consistency**
- Follow **exact same approach** as equipment and status badge logic consolidation
- Use **identical file structure** and naming conventions
- Apply **same ESLint enforcement** strategy
- Maintain **same code quality standards**

### **Zero Regression Requirement**
- **Text output must remain visually identical** - no formatting changes
- **Performance must be maintained** - efficient string operations
- **Component interfaces unchanged** - no breaking changes to props
- **Null safety improved** - better error handling than original code

### **Automation-First Approach**
- **ESLint rules added immediately** after migration
- **Verification commands documented** for future maintenance
- **Test file created** to validate ESLint enforcement
- **Performance benchmarks** established

## 📊 **Expected Outcomes**

### **Files Consolidated**: 8+ files → 1 centralized TextFormatRules.ts
### **Functions Eliminated**: 5+ duplicate text formatting functions
### **Logic Standardized**: Consistent text formatting across all components
### **Maintenance Improved**: Single source of truth for all text formatting logic
### **Performance Optimized**: Efficient regex patterns and string operations
### **Safety Enhanced**: Null/undefined handling for all text operations

## 🔄 **Claude Code Execution Commands**

### **Phase 1 Commands - Discovery**
```bash
# Execute these Grep commands in sequence:
Grep pattern="\.replace\(/_/g.*['\"]\\s['\"]" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="files_with_matches"
Grep pattern="\.charAt\(0\)\.toUpperCase\(\)" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="files_with_matches"
Grep pattern="equipment_type.*\.replace" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="content" -A=2
Grep pattern="action.*charAt.*toUpperCase.*slice.*replace" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="content" -A=1
```

### **Phase 2 Commands - Analysis**
```bash
# Read each discovered file:
Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/[discovered-file-1]"
Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/[discovered-file-2]"
# Continue for all discovered files
```

### **Phase 3 Commands - Implementation**
```bash
# Create centralized TextFormatRules:
Write file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/infrastructure/business/textFormatRules.ts" content="[TextFormatRules implementation]"
```

### **Phase 4 Commands - Migration** 
```bash
# For each target file:
Edit file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/[target-file]" old_string="[current-pattern]" new_string="TextFormatRules.[method-call]"

# Use MultiEdit for files with multiple patterns:
MultiEdit file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/[target-file]" edits="[{old_string: pattern1, new_string: TextFormatRules.method1}, {old_string: pattern2, new_string: TextFormatRules.method2}]"
```

### **Phase 5 Commands - ESLint Enforcement**
```bash
# Add ESLint rules:
Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/eslint.config.js"
Edit file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/eslint.config.js" old_string="[existing-rules-section]" new_string="[existing-rules + new-text-format-rules]"
```

### **Phase 6 Commands - Verification**
```bash
# Verification Grep commands:
Grep pattern="\.replace\(/_/g" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules" output_mode="files_with_matches"
Grep pattern="\.charAt\(0\)\.toUpperCase" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules" output_mode="files_with_matches"  
Grep pattern="TextFormatRules\." path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="count"

# ESLint verification:
Bash command="npm run lint 2>&1 | grep -E 'TextFormatRules|replace.*_/g' || echo 'No text formatting violations found'"
```

## 🎯 **Follow-Up Priorities**

After completing text formatting consolidation:

1. **Permission/Role Logic Consolidation** (7+ files)
2. **Date/Time Formatting Logic** (potential area)
3. **Validation Logic Consolidation** (potential area)

This plan provides Claude Code with specific, actionable steps to execute the text formatting logic consolidation using the proven pattern from the equipment and status badge logic migrations, ensuring systematic technical debt elimination.