import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Global 401 handler to ensure consistent authentication behavior
let isHandling401 = false; // Prevent multiple simultaneous redirects

export function handle401Error() {
  if (isHandling401) return; // Prevent multiple calls
  
  // Don't handle 401 if we're already on the auth page
  if (typeof window !== 'undefined' && window.location.pathname === '/auth') {
    console.log("[AUTH] 401 detected but already on auth page - skipping redirect");
    return;
  }
  
  isHandling401 = true;
  console.log("[AUTH] 401 detected - handling automatic logout");
  
  // Clear any stored auth data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
  }
  
  // Clear React Query cache of user data
  queryClient.setQueryData(["/api/user"], null);
  
  // Clear sensitive cached data
  queryClient.removeQueries({ 
    predicate: (query) => {
      const sensitiveKeys = ['/api/violations', '/api/communications', '/api/units', '/api/users'];
      return sensitiveKeys.some(key => query.queryKey[0]?.toString().includes(key));
    }
  });
  
  // Show session expired message
  toast({
    title: 'Session Expired',
    description: 'Your session has expired. Please log in again.',
    variant: 'destructive',
    duration: 5000,
  });
  
  // Redirect to login with session expired flag
  setTimeout(() => {
    window.location.href = '/auth?expired=1';
  }, 500); // Small delay to show toast
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 globally
    if (res.status === 401) {
      handle401Error();
      throw new Error('Session expired');
    }
    
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

    // Handle 401 globally
    if (res.status === 401) {
      handle401Error();
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

    // Handle 401 globally first
    if (res.status === 401) {
      // For auth check queries, return null silently (don't trigger global handler)
      if (unauthorizedBehavior === "returnNull" && queryKey[0] === "/api/user") {
        return null;
      }
      
      // For all other queries, trigger global 401 handling
      handle401Error();
      throw new Error('Session expired');
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
      onError: (error: Error) => {
        // If it's a session expired error, the global handler has already been called
        if (error.message === 'Session expired') {
          return; // Don't show additional error toast
        }
        
        // For other errors, show generic error message
        console.error('Mutation error:', error);
      }
    },
  },
});

// Reset the 401 handling flag periodically and on successful requests
setInterval(() => {
  isHandling401 = false;
}, 30000); // Reset every 30 seconds
