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
      try {
        const res = await apiRequest("GET", "/api/system-settings/propertyName");

        if (!res.ok) {
          // Attempt to parse error message from response if it's a known format
          let errorJsonMessage = 'Property name setting not found or failed to load.';
          try {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const errorData = await res.json();
              if (errorData && errorData.message) {
                errorJsonMessage = errorData.message;
              }
            } else {
              // Not JSON, try to get text for debugging
              const errorText = await res.text();
              console.warn('Non-JSON error response for propertyName setting:', errorText);
            }
          } catch (parseError) {
            // Ignore if parsing error response fails, use default message
            console.warn('Could not parse error response for propertyName setting:', parseError);
          }
          // Specifically handle 404 by returning a default, otherwise throw to trigger query error state
          if (res.status === 404) {
            console.warn(`Property name setting not found (404): ${errorJsonMessage}. Using default.`);
            return { key: 'propertyName', value: 'Property' };
          }
          // For other non-ok statuses, throw an error to be caught by useQuery
          console.error(`Failed to fetch property name: ${res.status} ${res.statusText} - ${errorJsonMessage}`);
          throw new Error(`Failed to fetch property name: ${errorJsonMessage}`);
        }

        // If res.ok, check content type before parsing
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error('Expected JSON but got non-JSON response for propertyName setting:', text);
          throw new Error('Property name data is malformed (not JSON).');
        }
        try {
          return await res.json();
        } catch (parseError) {
          console.error('Failed to parse successful response for propertyName setting:', parseError);
          throw new Error('Property name data is malformed (invalid JSON).');
        }
      } catch (err) {
        // This catches errors from apiRequest itself (e.g. network) or errors thrown above
        console.error("Error in propertyNameSetting queryFn:", err);
        // Ensure the error is re-thrown so useQuery can set its error state
        if (err instanceof Error) throw err;
        throw new Error('An unexpected error occurred while fetching property name.');
      }
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
