# Testing Protocol - Fireproof Gauge System

## Testing Rules

### 1. Use Real Database and Services
- Connect to actual database using pool.execute()
- Call real services, not mocks
- Use actual API endpoints

### 2. Use Sandbox Database
- Development database IS the test database
- Create data with TEST- prefix
- Clean up after each test

### 3. Every Test Must Have Three Parts
- SETUP: Create real test data
- ACT: Call real API or service
- VERIFY: Check real database state

### 4. Test Data Management
- Use TEST- prefix for all test data
- Clean up in afterEach() blocks
- Use unique identifiers (Date.now())
- Log cleanup failures

### 5. Use Environment Variables
- Get ports from process.env.DB_PORT
- Get URLs from process.env.API_URL
- Use config.js for all settings
- Create .env.test for test-specific values

### 6. Test Output Must Show Evidence
- Log what you created
- Log what you changed  
- Log verification results
- Include actual values, not just pass/fail

## Test Requirements

### What Makes a Test Valid
1. Uses actual database connection
2. Calls real API endpoints
3. Verifies database state after actions
4. Fails when feature is actually broken

## Verification Commands

Run these to check compliance:
- `grep -r "pool\.execute" tests/` - Should find many
- `grep -r "mockResolvedValue" tests/` - Should find 0
- `grep -r "TEST-" tests/` - Should show test data creation
- `npm test -- --coverage` - Should pass with real database