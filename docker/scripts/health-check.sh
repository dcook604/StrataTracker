#!/bin/sh
# Health check script for Docker container

set -e

# Check if Node.js application is responding
if ! curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "Node.js application health check failed"
    exit 1
fi

# Check if ClamAV daemon is running
if ! pgrep clamd >/dev/null 2>&1; then
    echo "ClamAV daemon is not running"
    exit 1
fi

# Check if ClamAV is responding to connections
if ! echo "PING" | nc -w 5 127.0.0.1 3310 | grep -q "PONG"; then
    echo "ClamAV daemon is not responding to connections"
    exit 1
fi

# Check if virus definitions are present
if [ ! -f /var/lib/clamav/main.cvd ] && [ ! -f /var/lib/clamav/main.cld ]; then
    echo "Warning: ClamAV virus definitions are missing"
    # Don't fail health check for missing definitions in case of network issues
fi

echo "All services are healthy"
exit 0 