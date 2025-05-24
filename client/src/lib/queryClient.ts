import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Global flag to prevent multiple session expired toasts
let sessionExpiredToastShown = false;
let isRedirecting = false;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (res.status === 401) {
      // Prevent infinite redirects
      if (isRedirecting) {
        throw new Error('Session expired');
      }

      // Clear any stored session data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Only show toast once and only if not already on auth page
      if (!sessionExpiredToastShown && !window.location.pathname.includes('/auth')) {
        sessionExpiredToastShown = true;
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive',
        });
        
        // Reset the flag after a delay to allow future session expired messages
        setTimeout(() => {
          sessionExpiredToastShown = false;
        }, 5000);
      }
      
      // Only redirect if not already on auth page and not during login process
      if (!window.location.pathname.includes('/auth')) {
        isRedirecting = true;
        
        // Use the navigate function from wouter instead of direct window.history
        const { navigate } = await import("wouter/use-browser-location");
        navigate('/auth?expired=1', { replace: true });
        
        // Reset redirect flag after a delay
        setTimeout(() => {
          isRedirecting = false;
        }, 1000);
      }
      
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `HTTP ${res.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    return res;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network request failed');
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 401 errors (session expired)
        if (error?.message === "Session expired" || error?.status === 401) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
