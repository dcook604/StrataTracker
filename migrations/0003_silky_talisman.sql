CREATE TABLE "bike_lockers" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"identifier" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bylaw_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bylaw_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "bylaw_category_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"bylaw_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "bylaw_category_links_bylaw_id_category_id_unique" UNIQUE("bylaw_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "bylaw_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bylaw_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"revision_notes" text,
	"effective_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bylaws" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"section_number" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"parent_section_id" integer,
	"section_order" integer NOT NULL,
	"part_number" text,
	"part_title" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by_id" integer NOT NULL,
	"updated_by_id" integer,
	CONSTRAINT "bylaws_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "bylaws_section_number_unique" UNIQUE("section_number")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
	"tracking_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communication_recipients_tracking_id_unique" UNIQUE("tracking_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "email_deduplication_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_email" text NOT NULL,
	"email_type" text NOT NULL,
	"content_hash" text NOT NULL,
	"original_idempotency_key" text NOT NULL,
	"duplicate_idempotency_key" text NOT NULL,
	"prevented_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "email_idempotency_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"email_type" text NOT NULL,
	"recipient_email" text NOT NULL,
	"email_hash" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp,
	"metadata" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_idempotency_keys_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "email_send_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"attempted_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "email_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"violation_id" integer NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_email_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parking_spots" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"identifier" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_lockers" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"identifier" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "customers_unit_number_unique";--> statement-breakpoint
ALTER TABLE "violation_histories" DROP CONSTRAINT "violation_histories_violation_id_violations_id_fk";
--> statement-breakpoint
ALTER TABLE "unit_facilities" ALTER COLUMN "parking_spots" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "unit_facilities" ALTER COLUMN "parking_spots" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "unit_facilities" ALTER COLUMN "storage_lockers" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "unit_facilities" ALTER COLUMN "storage_lockers" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "unit_facilities" ALTER COLUMN "bike_lockers" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "unit_facilities" ALTER COLUMN "bike_lockers" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "violation_histories" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "strata_lot" text;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "townhouse" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "mailing_street1" text;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "mailing_street2" text;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "mailing_city" text;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "mailing_state_province" text;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "mailing_postal_code" text;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "mailing_country" text;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "property_units" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "violation_access_links" ADD COLUMN "violation_uuid" uuid;--> statement-breakpoint
ALTER TABLE "violation_histories" ADD COLUMN "violation_uuid" uuid;--> statement-breakpoint
ALTER TABLE "violation_histories" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "uuid" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "incident_area" text;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "concierge_name" text;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "people_involved" text;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "noticed_by" text;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "damage_to_property" text;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "damage_details" text;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "police_involved" text;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "police_details" text;--> statement-breakpoint
ALTER TABLE "bike_lockers" ADD CONSTRAINT "bike_lockers_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bylaw_category_links" ADD CONSTRAINT "bylaw_category_links_bylaw_id_bylaws_id_fk" FOREIGN KEY ("bylaw_id") REFERENCES "public"."bylaws"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bylaw_category_links" ADD CONSTRAINT "bylaw_category_links_category_id_bylaw_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."bylaw_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bylaw_revisions" ADD CONSTRAINT "bylaw_revisions_bylaw_id_bylaws_id_fk" FOREIGN KEY ("bylaw_id") REFERENCES "public"."bylaws"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bylaw_revisions" ADD CONSTRAINT "bylaw_revisions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bylaws" ADD CONSTRAINT "bylaws_parent_section_id_bylaws_id_fk" FOREIGN KEY ("parent_section_id") REFERENCES "public"."bylaws"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bylaws" ADD CONSTRAINT "bylaws_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bylaws" ADD CONSTRAINT "bylaws_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_campaigns" ADD CONSTRAINT "communication_campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_campaign_id_communication_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."communication_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_attempts" ADD CONSTRAINT "email_send_attempts_idempotency_key_email_idempotency_keys_idempotency_key_fk" FOREIGN KEY ("idempotency_key") REFERENCES "public"."email_idempotency_keys"("idempotency_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tracking_events" ADD CONSTRAINT "email_tracking_events_campaign_id_communication_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."communication_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tracking_events" ADD CONSTRAINT "email_tracking_events_recipient_id_communication_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."communication_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_violation_id_violations_id_fk" FOREIGN KEY ("violation_id") REFERENCES "public"."violations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_email_recipients" ADD CONSTRAINT "manual_email_recipients_campaign_id_communication_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."communication_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_spots" ADD CONSTRAINT "parking_spots_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_lockers" ADD CONSTRAINT "storage_lockers_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violation_access_links" ADD CONSTRAINT "violation_access_links_violation_uuid_violations_uuid_fk" FOREIGN KEY ("violation_uuid") REFERENCES "public"."violations"("uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violation_histories" ADD CONSTRAINT "violation_histories_violation_uuid_violations_uuid_fk" FOREIGN KEY ("violation_uuid") REFERENCES "public"."violations"("uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violation_histories" ADD CONSTRAINT "violation_histories_violation_id_violations_id_fk" FOREIGN KEY ("violation_id") REFERENCES "public"."violations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violation_histories" DROP COLUMN "commenter_name";--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_uuid_unique" UNIQUE("uuid");