import { Pool } from 'pg';
import logger from './utils/logger.js';

/**
 * Safe migration runner that ensures all required tables exist
 * Uses CREATE TABLE IF NOT EXISTS to prevent data loss
 * Runs automatically on application startup
 */
export class MigrationRunner {
  constructor(private pool: Pool) {}

  async runStartupMigrations(): Promise<void> {
    logger.info('Starting automatic database migration check...');
    
    try {
      // Check which tables exist
      const existingTables = await this.getExistingTables();
      logger.info(`Found ${existingTables.length} existing tables: ${existingTables.join(', ')}`);

      // Run comprehensive schema migration
      await this.ensureCompleteSchema();
      
      // Verify critical tables
      await this.verifyCriticalTables();
      
      logger.info('✅ Database migration check completed successfully');
    } catch (error) {
      logger.error('❌ Database migration check failed:', error);
      throw error;
    }
  }

  private async getExistingTables(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  }

  private async ensureCompleteSchema(): Promise<void> {
    logger.info('Ensuring complete database schema...');

    // Run the comprehensive migration inline (production-safe)
    await this.runComprehensiveMigration();

    logger.info('✓ Complete schema migration applied');
  }

  private async runComprehensiveMigration(): Promise<void> {
    // Step 1: Core tables
    await this.pool.query(`
      -- Profiles table (Supabase auth)
      CREATE TABLE IF NOT EXISTS "profiles" (
        "id" uuid PRIMARY KEY NOT NULL,
        "full_name" text,
        "role" text DEFAULT 'user' NOT NULL,
        "updated_at" timestamp DEFAULT now(),
        "created_at" timestamp DEFAULT now()
      );

      -- Property units table with all required columns
      CREATE TABLE IF NOT EXISTS "property_units" (
        "id" serial PRIMARY KEY NOT NULL,
        "customer_id" integer,
        "unit_number" text NOT NULL,
        "strata_lot" text,
        "floor" text,
        "townhouse" boolean DEFAULT false NOT NULL,
        "mailing_street1" text,
        "mailing_street2" text,
        "mailing_city" text,
        "mailing_state_province" text,
        "mailing_postal_code" text,
        "mailing_country" text,
        "phone" text,
        "notes" text,
        "owner_name" text,
        "owner_email" text,
        "tenant_name" text,
        "tenant_email" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      -- Ensure unit_number is unique
      CREATE UNIQUE INDEX IF NOT EXISTS "property_units_unit_number_unique" ON "property_units" ("unit_number");
    `);

    await this.pool.query(`
      -- Violation categories table
      CREATE TABLE IF NOT EXISTS "violation_categories" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "bylaw_reference" text,
        "default_fine_amount" integer,
        "active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      -- Ensure category name is unique
      CREATE UNIQUE INDEX IF NOT EXISTS "violation_categories_name_unique" ON "violation_categories" ("name");
    `);

    await this.pool.query(`
      -- System settings table with UUID foreign key
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "setting_key" text NOT NULL,
        "setting_value" text,
        "description" text,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "updated_by_id" uuid
      );

      -- Add foreign key if not exists
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'system_settings_updated_by_id_profiles_id_fk'
        ) THEN
          ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_profiles_id_fk" 
            FOREIGN KEY ("updated_by_id") REFERENCES "profiles"("id");
        END IF;
      END $$;

      -- Ensure setting_key is unique
      CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_setting_key_unique" ON "system_settings" ("setting_key");
    `);

    // Step 2: Violations table with comprehensive schema
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "violations" (
        "id" serial PRIMARY KEY NOT NULL,
        "uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
        "reference_number" uuid DEFAULT gen_random_uuid() NOT NULL,
        "unit_id" integer NOT NULL,
        "reported_by_id" uuid,
        "category_id" integer,
        "violation_type" text NOT NULL,
        "violation_date" timestamp NOT NULL,
        "violation_time" text,
        "description" text NOT NULL,
        "bylaw_reference" text,
        "status" text DEFAULT 'pending_approval' NOT NULL,
        "fine_amount" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "attachments" jsonb DEFAULT '[]',
        "pdf_generated" boolean DEFAULT false,
        "pdf_path" text,
        "incident_area" text,
        "concierge_name" text,
        "people_involved" text,
        "noticed_by" text,
        "damage_to_property" text,
        "damage_details" text,
        "police_involved" text,
        "police_details" text
      );

      -- Add foreign keys if not exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'violations_unit_id_property_units_id_fk'
        ) THEN
          ALTER TABLE "violations" ADD CONSTRAINT "violations_unit_id_property_units_id_fk" 
            FOREIGN KEY ("unit_id") REFERENCES "property_units"("id");
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'violations_reported_by_id_profiles_id_fk'
        ) THEN
          ALTER TABLE "violations" ADD CONSTRAINT "violations_reported_by_id_profiles_id_fk" 
            FOREIGN KEY ("reported_by_id") REFERENCES "profiles"("id");
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'violations_category_id_violation_categories_id_fk'
        ) THEN
          ALTER TABLE "violations" ADD CONSTRAINT "violations_category_id_violation_categories_id_fk" 
            FOREIGN KEY ("category_id") REFERENCES "violation_categories"("id");
        END IF;
      END $$;

      -- Ensure unique constraints
      CREATE UNIQUE INDEX IF NOT EXISTS "violations_uuid_unique" ON "violations" ("uuid");
      CREATE UNIQUE INDEX IF NOT EXISTS "violations_reference_number_unique" ON "violations" ("reference_number");
    `);

    // Step 3: All other essential tables
    await this.pool.query(`
      -- Violation histories table
      CREATE TABLE IF NOT EXISTS "violation_histories" (
        "id" serial PRIMARY KEY NOT NULL,
        "violation_id" integer,
        "violation_uuid" uuid,
        "user_id" uuid,
        "action" text NOT NULL,
        "details" jsonb,
        "rejection_reason" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      -- Add foreign keys
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'violation_histories_violation_id_violations_id_fk'
        ) THEN
          ALTER TABLE "violation_histories" ADD CONSTRAINT "violation_histories_violation_id_violations_id_fk" 
            FOREIGN KEY ("violation_id") REFERENCES "violations"("id") ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'violation_histories_violation_uuid_violations_uuid_fk'
        ) THEN
          ALTER TABLE "violation_histories" ADD CONSTRAINT "violation_histories_violation_uuid_violations_uuid_fk" 
            FOREIGN KEY ("violation_uuid") REFERENCES "violations"("uuid");
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'violation_histories_user_id_profiles_id_fk'
        ) THEN
          ALTER TABLE "violation_histories" ADD CONSTRAINT "violation_histories_user_id_profiles_id_fk" 
            FOREIGN KEY ("user_id") REFERENCES "profiles"("id");
        END IF;
      END $$;
    `);

    // Step 4: Person management tables
    await this.pool.query(`
      -- Persons table
      CREATE TABLE IF NOT EXISTS "persons" (
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

      -- Unit-Person roles
      CREATE TABLE IF NOT EXISTS "unit_person_roles" (
        "id" serial PRIMARY KEY NOT NULL,
        "unit_id" integer NOT NULL,
        "person_id" integer NOT NULL,
        "role" text NOT NULL,
        "receive_email_notifications" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      -- Add foreign keys
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'unit_person_roles_unit_id_property_units_id_fk'
        ) THEN
          ALTER TABLE "unit_person_roles" ADD CONSTRAINT "unit_person_roles_unit_id_property_units_id_fk" 
            FOREIGN KEY ("unit_id") REFERENCES "property_units"("id");
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'unit_person_roles_person_id_persons_id_fk'
        ) THEN
          ALTER TABLE "unit_person_roles" ADD CONSTRAINT "unit_person_roles_person_id_persons_id_fk" 
            FOREIGN KEY ("person_id") REFERENCES "persons"("id");
        END IF;
      END $$;
    `);

    // Step 5: Create remaining tables (facility management, communication, etc.)
    await this.createRemainingTables();

    // Step 6: Performance indexes
    await this.createPerformanceIndexes();
  }

  private async createRemainingTables(): Promise<void> {
    // Create all remaining tables (parking, storage, communication, bylaws, etc.)
    const tables = [
      // Email deduplication system (essential for production)
      `CREATE TABLE IF NOT EXISTS "email_idempotency_keys" (
        "id" serial PRIMARY KEY NOT NULL,
        "key" text NOT NULL UNIQUE,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "expires_at" timestamp NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS "email_send_attempts" (
        "id" serial PRIMARY KEY NOT NULL,
        "idempotency_key" text NOT NULL,
        "recipient" text NOT NULL,
        "subject" text NOT NULL,
        "status" text NOT NULL,
        "error_message" text,
        "attempt_count" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS "email_deduplication_log" (
        "id" serial PRIMARY KEY NOT NULL,
        "content_hash" text NOT NULL,
        "recipient" text NOT NULL,
        "subject" text NOT NULL,
        "first_sent_at" timestamp DEFAULT now() NOT NULL,
        "last_attempted_at" timestamp DEFAULT now() NOT NULL,
        "attempt_count" integer DEFAULT 1 NOT NULL
      );`,

      // Admin announcements (ensure complete schema)
      `CREATE TABLE IF NOT EXISTS "admin_announcements" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "content" jsonb NOT NULL,
        "html_content" text NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "priority" integer DEFAULT 0 NOT NULL,
        "expires_at" timestamp,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,

      // Facility management
      `CREATE TABLE IF NOT EXISTS "parking_spots" (
        "id" serial PRIMARY KEY NOT NULL,
        "unit_id" integer NOT NULL,
        "identifier" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,
      
      `CREATE TABLE IF NOT EXISTS "storage_lockers" (
        "id" serial PRIMARY KEY NOT NULL,
        "unit_id" integer NOT NULL,
        "identifier" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,
      
      `CREATE TABLE IF NOT EXISTS "bike_lockers" (
        "id" serial PRIMARY KEY NOT NULL,
        "unit_id" integer NOT NULL,
        "identifier" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,

      // Communication system
      `CREATE TABLE IF NOT EXISTS "communication_campaigns" (
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
        "created_by_id" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS "communication_recipients" (
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
        "tracking_id" text UNIQUE,
        "created_at" timestamp DEFAULT now() NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS "communication_templates" (
        "id" serial PRIMARY KEY NOT NULL,
        "uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "type" text NOT NULL,
        "subject" text NOT NULL,
        "content" text NOT NULL,
        "is_default" boolean DEFAULT false NOT NULL,
        "created_by_id" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,

      // Bylaw management
      `CREATE TABLE IF NOT EXISTS "bylaw_categories" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL UNIQUE,
        "description" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS "bylaws" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "content" text NOT NULL,
        "bylaw_number" text UNIQUE,
        "effective_date" date,
        "status" text DEFAULT 'active' NOT NULL,
        "category_id" integer,
        "created_by_id" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,

      // Other essential tables...
      `CREATE TABLE IF NOT EXISTS "violation_access_links" (
        "id" serial PRIMARY KEY NOT NULL,
        "violation_id" integer NOT NULL,
        "violation_uuid" uuid,
        "recipient_email" text NOT NULL,
        "token" uuid DEFAULT gen_random_uuid() NOT NULL,
        "expires_at" timestamp NOT NULL,
        "used_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS "email_verification_codes" (
        "id" serial PRIMARY KEY NOT NULL,
        "person_id" integer NOT NULL,
        "violation_id" integer NOT NULL,
        "code_hash" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "used_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS "public_user_sessions" (
        "id" serial PRIMARY KEY NOT NULL,
        "session_token" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "person_id" integer NOT NULL,
        "unit_id" integer NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "last_accessed" timestamp DEFAULT now() NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" uuid,
        "action" text NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" text,
        "details" jsonb,
        "ip_address" text,
        "user_agent" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );`
    ];

    for (const tableSQL of tables) {
      await this.pool.query(tableSQL);
    }

    // Add foreign key constraints for the remaining tables
    await this.addRemainingForeignKeys();
  }

  private async addRemainingForeignKeys(): Promise<void> {
    const foreignKeys = [
      // Facility management foreign keys
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'parking_spots_unit_id_property_units_id_fk'
        ) THEN
          ALTER TABLE "parking_spots" ADD CONSTRAINT "parking_spots_unit_id_property_units_id_fk" 
            FOREIGN KEY ("unit_id") REFERENCES "property_units"("id") ON DELETE CASCADE;
        END IF;
      END $$;`,

      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'storage_lockers_unit_id_property_units_id_fk'
        ) THEN
          ALTER TABLE "storage_lockers" ADD CONSTRAINT "storage_lockers_unit_id_property_units_id_fk" 
            FOREIGN KEY ("unit_id") REFERENCES "property_units"("id") ON DELETE CASCADE;
        END IF;
      END $$;`,

      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'bike_lockers_unit_id_property_units_id_fk'
        ) THEN
          ALTER TABLE "bike_lockers" ADD CONSTRAINT "bike_lockers_unit_id_property_units_id_fk" 
            FOREIGN KEY ("unit_id") REFERENCES "property_units"("id") ON DELETE CASCADE;
        END IF;
      END $$;`,

      // Communication foreign keys
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'communication_campaigns_created_by_id_profiles_id_fk'
        ) THEN
          ALTER TABLE "communication_campaigns" ADD CONSTRAINT "communication_campaigns_created_by_id_profiles_id_fk" 
            FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id");
        END IF;
      END $$;`,

      // Other essential foreign keys...
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'violation_access_links_violation_id_violations_id_fk'
        ) THEN
          ALTER TABLE "violation_access_links" ADD CONSTRAINT "violation_access_links_violation_id_violations_id_fk" 
            FOREIGN KEY ("violation_id") REFERENCES "violations"("id");
        END IF;
      END $$;`
    ];

    for (const fkSQL of foreignKeys) {
      await this.pool.query(fkSQL);
    }
  }

  private async createPerformanceIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "idx_violations_uuid" ON "violations" ("uuid");',
      'CREATE INDEX IF NOT EXISTS "idx_violations_status" ON "violations" ("status");',
      'CREATE INDEX IF NOT EXISTS "idx_violations_unit_id" ON "violations" ("unit_id");',
      'CREATE INDEX IF NOT EXISTS "idx_violations_created_at" ON "violations" ("created_at");',
      'CREATE INDEX IF NOT EXISTS "idx_property_units_unit_number" ON "property_units" ("unit_number");',
      'CREATE INDEX IF NOT EXISTS "idx_persons_email" ON "persons" ("email");',
      'CREATE INDEX IF NOT EXISTS "idx_profiles_role" ON "profiles" ("role");',
      'CREATE INDEX IF NOT EXISTS "idx_admin_announcements_active" ON "admin_announcements" ("is_active");',
      'CREATE INDEX IF NOT EXISTS "idx_email_idempotency_expires" ON "email_idempotency_keys" ("expires_at");'
    ];

    for (const indexSQL of indexes) {
      await this.pool.query(indexSQL);
    }
  }

  private async verifyCriticalTables(): Promise<void> {
    const criticalTables = [
      'profiles',
      'property_units',
      'violations',
      'violation_categories',
      'violation_histories',
      'persons',
      'unit_person_roles',
      'system_settings',
      'admin_announcements',
      'email_idempotency_keys',
      'email_send_attempts',
      'email_deduplication_log'
    ];

    for (const tableName of criticalTables) {
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);

      if (!result.rows[0].exists) {
        throw new Error(`Critical table '${tableName}' was not created successfully`);
      }
    }

    logger.info('✅ All critical tables verified successfully');
  }

  /**
   * Get database status for health checks
   */
  async getDatabaseStatus(): Promise<{
    tablesCount: number;
    criticalTablesPresent: boolean;
    lastMigrationCheck: Date;
  }> {
    const tables = await this.getExistingTables();
    const criticalTables = [
      'profiles',
      'property_units', 
      'violations',
      'violation_categories',
      'persons',
      'admin_announcements'
    ];
    const criticalTablesPresent = criticalTables.every(table => tables.includes(table));

    return {
      tablesCount: tables.length,
      criticalTablesPresent,
      lastMigrationCheck: new Date()
    };
  }
} 