#!/bin/bash

BACKEND_PORT=3001
FRONTEND_PORT=3002

# Function to check if port is in use and kill the process
check_and_kill_port() {
  local PORT_TO_CHECK=$1
  echo "[INFO] Checking port $PORT_TO_CHECK..."
  if lsof -i :$PORT_TO_CHECK | grep LISTEN > /dev/null; then
    echo "[INFO] Port $PORT_TO_CHECK is in use. Killing process..."
    lsof -ti :$PORT_TO_CHECK | xargs kill -9
    sleep 1 # Give a moment for the port to be released
  else
    echo "[INFO] Port $PORT_TO_CHECK is free."
  fi

  # Wait until the port is free
  while lsof -i :$PORT_TO_CHECK | grep LISTEN > /dev/null; do
    echo "[INFO] Waiting for port $PORT_TO_CHECK to be released..."
    sleep 1
  done
  echo "[INFO] Port $PORT_TO_CHECK is now confirmed free."
}

# Check and kill for backend port
check_and_kill_port $BACKEND_PORT

# Check and kill for frontend port
check_and_kill_port $FRONTEND_PORT

echo "[INFO] Starting backend server..."
# Start the backend server (typically on port 3001 as per npm run dev:backend)
# If npm run dev:backend already handles port clearing, the above check_and_kill_port for BACKEND_PORT might be redundant
# but it provides an explicit guarantee.
npm run dev:backend & # Run backend in the background
BACKEND_PID=$!
echo "[INFO] Backend server started with PID $BACKEND_PID."

echo "[INFO] Starting frontend dev server on port $FRONTEND_PORT..."
# Start the frontend dev server
PORT=$FRONTEND_PORT npm run dev & # Run frontend in the background
FRONTEND_PID=$!
echo "[INFO] Frontend dev server started with PID $FRONTEND_PID."

echo "[INFO] Frontend should be available on http://localhost:$FRONTEND_PORT"
echo "[INFO] Backend is running in the background."
echo "[INFO] Press Ctrl+C to stop this script (this may not stop backgrounded servers)."
echo "[INFO] To stop background servers, use 'kill $BACKEND_PID $FRONTEND_PID' or manage them via 'jobs' and 'fg/kill %job_number'."

# Wait for any background jobs to complete (optional, script will exit otherwise)
# To keep the script running and allow easy Ctrl+C to kill children,
# we can use a trap or wait for a specific signal.
# For simplicity, this script will exit, and you'll manage background processes manually.
wait $BACKEND_PID $FRONTEND_PID 