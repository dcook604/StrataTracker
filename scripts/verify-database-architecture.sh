#!/bin/bash

# StrataTracker Database Architecture Verification Script
# Verifies that the hybrid Supabase (auth) + PostgreSQL (app data) setup is correct

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 StrataTracker Database Architecture Verification${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.coolify.yml" ]; then
    echo -e "${RED}❌ Error: Not in StrataTracker root directory${NC}"
    exit 1
fi

# Function to check environment variables
check_env_vars() {
    echo -e "${BLUE}📋 Checking Environment Variables...${NC}"
    
    # Check Supabase vars (for authentication)
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${YELLOW}⚠️  SUPABASE_URL not set (required for authentication)${NC}"
    else
        echo -e "${GREEN}✅ SUPABASE_URL set for authentication${NC}"
    fi
    
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        echo -e "${YELLOW}⚠️  SUPABASE_ANON_KEY not set${NC}"
    else
        echo -e "${GREEN}✅ SUPABASE_ANON_KEY set${NC}"
    fi
    
    # Check PostgreSQL vars (for application data)
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}❌ DATABASE_URL not set (required for application data)${NC}"
    else
        echo -e "${GREEN}✅ DATABASE_URL set for PostgreSQL${NC}"
        # Check if it points to PostgreSQL (not Supabase)
        if [[ "$DATABASE_URL" == *"supabase"* ]]; then
            echo -e "${RED}❌ ERROR: DATABASE_URL points to Supabase!${NC}"
            echo -e "${RED}   Should point to PostgreSQL container/instance${NC}"
        else
            echo -e "${GREEN}✅ DATABASE_URL correctly points to PostgreSQL${NC}"
        fi
    fi
    echo ""
}

# Function to check Docker setup
check_docker_setup() {
    echo -e "${BLUE}🐳 Checking Docker Configuration...${NC}"
    
    # Check if PostgreSQL container is configured
    if grep -q "postgres:" docker-compose.coolify.yml; then
        echo -e "${GREEN}✅ PostgreSQL container configured in docker-compose${NC}"
    else
        echo -e "${RED}❌ PostgreSQL container missing from docker-compose${NC}"
    fi
    
    # Check if DATABASE_URL in docker-compose points to postgres container
    if grep -q "postgres://" docker-compose.coolify.yml && grep -q "@postgres:" docker-compose.coolify.yml; then
        echo -e "${GREEN}✅ DATABASE_URL correctly configured to use postgres container${NC}"
    else
        echo -e "${YELLOW}⚠️  DATABASE_URL configuration needs verification${NC}"
    fi
    echo ""
}

# Function to check database connection and tables
check_database_connection() {
    echo -e "${BLUE}🗄️  Checking Database Connection...${NC}"
    
    # Check if PostgreSQL container is running
    if docker ps | grep -q postgres; then
        echo -e "${GREEN}✅ PostgreSQL container is running${NC}"
        
        # Try to find the container name
        POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -n 1)
        
        if [ -n "$POSTGRES_CONTAINER" ]; then
            echo -e "${BLUE}   Container: $POSTGRES_CONTAINER${NC}"
            
            # Check if profiles table exists
            if docker exec "$POSTGRES_CONTAINER" psql -U spectrum4 -d spectrum4 -c "\dt profiles" 2>/dev/null | grep -q "profiles"; then
                echo -e "${GREEN}✅ profiles table exists in PostgreSQL${NC}"
                
                # Check if profiles table has the right structure
                PROFILE_COLUMNS=$(docker exec "$POSTGRES_CONTAINER" psql -U spectrum4 -d spectrum4 -c "\d profiles" 2>/dev/null | grep -E "(id|role|full_name)" | wc -l)
                if [ "$PROFILE_COLUMNS" -ge 3 ]; then
                    echo -e "${GREEN}✅ profiles table has correct structure${NC}"
                else
                    echo -e "${YELLOW}⚠️  profiles table structure needs verification${NC}"
                fi
                
                # Check if there are any profiles
                PROFILE_COUNT=$(docker exec "$POSTGRES_CONTAINER" psql -U spectrum4 -d spectrum4 -t -c "SELECT COUNT(*) FROM profiles;" 2>/dev/null | tr -d ' ')
                if [ "$PROFILE_COUNT" -gt 0 ]; then
                    echo -e "${GREEN}✅ $PROFILE_COUNT user profiles found${NC}"
                else
                    echo -e "${YELLOW}⚠️  No user profiles found (may be expected for new deployment)${NC}"
                fi
            else
                echo -e "${RED}❌ profiles table missing from PostgreSQL${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  PostgreSQL container not running (may be expected in production)${NC}"
    fi
    echo ""
}

# Function to display architecture summary
display_architecture_summary() {
    echo -e "${BLUE}📊 Architecture Summary${NC}"
    echo -e "${BLUE}======================${NC}"
    echo ""
    echo -e "${GREEN}✅ CORRECT SETUP:${NC}"
    echo -e "   📡 Supabase: Authentication only (JWT tokens, login/logout)"
    echo -e "   🗄️  PostgreSQL: ALL application data (profiles with roles, violations, etc.)"
    echo ""
    echo -e "${BLUE}🔄 Authentication Flow:${NC}"
    echo -e "   1. User logs in → Supabase validates → Returns JWT"
    echo -e "   2. Frontend sends JWT to backend"
    echo -e "   3. Backend verifies JWT with Supabase"
    echo -e "   4. Backend queries PostgreSQL profiles table for user role"
    echo -e "   5. Authorization based on PostgreSQL role (admin/council/user)"
    echo ""
    echo -e "${YELLOW}🚨 TROUBLESHOOTING REMINDER:${NC}"
    echo -e "   - User role issues → Check PostgreSQL profiles table"
    echo -e "   - Authentication issues → Check Supabase connection"
    echo -e "   - Never check Supabase for user roles!"
    echo ""
}

# Function to show troubleshooting commands
show_troubleshooting_commands() {
    echo -e "${BLUE}🛠️  Common Troubleshooting Commands${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo ""
    echo -e "${GREEN}Check user role in PostgreSQL:${NC}"
    echo "   docker exec -it POSTGRES_CONTAINER psql -U spectrum4 -d spectrum4"
    echo "   SELECT id, full_name, role FROM profiles WHERE id = 'user-uuid';"
    echo ""
    echo -e "${GREEN}Update user role:${NC}"
    echo "   UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid';"
    echo ""
    echo -e "${GREEN}Check all profiles:${NC}"
    echo "   SELECT id, full_name, role, updated_at FROM profiles ORDER BY updated_at DESC;"
    echo ""
}

# Main execution
main() {
    check_env_vars
    check_docker_setup
    check_database_connection
    display_architecture_summary
    show_troubleshooting_commands
    
    echo -e "${GREEN}🎯 Verification complete!${NC}"
    echo -e "${BLUE}📖 For detailed documentation, see: docs/DATABASE_ARCHITECTURE.md${NC}"
}

# Run the main function
main 