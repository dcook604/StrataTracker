import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import logger from './utils/logger';

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

pool.on('error', (err: any) => {
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
} catch (err: any) {
  logger.error('Failed to initialize Drizzle ORM:', {
    message: err.message,
    stack: err.stack
  });
  throw err;
}

// Test the database connection with detailed error handling
(async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    logger.info(`Database connection test successful, server time: ${result.rows[0].current_time}`);
    
    // Check tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    logger.info(`Database contains ${tables.rowCount} tables`);
    
  } catch (err: any) {
    logger.error('Database connection test failed:', {
      message: err.message,
      stack: err.stack,
      code: err.code || 'unknown'
    });
    // Don't throw here to avoid crashing the app
    logger.warn('Application will continue despite database connection issues');
  }
})();

// Export the pool and db for use in other modules
export { pool, db };
