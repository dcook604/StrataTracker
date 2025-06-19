import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { AdminAnnouncementWidget } from "@/components/admin-announcement-widget";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <Layout title="Dashboard">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Hi, Welcome back {user?.user_metadata?.fullName} 👋
          </h2>
        </div>
        <AdminAnnouncementWidget />
        <DashboardStats />
        <DashboardTabs />
      </div>
    </Layout>
  );
}
