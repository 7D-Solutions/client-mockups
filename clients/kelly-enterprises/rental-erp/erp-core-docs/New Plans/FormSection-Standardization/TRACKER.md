# FormSection Standardization Tracker

**Last Updated**: 2025-11-07
**Overall Progress**: 1/20+ forms (5%)

---

## Phase 1: Foundation ✅ COMPLETE

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Create FormSection component | ✅ Complete | 2025-11-07 | `/frontend/src/infrastructure/components/FormSection.tsx` |
| Create FormSection.module.css | ✅ Complete | 2025-11-07 | Uses CSS variables from tokens.css |
| Export from infrastructure | ✅ Complete | 2025-11-07 | Added to `/frontend/src/infrastructure/components/index.ts` |
| Apply to HandToolForm | ✅ Complete | 2025-11-07 | Proof of concept, 5 sections with 3-column grids |
| Create ESLint rule | ✅ Complete | 2025-11-07 | Rule: `infrastructure/prefer-form-section` |
| Update CLAUDE.md | ✅ Complete | 2025-11-07 | Added Form Section System examples |

---

## Phase 2: Gauge Creation Forms

| Form | File Path | Status | Date | Sections | Notes |
|------|-----------|--------|------|----------|-------|
| HandToolForm | `/frontend/src/modules/gauge/components/creation/forms/HandToolForm.tsx` | ✅ Complete | 2025-11-07 | 5 | Reference implementation |
| CalibrationStandardForm | `/frontend/src/modules/gauge/components/creation/forms/CalibrationStandardForm.tsx` | ⏳ Pending | - | TBD | Check for section headers |
| ThreadGaugeForm | `/frontend/src/modules/gauge/components/creation/forms/ThreadGaugeForm.tsx` | ⏳ Pending | - | TBD | Check for section headers |
| LargeEquipmentForm | `/frontend/src/modules/gauge/components/creation/forms/LargeEquipmentForm.tsx` | ⏳ Pending | - | TBD | Check for section headers |
| OtherMeasuringDeviceForm | `/frontend/src/modules/gauge/components/creation/forms/` | ⏳ Pending | - | TBD | Verify file exists |

**Phase 2 Progress**: 1/5 forms (20%)

---

## Phase 3: Gauge Management Forms

| Form | File Path | Status | Date | Sections | Notes |
|------|-----------|--------|------|----------|-------|
| CalibrationStandard Edit | TBD | ⏳ Pending | - | TBD | Locate edit form |
| ThreadGauge Edit | TBD | ⏳ Pending | - | TBD | Locate edit form |
| HandTool Edit | TBD | ⏳ Pending | - | TBD | Locate edit form |
| LargeEquipment Edit | TBD | ⏳ Pending | - | TBD | Locate edit form |
| Calibration Forms | TBD | ⏳ Pending | - | TBD | Check calibration workflow |
| Transfer Forms | TBD | ⏳ Pending | - | TBD | Check inventory transfer |
| Checkout Forms | TBD | ⏳ Pending | - | TBD | Check checkout workflow |

**Phase 3 Progress**: 0/? forms (0%)

---

## Phase 4: Platform-Wide Forms

| Module | Forms | Status | Date | Notes |
|--------|-------|--------|------|-------|
| Admin Module | TBD | ⏳ Pending | - | User management, settings |
| Inventory Module | TBD | ⏳ Pending | - | Stock forms, transfers |
| User Module | TBD | ⏳ Pending | - | Profile, preferences |
| Other Modules | TBD | ⏳ Pending | - | Scan for section headers |

**Phase 4 Progress**: 0/? forms (0%)

---

## Phase 5: Cleanup & Validation

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Platform-wide lint check | ⏳ Pending | - | Run `npm run lint` |
| Fix all violations | ⏳ Pending | - | Address `prefer-form-section` errors |
| Remove deprecated patterns | ⏳ Pending | - | Search for manual section headers |
| Update documentation | ⏳ Pending | - | Finalize best practices |
| Verify zero violations | ⏳ Pending | - | Final ESLint check |

**Phase 5 Progress**: 0/5 tasks (0%)

---

## Status Legend

- ✅ **Complete**: Implemented and tested
- 🔄 **In Progress**: Currently being worked on
- ⏳ **Pending**: Not yet started
- ⚠️ **Blocked**: Waiting on dependency
- ❌ **Skipped**: Not applicable

---

## Next Steps

1. **Verify HandToolForm**: Test in browser, confirm no issues
2. **Locate remaining forms**: Find all gauge creation/edit forms
3. **Phase 2 execution**: Apply FormSection to CalibrationStandardForm next
4. **Update tracker**: Mark progress as each form is completed

---

## ESLint Status

**Current Violations**: 0 (HandToolForm compliant)
**Rule**: `infrastructure/prefer-form-section` enabled as error
**Target**: 0 violations platform-wide

---

## Additional Cleanup: LocationInput Replacement ✅ COMPLETE

**Issue Discovered**: Custom LocationInput component with hardcoded A1-L5 locations instead of using actual storage_locations table.

**Solution**: Replace with existing StorageLocationSelect infrastructure component.

| File | Status | Date | Notes |
|------|--------|------|-------|
| HandToolForm.tsx | ✅ Complete | 2025-11-07 | Replaced LocationInput with StorageLocationSelect |
| CalibrationStandardForm.tsx | ✅ Complete | 2025-11-07 | Replaced LocationInput with StorageLocationSelect |
| LargeEquipmentForm.tsx | ✅ Complete | 2025-11-07 | Replaced LocationInput with StorageLocationSelect |
| ThreadGaugeForm.tsx | ✅ Complete | 2025-11-07 | Replaced LocationInput with StorageLocationSelect |
| QCApprovalsModal.tsx | ✅ Complete | 2025-11-07 | Replaced LocationInput with StorageLocationSelect |
| OutOfServiceReviewModal.tsx | ✅ Complete | 2025-11-07 | Replaced LocationInput with StorageLocationSelect |
| Delete LocationInput.tsx | ✅ Complete | 2025-11-07 | Moved to review-for-delete folder |
| Delete LocationInput.module.css | ✅ Complete | 2025-11-07 | Moved to review-for-delete folder |

**Progress**: 8/8 tasks (100%) ✅ COMPLETE

---

## Notes

- Keep HandToolForm as reference implementation
- Test each form after migration
- Maintain internal layout (don't change grids/columns)
- Only standardize section containers and headers
- Use hot reload for testing (no builds needed)
- LocationInput replaced with StorageLocationSelect for proper database integration
