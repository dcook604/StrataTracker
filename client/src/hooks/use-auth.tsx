import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define the query key as a const for type safety and consistency
const authQueryKey = ["/api/auth/me"] as const;

// Omit the password from the user type for client-side usage
// SelectUser (imported as User from schema) already includes optional snake_case variants.
// So SafeUser primarily just omits password. The compatibility properties are handled during context value creation.
type SafeUser = Omit<SelectUser, "password">;

// AuthContextType's user property will be the fully processed user object with all boolean flags.
// We might need a different type for what's stored in context vs. what useQuery returns,
// or ensure useQuery's result is immediately transformed.
// For simplicity, let's say AuthContextType.user is an object where all these flags are boolean.
type AuthContextUser = SafeUser & {
  isAdmin: boolean;
  is_admin: boolean;
  isCouncilMember: boolean;
  is_council_member: boolean;
  isUser: boolean;
  is_user: boolean;
};

type AuthContextType = {
  user: AuthContextUser | null; // Use the refined type for context
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SafeUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SafeUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "email" | "password"> & { rememberMe?: boolean };

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Check if we're on an auth-related page to avoid unnecessary queries
  const isAuthPage = typeof window !== 'undefined' && (
    window.location.pathname === '/auth' || 
    window.location.pathname === '/forgot-password' ||
    window.location.pathname === '/reset-password' ||
    window.location.pathname.startsWith('/violation/comment/')
  );

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SafeUser | null, Error, SafeUser | null, typeof authQueryKey>({
    queryKey: authQueryKey,
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", authQueryKey[0]);
        return await response.json() as SafeUser;
      } catch (err: any) {
        // If session expired, don't throw - just return null
        if (err.message === 'Session expired') {
          return null;
        }
        // For other errors, still return null to avoid crashes
        console.warn('Auth query failed:', err);
        return null;
      }
    },
    enabled: !isAuthPage, // Don't run the query on auth pages
    retry: (failureCount, error: any) => {
      // Never retry session expired errors
      if (error?.message === "Session expired" || error?.status === 401) {
        return false;
      }
      return failureCount < 1; // Only retry once for other errors
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Clear user data when on auth pages to prevent stale state
  useEffect(() => {
    if (isAuthPage && user) {
      queryClient.setQueryData<SafeUser | null>(authQueryKey, null);
    }
  }, [isAuthPage, user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json() as SafeUser;
    },
    onSuccess: (loggedInUser: SafeUser) => {
      queryClient.setQueryData<SafeUser | null>(authQueryKey, loggedInUser);
      // Clear any error states
      queryClient.removeQueries({ 
        queryKey: authQueryKey, 
        type: 'inactive' 
      });
      toast({
        title: "Login successful",
        description: `Welcome back, ${loggedInUser.fullName}`,
      });
      
      // Navigate programmatically instead of relying on redirect
      if (typeof window !== 'undefined') {
        // Use history API to maintain React Router state
        window.history.pushState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json() as SafeUser;
    },
    onSuccess: (registeredUser: SafeUser) => {
      queryClient.setQueryData<SafeUser | null>(authQueryKey, registeredUser);
      toast({
        title: "Registration successful",
        description: `Welcome to StrataGuard, ${registeredUser.fullName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear all query cache to ensure clean state
      queryClient.clear();
      queryClient.setQueryData<SafeUser | null>(authQueryKey, null);
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
      // Navigate to auth page
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/auth');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ? {
          ...user,
          // Ensure all six variants are definite booleans
          isAdmin: !!(user.isAdmin || user.is_admin),
          isCouncilMember: !!(user.isCouncilMember || user.is_council_member),
          isUser: !!(user.isUser || user.is_user),
          is_admin: !!(user.is_admin || user.isAdmin),
          is_council_member: !!(user.is_council_member || user.isCouncilMember),
          is_user: !!(user.is_user || user.isUser),
        } : null,
        isLoading: !isAuthPage && isLoading, // Don't show loading on auth pages
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
