-- Migration 0003 Fixed: Add UUID support for violations (Phase 1)
-- This migration adds UUID columns to support transitioning from integer IDs to UUIDs

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create UUIDv7 function for time-ordered UUIDs (better performance than random UUIDs)
-- Using gen_random_uuid() as fallback since UUIDv7 is complex to implement without additional functions
CREATE OR REPLACE FUNCTION generate_uuidv7()
RETURNS UUID AS $$
BEGIN
    -- For now, use gen_random_uuid() which is available with pgcrypto
    -- This provides secure random UUIDs, though not time-ordered
    -- We can upgrade to proper UUIDv7 when PostgreSQL adds native support
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- Add UUID column to violations table
ALTER TABLE violations ADD COLUMN IF NOT EXISTS uuid UUID;

-- Populate UUIDs for existing violations (only if they don't have one)
UPDATE violations SET uuid = generate_uuidv7() WHERE uuid IS NULL;

-- Make UUID column NOT NULL and UNIQUE
ALTER TABLE violations ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE violations ADD CONSTRAINT violations_uuid_unique UNIQUE (uuid);

-- Add UUID foreign key columns to related tables
ALTER TABLE violation_histories ADD COLUMN IF NOT EXISTS violation_uuid UUID;
ALTER TABLE violation_access_links ADD COLUMN IF NOT EXISTS violation_uuid UUID;

-- Populate UUID foreign keys from existing relationships
UPDATE violation_histories vh 
SET violation_uuid = v.uuid 
FROM violations v 
WHERE vh.violation_id = v.id AND vh.violation_uuid IS NULL;

UPDATE violation_access_links val 
SET violation_uuid = v.uuid 
FROM violations v 
WHERE val.violation_id = v.id AND val.violation_uuid IS NULL;

-- Make UUID foreign key columns NOT NULL
ALTER TABLE violation_histories ALTER COLUMN violation_uuid SET NOT NULL;
ALTER TABLE violation_access_links ALTER COLUMN violation_uuid SET NOT NULL;

-- Create indexes on UUID columns for performance (use IF NOT EXISTS pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_violations_uuid ON violations (uuid);
CREATE INDEX IF NOT EXISTS idx_violation_histories_violation_uuid ON violation_histories (violation_uuid);
CREATE INDEX IF NOT EXISTS idx_violation_access_links_violation_uuid ON violation_access_links (violation_uuid);

-- Add UUID foreign key constraints
ALTER TABLE violation_histories 
ADD CONSTRAINT fk_violation_histories_violation_uuid 
FOREIGN KEY (violation_uuid) REFERENCES violations (uuid);

ALTER TABLE violation_access_links 
ADD CONSTRAINT fk_violation_access_links_violation_uuid 
FOREIGN KEY (violation_uuid) REFERENCES violations (uuid); 