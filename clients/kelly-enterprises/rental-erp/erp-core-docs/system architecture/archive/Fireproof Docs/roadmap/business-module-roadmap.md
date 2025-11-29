# Business Module Development Roadmap

**Last Updated**: August 12, 2025  
**Architecture Reference**: `erp-core-docs/architecture/Modular-Vision.txt`  
**Status**: Aligned with modular architecture approach

## 🎯 **Module Development Principles**

Based on our Modular-Vision architecture:
- Each module is a **self-contained business domain**
- Modules can be **independently enabled/disabled**
- No direct imports between business modules
- Communication via event bus only
- Each module owns its complete business capability

## ✅ **COMPLETED FOUNDATION**

### **Modular Architecture** ✅ **COMPLETE**
- ✅ App.tsx reduced from 2,080+ lines to 14 lines
- ✅ All 4 ERP core modules extracted (auth, navigation, data, notifications)
- ✅ Main app imports from `@fireproof/erp-core/[module]`
- ✅ Clean separation of concerns achieved
- ✅ Foundation ready for business modules

---

## 🚀 **BUSINESS MODULES TO BUILD**

### 1. **Calibration Management Module** 
**Priority**: HIGH  
**Business Domain**: Complete calibration lifecycle management

**Module Structure**:
```
modules/calibration-management/
├── index.ts                # Module registration
├── CalibrationModule.tsx   # Main component
├── routes.tsx             # Module routes
├── components/            # UI components
├── services/             # Business logic
├── stores/               # State management
└── types/                # TypeScript definitions
```

**Module Capabilities**:
- **Send to Calibration**
  - Batch selection interface
  - Vendor management
  - Expected return dates
  - QC/Admin only access
- **Receive from Calibration**
  - Certificate upload (PDF/image)
  - Pass/Fail status
  - Next due date calculation
  - Automatic status updates
- **Calibration History**
  - Full audit trail
  - Certificate storage
  - Trend analysis

**Event Bus Integration**:
```typescript
// Emits
EVENTS.ASSET_UPDATED // When calibration status changes
EVENTS.ASSET_CHECKOUT // When sent to calibration

// Listens
EVENTS.ASSET_RETURN // Update calibration schedule
```

---

### 2. **Quality Control Module**
**Priority**: MEDIUM  
**Business Domain**: QC workflows and unseal management

**Module Capabilities**:
- **Enhanced Unseal Requests** (moved from standalone feature)
  - Show alternative gauges
  - Smart suggestions
  - Urgency indicators
- **QC Approval Workflows**
  - Multi-level approvals
  - Notification system
  - Audit trails
- **Quality Metrics**
  - Pass/fail rates
  - Response times
  - Bottleneck analysis

**Module Structure**: Same pattern as Calibration Management

---

### 3. **Inventory Management Module**
**Priority**: MEDIUM  
**Business Domain**: Stock levels and reordering

**Module Capabilities**:
- Real-time availability tracking
- Reorder point management
- Location tracking
- Usage analytics

---

### 4. **Module System Implementation**
**Priority**: LOW (Future Enhancement)  
**Purpose**: Customer-configurable module management

**When Needed**: After 3+ business modules exist

**Implementation**:
```json
// enabled-modules.json
["gauge-tracking", "calibration-management", "quality-control"]
```

**Features**:
- Module toggle UI (checkboxes)
- Dependency validation
- Module loading system
- Settings persistence

---

### 5. **Additional Business Modules** (Future)

**Reporting Module**
- Custom report builder
- Export capabilities
- Scheduled reports

**Maintenance Schedule Module**
- Preventive maintenance
- Work order management
- Resource scheduling

**Compliance Module**
- AS9102 compliance
- Audit preparation
- Document control

---

## 📊 **Implementation Roadmap**

### Phase 1: Calibration Management Module
1. Create module structure following pattern
2. Implement send/receive workflows as single module
3. Integrate with event bus
4. Test module independence

### Phase 2: Quality Control Module  
1. Enhance gauge-tracking with QC features
2. Move unseal workflows here
3. Add approval hierarchies
4. Validate no cross-module dependencies

### Phase 3: Design System Module Support
1. Create module-aware component patterns
2. Document module UI standards
3. Ensure consistent module interfaces

### Phase 4: Module System (When Needed)
1. Implement enabled-modules.json
2. Create module toggle UI
3. Add dependency checking
4. Enable customer configuration

---

## 🔧 **Technical Architecture Requirements**

### Module Independence
- **Linting Rules**: Block cross-module imports (only `@core/*` allowed)
- **Event-Based Communication**: Use EventBus for inter-module messaging
- **Database Namespacing**: Each module owns its tables (prefix: `module_name_`)
- **API Routes**: `/api/[module-name]/[endpoint]`

### Module Structure Standards
```typescript
// Every module must export
export const calibrationModule: ModuleDescriptor = {
  id: 'calibration-management',
  name: 'Calibration Management',
  routes: [{ path: '/calibration', component: CalibrationModule }],
  navigation: [{ label: 'Calibration', path: '/calibration' }],
  dependencies: [] // Only list required core modules
}
```

### Testing Requirements
- Each module must work in isolation
- Mock all event bus interactions
- Test with module disabled
- Verify no runtime errors when dependencies missing

### Development Workflow
1. Create module in `modules/[module-name]/`
2. Register in module index
3. Test in isolation
4. Integrate with existing modules via events only
5. Document event contracts

---

## ✅ **Success Criteria**

1. **Module Independence**: Each module works without others
2. **Clean Boundaries**: No cross-module imports detected by linter
3. **Event Documentation**: Clear contracts for module communication
4. **Customer Value**: Each module provides complete business capability
5. **Future Ready**: Easy to add new modules without touching existing code

---

*This roadmap aligns with the Modular-Vision architecture, focusing on business modules rather than individual features.*