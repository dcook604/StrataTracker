-- Migration: Fix Email Deduplication Schema
-- Date: 2025-07-01
-- Purpose: Add missing columns to email deduplication tables that are causing runtime errors
-- Issue: Tables exist but missing required columns causing SQL errors

-- =====================================
-- FIX EMAIL_IDEMPOTENCY_KEYS TABLE
-- =====================================

-- Ensure table exists with all required columns
CREATE TABLE IF NOT EXISTS "email_idempotency_keys" (
    "id" serial PRIMARY KEY NOT NULL,
    "idempotency_key" text NOT NULL UNIQUE,
    "email_type" text NOT NULL, -- 'violation_notification', 'violation_approved', 'campaign', 'system'
    "recipient_email" text NOT NULL,
    "email_hash" text NOT NULL, -- Hash of email content for deduplication
    "status" text DEFAULT 'sent' NOT NULL, -- 'sent', 'failed', 'pending'
    "sent_at" timestamp,
    "metadata" jsonb, -- Store additional context (violationId, campaignId, etc.)
    "expires_at" timestamp NOT NULL, -- TTL for cleanup
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add missing columns if they don't exist
ALTER TABLE "email_idempotency_keys" 
ADD COLUMN IF NOT EXISTS "idempotency_key" text;

ALTER TABLE "email_idempotency_keys" 
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'sent';

ALTER TABLE "email_idempotency_keys" 
ADD COLUMN IF NOT EXISTS "email_type" text DEFAULT 'system';

ALTER TABLE "email_idempotency_keys" 
ADD COLUMN IF NOT EXISTS "recipient_email" text;

ALTER TABLE "email_idempotency_keys" 
ADD COLUMN IF NOT EXISTS "email_hash" text;

ALTER TABLE "email_idempotency_keys" 
ADD COLUMN IF NOT EXISTS "sent_at" timestamp;

ALTER TABLE "email_idempotency_keys" 
ADD COLUMN IF NOT EXISTS "metadata" jsonb;

ALTER TABLE "email_idempotency_keys" 
ADD COLUMN IF NOT EXISTS "expires_at" timestamp;

ALTER TABLE "email_idempotency_keys" 
ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- =====================================
-- FIX EMAIL_SEND_ATTEMPTS TABLE
-- =====================================

-- Ensure table exists with all required columns
CREATE TABLE IF NOT EXISTS "email_send_attempts" (
    "id" serial PRIMARY KEY NOT NULL,
    "idempotency_key" text NOT NULL,
    "attempt_number" integer NOT NULL DEFAULT 1,
    "status" text NOT NULL, -- 'pending', 'sent', 'failed', 'retrying'
    "error_message" text,
    "attempted_at" timestamp DEFAULT now() NOT NULL,
    "completed_at" timestamp
);

-- Add missing columns if they don't exist
ALTER TABLE "email_send_attempts" 
ADD COLUMN IF NOT EXISTS "attempt_number" integer DEFAULT 1;

ALTER TABLE "email_send_attempts" 
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';

ALTER TABLE "email_send_attempts" 
ADD COLUMN IF NOT EXISTS "error_message" text;

ALTER TABLE "email_send_attempts" 
ADD COLUMN IF NOT EXISTS "attempted_at" timestamp DEFAULT now();

ALTER TABLE "email_send_attempts" 
ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

ALTER TABLE "email_send_attempts" 
ADD COLUMN IF NOT EXISTS "idempotency_key" text;

-- =====================================
-- FIX EMAIL_DEDUPLICATION_LOG TABLE
-- =====================================

-- Ensure table exists with all required columns
CREATE TABLE IF NOT EXISTS "email_deduplication_log" (
    "id" serial PRIMARY KEY NOT NULL,
    "recipient_email" text NOT NULL,
    "email_type" text NOT NULL,
    "content_hash" text NOT NULL, -- Hash of subject + content
    "original_idempotency_key" text NOT NULL,
    "duplicate_idempotency_key" text NOT NULL,
    "prevented_at" timestamp DEFAULT now() NOT NULL,
    "metadata" jsonb -- Context about why it was prevented
);

-- Add missing columns if they don't exist
ALTER TABLE "email_deduplication_log" 
ADD COLUMN IF NOT EXISTS "prevented_at" timestamp DEFAULT now();

ALTER TABLE "email_deduplication_log" 
ADD COLUMN IF NOT EXISTS "recipient_email" text;

ALTER TABLE "email_deduplication_log" 
ADD COLUMN IF NOT EXISTS "email_type" text;

ALTER TABLE "email_deduplication_log" 
ADD COLUMN IF NOT EXISTS "content_hash" text;

ALTER TABLE "email_deduplication_log" 
ADD COLUMN IF NOT EXISTS "original_idempotency_key" text;

ALTER TABLE "email_deduplication_log" 
ADD COLUMN IF NOT EXISTS "duplicate_idempotency_key" text;

ALTER TABLE "email_deduplication_log" 
ADD COLUMN IF NOT EXISTS "metadata" jsonb;

-- =====================================
-- ADD CONSTRAINTS AND INDEXES
-- =====================================

-- Add unique constraint to idempotency_key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_idempotency_keys_idempotency_key_key'
    ) THEN
        ALTER TABLE "email_idempotency_keys" 
        ADD CONSTRAINT "email_idempotency_keys_idempotency_key_key" 
        UNIQUE ("idempotency_key");
    END IF;
END $$;

