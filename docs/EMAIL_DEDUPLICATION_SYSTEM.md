# Email Deduplication System Documentation

## Overview

The StrataTracker email deduplication system prevents duplicate email notifications from being sent to users. It implements both idempotency-based and content-based deduplication to ensure reliable email delivery while avoiding spam and duplicate notifications.

## Architecture

### Core Components

1. **EmailDeduplicationService** (`server/email-deduplication.ts`)
   - Central service for email deduplication logic
   - Handles idempotency keys and content hashing
   - Manages retry attempts and failure tracking

2. **Database Tables**
   - `email_idempotency_keys`: Track unique email sends
   - `email_send_attempts`: Record retry attempts
   - `email_deduplication_log`: Log prevented duplicates

3. **Cleanup Scheduler** (`server/email-cleanup-scheduler.ts`)
   - Automated cleanup of expired records
   - Configurable scheduling (default: daily at 2 AM)

4. **Monitoring Interface** (`client/src/pages/email-monitoring.tsx`)
   - Real-time statistics and monitoring
   - Manual cleanup controls
   - Deduplication event logs

## How It Works

### Idempotency-Based Deduplication

Each email is assigned a unique idempotency key based on:
- Email type (violation_notification, violation_approved, campaign, system)
- Recipient email address
- Subject line
- Contextual metadata (violation ID, campaign ID, etc.)
- Time component (hourly buckets to prevent very old duplicates)

```typescript
// Example idempotency key generation
const contextData = [
  emailType,
  to.toLowerCase().trim(),
  subject.trim(),
  metadata?.violationId || '',
  metadata?.campaignId || '',
  new Date().toISOString().substring(0, 13) // YYYY-MM-DDTHH
].join('|');

const idempotencyKey = crypto.createHash('sha256')
  .update(contextData)
  .digest('hex')
  .substring(0, 32);
```

### Content-Based Deduplication

In addition to idempotency keys, the system prevents sending similar content to the same recipient within a configurable time window (default: 5 minutes).

Content hash is generated from:
- Email subject
- Email body content

### Email Sending Flow

1. **Generate Keys**: Create idempotency key and content hash
2. **Check Idempotency**: Look for existing successful sends with same key
3. **Check Content Duplicates**: Look for recent similar emails to same recipient
4. **Record Attempt**: Log the send attempt in database
5. **Send Email**: Use configured SMTP service
6. **Update Status**: Mark as sent/failed with timestamps
7. **Log Duplicates**: Record any prevented duplicates for monitoring

## Configuration

### Environment Variables

```env
# Email deduplication settings (optional - defaults used if not set)
EMAIL_DEDUP_TTL_HOURS=24          # How long to keep idempotency records
EMAIL_DEDUP_WINDOW_MINUTES=5      # Content duplicate prevention window
EMAIL_DEDUP_MAX_RETRIES=3         # Maximum retry attempts
EMAIL_CLEANUP_TIMEZONE=America/Vancouver  # Timezone for scheduled cleanup
```

### Scheduler Configuration

The cleanup scheduler runs automatically when the server starts. To configure:

```typescript
// In server/email-cleanup-scheduler.ts
const cleanupJob = cron.schedule('0 2 * * *', async () => {
  // Cleanup logic - runs daily at 2:00 AM
}, {
  scheduled: true,
  timezone: 'America/Vancouver' // Adjust to your timezone
});
```

## Email Types

The system recognizes four email types:

1. **violation_notification**: New violation reports sent to owners/tenants
2. **violation_approved**: Notifications when violations are approved with fines
3. **campaign**: Marketing/communication campaigns to multiple recipients
4. **system**: System-generated notifications (password resets, etc.)

## API Endpoints

### Email Statistics
```
GET /api/communications/email-stats?hours=24
```
Returns email delivery statistics for the specified time period.

### Cleanup Operations
```
POST /api/communications/email-cleanup
```
Manually trigger cleanup of expired records (admin only).

### Deduplication Logs
```
GET /api/communications/email-deduplication-logs?hours=24&limit=100
```
Retrieve recent duplicate prevention events.

## Database Schema

### email_idempotency_keys
```sql
CREATE TABLE email_idempotency_keys (
    id SERIAL PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    email_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    email_hash TEXT NOT NULL,
    status TEXT DEFAULT 'sent' NOT NULL,
    sent_at TIMESTAMP,
    metadata JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### email_send_attempts
```sql
CREATE TABLE email_send_attempts (
    id SERIAL PRIMARY KEY,
    idempotency_key TEXT NOT NULL REFERENCES email_idempotency_keys(idempotency_key),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL,
    error_message TEXT,
    attempted_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP
);
```

### email_deduplication_log
```sql
CREATE TABLE email_deduplication_log (
    id SERIAL PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    email_type TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    original_idempotency_key TEXT NOT NULL,
    duplicate_idempotency_key TEXT NOT NULL,
    prevented_at TIMESTAMP DEFAULT NOW() NOT NULL,
    metadata JSONB
);
```

## Usage Examples

### Sending Email with Deduplication

```typescript
import { sendEmailWithDeduplication } from './email-deduplication';

