#!/bin/bash

DEFAULT_FRONTEND_PORT=5173
MAX_PORT_SEARCH_ATTEMPTS=10 # How many ports to try after the default one

# Check if StrataTracker backend is running in Docker
check_backend_status() {
    echo "[INFO] Checking StrataTracker backend status..."
    
    local BACKEND_CONTAINER=$(sudo docker ps --format "{{.Names}}" | grep -E "(stratatracker.*backend|backend.*stratatracker)" | head -1)
    
    if [ -n "$BACKEND_CONTAINER" ]; then
        echo "[INFO] Found StrataTracker backend container: $BACKEND_CONTAINER"
        
        # Check if it's healthy/running
        local BACKEND_STATUS=$(sudo docker ps --format "{{.Status}}" --filter "name=$BACKEND_CONTAINER")
        echo "[INFO] Backend container status: $BACKEND_STATUS"
        
        # Test if backend is responding on port 3001
        if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            echo "[INFO] ✅ Backend is running and responding on http://localhost:3001"
            return 0
        else
            echo "[WARNING] ⚠️  Backend container is running but not responding on port 3001"
            echo "[INFO] You may need to wait for it to fully start up, or check the logs:"
            echo "       sudo docker logs $BACKEND_CONTAINER"
            return 1
        fi
    else
        echo "[ERROR] ❌ No StrataTracker backend container found!"
        echo "[INFO] Please start it with: docker-compose up -d db backend"
        return 1
    fi
}

# Function to stop existing frontend development processes
stop_existing_frontend_processes() {
    echo "[INFO] Checking for existing frontend development processes..."
    
    # Find existing npm/node dev processes (but not Docker backend)
    local FRONTEND_PIDS=$(pgrep -f "npm run dev" | grep -v backend 2>/dev/null)
    local VITE_PIDS=$(pgrep -f "vite" 2>/dev/null)
    
    if [ -n "$FRONTEND_PIDS" ] || [ -n "$VITE_PIDS" ]; then
        echo "[INFO] Found existing frontend development processes. Stopping them..."
        
        # Kill npm dev processes (frontend only)
        if [ -n "$FRONTEND_PIDS" ]; then
            echo "[INFO] Stopping frontend npm processes (PIDs: $FRONTEND_PIDS)..."
            echo "$FRONTEND_PIDS" | xargs kill -TERM 2>/dev/null
        fi
        
        # Kill Vite processes
        if [ -n "$VITE_PIDS" ]; then
            echo "[INFO] Stopping Vite processes (PIDs: $VITE_PIDS)..."
            echo "$VITE_PIDS" | xargs kill -TERM 2>/dev/null
        fi
        
        # Wait a moment for graceful shutdown
        echo "[INFO] Waiting for processes to terminate gracefully..."
        sleep 3
        
        # Force kill if any are still running
        local REMAINING_PIDS=$(pgrep -f "npm run dev\|vite" | grep -v backend 2>/dev/null)
        
        if [ -n "$REMAINING_PIDS" ]; then
            echo "[INFO] Force killing remaining frontend processes..."
            echo "$REMAINING_PIDS" | xargs kill -KILL 2>/dev/null
        fi
        
        echo "[INFO] Frontend processes stopped."
    else
        echo "[INFO] No existing frontend development processes found."
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
echo "[INFO] This script starts the frontend in development mode."
echo "[INFO] It expects the backend and database to be running in Docker."
echo ""

# Check backend status first
if ! check_backend_status; then
    echo ""
    echo "[FATAL] Backend is not running or not ready. Please ensure your Docker backend is up:"
    echo "        docker-compose up -d db backend"
    echo ""
    echo "You can check the backend logs with:"
    echo "        docker-compose logs backend"
    exit 1
fi

echo ""

# Stop any existing frontend processes
stop_existing_frontend_processes

# Find available port for frontend
FRONTEND_PORT=$(find_available_port $DEFAULT_FRONTEND_PORT "Frontend")
if [ $? -ne 0 ]; then
    echo "[FATAL] Could not find an available port for the frontend service. Exiting."
    exit 1
fi

echo ""
echo "[INFO] Frontend will start on port $FRONTEND_PORT"
echo "[INFO] Backend is running on port 3001 (Docker)"
echo ""

# Set up environment for frontend development
export VITE_API_URL="http://localhost:3001"

echo "[INFO] Starting frontend development server..."
echo "[INFO] Frontend will connect to backend at: http://localhost:3001"

# Start the frontend dev server
PORT=$FRONTEND_PORT npm run dev &
FRONTEND_PID=$!
echo "[INFO] Frontend development server started with PID $FRONTEND_PID."

echo ""
echo "---------------------------------------------------------------------"
echo "🎉 Development Environment Ready!"
echo ""
echo "📱 Frontend:  http://localhost:$FRONTEND_PORT"
echo "🔧 Backend:   http://localhost:3001 (Docker)"
echo "🗄️  Database: localhost:5432 (Docker)"
echo ""
echo "💡 Backend API Health: http://localhost:3001/api/health"
echo "---------------------------------------------------------------------"
echo ""
echo "[INFO] Press Ctrl+C to stop the frontend development server."
echo "[INFO] To stop the backend: docker-compose down"
echo ""

# Trap SIGINT and SIGTERM to kill frontend process
trap 'echo "[INFO] Stopping frontend development server..."; kill $FRONTEND_PID 2>/dev/null; echo "[INFO] Frontend stopped. Backend continues running in Docker."; exit' SIGINT SIGTERM

# Wait for the frontend process
wait $FRONTEND_PID

echo "[INFO] Frontend development server has terminated."
echo "[INFO] Backend and database continue running in Docker." 