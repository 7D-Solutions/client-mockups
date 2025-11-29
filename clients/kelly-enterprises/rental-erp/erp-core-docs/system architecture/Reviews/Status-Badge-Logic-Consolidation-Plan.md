# Status Badge Logic Consolidation Plan

**Target**: Consolidate scattered status badge logic from 10+ files → 1 centralized `StatusRules.ts`  
**Pattern**: Follow proven equipment logic consolidation approach  
**Estimated Effort**: 4-6 hours (similar to equipment logic migration)

## 🎯 **Actionable Execution Plan for Claude Code**

### **Phase 1: Comprehensive Discovery & Analysis** (1 hour)

#### **1.1 Analyze Current Status Badge Patterns**
```bash
# Commands for Claude Code to execute:
grep -r "status.*===.*'(available|out_of_service|checked_out|maintenance|calibration)" --include="*.tsx" src/
grep -r "Badge.*variant.*status" --include="*.tsx" src/
grep -r "getStatus(Variant|Tag|Badge)" --include="*.tsx" src/
```

#### **1.2 Identify All Status-to-Badge Mappings**
- **Read each affected file** and document current status mapping logic
- **Catalog all status values**: available, out_of_service, checked_out, maintenance, calibration_due, pending_qc, etc.
- **Document badge variants**: success, error, warning, danger, info, primary, secondary

#### **1.3 Analyze Function Duplication**
- **Search for duplicate functions**: `getStatusVariant()`, `getStatusTag()`, `getStatusBadgeVariant()`
- **Map function signatures** and identify common patterns
- **Document inconsistencies** between implementations

### **Phase 2: Design Centralized StatusRules** (30 minutes)

#### **2.1 Create StatusRules.ts Architecture**
```typescript
// File to create: /frontend/src/infrastructure/business/statusRules.ts
export interface StatusConfig {
  status?: string;
  calibration_status?: string;
  calibration_due_date?: string;
  [key: string]: any;
}

export const StatusRules = {
  // Core status badge logic
  getStatusBadgeVariant(item: StatusConfig): string
  getStatusDisplayText(item: StatusConfig): string
  getStatusTag(item: StatusConfig): string
  
  // Equipment-specific status logic
  isCalibrationOverdue(item: StatusConfig): boolean
  isAvailable(item: StatusConfig): boolean
  isCheckedOut(item: StatusConfig): boolean
  isOutOfService(item: StatusConfig): boolean
  
  // Transfer-specific status logic  
  getTransferStatusVariant(status: string): string
}
```

#### **2.2 Status Mapping Design**
- **Standardize badge variants**: Map all status values to consistent badge variants
- **Priority hierarchy**: calibration_due > out_of_service > checked_out > available
- **Transfer status mapping**: pending → warning, accepted → success, rejected → danger

### **Phase 3: Implementation** (2 hours)

#### **3.1 Create StatusRules.ts**
- **Write comprehensive status mapping logic**
- **Include JSDoc documentation** with usage examples
- **Add TypeScript interfaces** for type safety
- **Include calibration date logic** (consolidate from existing functions)

#### **3.2 Enhanced Status Logic Methods**
```typescript
// Methods to implement:
getStatusBadgeVariant(item): 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary'
getStatusDisplayText(item): string // Human-readable status text
isCalibrationOverdue(item): boolean // Consolidate existing logic
getTransferStatusVariant(status): string // Transfer-specific mapping
```

### **Phase 4: Systematic Migration** (2 hours)

#### **4.1 Priority Migration Order**
1. **EditGaugeModal.tsx** - Line 165 hardcoded badge logic
2. **GaugeModalManager.tsx** - Remove duplicate `getStatusVariant()` function
3. **GaugeDetail.tsx** - Remove duplicate status functions
4. **TransfersManager.tsx** - Replace `getStatusBadgeVariant()`
5. **Remaining components** - Dashboard and display components

