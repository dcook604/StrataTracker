#!/bin/bash
# StrataTracker Virus Scanning Validation Script
# Quick validation of virus scanning implementation

set -e

echo "========================================"
echo "  StrataTracker Virus Scanning Test"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

check_test() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1"
        ((FAILED++))
    fi
}

echo "1. Checking ClamAV Installation..."

# Check if ClamAV is installed
command -v clamscan >/dev/null 2>&1
check_test "ClamAV binary available"

# Check if daemon is running
systemctl is-active --quiet clamav-daemon
check_test "ClamAV daemon running"

# Check socket exists
test -S /var/run/clamav/clamd.ctl
check_test "ClamAV socket exists"

echo -e "\n2. Testing Virus Detection..."

# Create test directory
mkdir -p /tmp/virus-test
cd /tmp/virus-test

# Test clean file
echo "This is a clean test file" > clean.txt
clamscan --no-summary clean.txt >/dev/null 2>&1
check_test "Clean file detection"

# Test EICAR virus
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
! clamscan --no-summary eicar.txt >/dev/null 2>&1  # Should fail (find virus)
check_test "EICAR virus detection"

# Test socket-based scanning
clamdscan --no-summary clean.txt >/dev/null 2>&1
check_test "Socket-based scanning"

# Cleanup
rm -rf /tmp/virus-test

echo -e "\n3. Checking Node.js Dependencies..."

# Check if we're in the right directory
if [ -f "package.json" ]; then
    # Check for required packages
    grep -q "clamscan" package.json
    check_test "clamscan package in package.json"
    
    grep -q "file-type" package.json
    check_test "file-type package in package.json"
    
    grep -q "multer" package.json
    check_test "multer package in package.json"
else
    echo -e "${YELLOW}Warning: package.json not found${NC}"
fi

echo -e "\n4. Checking Implementation Files..."

# Check if virus scanner service exists
if [ -f "server/services/virusScanner.ts" ]; then
    echo -e "${GREEN}✓${NC} Virus scanner service exists"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Virus scanner service missing"
    ((FAILED++))
fi

# Check if security middleware exists
if [ -f "server/middleware/fileUploadSecurity.ts" ]; then
    echo -e "${GREEN}✓${NC} File upload security middleware exists"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} File upload security middleware missing"
    ((FAILED++))
fi

# Check if documentation exists
if [ -f "docs/VIRUS_SCANNING_IMPLEMENTATION.md" ]; then
    echo -e "${GREEN}✓${NC} Documentation exists"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Documentation missing"
    ((FAILED++))
fi

# Check if setup script exists
if [ -f "scripts/setup-antivirus.sh" ]; then
    echo -e "${GREEN}✓${NC} Setup script exists"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Setup script missing"
    ((FAILED++))
fi

echo -e "\n========================================"
echo "              Summary"
echo "========================================"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed!${NC}"
    echo -e "\nVirus scanning is ready for use."
    echo "To enable it, set VIRUS_SCANNING_ENABLED=true in your .env file"
    exit 0
else
    echo -e "${RED}❌ Some checks failed.${NC}"
    echo -e "\nPlease review the failed items above."
    echo "See docs/VIRUS_SCANNING_IMPLEMENTATION.md for troubleshooting."
    exit 1
fi 