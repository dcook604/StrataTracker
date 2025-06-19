import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

// Configure the Neon WebSocket system
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config();

// Setup proper paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup logging
const logPath = path.join(__dirname, '..', 'logs', 'db-connection-test.log');
const logDir = path.dirname(logPath);

// Make sure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message: string, error?: unknown) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}${error ? `: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}` : ''}`;
  
  console.log(formattedMessage);
  fs.appendFileSync(logPath, formattedMessage + '\n');
}

async function testDatabaseConnection() {
  log('Starting database connection test');
  
  if (!process.env.DATABASE_URL) {
    log('ERROR: DATABASE_URL environment variable is not set');
    return;
  }
  
  const connectionString = process.env.DATABASE_URL;
  const maskedUrl = connectionString.replace(/postgres:\/\/([^:]+):([^@]+)@/, 'postgres://$1:****@');
  log(`Using connection string (masked): ${maskedUrl}`);
  
  const pool = new Pool({ 
    connectionString, 
    max: 1,
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true
  });
  
  try {
    log('Attempting to connect to database...');
    const startTime = Date.now();
    const result = await pool.query('SELECT NOW() as time');
    const endTime = Date.now();
    log(`Connection successful in ${endTime - startTime}ms. Database time: ${result.rows[0].time}`);

    // Test table existence
    log('Checking database tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    log(`Found ${tables.rowCount} tables in database:`);
    tables.rows.forEach((table, i) => {
      log(`  ${i+1}. ${table.table_name}`);
    });
    
    // Check row counts for key tables
    const keyTables = ['users', 'customers', 'property_units', 'violations', 'violation_categories'];
    log('Checking row counts for key tables:');
    for (const table of keyTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        log(`  ${table}: ${countResult.rows[0].count} rows`);
        
        // If users table and has entries, check the first user (anonymized)
        if (table === 'users' && countResult.rows[0].count > 0) {
          const userResult = await pool.query(`
            SELECT id, email, SUBSTRING(name FROM 1 FOR 1) || '***' as name_sample, role, "isAdmin"
            FROM users LIMIT 1
          `);
          if (userResult.rows.length > 0) {
            log(`  Sample user: ID=${userResult.rows[0].id}, Role=${userResult.rows[0].role}, IsAdmin=${userResult.rows[0].isAdmin}`);
          }
        }
      } catch (err) {
        log(`  Error checking table ${table}`, err);
      }
    }

  } catch (err) {
    log('Database connection failed', err);
  } finally {
    log('Closing connection pool');
    await pool.end();
    log('Connection test complete');
  }
}

// Run the test
testDatabaseConnection().catch(err => {
  log('Unhandled error in test script', err);
  process.exit(1);
});