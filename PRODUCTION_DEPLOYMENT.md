# 🚀 StrataTracker Production Deployment Guide

## Overview
This guide covers deploying StrataTracker to production using Dokploy on your VPS server. Follow these steps to ensure a secure, scalable deployment.

## Prerequisites

### Server Requirements
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB (50GB recommended)
- **CPU**: 2+ cores recommended
- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+

### Network Requirements
- Domain name pointed to your server
- SSL certificate (Let's Encrypt recommended)
- Ports 80, 443, and your chosen app port (default: 3000) accessible

## 🔧 Environment Configuration

### 1. Create Production Environment File

Copy the example environment file and configure for production:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit your `.env` file with production values:

```env
# ===================
# Database Configuration
# ===================
DATABASE_URL=postgres://spectrum4:YOUR_SECURE_DB_PASSWORD@db:5432/spectrum4

# ===================
# Server Configuration  
# ===================
NODE_ENV=production
PORT=3000
SESSION_SECRET=YOUR_SECURE_SESSION_SECRET_MIN_32_CHARS

# ===================
# Application URLs
# ===================
APP_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
PUBLIC_BASE_URL=https://your-domain.com

# ===================
# Email Configuration (SMTP2GO)
# ===================
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=your-email@domain.com
SMTP_PASS=your-smtp-password
EMAIL_FROM=your-email@domain.com

# ===================
# Security & Performance
# ===================
POSTGRES_DB=spectrum4
POSTGRES_USER=spectrum4
POSTGRES_PASSWORD=YOUR_SECURE_DB_PASSWORD
SESSION_SECRET=YOUR_SECURE_SESSION_SECRET
TRUST_PROXY=1
SECURE_COOKIES=true
LOG_LEVEL=WARN
```

### 3. Generate Secure Secrets

Generate strong passwords and secrets:

```bash
# Generate session secret (32+ characters)
openssl rand -base64 32

# Generate database password
openssl rand -base64 24
```

## 🛠️ Deployment Steps

### 1. Pre-deployment Preparation

```bash
# Clone the repository
git clone https://github.com/your-repo/stratatracker.git
cd stratatracker

# Set environment variables
cp .env.example .env
# Edit .env with your production values

# Create necessary directories
mkdir -p nginx/ssl
mkdir -p backups
```

### 2. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt update
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl/
```

#### Option B: Custom Certificate
```bash
# Copy your certificate files to nginx/ssl/
cp your-certificate.pem nginx/ssl/cert.pem
cp your-private-key.pem nginx/ssl/key.pem
```

### 3. Database Migration

Run the migration script to set up the database:

```bash
# Make migration script executable
chmod +x scripts/migrate-production.sh

# Set database environment variables
export POSTGRES_PASSWORD=YOUR_SECURE_DB_PASSWORD

# Run migration (after Docker services are up)
./scripts/migrate-production.sh
```

### 4. Build and Deploy

```bash
# Build the application
docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check service health
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs app
```

### 5. Verify Deployment

```bash
# Test health endpoints
curl -f http://localhost:3000/api/health
curl -f https://your-domain.com/api/health

# Check ClamAV status
docker-compose -f docker-compose.production.yml exec app clamdscan --version

# Test database connection
docker-compose -f docker-compose.production.yml exec db psql -U spectrum4 -d spectrum4 -c "SELECT NOW();"
```

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW (Ubuntu Firewall)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. Docker Security

```bash
# Set secure permissions on configuration files
chmod 600 .env
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem

# Restrict Docker socket access
sudo usermod -aG docker $USER
```

### 3. Database Security

```bash
# Access database container
docker-compose -f docker-compose.production.yml exec db psql -U spectrum4 -d spectrum4

-- Change default passwords
ALTER USER spectrum4 WITH PASSWORD 'YOUR_NEW_SECURE_PASSWORD';

-- Create read-only user for monitoring
CREATE USER monitor WITH PASSWORD 'MONITOR_PASSWORD';
GRANT CONNECT ON DATABASE spectrum4 TO monitor;
GRANT USAGE ON SCHEMA public TO monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor;
```

## 📊 Monitoring & Maintenance

### 1. Health Monitoring

```bash
# Monitor application health
curl -f https://your-domain.com/api/health

# Monitor container health
docker-compose -f docker-compose.production.yml ps
```

### 2. Log Management

```bash
# View application logs
docker-compose -f docker-compose.production.yml logs -f app

# View database logs
docker-compose -f docker-compose.production.yml logs -f db

# View nginx logs
docker-compose -f docker-compose.production.yml logs -f nginx
```

### 3. Backup Strategy

```bash
# Manual backup
./scripts/migrate-production.sh --backup-only

# Automated backup (add to crontab)
0 2 * * * cd /path/to/stratatracker && ./scripts/migrate-production.sh --backup-only
```

### 4. Updates and Maintenance

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Run migrations
./scripts/migrate-production.sh

# Clean up old images
docker system prune -f
```

## 🆘 Troubleshooting

### Common Issues

#### Health Check Failures
```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# Check logs for errors
docker-compose -f docker-compose.production.yml logs app

# Restart specific service
docker-compose -f docker-compose.production.yml restart app
```

#### Database Connection Issues
```bash
# Check database logs
docker-compose -f docker-compose.production.yml logs db

# Test connection manually
docker-compose -f docker-compose.production.yml exec db psql -U spectrum4 -d spectrum4 -c "SELECT 1;"
```

#### Email Delivery Issues
```bash
# Check email configuration
docker-compose -f docker-compose.production.yml exec app node -e "console.log(process.env.SMTP_HOST)"

# Test email sending
docker-compose -f docker-compose.production.yml exec app npm run test:email
```

### Performance Optimization

#### Resource Monitoring
```bash
# Monitor resource usage
docker stats

# Monitor disk usage
df -h
du -sh /var/lib/docker/
```

#### Database Optimization
```sql
-- Connect to database
docker-compose -f docker-compose.production.yml exec db psql -U spectrum4 -d spectrum4

-- Monitor query performance
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Optimize tables
VACUUM ANALYZE;
```

## 📋 Production Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database credentials secured
- [ ] Firewall configured
- [ ] DNS records configured
- [ ] Backup strategy implemented

### Post-deployment
- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] Email delivery working
- [ ] Database migrations applied
- [ ] Monitoring alerts configured
- [ ] Log rotation configured
- [ ] Automated backups running