-- Add foreign key constraint for email_send_attempts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_send_attempts_idempotency_key_fkey'
    ) THEN
        ALTER TABLE "email_send_attempts" 
        ADD CONSTRAINT "email_send_attempts_idempotency_key_fkey" 
        FOREIGN KEY ("idempotency_key") 
        REFERENCES "email_idempotency_keys"("idempotency_key") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "idx_email_idempotency_keys_key" ON "email_idempotency_keys"("idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_email_idempotency_keys_recipient_type" ON "email_idempotency_keys"("recipient_email", "email_type");
CREATE INDEX IF NOT EXISTS "idx_email_idempotency_keys_hash" ON "email_idempotency_keys"("email_hash");
CREATE INDEX IF NOT EXISTS "idx_email_idempotency_keys_expires" ON "email_idempotency_keys"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_email_idempotency_keys_status" ON "email_idempotency_keys"("status");
CREATE INDEX IF NOT EXISTS "idx_email_idempotency_keys_created" ON "email_idempotency_keys"("created_at");

CREATE INDEX IF NOT EXISTS "idx_email_send_attempts_key" ON "email_send_attempts"("idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_email_send_attempts_status" ON "email_send_attempts"("status");
CREATE INDEX IF NOT EXISTS "idx_email_send_attempts_attempted" ON "email_send_attempts"("attempted_at");

CREATE INDEX IF NOT EXISTS "idx_email_dedup_log_recipient" ON "email_deduplication_log"("recipient_email");
CREATE INDEX IF NOT EXISTS "idx_email_dedup_log_type" ON "email_deduplication_log"("email_type");
CREATE INDEX IF NOT EXISTS "idx_email_dedup_log_content_hash" ON "email_deduplication_log"("content_hash");
CREATE INDEX IF NOT EXISTS "idx_email_dedup_log_prevented" ON "email_deduplication_log"("prevented_at");

-- =====================================
-- UPDATE NOT NULL CONSTRAINTS
-- =====================================

-- Set NOT NULL constraints where needed (do this after adding columns with defaults)
DO $$
BEGIN
    -- Update any NULL values before setting NOT NULL constraints
    UPDATE "email_idempotency_keys" SET 
        "idempotency_key" = COALESCE("idempotency_key", gen_random_uuid()::text),
        "status" = COALESCE("status", 'sent'),
        "email_type" = COALESCE("email_type", 'system'),
        "recipient_email" = COALESCE("recipient_email", ''),
        "email_hash" = COALESCE("email_hash", ''),
        "expires_at" = COALESCE("expires_at", now() + interval '24 hours'),
        "created_at" = COALESCE("created_at", now())
    WHERE "idempotency_key" IS NULL 
       OR "status" IS NULL 
       OR "email_type" IS NULL 
       OR "recipient_email" IS NULL 
       OR "email_hash" IS NULL 
       OR "expires_at" IS NULL 
       OR "created_at" IS NULL;

    UPDATE "email_send_attempts" SET 
        "attempt_number" = COALESCE("attempt_number", 1),
        "status" = COALESCE("status", 'pending'),
        "attempted_at" = COALESCE("attempted_at", now()),
        "idempotency_key" = COALESCE("idempotency_key", gen_random_uuid()::text)
    WHERE "attempt_number" IS NULL 
       OR "status" IS NULL 
       OR "attempted_at" IS NULL 
       OR "idempotency_key" IS NULL;

    UPDATE "email_deduplication_log" SET 
        "prevented_at" = COALESCE("prevented_at", now()),
        "recipient_email" = COALESCE("recipient_email", ''),
        "email_type" = COALESCE("email_type", 'system'),
        "content_hash" = COALESCE("content_hash", ''),
        "original_idempotency_key" = COALESCE("original_idempotency_key", ''),
        "duplicate_idempotency_key" = COALESCE("duplicate_idempotency_key", '')
    WHERE "prevented_at" IS NULL 
       OR "recipient_email" IS NULL 
       OR "email_type" IS NULL 
       OR "content_hash" IS NULL 
       OR "original_idempotency_key" IS NULL 
       OR "duplicate_idempotency_key" IS NULL;
END $$;

-- Add NOT NULL constraints (for critical columns)
ALTER TABLE "email_idempotency_keys" ALTER COLUMN "idempotency_key" SET NOT NULL;
ALTER TABLE "email_idempotency_keys" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "email_idempotency_keys" ALTER COLUMN "email_type" SET NOT NULL;
ALTER TABLE "email_idempotency_keys" ALTER COLUMN "expires_at" SET NOT NULL;
ALTER TABLE "email_idempotency_keys" ALTER COLUMN "created_at" SET NOT NULL;

ALTER TABLE "email_send_attempts" ALTER COLUMN "attempt_number" SET NOT NULL;
ALTER TABLE "email_send_attempts" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "email_send_attempts" ALTER COLUMN "attempted_at" SET NOT NULL;
ALTER TABLE "email_send_attempts" ALTER COLUMN "idempotency_key" SET NOT NULL;

ALTER TABLE "email_deduplication_log" ALTER COLUMN "prevented_at" SET NOT NULL;
ALTER TABLE "email_deduplication_log" ALTER COLUMN "recipient_email" SET NOT NULL;
ALTER TABLE "email_deduplication_log" ALTER COLUMN "email_type" SET NOT NULL;

-- =====================================
-- ADD TABLE COMMENTS
-- =====================================

COMMENT ON TABLE "email_idempotency_keys" IS 'Tracks email sends with idempotency keys to prevent duplicates';
COMMENT ON TABLE "email_send_attempts" IS 'Records individual send attempts for retry tracking';
COMMENT ON TABLE "email_deduplication_log" IS 'Logs prevented duplicate emails for monitoring'; 