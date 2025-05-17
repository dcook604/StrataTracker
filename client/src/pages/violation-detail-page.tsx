import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ViolationDetail } from "@/components/violation-detail";
import { useAuth } from "@/hooks/use-auth";
import { Bell, ChevronLeft } from "lucide-react";

export default function ViolationDetailPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Extract the violation ID from the URL
  const violationId = location.split("/").pop();
  
  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 md:py-4 md:px-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/violations")}
              className="mr-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold text-neutral-800">Violation Details</h2>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-primary-600">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <UserAvatar user={user} className="h-8 w-8" />
              <span className="ml-2 text-sm font-medium text-neutral-700 hidden md:inline-block">
                {user?.fullName}
              </span>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-50">
          <div className="max-w-6xl mx-auto">
            {violationId && <ViolationDetail id={violationId} />}
          </div>
        </main>
      </div>
    </div>
  );
}
