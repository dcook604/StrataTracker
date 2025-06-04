# StrataTracker Production Deployment Guide

## 🎯 Pre-Production Checklist

### Security Hardening
- [ ] **Strong Authentication**: Multi-factor authentication for admin accounts
- [ ] **SSL/TLS**: Valid SSL certificates configured
- [ ] **Environment Variables**: All secrets moved to environment variables
- [ ] **Rate Limiting**: Production rate limits configured
- [ ] **CORS**: Proper CORS origins configured
- [ ] **Security Headers**: All security headers enabled
- [ ] **File Upload Security**: Virus scanning and content validation enabled
- [ ] **Database Security**: Database user with minimal required permissions

### Performance Optimization
- [ ] **Database Indexes**: All necessary indexes created
- [ ] **Connection Pooling**: Database connection pooling configured
- [ ] **Caching Strategy**: Redis caching implemented
- [ ] **Static Asset Optimization**: Assets minified and compressed
- [ ] **CDN Setup**: Static assets served from CDN
- [ ] **Performance Monitoring**: APM tools configured

### Backup & Recovery
- [ ] **Automated Backups**: Daily database backups configured
- [ ] **Backup Testing**: Restore procedures tested
- [ ] **File Storage Backup**: Upload files backed up
- [ ] **Disaster Recovery Plan**: Recovery procedures documented

### Monitoring & Alerting
- [ ] **Health Checks**: All health endpoints configured
- [ ] **Log Aggregation**: Centralized logging setup
- [ ] **Error Tracking**: Error monitoring service configured
- [ ] **Performance Metrics**: Application metrics collection
- [ ] **Uptime Monitoring**: External uptime monitoring
- [ ] **Alert Configuration**: Critical alerts configured

## 🚀 Deployment Steps

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install SSL certificate (Let's Encrypt example)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

### 2. Environment Configuration

```bash
# Create production environment file
cp .env.production.example .env.production

# Generate strong secrets
openssl rand -hex 32  # For SESSION_SECRET
openssl rand -hex 16  # For database passwords

# Edit configuration
nano .env.production
```

### 3. Database Setup

```bash
# Create database user with minimal permissions
sudo -u postgres createuser -P spectrum4
sudo -u postgres createdb -O spectrum4 spectrum4

# Run migrations
npm run db:push
```

### 4. SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
sudo chown $USER:$USER ssl/*
```

### 5. Production Deployment

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
curl -f http://localhost/api/health/ready
```

## 📊 Monitoring Setup

### Health Check Endpoints

- `/api/health/live` - Liveness probe
- `/api/health/ready` - Readiness probe
- `/api/health/detailed` - Comprehensive health status

### Log Monitoring

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f app

# View all service logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Database Monitoring

```sql
-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;

-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Monitor database size
SELECT pg_size_pretty(pg_database_size('spectrum4'));
```

## 🔄 Backup Procedures

### Automated Database Backup

```bash
#!/bin/bash
# backup.sh - Daily database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="spectrum4"
DB_USER="spectrum4"

# Create backup
pg_dump -h postgres -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### File Storage Backup

```bash
# Backup uploads directory
rsync -av --delete uploads/ /backup/uploads/

# Or use cloud storage
aws s3 sync uploads/ s3://your-backup-bucket/uploads/
```

## 🔧 Performance Tuning

### Database Optimization

```sql
-- Create indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_violations_status ON violations(status);
CREATE INDEX CONCURRENTLY idx_violations_unit_id ON violations(unit_id);
CREATE INDEX CONCURRENTLY idx_violations_created_at ON violations(created_at);
CREATE INDEX CONCURRENTLY idx_property_units_unit_number ON property_units(unit_number);

-- Update table statistics
ANALYZE;
```

### Application Performance

```javascript
// Enable gzip compression
app.use(compression());

// Optimize static file serving
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));

// Enable HTTP/2
const http2 = require('http2');
const server = http2.createSecureServer(options, app);
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database connectivity
   docker-compose exec postgres pg_isready -U spectrum4
   
   # Check connection pool status
   curl http://localhost:3001/api/health/detailed
   ```

2. **High Memory Usage**
   ```bash
   # Monitor memory usage
   docker stats
   
   # Check for memory leaks
   curl http://localhost:3001/api/health/detailed
   ```

3. **SSL Certificate Issues**
   ```bash
   # Verify certificate
   openssl x509 -in ssl/fullchain.pem -text -noout
   
   # Test SSL configuration
   curl -I https://yourdomain.com
   ```

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # Stop application
   docker-compose -f docker-compose.prod.yml stop app
   
   # Restore from backup
   gunzip -c /backups/backup_YYYYMMDD_HHMMSS.sql.gz | \
     docker-compose exec -T postgres psql -U spectrum4 -d spectrum4
   
   # Restart application
   docker-compose -f docker-compose.prod.yml start app
   ```

2. **Application Recovery**
   ```bash
   # Restart all services
   docker-compose -f docker-compose.prod.yml restart
   
   # Check service status
   docker-compose -f docker-compose.prod.yml ps
   ```

## 📈 Scaling Considerations

### Horizontal Scaling

- Load balancer configuration
- Session storage in Redis
- File storage on shared volume or cloud storage
- Database read replicas

### Vertical Scaling

- Increase container resources
- Optimize database configuration
- Tune Node.js heap size

## 🔐 Security Maintenance

### Regular Security Tasks

- [ ] **Weekly**: Review access logs
- [ ] **Monthly**: Update dependencies
- [ ] **Quarterly**: Security audit
- [ ] **Annually**: SSL certificate renewal

### Security Monitoring

```bash
# Monitor failed login attempts
grep "failed login" /var/log/stratatracker/app.log

# Check for suspicious API calls
grep "429\|403\|401" /var/log/nginx/access.log

# Monitor file uploads
grep "virus detected\|malware" /var/log/stratatracker/app.log
```

## 📞 Support & Maintenance

### Log Locations

- Application logs: `/var/log/stratatracker/`
- Nginx logs: `/var/log/nginx/`
- Database logs: Check Docker container logs

### Key Metrics to Monitor

- Response time (< 500ms for API calls)
- Error rate (< 1%)
- Database connection pool usage (< 80%)
- Memory usage (< 80%)
- Disk usage (< 85%)
- SSL certificate expiry

### Emergency Contacts

- Database Administrator: [contact]
- System Administrator: [contact]
- Application Support: [contact]
- Security Team: [contact] 