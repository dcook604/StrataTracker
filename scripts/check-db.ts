import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables if .env exists
if (fs.existsSync('.env')) {
  dotenv.config();
}

// Log results to a file
const logFile = 'db-check-results.log';
const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  console.log(entry.trim());
  fs.appendFileSync(logFile, entry);
};

async function checkDb() {
  logToFile('Database Connection Check Starting...');
  
  if (!process.env.DATABASE_URL) {
    logToFile('ERROR: DATABASE_URL environment variable is not set');
    return;
  }
  
  // Create a simple connection pool
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1
  });
  
  try {
    // Test the basic connection
    logToFile('Running basic connection test...');
    const result = await pool.query('SELECT NOW()');
    logToFile(`Connection successful! Database time: ${result.rows[0].now}`);
    
    // List all tables
    logToFile('Checking tables in database...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (tables.rowCount === 0) {
      logToFile('WARNING: No tables found in the database');
    } else {
      logToFile(`Found ${tables.rowCount} tables:`);
      tables.rows.forEach((row, i) => logToFile(`  ${i+1}. ${row.table_name}`));
    }
    
    // Check each important table
    const expectedTables = ['users', 'property_units', 'customers', 'violations'];
    for (const table of expectedTables) {
      try {
        const count = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        logToFile(`Table '${table}' exists and contains ${count.rows[0].count} rows`);
      } catch (err) {
        logToFile(`ERROR accessing table '${table}': ${(err as Error).message}`);
      }
    }
    
    // Check connection pool status
    logToFile('Connection pool status:');
    logToFile(`  Total connections: ${pool.totalCount}`);
    logToFile(`  Idle connections: ${pool.idleCount}`);
    logToFile(`  Waiting clients: ${pool.waitingCount}`);
    
  } catch (err) {
    logToFile(`ERROR: Database connection test failed: ${(err as Error).message}`);
    logToFile(`Error stack: ${(err as Error).stack}`);
  } finally {
    // Close the pool
    await pool.end();
    logToFile('Connection pool closed');
    logToFile('Database Connection Check Complete');
  }
}

// Run the check
checkDb()
  .then(() => {
    console.log('Check complete. Results saved to:', logFile);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error running DB check:', err);
    process.exit(1);
  });