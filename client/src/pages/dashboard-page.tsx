import { Layout } from "@/components/layout";
import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { PropertyOverview } from "@/components/property-overview";
import { RepeatViolations } from "@/components/repeat-violations";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface SystemSetting {
  key: string;
  value: string;
}

export default function DashboardPage() {
  const { 
    data: propertyNameSetting, 
    isLoading: isLoadingPropertyName, 
    error: propertyNameError 
  } = useQuery<SystemSetting>({
    queryKey: ["/api/system-settings/propertyName"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/system-settings/propertyName");
      if (!res.ok) {
        // If the setting is not found, return a default or handle as an error
        // For now, let's assume it means we use a default display name.
        // Alternatively, throw new Error('Failed to fetch property name');
        console.warn('Property name setting not found, using default.');
        return { key: 'propertyName', value: 'Property' }; 
      }
      return res.json();
    },
  });

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
          <DashboardStats />
          <DashboardTabs />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isLoadingPropertyName ? (
              <Card className="shadow rounded-lg p-6">
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="aspect-w-16 aspect-h-9 mb-4 h-[200px] w-full" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index}>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : propertyNameError ? (
              <p>Error loading property information.</p>
            ) : (
              <PropertyOverview propertyName={propertyNameSetting?.value || "Property"} />
            )}
            <RepeatViolations />
          </div>
      </div>
    </Layout>
  );
}
