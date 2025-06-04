#!/bin/bash
# StrataTracker ClamAV Setup Script
# This script installs and configures ClamAV for virus scanning

set -e

echo "=========================================="
echo "   StrataTracker ClamAV Setup Script"
echo "=========================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root for security reasons."
   echo "Please run as a regular user with sudo privileges."
   exit 1
fi

# Check if sudo is available
if ! command -v sudo &> /dev/null; then
    echo "sudo is required but not installed. Please install sudo first."
    exit 1
fi

# Detect operating system
OS="unknown"
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$ID
fi

echo "Detected OS: $OS"

# Install ClamAV based on OS
install_clamav() {
    case $OS in
        ubuntu|debian)
            echo "Installing ClamAV on Ubuntu/Debian..."
            sudo apt-get update
            sudo apt-get install -y clamav clamav-daemon clamav-freshclam
            ;;
        centos|rhel|fedora)
            echo "Installing ClamAV on CentOS/RHEL/Fedora..."
            if command -v dnf &> /dev/null; then
                sudo dnf install -y clamav clamav-update clamav-scanner-systemd
            else
                sudo yum install -y clamav clamav-update clamav-scanner-systemd
            fi
            ;;
        alpine)
            echo "Installing ClamAV on Alpine Linux..."
            sudo apk add --no-cache clamav clamav-daemon freshclam
            ;;
        *)
            echo "Unsupported operating system: $OS"
            echo "Please install ClamAV manually and run this script again."
            exit 1
            ;;
    esac
}

# Configure ClamAV
configure_clamav() {
    echo "Configuring ClamAV..."
    
    # Stop services if running
    sudo systemctl stop clamav-daemon 2>/dev/null || true
    sudo systemctl stop clamav-freshclam 2>/dev/null || true
    
    # Create ClamAV directories if they don't exist
    sudo mkdir -p /var/lib/clamav
    sudo mkdir -p /var/log/clamav
    sudo mkdir -p /var/run/clamav
    
    # Set proper ownership
    sudo chown -R clamav:clamav /var/lib/clamav
    sudo chown -R clamav:clamav /var/log/clamav
    sudo chown -R clamav:clamav /var/run/clamav
    
    # Configure freshclam
    if [[ -f /etc/clamav/freshclam.conf ]]; then
        sudo sed -i 's/^Example/#Example/' /etc/clamav/freshclam.conf
        sudo sed -i 's/#DatabaseMirror/DatabaseMirror/' /etc/clamav/freshclam.conf
    fi
    
    # Configure clamd
    if [[ -f /etc/clamav/clamd.conf ]]; then
        sudo sed -i 's/^Example/#Example/' /etc/clamav/clamd.conf
        
        # Configure socket
        if ! grep -q "LocalSocket" /etc/clamav/clamd.conf; then
            echo "LocalSocket /var/run/clamav/clamd.ctl" | sudo tee -a /etc/clamav/clamd.conf
        fi
        
        # Configure log file
        if ! grep -q "LogFile" /etc/clamav/clamd.conf; then
            echo "LogFile /var/log/clamav/clamav.log" | sudo tee -a /etc/clamav/clamd.conf
        fi
        
        # Configure PID file
        if ! grep -q "PidFile" /etc/clamav/clamd.conf; then
            echo "PidFile /var/run/clamav/clamd.pid" | sudo tee -a /etc/clamav/clamd.conf
        fi
        
        # Configure user
        if ! grep -q "User clamav" /etc/clamav/clamd.conf; then
            echo "User clamav" | sudo tee -a /etc/clamav/clamd.conf
        fi
        
        # Enable archive scanning
        sudo sed -i 's/#ScanArchive yes/ScanArchive yes/' /etc/clamav/clamd.conf
        
        # Set max file size (25MB)
        sudo sed -i 's/#MaxFileSize 25M/MaxFileSize 25M/' /etc/clamav/clamd.conf
    fi
}

# Update virus database
update_database() {
    echo "Updating ClamAV virus database..."
    
    # Update the virus database
    sudo freshclam || {
        echo "Initial freshclam failed, trying again in 5 seconds..."
        sleep 5
        sudo freshclam
    }
    
    echo "Virus database updated successfully."
}

