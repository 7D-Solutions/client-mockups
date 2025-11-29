# Documentation Reorganization Action Plan

**Purpose**: Execute documentation consolidation based on 4-instance analysis  
**Status**: Ready to execute  
**Expected Result**: 20+ documents → 15 organized documents

## Phase 1: Extract Content (Do First)

### 1.1 Extract UI Workflows
- **Source**: `business/SYSTEM_SPECIFICATIONS.md`  
- **Target**: Create `business/UI_Workflows_Guide_v1.0.md`
- **Content**: Sections 1 (Edit Interface Structure), 2 (Status Management), 4 (User Experience Flows)
- **Action**: Copy sections, add header, save as new file

### 1.2 Extract Unique Gauge Examples  
- **Source**: `business/GAUGE_STANDARDIZATION_COMPLETE_SPEC.md`
- **Target**: Note unique content for merge into MASTER
- **Content**: Any companion gauge examples not in MASTER_SPEC
- **Action**: Side-by-side comparison, copy unique examples

### 1.3 Extract Validation Rules
- **Source**: `technical/Permissions_and_Validation_Reference_v1.0.md`
- **Target**: Note for merge into security doc
- **Content**: Regex patterns, validation logic
- **Action**: Copy validation sections

## Phase 2: Create New Documents

### 2.1 Create Merged Gauge Specification
- **File**: `business/Gauge_Standardization_v2.0.md`
- **Base**: `GAUGE_STANDARDIZATION_MASTER_SPEC.md` (keep all content)
- **Add**: Unique examples from COMPLETE_SPEC
- **Header**: Update version to v2.0, add merge note

### 2.2 Create Merged Permission Document
- **File**: `security/Permissions_Complete_v2.0.md`
- **Base**: `FINAL_PERMISSIONS_DESIGN.txt`
- **Add**: Validation rules from technical doc
- **Convert**: .txt → .md format
- **Header**: Version v2.0, comprehensive coverage note

### 2.3 Create Reorganization Log
- **File**: `Documentation_Reorganization_Log_v1.0.md` (root)
- **Content**: List all moves, merges, archives with reasons and dates
- **Format**: 
  ```
  # Documentation Reorganization Log v1.0
  
  **Date**: 2025-09-05
  **Purpose**: Consolidate documentation based on 4-instance analysis
  
  ## Actions Taken
  
  | Original File | Action | New Location/File | Reason | Date |
  |---------------|--------|-------------------|--------|------|
  | System_Specs_Implementation_Guide_v3.2.md | MOVED | technical/ | Contains API contracts | 2025-09-05 |
  | GAUGE_STANDARDIZATION_COMPLETE_SPEC.md | MERGED | Gauge_Standardization_v2.0.md | 90% duplicate content | 2025-09-05 |
  | SYSTEM_SPECIFICATIONS.md | SPLIT/ARCHIVED | UI_Workflows_Guide_v1.0.md + archive | Extract UI flows | 2025-09-05 |
  ```

## Phase 3: Move Files

### 3.1 Move Implementation Guide
- **From**: `business/System_Specs_Implementation_Guide_v3.2.md`
- **To**: `technical/System_Specs_Implementation_Guide_v3.2.md`
- **Action**: Cut and paste file

## Phase 4: Convert Formats

### 4.1 Convert Text Files to Markdown
- `project/Modular-Vision.txt` → `project/Modular_Vision_v1.0.md`
- Add version number, keep all content

## Phase 5: Archive Superseded Files

### 5.1 Create Archive Documentation
- **File**: `archive/README.md`
- **Content**: List each archived file with reason, archive date, and archiving instance
- **Format**: 
  ```
  # Archive Documentation
  
  | File | Archived Date | Reason | Archived By |
  |------|---------------|--------|-------------|
  | GAUGE_STANDARDIZATION_COMPLETE_SPEC.md | 2025-09-05 | Merged into Gauge_Standardization_v2.0.md | Instance #2 |
  | SYSTEM_SPECIFICATIONS.md | 2025-09-05 | UI workflows extracted to separate document | Instance #2 |
  ```

