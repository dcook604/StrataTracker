import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseAnonKey ? 'Set' : 'Missing'
  });
  
  // In production, if Supabase config is missing, show a proper error instead of crashing
  if (import.meta.env.PROD) {
    // Create a dummy client to prevent crashes - auth will fail gracefully
    console.warn('Creating dummy Supabase client due to missing configuration');
  } else {
    throw new Error('Supabase URL and anon key are required. Check your .env file.');
  }
}

// Use fallback values for production to prevent complete app crash
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey); 