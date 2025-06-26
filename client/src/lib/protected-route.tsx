import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useState, useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  console.log(`[ProtectedRoute] ${path}:`, { 
    user: user ? `${user.email} (${user.profile?.role})` : null,
    isLoading,
    hasProfile: !!user?.profile
  });

  // Show loading spinner during SSR hydration or auth loading
  if (!isClient || isLoading) {
    console.log(`[ProtectedRoute] ${path}: Showing loading spinner`);
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log(`[ProtectedRoute] ${path}: No user, redirecting to /auth`);
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  console.log(`[ProtectedRoute] ${path}: User authenticated, rendering component`);
  return <Route path={path} component={Component} />;
}
