import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
  const [location, navigate] = useLocation();
  
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
        console.log('Auth query running - checking session...');
        const response = await apiRequest("GET", authQueryKey[0]);
        const userData = await response.json() as SafeUser;
        console.log('Auth query successful:', userData);
        return userData;
      } catch (err: any) {
        console.log('Auth query failed:', err.message);
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
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
  });

  // Clear user data when on auth pages to prevent stale state
  useEffect(() => {
    if (isAuthPage && user) {
      queryClient.setQueryData<SafeUser | null>(authQueryKey, null);
    }
  }, [isAuthPage, user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('Login mutation starting...');
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json() as SafeUser;
      console.log('Login response received:', userData);
      return userData;
    },
    onSuccess: async (loggedInUser: SafeUser) => {
      console.log('Login mutation onSuccess called with:', loggedInUser);
      
      // Show success toast first
      toast({
        title: "Login successful",
        description: `Welcome back, ${loggedInUser.fullName}`,
      });
      
      // Set the user data in the cache
      queryClient.setQueryData<SafeUser | null>(authQueryKey, loggedInUser);
      console.log('Cache updated with user data');
      
      // Clear any error states
      queryClient.removeQueries({ 
        queryKey: authQueryKey, 
        type: 'inactive' 
      });
      
      // Navigate using wouter's navigate function from useLocation
      // Add a small delay to ensure the session is fully established
      setTimeout(() => {
        console.log('Navigating to dashboard...');
        navigate("/", { replace: true });
        
        // After navigation, invalidate and refetch the auth query to ensure fresh data
        setTimeout(() => {
          console.log('Invalidating auth query for fresh data...');
          queryClient.invalidateQueries({ queryKey: authQueryKey });
        }, 200);
      }, 150);
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
      
      // Use wouter's navigate function consistently
      navigate("/auth", { replace: true });
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
