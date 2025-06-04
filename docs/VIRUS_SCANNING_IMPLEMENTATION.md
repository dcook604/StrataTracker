# StrataTracker Virus Scanning Implementation
# Last Updated: January 9, 2025

## 🛡️ Overview

StrataTracker now includes comprehensive virus scanning capabilities for all file uploads, providing multiple layers of security to protect against malware, viruses, and malicious content. This implementation uses ClamAV, an open-source antivirus engine, combined with deep content validation and security checks.

## 🎯 Security Features

### 1. **ClamAV Integration**
- Real-time virus and malware scanning
- Regular virus definition updates
- Support for archive scanning (ZIP, RAR, etc.)
- Detection of trojans, worms, ransomware, and other threats

### 2. **Deep Content Validation**
- Magic number verification (file signature validation)
- MIME type consistency checking
- Protection against polyglot files
- Embedded script detection in images and PDFs
- File structure validation

### 3. **Enhanced File Filtering**
- Multi-layer validation (MIME type + extension + content)
- Path traversal prevention
- File name sanitization
- Size and quantity limits
- Suspicious pattern detection

### 4. **Security Monitoring**
- Comprehensive logging of all security events
- Virus scan result tracking
- Failed upload attempt monitoring
- Performance metrics collection

## 🚀 Installation & Setup

### 1. **Install ClamAV (Automated)**

Run the automated setup script:

```bash
chmod +x scripts/setup-antivirus.sh
./scripts/setup-antivirus.sh
```

The script will:
- Detect your operating system
- Install ClamAV and required components
- Configure the daemon and database updates
- Set up automatic virus definition updates
- Test the installation
- Provide configuration summary

### 2. **Manual ClamAV Installation**

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install clamav clamav-daemon clamav-freshclam
sudo systemctl stop clamav-daemon
sudo freshclam
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

#### CentOS/RHEL/Fedora:
```bash
sudo dnf install clamav clamav-update clamav-scanner-systemd
sudo setsebool -P antivirus_can_scan_system 1
sudo freshclam
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

#### Alpine Linux:
```bash
sudo apk add --no-cache clamav clamav-daemon freshclam
sudo freshclam
sudo rc-service clamd start
sudo rc-update add clamd
```

### 3. **Node.js Dependencies**

Install required packages:

```bash
npm install clamscan@2.4.0 file-type@19.0.0 sharp@0.33.0
```

### 4. **Environment Configuration**

Add to your `.env` file:

```env
VIRUS_SCANNING_ENABLED=true
```

Optional configuration:
```env
CLAMAV_SOCKET_PATH=/var/run/clamav/clamd.ctl
VIRUS_SCAN_TIMEOUT=60000
MAX_SCAN_FILE_SIZE=26214400
```

## ⚙️ Configuration

### ClamAV Configuration Files

#### `/etc/clamav/clamd.conf`
```conf
# Remove or comment out Example line
# Example

# Socket configuration
LocalSocket /var/run/clamav/clamd.ctl
SocketGroup clamav
SocketMode 666

# Logging
LogFile /var/log/clamav/clamav.log
LogFileMaxSize 100M
LogRotate yes
LogTime yes

# Scanning options
ScanArchive yes
MaxFileSize 25M
MaxScanSize 100M
MaxFiles 10000
MaxRecursion 16
MaxDirectoryRecursion 15

# User and permissions
User clamav
LocalSocketGroup users
LocalSocketMode 666
```

#### `/etc/clamav/freshclam.conf`
```conf
# Remove or comment out Example line
# Example

# Database mirror
DatabaseMirror database.clamav.net

# Update frequency (6 times per day)
Checks 4

