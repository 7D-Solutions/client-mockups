# CLAUDE.md

**Working directory**: `/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/`

## Key Constraints

1. **No file deletion** - move to `/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/review-for-delete/`
2. **Restart servers after erp-core changes** - file: dependency requires container restart
3. **Database on port 3307** (external MySQL, not containerized) - use root user: `root` / `fireproof_root_sandbox`
4. **Use existing ERP modules** - don't duplicate auth, navigation, data, or notifications
5. **REAL SOLUTIONS ONLY** - no quick fixes, patch jobs, or temporary solutions allowed

## Project-Specific Facts

- Main app: `Fireproof Gauge System/` (React + Node.js backend)
- ERP modules: `erp-core/src/core/` with TypeScript exports
- Environment: Docker Compose setup
- Auth: JWT with database verification, role-based permissions

DO NOT REFERENCE TIME FRAMES OF ANY SORT!