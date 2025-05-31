# StrataTracker - Quick Development Reference

## 🚀 **LATEST STATUS (January 8, 2025)**
- ✅ **Email Deduplication System** - PRODUCTION READY
- ✅ **UUID Migration System** - COMPLETE  
- ✅ **Navigation Alphabetization** - COMPLETE
- ⚡ **System Status**: Fully operational, managing real strata data

---

## 📧 **EMAIL SYSTEM - CRITICAL**

### ✅ ALWAYS USE (Prevents Duplicates)
```typescript
import { sendEmailWithDeduplication } from './email-deduplication';

await sendEmailWithDeduplication({
  to: 'user@example.com',
  subject: 'Violation Notification',
  emailType: 'violation_notification',
  metadata: { violationId: 123 }
});
```

### ❌ NEVER USE (Causes Duplicates)
```typescript
import { sendEmail } from './email-service';
await sendEmail(data); // This bypasses deduplication!
```

---

## 🗂️ **DATABASE INFO**

### Connection
```
DATABASE_URL="postgres://spectrum4:spectrum4password@localhost:5432/spectrum4"
```

### Recent Tables (Migration 0004)
- `email_idempotency_keys` - Prevents duplicate sends
- `email_send_attempts` - Tracks retries  
- `email_deduplication_log` - Monitors blocked duplicates

### Quick Commands
```bash
npm run db:push              # Sync schema changes
npm run dev                  # Start development
psql $DATABASE_URL           # Database console
```

---

## 🧭 **NAVIGATION ORDER (Maintained)**
1. **Dashboard** (always first)
2. All Violations  
3. Bylaws
4. Categories
5. Communications
6. New Violation
7. Reports
8. Settings
9. Units

*File: `client/src/components/sidebar.tsx`*

---

## 📊 **MONITORING & HEALTH**

### Email System Health
- **Monitor**: Visit `/email-monitoring` page
- **Stats API**: `GET /api/communications/email-stats?hours=24`
- **Cleanup**: Daily at 2 AM Vancouver time
- **Manual Cleanup**: `POST /api/communications/email-cleanup`

### System Health Check
```bash
curl -s http://localhost:3001/api/health/db | jq
curl -s http://localhost:3001/api/communications/email-stats?hours=24 | jq
```

---

## 🔧 **KEY FILES TO KNOW**

### Email System
- `server/email-deduplication.ts` - Core service
- `server/email-cleanup-scheduler.ts` - Daily maintenance
- `client/src/pages/email-monitoring.tsx` - Admin dashboard

### Core System
- `shared/schema.ts` - Database schema
- `server/storage.ts` - Database operations
- `client/src/components/sidebar.tsx` - Navigation

### Documentation
- `docs/EMAIL_DEDUPLICATION_SYSTEM.md` - Complete email guide
- `.cursorrules` - Development context
- `docs/SESSION_SUMMARY_2025-01-08.md` - Latest changes

---

## ⚡ **QUICK START**
```bash
# Start development
npm run dev

# Database operations  
npm run db:push
npm run db:studio

# Check email system
curl localhost:3001/api/communications/email-stats?hours=1
```

---

## 🚨 **CRITICAL RULES**

1. **ALL email sends** → Use `sendEmailWithDeduplication()`
2. **Navigation changes** → Keep Dashboard first, others alphabetical
3. **Database changes** → Always migrate and document
4. **UUID support** → Maintain for violations (backward compatible)
5. **Documentation** → Update for architectural changes

---

## 🎯 **NEXT PRIORITIES**
1. Add email monitoring to navigation
2. Performance testing under load
3. Rich text editor for campaigns
4. Advanced analytics integration

---

**System is PRODUCTION READY - Handle with care!** 🏆 