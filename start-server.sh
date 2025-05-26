#!/bin/bash

echo "-> Current shell PID: $$"
echo "-> Current shell PPID: $PPID"

echo "🔄 Stopping processes on ports 3001 and 3002..."

kill_process_on_port() {
    local PORT=$1
    echo "Looking for processes on port $PORT..."
    # Get PIDs listening on the port. Using -t for terse output (PIDs only).
    # Using -n to avoid host name resolution (can be slow)
    # Using -P to avoid port name resolution (can be slow)
    # Redirect stderr to /dev/null to suppress "no PIDs found" messages from lsof itself
    PIDS=$(lsof -tni:$PORT -sTCP:LISTEN 2>/dev/null)

    if [ -z "$PIDS" ]; then
        echo "No process found listening on TCP port $PORT."
    else
        echo "Found PID(s) on TCP port $PORT: $PIDS"
        for PID in $PIDS; do
            echo "Attempting to gracefully kill PID: $PID (parent PID: $(ps -o ppid= -p $PID || echo "N/A"))"
            kill $PID 2>/dev/null
            sleep 0.5 # Give it a moment to shut down
            if ps -p $PID > /dev/null; then
                echo "PID: $PID did not terminate gracefully, attempting to force kill (kill -9)..."
                kill -9 $PID 2>/dev/null
                if ps -p $PID > /dev/null; then
                    echo "ERROR: Failed to kill PID: $PID even with -9."
                else
                    echo "PID: $PID force killed."
                fi
            else
                echo "PID: $PID terminated gracefully."
            fi
        done
    fi
}

kill_process_on_port 3001
kill_process_on_port 3002

echo "⏳ Waiting for ports to be freed..."
sleep 3 # Reduced sleep as graceful kill might take a moment

echo "🚀 Starting server on port 3002..."
# Ensure environment variables are loaded if .env file exists in the current directory
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  export $(grep -v '^#' .env | xargs)
fi
PORT=3002 npm run dev &
NPM_RUN_DEV_PID=$!
echo "npm run dev started with PID: $NPM_RUN_DEV_PID"

# Wait a few seconds for the server to potentially start
sleep 5 

echo "Pinging server to activate Cursor port forwarding..."
curl -s http://localhost:3002 > /dev/null &

echo "Server startup script finished. npm run dev is running in the background (PID: $NPM_RUN_DEV_PID)."
echo "If you still experience disconnections, please check the PIDs listed above against your shell and Cursor processes." 