#!/bin/bash

# StrataTracker CORS Configuration Test Script
# Usage: ./scripts/test-cors-config.sh [domain]
# Example: ./scripts/test-cors-config.sh https://violation.spectrum4.ca

set -e

DOMAIN=${1:-"https://violation.spectrum4.ca"}
ORIGIN=${2:-"https://violation.spectrum4.ca"}

echo "🔍 Testing CORS Configuration for StrataTracker"
echo "🌐 Domain: $DOMAIN"
echo "📍 Origin: $ORIGIN"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test CORS endpoint
test_cors_endpoint() {
    local endpoint=$1
    local method=${2:-"GET"}
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "\n%{http_code}\n%{header_json}" \
        -X OPTIONS \
        -H "Origin: $ORIGIN" \
        -H "Access-Control-Request-Method: $method" \
        -H "Access-Control-Request-Headers: authorization,content-type,x-client-info,apikey" \
        "$DOMAIN$endpoint" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n 2 | head -n 1)
    headers=$(echo "$response" | tail -n 1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
        # Check for CORS headers
        if echo "$headers" | grep -q "access-control-allow-origin"; then
            echo -e "${GREEN}✅ PASS${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  PARTIAL (missing CORS headers)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL (HTTP $http_code)${NC}"
        return 1
    fi
}

# Function to test actual API endpoint
test_api_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "Origin: $ORIGIN" \
        -H "Content-Type: application/json" \
        "$DOMAIN$endpoint" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n 1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    elif [ "$http_code" = "401" ]; then
        echo -e "${YELLOW}🔐 PROTECTED (requires auth)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (HTTP $http_code)${NC}"
        return 1
    fi
}

echo "📋 Running CORS Tests..."
echo ""

# Test common endpoints
test_cors_endpoint "/api/health" "GET" "Health Check OPTIONS"
test_cors_endpoint "/api/auth/me" "GET" "Auth Me OPTIONS"
test_cors_endpoint "/api/violations" "GET" "Violations OPTIONS"
test_cors_endpoint "/api/violations" "POST" "Violations POST OPTIONS"

echo ""
echo "🔌 Testing Actual Endpoints..."

test_api_endpoint "/api/health" "Health Check GET"
test_api_endpoint "/api/auth/me" "Auth Me GET"

echo ""
echo "🎯 Testing Supabase Connectivity..."

# Extract Supabase URL from environment or prompt
if [ -f ".env" ]; then
    SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env | cut -d '=' -f2 | tr -d '"')
    SUPABASE_ANON_KEY=$(grep "VITE_SUPABASE_ANON_KEY" .env | cut -d '=' -f2 | tr -d '"')
fi

if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
    echo -n "Testing Supabase REST API... "
    
    supabase_response=$(curl -s -w "%{http_code}" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        "$SUPABASE_URL/rest/v1/" 2>/dev/null)
    
    supabase_code=$(echo "$supabase_response" | tail -c 4)
    
    if [ "$supabase_code" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL (HTTP $supabase_code)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Supabase credentials not found in .env${NC}"
fi

echo ""
echo "🔍 Additional Diagnostics..."

# Check if domain is reachable
echo -n "Domain reachability... "
if curl -s --head "$DOMAIN" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ REACHABLE${NC}"
else
    echo -e "${RED}❌ UNREACHABLE${NC}"
fi

# Check SSL certificate
echo -n "SSL certificate... "
if curl -s --head "$DOMAIN" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ VALID${NC}"
else
    echo -e "${RED}❌ INVALID${NC}"
fi

echo ""
echo "📊 Summary"
echo "=========="
echo "If you see failures above, check:"
echo "1. Environment variables are set correctly"
echo "2. CORS_ORIGIN matches your domain"
echo "3. Backend server is running"
echo "4. Supabase credentials are valid"
echo ""
echo "For detailed troubleshooting, see: docs/CORS_CONFIGURATION_GUIDE.md"
echo ""

# Optional: Show environment configuration if .env exists
if [ -f ".env" ]; then
    echo "🔧 Current Environment (from .env):"
    echo "-----------------------------------"
    grep -E "(CORS_ORIGIN|APP_URL|VITE_SUPABASE_URL)" .env | sed 's/=/ = /' || echo "No relevant variables found"
fi 