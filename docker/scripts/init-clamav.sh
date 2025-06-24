#!/bin/sh
# ClamAV Initialization Script for Docker Container

set -e

echo "Initializing ClamAV for Docker container..."

# Create necessary directories
mkdir -p /var/log/supervisor
mkdir -p /var/log/clamav
mkdir -p /var/lib/clamav
mkdir -p /run/clamav

# Set proper ownership
chown -R clamav:clamav /var/log/clamav
chown -R clamav:clamav /var/lib/clamav
chown -R clamav:clamav /run/clamav

# Create virus action script
cat > /usr/local/bin/virus-action.sh << 'EOF'
#!/bin/sh
# Virus detection action script
VIRUS_NAME="$1"
INFECTED_FILE="$2"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] VIRUS DETECTED: $VIRUS_NAME in file: $INFECTED_FILE" >> /var/log/clamav/virus-detections.log

# Move infected file to quarantine
if [ -f "$INFECTED_FILE" ]; then
    QUARANTINE_FILE="/app/quarantine/$(basename "$INFECTED_FILE").$(date +%s)"
    mv "$INFECTED_FILE" "$QUARANTINE_FILE" 2>/dev/null || true
    echo "[$TIMESTAMP] File quarantined: $QUARANTINE_FILE" >> /var/log/clamav/virus-detections.log
fi
EOF

chmod +x /usr/local/bin/virus-action.sh

# Wait for network connectivity
echo "Waiting for network connectivity..."
for i in $(seq 1 10); do
    if ping -c 1 database.clamav.net >/dev/null 2>&1; then
        echo "Network connectivity confirmed"
        break
    fi
    echo "Waiting for network... ($i/10)"
    sleep 1
done

# Note: Freshclam will be managed by supervisor, not here
echo "ClamAV directories prepared, freshclam will handle virus definitions via supervisor"

echo "ClamAV initialization completed successfully" 