#### **4.2 Migration Pattern for Each File**
```typescript
// Before (remove these patterns):
gauge.status === 'available' ? 'success' : gauge.status === 'out_of_service' ? 'error' : 'warning'

// After (replace with):
import { StatusRules } from '../../../infrastructure/business/statusRules';
<Badge variant={StatusRules.getStatusBadgeVariant(gauge)}>
  {StatusRules.getStatusDisplayText(gauge)}
</Badge>
```

#### **4.3 File-by-File Migration Commands**
- **Read** each target file
- **Edit** to add StatusRules import
- **Replace** hardcoded logic with StatusRules methods
- **Remove** duplicate functions
- **Test** that functionality remains identical

### **Phase 5: ESLint Enforcement** (30 minutes)

#### **5.1 Add ESLint Rules to Prevent Future Violations**
```javascript
// Add to eslint.config.js:
{
  selector: "ConditionalExpression[test.type='BinaryExpression'][test.left.property.name='status'][test.operator='===']",
  message: 'Use StatusRules.getStatusBadgeVariant() instead of direct status comparisons for badge variants'
},
{
  selector: "CallExpression[callee.property.name='toLowerCase'][parent.type='BinaryExpression'][parent.operator='===']",
  message: 'Use StatusRules methods instead of direct status.toLowerCase() comparisons'
}
```

#### **5.2 Create ESLint Test File**
- **Create verification file** with problematic patterns
- **Run ESLint** to confirm rules trigger correctly
- **Move test file** to review-for-delete

### **Phase 6: Verification & Cleanup** (30 minutes)

#### **6.1 Comprehensive Verification Commands**
```bash
# Commands for Claude Code to execute:
grep -r "status.*===.*'(available|out_of_service)" --include="*.tsx" src/modules/
grep -r "Badge.*variant.*status" --include="*.tsx" src/modules/
grep -r "getStatus(Variant|Tag|Badge)" --include="*.tsx" src/modules/
```

#### **6.2 Verification Checklist**
- ✅ **No hardcoded status badge logic** in active components
- ✅ **All duplicate functions removed** (getStatusVariant, getStatusTag, etc.)
- ✅ **ESLint rules active** and catching violations
- ✅ **Import statements added** to all migrated files
- ✅ **Functionality preserved** - no visual changes to badges

#### **6.3 Documentation Update**
- **Update StatusRules.ts** with usage examples
- **Add developer comments** explaining migration
- **Update architecture documentation**

## 🚨 **Critical Success Factors**

### **Pattern Consistency**
- Follow **exact same approach** as equipment logic consolidation
- Use **identical file structure** and naming conventions
- Apply **same ESLint enforcement** strategy

### **Zero Regression Requirement**
- **Visual output must remain identical** - no badge appearance changes
- **Functionality must be preserved** - all status logic behavior unchanged
- **Component interfaces unchanged** - no breaking changes to props

### **Automation-First Approach**
- **ESLint rules added immediately** after migration
- **Verification commands documented** for future maintenance
- **Test file created** to validate ESLint enforcement

## 📊 **Expected Outcomes**

### **Files Consolidated**: 10+ files → 1 centralized StatusRules.ts
### **Functions Eliminated**: 3-4 duplicate status functions
### **Logic Standardized**: Consistent status-to-badge mapping across all components
### **Maintenance Improved**: Single source of truth for all status display logic

## 🔄 **Execution Commands for Claude Code**

1. **`grep -r "Badge.*variant" src/ --include="*.tsx"`** - Discovery phase
2. **`Read [each affected file]`** - Analysis phase  
3. **`Write StatusRules.ts`** - Implementation phase
4. **`Edit [each file] + MultiEdit`** - Migration phase
5. **`Edit eslint.config.js`** - Enforcement phase
6. **`grep -r "status.*===" src/`** - Verification phase

This plan provides Claude Code with specific, actionable steps to execute the status badge logic consolidation using the proven pattern from the equipment logic migration.