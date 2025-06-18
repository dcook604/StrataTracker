# StrataTracker Coolify Deployment Guide - Updated

This guide provides step-by-step instructions for deploying StrataTracker to your existing "Violation" project in Coolify.

## 🔧 **Port Configuration (Updated)**

To avoid conflicts with existing services:
- **Application**: Port `3365` (external) → `3000` (internal)
- **PostgreSQL**: Port `5438` (external) → `5432` (internal)

## 🚀 **Quick Deployment Steps**

### Step 1: Prepare Environment

```bash
# Run the deployment preparation script
./deploy-to-coolify.sh

# Optional: Test locally first
./deploy-to-coolify.sh --test-local
```

### Step 2: Coolify Configuration

1. **Login to Coolify Dashboard**
2. **Navigate to "Violation" Project**
3. **Add New Resource** → **Service**

### Step 3: Service Configuration

**Service Settings:**
- **Name**: `stratatracker`
- **Type**: `Docker Compose`
- **Source**: Git Repository
- **Repository URL**: `https://github.com/your-username/StrataTracker.git`
- **Branch**: `main` (or your deployment branch)
- **Docker Compose File**: `docker-compose.coolify.yml`
- **Build Context**: `.` (root directory)

**Network Settings:**
- **Port**: `3365` (this will be your external access port)
- **Health Check Path**: `/api/health`

### Step 4: Environment Variables

Set these environment variables in Coolify:

#### **Core Configuration**
```bash
NODE_ENV=production
APP_URL=https://your-domain.com
PUBLIC_BASE_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
```

#### **Database**
```bash
POSTGRES_DB=spectrum4
POSTGRES_USER=spectrum4
POSTGRES_PASSWORD=your_secure_password_here
```

#### **Security**
```bash
SESSION_SECRET=your_64_character_session_secret_here
TRUST_PROXY=1
SECURE_COOKIES=true
```

#### **Supabase Authentication**
```bash
SUPABASE_URL=https://bmtydjmymvvsqudonfiz.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### **Email Configuration**
```bash
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=spectrum4.ca
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@spectrum4.ca
```

#### **Performance & Features**
```bash
EMAIL_DEDUP_TTL_HOURS=24
EMAIL_CLEANUP_ENABLED=true
EMAIL_RATE_LIMIT_MS=100
VIRUS_SCANNING_ENABLED=false
LOG_LEVEL=INFO
LOG_FILES_ENABLED=true
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Step 5: Domain Configuration

1. **Add Domain** in Coolify (if not already configured)
2. **Enable SSL** (Let's Encrypt)
3. **Set up Reverse Proxy** to point to port `3365`

### Step 6: Deploy

1. **Save Configuration**
2. **Deploy** the service
3. **Monitor Logs** during deployment

## 📊 **Health Checks & Monitoring**

### Health Check Endpoints:
- **Application**: `https://your-domain.com/api/health`
- **Database**: Internal health check via Docker Compose

### Log Monitoring:
```bash
# View application logs in Coolify
# Or check via terminal:
docker logs <container_name>
```

## 🔍 **Post-Deployment Verification**

### 1. Test Basic Functionality
```bash
# Health check
curl https://your-domain.com/api/health

# Admin announcements (should return JSON)
curl https://your-domain.com/api/admin-announcements
```

### 2. Test Authentication
- Login with Supabase credentials
- Verify JWT token attachment to API requests
- Test logout functionality

### 3. Test Email System
- Send a test email notification
- Verify email deduplication is working
- Check SMTP logs

### 4. Test Database
- Create a test violation
- Verify data persistence
- Check database migrations

## 🛠️ **Troubleshooting**

### Common Issues:

#### **Port Conflicts**
If ports `3365` or `5438` are already in use:
1. Update `docker-compose.coolify.yml`
2. Choose different ports (e.g., `3366`, `5439`)
3. Update Coolify service configuration

#### **Authentication Issues**
```bash
# Check Supabase configuration
curl -H "Authorization: Bearer <token>" https://your-domain.com/api/user
```

#### **Database Connection**
```bash
# Check database logs
docker logs <postgres_container>

# Verify connection string
echo $DATABASE_URL
```

#### **Email Not Working**
```bash
# Test SMTP connection
telnet mail.smtp2go.com 2525

# Check email logs
curl https://your-domain.com/api/communications/email-stats
```

### **Emergency Access**
If the application is inaccessible:
1. Check Coolify logs
2. Verify DNS/domain configuration
3. Check firewall settings
4. Restart services if needed

## 🔒 **Security Checklist**

- [ ] **HTTPS enabled** with valid SSL certificate
- [ ] **Strong passwords** for database and session secret
- [ ] **Supabase RLS policies** configured
- [ ] **CORS properly configured** for your domain
- [ ] **Environment variables** not exposed in logs
- [ ] **Regular backups** configured

## 📝 **Maintenance**

### Regular Tasks:
1. **Monitor logs** for errors
2. **Update dependencies** regularly
3. **Backup database** weekly
4. **Monitor disk space** for uploads and logs
5. **Check email deduplication** cleanup

### Updates:
1. **Push code changes** to repository
2. **Coolify auto-deploys** on git push
3. **Monitor deployment** logs
4. **Test functionality** after updates

## 🆘 **Support**

If you encounter issues:
1. Check application logs in Coolify
2. Verify environment variables
3. Test database connectivity
4. Check domain/SSL configuration
5. Review this guide for missed steps

## 📞 **Contact**

For additional support:
- Check the main `README.md`
- Review `DEVELOPMENT_QUICKSTART.md`
- Create an issue in the repository

---

**Ready to deploy!** 🚀

Your StrataTracker application should now be successfully running on Coolify with proper port isolation and full functionality. 