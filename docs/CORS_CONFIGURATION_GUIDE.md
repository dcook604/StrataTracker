# StrataTracker CORS Configuration Guide

**Document Version:** 1.0  
**Date:** 2024-12-27  
**Author:** AI Assistant  

## Overview

This guide explains how to properly configure Cross-Origin Resource Sharing (CORS) for StrataTracker when using Supabase authentication with a custom domain setup.

## Understanding the Architecture

StrataTracker uses a hybrid approach:
1. **Supabase Authentication**: Handles user auth via PostgREST API (automatic CORS)
2. **Custom Express.js Backend**: Handles application-specific API calls (requires manual CORS)
3. **React Frontend**: Makes requests to both systems

## Key CORS Concepts

### Why CORS Matters
- **Browser Security**: Browsers block cross-origin requests by default
- **Production Domain**: `https://violation.spectrum4.ca` must be explicitly allowed
- **Development**: Local development needs `localhost` origins allowed

### Supabase Automatic CORS
- Supabase's PostgREST API automatically handles CORS for database operations
- Authentication flows work seamlessly when properly configured
- No manual CORS configuration needed for Supabase endpoints

## Configuration Steps

### 1. Environment Variables

Ensure these are set in your production environment:

```env
# Production Domain Configuration
APP_URL=https://violation.spectrum4.ca
CORS_ORIGIN=https://violation.spectrum4.ca
PUBLIC_BASE_URL=https://violation.spectrum4.ca

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Frontend Variables (must match backend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Express.js CORS Configuration

The backend now includes comprehensive CORS handling:

```typescript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://violation.spectrum4.ca',
      'http://localhost:5173',
      process.env.CORS_ORIGIN,
      process.env.APP_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 'X-Requested-With', 'Content-Type', 
    'Accept', 'Authorization', 'x-client-info', 'apikey'
  ]
};
```

### 3. Frontend API Client Updates

The `apiRequest` function now includes:

- Proper CORS mode configuration
- Supabase-compatible headers
- Credential inclusion for authentication

```typescript
const requestOptions: RequestInit = {
  method,
  headers: {
    'Content-Type': 'application/json',
    'x-client-info': 'supabase-js/2.38.4',
    'Authorization': `Bearer ${accessToken}`,
    'apikey': supabaseAnonKey
  },
  credentials: 'include',
  mode: 'cors'
};
```

## Troubleshooting CORS Issues

### Common Symptoms
1. **Network Tab Errors**: "CORS policy" or "preflight" errors
2. **Authentication Failures**: Users can't log in on production
3. **API Request Failures**: Custom API calls blocked by browser

### Debugging Steps

#### 1. Check Browser Network Tab
```bash
# Look for these headers in failed requests:
Access-Control-Allow-Origin: missing or wrong domain
Access-Control-Allow-Methods: missing required methods
Access-Control-Allow-Headers: missing Authorization
```

#### 2. Verify Environment Variables
```bash
# In production container:
echo $CORS_ORIGIN
echo $APP_URL
echo $VITE_SUPABASE_URL

# Should all match your domain: https://violation.spectrum4.ca
```

#### 3. Test CORS Endpoints
```bash
# Test preflight request:
curl -X OPTIONS https://violation.spectrum4.ca/api/health \
  -H "Origin: https://violation.spectrum4.ca" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Should return 200 with CORS headers
```

#### 4. Check Backend Logs
```bash
# Look for CORS-related log messages:
docker-compose logs app | grep -i cors

# Should show:
[CORS] Request from origin: https://violation.spectrum4.ca
[CORS] Allowed origins: [...]
```

### Environment-Specific Issues

#### Development (Local)
```env
# Ensure localhost is allowed:
CORS_ORIGIN=http://localhost:5173
VITE_SUPABASE_URL=https://your-project.supabase.co
```

#### Production (Coolify)
```env
# Must match your actual domain:
CORS_ORIGIN=https://violation.spectrum4.ca
APP_URL=https://violation.spectrum4.ca
```

## Advanced Configuration

### Custom Domain with Supabase

If using Supabase custom domains:

1. **Configure Custom Domain**: Follow Supabase custom domain setup
2. **Update Environment Variables**:
   ```env
   VITE_SUPABASE_URL=https://api.violation.spectrum4.ca
   SUPABASE_URL=https://api.violation.spectrum4.ca
   ```
3. **DNS Configuration**: Ensure CNAME points to Supabase

### Security Considerations

#### Production Recommendations
- **Specific Origins**: Never use `'*'` for `Access-Control-Allow-Origin` in production
- **Credential Handling**: Always include `credentials: true` for authenticated requests
- **Header Validation**: Limit allowed headers to required ones only

#### Environment Separation
```typescript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://violation.spectrum4.ca']
  : ['http://localhost:5173', 'http://localhost:3000'];
```

## Validation Checklist

### ✅ Pre-Deployment
- [ ] Environment variables set correctly
- [ ] CORS origins match domain
- [ ] Supabase credentials valid
- [ ] Custom API endpoints tested

### ✅ Post-Deployment
- [ ] Login functionality works
- [ ] API requests succeed
- [ ] No CORS errors in browser console
- [ ] Authentication persists across page reloads

### ✅ Monitoring
- [ ] Check backend logs for CORS warnings
- [ ] Monitor failed authentication attempts
- [ ] Verify Supabase connection health

## Common Pitfalls

### 1. Mismatched URLs
**Problem**: Frontend and backend have different domain configurations
**Solution**: Ensure all environment variables use consistent URLs

### 2. Missing Preflight Handling
**Problem**: OPTIONS requests not handled properly
**Solution**: Explicit `app.options('*', cors())` configuration

### 3. Incomplete Headers
**Problem**: Missing required headers like `apikey` for Supabase
**Solution**: Include all Supabase-required headers in requests

### 4. Development vs Production
**Problem**: Works locally but fails in production
**Solution**: Environment-specific CORS configuration

## Support Resources

### Useful Commands
```bash
# Test CORS configuration:
curl -H "Origin: https://violation.spectrum4.ca" \
     -H "Content-Type: application/json" \
     -X GET https://violation.spectrum4.ca/api/health

# Check Supabase connectivity:
curl -H "apikey: your_anon_key" \
     https://your-project.supabase.co/rest/v1/

# Monitor logs:
docker-compose logs -f app | grep -E "(CORS|AUTH|ERROR)"
```

### References
- [Supabase CORS Documentation](https://supabase.com/docs/guides/functions/cors)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Package](https://github.com/expressjs/cors)

---

**Note**: This configuration supports both development and production environments. Ensure environment variables are properly set for your deployment context. 