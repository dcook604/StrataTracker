#!/bin/bash

DEFAULT_FRONTEND_PORT=5173
DEFAULT_BACKEND_PORT=3001
MAX_PORT_SEARCH_ATTEMPTS=10 # How many ports to try after the default one

# Database connection string
DATABASE_URL="postgres://spectrum4:spectrum4password@localhost:5432/spectrum4"

# Check if database is running in Docker
check_database_status() {
    echo "[INFO] Checking PostgreSQL database status..."
    
    local DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "(stratatracker.*db|db.*stratatracker)" | head -1)
    
    if [ -n "$DB_CONTAINER" ]; then
        echo "[INFO] Found StrataTracker database container: $DB_CONTAINER"
        
        # Test if database is responding
        if docker exec "$DB_CONTAINER" pg_isready -U spectrum4 > /dev/null 2>&1; then
            echo "[INFO] ✅ Database is running and responding"
            return 0
        else
            echo "[WARNING] ⚠️  Database container is running but not responding"
            echo "[INFO] You may need to wait for it to fully start up, or check the logs:"
            echo "       docker logs $DB_CONTAINER"
            return 1
        fi
    else
        echo "[ERROR] ❌ No StrataTracker database container found!"
        echo "[INFO] Please start it with: docker-compose up -d db"
        return 1
    fi
}

# Function to stop existing development processes
stop_existing_processes() {
    echo "[INFO] Checking for existing development processes..."
    
    # Find existing processes
    local FRONTEND_PIDS=$(pgrep -f "npm run dev" 2>/dev/null)
    local VITE_PIDS=$(pgrep -f "vite" 2>/dev/null)
    local BACKEND_PIDS=$(pgrep -f "npm run dev:backend" 2>/dev/null)
    local NODEMON_PIDS=$(pgrep -f "nodemon.*server" 2>/dev/null)
    
    if [ -n "$FRONTEND_PIDS" ] || [ -n "$VITE_PIDS" ] || [ -n "$BACKEND_PIDS" ] || [ -n "$NODEMON_PIDS" ]; then
        echo "[INFO] Found existing development processes. Stopping them..."
        
        # Kill processes gracefully
        if [ -n "$FRONTEND_PIDS" ]; then
            echo "[INFO] Stopping frontend processes (PIDs: $FRONTEND_PIDS)..."
            echo "$FRONTEND_PIDS" | xargs kill -TERM 2>/dev/null
        fi
        
        if [ -n "$VITE_PIDS" ]; then
            echo "[INFO] Stopping Vite processes (PIDs: $VITE_PIDS)..."
            echo "$VITE_PIDS" | xargs kill -TERM 2>/dev/null
        fi
        
        if [ -n "$BACKEND_PIDS" ]; then
            echo "[INFO] Stopping backend processes (PIDs: $BACKEND_PIDS)..."
            echo "$BACKEND_PIDS" | xargs kill -TERM 2>/dev/null
        fi
        
        if [ -n "$NODEMON_PIDS" ]; then
            echo "[INFO] Stopping nodemon processes (PIDs: $NODEMON_PIDS)..."
            echo "$NODEMON_PIDS" | xargs kill -TERM 2>/dev/null
        fi
        
        # Wait for graceful shutdown
        echo "[INFO] Waiting for processes to terminate gracefully..."
        sleep 3
        
        # Force kill if any are still running
        local REMAINING_PIDS=$(pgrep -f "npm run dev\|vite\|nodemon.*server" 2>/dev/null)
        
        if [ -n "$REMAINING_PIDS" ]; then
            echo "[INFO] Force killing remaining processes..."
            echo "$REMAINING_PIDS" | xargs kill -KILL 2>/dev/null
        fi
        
        echo "[INFO] Development processes stopped."
    else
        echo "[INFO] No existing development processes found."
    fi
}

# Function to find an available port starting from a base port
find_available_port() {
  local BASE_PORT=$1
  local SERVICE_NAME=$2 # For logging purposes, e.g., "Frontend"
  local CURRENT_PORT=$BASE_PORT

  for i in $(seq 0 $MAX_PORT_SEARCH_ATTEMPTS); do
    CURRENT_PORT=$((BASE_PORT + i))
    echo "[INFO] [$SERVICE_NAME] Checking if port $CURRENT_PORT is available..." >&2
    if ! lsof -i :$CURRENT_PORT | grep LISTEN > /dev/null; then
      echo "[INFO] [$SERVICE_NAME] Port $CURRENT_PORT is available." >&2
      echo $CURRENT_PORT # Return the available port
      return 0
    else
      echo "[INFO] [$SERVICE_NAME] Port $CURRENT_PORT is in use." >&2
    fi
  done

  echo "[ERROR] [$SERVICE_NAME] Could not find an available port after trying $MAX_PORT_SEARCH_ATTEMPTS ports starting from $BASE_PORT." >&2
  return 1 # Indicate failure
}

# Main execution
echo "🚀 StrataTracker Development Startup Script"
echo "=============================================="
echo "[INFO] This script starts both backend and frontend locally in development mode."
echo "[INFO] It expects the database to be running in Docker."
echo ""

