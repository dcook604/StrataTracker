-- Add Communications Schema Tables
CREATE TABLE "communication_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"plain_text_content" text,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communication_campaigns_uuid_unique" UNIQUE("uuid")
);

CREATE TABLE "communication_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"recipient_type" text NOT NULL,
	"unit_id" integer,
	"person_id" integer,
	"email" text NOT NULL,
	"recipient_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "communication_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communication_templates_uuid_unique" UNIQUE("uuid")
);

-- Add foreign key constraints
ALTER TABLE "communication_campaigns" ADD CONSTRAINT "communication_campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_campaign_id_communication_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "communication_campaigns"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "property_units"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Create indexes for better performance
CREATE INDEX "communication_campaigns_status_idx" ON "communication_campaigns"("status");
CREATE INDEX "communication_campaigns_type_idx" ON "communication_campaigns"("type");
CREATE INDEX "communication_campaigns_created_by_id_idx" ON "communication_campaigns"("created_by_id");
CREATE INDEX "communication_recipients_campaign_id_idx" ON "communication_recipients"("campaign_id");
CREATE INDEX "communication_recipients_status_idx" ON "communication_recipients"("status");
CREATE INDEX "communication_templates_type_idx" ON "communication_templates"("type"); 