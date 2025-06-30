# StrataTracker Coolify Deployment Guide
**Complete Production Deployment for Coolify**  
**Updated:** June 30, 2025

## 🚀 **Out-of-the-Box Deployment**

This guide ensures StrataTracker works **immediately** on any new Coolify deployment with **zero manual database setup required**.

## 📋 **Prerequisites**

- Coolify instance running (latest version)
- GitHub repository access to StrataTracker
- Supabase project (for authentication)
- SMTP email service (SMTP2GO recommended)

## 🎯 **Quick Deployment Steps**

### 1. **Create New Resource in Coolify**

1. **Go to your Coolify dashboard**
2. **Click "New Resource"** → **"Public Repository"**
3. **Repository URL:** `https://github.com/[YOUR_USERNAME]/StrataTracker`
4. **Branch:** `main`
5. **Build Pack:** `nixpacks`

### 2. **Configure Environment Variables**

Set these environment variables in Coolify:

#### **Core Configuration**
```env
NODE_ENV=production
PORT=3001
APP_URL=https://your-domain.spectrum4.ca
CORS_ORIGIN=https://your-domain.spectrum4.ca
PUBLIC_BASE_URL=https://your-domain.spectrum4.ca
```

#### **Database (Auto-provisioned by Coolify)**
```env
DATABASE_URL=postgres://spectrum4:spectrum4password@postgres:5432/spectrum4
POSTGRES_DB=spectrum4
POSTGRES_USER=spectrum4
POSTGRES_PASSWORD=generate_secure_password_here
```

#### **Supabase Authentication**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

#### **Security**
```env
SESSION_SECRET=generate_secure_random_string_here
JWT_SECRET=generate_secure_random_string_here
TRUST_PROXY=1
SECURE_COOKIES=true
```

#### **Email Configuration**
```env
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=spectrum4.ca
SMTP_PASS=your_smtp_password_here
EMAIL_FROM=noreply@spectrum4.ca
EMAIL_DEDUP_TTL_HOURS=24
EMAIL_CLEANUP_ENABLED=true
EMAIL_RATE_LIMIT_MS=100
```

#### **Optional Features**
```env
VIRUS_SCANNING_ENABLED=false
LOG_LEVEL=INFO
LOG_FILES_ENABLED=true
DB_POOL_MIN=2
DB_POOL_MAX=10
SESSION_TIMEOUT_MINUTES=30
```

### 3. **Add PostgreSQL Database**

1. **In Coolify, go to your resource**
2. **Click "Add Database"** → **"PostgreSQL"**
3. **Use the same credentials** as in DATABASE_URL above
4. **Database will be auto-provisioned** and linked

### 4. **Configure Docker Compose** (Optional)

If you prefer Docker Compose deployment, use the provided `docker-compose.coolify.yml`:

```yaml
# Copy the existing docker-compose.coolify.yml file
# It's already optimized for Coolify deployment
```

### 5. **Deploy Application**

1. **Click "Deploy"** in Coolify
2. **Wait for build to complete** (2-5 minutes)
3. **Application will auto-start** with:
   - ✅ Complete database schema creation
   - ✅ All tables and relationships
   - ✅ Proper indexes and constraints
   - ✅ Email deduplication system
   - ✅ Auto-migration system

## ✅ **Automatic Features**

### **Database Auto-Migration**
The application includes a **comprehensive migration system** that:
- ✅ **Creates all 31+ required tables** automatically
- ✅ **Sets up proper foreign keys** and relationships
- ✅ **Adds performance indexes** for optimal speed
- ✅ **Handles UUID support** for violations
- ✅ **Configures email deduplication** system
- ✅ **Validates schema integrity** on every startup

### **Health Checks**
The application includes built-in health monitoring:
- **Endpoint:** `https://your-domain/api/health`
- **Database verification:** Table count and integrity
- **Supabase connection:** Auth service validation
- **Email system:** Deduplication service status

### **Security Features**
- ✅ **Supabase Auth integration** (OAuth, email, etc.)
- ✅ **Session-based authentication** with secure cookies  
- ✅ **CORS protection** configured for your domain
- ✅ **Rate limiting** on API endpoints
- ✅ **Input validation** with Zod schemas
- ✅ **SQL injection protection** via Drizzle ORM

## 🔧 **Post-Deployment Setup**

### 1. **Create Admin User**
1. **Sign up** through the application UI
2. **Check application logs** for the user ID
3. **Update user role** via database (temporary manual step):
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';
   ```

### 2. **Configure Supabase RLS** (Optional)
If using Supabase RLS policies, ensure they allow your application's service role.

### 3. **Test Core Functionality**
1. ✅ **Login/logout** works
2. ✅ **Dashboard** displays correctly
3. ✅ **Create property unit** functionality
4. ✅ **Email notifications** sending
5. ✅ **Violation management** workflow

## 📊 **Production Monitoring**

### **Health Check Commands**
```bash
# Application health
curl https://your-domain/api/health

# Database status  
curl https://your-domain/api/health | jq '.database'

# Email system status
curl https://your-domain/api/communications/email-stats?hours=24
```

### **Log Monitoring**
```bash
# Coolify logs (via dashboard)
# Or container logs:
docker logs your-app-container --tail 50
```

### **Database Verification**
```bash
# Connect to database
docker exec -it your-postgres-container psql -U spectrum4 -d spectrum4

# Check table count
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

# Should return 31+ tables
```

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

#### **"Column does not exist" errors**
- **Solution:** Restart the application container
- **Root cause:** Migration didn't complete properly
- **Prevention:** Check logs during first deployment

#### **Supabase auth not working** 
- **Solution:** Verify SUPABASE_* environment variables
- **Check:** Supabase project URL and keys are correct
- **Test:** Visit `/api/health` endpoint

#### **Email notifications failing**
- **Solution:** Verify SMTP_* environment variables  
- **Check:** SMTP2GO credentials and configuration
- **Test:** Check `/api/communications/email-stats` endpoint

#### **Dashboard showing all zeros**
- **Expected behavior** for new deployment (no data yet)
- **Solution:** Create test property unit and violation
- **Verify:** Database has been populated with data

### **Emergency Recovery**
If deployment fails completely:

1. **Check Coolify build logs** for errors
2. **Verify all environment variables** are set
3. **Ensure database is running** and accessible
4. **Restart application container**
5. **Check application logs** for specific errors

## 🎉 **Success Verification**

Your deployment is successful when:

- ✅ **Health endpoint** returns `{"status": "ok"}`
- ✅ **Login page** loads without errors
- ✅ **Dashboard** displays with "0" statistics (expected for new deployment)
- ✅ **Navigation** works (sidebar, all pages accessible)
- ✅ **Database** contains 31+ tables
- ✅ **Email system** initialized and ready

## 📞 **Support**

If you encounter issues:

1. **Check this deployment guide** first
2. **Review application logs** in Coolify dashboard
3. **Verify environment variables** are correctly set
4. **Test database connectivity** via health endpoint
5. **Submit GitHub issue** with logs and error details

---

**Status:** ✅ **Production-Ready Deployment Guide**  
**Last Updated:** June 30, 2025  
**Tested On:** Coolify latest version 