const result = await sendEmailWithDeduplication({
  to: 'user@example.com',
  subject: 'Violation Notification',
  html: '<h1>New Violation</h1><p>Details...</p>',
  emailType: 'violation_notification',
  metadata: {
    violationId: 123,
    unitId: 45,
    unitNumber: 'A-101'
  }
});

if (result.success && !result.isDuplicate) {
  console.log('Email sent successfully');
} else if (result.isDuplicate) {
  console.log('Duplicate email prevented');
} else {
  console.error('Email failed:', result.message);
}
```

### Manual Cleanup

```typescript
import { EmailDeduplicationService } from './email-deduplication';

const result = await EmailDeduplicationService.cleanupExpiredRecords();
console.log(`Cleaned up ${result.deletedKeys} expired keys`);
```

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **Success Rate**: Percentage of emails successfully sent
2. **Duplicate Prevention Rate**: Percentage of duplicates prevented
3. **Retry Rate**: Average number of retries per email
4. **Cleanup Efficiency**: Records cleaned up during maintenance

### Alert Thresholds

Consider setting up alerts for:
- Email success rate drops below 95%
- Duplicate prevention rate exceeds 20% (may indicate system issues)
- Cleanup job fails
- Database table sizes growing unexpectedly

### Manual Maintenance

Regular maintenance tasks:
1. **Monthly Review**: Check deduplication logs for patterns
2. **Quarterly Cleanup**: Manual cleanup during maintenance windows
3. **Annual Review**: Evaluate time windows and thresholds

## Troubleshooting

### Common Issues

1. **High Duplicate Rate**
   - Check if email content is identical for different contexts
   - Review time window settings
   - Verify idempotency key generation logic

2. **Emails Not Sending**
   - Check SMTP configuration
   - Review error logs in `email_send_attempts`
   - Verify email service status

3. **Database Growth**
   - Ensure cleanup scheduler is running
   - Check `expires_at` values are correct
   - Monitor table sizes

### Debug Commands

```sql
-- Check recent email activity
SELECT 
  email_type,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM email_idempotency_keys 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY email_type;

-- Check duplicate prevention events
SELECT 
  email_type,
  COUNT(*) as prevented_count
FROM email_deduplication_log 
WHERE prevented_at > NOW() - INTERVAL '24 hours'
GROUP BY email_type;

-- Check retry patterns
SELECT 
  attempt_number,
  COUNT(*) as count
FROM email_send_attempts 
WHERE attempted_at > NOW() - INTERVAL '24 hours'
GROUP BY attempt_number
ORDER BY attempt_number;
```

### Log Messages

Key log patterns to monitor:
- `[EMAIL_DEDUP] Email sent successfully with key: {key}`
- `[EMAIL_DEDUP] Duplicate email prevented for {email}`
- `[EMAIL_DEDUP] Content duplicate prevented for {email}`
- `[EMAIL_CLEANUP_SCHEDULER] Cleanup completed successfully`

## Security Considerations

1. **Data Privacy**: Email addresses are stored in logs - ensure compliance with privacy policies
2. **Key Generation**: Idempotency keys are deterministic but not reversible
3. **Access Control**: Admin-only access to cleanup and monitoring endpoints
4. **Data Retention**: Automatic cleanup ensures data doesn't accumulate indefinitely

## Performance Considerations

1. **Database Indexes**: Optimized indexes on frequently queried columns
2. **Cleanup Frequency**: Daily cleanup balances storage and performance
3. **Query Optimization**: Efficient queries for duplicate detection
4. **Rate Limiting**: 100ms delay between campaign emails to prevent SMTP overload

## Future Enhancements

Potential improvements:
1. **Configurable Time Windows**: Per-email-type deduplication windows
2. **Machine Learning**: AI-based duplicate detection for content similarity
3. **Advanced Analytics**: Email engagement correlation with deduplication
4. **Multi-Channel**: Extend to SMS and other notification channels
5. **A/B Testing**: Test different deduplication strategies

---

## Support

For technical support or questions about the email deduplication system:
1. Check the monitoring dashboard at `/email-monitoring`
2. Review server logs for error messages
3. Use the manual cleanup tool for immediate issues
4. Contact the development team for configuration changes 