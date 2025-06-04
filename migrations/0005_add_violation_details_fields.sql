-- Migration: Add violation details fields
-- Date: 2025-01-09
-- Description: Add new fields for incident area, concierge name, people involved, noticed by, damage to property, and police involvement

-- Add new columns to violations table
ALTER TABLE violations 
ADD COLUMN incident_area TEXT,
ADD COLUMN concierge_name TEXT,
ADD COLUMN people_involved TEXT,
ADD COLUMN noticed_by TEXT,
ADD COLUMN damage_to_property TEXT,
ADD COLUMN damage_details TEXT,
ADD COLUMN police_involved TEXT,
ADD COLUMN police_details TEXT;

-- Add comments for documentation
COMMENT ON COLUMN violations.incident_area IS 'Location where the violation occurred (e.g., Pool area, Parking garage, Lobby)';
COMMENT ON COLUMN violations.concierge_name IS 'Name of the concierge on duty when the violation occurred';
COMMENT ON COLUMN violations.people_involved IS 'Names or descriptions of people involved in the violation';
COMMENT ON COLUMN violations.noticed_by IS 'Who first noticed or reported the violation';
COMMENT ON COLUMN violations.damage_to_property IS 'Whether there is damage to common property (yes/no)';
COMMENT ON COLUMN violations.damage_details IS 'Details about property damage if applicable';
COMMENT ON COLUMN violations.police_involved IS 'Whether police are involved (yes/no)';
COMMENT ON COLUMN violations.police_details IS 'Police report details, case numbers, officer information, etc.';

-- Create indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_violations_damage_to_property ON violations(damage_to_property);
CREATE INDEX IF NOT EXISTS idx_violations_police_involved ON violations(police_involved); 