### Ongoing Maintenance
- [ ] Monitor application logs weekly
- [ ] Update dependencies monthly
- [ ] Renew SSL certificates (if not automated)
- [ ] Review security logs monthly
- [ ] Test backup restoration quarterly
- [ ] Performance optimization review quarterly

## 🔗 Additional Resources

- [Dokploy Documentation](https://dokploy.com/docs)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Nginx Security](https://nginx.org/en/docs/http/securing_your_site.html)

## 📞 Support

For deployment issues:
1. Check this documentation
2. Review application logs
3. Check the project's troubleshooting guides
4. Contact system administrators 

## 🚀 Automatic Migration System

StrataTracker now includes an **automatic, safe migration system** that ensures all required database tables exist on every deployment:

### ✅ What Gets Created Automatically
- `profiles` table (Supabase authentication)
- `admin_announcements` table 
- Email deduplication tables (`email_idempotency_keys`, `email_send_attempts`, `email_deduplication_log`)
- Required indexes for performance
- Any other critical tables defined in the schema

### 🛡️ Safety Features
- **`CREATE TABLE IF NOT EXISTS`** - Never overwrites existing data
- **Idempotent operations** - Safe to run multiple times
- **Detailed logging** - Track what gets created during deployment
- **Health checks** - Verify migrations completed successfully

## 📋 Deployment Verification

### Automatic Health Checks
The application includes comprehensive health checks that verify:

1. **Application Health**: `/api/health` endpoint responds
2. **Database Connection**: Successful connection to PostgreSQL  
3. **Migration Status**: All critical tables exist
4. **API Endpoints**: Critical endpoints return proper responses

### Verification Script
Use the deployment verification script for manual checks:

```bash
# Basic verification
bash scripts/deploy-hook.sh

# Custom configuration
APP_URL="https://violation.spectrum4.ca" \
MAX_RETRIES=20 \
RETRY_INTERVAL=15 \
bash scripts/deploy-hook.sh
```

## 🔧 Coolify Deployment Configuration

### Required Environment Variables
```env
# Database (with SSL disabled for compatibility)
DATABASE_URL=postgres://username:password@postgres:5432/database?sslmode=disable

# Supabase Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Configuration
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=spectrum4.ca
SMTP_PASS=your-smtp-password

# Application
APP_URL=https://violation.spectrum4.ca
NODE_ENV=production
```

### Docker Compose Health Checks
The `docker-compose.coolify.yml` includes:

```yaml
healthcheck:
  test: ["CMD", "sh", "-c", "curl -f http://localhost:3001/api/health && curl -s http://localhost:3001/api/database-status || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

## 🚨 Troubleshooting Deployments

### Check Migration Status
```bash
# View application logs
docker logs container_name

# Check database status (requires admin auth)
curl -s https://violation.spectrum4.ca/api/database-status

# Verify health
curl -s https://violation.spectrum4.ca/api/health
```

### Common Issues & Solutions

#### 1. Database Connection Fails
**Symptoms**: `ECONNREFUSED` or `password authentication failed`
**Solution**: 
- Verify `DATABASE_URL` includes `?sslmode=disable`
- Check PostgreSQL container is running
- Verify credentials match between containers

#### 2. Missing Tables After Deployment
**Symptoms**: `relation "table_name" does not exist`
**Solution**: 
- Check application startup logs for migration errors
- Tables are created automatically - verify container has proper permissions
- Review PostgreSQL logs for connection/permission issues

#### 3. Admin Announcements Not Loading
**Symptoms**: Frontend shows "Error Loading Announcements"
**Solution**:
- Verify `/api/admin-announcements` returns JSON (not HTML)
- Check if `admin_announcements` table exists
- Review route registration order in `server/routes.ts`

#### 4. Authentication Issues
**Symptoms**: `profiles` table errors or auth failures
**Solution**:
- Verify Supabase environment variables are set
- Check `profiles` table was created with correct schema
- Ensure UUID format is consistent

## 📊 Database Status Monitoring

### Manual Database Inspection
```bash
# Connect to PostgreSQL container
docker exec -it postgres_container psql -U username -d database

# List all tables
\dt

# Check specific tables
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM admin_announcements;
SELECT COUNT(*) FROM email_idempotency_keys;
```

### Application-Level Monitoring
```bash
# Get database status (requires admin authentication)
curl -H "Authorization: Bearer your-token" \
  https://violation.spectrum4.ca/api/database-status

# Response format:
{
  "success": true,
  "database": {
    "tablesCount": 25,
    "criticalTablesPresent": true,
    "lastMigrationCheck": "2024-06-25T10:30:00.000Z"
  },
  "timestamp": "2024-06-25T10:30:00.000Z"
}
```

## ✅ Pre-Deployment Checklist

- [ ] All environment variables configured in Coolify
- [ ] Database container running and accessible
- [ ] `DATABASE_URL` includes `?sslmode=disable`
- [ ] Supabase credentials valid and accessible
- [ ] SMTP credentials configured for email notifications
- [ ] Domain DNS pointing to Coolify/Cloudflare
- [ ] SSL certificates configured
- [ ] Latest code committed to deployment branch

## 🔄 Post-Deployment Verification

1. **Health Check**: `curl https://violation.spectrum4.ca/api/health`
2. **Database Status**: Verify tables exist via logs or admin endpoint
3. **Frontend Loading**: Check admin announcements widget loads
4. **Email System**: Test violation notifications
5. **Authentication**: Verify Supabase login works
6. **Dispute Workflow**: Test complete violation workflow

## 📝 Migration System Technical Details

### MigrationRunner Class
Located in `server/migration-runner.ts`, this class:

- Checks existing database schema
- Creates missing tables using `CREATE TABLE IF NOT EXISTS`
- Adds required indexes for performance
- Verifies critical tables exist after creation
- Provides status reporting for health checks

### Startup Integration
The migration system runs automatically in `server/db.ts`:

```typescript
// Run migrations on startup
await migrationRunner.runStartupMigrations();
```

This ensures every deployment has complete database schema without manual intervention.

## 🎯 Best Practices

1. **Always verify deployments** using the verification script
2. **Monitor logs** during first few minutes after deployment
3. **Test critical workflows** after each deployment
4. **Keep backups** before major schema changes
5. **Use staging environment** for testing complex migrations 