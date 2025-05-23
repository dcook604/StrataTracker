import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Updated and comprehensive interface for the stats data
interface DashboardStatsData {
  totalViolations: number;
  newViolations: number;
  pendingViolations: number;
  approvedViolations: number;
  disputedViolations: number;
  rejectedViolations: number;       // Added
  resolvedViolations: number;       // Added
  averageResolutionTimeDays: number | null; // Added
}

export function DashboardStats() {
  const { data: statsData, isLoading, error } = useQuery<DashboardStatsData>({
    queryKey: ["/api/reports/stats", "dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/reports/stats");
      if (!res.ok) {
        let errorDetail = "Failed to fetch dashboard stats";
        try {
          const errorData = await res.json();
          errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (e) {
          // If parsing errorData as JSON fails, use response text
          try {
            errorDetail = await res.text();
          } catch (textErr) {
            // Fallback if text() also fails
            errorDetail = res.statusText || "Unknown error";
          }
        }
        throw new Error(`API Error ${res.status}: ${errorDetail}`);
      }
      try {
        const jsonData = await res.json();
        if (jsonData && typeof jsonData.stats === 'object' && jsonData.stats !== null) {
          // Optionally, one could add Zod validation here for jsonData.stats
          return jsonData.stats as DashboardStatsData;
        } else {
          throw new Error("Fetched data is not in the expected format: 'stats' object missing or invalid.");
        }
      } catch (e) {
        throw new Error(`Failed to parse dashboard stats data: ${(e as Error).message}`);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="overflow-hidden shadow">
            <CardContent className="p-5">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card className="col-span-full">
          <CardContent className="p-5">
            <div className="text-destructive text-center">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
              <p>Error loading dashboard statistics:</p>
              <p className="text-sm">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statsData) {
    // This case might be hit if data fetching succeeded but returned null/undefined statsData
    // which is unlikely if the queryFn throws on error or bad structure.
    // However, good to have a fallback.
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card className="col-span-full">
          <CardContent className="p-5">
            <div className="text-neutral-500 text-center">
              <FileText className="mx-auto h-8 w-8 mb-2" />
              <p>No dashboard statistics available at the moment.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Violations",
      value: statsData?.totalViolations ?? 0,
      icon: <FileText className="h-6 w-6 text-primary-600" />,
      bgColor: "bg-primary-100",
    },
    {
      title: "New",
      value: statsData?.newViolations ?? 0,
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      bgColor: "bg-blue-100",
    },
    {
      title: "Pending",
      value: statsData?.pendingViolations ?? 0,
      icon: <Clock className="h-6 w-6 text-yellow-600" />,
      bgColor: "bg-yellow-100",
    },
    {
      title: "Approved",
      value: statsData?.approvedViolations ?? 0,
      icon: <CheckCircle className="h-6 w-6 text-green-600" />,
      bgColor: "bg-green-100",
    },
    {
      title: "Disputed",
      value: statsData?.disputedViolations ?? 0,
      icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
      bgColor: "bg-orange-100",
    },
    // Example for a new card if you use more data:
    // {
    //   title: "Rejected",
    //   value: statsData?.rejectedViolations ?? 0,
    //   icon: <XCircle className="h-6 w-6 text-red-600" />,
    //   bgColor: "bg-red-100",
    // },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
      {statCards.map((card, index) => (
        <Card key={index} className="overflow-hidden shadow">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${card.bgColor} rounded-md p-3`}>
                {card.icon}
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-500 truncate">{card.title}</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-neutral-900">{card.value}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
