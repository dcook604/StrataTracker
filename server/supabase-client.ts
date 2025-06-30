import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Log Supabase configuration on server start
console.log('[Supabase Server Client] Initializing...');
console.log(`[Supabase Server Client] URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'}`);
console.log(`[Supabase Server Client] Anon Key Set: ${supabaseAnonKey ? 'Yes' : 'NO'}`);
console.log(`[Supabase Server Client] Service Role Key Set: ${supabaseServiceRoleKey ? 'Yes' : 'NO'}`);

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  console.error('[Supabase Server Client] FATAL: Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

// Admin client for server-side operations (can bypass RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Regular client for JWT verification
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}); 