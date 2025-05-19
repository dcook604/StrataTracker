import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon to use WebSocket
neonConfig.webSocketConstructor = ws;

async function checkUser() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_vbNM8rKxV9Za@ep-restless-base-a5ay0l70.us-east-2.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    const result = await pool.query(
      'SELECT id, email, username, full_name, is_admin, is_user FROM users WHERE email = $1',
      ['dcook@spectrum4.ca']
    );

    if (result.rows.length > 0) {
      console.log('User found:', result.rows[0]);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkUser(); 