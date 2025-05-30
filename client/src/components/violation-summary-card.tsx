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

import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ListChecks, AlertTriangle, HelpCircle } from "lucide-react";
import React from "react";

/**
 * StatCard
 *
 * Displays a single stat with label, value, and icon.
 * @param label - The label for the stat (e.g., 'Total Units')
 * @param value - The value to display
 * @param icon - A React node for the icon
 */
function StatCard({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
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
  const { data: units = [] } = useQuery({
    queryKey: ['/api/property-units'],
  });
  const { data: stats = {} } = useQuery({
    queryKey: ['/api/reports/stats'],
  });
  const isLoading = !units || !stats;

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

  const unitCount = (units as any[]).length || 0;
  const monthlyViolations = (stats as any).totalViolations ?? 0;
  const openCases = ((stats as any).newViolations ?? 0) + ((stats as any).pendingViolations ?? 0);
  const disputedCases = (stats as any).disputedViolations ?? 0;

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