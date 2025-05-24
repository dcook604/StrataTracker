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
    queryKey: ["/api/user"],
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
      queryClient.setQueryData(["/api/user"], user);
      
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
      queryClient.setQueryData(["/api/user"], user);
      
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
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
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
