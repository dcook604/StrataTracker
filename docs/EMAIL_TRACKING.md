# Email Tracking & Communications Enhancement

## 📧 Overview

The Communications feature has been enhanced with comprehensive email tracking capabilities, enabling detailed analytics and improved recipient management for strata community communications.

## ✨ Features

### 1. Enhanced Recipient Selection
- **All Residents**: Send to all property owners and tenants
- **Owners Only**: Target property owners specifically
- **Tenants Only**: Target tenants specifically  
- **Specific Units**: Select individual units with search/filter capability
- **Individual Recipients**: Choose specific people from the database
- **Manual Email Entry**: Add external email addresses with optional names

### 2. Email Tracking System
- **Open Tracking**: 1x1 transparent pixel tracking
- **Click Tracking**: Automatic link wrapping with redirect tracking
- **Event Logging**: IP addresses, user agents, timestamps
- **Privacy-Conscious**: Handles modern email client privacy features

### 3. Analytics & Reporting
- **Campaign Analytics**: Delivery rates, open rates, click rates
- **Individual Tracking**: Per-recipient engagement metrics
- **Timeline Analysis**: Engagement patterns over time
- **Export Capabilities**: Data export for further analysis

## 🗄️ Database Schema

### New Tables

#### `email_tracking_events`
Stores all email interaction events (opens, clicks, bounces, unsubscribes).

```sql
CREATE TABLE "email_tracking_events" (
  "id" serial PRIMARY KEY,
  "campaign_id" integer NOT NULL,
  "recipient_id" integer NOT NULL, 
  "tracking_id" text NOT NULL,
  "event_type" text NOT NULL, -- 'open', 'click', 'bounce', 'unsubscribe'
  "event_data" jsonb,
  "timestamp" timestamp DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text
);
```

#### `manual_email_recipients`
Stores manually entered email addresses for campaigns.

```sql
CREATE TABLE "manual_email_recipients" (
  "id" serial PRIMARY KEY,
  "campaign_id" integer NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

### Enhanced Tables

#### `communication_recipients`
Added tracking capabilities:
- `tracking_id` (text, unique): Unique identifier for tracking each recipient

### Relations & Indexes
- Foreign key constraints for data integrity
- Optimized indexes on `campaign_id`, `tracking_id`, `event_type`, `timestamp`
- Cascade deletions for campaign cleanup

## 🔧 API Endpoints

### Campaign Management

#### `GET /api/communications/campaigns`
Returns campaigns with enhanced tracking statistics.

**Response Enhancement:**
```json
{
  "id": 1,
  "title": "Monthly Newsletter",
  "totalRecipients": 150,
  "sentCount": 148,
  "failedCount": 2,
  "openCount": 95,
  "clickCount": 32,
  "uniqueOpens": 89,
  "openRate": "60.14"
}
```

#### `POST /api/communications/campaigns`
Create campaign with enhanced recipient options.

**Request Body:**
```json
{
  "title": "Community Update",
  "type": "announcement",
  "subject": "Important Community Update",
  "content": "<p>Message content...</p>",
  "recipientType": "manual",
  "manualEmails": [
    {
      "email": "resident@example.com",
      "name": "John Doe"
    }
  ]
}
```

### Tracking Endpoints

#### `GET /api/communications/track/open/:trackingId`
Records email open events and returns 1x1 transparent pixel.

**Behavior:**
- Logs open event with IP, user agent, timestamp
- Returns 1x1 GIF pixel
- Handles tracking pixel blocks gracefully

#### `GET /api/communications/track/click/:trackingId?url=<target_url>`
Records click events and redirects to target URL.

**Parameters:**
- `trackingId`: Unique recipient tracking identifier
- `url`: Target URL to redirect to after logging

### Analytics Endpoints

#### `GET /api/communications/campaigns/:id/analytics`
Comprehensive campaign analytics.

**Response:**
```json
{
  "campaign": { /* campaign details */ },
  "delivery": {
    "totalRecipients": 150,
    "sentCount": 148,
    "failedCount": 2,
    "pendingCount": 0
  },
  "engagement": {
    "totalOpens": 245,
    "uniqueOpens": 89,
    "totalClicks": 32,
    "uniqueClicks": 28
  },
  "metrics": {
    "deliveryRate": "98.67",
    "openRate": "60.14",
    "clickRate": "18.92",
    "clickToOpenRate": "31.46"
  },
  "timeline": [
    {
      "date": "2024-01-15",
      "eventType": "open",
      "count": 45
    }
  ]
}
```

#### `GET /api/communications/campaigns/:id/recipients`
Individual recipient tracking details.

**Response:**
```json
[
  {
    "id": 1,
    "email": "resident@example.com",
    "recipientName": "John Doe",
    "status": "sent",
    "sentAt": "2024-01-15T10:00:00Z",
    "openCount": 3,
    "clickCount": 1,
    "lastOpenAt": "2024-01-15T14:30:00Z",
    "lastClickAt": "2024-01-15T14:32:00Z"
  }
]
```

### Recipient Management

#### `POST /api/communications/recipients/preview`
Preview recipients for targeting options.

**Request:**
```json
{
  "recipientType": "units",
  "unitIds": [1, 2, 3]
}
```

**Response:**
```json
{
  "count": 5,
  "recipients": [
    {
      "email": "owner@example.com",
      "recipientName": "Jane Smith",
      "recipientType": "units"
    }
  ],
  "totalCount": 5
}
```

#### `GET /api/communications/units`
Get all units for recipient selection.

## 🎨 Frontend Components

### Enhanced Campaign Creation
```typescript
// Recipient type selection with conditional UI
const recipientType = form.watch("recipientType");

