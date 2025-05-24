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
      
      // Only redirect if not already on auth page
      if (!window.location.pathname.includes('/auth')) {
        isRedirecting = true;
        // Use history API instead of window.location to maintain React Router state
        if (typeof window !== 'undefined' && window.history && window.history.pushState) {
          window.history.pushState(null, '', '/auth?expired=1');
          // Dispatch a popstate event to trigger React Router update
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          // Fallback to window.location if history API is not available
          window.location.href = '/auth?expired=1';
        }
        
        // Reset redirect flag after a delay
        setTimeout(() => {
          isRedirecting = false;
        }, 1000);
      }
      
      throw new Error('Session expired');
    }

    // Handle non-JSON responses
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        throw new Error(errorData.message || "An error occurred");
      } else {
        const errorText = await res.text();
        console.error("Non-JSON error response:", errorText);
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }

    return res;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
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
