# Audit Log System Documentation
# Last Updated: June 6, 2025
# Status: Production Ready

## Overview

The StrataTracker Audit Log System provides comprehensive tracking and monitoring of all system activities, user actions, and data modifications. This system ensures accountability, security compliance, and operational transparency by maintaining a detailed audit trail of all significant events.

## Architecture

### Core Components

1. **AuditLogger Class** (`server/audit-logger.ts`)
   - Central logging service with static methods
   - Supports both authenticated and system events
   - Automatic context extraction from Express requests

2. **Database Schema** (`audit_logs` table)
   - Comprehensive event storage with JSONB details
   - User attribution and IP tracking
   - Timezone-aware timestamps

3. **Frontend Interface** (`client/src/pages/audit-log-page.tsx`)
   - Admin-only access with advanced filtering
   - Export capabilities and statistical analysis
   - Real-time event monitoring

4. **Route Integration**
   - Embedded in all major route handlers
   - Consistent logging patterns across modules
   - Error-resistant implementation

## Database Schema

```sql
CREATE TABLE audit_logs (
  id serial PRIMARY KEY,
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  user_id integer REFERENCES users(id) ON DELETE SET NULL,
  user_name text,
  user_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  ip_address text
);
```

### Field Descriptions

- **id**: Auto-incrementing primary key
- **timestamp**: Event occurrence time (timezone-aware)
- **user_id**: Reference to authenticated user (nullable for system events)
- **user_name**: Cached user full name for historical accuracy
- **user_email**: Cached user email for audit trails
- **action**: Standardized action type (see AuditAction enum)
- **target_type**: Resource type being acted upon
- **target_id**: Specific resource identifier (supports UUIDs)
- **details**: Flexible JSONB field for additional context
- **ip_address**: Client IP address for security tracking

## Audit Actions

### Authentication Events
- `USER_LOGIN` - Successful user authentication
- `USER_LOGOUT` - Session termination
- `USER_LOGIN_FAILED` - Failed authentication attempts

### User Management
- `USER_CREATED` - New user registration
- `USER_UPDATED` - Profile/permission modifications
- `USER_DELETED` - Account deletion
- `USER_PASSWORD_CHANGED` - Password updates
- `USER_PASSWORD_RESET` - Password reset operations

### Violation Management
- `VIOLATION_CREATED` - New violation reports
- `VIOLATION_UPDATED` - Violation modifications
- `VIOLATION_DELETED` - Violation removal
- `VIOLATION_STATUS_CHANGED` - Status updates
- `VIOLATION_APPROVED` - Violation approvals
- `VIOLATION_REJECTED` - Violation rejections
- `VIOLATION_DISPUTED` - Dispute submissions

### Unit Management
- `UNIT_CREATED` - New unit creation
- `UNIT_UPDATED` - Unit modifications
- `UNIT_DELETED` - Unit removal

### System Operations
- `SYSTEM_SETTING_UPDATED` - Configuration changes
- `EMAIL_CONFIG_UPDATED` - Email system changes
- `DATA_EXPORT` - Report generation
- `REPORT_GENERATED` - Analytics access

### Communication Events
- `EMAIL_CAMPAIGN_CREATED` - Campaign creation
- `EMAIL_CAMPAIGN_SENT` - Campaign dispatch
- `EMAIL_SENT` - Individual email delivery

### Security Events
- `UNAUTHORIZED_ACCESS_ATTEMPT` - Access violations
- `PERMISSION_DENIED` - Authorization failures

## Target Types

- `USER` - User account operations
- `VIOLATION` - Violation management
- `UNIT` - Property unit operations
- `SYSTEM_SETTING` - Configuration changes
- `EMAIL_CAMPAIGN` - Communication activities
- `BYLAW` - Bylaw management
- `REPORT` - Report generation
- `SESSION` - Authentication sessions

## Implementation Patterns

### Basic Audit Logging

