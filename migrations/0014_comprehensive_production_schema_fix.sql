-- Migration: Comprehensive Production Schema Fix  
-- Date: 2025-06-30
-- Description: Complete database schema with all missing tables, columns, and foreign key fixes
-- This ensures new Coolify deployments work out of the box

-- =====================================
-- STEP 1: CORE TABLES AND FIXES
-- =====================================

-- Ensure profiles table exists (Supabase auth)
CREATE TABLE IF NOT EXISTS "profiles" (
    "id" uuid PRIMARY KEY NOT NULL,
    "full_name" text,
    "role" text DEFAULT 'user' NOT NULL,
    "updated_at" timestamp DEFAULT now(),
    "created_at" timestamp DEFAULT now()
);

-- Property units table with all required columns
CREATE TABLE IF NOT EXISTS "property_units" (
    "id" serial PRIMARY KEY NOT NULL,
    "customer_id" integer,
    "unit_number" text NOT NULL UNIQUE,
    "strata_lot" text,
    "floor" text,
    "townhouse" boolean DEFAULT false NOT NULL,
    -- Mailing address fields
    "mailing_street1" text,
    "mailing_street2" text,
    "mailing_city" text,
    "mailing_state_province" text,
    "mailing_postal_code" text,
    "mailing_country" text,
    -- Contact and notes
    "phone" text,
    "notes" text,
    -- Deprecated fields (maintained for backward compatibility)
    "owner_name" text,
    "owner_email" text,
    "tenant_name" text,
    "tenant_email" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Violation categories table
CREATE TABLE IF NOT EXISTS "violation_categories" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "description" text,
    "bylaw_reference" text,
    "default_fine_amount" integer,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- System settings table with UUID foreign key
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "setting_key" text NOT NULL UNIQUE,
    "setting_value" text,
    "description" text,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "updated_by_id" uuid REFERENCES profiles(id)
);

-- Violations table with complete schema and UUID support
CREATE TABLE IF NOT EXISTS "violations" (
    "id" serial PRIMARY KEY NOT NULL,
    "uuid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "reference_number" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "unit_id" integer NOT NULL REFERENCES property_units(id),
    "reported_by_id" uuid REFERENCES profiles(id),
    "category_id" integer REFERENCES violation_categories(id),
    "violation_type" text NOT NULL,
    "violation_date" timestamp NOT NULL,
    "violation_time" text,
    "description" text NOT NULL,
    "bylaw_reference" text,
    "status" text DEFAULT 'pending_approval' NOT NULL,
    "fine_amount" integer,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "attachments" jsonb DEFAULT '[]',
    "pdf_generated" boolean DEFAULT false,
    "pdf_path" text,
    -- Enhanced violation fields
    "incident_area" text,
    "concierge_name" text,
    "people_involved" text,
    "noticed_by" text,
    "damage_to_property" text,
    "damage_details" text,
    "police_involved" text,
    "police_details" text
);

