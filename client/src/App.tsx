import { Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import NewViolationPage from "@/pages/new-violation-page";
import AllViolationsPage from "@/pages/all-violations-page";
import ViolationDetailPage from "@/pages/violation-detail-page";
import CommunicationsPage from "@/pages/communications-page";
import ReportsPage from "@/pages/reports-page";
import UnitsPage from "@/pages/units-page";
import CategoriesPage from "@/pages/categories-page";
import SettingsPage from "@/pages/settings-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import UserProfilePage from "@/pages/user-profile-page";
import PublicViolationCommentPage from "@/pages/public-violation-comment-page";
import { Route } from "wouter";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import BylawsPage from "@/pages/bylaws-page";

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <AuthProvider>
              <Switch>
                <Route path="/auth" component={AuthPage} />
                <Route path="/forgot-password" component={ForgotPasswordPage} />
                <Route path="/reset-password" component={ResetPasswordPage} />
                <Route path="/violation/comment/:token" component={PublicViolationCommentPage} />
                <ProtectedRoute path="/" component={DashboardPage} />
                <ProtectedRoute path="/violations" component={AllViolationsPage} />
                <ProtectedRoute path="/violations/new" component={NewViolationPage} />
                <ProtectedRoute path="/violations/:id" component={ViolationDetailPage} />
                <ProtectedRoute path="/communications" component={CommunicationsPage} />
                <ProtectedRoute path="/reports" component={ReportsPage} />
                <ProtectedRoute path="/units" component={UnitsPage} />
                <ProtectedRoute path="/categories" component={CategoriesPage} />
                <ProtectedRoute path="/settings" component={SettingsPage} />
                <ProtectedRoute path="/profile" component={UserProfilePage} />
                <ProtectedRoute path="/bylaws" component={BylawsPage} />
                <Route component={NotFound} />
              </Switch>
              <Toaster />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
