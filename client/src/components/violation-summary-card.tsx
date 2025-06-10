/**
 * ViolationSummaryCard Component OLD: PropertyOverview
 *
 * Displays a branded property overview card with:
 * - Property name (dynamically provided)
 * - Responsive layout and stat cards
 * - Visual icons for each stat
 * - Modern property image
 * - Props for property name and image
 *
 * Usage:
 *   <ViolationSummaryCard />
 */

import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ListChecks, AlertTriangle, HelpCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ReactNode } from "react";

/**
 * StatCard
 *
 * Displays a single stat with label, value, and icon.
 * @param label - The label for the stat (e.g., 'Total Units')
 * @param value - The value to display
 * @param icon - A React node for the icon
 */
function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-neutral-50 rounded p-3 shadow-sm">
      <div className="text-blue-600">{icon}</div>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

/**
 * ViolationSummaryCard OLD: PropertyOverview
 *
 * Main property dashboard card. Shows property name, image, and key stats.
 *
 * @param propertyName - Name of the property (required).
 * @param propertyImage - Image URL for the property (optional).
 */
export function ViolationSummaryCard() {
  const { data: unitsData, isLoading: unitsLoading } = useQuery<{ total: number }>({
    queryKey: ['property-units-count'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/units/count");
      if (!res.ok) throw new Error('Failed to fetch unit count');
      return res.json();
    },
  });
  
  const { data: reportData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Get current month data for dashboard
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const params = new URLSearchParams({
        from: startOfMonth.toISOString(),
        to: endOfMonth.toISOString(),
      });
      
      const res = await apiRequest("GET", `/api/reports/stats?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });
  
  const isLoading = unitsLoading || statsLoading;

  if (isLoading) {
    return (
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
    );
  }

  const unitCount = unitsData?.total || 0;
  const stats = reportData?.stats || {};
  const monthlyViolations = stats.totalViolations ?? 0;
  const openCases = (stats.newViolations ?? 0) + (stats.pendingViolations ?? 0);
  const disputedCases = stats.disputedViolations ?? 0;

  return (
    <Card className="shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-neutral-900 mb-4">Violation Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="Total Units" value={unitCount} icon={<Building2 className="h-6 w-6" />} />
        <StatCard label="Violations This Month" value={monthlyViolations} icon={<ListChecks className="h-6 w-6" />} />
        <StatCard label="Open Cases" value={openCases} icon={<AlertTriangle className="h-6 w-6" />} />
        <StatCard label="Disputed Cases" value={disputedCases} icon={<HelpCircle className="h-6 w-6" />} />
      </div>
    </Card>
  );
} 