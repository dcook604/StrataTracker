-- PRODUCTION VIOLATIONS TABLE COLUMNS FIX
-- This adds all missing columns to the violations table that the application expects

-- Step 1: Add missing violation detail columns
ALTER TABLE violations ADD COLUMN IF NOT EXISTS incident_area text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS concierge_name text;  
ALTER TABLE violations ADD COLUMN IF NOT EXISTS people_involved text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS noticed_by text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS damage_to_property text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS damage_details text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS police_involved text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS police_details text;

-- Step 2: Fix default status (should be 'pending_approval' not 'new')
ALTER TABLE violations ALTER COLUMN status SET DEFAULT 'pending_approval';

-- Step 3: Update any existing 'new' status to 'pending_approval' for consistency
UPDATE violations SET status = 'pending_approval' WHERE status = 'new';

-- Step 4: Verify the new structure
\d violations

-- Step 5: Show column comments for reference
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'violations' 
    AND column_name IN ('incident_area', 'concierge_name', 'people_involved', 'noticed_by', 'damage_to_property', 'damage_details', 'police_involved', 'police_details')
ORDER BY column_name; 