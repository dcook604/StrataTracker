import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Building2 } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/empty-state";

type RepeatViolation = {
  unitId: number;
  unitNumber: string;
  count: number;
  lastViolationDate: string;
};

export function RepeatViolations() {
  // Fetch repeat violators (units with 3+ violations)
  const { data: repeatViolations, isLoading } = useQuery<RepeatViolation[]>({
    queryKey: ['/api/reports/repeat-violations', { minCount: 3 }],
  });

  if (isLoading) {
    return (
      <Card className="shadow rounded-lg p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!repeatViolations || repeatViolations.length === 0) {
    return (
      <Card className="shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-neutral-900 mb-4">Repeat Violations</h3>
        <EmptyState
          title="No repeat violations"
          description="There are no units with multiple violations"
          icon={<Building2 className="h-8 w-8 text-neutral-400" />}
        />
      </Card>
    );
  }

  return (
    <Card className="shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-neutral-900 mb-4">Repeat Violations</h3>
      <div className="space-y-4">
        {repeatViolations.map((violation) => (
          <Link key={violation.unitId} href={`/violations?unitId=${violation.unitId}`}>
            <div className="flex items-center p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
              <Avatar className="h-10 w-10 bg-neutral-200 flex items-center justify-center">
                <AvatarFallback className="text-neutral-600 font-medium">
                  {violation.unitNumber}
                </AvatarFallback>
              </Avatar>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-neutral-900">Unit #{violation.unitNumber}</h4>
                  <span className="text-sm font-medium text-neutral-500">{violation.count} violations</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Last violation: {format(new Date(violation.lastViolationDate), "MMM dd, yyyy")}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
