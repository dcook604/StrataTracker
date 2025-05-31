-- Migration 0003: Add UUID support for violations (Phase 1)
-- This migration adds UUID columns to support transitioning from integer IDs to UUIDs

-- Create UUIDv7 function for time-ordered UUIDs (better performance than random UUIDs)
CREATE OR REPLACE FUNCTION generate_uuidv7()
RETURNS UUID AS $$
DECLARE
    unix_ts_ms BIGINT;
    uuid_bytes BYTEA;
BEGIN
    -- Get current timestamp in milliseconds
    unix_ts_ms := EXTRACT(EPOCH FROM NOW()) * 1000;
    
    -- Generate UUID v7: timestamp (48 bits) + version (4 bits) + random (12 bits) + variant (2 bits) + random (62 bits)
    uuid_bytes := 
        -- Timestamp (48 bits)
        substring(int8send(unix_ts_ms), 3, 6) ||
        -- Version (4 bits) + random (12 bits) 
        substring(gen_random_bytes(8), 1, 2) ||
        -- Variant (2 bits) + random (62 bits)
        substring(gen_random_bytes(8), 1, 8);
    
    -- Set version bits (version 7)
    uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
    -- Set variant bits
    uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
    
    RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql;

-- Add UUID column to violations table
ALTER TABLE violations ADD COLUMN uuid UUID;

-- Populate UUIDs for existing violations
UPDATE violations SET uuid = generate_uuidv7() WHERE uuid IS NULL;

-- Make UUID column NOT NULL and UNIQUE
ALTER TABLE violations ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE violations ADD CONSTRAINT violations_uuid_unique UNIQUE (uuid);

-- Add UUID foreign key columns to related tables
ALTER TABLE violation_histories ADD COLUMN violation_uuid UUID;
ALTER TABLE violation_access_links ADD COLUMN violation_uuid UUID;

-- Populate UUID foreign keys from existing relationships
UPDATE violation_histories vh 
SET violation_uuid = v.uuid 
FROM violations v 
WHERE vh.violation_id = v.id;

UPDATE violation_access_links val 
SET violation_uuid = v.uuid 
FROM violations v 
WHERE val.violation_id = v.id;

-- Make UUID foreign key columns NOT NULL
ALTER TABLE violation_histories ALTER COLUMN violation_uuid SET NOT NULL;
ALTER TABLE violation_access_links ALTER COLUMN violation_uuid SET NOT NULL;

-- Create indexes on UUID columns for performance
CREATE UNIQUE INDEX CONCURRENTLY idx_violations_uuid ON violations (uuid);
CREATE INDEX CONCURRENTLY idx_violation_histories_violation_uuid ON violation_histories (violation_uuid);
CREATE INDEX CONCURRENTLY idx_violation_access_links_violation_uuid ON violation_access_links (violation_uuid);

-- Add UUID foreign key constraints
ALTER TABLE violation_histories 
ADD CONSTRAINT fk_violation_histories_violation_uuid 
FOREIGN KEY (violation_uuid) REFERENCES violations (uuid);

ALTER TABLE violation_access_links 
ADD CONSTRAINT fk_violation_access_links_violation_uuid 
FOREIGN KEY (violation_uuid) REFERENCES violations (uuid); 