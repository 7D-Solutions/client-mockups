# Sprint 3 - Simple Activation Steps

## What We're Fixing
- 2 missing database tables that existing code needs
- Activating already-written features that were left dormant

## Steps

### 1. Create Missing Tables
```bash
cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend
mysql -h localhost -P 3307 -u root -pfireproof_root_sandbox fai_db_sandbox < migrations/004_audit_archive_table.sql
mysql -h localhost -P 3307 -u root -pfireproof_root_sandbox fai_db_sandbox < migrations/005_idempotency_keys.sql
```

**Verify:**
```bash
mysql -h localhost -P 3307 -u root -pfireproof_root_sandbox fai_db_sandbox -e "SHOW TABLES LIKE '%archive%'"
mysql -h localhost -P 3307 -u root -pfireproof_root_sandbox fai_db_sandbox -e "SHOW TABLES LIKE '%idempotency%'"
```

### 2. Activate Idempotency Middleware
Edit `/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend/src/app.js`:

Add this import at top with other middleware imports:
```javascript
const idempotency = require('./infrastructure/middleware/idempotency');
```

Add this line after the audit middleware (around line 195):
```javascript
app.use('/api', idempotency);
```

### 3. Schedule Audit Retention Job
Create `/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend/run-audit-retention.sh`:
```bash
#!/bin/bash
cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend
/usr/bin/node src/jobs/auditRetention.js >> logs/audit-retention.log 2>&1
```

Make it executable:
```bash
chmod +x /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend/run-audit-retention.sh
```

Add to crontab:
```bash
crontab -e
# Add this line:
0 2 * * * /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend/run-audit-retention.sh
```

### 4. Quick Test
Test idempotency:
```bash
# Make same request twice with same key
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-123" \
  -d '{"email":"john.smith@fai.com","password":"Test123!@#"}'

# Run again - should get cached response
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-123" \
  -d '{"email":"john.smith@fai.com","password":"Test123!@#"}'
```

Test audit retention manually:
```bash
cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend
node src/jobs/auditRetention.js
```

## Done
That's it. Tables created, middleware active, job scheduled.