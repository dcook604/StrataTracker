# StrataTracker Deployment Safety Guide

## Overview

This guide ensures that StrataTracker deployments via Coolify are safe and don't require manual database migrations or risk data loss.

## Current Status ✅

As of **January 15, 2025**, StrataTracker is fully configured for safe redeployments:

- ✅ **Database Schema Consolidated**: All migrations are consolidated into base schema
- ✅ **Data Persistence**: Docker volumes ensure data survives redeployments  
- ✅ **CORS Fixed**: Production CORS configuration prevents API communication issues
- ✅ **Email Deduplication**: Complete system with proper schema in base initialization
- ✅ **Fresh Deployment Ready**: New deployments get complete, working schema

## Data Persistence Architecture

### Docker Volumes (Persist Between Deployments)
```yaml
volumes:
  postgres_data:       # Database files persist here
  uploads_data:        # File uploads persist here
  app_logs:           # Application logs persist here
```

### What Persists Automatically
- **All database tables and data** (violations, users, units, email logs, etc.)
- **File uploads** (PDFs, documents, etc.)
- **Application logs**
- **User sessions** (temporary, expire normally)
- **Email deduplication records**

### What Gets Recreated (Safe)
- **Application code** (updated from latest repository)
- **Docker containers** (rebuilt with new code)
- **Runtime configurations** (from environment variables)

## Database Schema Safety

### Consolidated Schema System
```
db/init/00-consolidated-schema.sql  # Complete database structure
db/init/01-initial-data.sql         # Default admin user & settings
```

The **consolidated schema** includes ALL features from production:
- ✅ Email deduplication tables with all required columns
- ✅ UUID support for violations  
- ✅ Persons and roles system
- ✅ Communication campaigns
- ✅ Bylaw management
- ✅ Public user sessions
- ✅ Admin announcements
- ✅ Audit logging
- ✅ All indexes for performance

### Schema Detection Logic
```sql
-- Only runs on FRESH databases (no existing tables)
IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Create complete schema
END IF;
```

This ensures:
- **Existing databases**: Unchanged, use current data
- **Fresh databases**: Get complete, working schema automatically

## Deployment Types & Safety

### 1. Standard Redeployment (SAFE)
**Scenario**: Updating application code, environment variables, or Docker configuration

**What Happens**:
- ✅ Database data preserved via `postgres_data` volume
- ✅ Application updated with new code
- ✅ No schema changes needed
- ✅ All existing functionality preserved

**Safety Level**: **100% SAFE** - No data loss risk

### 2. Fresh Deployment (SAFE)
**Scenario**: New Coolify project, clean environment, new database

**What Happens**:
- ✅ Complete schema created automatically from consolidated script
- ✅ Default admin user created (`admin@spectrum4.ca` / `admin123`)
- ✅ Essential system settings configured
- ✅ Default violation categories created
- ✅ Ready to use immediately

**Safety Level**: **100% SAFE** - Complete working system

### 3. Volume Recreation (REQUIRES BACKUP)
**Scenario**: Docker volumes deleted or corrupted

**What Happens**:
- ⚠️ All database data lost
- ✅ Fresh schema will be created
- ❌ All violations, users, and settings lost

**Safety Level**: **DATA LOSS RISK** - Backup required

## Pre-Deployment Checklist

### Before Any Deployment
- [ ] Verify volumes are configured in `docker-compose.coolify.yml`
- [ ] Confirm `postgres_data` volume exists and is healthy
- [ ] Check application is responding at `https://violation.spectrum4.ca`
- [ ] Verify admin announcements load properly (tests backend connectivity)

### Critical Environment Variables
```env
# Database (must match existing if preserving data)
DATABASE_URL=postgres://spectrum4:spectrum4password@postgres:5432/spectrum4
POSTGRES_USER=spectrum4
POSTGRES_PASSWORD=[secure-password]
POSTGRES_DB=spectrum4

# Application
APP_URL=https://violation.spectrum4.ca
CORS_ORIGIN=https://violation.spectrum4.ca

# Email
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=spectrum4.ca
SMTP_PASS=[smtp-password]
```

## Troubleshooting Common Issues

### Issue: "Error Loading Announcements"
**Cause**: Backend container running stale code or CORS misconfiguration
**Solution**: 
1. Verify backend is running: `curl https://violation.spectrum4.ca/api/health`
2. Check admin announcements: `curl https://violation.spectrum4.ca/api/admin-announcements`
3. Redeploy if needed - data will persist

### Issue: Email Deduplication Errors
**Cause**: Missing columns in email tables
**Solution**: 
- Should not occur with consolidated schema
- If happens on existing deployment, verify database volumes are mounted
- Check schema with: `docker exec postgres-container psql -U spectrum4 -c "\d email_idempotency_keys"`

### Issue: Violations Not Loading
**Cause**: Database connection or permission issues
**Solution**:
1. Check database connection: `docker exec postgres-container pg_isready`
2. Verify app can connect: `docker logs [app-container]`
3. Check database health in Coolify dashboard

## Manual Backup & Recovery

### Database Backup (Recommended Before Major Changes)
```bash
# Create backup
docker exec postgres-container pg_dump -U spectrum4 -d spectrum4 > stratatracker-backup-$(date +%Y%m%d).sql

# Restore backup (if needed)
docker exec -i postgres-container psql -U spectrum4 -d spectrum4 < stratatracker-backup-YYYYMMDD.sql
```

### File Backup
```bash
# Backup uploads
docker cp [app-container]:/app/uploads ./uploads-backup-$(date +%Y%m%d)

# Restore uploads
docker cp ./uploads-backup-YYYYMMDD [app-container]:/app/uploads
```

## Monitoring Deployment Health

### Post-Deployment Verification
```bash
# 1. Application responds
curl -f https://violation.spectrum4.ca

# 2. API responds  
curl -f https://violation.spectrum4.ca/api/health

# 3. Admin announcements load (backend test)
curl -f https://violation.spectrum4.ca/api/admin-announcements

# 4. Database accessible
curl -f https://violation.spectrum4.ca/api/violations?limit=1
```

### Expected Response Times
- **Frontend**: < 2 seconds
- **API calls**: < 500ms
- **Database queries**: < 100ms
- **Email sending**: < 5 seconds

## Emergency Procedures

### If Data Appears Lost
1. **DON'T PANIC** - Check volumes are mounted correctly
2. **Verify containers**: `docker ps` - ensure postgres container running
3. **Check volume mounts**: `docker inspect [postgres-container]`
4. **Verify data**: `docker exec postgres-container psql -U spectrum4 -c "SELECT COUNT(*) FROM violations;"`

### If Fresh Schema Needed (Nuclear Option)
⚠️ **WARNING**: This destroys all data
```bash
# Stop application
docker-compose down

# Remove volumes (DESTROYS ALL DATA)
docker volume rm stratatracker_postgres_data

# Restart - will create fresh schema
docker-compose up -d
```

## Contact & Support

For deployment issues:
- **Check logs**: Coolify dashboard → Application → Logs
- **Database logs**: Coolify dashboard → Database → Logs  
- **Application logs**: `docker logs [app-container]`

---

**Last Updated**: January 15, 2025  
**Schema Version**: Consolidated (includes all fixes through migration 0015)  
**Deployment Status**: Production Ready 