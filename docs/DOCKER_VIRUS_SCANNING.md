# Docker Virus Scanning Implementation

## Overview
This document describes the integration of ClamAV virus scanning into the StrataTracker Docker container for Dokploy deployment.

## Architecture

### Container Structure
- **Base Image**: Node.js 18 Alpine
- **Additional Services**: ClamAV daemon, FreshClam updater
- **Process Manager**: Supervisor (manages multiple services)
- **Storage**: Persistent volumes for virus definitions and quarantine

### Services in Container
1. **Node.js Application** - Main StrataTracker backend
2. **ClamAV Daemon** - Virus scanning engine (port 3310)
3. **FreshClam** - Virus definition updater
4. **Initialization Script** - Sets up ClamAV on container start

## Configuration Files

### `/docker/clamav/clamd.conf`
- ClamAV daemon configuration
- Listens on TCP port 3310
- Logs to `/var/log/clamav/clamd.log`
- Virus action script integration

### `/docker/clamav/freshclam.conf`
- Virus definition update configuration
- Updates every 24 hours
- Multiple mirror support for reliability

### `/docker/supervisor/supervisord.conf`
- Process management configuration
- Service startup order and dependencies
- Logging configuration for all services

### `/docker/scripts/init-clamav.sh`
- Container initialization script
- Downloads initial virus definitions
- Creates necessary directories and permissions
- Network connectivity verification

## Docker Compose Configuration

### Volumes
- `clamav_data`: Persistent virus definitions storage
- `quarantine_data`: Isolated storage for infected files
- `supervisor_logs`: Process management logs
- `clamav_logs`: ClamAV-specific logs

### Environment Variables
```yaml
VIRUS_SCANNING_ENABLED: "true"
CLAMAV_HOST: "127.0.0.1"
CLAMAV_PORT: "3310"
```

## Health Checks

### Container Health Check
- Verifies Node.js application response
- Confirms ClamAV daemon is running
- Tests ClamAV network connectivity
- Checks virus definition presence

### Monitoring Commands
```bash
# Check service status
docker exec <container> supervisorctl status

# View ClamAV logs
docker exec <container> tail -f /var/log/clamav/clamd.log

# Test virus scanning
docker exec <container> clamdscan /path/to/file
```

## Security Features

### Virus Detection
- Real-time scanning of uploaded files
- Automatic quarantine of infected files
- Virus detection logging with timestamps
- File isolation in `/app/quarantine/`

### File Processing Flow
1. File uploaded to application
2. ClamAV scans file before processing
3. Clean files proceed normally
4. Infected files quarantined and logged
5. User receives appropriate error message

## Deployment with Dokploy

### Pre-deployment Checklist
- [ ] Docker and Docker Compose V2 installed
- [ ] Internet connectivity for virus definitions
- [ ] Sufficient disk space for definitions (~200MB)
- [ ] Port 3310 available within container

### Deployment Steps
1. Build Docker image: `docker build -t stratatracker .`
2. Deploy with docker-compose: `docker-compose up -d`
3. Verify services: `docker-compose ps`
4. Check health: `docker-compose exec backend /usr/local/bin/health-check.sh`

### Initial Setup
- Virus definitions download automatically on first start
- ClamAV daemon starts after definitions are ready
- Node.js application starts after ClamAV is operational

## Maintenance

### Virus Definition Updates
- Automatic updates every 24 hours via FreshClam
- Manual update: `docker exec <container> freshclam`
- Update logs: `/var/log/clamav/freshclam.log`

### Log Rotation
- Supervisor manages log rotation
- ClamAV logs stored in persistent volume
- Application logs accessible via Docker logs

### Performance Considerations
- ClamAV uses ~100-200MB RAM
- Virus definitions require ~200MB disk space
- Scanning adds minimal latency to file uploads
- Thread pool configured for optimal performance

## Troubleshooting

### Common Issues

#### ClamAV Won't Start
- Check virus definitions: `ls -la /var/lib/clamav/`
- Verify network connectivity for updates
- Review initialization logs: `/var/log/supervisor/init-clamav.log`

#### File Scanning Errors
- Confirm ClamAV daemon status: `pgrep clamd`
- Test connectivity: `echo "PING" | nc 127.0.0.1 3310`
- Check ClamAV logs for error messages

#### Performance Issues
- Monitor memory usage: `docker stats`
- Adjust MaxThreads in clamd.conf if needed
- Consider virus definition optimization

### Debug Commands
```bash
# Container shell access
docker exec -it <container> /bin/sh

# Service status
supervisorctl status

# ClamAV configuration test
clamd --config-check

# Manual virus scan
clamdscan /app/uploads/

# View quarantined files
ls -la /app/quarantine/
```

## Integration with Application

### Environment Variables
Application automatically detects virus scanning capability:
- `VIRUS_SCANNING_ENABLED=true` enables scanning
- `CLAMAV_HOST` and `CLAMAV_PORT` configure connection

### API Integration
- File upload middleware includes virus scanning
- Infected files rejected with appropriate error codes
- Clean files processed normally
- Scanning status included in upload responses

## Backup and Recovery

### Data Persistence
- Virus definitions: `/var/lib/clamav/` (clamav_data volume)
- Quarantine files: `/app/quarantine/` (quarantine_data volume)
- Logs: `/var/log/clamav/` (clamav_logs volume)

### Backup Strategy
```bash
# Backup virus definitions
docker run --rm -v clamav_data:/source -v $(pwd):/backup alpine tar czf /backup/clamav_backup.tar.gz -C /source .

# Restore virus definitions
docker run --rm -v clamav_data:/target -v $(pwd):/backup alpine tar xzf /backup/clamav_backup.tar.gz -C /target
```

## Security Considerations

### Container Security
- ClamAV runs as non-root user
- File permissions properly configured
- Network access limited to required services
- Quarantine directory isolated from application

### Virus Handling
- Infected files never reach application logic
- Quarantine provides forensic capabilities
- Virus detection logged for security audit
- Automatic cleanup prevents disk space issues

## Monitoring and Alerting

### Health Monitoring
- Docker health checks every 30 seconds
- Application includes virus scanning status in health endpoint
- Supervisor monitors individual service health

### Metrics to Monitor
- ClamAV daemon uptime
- Virus definition freshness
- Quarantine directory size
- Scanning performance metrics

### Alert Conditions
- ClamAV daemon failure
- Virus definition update failures
- Quarantine directory growth
- High scanning latency 