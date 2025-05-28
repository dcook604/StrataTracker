# StrataTracker Logging Best Practices

## Overview

This document outlines the logging best practices implemented in StrataTracker, optimized for production environments while maintaining debugging capabilities in development.

## Environment-Specific Logging Levels

### Production (`NODE_ENV=production`)
- **Default Level**: WARN
- **File Logging**: ERROR level only
- **Features Disabled**: DEBUG, TRACE, performance logging, request logging
- **Security**: Always logged regardless of level
- **Goal**: Minimal log volume, maximum performance, security focus

### Development (`NODE_ENV=development`)
- **Default Level**: DEBUG
- **File Logging**: All levels except DEBUG go to files
- **Features Enabled**: All logging features
- **Goal**: Maximum visibility for debugging

### Test (`NODE_ENV=test`)
- **Default Level**: ERROR
- **Goal**: Clean test output, only critical issues

## Log Levels and Usage

### ERROR (Always Logged)
- Application errors and exceptions
- Failed HTTP requests (4xx, 5xx)
- Database connection failures
- Critical system issues

```typescript
logger.error('Payment processing failed', { 
  userId: 'user-123', 
  orderId: 'order-456',
  error: error.message 
});
```

### WARN (Production and Development)
- Unusual but non-critical conditions
- Deprecated API usage
- Resource constraints
- Fallback operations

```typescript
logger.warn('Using backup payment provider', { 
  primaryProvider: 'stripe',
  backupProvider: 'paypal' 
});
```

### INFO (Development Only in Production)
- Application lifecycle events
- Successful operations
- Business events

```typescript
logger.info('User registration completed', { 
  userId: 'user-123',
  registrationMethod: 'email' 
});
```

### DEBUG (Development Only)
- Detailed application flow
- Variable states
- Function entry/exit

```typescript
logger.debug('Processing user data', { 
  userId: 'user-123',
  stepName: 'validation' 
});
```

## Security Logging

Security events are always logged regardless of environment or level:

```typescript
logger.security('Failed login attempt', {
  username: 'admin',
  ip: '192.168.1.100',
  attemptCount: 3
});
```

## Production Optimizations

### Reduced File I/O
- Only ERROR level logs written to files in production
- Asynchronous logging with write queues
- Log rotation at 10MB with 5 file retention

### Performance Features Disabled
- No request/response logging for successful requests
- No database query logging
- No performance timing logs
- No debug or trace logs

### Data Protection
- Query parameters redacted: `[REDACTED]`
- Response bodies excluded in production
- User agent strings truncated to 100 characters
- Database parameters not logged

## Log File Structure

```
logs/
├── app.log          # All application logs
├── error.log        # ERROR level only
├── server.log       # Server-specific logs (INFO+ in dev, ERROR in prod)
├── app.log.1        # Rotated files
├── app.log.2
└── ...
```

## Monitoring and Alerting

Use the monitoring script to check log health:

```bash
# Check logs with environment awareness
NODE_ENV=production ./scripts/monitor-logs.sh

# Development monitoring
./scripts/monitor-logs.sh
```

### Alert Thresholds

| Environment | Warning | Critical |
|------------|---------|----------|
| Production | 10MB    | 25MB     |
| Development| 50MB    | 100MB    |

## Best Practices

### ✅ DO
- Use structured logging with consistent fields
- Include correlation IDs for request tracing
- Log security events always
- Use appropriate log levels
- Include relevant context without sensitive data
- Monitor log file sizes regularly

### ❌ DON'T
- Log passwords, tokens, or PII
- Use console.log() in production code
- Log successful operations in production excessively
- Include full request/response bodies in production
- Ignore log rotation and retention policies
- Log at DEBUG level in production

## Configuration

### Environment Variables

```bash
# Set log level (overrides defaults)
LOG_LEVEL=ERROR

# Environment detection
NODE_ENV=production
```

### Code Usage

```typescript
import logger from './utils/logger';

// Structured logging with context
logger.error('Operation failed', {
  operation: 'payment',
  userId: user.id,
  error: error.message
});

// Security events
logger.security('Unauthorized access attempt', {
  resource: '/admin',
  ip: req.ip
});

// Development debugging
logger.debug('Processing step', { step: 'validation' });
```

## Troubleshooting

### Large Log Files in Production
1. Check for error loops or excessive error rates
2. Verify LOG_LEVEL is not set to DEBUG or INFO
3. Investigate system issues causing frequent errors
4. Consider if security events are being triggered excessively

### Missing Logs
1. Check log level configuration
2. Verify file permissions in logs/ directory
3. Check disk space
4. Review error handler configuration

### Performance Issues
1. Ensure production logging levels are set correctly
2. Monitor async write queue performance
3. Check for synchronous logging calls
4. Review log rotation settings

## Migration from Previous Versions

If upgrading from a system with excessive logging:

1. Set `NODE_ENV=production` in production environments
2. Remove any manual `LOG_LEVEL=DEBUG` overrides in production
3. Clean up existing large log files: `rm logs/*.log`
4. Monitor log growth with the monitoring script
5. Review error rates - they should be the primary production logs

## Integration with Monitoring Systems

The logger is designed to integrate with:
- Log aggregation systems (ELK, Splunk, etc.)
- Application monitoring (AppSignal, DataDog, etc.)
- Security information and event management (SIEM) systems

For integration, focus on:
- ERROR level logs for alerting
- Security logs for threat detection
- Structured JSON format for parsing
- Correlation IDs for distributed tracing 