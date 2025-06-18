# Supabase Keep-Alive System

This document describes the implementation of the Supabase keep-alive system to prevent database pausing on the free tier.

## Overview

Supabase free tier databases automatically pause after periods of inactivity. This keep-alive system sends periodic requests to maintain database activity and prevent pausing.

## Features

- **Automatic Ping Service**: Scheduled background pings every 5 minutes (configurable)
- **Multiple Connection Tests**: Tests auth connection, database queries, and admin access
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Health Monitoring**: Tracks ping statistics and connection health
- **Manual Ping**: API endpoint for manual database pings
- **Frontend Monitoring**: React component for real-time status monitoring

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Supabase Keep-Alive Configuration
SUPABASE_KEEPALIVE_ENABLED=true              # Enable/disable the service
SUPABASE_KEEPALIVE_INTERVAL=*/5 * * * *      # Cron expression (every 5 minutes)
SUPABASE_KEEPALIVE_TIMEOUT=30000             # Timeout in milliseconds
SUPABASE_KEEPALIVE_RETRY_ATTEMPTS=3          # Number of retry attempts
SUPABASE_KEEPALIVE_RETRY_DELAY=5000          # Delay between retries (ms)
```

### Cron Interval Examples

- `*/5 * * * *` - Every 5 minutes
- `*/10 * * * *` - Every 10 minutes
- `*/15 * * * *` - Every 15 minutes
- `0 */1 * * *` - Every hour

## Implementation

### Backend Service

**File**: `server/services/supabase-keepalive.ts`

The service performs three types of connection tests:

1. **Auth Connection Test**: Verifies basic Supabase auth connectivity
2. **Database Query Test**: Attempts to query the profiles table
3. **Admin Connection Test**: Tests admin-level Supabase access

### API Endpoints

**Status Endpoint**: `GET /api/supabase-keepalive`
```json
{
  "status": "success",
  "data": {
    "lastPing": "2025-01-09T15:30:00.000Z",
    "consecutiveFailures": 0,
    "totalPings": 245,
    "totalFailures": 2,
    "isHealthy": true,
    "lastError": null,
    "config": {
      "enabled": true,
      "interval": "*/5 * * * *",
      "timeout": 30000,
      "retryAttempts": 3,
      "retryDelay": 5000
    },
    "isRunning": true
  }
}
```

**Manual Ping Endpoint**: `POST /api/supabase-ping`
```json
{
  "status": "success",
  "data": {
    "success": true,
    "duration": 245
  }
}
```

### Frontend Component

**File**: `client/src/components/supabase-keepalive-monitor.tsx`

Features:
- Real-time status display
- Ping statistics and success rate
- Manual ping button
- Health status indicators
- Configuration details

## Integration

### Server Integration

The service is automatically started in `server/index.ts`:

```typescript
// Start Supabase keep-alive service
const { supabaseKeepAlive } = await import('./services/supabase-keepalive');
supabaseKeepAlive.start();
console.log("Supabase keep-alive service started");
```

### Frontend Integration

Add the monitor component to any admin page:

```tsx
import { SupabaseKeepAliveMonitor } from '@/components/supabase-keepalive-monitor';

// In your component
<SupabaseKeepAliveMonitor />
```

## Monitoring & Logs

### Console Logs

The service logs all activities:

```
[SUPABASE_KEEPALIVE] Starting service with interval: */5 * * * *
[SUPABASE_KEEPALIVE] Performing keep-alive ping...
[SUPABASE_KEEPALIVE] Auth connection test passed
[SUPABASE_KEEPALIVE] Database query test passed
[SUPABASE_KEEPALIVE] Admin connection test passed
[SUPABASE_KEEPALIVE] ✅ Keep-alive successful (Total: 245)
```

### Error Handling

Failed pings are logged with retry attempts:

```
[SUPABASE_KEEPALIVE] Attempt 1/3 failed: Database connection failed
[SUPABASE_KEEPALIVE] Retrying in 5000ms...
[SUPABASE_KEEPALIVE] ❌ Keep-alive failed (Consecutive failures: 1)
```

Critical health alerts:

```
[SUPABASE_KEEPALIVE] 🚨 Database appears to be unhealthy! (3 consecutive failures)
```

## Health Status

The system considers the database:

- **Healthy**: Recent successful pings, < 3 consecutive failures
- **Unhealthy**: 3+ consecutive failures
- **Disabled**: Service not enabled via configuration
- **Not Running**: Service failed to start or was stopped

## Performance Impact

- **Minimal CPU Usage**: Lightweight cron-based scheduling
- **Low Network Traffic**: Small auth/query requests every 5 minutes
- **Configurable Intervals**: Adjust frequency based on your needs
- **Graceful Failure**: System continues operating if keep-alive fails

## Troubleshooting

### Service Not Starting

1. Check environment variables are correctly set
2. Verify Supabase credentials are valid
3. Ensure `node-cron` dependency is installed
4. Check server startup logs for errors

### Connection Failures

1. Verify Supabase project is active
2. Check internet connectivity
3. Validate Supabase service role key permissions
4. Monitor Supabase dashboard for service status

### High Failure Rate

1. Increase timeout value (`SUPABASE_KEEPALIVE_TIMEOUT`)
2. Reduce ping frequency if hitting rate limits
3. Check Supabase project quotas and limits
4. Verify network stability

## Production Deployment

For production environments:

1. **Enable Service**: Set `SUPABASE_KEEPALIVE_ENABLED=true`
2. **Adjust Interval**: Consider `*/10 * * * *` for lower traffic
3. **Monitor Logs**: Set up log aggregation for health monitoring
4. **Alerting**: Implement alerts for high failure rates
5. **Backup Strategy**: Don't rely solely on keep-alive for database persistence

## Free Tier Optimization

For Supabase free tier users:

- Keep interval at 5-10 minutes maximum
- Monitor your project's activity quotas
- Use keep-alive in conjunction with proper connection pooling
- Consider upgrading to paid tier for production applications

## Security Considerations

- Service uses service role key - keep credentials secure
- Keep-alive requests count toward your API quotas
- Monitor for potential abuse if exposing manual ping endpoint
- Implement rate limiting on manual ping if needed

## Future Enhancements

Potential improvements:

- **Adaptive Intervals**: Adjust frequency based on application activity
- **Health Webhooks**: Send notifications on prolonged failures
- **Database Connection Pooling**: Optimize connection management
- **Metrics Dashboard**: Enhanced monitoring and analytics
- **Multi-Region Support**: Keep-alive for multiple Supabase regions 