```typescript
import { AuditLogger, AuditAction, TargetType } from '../audit-logger';

// Log from authenticated request
await AuditLogger.logFromRequest(req, AuditAction.VIOLATION_CREATED, {
  targetType: TargetType.VIOLATION,
  targetId: violation.uuid,
  details: {
    violationType: violation.violationType,
    unitId: violation.unitId,
    status: violation.status,
  },
});
```

### Authentication Event Logging

```typescript
// Login/logout events
await AuditLogger.logAuth(AuditAction.USER_LOGIN, {
  userId: user.id,
  userName: user.fullName,
  userEmail: user.email,
  ipAddress: req.ip,
  details: { sessionId: req.sessionID },
});
```

### System Event Logging

```typescript
// System operations without user context
await AuditLogger.logSystem(AuditAction.EMAIL_CONFIG_UPDATED, {
  targetType: TargetType.SYSTEM_SETTING,
  details: { configKey: 'smtp_settings' },
});
```

## Frontend Interface

### Access Control
- **Admin Only**: Audit log access restricted to administrators
- **Role-based Filtering**: Different views based on user permissions
- **Secure Export**: Controlled data export with audit trails

### Features
- **Advanced Filtering**: Date range, action type, target type, user, search
- **Pagination**: Efficient handling of large audit datasets
- **Export**: CSV export with comprehensive data
- **Statistics**: Action distribution and user activity metrics
- **Real-time Updates**: Live monitoring capabilities

### URL Structure
- **Main Interface**: `/settings/audit-log`
- **API Endpoints**: `/api/audit-logs/*`
- **Export**: `/api/audit-logs/export`

## API Endpoints

### GET /api/audit-logs
Retrieve paginated audit logs with filtering

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 50, max: 1000)
- `startDate` - Filter from date (ISO format)
- `endDate` - Filter to date (ISO format)
- `userId` - Filter by user ID
- `action` - Filter by action type
- `targetType` - Filter by target type
- `search` - Text search in user names, emails, actions

**Response:**
```typescript
{
  logs: AuditLog[],
  pagination: {
    page: number,
    limit: number,
    totalCount: number,
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }
}
```

### GET /api/audit-logs/stats
Retrieve audit log statistics

**Query Parameters:**
- `startDate` - Statistics from date
- `endDate` - Statistics to date

**Response:**
```typescript
{
  actionStats: Array<{ action: string, count: number }>,
  userStats: Array<{ userId: number, userName: string, userEmail: string, count: number }>,
  dailyActivity: Array<{ date: string, count: number }>
}
```

### GET /api/audit-logs/actions
Get available actions and target types for filtering

**Response:**
```typescript
{
  actions: string[],
  targetTypes: string[]
}
```

### GET /api/audit-logs/export
Export audit logs as CSV

**Query Parameters:** Same as main endpoint
**Response:** CSV file download

## Security Considerations

### Data Protection
- **PII Handling**: Sensitive data stored in hashed/encrypted form
- **Access Control**: Strict admin-only access to audit interfaces
- **IP Tracking**: Client IP address logging for security analysis
- **Session Tracking**: Session ID logging for forensic analysis

### Compliance Features
- **Immutable Records**: Audit logs cannot be modified after creation
- **Comprehensive Coverage**: All significant actions logged
- **User Attribution**: Clear user accountability
- **Time Accuracy**: Timezone-aware timestamps

### Privacy Considerations
- **Data Retention**: Configurable retention policies
- **Export Controls**: Admin-controlled data export
- **Anonymization**: Support for data anonymization when required

## Performance Optimization

### Database Indexing
```sql
-- Recommended indexes for performance
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target_type ON audit_logs(target_type);
```

### Query Optimization
- **Pagination**: Limit result sets to prevent memory issues
- **Date Filtering**: Always include date ranges for large datasets
- **Index Usage**: Queries optimized for database indexes

### Resource Management
- **Error Handling**: Non-blocking audit logging prevents application disruption
- **Background Processing**: Audit logging doesn't impact user experience
- **Resource Limits**: Export limits prevent system overload