### 5.2 Archive Files
Move to appropriate archive folders with timestamp:
- `business/GAUGE_STANDARDIZATION_COMPLETE_SPEC.md` → `business/archive/` (merged into v2.0, archived 2025-09-05)
- `business/SYSTEM_SPECIFICATIONS.md` → `business/archive/` (content extracted, archived 2025-09-05)
- `technical/Permissions_and_Validation_Reference_v1.0.md` → `technical/archive/` (merged, archived 2025-09-05)
- `security/FINAL_PERMISSIONS_DESIGN.txt` → DELETE (content moved to .md format, deleted 2025-09-05)

## Phase 6: Update Cross-References

### 6.1 Find Broken References
```bash
grep -r "GAUGE_STANDARDIZATION_COMPLETE_SPEC.md" .
grep -r "SYSTEM_SPECIFICATIONS.md" .
grep -r "FINAL_PERMISSIONS_DESIGN.txt" .
grep -r "Permissions_and_Validation_Reference" .
grep -r "Modular-Vision.txt" .
```

### 6.2 Replace References
- Update any references to point to new filenames
- Update Technical_Docs_Index.md
- Update any table of contents

## Phase 7: Validation

### 7.1 File Count Check
- business/: 3 files (Gauge_Standardization_v2.0.md, UI_Workflows_Guide_v1.0.md, business-module-roadmap.md)
- design/: 3 files (unchanged)
- project/: 2 files (Modular_Vision_v1.0.md, LEGACY_TO_MODERN_MIGRATION_STRATEGY.md)  
- security/: 1 file (Permissions_Complete_v2.0.md)
- technical/: 4 files (including moved Implementation Guide)
- root: 2 files (Documentation_Standardization_Guide.md, Documentation_Reorganization_Log_v1.0.md)
- **Total**: 15 files

### 7.2 Link Check
- Verify no broken cross-references
- Check all index files updated
- Confirm archive README complete

## Execution Checklist

- [ ] Phase 1: Extract all content
- [ ] Phase 2: Create new merged documents  
- [ ] Phase 3: Move files
- [ ] Phase 4: Convert formats
- [ ] Phase 5: Archive with documentation
- [ ] Phase 6: Update cross-references
- [ ] Phase 7: Validate final structure

## Success Criteria

- 15 total documents (down from 20+)
- No information loss
- All cross-references work
- Archive trail documented
- Single source of truth for each topic

---

## Instance #1 Enhancement Notes
**Added by Instance #1 based on collaboration review**

### Additional Validation Steps

**Version Number Verification**:
- Merged documents use v2.0 (combining two v1.0 documents)
- New documents use v1.0 (fresh creation)  
- Moved documents retain original version (v3.2)

**Content Preservation Checklist**:
- [ ] UI workflows completely extracted before archiving SYSTEM_SPECIFICATIONS.md
- [ ] All unique gauge examples preserved in merge
- [ ] Validation regex patterns transferred to security doc
- [ ] No technical content lost during business/technical split

**Cross-Reference Update Strategy**:
```bash
# After all moves, run comprehensive search:
find . -name "*.md" -exec grep -l "SYSTEM_SPECIFICATIONS\|GAUGE_STANDARDIZATION_COMPLETE\|FINAL_PERMISSIONS_DESIGN\|Permissions_and_Validation_Reference\|Modular-Vision\.txt" {} \;
```

### Quality Gates

**Pre-Archive Verification**:
- [ ] Confirm all unique content extracted
- [ ] Create backup of original files before archiving
- [ ] Document exactly what content was moved where

**Post-Reorganization Validation**:
- [ ] All index files updated with new filenames
- [ ] No broken internal links
- [ ] Archive README explains every archived file
- [ ] Reorganization log is complete and accurate

### Risk Mitigation

**Information Loss Prevention**:
- Create full backup before starting
- Use "extract first, archive last" approach
- Document any content deemed not worth preserving

**Rollback Plan**:
- Keep original files in temporary backup until validation complete
- Document can be reversed using Reorganization Log
- Test all cross-references before final commit

This plan successfully implements all consensus decisions from the 4-instance collaboration analysis.