#!/bin/bash

DEFAULT_BACKEND_PORT=3001
DEFAULT_FRONTEND_PORT=3002
MAX_PORT_SEARCH_ATTEMPTS=10 # How many ports to try after the default one

# Function to find an available port starting from a base port
find_available_port() {
  local BASE_PORT=$1
  local SERVICE_NAME=$2 # For logging purposes, e.g., "Backend" or "Frontend"
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

# Find available port for backend
BACKEND_PORT=$(find_available_port $DEFAULT_BACKEND_PORT "Backend")
if [ $? -ne 0 ]; then
    echo "[FATAL] Could not find an available port for the backend service. Exiting."
    exit 1
fi
echo "[INFO] Backend will attempt to start on port $BACKEND_PORT."

# Find available port for frontend
FRONTEND_PORT=$(find_available_port $DEFAULT_FRONTEND_PORT "Frontend")
if [ $? -ne 0 ]; then
    echo "[FATAL] Could not find an available port for the frontend service. Exiting."
    exit 1
fi
echo "[INFO] Frontend will attempt to start on port $FRONTEND_PORT."


echo "[INFO] Starting backend server on port $BACKEND_PORT..."
# Pass the selected port to the backend server.
# Assuming the backend (server/index.ts) reads process.env.PORT or process.env.BACKEND_PORT
# If it reads process.env.PORT, this will set it. If it specifically needs BACKEND_PORT, adjust accordingly.
PORT=$BACKEND_PORT npm run dev:backend &
BACKEND_PID=$!
echo "[INFO] Backend server process started with PID $BACKEND_PID."

# Brief pause to let backend initialize
sleep 3

echo "[INFO] Starting frontend dev server on port $FRONTEND_PORT..."
# Start the frontend dev server using the found port
PORT=$FRONTEND_PORT npm run dev &
FRONTEND_PID=$!
echo "[INFO] Frontend dev server process started with PID $FRONTEND_PID."

echo ""
echo "---------------------------------------------------------------------"
echo "[SUCCESS] Services are starting!"
echo "[INFO] Frontend should be available on http://localhost:$FRONTEND_PORT"
echo "[INFO] Backend is running on port $BACKEND_PORT"
echo "---------------------------------------------------------------------"
echo ""
echo "[INFO] Press Ctrl+C to attempt to stop this script and child processes."
echo "[INFO] If Ctrl+C fails, you may need to manually kill processes:"
echo "       Backend PID: $BACKEND_PID"
echo "       Frontend PID: $FRONTEND_PID"
echo "       Or use: pkill -P $$"
echo ""

# Wait for background PIDs. If this script receives SIGINT (Ctrl+C),
# it should be propagated to these child processes.
# Trap SIGINT and SIGTERM to try and kill child processes
trap 'echo "[INFO] Terminating child processes..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' SIGINT SIGTERM

wait $BACKEND_PID
wait $FRONTEND_PID

echo "[INFO] All services have terminated." 