import { Layout } from "@/components/layout";
import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { ViolationSummaryCard } from "@/components/violation-summary-card";
import { RepeatViolations } from "@/components/repeat-violations";
import { AdminAnnouncementWidget } from "@/components/admin-announcement-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
          <AdminAnnouncementWidget />
          <DashboardStats />
          <DashboardTabs />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ViolationSummaryCard />
            <RepeatViolations />
          </div>
      </div>
    </Layout>
  );
}
