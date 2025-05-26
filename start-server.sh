#!/bin/bash

echo "🔄 Stopping processes on ports 3001 and 3002..."

# Kill processes on port 3001
PORT_3001_PID=$(lsof -ti:3001 2>/dev/null)
if [ ! -z "$PORT_3001_PID" ]; then
    echo "Killing process on port 3001 (PID: $PORT_3001_PID)"
    kill -9 $PORT_3001_PID 2>/dev/null
else
    echo "No process found on port 3001"
fi

# Kill processes on port 3002
PORT_3002_PID=$(lsof -ti:3002 2>/dev/null)
if [ ! -z "$PORT_3002_PID" ]; then
    echo "Killing process on port 3002 (PID: $PORT_3002_PID)"
    kill -9 $PORT_3002_PID 2>/dev/null
else
    echo "No process found on port 3002"
fi

echo "⏳ Waiting for ports to be freed..."
sleep 3

echo "🚀 Starting server with Onboardbase secrets on port 3002..."
PORT=3002 npx onboardbase run -- npm run dev 