# Logging
UpdateLogFile /var/log/clamav/freshclam.log
LogRotate yes
```

### Application Configuration

The virus scanner can be configured through environment variables or code:

```typescript
const { upload, virusScanMiddleware, contentValidationMiddleware } = createSecureUpload({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  enableVirusScanning: process.env.VIRUS_SCANNING_ENABLED === 'true',
  enableDeepValidation: true
});
```

## 🔧 API Usage

### 1. **File Upload with Virus Scanning**

```javascript
// Violation upload with full security
app.post("/api/violations", 
  ensureAuthenticated, 
  upload.array("attachments", 5),
  contentValidationMiddleware,
  virusScanMiddleware,
  async (req, res) => {
    // File processing logic
  }
);
```

### 2. **Health Check Endpoint**

```bash
GET /api/health/virus-scanner
```

Response:
```json
{
  "enabled": true,
  "ready": true,
  "version": "ClamAV 1.4.2/25000",
  "status": "operational"
}
```

### 3. **Manual Virus Scanning**

```typescript
import { getVirusScanner } from './services/virusScanner';

const scanner = getVirusScanner();

// Scan a file
const result = await scanner.scanFile('/path/to/file');
console.log(result); // { isClean: true, threats: null, scanDuration: 150 }

// Scan a buffer
const buffer = await fs.readFile('/path/to/file');
const result = await scanner.scanBuffer(buffer, 'filename.pdf');
```

## 📊 Security Validation Layers

### Layer 1: Basic File Filtering
- MIME type validation
- File extension checking
- File name sanitization
- Size and quantity limits

### Layer 2: Content Validation
- Magic number verification
- File structure validation
- MIME type consistency checking
- Embedded content detection

### Layer 3: Virus Scanning
- Real-time malware detection
- Archive content scanning
- Threat identification and logging

### Layer 4: Post-Processing
- File cleanup on errors
- Security event logging
- Performance monitoring

## 🚨 Threat Detection

### Supported Threat Types

1. **Viruses and Malware**
   - Trojans, worms, ransomware
   - Backdoors and rootkits
   - Adware and spyware

2. **Embedded Threats**
   - Scripts in image files
   - JavaScript in PDFs
   - Macro-enabled documents

3. **Polyglot Files**
   - Multi-format files
   - Disguised executables
   - Archive bombs

4. **Content Injection**
   - XSS in file content
   - SQL injection vectors
   - Path traversal attempts

### Response Actions

When threats are detected:

1. **Immediate Actions**
   - File upload rejected
   - Temporary file deleted
   - User notified with generic error
   - Detailed logs generated

2. **Logging and Monitoring**
   - Security event logged
   - Threat details recorded
   - User activity tracked
   - Performance metrics updated

## 📈 Performance Considerations

### Optimization Settings

1. **ClamAV Tuning**
   ```conf
   MaxFileSize 25M          # Limit file size scanning
   MaxScanSize 100M         # Total scan size limit
   MaxFiles 10000           # Max files in archive
   MaxRecursion 16          # Archive depth limit
   ```

2. **Application Tuning**
   ```typescript
   const config = {
     scanTimeout: 60000,     // 60 second timeout
     maxFileSize: 25 * 1024 * 1024,  // 25MB limit
     removeInfected: true    // Auto-delete infected files
   };
   ```

### Performance Metrics

- **Average scan time**: 100-500ms per file
- **Memory usage**: ~50MB for ClamAV daemon
- **CPU impact**: <5% under normal load
- **Database size**: ~200MB virus definitions

## 🔍 Monitoring & Logging

### Log Files

1. **ClamAV Logs**
   ```bash
   sudo tail -f /var/log/clamav/clamav.log
   sudo tail -f /var/log/clamav/freshclam.log
   ```

2. **Application Logs**
   ```bash
   tail -f logs/app.log | grep "VirusScanner\|FileUpload"
   ```

### Key Log Events

```log
[VirusScanner] ClamAV scanner initialized successfully
[FileUpload] User 123 uploaded 2 files: image.jpg, document.pdf
[VirusScanner] File /uploads/abc123.jpg is clean (250ms)
[VirusScanner] Malware detected in /uploads/def456.pdf: Win.Trojan.Generic
[FileUpload] Content validation failed for suspicious.exe: MIME type mismatch
```

### Monitoring Queries

```sql
-- Recent virus detections
SELECT * FROM logs WHERE message LIKE '%Malware detected%' 
ORDER BY timestamp DESC LIMIT 10;

