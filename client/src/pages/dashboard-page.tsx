import { Sidebar } from "@/components/sidebar";
import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { PropertyOverview } from "@/components/property-overview";
import { RepeatViolations } from "@/components/repeat-violations";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { Bell } from "lucide-react";
import { useLocation } from "wouter";

export default function DashboardPage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 md:py-4 md:px-6">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-neutral-800">Dashboard</h2>
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
        
        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-50">
          {/* Dashboard Stats */}
          <DashboardStats />
          
          {/* Recent Violations & Tabs */}
          <DashboardTabs />
          
          {/* Property Overview & Repeat Offenders */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PropertyOverview />
            <RepeatViolations />
          </div>
        </main>
      </div>
    </div>
  );
}
