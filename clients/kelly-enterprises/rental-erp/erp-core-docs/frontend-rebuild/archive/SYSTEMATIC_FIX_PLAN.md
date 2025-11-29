# Frontend Systematic Fix Plan

## CRITICAL INSTRUCTIONS - READ FIRST

1. **DO NOT DELETE ANY FILES** - Check imports first using investigation commands
2. **USE ABSOLUTE PATHS ONLY** - All paths start with `/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/`
3. **INVESTIGATE BEFORE FIXING** - Complete Phase 1 investigation before any changes
4. **USE TODOWRITE** - Track progress through each step
5. **TEST INCREMENTALLY** - Never make bulk changes
6. **RESTART DOCKER** after changes: `docker-compose restart` in project root

**Design Reference**: `/erp-core-docs/system architecture/Fireproof Docs 2.0/design/AI_Implementation_Spec_v1.0.md`

## START HERE: Quick Investigation Commands

**Copy these exact commands:**
1. `Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/main.tsx"`
2. `Glob pattern="**/*.css" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src"`
3. `Grep pattern="import.*\\.css" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="files_with_matches"`
4. `Grep pattern="tab-btn|category-tab|thread-tab" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="files_with_matches"`

## Phase 1: Investigation & Mapping

### 1.1 Map CSS Import Structure
**Tools to use:**
- `Read` tool with absolute paths
- `Glob` tool with pattern parameter

**Commands:**
1. `Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/main.tsx"`
2. `Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/App.tsx"`
3. `Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/index.css"`
4. `Glob pattern="**/*.css" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src"`

### 1.2 Component Usage Analysis
**Tools to use:**
- `Grep` tool with pattern, path, and output_mode parameters

**Commands:**
1. `Grep pattern="Button" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge/components" output_mode="content"`
2. `Grep pattern="Card" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge/components" output_mode="content"`
3. `Grep pattern="className.*btn" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge/components" output_mode="content"`
4. `Grep pattern="tab-btn|category-tab|thread-tab" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="files_with_matches"`

### 1.3 Data Contract Analysis
**Tools to use:**
- `Read` tool for TypeScript files
- `Grep` tool for usage patterns

**Commands:**
1. `Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge/types/index.ts"`
2. `Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge/services/gaugeService.ts"`
3. `Grep pattern="gauge\\?" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge" output_mode="content" -A="3"`
4. `Grep pattern="gauge_name|gauge\\.name" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge" output_mode="content"`

### 1.4 Current State Testing
**Tools to use:**
- `Grep` tool for imports and CSS properties
- `Read` tool for component files

**Commands:**
1. `Grep pattern="import.*css" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="files_with_matches"`
2. `Grep pattern="z-index" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/styles" output_mode="content"`
3. `Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge/components/GaugeInventory.tsx"`
4. `Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge/components/GaugeModalManager.tsx"`

## Phase 2: Targeted Fixes (Only After Investigation)

### 2.1 CSS Consolidation Plan
**Tools to use:**
- `Read` tool to check design spec
- `Write` tool to create new consolidated CSS
- `Edit` tool to update imports

**Steps:**
1. `Read file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/erp-core-docs/system architecture/Fireproof Docs 2.0/design/AI_Implementation_Spec_v1.0.md"`
2. **DO NOT DELETE** any CSS files until you know what imports them
3. `Write file_path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/styles/consolidated.css"` with design spec values
4. Update imports one component at a time using `Edit` tool
5. Test each change with `Bash` to restart containers if needed

### 2.2 Component Standardization
**Tools to use:**
- `Edit` tool to update component files
- `MultiEdit` tool for multiple changes in same file

**Steps:**
1. Replace button classes incrementally: `.category-tab` → `.btn.btn-tab`
2. Use exact colors from AI spec: `#28a745`, `#007bff`, `#17a2b8`
3. Apply standard padding: `0.5rem 0.8rem`

### 2.3 Layout Fixes
**Tools to use:**
- `Edit` tool to update CSS values

**Steps:**
1. Change inventory card height to `calc(100vh - 20px)`
2. Fix admin alerts: `justify-content: space-evenly`
3. Implement z-index hierarchy: 1000, 1050, 10000

### 2.4 Data Contract Fixes
**Tools to use:**
- `Edit` tool to update TypeScript interfaces
- `Bash` tool to test API calls if needed

**Steps:**
1. Update interfaces to match actual API responses
2. Fix field name mismatches found in investigation
3. Test with real API calls

## Critical Rules

1. **NEVER delete files before checking imports**
2. **ALWAYS read components before changing CSS classes**
3. **TEST each change incrementally**
4. **Use design spec exact values**: `/erp-core-docs/system architecture/Fireproof Docs 2.0/design/AI_Implementation_Spec_v1.0.md`
5. **Check Docker restart requirement** after any changes

## Investigation Commands Reference

**Quick Commands for Investigation:**
1. `Glob pattern="**/*.css" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src"`
2. `Grep pattern="import.*\\.css" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="files_with_matches"`
3. `Grep pattern="className.*btn" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge/components" output_mode="content"`
4. `Grep pattern="Button" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/infrastructure/components" output_mode="files_with_matches"`
5. `Grep pattern="interface.*Gauge" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src" output_mode="content"`
6. `Grep pattern="gauge\\.|gauge_" path="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src/modules/gauge" output_mode="content" -B="2" -A="2"`

## Tool Syntax Reference
- `Read file_path="/full/absolute/path"`
- `Grep pattern="regex" path="/full/path" output_mode="content|files_with_matches"`
- `Edit file_path="/full/path" old_string="..." new_string="..."`
- `Write file_path="/full/path" content="..."`
- `Bash command="docker-compose restart"`