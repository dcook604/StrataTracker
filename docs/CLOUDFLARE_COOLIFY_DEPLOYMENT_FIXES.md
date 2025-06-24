# Cloudflare + Coolify + Supabase Deployment Fixes

## Issue Summary
When deploying StrataTracker via Coolify with Cloudflare proxy, several compatibility issues can occur:

1. **Content Security Policy (CSP) conflicts**
2. **Supabase environment variables not available during build**
3. **Cloudflare security features interfering with React app**
4. **Message port errors from browser extensions + Cloudflare**

## Root Causes & Fixes Applied

### 1. Supabase Environment Variables Missing During Build

**Problem**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` not available during Docker build process.

**Symptoms**:
```
Error: Supabase URL and anon key are required.
```

**Fix Applied**:
- Updated `Dockerfile.coolify` to properly pass build arguments
- Added fallback handling in `client/src/lib/supabase.ts` to prevent app crashes
- Added build-time debugging to verify environment variables

### 2. CSP Headers Blocking JavaScript Execution

**Problem**: Multiple CSP headers from nginx + helmet + Cloudflare causing conflicts.

**Symptoms**:
```
Refused to load the script because it violates CSP directive: 'script-src'
```

**Fix Applied**:
- Updated nginx CSP to allow Cloudflare and Supabase domains
- Disabled CSP in helmet middleware
- Added Cloudflare compatibility headers

### 3. Cloudflare Security Features Interference

**Problem**: Cloudflare's security features conflicting with React/Vite app.

**Symptoms**:
```
Failed to load resource: net::ERR_ADDRESS_INVALID
Unchecked runtime.lastError: The message port closed before a response was received
```

**Fix Applied**:
- Updated CSP to whitelist `*.cloudflare.com` and `*.supabase.co`
- Added Cross-Origin headers for compatibility
- Added Cloudflare-specific script sources

## Required Coolify Environment Variables

Ensure these are set in your Coolify deployment:

```env
# Supabase Configuration (Required for build)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Runtime Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# App Configuration
APP_URL=https://violation.spectrum4.ca
CORS_ORIGIN=https://violation.spectrum4.ca
PUBLIC_BASE_URL=https://violation.spectrum4.ca
```

## Required Cloudflare Settings

### DNS Settings
- Set DNS record to "Proxied" (orange cloud) for SSL termination
- Ensure the origin server (Coolify) is accessible from Cloudflare

### Security Settings
```
Security > WAF > Custom Rules:
- Disable aggressive bot protection for your app
- Whitelist legitimate API calls

Security > Settings:
- Challenge Passage: 30 minutes
- Browser Integrity Check: OFF (can interfere with React)
- Privacy Pass: ON
```

### Speed Settings
```
Speed > Optimization:
- Auto Minify: JavaScript OFF, CSS OFF, HTML OFF
  (Let Vite handle minification)

Speed > Caching:
- Browser Cache TTL: 4 hours
- Caching Level: Standard
```

### Page Rules (Optional)
Create a page rule for `*.spectrum4.ca/*`:
```
Cache Level: Bypass
Disable Security
Browser Cache TTL: 2 hours
```

## Testing & Verification

### 1. Check Build Logs
```bash
# In Coolify deployment logs, look for:
Build environment check:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY is set: YES
```

### 2. Test CSP Headers
```bash
curl -I https://violation.spectrum4.ca
# Should see proper CSP headers without conflicts
```

### 3. Browser Console
After deployment, check for:
- ✅ No CSP violation errors
- ✅ No "Supabase URL and anon key are required" errors
- ✅ No ERR_ADDRESS_INVALID errors

### 4. Test API Endpoints
```bash
# Health check
curl https://violation.spectrum4.ca/api/health

# Admin announcements (should return JSON)
curl https://violation.spectrum4.ca/api/admin-announcements
```

## Troubleshooting Steps

### If App Still Shows Errors:

1. **Clear Cloudflare Cache**:
   - Go to Cloudflare Dashboard > Caching > Configuration
   - Click "Purge Everything"

2. **Check Environment Variables**:
   - Verify all VITE_ variables are set in Coolify
   - Rebuild the Docker container

3. **Disable Cloudflare Temporarily**:
   - Set DNS to "DNS Only" (grey cloud)
   - Test if app works without Cloudflare proxy
   - If it works, adjust Cloudflare settings

4. **Check Build Process**:
   - Review Coolify build logs for environment variable output
   - Ensure `npm run build` completes successfully

### Common Issues:

| Error | Cause | Solution |
|-------|-------|----------|
| CSP violations | Multiple CSP sources | Use nginx CSP only |
| Supabase client errors | Missing VITE_ env vars | Set in Coolify, rebuild |
| Message port errors | Cloudflare + browser extensions | Update CSP, disable bot protection |
| ERR_ADDRESS_INVALID | Cloudflare security features | Adjust security settings |

## Deployment Checklist

- [ ] Set all required environment variables in Coolify
- [ ] Update nginx configuration for Cloudflare compatibility  
- [ ] Configure Cloudflare security settings
- [ ] Deploy and check build logs for environment variables
- [ ] Test frontend loading without CSP errors
- [ ] Verify API endpoints return proper responses
- [ ] Clear Cloudflare cache after deployment

## Files Modified

- `Dockerfile.coolify` - Added proper VITE environment variable handling
- `nginx/nginx.conf` - Updated CSP for Cloudflare compatibility
- `server/routes.ts` - Disabled helmet CSP to avoid conflicts
- `client/src/lib/supabase.ts` - Added fallback handling for missing config
- `server/middleware/security-headers.ts` - Removed conflicting CSP headers

---

**Last Updated**: January 2025  
**Status**: Production Fix Applied 