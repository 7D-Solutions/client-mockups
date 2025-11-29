#!/bin/bash
# test-sandbox.sh - Test sandbox environment functionality
# Verifies all services are running correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Paths
SANDBOX_DIR="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox"
TEST_RESULTS_DIR="$SANDBOX_DIR/test-results"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Create test report
REPORT_FILE="$TEST_RESULTS_DIR/reports/sandbox-test-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p "$TEST_RESULTS_DIR/reports"

# Function to log test results
log_test() {
    local test_name=$1
    local status=$2
    local message=$3
    
    echo -e "[$test_name] $status: $message" | tee -a "$REPORT_FILE"
    
    if [ "$status" = "PASS" ]; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
}

echo -e "${GREEN}🧪 Fire-Proof ERP Sandbox Test Suite${NC}" | tee "$REPORT_FILE"
echo "========================================" | tee -a "$REPORT_FILE"
echo "Test started: $(date)" | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"

# Check if sandbox exists
if [ ! -f "$SANDBOX_DIR/.sandbox-marker" ]; then
    echo -e "${RED}❌ Error: Sandbox not found at $SANDBOX_DIR${NC}"
    exit 1
fi

# Test 1: Check sandbox marker
echo -e "${BLUE}Test 1: Checking sandbox marker...${NC}"
if [ -f "$SANDBOX_DIR/.sandbox-marker" ]; then
    log_test "SANDBOX_MARKER" "PASS" "Sandbox marker found"
else
    log_test "SANDBOX_MARKER" "FAIL" "Sandbox marker not found"
fi

# Test 2: Check Docker containers
echo -e "${BLUE}Test 2: Checking Docker containers...${NC}"
MYSQL_RUNNING=$(docker ps --filter "name=sandbox_fireproof_mysql" --format "{{.Names}}" | grep -c sandbox_fireproof_mysql || true)
BACKEND_RUNNING=$(docker ps --filter "name=sandbox_fireproof_backend" --format "{{.Names}}" | grep -c sandbox_fireproof_backend || true)
FRONTEND_RUNNING=$(docker ps --filter "name=sandbox_fireproof_frontend" --format "{{.Names}}" | grep -c sandbox_fireproof_frontend || true)

if [ "$MYSQL_RUNNING" -eq 1 ]; then
    log_test "MYSQL_CONTAINER" "PASS" "MySQL container running"
else
    log_test "MYSQL_CONTAINER" "FAIL" "MySQL container not running"
fi

if [ "$BACKEND_RUNNING" -eq 1 ]; then
    log_test "BACKEND_CONTAINER" "PASS" "Backend container running"
else
    log_test "BACKEND_CONTAINER" "FAIL" "Backend container not running"
fi

if [ "$FRONTEND_RUNNING" -eq 1 ]; then
    log_test "FRONTEND_CONTAINER" "PASS" "Frontend container running"
else
    log_test "FRONTEND_CONTAINER" "FAIL" "Frontend container not running"
fi

# Test 3: Check port availability
echo -e "${BLUE}Test 3: Checking sandbox ports...${NC}"
MYSQL_PORT=$(nc -zv localhost 3307 2>&1 | grep -c succeeded || true)
BACKEND_PORT=$(nc -zv localhost 8001 2>&1 | grep -c succeeded || true)
FRONTEND_PORT=$(nc -zv localhost 3002 2>&1 | grep -c succeeded || true)

if [ "$MYSQL_PORT" -eq 1 ]; then
    log_test "MYSQL_PORT" "PASS" "MySQL port 3307 accessible"
else
    log_test "MYSQL_PORT" "FAIL" "MySQL port 3307 not accessible"
fi

if [ "$BACKEND_PORT" -eq 1 ]; then
    log_test "BACKEND_PORT" "PASS" "Backend port 8001 accessible"
else
    log_test "BACKEND_PORT" "FAIL" "Backend port 8001 not accessible"
fi

if [ "$FRONTEND_PORT" -eq 1 ]; then
    log_test "FRONTEND_PORT" "PASS" "Frontend port 3002 accessible"
else
    log_test "FRONTEND_PORT" "FAIL" "Frontend port 3002 not accessible"
fi

# Test 4: Check API health endpoint
echo -e "${BLUE}Test 4: Checking API health...${NC}"
if [ "$BACKEND_PORT" -eq 1 ]; then
    API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/health 2>/dev/null || echo "000")
    if [ "$API_HEALTH" = "200" ]; then
        log_test "API_HEALTH" "PASS" "API health endpoint responding (HTTP $API_HEALTH)"
    else
        log_test "API_HEALTH" "FAIL" "API health endpoint not responding (HTTP $API_HEALTH)"
    fi
else
    log_test "API_HEALTH" "SKIP" "Backend not running"
fi

# Test 5: Check database connection
echo -e "${BLUE}Test 5: Checking database connection...${NC}"
if [ "$MYSQL_RUNNING" -eq 1 ]; then
    DB_CHECK=$(docker exec sandbox_fireproof_mysql mysql -uroot -pfireproof_root_sandbox -e "SELECT 1" 2>&1 | grep -c "1" || true)
    if [ "$DB_CHECK" -ge 1 ]; then
        log_test "DATABASE_CONNECTION" "PASS" "Database connection successful"
    else
        log_test "DATABASE_CONNECTION" "FAIL" "Database connection failed"
    fi
else
    log_test "DATABASE_CONNECTION" "SKIP" "MySQL not running"
fi

# Test 6: Check sandbox isolation
echo -e "${BLUE}Test 6: Checking sandbox isolation...${NC}"
PROD_MYSQL=$(docker ps --filter "name=^fireproof_mysql$" --format "{{.Names}}" | grep -c fireproof_mysql || true)
if [ "$PROD_MYSQL" -eq 0 ] || [ "$MYSQL_RUNNING" -eq 1 ]; then
    log_test "SANDBOX_ISOLATION" "PASS" "Sandbox properly isolated from production"
else
    log_test "SANDBOX_ISOLATION" "WARN" "Both sandbox and production may be running"
fi

# Summary
echo | tee -a "$REPORT_FILE"
echo "========================================" | tee -a "$REPORT_FILE"
echo -e "${GREEN}Test Summary:${NC}" | tee -a "$REPORT_FILE"
echo -e "  Passed: ${GREEN}$TESTS_PASSED${NC}" | tee -a "$REPORT_FILE"
echo -e "  Failed: ${RED}$TESTS_FAILED${NC}" | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Sandbox is working correctly.${NC}" | tee -a "$REPORT_FILE"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check the report at:${NC}" | tee -a "$REPORT_FILE"
    echo "$REPORT_FILE" | tee -a "$REPORT_FILE"
    exit 1
fi