# Check database status first
if ! check_database_status; then
    echo ""
    echo "[FATAL] Database is not running or not ready. Please ensure your Docker database is up:"
    echo "        docker-compose up -d db"
    echo ""
    echo "You can check the database logs with:"
    echo "        docker-compose logs db"
    exit 1
fi

echo ""

# Stop any existing development processes
stop_existing_processes

# Find available ports
FRONTEND_PORT=$(find_available_port $DEFAULT_FRONTEND_PORT "Frontend")
if [ $? -ne 0 ]; then
    echo "[FATAL] Could not find an available port for the frontend service. Exiting."
    exit 1
fi

BACKEND_PORT=$(find_available_port $DEFAULT_BACKEND_PORT "Backend")
if [ $? -ne 0 ]; then
    echo "[FATAL] Could not find an available port for the backend service. Exiting."
    exit 1
fi

echo ""
echo "[INFO] Frontend will start on port $FRONTEND_PORT"
echo "[INFO] Backend will start on port $BACKEND_PORT"
echo "[INFO] Database is running on port 5432 (Docker)"
echo ""

# Set up environment variables
export VITE_API_URL="http://localhost:$BACKEND_PORT"
export DATABASE_URL="$DATABASE_URL"
export PORT="$BACKEND_PORT"

echo "[INFO] Starting backend development server..."
echo "[INFO] Backend will connect to database at: $DATABASE_URL"

# Start the backend dev server in background
DATABASE_URL="$DATABASE_URL" PORT="$BACKEND_PORT" npm run dev:backend > backend.log 2>&1 &
BACKEND_PID=$!
echo "[INFO] Backend development server started with PID $BACKEND_PID."

# --- Wait for backend to be fully ready ---
WAIT_SECONDS=30
echo "[INFO] Waiting up to $WAIT_SECONDS seconds for backend to become healthy..."

# Use a while loop with a timeout to check the health endpoint
backend_ready=false
for i in $(seq 1 $WAIT_SECONDS); do
    # Use curl with silent (-s) and fail (-f) options
    if curl -s -f "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
        echo "[INFO] ✅ Backend is healthy and responding on http://localhost:$BACKEND_PORT (took ${i}s)"
        backend_ready=true
        break
    fi
    # Print a dot to show progress without spamming logs
    printf "."
    sleep 1
done

echo "" # Newline after the progress dots

if [ "$backend_ready" = false ]; then
    echo "[FATAL] ❌ Backend did not become healthy after $WAIT_SECONDS seconds."
    echo "[INFO] Please check the backend logs for errors:"
    echo "       tail -f backend.log"
    # Make sure to kill the process if the script exits
    kill $BACKEND_PID
    exit 1
fi
# --- End of backend readiness check ---

echo ""
echo "[INFO] Starting frontend development server..."
echo "[INFO] Frontend will connect to backend at: http://localhost:$BACKEND_PORT"

# Start the frontend dev server in background
PORT=$FRONTEND_PORT npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "[INFO] Frontend development server started with PID $FRONTEND_PID."

echo ""
echo "---------------------------------------------------------------------"
echo "🎉 Development Environment Ready!"
echo ""
echo "📱 Frontend:  http://localhost:$FRONTEND_PORT"
echo "🔧 Backend:   http://localhost:$BACKEND_PORT (Local with live reload)"
echo "🗄️  Database: localhost:5432 (Docker)"
echo ""
echo "💡 Backend API Health: http://localhost:$BACKEND_PORT/api/health"
echo "📋 Backend logs: tail -f backend.log"
echo "📋 Frontend logs: tail -f frontend.log"
echo "---------------------------------------------------------------------"
echo ""
echo "[INFO] Press Ctrl+C to stop both development servers."
echo "[INFO] To stop the database: docker-compose stop db"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "[INFO] Shutting down development servers..."
    
    if [ -n "$FRONTEND_PID" ]; then
        echo "[INFO] Stopping frontend development server..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    if [ -n "$BACKEND_PID" ]; then
        echo "[INFO] Stopping backend development server..."
        kill $BACKEND_PID 2>/dev/null
    fi
    
    # Clean up any remaining processes
    pkill -f "npm run dev" 2>/dev/null
    pkill -f "npm run dev:backend" 2>/dev/null
    
    echo "[INFO] Development servers stopped. Database continues running in Docker."
    echo "[INFO] Log files (backend.log, frontend.log) are preserved for debugging."
    exit 0
}

# Trap SIGINT and SIGTERM to cleanup properly
trap cleanup SIGINT SIGTERM

# Keep the script running until user presses Ctrl+C
# The trap will handle cleanup when SIGINT/SIGTERM is received
echo "[INFO] Development servers are running. Press Ctrl+C to stop."
echo ""

# Wait indefinitely until interrupted
while true; do
    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "[ERROR] Backend process died unexpectedly. Check backend.log for details."
        break
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "[ERROR] Frontend process died unexpectedly. Check frontend.log for details."
        break
    fi
    
    sleep 5
done

echo "[INFO] All development servers have terminated."
echo "[INFO] Database continues running in Docker." 