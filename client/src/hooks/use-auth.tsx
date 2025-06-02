import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { identifyUser } from "@/lib/logrocket";

// Omit the password from the user type for client-side usage
type SafeUser = Omit<SelectUser, "password"> & {
  // Add compatibility required fields that ensure consistent boolean values
  isAdmin: boolean;
  is_admin: boolean;
  isCouncilMember: boolean;
  is_council_member: boolean;
  isUser: boolean;
  is_user: boolean;
};

type AuthContextType = {
  user: SafeUser | null;
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
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SafeUser | undefined, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Identify user in LogRocket when user data changes
  useEffect(() => {
    if (user && user.id) {
      identifyUser({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin || user.is_admin,
        isCouncilMember: user.isCouncilMember || user.is_council_member,
        isUser: user.isUser || user.is_user
      });
    }
  }, [user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SafeUser) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      
      // Identify user in LogRocket after successful login
      if (user.id) {
        identifyUser({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isAdmin: user.isAdmin || user.is_admin,
          isCouncilMember: user.isCouncilMember || user.is_council_member,
          isUser: user.isUser || user.is_user
        });
      }
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.fullName}`,
      });
    },
    onError: (error: Error) => {
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
      return await res.json();
    },
    onSuccess: (user: SafeUser) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      
      // Identify user in LogRocket after successful registration
      if (user.id) {
        identifyUser({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isAdmin: user.isAdmin || user.is_admin,
          isCouncilMember: user.isCouncilMember || user.is_council_member,
          isUser: user.isUser || user.is_user
        });
      }
      
      toast({
        title: "Registration successful",
        description: `Welcome to StrataGuard, ${user.fullName}`,
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
      // Call logout endpoint to terminate session on server
      await apiRequest("POST", "/api/logout");
    },
    onMutate: () => {
      // Show logout loading toast immediately
      toast({
        title: "Logging out...",
        description: "Please wait while we securely log you out",
        duration: 2000, // Short duration as we'll replace it
      });
    },
    onSuccess: () => {
      // Clear user data from React Query cache
      queryClient.setQueryData(["/api/auth/me"], null);
      
      // Clear any other sensitive data from cache
      queryClient.removeQueries({ 
        predicate: (query) => {
          // Remove all queries except basic ones that don't contain user data
          const sensitiveKeys = ['/api/violations', '/api/communications', '/api/units', '/api/users'];
          return sensitiveKeys.some(key => query.queryKey[0]?.toString().includes(key));
        }
      });
      
      // Clear any localStorage/sessionStorage if used elsewhere
      if (typeof window !== 'undefined') {
        // Clear any auth tokens or user data stored locally
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        sessionStorage.clear();
      }
      
      // Success toast
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out",
        duration: 3000,
      });
      
      // Redirect to auth page with logout success indicator
      setTimeout(() => {
        // Use window.location for a full page refresh to ensure clean state
        window.location.href = "/auth?logout=success";
      }, 500); // Small delay to let user see the success message
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed", 
        description: error.message || "There was an error logging you out. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      
      // Even if logout fails, try to clear local state and redirect
      // This handles cases where the server is unreachable
      queryClient.setQueryData(["/api/auth/me"], null);
      setTimeout(() => {
        window.location.href = "/auth?logout=error";
      }, 1000);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ? {
          ...user,
          // Add compatibility properties for client components that expect camelCase or snake_case
          isAdmin: !!(user.isAdmin || user.is_admin),
          isCouncilMember: !!(user.isCouncilMember || user.is_council_member),
          isUser: !!(user.isUser || user.is_user),
          is_admin: !!(user.is_admin || user.isAdmin),
          is_council_member: !!(user.is_council_member || user.isCouncilMember),
          is_user: !!(user.is_user || user.isUser)
        } : null,
        isLoading,
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