// Unit selection with checkboxes
{recipientType === "units" && (
  <UnitSelectionComponent 
    units={units}
    selectedUnits={selectedUnits}
    onUnitSelection={handleUnitSelection}
  />
)}

// Manual email entry
{recipientType === "manual" && (
  <ManualEmailEntryComponent
    emails={manualEmails}
    onAddEmail={handleAddEmail}
    onRemoveEmail={handleRemoveEmail}
  />
)}
```

### Analytics Dashboard
```typescript
// Campaign analytics with real-time metrics
<AnalyticsDialog campaign={selectedCampaign}>
  <MetricsGrid analytics={analytics} />
  <TimelineChart data={analytics.timeline} />
  <RecipientTable recipients={recipients} />
</AnalyticsDialog>
```

## 🔒 Security & Privacy

### Data Protection
- **Tracking IDs**: Cryptographically secure random identifiers
- **Privacy Compliance**: Respects email client privacy features
- **Data Retention**: Configurable retention policies for tracking data
- **IP Anonymization**: Optional IP address anonymization

### Rate Limiting
- **Email Sending**: 100ms delay between emails to prevent SMTP overwhelm
- **API Protection**: Rate limiting on tracking endpoints
- **Error Handling**: Graceful degradation when tracking fails

## 🚀 Usage Examples

### Creating a Campaign with Manual Emails
```typescript
const campaignData = {
  title: "Emergency Maintenance Notice",
  type: "emergency",
  subject: "URGENT: Water Shut-off Tomorrow",
  content: "<h2>Important Notice</h2><p>Water will be shut off...</p>",
  recipientType: "manual",
  manualEmails: [
    { email: "contractor@example.com", name: "Maintenance Team" },
    { email: "emergency@city.gov", name: "City Emergency" }
  ]
};

await createCampaign(campaignData);
```

### Analyzing Campaign Performance
```typescript
// Get comprehensive analytics
const analytics = await getCampaignAnalytics(campaignId);

console.log(`Delivery Rate: ${analytics.metrics.deliveryRate}%`);
console.log(`Open Rate: ${analytics.metrics.openRate}%`);
console.log(`Click Rate: ${analytics.metrics.clickRate}%`);

// Get individual recipient performance
const recipients = await getCampaignRecipients(campaignId);
const topEngagers = recipients
  .filter(r => r.openCount > 0)
  .sort((a, b) => b.openCount - a.openCount);
```

### Email Content with Tracking
```html
<!-- Tracking is automatically injected -->
<html>
  <body>
    <h2>Monthly Newsletter</h2>
    <p>Check out our <a href="https://example.com/updates">latest updates</a></p>
    
    <!-- Tracking pixel automatically added -->
    <img src="/api/communications/track/open/abc123..." width="1" height="1" />
  </body>