-- Violation histories table with UUID foreign key
CREATE TABLE IF NOT EXISTS "violation_histories" (
    "id" serial PRIMARY KEY NOT NULL,
    "violation_id" integer REFERENCES violations(id) ON DELETE CASCADE,
    "violation_uuid" uuid REFERENCES violations(uuid),
    "user_id" uuid REFERENCES profiles(id),
    "action" text NOT NULL,
    "details" jsonb,
    "rejection_reason" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- =====================================
-- STEP 2: PERSONS AND UNIT MANAGEMENT
-- =====================================

-- Persons table (modern owner/tenant management)
CREATE TABLE IF NOT EXISTS "persons" (
    "id" serial PRIMARY KEY NOT NULL,
    "auth_user_id" text,
    "full_name" text NOT NULL,
    "email" text NOT NULL,
    "phone" text,
    "is_system_user" boolean DEFAULT false NOT NULL,
    "has_cat" boolean DEFAULT false,
    "has_dog" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Unit-Person roles (many-to-many)
CREATE TABLE IF NOT EXISTS "unit_person_roles" (
    "id" serial PRIMARY KEY NOT NULL,
    "unit_id" integer NOT NULL REFERENCES property_units(id),
    "person_id" integer NOT NULL REFERENCES persons(id),
    "role" text NOT NULL,
    "receive_email_notifications" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- =====================================
-- STEP 3: FACILITY MANAGEMENT
-- =====================================

-- Parking spots table
CREATE TABLE IF NOT EXISTS "parking_spots" (
    "id" serial PRIMARY KEY NOT NULL,
    "unit_id" integer NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    "identifier" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Storage lockers table
CREATE TABLE IF NOT EXISTS "storage_lockers" (
    "id" serial PRIMARY KEY NOT NULL,
    "unit_id" integer NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    "identifier" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Bike lockers table
CREATE TABLE IF NOT EXISTS "bike_lockers" (
    "id" serial PRIMARY KEY NOT NULL,
    "unit_id" integer NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    "identifier" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Unit facilities table (deprecated but preserved)
CREATE TABLE IF NOT EXISTS "unit_facilities" (
    "id" serial PRIMARY KEY NOT NULL,
    "unit_id" integer NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    "parking_spots" text,
    "storage_lockers" text,
    "bike_lockers" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add unique constraint for unit_facilities
ALTER TABLE "unit_facilities" ADD CONSTRAINT IF NOT EXISTS "unit_facilities_unit_id_unique" UNIQUE ("unit_id");

-- =====================================
-- STEP 4: VIOLATION ACCESS & SECURITY
-- =====================================

-- Violation access links (secure public access)
CREATE TABLE IF NOT EXISTS "violation_access_links" (
    "id" serial PRIMARY KEY NOT NULL,
    "violation_id" integer NOT NULL REFERENCES violations(id),
    "violation_uuid" uuid REFERENCES violations(uuid),
    "recipient_email" text NOT NULL,
    "token" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "expires_at" timestamp NOT NULL,
    "used_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Email verification codes
CREATE TABLE IF NOT EXISTS "email_verification_codes" (
    "id" serial PRIMARY KEY NOT NULL,
    "person_id" integer NOT NULL REFERENCES persons(id),
    "violation_id" integer NOT NULL REFERENCES violations(id),
    "code_hash" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "used_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Public user sessions
CREATE TABLE IF NOT EXISTS "public_user_sessions" (
    "id" serial PRIMARY KEY NOT NULL,
    "session_token" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "person_id" integer NOT NULL REFERENCES persons(id),
    "unit_id" integer NOT NULL REFERENCES property_units(id),
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "last_accessed" timestamp DEFAULT now() NOT NULL
);

-- =====================================
-- STEP 5: COMMUNICATION SYSTEM
-- =====================================

-- Communication campaigns
CREATE TABLE IF NOT EXISTS "communication_campaigns" (
    "id" serial PRIMARY KEY NOT NULL,
    "uuid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "title" text NOT NULL,
    "type" text NOT NULL,
    "status" text DEFAULT 'draft' NOT NULL,
    "subject" text NOT NULL,
    "content" text NOT NULL,
    "plain_text_content" text,
    "scheduled_at" timestamp,
    "sent_at" timestamp,
    "created_by_id" uuid REFERENCES profiles(id),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Communication recipients
CREATE TABLE IF NOT EXISTS "communication_recipients" (
    "id" serial PRIMARY KEY NOT NULL,
    "campaign_id" integer NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
    "recipient_type" text NOT NULL,
    "unit_id" integer REFERENCES property_units(id),
    "person_id" integer REFERENCES persons(id),
    "email" text NOT NULL,
    "recipient_name" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "sent_at" timestamp,
    "error_message" text,
    "tracking_id" text UNIQUE,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Communication templates
CREATE TABLE IF NOT EXISTS "communication_templates" (
    "id" serial PRIMARY KEY NOT NULL,
    "uuid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "subject" text NOT NULL,
    "content" text NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_by_id" uuid REFERENCES profiles(id),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Email tracking events
CREATE TABLE IF NOT EXISTS "email_tracking_events" (
    "id" serial PRIMARY KEY NOT NULL,
    "campaign_id" integer NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
    "recipient_id" integer NOT NULL REFERENCES communication_recipients(id) ON DELETE CASCADE,
    "tracking_id" text NOT NULL,
    "event_type" text NOT NULL,
    "event_data" jsonb,
    "timestamp" timestamp DEFAULT now() NOT NULL,
    "ip_address" text,
    "user_agent" text
);

-- Manual email recipients
CREATE TABLE IF NOT EXISTS "manual_email_recipients" (
    "id" serial PRIMARY KEY NOT NULL,
    "campaign_id" integer NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
    "email" text NOT NULL,
    "name" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- =====================================
-- STEP 6: BYLAW MANAGEMENT
-- =====================================

-- Bylaw categories
CREATE TABLE IF NOT EXISTS "bylaw_categories" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Bylaws
CREATE TABLE IF NOT EXISTS "bylaws" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "bylaw_number" text UNIQUE,
    "effective_date" date,
    "status" text DEFAULT 'active' NOT NULL,
    "category_id" integer REFERENCES bylaw_categories(id),
    "created_by_id" uuid REFERENCES profiles(id),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Bylaw category links
CREATE TABLE IF NOT EXISTS "bylaw_category_links" (
    "id" serial PRIMARY KEY NOT NULL,
    "bylaw_id" integer NOT NULL REFERENCES bylaws(id) ON DELETE CASCADE,
    "category_id" integer NOT NULL REFERENCES bylaw_categories(id) ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Bylaw revisions
CREATE TABLE IF NOT EXISTS "bylaw_revisions" (
    "id" serial PRIMARY KEY NOT NULL,
    "bylaw_id" integer NOT NULL REFERENCES bylaws(id) ON DELETE CASCADE,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "effective_date" date,
    "status" text NOT NULL,
    "revision_notes" text,
    "created_by_id" uuid REFERENCES profiles(id),
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- =====================================
-- STEP 7: AUDIT AND ADMIN
-- =====================================

-- Audit logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" uuid REFERENCES profiles(id),
    "action" text NOT NULL,
    "resource_type" text NOT NULL,
    "resource_id" text,
    "details" jsonb,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Admin announcements (already created by migration runner, ensure complete)
CREATE TABLE IF NOT EXISTS "admin_announcements" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" text NOT NULL,
    "content" jsonb NOT NULL,
    "html_content" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp,
    "created_by_id" uuid REFERENCES profiles(id),
    "updated_by_id" uuid REFERENCES profiles(id),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- =====================================
-- STEP 8: PERFORMANCE INDEXES
-- =====================================

-- Violations indexes
CREATE INDEX IF NOT EXISTS "idx_violations_uuid" ON "violations" ("uuid");
CREATE INDEX IF NOT EXISTS "idx_violations_status" ON "violations" ("status");
CREATE INDEX IF NOT EXISTS "idx_violations_unit_id" ON "violations" ("unit_id");
CREATE INDEX IF NOT EXISTS "idx_violations_reported_by_id" ON "violations" ("reported_by_id");
CREATE INDEX IF NOT EXISTS "idx_violations_created_at" ON "violations" ("created_at");

-- Property units indexes
CREATE INDEX IF NOT EXISTS "idx_property_units_unit_number" ON "property_units" ("unit_number");

-- Persons indexes
CREATE INDEX IF NOT EXISTS "idx_persons_email" ON "persons" ("email");
CREATE INDEX IF NOT EXISTS "idx_persons_auth_user_id" ON "persons" ("auth_user_id");

-- Unit person roles indexes
CREATE INDEX IF NOT EXISTS "idx_unit_person_roles_unit_id" ON "unit_person_roles" ("unit_id");
CREATE INDEX IF NOT EXISTS "idx_unit_person_roles_person_id" ON "unit_person_roles" ("person_id");

-- Communication indexes
CREATE INDEX IF NOT EXISTS "idx_communication_campaigns_status" ON "communication_campaigns" ("status");
CREATE INDEX IF NOT EXISTS "idx_communication_recipients_campaign_id" ON "communication_recipients" ("campaign_id");

-- Email system indexes (ensure they exist)
CREATE INDEX IF NOT EXISTS "idx_email_idempotency_expires" ON "email_idempotency_keys" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_email_send_attempts_status" ON "email_send_attempts" ("status");
CREATE INDEX IF NOT EXISTS "idx_email_deduplication_content_hash" ON "email_deduplication_log" ("content_hash");

-- =====================================
-- STEP 9: CONSTRAINTS AND VALIDATION
-- =====================================

-- Ensure unique constraints
ALTER TABLE "violations" ADD CONSTRAINT IF NOT EXISTS "violations_uuid_unique" UNIQUE ("uuid");
ALTER TABLE "violations" ADD CONSTRAINT IF NOT EXISTS "violations_reference_number_unique" UNIQUE ("reference_number");
ALTER TABLE "violation_access_links" ADD CONSTRAINT IF NOT EXISTS "violation_access_links_token_unique" UNIQUE ("token");
ALTER TABLE "public_user_sessions" ADD CONSTRAINT IF NOT EXISTS "public_user_sessions_session_token_unique" UNIQUE ("session_token");

-- =====================================
-- COMPLETION LOG
-- =====================================

-- Final verification and logging
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
    
    RAISE NOTICE 'Comprehensive schema migration completed successfully';
    RAISE NOTICE 'Total tables in database: %', table_count;
    RAISE NOTICE 'Timestamp: %', NOW();
END $$; 