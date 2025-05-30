-- Email Tracking Enhancements Migration
-- Add tracking functionality and manual email recipient support

-- Add tracking_id column to communication_recipients
ALTER TABLE "communication_recipients" ADD COLUMN "tracking_id" text UNIQUE;

-- Create email tracking events table
CREATE TABLE "email_tracking_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "campaign_id" integer NOT NULL,
  "recipient_id" integer NOT NULL,
  "tracking_id" text NOT NULL,
  "event_type" text NOT NULL,
  "event_data" jsonb,
  "timestamp" timestamp DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text
);

-- Create manual email recipients table
CREATE TABLE "manual_email_recipients" (
  "id" serial PRIMARY KEY NOT NULL,
  "campaign_id" integer NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "email_tracking_events" ADD CONSTRAINT "email_tracking_events_campaign_id_communication_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "communication_campaigns"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "email_tracking_events" ADD CONSTRAINT "email_tracking_events_recipient_id_communication_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "communication_recipients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "manual_email_recipients" ADD CONSTRAINT "manual_email_recipients_campaign_id_communication_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "communication_campaigns"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for performance
CREATE INDEX "email_tracking_events_campaign_id_idx" ON "email_tracking_events"("campaign_id");
CREATE INDEX "email_tracking_events_recipient_id_idx" ON "email_tracking_events"("recipient_id");
CREATE INDEX "email_tracking_events_tracking_id_idx" ON "email_tracking_events"("tracking_id");
CREATE INDEX "email_tracking_events_event_type_idx" ON "email_tracking_events"("event_type");
CREATE INDEX "email_tracking_events_timestamp_idx" ON "email_tracking_events"("timestamp");
CREATE INDEX "manual_email_recipients_campaign_id_idx" ON "manual_email_recipients"("campaign_id");
CREATE INDEX "manual_email_recipients_email_idx" ON "manual_email_recipients"("email");

-- Update existing communication_recipients with tracking IDs where missing
UPDATE "communication_recipients" 
SET "tracking_id" = encode(gen_random_bytes(16), 'hex') 
WHERE "tracking_id" IS NULL; 