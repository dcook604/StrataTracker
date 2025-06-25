import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  console.log(`[ProtectedRoute] ${path}:`, { 
    user: user ? `${user.email} (${user.profile?.role})` : null,
    isLoading,
    hasProfile: !!user?.profile
  });

  if (isLoading) {
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
