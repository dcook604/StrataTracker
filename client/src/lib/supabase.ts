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
  
  // In production, log error but don't block app initialization
  if (import.meta.env.PROD) {
    console.warn('[Supabase] Creating fallback client - authentication will fail gracefully');
    // Schedule error notification without blocking main thread
    setTimeout(() => {
      if (typeof window !== 'undefined' && !supabaseUrl && document.body) {
        // Use toast instead of alert to avoid blocking
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-md z-50';
        errorDiv.textContent = 'Configuration Error: Authentication system not properly configured. Please contact support.';
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 10000);
      }
    }, 3000); // Delay to ensure DOM is ready
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
    // Important for production CORS handling
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js/2.38.4'
    }
  },
  // Ensure proper CORS handling for production
  db: {
    schema: 'public'
  },
  // Add custom fetch for additional CORS handling if needed
  ...(import.meta.env.PROD && {
    fetch: (url: RequestInfo | URL, init?: RequestInit) => {
      const customInit: RequestInit = {
        ...init,
        headers: {
          ...init?.headers,
          'Access-Control-Allow-Credentials': 'true'
        }
      };
      return fetch(url, customInit);
    }
  })
}); 