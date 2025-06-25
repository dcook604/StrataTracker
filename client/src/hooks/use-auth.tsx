import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { InsertUser, Profile } from "#shared/schema";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

// Combine Supabase User with our local Profile
export type AppUser = User & { profile: Profile | null };

type AuthContextType = {
  user: AppUser | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: User; session: Session }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<null, Error, InsertUser>;
  isAdmin: boolean;
  isCouncilMember: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

type LoginData = {
  email: string;
  password:  string;
  rememberMe?: boolean;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Fetch user profile from our backend.
  const { 
    data: user, 
    error, 
    isLoading: isProfileLoading 
  } = useQuery<AppUser | null, Error>({ // Explicitly type the hook
    queryKey: ['user-profile', session?.user?.id],
    queryFn: async (): Promise<AppUser | null> => {
      if (!session?.user) return null;
      const response = await apiRequest("GET", `/api/user-profile`);
      const profile: Profile = await response.json();
      return { ...session.user, profile };
    },
    enabled: !!session,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const isAdmin = user?.profile?.role === 'admin';
  const isCouncilMember = user?.profile?.role === 'council';
  const isLoading = isSessionLoading || (!!session && isProfileLoading);

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
        user: user ?? null,
        session,
        isLoading,
        error: error ?? null,
        loginMutation,
        logoutMutation,
        registerMutation,
        isAdmin,
        isCouncilMember,
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
