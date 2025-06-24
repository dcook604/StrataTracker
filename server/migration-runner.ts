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

      // Run safe table creation (IF NOT EXISTS)
      await this.ensureRequiredTables();
      
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

  private async ensureRequiredTables(): Promise<void> {
    logger.info('Ensuring all required tables exist...');

    // 1. Profiles table (Supabase auth integration)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "profiles" (
        "id" uuid PRIMARY KEY NOT NULL,
        "full_name" text,
        "role" text DEFAULT 'user' NOT NULL,
        "updated_at" timestamp DEFAULT now(),
        "created_at" timestamp DEFAULT now()
      );
    `);
    logger.info('✓ Profiles table ready');

    // 2. Admin announcements table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "admin_announcements" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "content" jsonb NOT NULL,
        "html_content" text NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "priority" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_by" integer,
        "updated_by" integer,
        "created_by_new" uuid,
        "updated_by_new" uuid
      );
    `);
    logger.info('✓ Admin announcements table ready');

    // 3. Email deduplication tables
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "email_idempotency_keys" (
        "id" serial PRIMARY KEY NOT NULL,
        "key" text NOT NULL UNIQUE,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "expires_at" timestamp NOT NULL
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "email_send_attempts" (
        "id" serial PRIMARY KEY NOT NULL,
        "idempotency_key" text NOT NULL,
        "recipient" text NOT NULL,
        "subject" text NOT NULL,
        "status" text NOT NULL,
        "error_message" text,
        "attempt_count" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "email_deduplication_log" (
        "id" serial PRIMARY KEY NOT NULL,
        "content_hash" text NOT NULL,
        "recipient" text NOT NULL,
        "subject" text NOT NULL,
        "first_sent_at" timestamp DEFAULT now() NOT NULL,
        "last_attempted_at" timestamp DEFAULT now() NOT NULL,
        "attempt_count" integer DEFAULT 1 NOT NULL
      );
    `);
    logger.info('✓ Email deduplication tables ready');

    // 4. Ensure other critical indexes exist
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS "idx_profiles_role" ON "profiles" ("role");
    `);
    
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS "idx_admin_announcements_active" ON "admin_announcements" ("is_active");
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS "idx_email_idempotency_expires" ON "email_idempotency_keys" ("expires_at");
    `);

    logger.info('✓ Required indexes ready');
  }

  private async verifyCriticalTables(): Promise<void> {
    const criticalTables = [
      'profiles',
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
    const criticalTables = ['profiles', 'admin_announcements'];
    const criticalTablesPresent = criticalTables.every(table => tables.includes(table));

    return {
      tablesCount: tables.length,
      criticalTablesPresent,
      lastMigrationCheck: new Date()
    };
  }
} 