## Integration Guidelines

### Adding New Audit Events

1. **Define Action Type**
   ```typescript
   // Add to AuditAction enum in audit-logger.ts
   NEW_FEATURE_CREATED = 'NEW_FEATURE_CREATED'
   ```

2. **Add Target Type** (if needed)
   ```typescript
   // Add to TargetType enum
   NEW_FEATURE = 'NEW_FEATURE'
   ```

3. **Implement Logging**
   ```typescript
   // In route handler
   await AuditLogger.logFromRequest(req, AuditAction.NEW_FEATURE_CREATED, {
     targetType: TargetType.NEW_FEATURE,
     targetId: feature.id,
     details: { /* relevant context */ },
   });
   ```

### Best Practices

1. **Consistent Timing**: Log after successful operations
2. **Rich Context**: Include relevant details in the details field
3. **Error Handling**: Never let audit logging failures break main functionality
4. **Standard Patterns**: Use established patterns for similar operations
5. **Resource Awareness**: Consider performance impact of detailed logging

### Testing Considerations

```typescript
// Example test pattern
describe('Audit Logging', () => {
  it('should log violation creation', async () => {
    const response = await request(app)
      .post('/api/violations')
      .send(violationData);
    
    expect(response.status).toBe(201);
    
    // Verify audit log entry
    const auditLogs = await db.select().from(auditLogs)
      .where(eq(auditLogs.action, 'VIOLATION_CREATED'));
    
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].targetId).toBe(response.body.uuid);
  });
});
```

## Monitoring and Maintenance

### Health Monitoring
- **Database Growth**: Monitor audit log table size
- **Query Performance**: Track query execution times
- **Error Rates**: Monitor audit logging failures

### Maintenance Tasks
- **Data Archival**: Periodic archival of old audit logs
- **Index Maintenance**: Regular index optimization
- **Performance Tuning**: Query optimization based on usage patterns

### Alerting
- **Failed Logins**: Monitor authentication failures
- **Unauthorized Access**: Alert on permission violations
- **System Changes**: Notify on critical configuration changes

## Troubleshooting

### Common Issues

1. **Audit Logging Failures**
   - Check database connectivity
   - Verify schema consistency
   - Review error logs

2. **Performance Issues**
   - Check database indexes
   - Review query patterns
   - Consider pagination limits

3. **Access Issues**
   - Verify admin permissions
   - Check authentication status
   - Review role assignments

### Debug Information

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'DEBUG';

// Check audit logger status
logger.debug('[AUDIT] Logging event:', {
  action,
  targetType,
  targetId,
  userId: req.user?.id
});
```

## Future Enhancements

### Planned Features
- **Real-time Notifications**: WebSocket-based live updates
- **Advanced Analytics**: ML-based anomaly detection
- **API Rate Limiting**: Integration with rate limiting systems
- **Data Visualization**: Interactive audit dashboards

### Integration Opportunities
- **SIEM Integration**: Security Information and Event Management
- **Compliance Reporting**: Automated compliance report generation
- **Backup Integration**: Audit log backup and recovery

## Related Documentation

- [Email Deduplication System](./EMAIL_DEDUPLICATION_SYSTEM.md)
- [Violation Workflow](./VIOLATION_WORKFLOW.md)
- [Security Guidelines](./SECURITY.md)
- [Database Schema](./DATABASE_SCHEMA.md)

---

**Note**: This audit log system is production-ready and integrated throughout the StrataTracker application. All major user actions and system events are automatically logged with appropriate context and security measures. 

## Integration Status

✅ **Violations Routes** - Complete audit logging for CRUD operations
✅ **User Management** - Complete audit logging for user operations  
✅ **Unit Management** - Complete audit logging for unit operations
✅ **Authentication** - Login, logout, and security events
✅ **Frontend Interface** - Admin dashboard with filtering and export
✅ **Database Schema** - Production-ready audit_logs table 