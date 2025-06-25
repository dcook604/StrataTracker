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

export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (response.status === 401) {
    handle401Error();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
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
