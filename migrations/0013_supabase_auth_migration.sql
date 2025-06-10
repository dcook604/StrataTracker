-- Migration: Supabase Auth Migration
-- Date: 2025-01-08
-- Description: Migrate from local users table to Supabase Auth with profiles table

-- Step 1: Create the new profiles table
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);

-- Step 2: Add new columns to tables that reference users, keeping old columns temporarily
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "updated_by_id_new" uuid;
ALTER TABLE "violations" ADD COLUMN IF NOT EXISTS "reported_by_id_new" uuid;
ALTER TABLE "violation_histories" ADD COLUMN IF NOT EXISTS "user_id_new" uuid;
ALTER TABLE "communication_campaigns" ADD COLUMN IF NOT EXISTS "created_by_id_new" uuid;
ALTER TABLE "communication_templates" ADD COLUMN IF NOT EXISTS "created_by_id_new" uuid;
ALTER TABLE "bylaws" ADD COLUMN IF NOT EXISTS "created_by_id_new" uuid;
ALTER TABLE "bylaws" ADD COLUMN IF NOT EXISTS "updated_by_id_new" uuid;
ALTER TABLE "bylaw_revisions" ADD COLUMN IF NOT EXISTS "created_by_id_new" uuid;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_id_new" uuid;
ALTER TABLE "admin_announcements" ADD COLUMN IF NOT EXISTS "created_by_new" uuid;
ALTER TABLE "admin_announcements" ADD COLUMN IF NOT EXISTS "updated_by_new" uuid;

-- Step 3: Add foreign key constraints for new columns (will be populated after migration script runs)
-- These will be added after the migration script populates the profiles table

-- Step 4: Drop the public_user_sessions table as it's no longer needed
DROP TABLE IF EXISTS "public_user_sessions";

-- Step 5: Update violation_histories table structure
ALTER TABLE "violation_histories" DROP COLUMN IF EXISTS "comment";
ALTER TABLE "violation_histories" ADD COLUMN IF NOT EXISTS "details" jsonb;

-- Note: The actual data migration will be handled by the migration script
-- After running the migration script:
-- 1. The profiles table will be populated with user data from Supabase
-- 2. The new foreign key columns will be populated with appropriate UUIDs
-- 3. The old columns and users table can be dropped in a subsequent migration 