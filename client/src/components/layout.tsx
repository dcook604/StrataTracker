import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  leftContent?: React.ReactNode;
}

export function Layout({ children, title, leftContent }: LayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  // Use React Query for pending approvals with proper error handling and caching
  const { 
    data: pending = [], 
    isLoading: loading, 
    error: pendingError 
  } = useQuery({
    queryKey: ["/api/violations/pending-approval"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/violations/pending-approval");
      if (!res.ok) {
        throw new Error(`Failed to fetch pending approvals: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!(user?.isCouncilMember || user?.isAdmin), // Only run if user has appropriate permissions
    staleTime: 30000, // Cache for 30 seconds to prevent excessive requests
    refetchInterval: 60000, // Auto-refetch every minute
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: (failureCount, error) => {
      // Don't retry on 429 (rate limiting) or 4xx errors
      if (error instanceof Error && error.message.includes('429')) {
        return false;
      }
      if (error instanceof Error && error.message.includes('4')) {
        return false;
      }
      // Only retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Handle pending approvals error with user-friendly message
  if (pendingError && !loading) {
    const errorMessage = pendingError instanceof Error ? pendingError.message : 'Unknown error';
    if (errorMessage.includes('429')) {
      // Don't show toast for rate limiting, just log it
      console.warn('Pending approvals temporarily rate limited');
    } else {
      console.error('Error fetching pending approvals:', errorMessage);
    }
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Loading overlay during logout */}
      <LoadingOverlay 
        isVisible={logoutMutation.isPending} 
        message="Logging you out securely"
      />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 md:py-4 md:px-6">
          <div className="flex items-center gap-2">
            {leftContent}
            <h2 className="text-lg font-semibold text-neutral-800">{title}</h2>
          </div>
          <div className="flex items-center space-x-4">
            {(user?.isAdmin || user?.isCouncilMember) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-neutral-600 hover:text-primary-600">
                    <Bell className="h-5 w-5" />
                    {pending.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">{pending.length}</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                  <div className="font-semibold px-3 py-2 border-b">Pending Approvals</div>
                  {loading ? (
                    <div className="px-3 py-2 text-sm text-neutral-500 flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </div>
                  ) : pendingError && pendingError instanceof Error && pendingError.message.includes('429') ? (
                    <div className="px-3 py-2 text-sm text-orange-600">
                      Rate limited. Please wait a moment.
                    </div>
                  ) : pending.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-neutral-500">No pending approvals</div>
                  ) : (
                    pending.map((v: { id: number; unitId: string; unit?: { unitNumber: string }; violationType: string; violationDate?: string }) => (
                      <DropdownMenuItem key={v.id} onClick={() => navigate(`/violations/${v.id}`)} className="flex flex-col items-start cursor-pointer">
                        <div className="font-medium">Unit: {v.unit?.unitNumber || v.unitId}</div>
                        <div className="text-xs text-neutral-600">{v.violationType} &middot; {v.violationDate ? format(new Date(v.violationDate), "MMM dd, yyyy") : ""}</div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center cursor-pointer select-none">
                  <UserAvatar user={user} className="h-8 w-8" />
                  <span className="ml-2 text-sm font-medium text-neutral-700 hidden md:inline-block">
                    {user?.fullName}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()} 
                  disabled={logoutMutation.isPending}
                  className={logoutMutation.isPending ? "opacity-70 cursor-not-allowed" : ""}
                >
                  {logoutMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 