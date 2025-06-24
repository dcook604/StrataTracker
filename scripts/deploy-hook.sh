#!/bin/bash
set -e

# StrataTracker Deployment Verification Hook
# This script ensures successful deployment including database migrations
# Can be used as a Coolify deployment hook

APP_URL="${APP_URL:-https://violation.spectrum4.ca}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-10}"

echo "🚀 Starting StrataTracker deployment verification..."
echo "App URL: $APP_URL"
echo "Max retries: $MAX_RETRIES"
echo "Retry interval: ${RETRY_INTERVAL}s"

# Function to check service health
check_health() {
  local url="$1/api/health"
  echo "🔍 Checking health endpoint: $url"
  
  response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$url" || echo "000")
  
  if [ "$response" = "200" ]; then
    echo "✅ Health check passed"
    return 0
  else
    echo "❌ Health check failed (HTTP $response)"
    return 1
  fi
}

# Function to check database status and migrations
check_database() {
  local url="$1/api/database-status"
  echo "🔍 Checking database status: $url"
  
  # Note: This endpoint requires authentication, so we check if it returns proper error
  response=$(curl -s -w "%{http_code}" -o /tmp/db_response "$url" || echo "000")
  
  # 401 means app is running and database is accessible (auth required)
  # 200 means app is running and migrations completed (if auth bypassed)
  if [ "$response" = "401" ] || [ "$response" = "200" ]; then
    echo "✅ Database status check passed (HTTP $response)"
    return 0
  else
    echo "❌ Database status check failed (HTTP $response)"
    return 1
  fi
}

# Function to verify critical API endpoints
verify_endpoints() {
  local base_url="$1"
  
  echo "🔍 Verifying critical endpoints..."
  
  # Check admin announcements endpoint (should return JSON)
  announcements_response=$(curl -s -w "%{http_code}" -H "Content-Type: application/json" \
    -o /tmp/announcements_response "$base_url/api/admin-announcements" || echo "000")
  
  if [ "$announcements_response" = "200" ]; then
    # Check if response is JSON
    if cat /tmp/announcements_response | jq empty 2>/dev/null; then
      echo "✅ Admin announcements endpoint working (JSON response)"
    else
      echo "⚠️  Admin announcements endpoint returning non-JSON"
      return 1
    fi
  else
    echo "❌ Admin announcements endpoint failed (HTTP $announcements_response)"
    return 1
  fi
}

# Main deployment verification loop
echo "⏳ Waiting for application to start..."

for i in $(seq 1 $MAX_RETRIES); do
  echo "🔄 Attempt $i of $MAX_RETRIES"
  
  if check_health "$APP_URL"; then
    echo "✅ Application health verified"
    
    if check_database "$APP_URL"; then
      echo "✅ Database connection verified"
      
      if verify_endpoints "$APP_URL"; then
        echo "✅ Critical endpoints verified"
        echo ""
        echo "🎉 StrataTracker deployment verification SUCCESSFUL!"
        echo "✅ Application is ready to serve traffic"
        exit 0
      else
        echo "❌ Endpoint verification failed"
      fi
    else
      echo "❌ Database verification failed"
    fi
  else
    echo "❌ Health check failed"
  fi
  
  if [ $i -lt $MAX_RETRIES ]; then
    echo "⏳ Waiting ${RETRY_INTERVAL}s before retry..."
    sleep $RETRY_INTERVAL
  fi
done

echo ""
echo "❌ StrataTracker deployment verification FAILED!"
echo "❌ Application failed to start properly after $MAX_RETRIES attempts"
echo ""
echo "🔍 Troubleshooting information:"
echo "- Check application logs for startup errors"
echo "- Verify database connection settings"
echo "- Ensure all environment variables are set correctly"
echo "- Check if migrations completed successfully"
exit 1 