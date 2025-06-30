-- PRODUCTION UUID MIGRATION FIX
-- This adds the missing UUID column to violations table
-- Run this on your Coolify production database

-- Step 1: Check if the column already exists (safety check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'violations' AND column_name = 'uuid'
    ) THEN
        -- Step 2: Add UUID column to violations table
        RAISE NOTICE 'Adding uuid column to violations table...';
        ALTER TABLE violations ADD COLUMN uuid UUID;
        
        -- Step 3: Generate UUIDs for existing violations
        RAISE NOTICE 'Generating UUIDs for existing violations...';
        UPDATE violations SET uuid = gen_random_uuid() WHERE uuid IS NULL;
        
        -- Step 4: Make UUID column NOT NULL and UNIQUE
        RAISE NOTICE 'Setting uuid column constraints...';
        ALTER TABLE violations ALTER COLUMN uuid SET NOT NULL;
        ALTER TABLE violations ADD CONSTRAINT violations_uuid_unique UNIQUE (uuid);
        
        -- Step 5: Create index for performance
        RAISE NOTICE 'Creating index on uuid column...';
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violations_uuid ON violations (uuid);
        
        RAISE NOTICE 'UUID migration completed successfully!';
    ELSE
        RAISE NOTICE 'UUID column already exists, skipping migration.';
    END IF;
END
$$;

-- Step 6: Verify the migration
SELECT 
    COUNT(*) as total_violations,
    COUNT(uuid) as violations_with_uuid,
    COUNT(DISTINCT uuid) as unique_uuids
FROM violations;

-- Show some sample data
SELECT id, uuid, reference_number, violation_type, status 
FROM violations 
ORDER BY created_at DESC 
LIMIT 5; 