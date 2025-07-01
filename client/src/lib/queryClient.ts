import { QueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

let isHandling401 = false;

function handle401Error() {
  if (isHandling401) return;
  if (typeof window !== 'undefined' && window.location.pathname === '/auth') return;
  
  isHandling401 = true;
  
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
  
  queryClient.clear();
  
  toast({
    title: 'Session Expired',
    description: 'Your session has expired. Please log in again.',
    variant: 'destructive',
    duration: 5000,
  });
  
  setTimeout(() => {
    window.location.href = '/auth?expired=1';
  }, 500);
}

export async function apiRequest(method: string, url: string, data?: unknown, token?: string): Promise<Response> {
  let accessToken = token;
  if (!accessToken) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      accessToken = session.access_token;
    }
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Include Supabase-specific headers for CORS compatibility
    'x-client-info': 'supabase-js/2.38.4',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    // Include apikey header if we have the anon key (for Supabase compatibility)
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseAnonKey) {
      headers['apikey'] = supabaseAnonKey;
    }
  }

  const requestOptions: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    // Ensure credentials are included for CORS
    credentials: 'include',
    // Handle preflight requests properly
    mode: 'cors',
  };

  console.log(`[API Request] ${method} ${url}`, { 
    hasAuth: !!accessToken,
    origin: window.location.origin 
  });

  const response = await fetch(url, requestOptions);

  if (response.status === 401) {
    handle401Error();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", { 
      status: response.status, 
      statusText: response.statusText, 
      error: errorText,
      url 
    });
    throw new Error(errorText || 'An unexpected API error occurred');
  }

  return response;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const response = await apiRequest("GET", queryKey[0] as string);
        return response.json();
      },
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        if (error.message !== 'Session expired') {
          toast({
            title: "An error occurred",
            description: error.message || "Please try again.",
            variant: "destructive",
          });
        }
      },
    },
  },
});

// Reset the 401 handling flag periodically
setInterval(() => { isHandling401 = false; }, 30000);
