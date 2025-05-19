import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Setup Neon database
neonConfig.webSocketConstructor = ws;

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    return false;
  }
  
  // Create connection pool
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 2
  });
  
  try {
    // Test basic query
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`Connection successful! Server time: ${result.rows[0].current_time}`);
    
    // Get list of tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`Tables in database (${tables.rowCount}):`);
    tables.rows.forEach((row, i) => console.log(`${i+1}. ${row.table_name}`));
    
    await pool.end();
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    await pool.end();
    return false;
  }
}

testDatabaseConnection().then(success => {
  if (success) {
    console.log('Database test completed successfully');
  } else {
    console.log('Database test failed');
  }
});