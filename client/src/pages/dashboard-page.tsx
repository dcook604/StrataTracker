import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { PropertyOverview } from "@/components/property-overview";
import { RepeatViolations } from "@/components/repeat-violations";
import { useLocation } from "wouter";

export default function DashboardPage() {
  const [_, navigate] = useLocation();

  return (
    <>
      {/* Page Title */}
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-neutral-800">Dashboard</h2>
      </div>

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
    </>
  );
}
