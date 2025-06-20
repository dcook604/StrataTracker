import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { InsertUser } from "#shared/schema";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { identifyUser } from "@/lib/logrocket";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { toast as useToastToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/utils";

// Omit the password from the user type for client-side usage
// type SafeUser = Omit<SelectUser, "password"> & {
//   // Add compatibility required fields that ensure consistent boolean values
//   isAdmin: boolean;
//   is_admin: boolean;
//   isCouncilMember: boolean;
//   is_council_member: boolean;
//   isUser: boolean;
//   is_user: boolean;
// };

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: User; session: Session }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ user: User; session: Session }, Error, InsertUser>;
};

const AuthContext = createContext<AuthContextType | null>(null);

type LoginData = {
  email: string;
  password:  string;
  rememberMe?: boolean;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<Error | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (session?.user) {
          identifyUser({
            id: session.user.id,
            email: session.user.email,
          });
        }
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: LoginData) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user?.email}`,
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
    mutationFn: async (_userData: InsertUser) => {
        // This will now be handled via Supabase directly, or a serverless function.
        // For now, this is a placeholder.
      console.warn("Registration should be handled via Supabase UI or a dedicated serverless function.");
      return null;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onMutate: () => {
      toast({
        title: "Logging out...",
        description: "Please wait while we securely log you out",
        duration: 2000,
      });
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out",
        duration: 3000,
      });
      setTimeout(() => {
        window.location.href = "/auth?logout=success";
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed", 
        description: error.message || "There was an error logging you out. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      setTimeout(() => {
        window.location.href = "/auth?logout=error";
      }, 1000);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
