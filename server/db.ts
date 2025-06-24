import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema.js';
import logger from './utils/logger.js';
import { MigrationRunner } from './migration-runner.js';

// Log database connection attempt
logger.info('Setting up database connection...');

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is not set');
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Mask sensitive connection string details for logging
const connectionString = process.env.DATABASE_URL;
const maskedConnectionString = connectionString.replace(
  /postgres:\/\/([^:]+):([^@]+)@/,
  'postgres://$1:****@'
);
logger.info(`Database connection string (masked): ${maskedConnectionString}`);

// Configure connection pool with standard PostgreSQL settings
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,                        // Reduce max connections to avoid overloading
  idleTimeoutMillis: 60000,       // Longer idle timeout (1 minute)
  connectionTimeoutMillis: 5000,  // Longer connection timeout (5 seconds)
  allowExitOnIdle: true           // Allow exit when all connections are idle
});

// Add detailed event listeners to the pool
pool.on('connect', () => {
  logger.info('New database connection established');
});

pool.on('error', (err: Error & { code?: string; details?: string }) => {
  logger.error('Database pool error:', {
    message: err.message,
    stack: err.stack,
    code: err.code || 'unknown',
    details: err.details || null
  });
});

// Initialize Drizzle ORM with our schema
let db: ReturnType<typeof drizzle>;
try {
  db = drizzle(pool, { schema });
  logger.info('Drizzle ORM initialized successfully');
} catch (err: unknown) {
  logger.error('Failed to initialize Drizzle ORM:', {
    message: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : undefined
  });
  throw err;
}

// Initialize migration runner
const migrationRunner = new MigrationRunner(pool);

// Test the database connection and run migrations
(async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    logger.info(`Database connection test successful, server time: ${result.rows[0].current_time}`);
    
    // Check tables before migration
    const tablesBefore = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    logger.info(`Database contains ${tablesBefore.rowCount} tables before migration check`);
    
    // 🚀 Run automatic migrations (safe, no data overwrites)
    await migrationRunner.runStartupMigrations();
    
    // Check tables after migration
    const tablesAfter = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    logger.info(`Database contains ${tablesAfter.rowCount} tables after migration check`);
    
    // Get database status
    const dbStatus = await migrationRunner.getDatabaseStatus();
    logger.info('Database status:', dbStatus);
    
  } catch (err: unknown) {
    logger.error('Database connection or migration failed:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      code: (err as Error & { code?: string })?.code || 'unknown'
    });
    // Don't throw here to avoid crashing the app
    logger.warn('Application will continue despite database connection issues');
  }
})();

// Export the pool, db, and migration runner for use in other modules
export { pool, db, migrationRunner };
