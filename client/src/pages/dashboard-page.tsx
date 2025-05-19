import { Layout } from "@/components/layout";
import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { PropertyOverview } from "@/components/property-overview";
import { RepeatViolations } from "@/components/repeat-violations";

export default function DashboardPage() {
  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
          <DashboardStats />
          <DashboardTabs />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PropertyOverview />
            <RepeatViolations />
          </div>
      </div>
    </Layout>
  );
}
