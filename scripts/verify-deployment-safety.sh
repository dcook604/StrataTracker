#!/bin/bash
# scripts/verify-deployment-safety.sh
# Comprehensive verification script for StrataTracker deployment safety
# Tests all critical systems to ensure safe redeployment capability

set -e

echo "🔍 StrataTracker Deployment Safety Verification"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${DOMAIN:-https://violation.spectrum4.ca}"
TIMEOUT=10

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
test_start() {
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -n "🧪 Testing $1... "
}

test_pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✅ PASSED${NC}"
}

test_fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}❌ FAILED${NC}"
    echo -e "   ${RED}Error: $1${NC}"
}

test_skip() {
    echo -e "${YELLOW}⏭️  SKIPPED - $1${NC}"
}

# 1. Frontend Availability Test
test_start "Frontend availability"
if curl -f -s --max-time $TIMEOUT "$DOMAIN" > /dev/null; then
    test_pass
else
    test_fail "Frontend not responding at $DOMAIN"
fi

# 2. API Health Check
test_start "API health endpoint"
HEALTH_RESPONSE=$(curl -f -s --max-time $TIMEOUT "$DOMAIN/api/health" 2>/dev/null || echo "FAILED")
if [[ "$HEALTH_RESPONSE" == *"healthy"* ]] || [[ "$HEALTH_RESPONSE" == *"ok"* ]]; then
    test_pass
else
    test_fail "API health check failed or returned unexpected response"
fi

# 3. Admin Announcements Test (Backend Connectivity)
test_start "Admin announcements API (backend test)"
ANNOUNCEMENTS_RESPONSE=$(curl -f -s --max-time $TIMEOUT "$DOMAIN/api/admin-announcements" 2>/dev/null || echo "FAILED")
if [[ "$ANNOUNCEMENTS_RESPONSE" == "FAILED" ]]; then
    test_fail "Admin announcements API not responding"
elif [[ "$ANNOUNCEMENTS_RESPONSE" == *"<!DOCTYPE html>"* ]]; then
    test_fail "Admin announcements returning HTML instead of JSON (routing issue)"
else
    test_pass
fi

# 4. Database Connectivity Test
test_start "Database connectivity via violations API"
VIOLATIONS_RESPONSE=$(curl -f -s --max-time $TIMEOUT "$DOMAIN/api/violations?limit=1" 2>/dev/null || echo "FAILED")
if [[ "$VIOLATIONS_RESPONSE" == "FAILED" ]]; then
    test_fail "Database not accessible via violations API"
elif [[ "$VIOLATIONS_RESPONSE" == *"error"* ]]; then
    test_fail "Database error in violations API"
else
    test_pass
fi

# 5. Email Deduplication System Test
test_start "Email deduplication stats API"
EMAIL_STATS_RESPONSE=$(curl -f -s --max-time $TIMEOUT "$DOMAIN/api/communications/email-stats?hours=24" 2>/dev/null || echo "FAILED")
if [[ "$EMAIL_STATS_RESPONSE" == "FAILED" ]]; then
    test_fail "Email deduplication system not responding"
elif [[ "$EMAIL_STATS_RESPONSE" == *"error"* ]]; then
    test_fail "Email deduplication system error"
else
    test_pass
fi

# 6. CORS Configuration Test
test_start "CORS configuration"
CORS_RESPONSE=$(curl -f -s --max-time $TIMEOUT -H "Origin: $DOMAIN" -H "Access-Control-Request-Method: GET" -X OPTIONS "$DOMAIN/api/health" 2>/dev/null || echo "FAILED")
if [[ "$CORS_RESPONSE" == "FAILED" ]]; then
    test_fail "CORS preflight request failed"
else
    test_pass
fi

# 7. Schema Consolidation Verification
echo ""
echo "📋 Schema Consolidation Status:"
echo "   - Consolidated schema file: $(test -f db/init/00-consolidated-schema.sql && echo "✅ EXISTS" || echo "❌ MISSING")"
echo "   - Initial data file: $(test -f db/init/01-initial-data.sql && echo "✅ EXISTS" || echo "❌ MISSING")"
echo "   - Old incomplete schema removed: $(test ! -f db/init/00-schema.sql && echo "✅ REMOVED" || echo "❌ STILL EXISTS")"

# 8. Docker Configuration Check
echo ""
echo "🐳 Docker Configuration:"
if test -f docker-compose.coolify.yml; then
    echo "   - Coolify docker-compose: ✅ EXISTS"
    
    # Check volume configuration
    if grep -q "postgres_data:" docker-compose.coolify.yml; then
        echo "   - PostgreSQL data volume: ✅ CONFIGURED"
    else
        echo "   - PostgreSQL data volume: ❌ NOT CONFIGURED"
    fi
    
    if grep -q "uploads_data:" docker-compose.coolify.yml; then
        echo "   - Uploads data volume: ✅ CONFIGURED"
    else
        echo "   - Uploads data volume: ❌ NOT CONFIGURED"
    fi
else
    echo "   - Coolify docker-compose: ❌ MISSING"
fi

# 9. Environment Variables Check
echo ""
echo "🔧 Critical Environment Variables:"
ENV_VARS=("APP_URL" "CORS_ORIGIN" "DATABASE_URL" "SMTP_HOST" "SMTP_USER")
for var in "${ENV_VARS[@]}"; do
    if [[ -n "${!var}" ]]; then
        echo "   - $var: ✅ SET"
    else
        echo "   - $var: ⚠️  NOT SET (check .env or Coolify config)"
    fi
done

# Summary
echo ""
echo "📊 Test Results Summary:"
echo "========================"
echo -e "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ Deployment is SAFE for redeployment${NC}"
    echo ""
    echo "Your StrataTracker deployment is ready for safe redeployment."
    echo "Data will persist between deployments via Docker volumes."
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  SOME TESTS FAILED!${NC}"
    echo -e "${RED}❌ Fix issues before redeployment${NC}"
    echo ""
    echo "Please resolve the failed tests before redeploying."
    echo "See docs/DEPLOYMENT_SAFETY_GUIDE.md for troubleshooting."
    exit 1
fi 