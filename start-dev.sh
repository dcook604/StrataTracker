#!/bin/bash

PORT=3002

# Function to check if port is in use
is_port_in_use() {
  lsof -i :$PORT | grep LISTEN > /dev/null
}

# Kill any process using the port
if is_port_in_use; then
  echo "[INFO] Port $PORT is in use. Killing process..."
  lsof -ti :$PORT | xargs kill -9
  sleep 1
else
  echo "[INFO] Port $PORT is free."
fi

# Wait until the port is free
while is_port_in_use; do
  echo "[INFO] Waiting for port $PORT to be released..."
  sleep 1
done

echo "[INFO] Starting dev server on port $PORT..."
# Start the dev server on port 3002
PORT=$PORT npm run dev 