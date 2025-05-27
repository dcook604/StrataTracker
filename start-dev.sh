#!/bin/bash

BACKEND_PORT=3001
FRONTEND_PORT=3002

# Function to check if port is in use and kill the process
check_and_kill_port() {
  local PORT_TO_CHECK=$1
  local RETRIES=6 # Try to kill and check for up to ~3 seconds (6 * 0.5s)
  echo "[INFO] Checking port $PORT_TO_CHECK..."

  if lsof -i :$PORT_TO_CHECK | grep LISTEN > /dev/null; then
    echo "[INFO] Port $PORT_TO_CHECK is in use. Attempting to kill process(es)..."
    # Loop a few times to ensure process is killed and port is free
    for i in $(seq 1 $RETRIES); do
      # Try to kill whatever is on the port. Suppress errors if lsof finds nothing or kill fails.
      lsof -ti :$PORT_TO_CHECK | xargs kill -9 2>/dev/null || true
      sleep 0.2 # Shorter sleep to react faster

      if ! (lsof -i :$PORT_TO_CHECK | grep LISTEN > /dev/null); then
        echo "[INFO] Port $PORT_TO_CHECK appears free after kill attempt $i."
        # Add an extra small delay to allow OS to fully release the socket
        sleep 0.3
        if ! (lsof -i :$PORT_TO_CHECK | grep LISTEN > /dev/null); then
            echo "[INFO] Port $PORT_TO_CHECK confirmed free after extra delay."
            return 0 # Port is free
        else
            echo "[INFO] Port $PORT_TO_CHECK re-occupied after extra delay. Continuing kill attempts..."
        fi
      fi

      if [ "$i" -eq "$RETRIES" ]; then
        echo "[ERROR] Failed to free port $PORT_TO_CHECK after $RETRIES attempts within the forceful kill loop."
        # Fall through to the final wait loop, which also has a timeout
      fi
      echo "[INFO] Port $PORT_TO_CHECK still in use after kill attempt $i. Retrying..."
    done
  else
    echo "[INFO] Port $PORT_TO_CHECK is initially free."
  fi

  # Final wait loop to be absolutely sure
  local WAIT_COUNT=0
  local MAX_WAIT_ITERATIONS=10 # Max 5 seconds (10 * 0.5s)
  while lsof -i :$PORT_TO_CHECK | grep LISTEN > /dev/null; do
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ "$WAIT_COUNT" -gt "$MAX_WAIT_ITERATIONS" ]; then
        echo "[ERROR] Port $PORT_TO_CHECK did not become free after extended wait ($((MAX_WAIT_ITERATIONS / 2)) seconds). Giving up on this port."
        return 1 # Indicate failure
    fi
    echo "[INFO] Waiting for port $PORT_TO_CHECK to be released (final check, attempt $WAIT_COUNT/$MAX_WAIT_ITERATIONS)..."
    # If we are in this loop, it means the port is still busy. Try killing again.
    lsof -ti :$PORT_TO_CHECK | xargs kill -9 2>/dev/null || true
    sleep 0.5
  done
  echo "[INFO] Port $PORT_TO_CHECK is now confirmed free."
  return 0 # Indicate success
}

# Check and kill for backend port
if ! check_and_kill_port $BACKEND_PORT; then
    echo "[FATAL] Could not ensure backend port $BACKEND_PORT is free. Exiting."
    exit 1
fi

# Check and kill for frontend port
if ! check_and_kill_port $FRONTEND_PORT; then
    echo "[FATAL] Could not ensure frontend port $FRONTEND_PORT is free. Exiting."
    exit 1
fi

echo "[INFO] Starting backend server..."
# Start the backend server (typically on port 3001 as per npm run dev:backend)
npm run dev:backend & # Run backend in the background
BACKEND_PID=$!
echo "[INFO] Backend server started with PID $BACKEND_PID."

# Brief pause to let backend initialize a bit before frontend starts.
# This might help if frontend makes immediate requests or if there are resource contentions.
sleep 2

echo "[INFO] Starting frontend dev server on port $FRONTEND_PORT..."
# Start the frontend dev server
PORT=$FRONTEND_PORT npm run dev & # Run frontend in the background
FRONTEND_PID=$!
echo "[INFO] Frontend dev server started with PID $FRONTEND_PID."

echo "[INFO] Frontend should be available on http://localhost:$FRONTEND_PORT"
echo "[INFO] Backend is running in the background."
echo "[INFO] Press Ctrl+C to stop this script (this should also stop backgrounded servers via the 'wait' command)."
echo "[INFO] If Ctrl+C fails to stop them, use 'kill $BACKEND_PID $FRONTEND_PID' or 'pkill -P $$' (to kill children of this script)."

# Wait for background PIDs. If this script receives SIGINT (Ctrl+C),
# it should be propagated to these child processes.
wait $BACKEND_PID $FRONTEND_PID 