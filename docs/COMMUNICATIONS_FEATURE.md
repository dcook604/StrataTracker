# Communications Feature Documentation

## 📧 Overview

The Communications feature enables administrators and council members to send newsletters, announcements, and updates to residents through a comprehensive email management system. It integrates seamlessly with existing SMTP settings and provides sophisticated recipient targeting based on property units and resident roles.

## 🎯 Key Features

### 📨 Campaign Management
- **Campaign Types**: Newsletter, Announcement, Update, Emergency
- **Status Tracking**: Draft, Scheduled, Sending, Sent, Failed
- **Delivery Analytics**: Success/failure rates, recipient counts
- **HTML & Plain Text**: Automatic plain text generation from HTML content

### 📝 Template System
- **Reusable Templates**: Save frequently used email formats
- **Type-Specific Templates**: Organized by communication type
- **Default Templates**: Mark templates as defaults for quick access
- **Template Library**: Centralized template management

### 👥 Advanced Recipient Targeting
- **All Residents**: Everyone with email notifications enabled
- **Owners Only**: Property owners exclusively
- **Tenants Only**: Tenants exclusively
- **Specific Units**: Target selected units and their residents
- **Individual Selection**: Hand-pick specific recipients

### 📊 Delivery Tracking
- **Real-time Status**: Track email delivery in real-time
- **Error Reporting**: Detailed error messages for failed deliveries
- **Delivery Timestamps**: Track when emails were sent
- **Bounce Handling**: Handle bounced emails appropriately

## 🏗️ Technical Architecture

### Database Schema

```sql
-- Communication campaigns
communication_campaigns (
  id, uuid, title, type, status, subject, content,
  plain_text_content, scheduled_at, sent_at, 
  created_by_id, created_at, updated_at
)

-- Campaign recipients with delivery tracking
communication_recipients (
  id, campaign_id, recipient_type, unit_id, person_id,
  email, recipient_name, status, sent_at, error_message, created_at
)

-- Reusable email templates
communication_templates (
  id, uuid, name, type, subject, content,
  is_default, created_by_id, created_at, updated_at
)
```

### API Endpoints

#### Campaign Management
```http
GET    /api/communications/campaigns           # List all campaigns
GET    /api/communications/campaigns/:id       # Get specific campaign
POST   /api/communications/campaigns           # Create new campaign
PUT    /api/communications/campaigns/:id       # Update campaign
POST   /api/communications/campaigns/:id/send  # Send campaign
```

#### Template Management
```http
GET    /api/communications/templates    # List all templates
POST   /api/communications/templates    # Create new template
PUT    /api/communications/templates/:id # Update template
DELETE /api/communications/templates/:id # Delete template
```

#### Recipient Management
```http
POST   /api/communications/recipients/preview  # Preview recipients
GET    /api/communications/units              # Get available units
```

## 🔧 Configuration & Setup

### SMTP Integration

The Communications feature automatically uses SMTP settings configured in the system settings page. No additional configuration is required.

#### SMTP Configuration Format
SMTP settings are stored in the `system_settings` table as JSON:

```json
{
  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-email@example.com",
    "pass": "your-password"
  },
  "from": "noreply@yourcompany.com"
}
```

#### Email Service Integration
```typescript
// Automatically loads SMTP configuration from database
const config = await loadEmailSettings();

// Uses configured SMTP for all communications
await sendEmail({
  to: recipient.email,
  subject: campaign.subject,
  html: campaign.content,
  text: campaign.plainTextContent
});
```

### Development Setup

**Critical**: Always use the startup script for development:

```bash
# Start both frontend and backend servers
sh start-dev.sh

# This script:
# - Finds available ports automatically
# - Starts backend on port 3001 (or next available)
# - Starts frontend on next available port
# - Provides proper cleanup on exit
```

### Database Migration

```bash
# Apply communications migration (usually automatic)
sudo docker exec -i stratatracker-db-1 psql -U spectrum4 -d spectrum4 < migrations/0003_communications_schema.sql

# Verify tables were created
sudo docker exec -i stratatracker-db-1 psql -U spectrum4 -d spectrum4 -c "\\dt" | grep communication
```

## 🔐 Security & Access Control

### Authentication Requirements
- **Role-Based Access**: Admin and Council members only
- **Session-Based Authentication**: Uses existing session management
- **API Security**: All endpoints require authentication

### Data Protection
- **Email Validation**: All email addresses validated before sending
- **Input Sanitization**: XSS protection on all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **Audit Trail**: All campaign creation tracked with user attribution

### Access Control Implementation
```typescript
const ensureCouncilOrAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user && 
      (req.user.isCouncilMember || req.user.isAdmin)) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin or Council access required" });
};
```

## 👤 User Guide

### Accessing Communications
1. Log in as Admin or Council member
2. Navigate to "Communications" in the sidebar (under "All Violations")
3. Choose between "Campaigns" and "Templates" tabs

### Creating a Campaign

#### Step 1: Basic Information
- **Title**: Internal name for the campaign
- **Type**: Newsletter, Announcement, Update, or Emergency
- **Subject**: Email subject line recipients will see

#### Step 2: Content Creation
- **Message Content**: HTML email content
- **Template Usage**: Optionally start from an existing template
- **Plain Text**: Automatically generated from HTML

#### Step 3: Recipient Selection
- **All Residents**: Send to everyone with notifications enabled
- **Owners Only**: Send only to property owners
- **Tenants Only**: Send only to tenants
- **Specific Units**: Select individual units
- **Individual Recipients**: Hand-pick specific people

