-- Migration: Add rejection_reason column to violation_histories table
-- This column was added to the schema but missing from the database

ALTER TABLE violation_histories 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update the comment
COMMENT ON COLUMN violation_histories.rejection_reason IS 'Reason provided when a violation is rejected'; 