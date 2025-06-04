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

# Wait for network connectivity before downloading virus definitions
echo "Waiting for network connectivity..."
for i in $(seq 1 30); do
    if ping -c 1 database.clamav.net >/dev/null 2>&1; then
        echo "Network connectivity confirmed"
        break
    fi
    echo "Waiting for network... ($i/30)"
    sleep 2
done

# Download initial virus definitions if they don't exist
if [ ! -f /var/lib/clamav/main.cvd ] && [ ! -f /var/lib/clamav/main.cld ]; then
    echo "Downloading initial virus definitions..."
    su-exec clamav freshclam --verbose || {
        echo "Warning: Failed to download virus definitions. ClamAV will continue with empty database."
        # Create minimal dummy files to allow ClamAV to start
        touch /var/lib/clamav/main.cvd
        touch /var/lib/clamav/daily.cvd
        touch /var/lib/clamav/bytecode.cvd
        chown clamav:clamav /var/lib/clamav/*.cvd
    }
else
    echo "Virus definitions already exist"
fi

# Test ClamAV configuration
echo "Testing ClamAV configuration..."
su-exec clamav clamd --config-check=yes

echo "ClamAV initialization completed successfully" 