#### Step 4: Review & Send
- **Preview Recipients**: Review who will receive the email
- **Save as Draft**: Save for later sending
- **Send Immediately**: Begin email delivery process

### Managing Templates

#### Creating Templates
1. Go to "Templates" tab
2. Click "New Template"
3. Fill in template details:
   - Name (for internal reference)
   - Type (newsletter, announcement, etc.)
   - Subject (default subject line)
   - Content (reusable email content)
4. Mark as default if desired

#### Using Templates
- Select template when creating new campaign
- Content and subject automatically populated
- Customize as needed for specific campaign

### Monitoring Delivery

#### Campaign Status
- **Draft**: Not yet sent
- **Sending**: Currently delivering emails
- **Sent**: All emails delivered successfully
- **Failed**: Some or all emails failed to deliver

#### Delivery Analytics
- **Total Recipients**: Number of people targeted
- **Sent Count**: Successfully delivered emails
- **Failed Count**: Failed delivery attempts
- **Error Details**: Specific error messages for failures

## ⚡ Performance & Best Practices

### Email Delivery Optimization
- **Asynchronous Processing**: Emails sent in background
- **Rate Limiting**: 100ms delay between emails to avoid SMTP overwhelm
- **Error Handling**: Comprehensive retry logic for temporary failures
- **Status Tracking**: Real-time delivery status updates

### Database Performance
- **Indexed Queries**: Optimized database queries for recipient selection
- **Efficient Joins**: Minimal database round trips
- **Connection Pooling**: Shared database connections
- **Cascade Operations**: Automatic cleanup of related records

### Frontend Performance
- **Lazy Loading**: Components loaded as needed
- **Optimistic Updates**: UI updates before server confirmation
- **Caching**: React Query caching for frequently accessed data
- **Code Splitting**: Automatic route-based code splitting

## 🚨 Troubleshooting

### Common Issues

#### Email Delivery Problems
```bash
# Check SMTP configuration
curl -X GET http://localhost:3001/api/settings/email_config

# Verify email service is loaded
# Check application logs for email service errors
sudo docker compose logs backend | grep -i email
```

#### Database Connection Issues
```bash
# Verify communications tables exist
sudo docker exec -i stratatracker-db-1 psql -U spectrum4 -d spectrum4 -c "\\dt" | grep communication

# Check table structure
sudo docker exec -i stratatracker-db-1 psql -U spectrum4 -d spectrum4 -c "\\d communication_campaigns"
```

#### API Access Problems
```bash
# Test API authentication
curl -s -w "%{http_code}" http://localhost:3001/api/communications/campaigns
# Should return 403 (Forbidden) if not authenticated
# Should return 200 with data if properly authenticated
```

#### Frontend Loading Issues
```bash
# Verify frontend is accessible
curl -s -w "%{http_code}" http://localhost:5175/communications
# Should return 200

# Check for JavaScript errors in browser console
# Ensure user has Admin or Council member permissions
```

### Performance Issues

#### Slow Email Delivery
- Check SMTP server response times
- Verify email content size (large HTML/images slow delivery)
- Monitor network connectivity to SMTP server
- Consider reducing recipient batch sizes

#### Database Performance
- Check recipient query performance for large unit counts
- Monitor database connection pool usage
- Verify indexes are in place on foreign keys

### Error Resolution

#### Failed Email Deliveries
1. Check error messages in campaign recipient details
2. Verify SMTP credentials are correct
3. Check recipient email addresses for validity
4. Monitor SMTP server logs if accessible

#### Template/Campaign Creation Failures
1. Verify user has proper permissions (Admin/Council)
2. Check input validation errors
3. Ensure database connectivity
4. Review application logs for specific errors

## 📈 Monitoring & Analytics

### Delivery Metrics
- Campaign completion rates
- Average delivery times
- Bounce/failure rates by SMTP configuration
- Recipient engagement patterns

### System Health
- Email service availability
- Database query performance
- API response times
- Frontend loading performance

### Audit Logging
- All campaign creation/modification logged
- Email delivery attempts tracked
- User access patterns monitored
- Error rates and patterns analyzed

## 🔮 Future Enhancements

### Planned Features
- **Email Templates**: Rich text editor for email composition
- **Scheduled Sending**: Send campaigns at specified times
- **Delivery Reports**: Detailed analytics and reporting
- **A/B Testing**: Split testing for subject lines and content
- **Personalization**: Dynamic content based on recipient data

### Technical Improvements
- **Queue System**: Background job processing for large campaigns
- **Caching Layer**: Redis for improved performance
- **Webhook Integration**: Third-party service integrations
- **API Rate Limiting**: More sophisticated rate limiting
- **Mobile Optimization**: Enhanced mobile experience

---

## 📞 Support

### Documentation Resources
- [Technical Overview](./TECHNICAL_OVERVIEW.md) - Complete system architecture
- [Migration Guide](./MIGRATION_GUIDE.md) - Setup and migration information
- [API Documentation](./API_DOCUMENTATION.md) - Detailed API reference

### Getting Help
1. Check this documentation first
2. Review application logs for specific errors
3. Consult troubleshooting section above
4. Create detailed issue report with error messages and steps to reproduce

---

**Communications feature provides comprehensive email management capabilities integrated seamlessly with StrataTracker's existing user management and SMTP configuration systems.** 