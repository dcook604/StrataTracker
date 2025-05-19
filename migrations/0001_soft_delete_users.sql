-- Add soft delete column to users table
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;

-- Create index for faster queries excluding deleted users
CREATE INDEX "users_deleted_at_idx" ON "users" ("deleted_at");
 
-- Update existing queries to exclude deleted users
CREATE OR REPLACE VIEW "active_users" AS
SELECT * FROM "users" WHERE "deleted_at" IS NULL; 