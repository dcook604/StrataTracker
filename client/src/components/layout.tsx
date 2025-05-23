import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  leftContent?: React.ReactNode;
}

export function Layout({ children, title, leftContent }: LayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.isCouncilMember || user?.isAdmin) {
      setLoading(true);
      fetch("/api/violations/pending-approval", { credentials: "include" })
        .then(res => res.json())
        .then(data => setPending(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <div className="flex h-screen bg-neutral-50">
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
                    <div className="px-3 py-2 text-sm text-neutral-500">Loading...</div>
                  ) : pending.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-neutral-500">No pending approvals</div>
                  ) : (
                    pending.map((v) => (
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
                <DropdownMenuItem onClick={() => navigate("/user-profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>Logout</DropdownMenuItem>
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