# CLAUDE_FIREPROOF.md - ENFORCEABLE PROJECT RULES

## Core Rules (Actually Enforced)

### 1. USE REAL DATA
- ✅ **USE** existing fai_db_sandbox data
- ✅ **CREATE** test records with TEST- prefix when needed

### 2. SANDBOX FIRST  
- **Test in `/tmp/claude-sandbox/fireproof/` first**
- **Get permission before touching "Fireproof Gauge System" folder**

### 3. PROVE IT WORKS
Before claiming success, run:
- `docker ps | grep mysql` - Verify database container
- `curl -f http://localhost:8000/api/health` - Check backend
- `curl -f http://localhost:3000` - Check frontend
- Show actual output from these commands

### 4. GET HELP WITH TASK TOOL
Use Task tool for specialized analysis:
- Database schema validation
- Security vulnerability scanning
- Performance bottleneck identification

## Project Info (Reference Only)
- **Database**: fai_db_sandbox (port 3307)
- **Backend**: Node.js port 8000  
- **Frontend**: React port 3000
- **Stack**: React 18 + Node.js + MySQL 8.0

---

**Bottom Line**: 3 enforceable rules that actually matter. Everything else is just reference info.