-- Upload failure analysis
SELECT COUNT(*) as failures, DATE(timestamp) as date 
FROM logs WHERE message LIKE '%FileUpload%' AND level = 'ERROR'
GROUP BY DATE(timestamp) ORDER BY date DESC;
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. ClamAV Socket Not Found
```bash
# Check if ClamAV daemon is running
sudo systemctl status clamav-daemon

# Check socket location
sudo find /var/run -name "clamd.*" -type s

# Restart ClamAV
sudo systemctl restart clamav-daemon
```

#### 2. Virus Database Empty
```bash
# Update virus database
sudo freshclam

# Check database status
sudo systemctl status clamav-freshclam

# Manual database update
sudo /usr/bin/freshclam --verbose
```

#### 3. Permission Issues
```bash
# Fix ClamAV permissions
sudo chown -R clamav:clamav /var/lib/clamav
sudo chown -R clamav:clamav /var/log/clamav
sudo chown -R clamav:clamav /var/run/clamav

# Add user to clamav group
sudo usermod -a -G clamav $USER
```

#### 4. Scanner Initialization Failed
```javascript
// Check application logs
tail -f logs/app.log | grep "VirusScanner"

// Test scanner manually
const scanner = getVirusScanner();
await scanner.initialize();
console.log(scanner.isReady());
```

### Debug Commands

```bash
# Test ClamAV installation
echo "X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" > /tmp/eicar.txt
clamscan /tmp/eicar.txt
rm /tmp/eicar.txt

# Check ClamAV version
clamdscan --version
clamd --version

# Test socket connection
echo "PING" | nc -U /var/run/clamav/clamd.ctl

# Monitor real-time scanning
sudo journalctl -u clamav-daemon -f
```

## 🔒 Security Best Practices

### 1. **Regular Updates**
- Virus definitions: Every 6 hours (automated)
- ClamAV engine: Monthly security updates
- Application dependencies: Regular npm audit

### 2. **Access Controls**
- Limit file upload endpoints
- Implement rate limiting
- Use authenticated endpoints only
- Monitor upload patterns

### 3. **File Handling**
- Never execute uploaded files
- Store files outside web root
- Use UUID-based file naming
- Implement file expiration

### 4. **Monitoring**
- Track upload patterns
- Monitor virus detections
- Log security events
- Set up alerting

### 5. **Backup Strategy**
- Regular ClamAV database backups
- Application configuration backups
- Log retention policies
- Incident response procedures

## 📋 Maintenance Tasks

### Daily
- Monitor virus scan logs
- Check system resources
- Verify automatic updates

### Weekly
- Review upload statistics
- Analyze threat patterns
- Update documentation

### Monthly
- Update ClamAV engine
- Review security policies
- Test backup procedures
- Performance optimization

### Quarterly
- Security audit
- Threat assessment
- Policy updates
- Training updates

## 🚀 Future Enhancements

### Planned Features
1. **Advanced Threat Detection**
   - Machine learning-based detection
   - Behavioral analysis
   - Zero-day threat protection

2. **Cloud Integration**
   - Multi-engine scanning
   - Threat intelligence feeds
   - Advanced analytics

3. **Performance Optimization**
   - Asynchronous scanning
   - Caching mechanisms
   - Load balancing

4. **Enhanced Monitoring**
   - Real-time dashboards
   - Automated alerting
   - Threat hunting tools

## 📞 Support

### Getting Help
- Check logs first: `/var/log/clamav/` and `logs/app.log`
- Review this documentation
- Test with EICAR test file
- Verify service status

### Contact Information
- System Administrator: Check server documentation
- Application Support: Review GitHub issues
- ClamAV Support: Official ClamAV documentation

---

**Remember**: Virus scanning is enabled by setting `VIRUS_SCANNING_ENABLED=true` in your environment. Without this flag, the system will operate with basic file validation only.

This implementation provides enterprise-grade security for file uploads while maintaining excellent performance and user experience. 