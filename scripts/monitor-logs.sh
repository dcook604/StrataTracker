#!/bin/bash

# Log monitoring script for StrataTracker
# This script checks log file sizes and alerts if they're growing too large

LOG_DIR="$(dirname "$0")/../logs"

# Environment-specific thresholds
if [ "$NODE_ENV" = "production" ]; then
    MAX_SIZE_MB=10    # Production should have much smaller logs
    ALERT_SIZE_MB=25  # Alert sooner in production
else
    MAX_SIZE_MB=50    # Development can be more verbose
    ALERT_SIZE_MB=100 # Development alert threshold
fi

echo "=== StrataTracker Log Monitor ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Checking logs in: $LOG_DIR"
echo "Alert threshold: ${MAX_SIZE_MB}MB"
echo "Critical threshold: ${ALERT_SIZE_MB}MB"
echo ""

if [ ! -d "$LOG_DIR" ]; then
    echo "❌ Log directory does not exist: $LOG_DIR"
    exit 1
fi

total_size=0
alert_count=0
critical_count=0

for log_file in "$LOG_DIR"/*.log*; do
    if [ -f "$log_file" ]; then
        filename=$(basename "$log_file")
        size_bytes=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo 0)
        size_mb=$((size_bytes / 1024 / 1024))
        
        total_size=$((total_size + size_bytes))
        
        if [ $size_mb -ge $ALERT_SIZE_MB ]; then
            echo "🚨 CRITICAL: $filename is ${size_mb}MB (${size_bytes} bytes)"
            critical_count=$((critical_count + 1))
        elif [ $size_mb -ge $MAX_SIZE_MB ]; then
            echo "⚠️  WARNING: $filename is ${size_mb}MB (${size_bytes} bytes)"
            alert_count=$((alert_count + 1))
        else
            echo "✅ OK: $filename is ${size_mb}MB (${size_bytes} bytes)"
        fi
    fi
done

total_size_mb=$((total_size / 1024 / 1024))
echo ""
echo "=== Summary ==="
echo "Total log size: ${total_size_mb}MB (${total_size} bytes)"
echo "Files with warnings: $alert_count"
echo "Files with critical alerts: $critical_count"

if [ $critical_count -gt 0 ]; then
    echo ""
    echo "🚨 CRITICAL: Some log files are very large!"
    if [ "$NODE_ENV" = "production" ]; then
        echo "This is unusual for production - investigate immediately!"
        echo "Production logs should be minimal. Check for:"
        echo "  - Excessive error logging indicating system issues"
        echo "  - Log level misconfiguration"
        echo "  - Potential logging loops"
    fi
    echo "Consider running: rm logs/*.log"
    echo "Or use log rotation: mv logs/app.log logs/app.log.old"
    exit 2
elif [ $alert_count -gt 0 ]; then
    echo ""
    echo "⚠️  WARNING: Some log files are getting large"
    if [ "$NODE_ENV" = "production" ]; then
        echo "Production logs are larger than expected"
        echo "Review logging configuration and error rates"
    fi
    echo "Monitor closely and consider cleanup if needed"
    exit 1
else
    echo ""
    echo "✅ All log files are within normal size limits"
    if [ "$NODE_ENV" = "production" ]; then
        echo "Production logging levels appear optimal"
    fi
    exit 0
fi 