-- Migration: Add Bylaws Schema
-- Created: $(date)

-- Bylaw categories table
CREATE TABLE "bylaw_categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "display_order" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "bylaw_categories_name_unique" UNIQUE("name")
);

-- Main bylaws table
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
  CONSTRAINT "bylaws_section_number_unique" UNIQUE("section_number"),
  CONSTRAINT "bylaws_parent_section_id_fk" FOREIGN KEY ("parent_section_id") REFERENCES "public"."bylaws"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "bylaws_created_by_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "bylaws_updated_by_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);

-- Bylaw category links (many-to-many relationship)
CREATE TABLE "bylaw_category_links" (
  "id" serial PRIMARY KEY NOT NULL,
  "bylaw_id" integer NOT NULL,
  "category_id" integer NOT NULL,
  CONSTRAINT "bylaw_category_links_bylaw_id_fk" FOREIGN KEY ("bylaw_id") REFERENCES "public"."bylaws"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "bylaw_category_links_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."bylaw_categories"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "bylaw_category_links_unique" UNIQUE("bylaw_id", "category_id")
);

-- Bylaw revisions for tracking changes
CREATE TABLE "bylaw_revisions" (
  "id" serial PRIMARY KEY NOT NULL,
  "bylaw_id" integer NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "revision_notes" text,
  "effective_date" date,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by_id" integer NOT NULL,
  CONSTRAINT "bylaw_revisions_bylaw_id_fk" FOREIGN KEY ("bylaw_id") REFERENCES "public"."bylaws"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "bylaw_revisions_created_by_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);

-- Create indexes for better performance
CREATE INDEX "bylaws_section_number_idx" ON "bylaws"("section_number");
CREATE INDEX "bylaws_part_number_idx" ON "bylaws"("part_number");
CREATE INDEX "bylaws_is_active_idx" ON "bylaws"("is_active");
CREATE INDEX "bylaws_parent_section_id_idx" ON "bylaws"("parent_section_id");
CREATE INDEX "bylaw_categories_display_order_idx" ON "bylaw_categories"("display_order");
CREATE INDEX "bylaw_category_links_bylaw_id_idx" ON "bylaw_category_links"("bylaw_id");
CREATE INDEX "bylaw_category_links_category_id_idx" ON "bylaw_category_links"("category_id"); 