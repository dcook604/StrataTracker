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