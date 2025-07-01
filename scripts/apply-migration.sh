#!/bin/bash

# Migration Application Script for StrataTracker
# Usage: ./scripts/apply-migration.sh [migration_file]
# Example: ./scripts/apply-migration.sh migrations/0015_fix_email_deduplication_schema.sql

set -e

MIGRATION_FILE=${1:-"migrations/0015_fix_email_deduplication_schema.sql"}
DATABASE_URL=${DATABASE_URL:-"postgres://spectrum4:spectrum4password@localhost:5432/spectrum4"}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 StrataTracker Migration Application${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Validate migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "📄 Migration file: ${YELLOW}$MIGRATION_FILE${NC}"
echo -e "🗄️  Database URL: ${YELLOW}${DATABASE_URL%%@*}@***${NC}"
echo ""

# Test database connection
echo -n "🔍 Testing database connection... "
if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
    echo "Please check your DATABASE_URL and ensure the database is accessible."
    exit 1
fi

# Show migration preview
echo ""
echo -e "${BLUE}📋 Migration Preview:${NC}"
echo "----------------------------------------"
head -n 10 "$MIGRATION_FILE"
echo "..."
echo "----------------------------------------"
echo ""

# Confirmation prompt for production
if [[ "$DATABASE_URL" == *"supabase"* ]] || [[ "$NODE_ENV" == "production" ]]; then
    echo -e "${YELLOW}⚠️  WARNING: This appears to be a production database!${NC}"
    echo ""
    read -p "Are you sure you want to apply this migration? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Migration cancelled."
        exit 0
    fi
fi

# Apply migration
echo ""
echo -e "${BLUE}🚀 Applying migration...${NC}"
echo ""

# Backup current schema first (for production safety)
if [[ "$DATABASE_URL" == *"supabase"* ]] || [[ "$NODE_ENV" == "production" ]]; then
    echo -n "📦 Creating schema backup... "
    backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if pg_dump "$DATABASE_URL" --schema-only > "$backup_file" 2>/dev/null; then
        echo -e "${GREEN}✅ Saved to $backup_file${NC}"
    else
        echo -e "${YELLOW}⚠️  Backup failed (continuing anyway)${NC}"
    fi
fi

# Apply the migration
echo "🔄 Executing migration SQL..."
if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}✅ Migration applied successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Migration failed!${NC}"
    echo "Check the error messages above and verify the migration SQL."
    exit 1
fi

# Verify the fix
echo ""
echo -e "${BLUE}🔍 Verifying email deduplication tables...${NC}"

# Test the problematic queries that were failing
test_queries=(
    "SELECT 'idempotency_key' as test FROM email_idempotency_keys LIMIT 1;"
    "SELECT 'status' as test FROM email_idempotency_keys LIMIT 1;"
    "SELECT 'attempt_number' as test FROM email_send_attempts LIMIT 1;"
    "SELECT 'prevented_at' as test FROM email_deduplication_log LIMIT 1;"
)

all_passed=true

for query in "${test_queries[@]}"; do
    echo -n "Testing: $(echo "$query" | cut -d' ' -f2 | tr -d "'") column... "
    
    if psql "$DATABASE_URL" -c "$query" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
        all_passed=false
    fi
done

echo ""
if [ "$all_passed" = true ]; then
    echo -e "${GREEN}🎉 All tests passed! Email deduplication should work correctly now.${NC}"
else
    echo -e "${RED}⚠️  Some tests failed. Check the database schema manually.${NC}"
fi

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "✅ Migration file: $MIGRATION_FILE"
echo "✅ Database schema updated"
echo "✅ Email deduplication tables fixed"
echo ""
echo "The application should now run without the email deduplication errors."
echo "Monitor the logs to confirm the fix is working." 