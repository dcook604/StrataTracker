CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"unit_number" text NOT NULL,
	"floor" text,
	"owner_name" text NOT NULL,
	"owner_email" text NOT NULL,
	"tenant_name" text,
	"tenant_email" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "customers_unit_number_unique" UNIQUE("unit_number")
);
--> statement-breakpoint
CREATE TABLE "property_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer,
	"unit_number" text NOT NULL,
	"floor" text,
	"owner_name" text NOT NULL,
	"owner_email" text NOT NULL,
	"tenant_name" text,
	"tenant_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "property_units_unit_number_unique" UNIQUE("unit_number")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" text NOT NULL,
	"setting_value" text,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by_id" integer,
	CONSTRAINT "system_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"is_council_member" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"last_login" timestamp,
	"failed_login_attempts" integer DEFAULT 0,
	"account_locked" boolean DEFAULT false,
	"password_reset_token" text,
	"password_reset_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "violation_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"bylaw_reference" text,
	"default_fine_amount" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "violation_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "violation_histories" (
	"id" serial PRIMARY KEY NOT NULL,
	"violation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "violations" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference_number" uuid DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" integer NOT NULL,
	"reported_by_id" integer NOT NULL,
	"category_id" integer,
	"violation_type" text NOT NULL,
	"violation_date" timestamp NOT NULL,
	"violation_time" text,
	"description" text NOT NULL,
	"bylaw_reference" text,
	"status" text DEFAULT 'new' NOT NULL,
	"fine_amount" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"pdf_generated" boolean DEFAULT false,
	"pdf_path" text,
	CONSTRAINT "violations_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
ALTER TABLE "property_units" ADD CONSTRAINT "property_units_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violation_histories" ADD CONSTRAINT "violation_histories_violation_id_violations_id_fk" FOREIGN KEY ("violation_id") REFERENCES "public"."violations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violation_histories" ADD CONSTRAINT "violation_histories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_category_id_violation_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."violation_categories"("id") ON DELETE no action ON UPDATE no action;