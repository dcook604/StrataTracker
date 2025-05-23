CREATE TABLE "persons" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_user_id" text,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"is_system_user" boolean DEFAULT false NOT NULL,
	"has_cat" boolean DEFAULT false,
	"has_dog" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"parking_spots" integer DEFAULT 0,
	"storage_lockers" integer DEFAULT 0,
	"bike_lockers" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unit_facilities_unit_id_unique" UNIQUE("unit_id")
);
--> statement-breakpoint
CREATE TABLE "unit_person_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"role" text NOT NULL,
	"receive_email_notifications" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "violation_access_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"violation_id" integer NOT NULL,
	"recipient_email" text NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "violation_access_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "property_units" ALTER COLUMN "owner_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "property_units" ALTER COLUMN "owner_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "violations" ALTER COLUMN "status" SET DEFAULT 'pending_approval';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_user" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "force_password_change" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "violation_histories" ADD COLUMN "commenter_name" text;--> statement-breakpoint
ALTER TABLE "unit_facilities" ADD CONSTRAINT "unit_facilities_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_person_roles" ADD CONSTRAINT "unit_person_roles_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_person_roles" ADD CONSTRAINT "unit_person_roles_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violation_access_links" ADD CONSTRAINT "violation_access_links_violation_id_violations_id_fk" FOREIGN KEY ("violation_id") REFERENCES "public"."violations"("id") ON DELETE no action ON UPDATE no action;