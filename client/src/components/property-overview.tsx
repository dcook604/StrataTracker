import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";

export function PropertyOverview() {
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ['/api/property-units'],
  });
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/reports/stats'],
  });
  
  const isLoading = unitsLoading || statsLoading;
  
  // Get current month and year for display
  const currentDate = new Date();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(currentDate);
  
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
  
  const unitCount = units?.length || 0;
  const monthlyViolations = stats?.totalViolations || 0;
  const openCases = (stats?.newViolations || 0) + (stats?.pendingViolations || 0);
  const disputedCases = stats?.disputedViolations || 0;
  
  // Use a modern residential building image
  const propertyImage = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450&q=80";
  
  return (
    <Card className="shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-neutral-900 mb-4">Property Overview</h3>
      <div className="aspect-w-16 aspect-h-9 mb-4 relative bg-neutral-100 rounded-lg overflow-hidden">
        {/* Modern residential building image */}
        <img 
          src={propertyImage}
          alt="Property building" 
          className="object-cover rounded-lg shadow-sm w-full h-full"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-neutral-500">Total Units</p>
          <p className="text-lg font-semibold">{unitCount}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-500">Violations This Month</p>
          <p className="text-lg font-semibold">{monthlyViolations}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-500">Open Cases</p>
          <p className="text-lg font-semibold">{openCases}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-500">Disputed Cases</p>
          <p className="text-lg font-semibold">{disputedCases}</p>
        </div>
      </div>
    </Card>
  );
}
