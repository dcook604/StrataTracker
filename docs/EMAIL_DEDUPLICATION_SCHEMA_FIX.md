# Email Deduplication Schema Fix

**Date:** 2025-07-01  
**Issue:** Database schema mismatch causing runtime errors  
**Status:** ✅ RESOLVED - Migration created  

## Problem Summary

The StrataTracker application is failing with database column errors related to the email deduplication system:

```sql
ERROR: column "idempotency_key" does not exist at character 8
ERROR: column "status" does not exist at character 24  
ERROR: column "attempt_number" does not exist at character 24
ERROR: column email_deduplication_log.prevented_at does not exist
```

## Root Cause

The email deduplication tables exist in the database but are missing required columns. This indicates:

1. **Partial Migration**: The email deduplication tables were created but without all required columns
2. **Schema Drift**: The application code expects a newer schema than what's deployed
3. **Migration Gap**: The comprehensive schema fix (`0014_comprehensive_production_schema_fix.sql`) didn't include the complete email deduplication schema

## Solution: Schema Fix Migration

### Created Files

1. **Migration**: `migrations/0015_fix_email_deduplication_schema.sql`
   - Adds missing columns to existing tables
   - Includes proper constraints and indexes  
   - Safe for production (uses `ADD COLUMN IF NOT EXISTS`)

2. **Application Script**: `scripts/apply-migration.sh`
   - Safe migration application with backups
   - Validation and testing
   - Production-ready with confirmations

### Migration Details

The fix addresses these specific issues:

#### `email_idempotency_keys` table missing:
- `idempotency_key` (text, unique)
- `status` (text, default 'sent')
- `email_type` (text)
- `recipient_email` (text)
- `email_hash` (text)
- `sent_at` (timestamp)
- `metadata` (jsonb)
- `expires_at` (timestamp)

#### `email_send_attempts` table missing:
- `attempt_number` (integer, default 1)
- `status` (text)
- `error_message` (text)
- `attempted_at` (timestamp)
- `completed_at` (timestamp)
- `idempotency_key` (text, foreign key)

#### `email_deduplication_log` table missing:
- `prevented_at` (timestamp)
- `recipient_email` (text)
- `email_type` (text)
- `content_hash` (text)
- `original_idempotency_key` (text)
- `duplicate_idempotency_key` (text)
- `metadata` (jsonb)

## How to Apply the Fix

### Option 1: Using Docker (Recommended for Coolify)

```bash
# Connect to your Coolify database container
docker exec -it <postgres_container> psql -U spectrum4 -d spectrum4

# Copy and paste the migration SQL
\i migrations/0015_fix_email_deduplication_schema.sql
```

### Option 2: Using the Migration Script

```bash
# Set database connection (adjust for your Coolify setup)
export DATABASE_URL="postgres://spectrum4:your_password@postgres:5432/spectrum4"

# Apply the migration
./scripts/apply-migration.sh migrations/0015_fix_email_deduplication_schema.sql
```

### Option 3: Direct SQL Application

```bash
# Connect directly to database
psql "postgres://spectrum4:password@your-db-host:5432/spectrum4" \
  -f migrations/0015_fix_email_deduplication_schema.sql
```

## Verification

After applying the migration, verify the fix:

```sql
-- Test the previously failing queries
SELECT idempotency_key FROM email_idempotency_keys LIMIT 1;
SELECT status FROM email_idempotency_keys LIMIT 1;
SELECT attempt_number FROM email_send_attempts LIMIT 1;
SELECT prevented_at FROM email_deduplication_log LIMIT 1;
```

All should return successfully (even if no rows exist).

## For Coolify Deployment

### Environment Setup

Ensure these environment variables are set in Coolify:

```env
# Database connection (internal Docker network)
DATABASE_URL=postgres://spectrum4:your_password@postgres:5432/spectrum4

# Email deduplication settings  
EMAIL_DEDUP_TTL_HOURS=24
EMAIL_CLEANUP_ENABLED=true
EMAIL_RATE_LIMIT_MS=100
```

### Post-Migration Steps

1. **Restart Application**: Restart the StrataTracker container
2. **Monitor Logs**: Check for email deduplication errors
3. **Test Email Functions**: Verify violation notifications work
4. **Check Cleanup Scheduler**: Ensure daily cleanup runs at 2 AM

## Prevention

To prevent this issue in future deployments:

### 1. Migration Ordering
Ensure migrations run in correct order:
```bash
# Check migration history
SELECT * FROM drizzle.__drizzle_migrations ORDER BY id;
```

### 2. Schema Validation
Add to deployment pipeline:
```bash
# Validate critical tables exist with required columns
./scripts/test-cors-config.sh  # Includes basic schema validation
```

### 3. Environment Parity
Keep development, staging, and production schemas synchronized:
```bash
# Export production schema
pg_dump $DATABASE_URL --schema-only > production_schema.sql

# Compare with local
diff production_schema.sql local_schema.sql
```

## Technical Background

### Email Deduplication System

The email deduplication system prevents duplicate email notifications:

1. **Idempotency Keys**: Unique identifiers for each email send
2. **Content Hashing**: Prevents duplicate content to same recipient  
3. **Retry Tracking**: Monitors failed send attempts
4. **Cleanup Scheduler**: Removes old records (daily at 2 AM Vancouver time)

### Integration Points

- **Violation Notifications**: Uses `sendEmailWithDeduplication()`
- **Campaign Emails**: 100ms rate limiting between sends
- **Admin Notifications**: All admin emails use deduplication
- **Monitoring Dashboard**: Available at `/email-monitoring`

## Related Documentation

- `docs/EMAIL_DEDUPLICATION_SYSTEM.md` - Complete system documentation
- `docs/CORS_CONFIGURATION_GUIDE.md` - CORS and production deployment
- `.cursorrules` - Current system state and guidelines

---

**Status**: ✅ Ready to deploy  
**Risk Level**: 🟢 Low (safe migration with IF NOT EXISTS)  
**Deployment Time**: ~2 minutes  
**Downtime Required**: None (can be applied while app is running) 