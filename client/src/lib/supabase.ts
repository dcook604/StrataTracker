import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced debugging for production issues
console.log('[Supabase] Configuration check:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Missing',
  key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Missing',
  environment: import.meta.env.MODE,
  isProduction: import.meta.env.PROD
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Supabase configuration missing. This will cause authentication failures.';
  console.error('[Supabase]', errorMsg, {
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseAnonKey ? 'Set' : 'Missing',
    hint: 'Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in build environment'
  });
  
  // In production, show user-friendly error instead of crashing
  if (import.meta.env.PROD) {
    console.warn('[Supabase] Creating fallback client - authentication will fail gracefully');
    // Create alert for users in production
    setTimeout(() => {
      if (typeof window !== 'undefined' && !supabaseUrl) {
        alert('Configuration Error: Authentication system not properly configured. Please contact support.');
      }
    }, 1000);
  } else {
    throw new Error('Supabase URL and anon key are required. Check your .env file.');
  }
}

// Use fallback values for production to prevent complete app crash
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  }
}); 