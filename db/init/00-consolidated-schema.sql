-- db/init/00-consolidated-schema.sql
-- Comprehensive StrataTracker Database Schema
-- Consolidated from all migrations up to 2025-01-15
-- This ensures fresh deployments have complete, working schema

\connect spectrum4

-- Only run if this is a fresh database (no existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) THEN
        RAISE NOTICE 'Fresh database detected. Creating complete schema...';

        -- ============================================
        -- PROFILES (Supabase Auth Integration)
        -- ============================================
        CREATE TABLE "profiles" (
            "id" uuid PRIMARY KEY,
            "full_name" text,
            "role" text NOT NULL DEFAULT 'user',
            "updated_at" timestamp DEFAULT now()
        );

        -- ============================================
        -- LEGACY USER TABLES (for compatibility)
        -- ============================================
        CREATE TABLE "users" (
            "id" serial PRIMARY KEY,
            "full_name" varchar(255) NOT NULL,
            "email" varchar(255) UNIQUE NOT NULL,
            "password" varchar(255) NOT NULL,
            "is_admin" boolean DEFAULT false NOT NULL,
            "is_council" boolean DEFAULT false NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- ============================================
        -- PROPERTY UNITS AND RELATED TABLES
        -- ============================================
        CREATE TABLE "customers" (
            "id" serial PRIMARY KEY,
            "uuid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
            "unit_number" text NOT NULL,
            "floor" text,
            "owner_name" text NOT NULL,
            "owner_email" text NOT NULL,
            "tenant_name" text,
            "tenant_email" text,
            "phone" text,
            "notes" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            "active" boolean DEFAULT true NOT NULL
        );

        CREATE TABLE "property_units" (
            "id" serial PRIMARY KEY,
            "customer_id" integer REFERENCES "customers"("id"),
            "unit_number" text NOT NULL UNIQUE,
            "strata_lot" text,
            "floor" text,
            "townhouse" boolean DEFAULT false NOT NULL,
            "mailing_street1" text,
            "mailing_street2" text,
            "mailing_city" text,
            "mailing_state_province" text,
            "mailing_postal_code" text,
            "mailing_country" text,
            "phone" text,
            "notes" text,
            "owner_name" text,
            "owner_email" text,
            "tenant_name" text,
            "tenant_email" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- Facility tables
        CREATE TABLE "parking_spots" (
            "id" serial PRIMARY KEY,
            "unit_id" integer NOT NULL REFERENCES "property_units"("id") ON DELETE CASCADE,
            "identifier" text NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE TABLE "storage_lockers" (
            "id" serial PRIMARY KEY,
            "unit_id" integer NOT NULL REFERENCES "property_units"("id") ON DELETE CASCADE,
            "identifier" text NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE TABLE "bike_lockers" (
            "id" serial PRIMARY KEY,
            "unit_id" integer NOT NULL REFERENCES "property_units"("id") ON DELETE CASCADE,
            "identifier" text NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- Legacy unit facilities (for backward compatibility)
        CREATE TABLE "unit_facilities" (
            "id" serial PRIMARY KEY,
            "unit_id" integer NOT NULL REFERENCES "property_units"("id") ON DELETE CASCADE UNIQUE,
            "parking_spots" text,
            "storage_lockers" text,
            "bike_lockers" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- ============================================
        -- PERSONS AND ROLES SYSTEM
        -- ============================================
        CREATE TABLE "persons" (
            "id" serial PRIMARY KEY,
            "full_name" text NOT NULL,
            "email" text NOT NULL,
            "phone" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE TABLE "unit_person_roles" (
            "id" serial PRIMARY KEY,
            "unit_id" integer NOT NULL REFERENCES "property_units"("id") ON DELETE CASCADE,
            "person_id" integer NOT NULL REFERENCES "persons"("id") ON DELETE CASCADE,
            "role" text NOT NULL,
            "is_primary" boolean DEFAULT false NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "unit_person_roles_unit_id_person_id_role_unique" UNIQUE("unit_id", "person_id", "role")
        );

        -- ============================================
        -- VIOLATION SYSTEM
        -- ============================================
        CREATE TABLE "violation_categories" (
            "id" serial PRIMARY KEY,
            "name" text NOT NULL UNIQUE,
            "description" text,
            "bylaw_reference" text,
            "default_fine_amount" integer,
            "active" boolean DEFAULT true NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE TABLE "violations" (
            "id" serial PRIMARY KEY,
            "uuid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
            "reference_number" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
            "unit_id" integer NOT NULL REFERENCES "property_units"("id"),
            "reported_by_id" uuid NOT NULL REFERENCES "profiles"("id"),
            "category_id" integer REFERENCES "violation_categories"("id"),
            "violation_type" text NOT NULL,
            "violation_date" timestamp NOT NULL,
            "violation_time" text,
            "description" text NOT NULL,
            "bylaw_reference" text,
            "status" text DEFAULT 'pending_approval' NOT NULL,
            "fine_amount" integer,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            "details" text,
            "location_details" text,
            "evidence_description" text
        );

        CREATE TABLE "violation_histories" (
            "id" serial PRIMARY KEY,
            "violation_id" integer NOT NULL REFERENCES "violations"("id") ON DELETE CASCADE,
            "user_id" uuid REFERENCES "profiles"("id"),
            "action" text NOT NULL,
            "status_from" text,
            "status_to" text,
            "details" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "rejection_reason" text
        );

        CREATE TABLE "violation_access_links" (
            "id" serial PRIMARY KEY,
            "violation_id" integer NOT NULL REFERENCES "violations"("id") ON DELETE CASCADE,
            "access_token" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
            "person_email" text NOT NULL,
            "person_name" text NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "expires_at" timestamp NOT NULL,
            "accessed_at" timestamp,
            "dispute_submitted_at" timestamp
        );

        -- ============================================
        -- EMAIL DEDUPLICATION SYSTEM (COMPLETE)
        -- ============================================
        CREATE TABLE "email_idempotency_keys" (
            "id" serial PRIMARY KEY,
            "idempotency_key" text NOT NULL UNIQUE,
            "email_type" text NOT NULL,
            "recipient_email" text NOT NULL,
            "email_hash" text NOT NULL,
            "status" text DEFAULT 'sent' NOT NULL,
            "sent_at" timestamp,
            "metadata" jsonb,
            "expires_at" timestamp NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE TABLE "email_send_attempts" (
            "id" serial PRIMARY KEY,
            "idempotency_key" text NOT NULL REFERENCES "email_idempotency_keys"("idempotency_key"),
            "recipient" text NOT NULL,
            "subject" text NOT NULL,
            "status" text NOT NULL,
            "error_message" text,
            "attempt_count" integer DEFAULT 1 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            "attempt_number" integer DEFAULT 1 NOT NULL,
            "attempted_at" timestamp DEFAULT now() NOT NULL,
            "completed_at" timestamp
        );

        CREATE TABLE "email_deduplication_log" (
            "id" serial PRIMARY KEY,
            "content_hash" text NOT NULL,
            "recipient" text NOT NULL,
            "subject" text NOT NULL,
            "first_sent_at" timestamp DEFAULT now() NOT NULL,
            "last_attempted_at" timestamp DEFAULT now() NOT NULL,
            "attempt_count" integer DEFAULT 1 NOT NULL,
            "prevented_at" timestamp DEFAULT now() NOT NULL,
            "recipient_email" text NOT NULL,
            "email_type" text NOT NULL,
            "original_idempotency_key" text,
            "duplicate_idempotency_key" text,
            "metadata" jsonb
        );

        -- ============================================
        -- COMMUNICATION SYSTEM
        -- ============================================
        CREATE TABLE "communication_campaigns" (
            "id" serial PRIMARY KEY,
            "title" text NOT NULL,
            "description" text,
            "communication_type" text NOT NULL,
            "status" text DEFAULT 'draft' NOT NULL,
            "recipient_type" text NOT NULL,
            "scheduled_for" timestamp,
            "sent_at" timestamp,
            "created_by_id" uuid NOT NULL REFERENCES "profiles"("id"),
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            "subject" text NOT NULL,
            "html_content" text NOT NULL,
            "text_content" text,
            "sender_name" text,
            "sender_email" text,
            "reply_to" text,
            "tracking_enabled" boolean DEFAULT true NOT NULL,
            "open_tracking" boolean DEFAULT true NOT NULL,
            "click_tracking" boolean DEFAULT true NOT NULL,
            "unsubscribe_enabled" boolean DEFAULT true NOT NULL
        );

        CREATE TABLE "communication_templates" (
            "id" serial PRIMARY KEY,
            "name" text NOT NULL UNIQUE,
            "communication_type" text NOT NULL,
            "subject_template" text NOT NULL,
            "html_template" text NOT NULL,
            "text_template" text,
            "variables" jsonb,
            "is_system" boolean DEFAULT false NOT NULL,
            "created_by_id" uuid REFERENCES "profiles"("id"),
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE TABLE "communication_recipients" (
            "id" serial PRIMARY KEY,
            "campaign_id" integer NOT NULL REFERENCES "communication_campaigns"("id") ON DELETE CASCADE,
            "recipient_type" text NOT NULL,
            "unit_id" integer REFERENCES "property_units"("id"),
            "person_id" integer REFERENCES "persons"("id"),
            "email" text NOT NULL,
            "name" text,
            "status" text DEFAULT 'pending' NOT NULL,
            "sent_at" timestamp,
            "delivered_at" timestamp,
            "opened_at" timestamp,
            "clicked_at" timestamp,
            "bounced_at" timestamp,
            "unsubscribed_at" timestamp,
            "tracking_id" text,
            "error_message" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- ============================================
        -- BYLAW MANAGEMENT SYSTEM
        -- ============================================
        CREATE TABLE "bylaw_categories" (
            "id" serial PRIMARY KEY,
            "name" text NOT NULL UNIQUE,
            "description" text,
            "parent_id" integer REFERENCES "bylaw_categories"("id"),
            "sort_order" integer DEFAULT 0 NOT NULL,
            "is_active" boolean DEFAULT true NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE TABLE "bylaws" (
            "id" serial PRIMARY KEY,
            "title" text NOT NULL,
            "number" text NOT NULL UNIQUE,
            "description" text,
            "content" text NOT NULL,
            "effective_date" date,
            "status" text DEFAULT 'active' NOT NULL,
            "version" integer DEFAULT 1 NOT NULL,
            "parent_bylaw_id" integer REFERENCES "bylaws"("id"),
            "created_by_id" uuid NOT NULL REFERENCES "profiles"("id"),
            "updated_by_id" uuid REFERENCES "profiles"("id"),
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE TABLE "bylaw_category_links" (
            "bylaw_id" integer NOT NULL REFERENCES "bylaws"("id") ON DELETE CASCADE,
            "category_id" integer NOT NULL REFERENCES "bylaw_categories"("id") ON DELETE CASCADE,
            PRIMARY KEY ("bylaw_id", "category_id")
        );

        CREATE TABLE "bylaw_revisions" (
            "id" serial PRIMARY KEY,
            "bylaw_id" integer NOT NULL REFERENCES "bylaws"("id") ON DELETE CASCADE,
            "version" integer NOT NULL,
            "title" text NOT NULL,
            "content" text NOT NULL,
            "change_summary" text,
            "created_by_id" uuid NOT NULL REFERENCES "profiles"("id"),
            "created_at" timestamp DEFAULT now() NOT NULL
        );

        -- ============================================
        -- EMAIL TRACKING AND MONITORING
        -- ============================================
        CREATE TABLE "email_tracking_events" (
            "id" serial PRIMARY KEY,
            "campaign_id" integer NOT NULL REFERENCES "communication_campaigns"("id") ON DELETE CASCADE,
            "recipient_id" integer NOT NULL REFERENCES "communication_recipients"("id") ON DELETE CASCADE,
            "tracking_id" text NOT NULL,
            "event_type" text NOT NULL,
            "event_data" jsonb,
            "timestamp" timestamp DEFAULT now() NOT NULL,
            "ip_address" text,
            "user_agent" text
        );

        CREATE TABLE "manual_email_recipients" (
            "id" serial PRIMARY KEY,
            "campaign_id" integer NOT NULL REFERENCES "communication_campaigns"("id") ON DELETE CASCADE,
            "email" text NOT NULL,
            "name" text,
            "created_at" timestamp DEFAULT now() NOT NULL
        );

        -- ============================================
        -- VERIFICATION AND SESSIONS
        -- ============================================
        CREATE TABLE "email_verification_codes" (
            "id" serial PRIMARY KEY,
            "person_id" integer NOT NULL REFERENCES "persons"("id"),
            "violation_id" integer NOT NULL REFERENCES "violations"("id"),
            "code_hash" text NOT NULL,
            "expires_at" timestamp NOT NULL,
            "used_at" timestamp,
            "created_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE TABLE "public_user_sessions" (
            "id" serial PRIMARY KEY,
            "session_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
            "person_id" integer NOT NULL REFERENCES "persons"("id") ON DELETE CASCADE,
            "unit_id" integer NOT NULL REFERENCES "property_units"("id") ON DELETE CASCADE,
            "email" text NOT NULL,
            "role" text NOT NULL,
            "expires_at" timestamp NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "data" jsonb
        );

        -- ============================================
        -- SYSTEM MANAGEMENT
        -- ============================================
        CREATE TABLE "system_settings" (
            "id" serial PRIMARY KEY,
            "setting_key" text NOT NULL UNIQUE,
            "setting_value" text,
            "description" text,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            "updated_by_id" uuid REFERENCES "profiles"("id")
        );

        CREATE TABLE "audit_logs" (
            "id" serial PRIMARY KEY,
            "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
            "user_id_new" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
            "user_name" text,
            "user_email" text,
            "action" text NOT NULL,
            "target_type" text,
            "target_id" text,
            "details" jsonb,
            "ip_address" text
        );

        CREATE TABLE "admin_announcements" (
            "id" serial PRIMARY KEY,
            "title" text NOT NULL,
            "content" jsonb NOT NULL,
            "html_content" text NOT NULL,
            "is_active" boolean DEFAULT true NOT NULL,
            "priority" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
            "created_by" integer REFERENCES "profiles"("id") ON DELETE SET NULL,
            "updated_by" integer REFERENCES "profiles"("id") ON DELETE SET NULL
        );

        -- ============================================
        -- INDEXES FOR PERFORMANCE
        -- ============================================
        
        -- Email deduplication indexes
        CREATE INDEX "idx_email_idempotency_keys_key" ON "email_idempotency_keys"("idempotency_key");
        CREATE INDEX "idx_email_idempotency_keys_recipient_type" ON "email_idempotency_keys"("recipient_email", "email_type");
        CREATE INDEX "idx_email_idempotency_keys_hash" ON "email_idempotency_keys"("email_hash");
        CREATE INDEX "idx_email_idempotency_keys_expires" ON "email_idempotency_keys"("expires_at");
        CREATE INDEX "idx_email_idempotency_keys_status" ON "email_idempotency_keys"("status");
        CREATE INDEX "idx_email_idempotency_keys_created" ON "email_idempotency_keys"("created_at");

        CREATE INDEX "idx_email_send_attempts_key" ON "email_send_attempts"("idempotency_key");
        CREATE INDEX "idx_email_send_attempts_status" ON "email_send_attempts"("status");
        CREATE INDEX "idx_email_send_attempts_attempted" ON "email_send_attempts"("attempted_at");

        CREATE INDEX "idx_email_dedup_log_recipient" ON "email_deduplication_log"("recipient_email");
        CREATE INDEX "idx_email_dedup_log_type" ON "email_deduplication_log"("email_type");
        CREATE INDEX "idx_email_dedup_log_content_hash" ON "email_deduplication_log"("content_hash");
        CREATE INDEX "idx_email_dedup_log_prevented" ON "email_deduplication_log"("prevented_at");

        -- Violation indexes
        CREATE INDEX "idx_violations_unit_id" ON "violations"("unit_id");
        CREATE INDEX "idx_violations_status" ON "violations"("status");
        CREATE INDEX "idx_violations_uuid" ON "violations"("uuid");
        CREATE INDEX "idx_violations_reference_number" ON "violations"("reference_number");
        CREATE INDEX "idx_violations_violation_date" ON "violations"("violation_date");

        -- Communication indexes
        CREATE INDEX "idx_communication_campaigns_status" ON "communication_campaigns"("status");
        CREATE INDEX "idx_communication_campaigns_type" ON "communication_campaigns"("communication_type");
        CREATE INDEX "idx_communication_recipients_campaign_id" ON "communication_recipients"("campaign_id");
        CREATE INDEX "idx_communication_recipients_status" ON "communication_recipients"("status");

        -- Unit and person indexes
        CREATE INDEX "idx_property_units_unit_number" ON "property_units"("unit_number");
        CREATE INDEX "idx_persons_email" ON "persons"("email");
        CREATE INDEX "idx_unit_person_roles_unit_id" ON "unit_person_roles"("unit_id");
        CREATE INDEX "idx_unit_person_roles_person_id" ON "unit_person_roles"("person_id");

        -- Session indexes
        CREATE INDEX "idx_public_user_sessions_session_id" ON "public_user_sessions"("session_id");
        CREATE INDEX "idx_public_user_sessions_expires" ON "public_user_sessions"("expires_at");

        RAISE NOTICE 'Complete schema created successfully!';
    ELSE
        RAISE NOTICE 'Existing database detected. Skipping schema creation.';
    END IF;
END
$$; 