# Start and enable services
start_services() {
    echo "Starting and enabling ClamAV services..."
    
    # Enable and start freshclam service
    sudo systemctl enable clamav-freshclam
    sudo systemctl start clamav-freshclam
    
    # Enable and start clamd service
    sudo systemctl enable clamav-daemon
    sudo systemctl start clamav-daemon
    
    # Wait a moment for services to start
    sleep 3
    
    echo "Checking service status..."
    sudo systemctl status clamav-freshclam --no-pager -l
    sudo systemctl status clamav-daemon --no-pager -l
}

# Setup automatic updates
setup_auto_updates() {
    echo "Setting up automatic virus database updates..."
    
    # Create cron job for regular updates (every 6 hours)
    CRON_JOB="0 */6 * * * /usr/bin/freshclam --quiet"
    
    # Check if cron job already exists
    if ! crontab -l 2>/dev/null | grep -q "freshclam"; then
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo "Added cron job for automatic virus database updates."
    else
        echo "Cron job for virus database updates already exists."
    fi
}

# Test ClamAV installation
test_installation() {
    echo "Testing ClamAV installation..."
    
    # Create a test file
    echo "X5O!P%@AP[4\\PZX54(P^)7CC)7}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H+H*" > /tmp/eicar.txt
    
    # Test with clamscan
    if command -v clamscan &> /dev/null; then
        echo "Testing with clamscan..."
        if clamscan /tmp/eicar.txt | grep -q "FOUND"; then
            echo "✓ ClamAV can detect test virus with clamscan"
        else
            echo "✗ ClamAV failed to detect test virus with clamscan"
        fi
    fi
    
    # Test with clamdscan if available
    if command -v clamdscan &> /dev/null; then
        echo "Testing with clamdscan..."
        if clamdscan /tmp/eicar.txt 2>/dev/null | grep -q "FOUND"; then
            echo "✓ ClamAV can detect test virus with clamdscan"
        else
            echo "✗ ClamAV failed to detect test virus with clamdscan (daemon may not be ready)"
        fi
    fi
    
    # Clean up test file
    rm -f /tmp/eicar.txt
    
    # Check socket
    if [[ -S /var/run/clamav/clamd.ctl ]]; then
        echo "✓ ClamAV socket is available at /var/run/clamav/clamd.ctl"
    else
        echo "✗ ClamAV socket not found. Check daemon status."
    fi
}

# Display configuration summary
display_summary() {
    echo ""
    echo "=========================================="
    echo "           Installation Summary"
    echo "=========================================="
    echo "ClamAV Installation: Complete"
    echo "Socket Location: /var/run/clamav/clamd.ctl"
    echo "Log File: /var/log/clamav/clamav.log"
    echo "Database Location: /var/lib/clamav"
    echo ""
    echo "Environment Variables to set:"
    echo "VIRUS_SCANNING_ENABLED=true"
    echo ""
    echo "Next Steps:"
    echo "1. Add 'VIRUS_SCANNING_ENABLED=true' to your .env file"
    echo "2. Install Node.js dependencies: npm install"
    echo "3. Restart your StrataTracker application"
    echo ""
    echo "Maintenance:"
    echo "- Virus database updates automatically every 6 hours"
    echo "- Monitor logs: sudo tail -f /var/log/clamav/clamav.log"
    echo "- Manual update: sudo freshclam"
    echo ""
    echo "Troubleshooting:"
    echo "- Check daemon status: sudo systemctl status clamav-daemon"
    echo "- Check freshclam status: sudo systemctl status clamav-freshclam"
    echo "- Test scanning: clamscan /path/to/file"
    echo "=========================================="
}

# Main installation process
main() {
    echo "Starting ClamAV installation and configuration..."
    
    install_clamav
    configure_clamav
    update_database
    start_services
    setup_auto_updates
    test_installation
    display_summary
    
    echo "ClamAV setup completed successfully!"
}

# Run main function
main "$@" 