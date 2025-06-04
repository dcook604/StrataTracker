-- Migration: Add townhouse field to property_units table
-- Migration 0009: Add townhouse boolean field

-- Add townhouse column to property_units table
ALTER TABLE property_units ADD COLUMN townhouse BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN property_units.townhouse IS 'Whether this unit is a townhouse (true) or not (false)';

-- Update existing property_units records to have townhouse = false (already done by DEFAULT)
-- No data migration needed as default value is appropriate 