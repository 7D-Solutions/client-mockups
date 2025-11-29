# Documentation Standardization Guide

**Version:** 1.0  
**Date:** 2025-09-05  
**Purpose:** Quick guide for standardizing documentation folders

## Table of Contents

1. [Quick Reference](#quick-reference)
   - [File Naming](#file-naming)
   - [Document Header](#document-header)
   - [TOC Format](#toc-format)
   - [Folder Index Template](#folder-index-template)
2. [Process](#process)
3. [Example](#example)

---

## Quick Reference

### File Naming
`Title_Case_With_Underscores_vX.Y.md`
- Example: `Database_Complete_Reference_v2.0.md`
- No spaces, no all caps
- Always include version

### Document Header
```markdown
# Title
**Version:** X.Y  
**Date:** YYYY-MM-DD  
**Purpose:** One-line description

## Table of Contents
[TOC here]
```

### TOC Format
```markdown
1. [Section Name](#1-section-name)
   - 1.1 [Subsection](#11-subsection)
2. [Next Section](#2-next-section)
```

### Folder Index Template
```markdown
# [Folder] Index
**Last Updated:** YYYY-MM-DD

## Documents

### 1. Document_Name_vX.Y.md
**Purpose:** What it does
**Contains:** Key topics (3-5 bullets)
**Use When:** Common scenarios

[Repeat for each doc]

## Quick Guide
Need X? → Document_A.md
Need Y? → Document_B.md
```

## Process

1. **Rename files** to Title_Case_vX.Y.md
2. **Archive duplicates** to `archive/` folder  
3. **Consolidate** overlapping documents
4. **Add TOCs** to all documents
5. **Create index** for the folder

## Example

**Before:**
```
DATABASE_SCHEMA.md
database-permissions.txt
permissions_matrix_FINAL.md
```

**After:**
```
Database_Complete_Reference_v2.0.md
Technical_Docs_Index.md
archive/
  - [old files]
```