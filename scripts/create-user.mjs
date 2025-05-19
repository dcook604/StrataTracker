import { Pool, neonConfig } from '@neondatabase/serverless';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import ws from 'ws';

// Configure Neon to use WebSocket
neonConfig.webSocketConstructor = ws;

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function createUser() {
  // Create a connection pool
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_vbNM8rKxV9Za@ep-restless-base-a5ay0l70.us-east-2.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    // Hash the password
    const hashedPassword = await hashPassword('admin123!');

    // Insert the user
    const result = await pool.query(
      `INSERT INTO users (
        email,
        username,
        password,
        full_name,
        is_admin,
        is_user,
        force_password_change,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
      [
        'dcook@spectrum4.ca',
        'dcook@spectrum4.ca',
        hashedPassword,
        'D Cook',
        true,
        true,
        false
      ]
    );

    console.log('User created successfully:', result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createUser(); 