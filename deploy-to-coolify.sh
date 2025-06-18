#!/bin/bash

# StrataTracker Coolify Deployment Script
# This script helps deploy StrataTracker to Coolify

set -e

echo "🚀 StrataTracker Coolify Deployment"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="violation"
SERVICE_NAME="stratatracker"
APP_PORT=3365
DB_PORT=5438

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo -e "Project: ${GREEN}${PROJECT_NAME}${NC}"
echo -e "Service: ${GREEN}${SERVICE_NAME}${NC}"
echo -e "App Port: ${GREEN}${APP_PORT}${NC}"
echo -e "DB Port: ${GREEN}${DB_PORT}${NC}"
echo ""

# Check if environment file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Creating .env from template...${NC}"
    cp coolify.env.example .env
    echo -e "${RED}❗ Please edit .env file with your actual values before proceeding!${NC}"
    echo ""
fi

# Validate required environment variables
echo -e "${BLUE}🔍 Checking environment variables...${NC}"

REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "SESSION_SECRET"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "SMTP_HOST"
    "SMTP_USER"
    "SMTP_PASS"
    "EMAIL_FROM"
)

source .env 2>/dev/null || true

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "   - ${var}"
    done
    echo ""
    echo -e "${YELLOW}Please update your .env file and run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are set${NC}"
echo ""

# Check Docker and build
echo -e "${BLUE}🐳 Building Docker image...${NC}"
docker build -f Dockerfile.coolify -t ${SERVICE_NAME}:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo ""

# Test health endpoint (if running locally)
if [ "$1" = "--test-local" ]; then
    echo -e "${BLUE}🧪 Testing local deployment...${NC}"
    docker-compose -f docker-compose.coolify.yml up -d
    
    echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
    sleep 30
    
    # Test health endpoint
    if curl -f http://localhost:${APP_PORT}/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        docker-compose -f docker-compose.coolify.yml logs app | tail -10
    else
        echo -e "${RED}❌ Health check failed${NC}"
        docker-compose -f docker-compose.coolify.yml logs app
    fi
    
    docker-compose -f docker-compose.coolify.yml down
    echo ""
fi

echo -e "${GREEN}🎉 Deployment preparation complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps for Coolify:${NC}"
echo "1. Log into your Coolify dashboard"
echo "2. Navigate to the 'violation' project"
echo "3. Create a new resource/service"
echo "4. Set the following configuration:"
echo ""
echo -e "${YELLOW}   Service Type: Docker Compose${NC}"
echo -e "${YELLOW}   Repository: ${GREEN}$(git remote get-url origin 2>/dev/null || echo 'your-repo-url')${NC}"
echo -e "${YELLOW}   Docker Compose File: ${GREEN}docker-compose.coolify.yml${NC}"
echo -e "${YELLOW}   Build Context: ${GREEN}.${NC}"
echo -e "${YELLOW}   Dockerfile: ${GREEN}Dockerfile.coolify${NC}"
echo ""
echo -e "${BLUE}🔧 Environment Variables to set in Coolify:${NC}"
echo -e "Copy these values from your .env file:"
echo ""

# Display environment variables for Coolify
for var in "${REQUIRED_VARS[@]}"; do
    echo -e "${GREEN}${var}${NC}=${!var}"
done

echo ""
echo -e "${BLUE}🌐 Additional Variables:${NC}"
echo -e "${GREEN}APP_URL${NC}=https://your-domain.com"
echo -e "${GREEN}CORS_ORIGIN${NC}=https://your-domain.com"
echo -e "${GREEN}PUBLIC_BASE_URL${NC}=https://your-domain.com"
echo ""

echo -e "${BLUE}🔗 Port Configuration:${NC}"
echo -e "App will be accessible on port: ${GREEN}${APP_PORT}${NC}"
echo -e "Database will use port: ${GREEN}${DB_PORT}${NC}"
echo ""

echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "- Set up your domain/subdomain in Coolify"
echo "- Configure SSL certificate"
echo "- Test all functionality after deployment"
echo "- Check logs for any issues"
echo ""

echo -e "${GREEN}🚀 Ready for Coolify deployment!${NC}" 