</html>
```

## 🛠️ Technical Implementation

### Email Processing Pipeline
1. **Campaign Creation**: Recipients generated based on selection criteria
2. **Tracking Setup**: Unique tracking IDs assigned to each recipient
3. **Content Processing**: Links wrapped, tracking pixel injected
4. **Email Sending**: Rate-limited dispatch with error handling
5. **Event Tracking**: Real-time event capture and storage

### Link Tracking Implementation
```typescript
// Automatic link wrapping during email processing
emailContent = emailContent.replace(
  /<a\s+href="([^"]+)"/g,
  `<a href="${baseUrl}/api/communications/track/click/${trackingId}?url=$1"`
);
```

### Error Handling Strategy
- **Graceful Degradation**: Tracking failures don't block email delivery
- **Retry Logic**: Automatic retries for transient failures
- **Status Tracking**: Detailed status for each recipient
- **Monitoring**: Error logging and alerting

## 📊 Performance Considerations

### Database Optimization
- **Indexes**: Strategic indexing on high-query columns
- **Partitioning**: Consider time-based partitioning for large datasets
- **Archival**: Automated archival of old tracking data

### Scalability
- **Async Processing**: Background email sending
- **Batch Operations**: Bulk database operations
- **Caching**: Analytics caching for frequently accessed data

## 🧪 Testing

### Unit Tests
```typescript
describe('Email Tracking', () => {
  it('should record open events', async () => {
    const response = await request(app)
      .get(`/api/communications/track/open/${trackingId}`)
      .expect(200);
    
    expect(response.headers['content-type']).toBe('image/gif');
  });

  it('should track click events and redirect', async () => {
    const targetUrl = 'https://example.com';
    const response = await request(app)
      .get(`/api/communications/track/click/${trackingId}?url=${targetUrl}`)
      .expect(302);
    
    expect(response.headers.location).toBe(targetUrl);
  });
});
```

### Integration Tests
- Campaign creation with different recipient types
- Email sending with tracking injection
- Analytics calculation accuracy
- Privacy compliance verification

## 🔄 Migration Guide

### Database Migration
```sql
-- Run the provided migration
\i migrations/0008_email_tracking_enhancements.sql

-- Verify tables created
\dt email_tracking_events
\dt manual_email_recipients
\d communication_recipients
```

### Existing Data
- Existing campaigns will have tracking IDs automatically generated
- Historical campaigns won't have tracking data (expected behavior)
- Templates remain unchanged and compatible

## 📈 Future Enhancements

### Planned Features
- **A/B Testing**: Subject line and content testing
- **Segmentation**: Advanced recipient segmentation
- **Automation**: Triggered email campaigns
- **Integration**: Third-party email service providers
- **Mobile App**: Push notification integration

### Analytics Expansion
- **Heatmaps**: Email content interaction heatmaps
- **Geographic Data**: Location-based analytics
- **Device Analytics**: Open/click patterns by device type
- **Engagement Scoring**: Recipient engagement scoring system

## 🆘 Troubleshooting

### Common Issues

#### Tracking Not Working
1. **Check Environment**: Ensure `APP_URL` is configured correctly
2. **Database Connection**: Verify database connectivity
3. **Email Client**: Test with different email clients
4. **Privacy Settings**: Account for privacy protection features

#### Low Open Rates
1. **Subject Lines**: Test different subject line approaches
2. **Send Times**: Analyze optimal sending times
3. **Content Quality**: Review message content and formatting
4. **Spam Filters**: Check spam filter compliance

#### Performance Issues
1. **Database Queries**: Analyze slow queries with EXPLAIN
2. **Indexing**: Ensure proper indexes on tracking tables
3. **Email Rate**: Adjust sending rate limits
4. **Cache**: Implement analytics caching

### Debug Commands
```bash
# Check database schema
psql $DATABASE_URL -c "\d email_tracking_events"

# View recent tracking events
psql $DATABASE_URL -c "SELECT * FROM email_tracking_events ORDER BY timestamp DESC LIMIT 10"

# Campaign analytics query
psql $DATABASE_URL -c "
SELECT 
  c.title,
  COUNT(r.id) as total_recipients,
  COUNT(e.id) as total_events
FROM communication_campaigns c
LEFT JOIN communication_recipients r ON c.id = r.campaign_id
LEFT JOIN email_tracking_events e ON r.id = e.recipient_id
GROUP BY c.id, c.title
ORDER BY c.created_at DESC;
"
```

## 📚 References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Email Deliverability Best Practices](https://postmarkapp.com/guides/email-deliverability)
- [GDPR Email Marketing Compliance](https://gdpr-info.eu/)
- [Email Client Privacy Features](https://www.litmus.com/blog/apples-mail-privacy-protection/)

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Authors**: Development Team 