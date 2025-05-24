import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Interface for the expected stats object
interface ReportStatsData {
  totalViolations: number;
  newViolations: number;
  pendingViolations: number;
  approvedViolations: number;
  disputedViolations: number;
  // Add other fields if necessary, like rejectedViolations, resolvedViolations, averageResolutionTimeDays
}

export function DashboardStats() {
  const { data: reportNumericStats, isLoading } = useQuery<ReportStatsData>({
    queryKey: ["/api/reports/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/reports/stats");
      if (!res.ok) {
        // Consider more specific error handling or logging here
        const errorData = await res.json().catch(() => ({ message: 'Failed to fetch dashboard stats' }));
        throw new Error(errorData.message || 'Failed to fetch dashboard stats');
      }
      const jsonData = await res.json();
      return jsonData.stats;
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

  if (!reportNumericStats) {
    return null;
  }

  const statCards = [
    {
      title: "Total Violations",
      value: reportNumericStats.totalViolations,
      icon: <FileText className="h-6 w-6 text-primary-600" />,
      bgColor: "bg-primary-100",
    },
    {
      title: "New",
      value: reportNumericStats.newViolations,
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      bgColor: "bg-blue-100",
    },
    {
      title: "Pending",
      value: reportNumericStats.pendingViolations,
      icon: <Clock className="h-6 w-6 text-yellow-600" />,
      bgColor: "bg-yellow-100",
    },
    {
      title: "Approved",
      value: reportNumericStats.approvedViolations,
      icon: <CheckCircle className="h-6 w-6 text-green-600" />,
      bgColor: "bg-green-100",
    },
    {
      title: "Disputed",
      value: reportNumericStats.disputedViolations,
      icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
      bgColor: "bg-orange-100",
    },
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