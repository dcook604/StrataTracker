# StrataTracker Cloudflare + Coolify Deployment Fixes

## Overview
This document captures the complete troubleshooting process for deploying StrataTracker via Coolify behind Cloudflare proxy, including all issues encountered and their solutions.

## Issues Encountered & Solutions

### 1. Content Security Policy (CSP) Blocking JavaScript
**Problem:** CSP headers too restrictive, blocking React/Vite application scripts
**Solution:** Updated nginx CSP configuration for Cloudflare compatibility

### 2. Supabase Environment Variables Not Available During Build
**Problem:** VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY missing during Docker build
**Solution:** Added proper build args and fallback handling

### 3. 504 Gateway Timeout from Cloudflare
**Problem:** Cloudflare couldn't reach origin server despite healthy container
**Solution:** Fixed Traefik routing configuration

### 4. Traefik Routing Misconfiguration
**Problem:** Malformed routing rules preventing route discovery
**Solution:** Corrected Traefik labels in docker-compose.coolify.yml

### 5. Network Isolation Between App and Traefik
**Problem:** App container on custom network, Traefik on coolify network
**Solution:** Added coolify network to app container

### 6. Database Authentication Failure
**Problem:** Password mismatch between PostgreSQL container and application
**Error:** `password authentication failed for user 'spectrum4'`
**Solution:** Match POSTGRES_PASSWORD environment variable to actual database password

## Complete Resolution Steps

### Step 1: Identify Database Password
```bash
# Find the PostgreSQL container ID
docker ps | grep postgres

# Inspect container to find current password
docker inspect <postgres_container_id> | grep POSTGRES_PASSWORD
# Result: "POSTGRES_PASSWORD=lY0_6JVAcSG8utftr_MA"
```

### Step 2: Update Coolify Environment Variables
In Coolify dashboard, set the following environment variable:
```
POSTGRES_PASSWORD=lY0_6JVAcSG8utftr_MA
```

### Step 3: Redeploy Application
After updating the environment variable, redeploy the application through Coolify.

### Step 4: Verify Connection
Check application logs to confirm successful database connection:
```bash
docker logs <app_container_id> | grep -i database
```

## Files Modified During Troubleshooting

### nginx/nginx.conf
Updated Content Security Policy headers for Cloudflare compatibility.

### server/middleware/security-headers.ts
Removed conflicting CSP configuration.

### server/routes.ts
Disabled helmet CSP to prevent conflicts.

### client/src/lib/supabase.ts
Added fallback handling for missing Supabase configuration.

### Dockerfile.coolify
Added environment variable debugging and extended health check timeouts.

### docker-compose.coolify.yml
- Added correct Traefik labels for domain routing
- Configured proper network setup for Coolify
- Ensured DATABASE_URL uses correct environment variables

### server/index.ts
Added startup debugging and database connection timeout handling.

## Environment Variables Required for Production

### Core Configuration
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=<secure-random-string>
```

### Database
```env
POSTGRES_DB=spectrum4
POSTGRES_USER=spectrum4
POSTGRES_PASSWORD=lY0_6JVAcSG8utftr_MA
DATABASE_URL=postgres://spectrum4:lY0_6JVAcSG8utftr_MA@postgres:5432/spectrum4
```

### Cloudflare & Domain
```env
APP_URL=https://violation.spectrum4.ca
CORS_ORIGIN=https://violation.spectrum4.ca
PUBLIC_BASE_URL=https://violation.spectrum4.ca
```

### Supabase Auth
```env
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Email Configuration
```env
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=spectrum4.ca
SMTP_PASS=<your-smtp-password>
EMAIL_FROM=noreply@spectrum4.ca
```

## Debugging Commands

### Container Health
```bash
# Check all containers
docker ps

# Check application logs
docker logs <app_container_id> --tail 50 -f

# Check database logs
docker logs <postgres_container_id> --tail 50 -f

# Test database connection
docker exec <postgres_container_id> pg_isready -U spectrum4 -d spectrum4
```

### Network Connectivity
```bash
# Check networks
docker network ls

# Inspect app container networks
docker inspect <app_container_id> | grep -A 10 "Networks"

# Test internal connectivity
docker exec <app_container_id> curl -f http://localhost:3000/api/health
```

### Traefik Routes
```bash
# Check Traefik container labels
docker inspect <app_container_id> | grep -A 20 "Labels"

# Check if routes are registered (if Traefik dashboard available)
curl http://traefik-dashboard/api/http/routers
```

## Common Pitfalls

1. **Environment Variable Mismatch:** Always verify that POSTGRES_PASSWORD matches between database container and application
2. **Network Isolation:** Ensure both app and proxy are on compatible networks
3. **CSP Conflicts:** Don't set CSP in both nginx and Express middleware
4. **Build vs Runtime Variables:** Vite variables need to be available at build time
5. **Health Check Timeouts:** Allow sufficient time for application startup in health checks

## Success Indicators

When deployment is successful, you should see:
- ✅ Application accessible at https://violation.spectrum4.ca
- ✅ No CSP errors in browser console
- ✅ Database connected successfully
- ✅ Authentication working properly
- ✅ Static assets loading correctly

## Rollback Plan

If issues persist:
1. Revert to last known working docker-compose configuration
2. Check database volume integrity
3. Verify all environment variables are properly set
4. Consider recreating containers if network issues persist

## Additional Resources

- [Coolify Documentation](https://coolify.io/docs)
- [Traefik Docker Configuration](https://doc.traefik.io/traefik/providers/docker/)
- [Cloudflare Origin Rules](https://developers.cloudflare.com/rules/origin-rules/)
- [PostgreSQL Docker Documentation](https://hub.docker.com/_/postgres)

---

**Last Updated:** December 2024  
**Status:** Production deployment successful with all issues resolved 