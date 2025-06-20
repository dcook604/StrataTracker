import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ViolationStatus } from "#shared/schema";
import { format } from "date-fns";
import { ClipboardList, AlertCircle, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ViolationsList } from "./violations-list";

type Violation = {
  id: number;
  uuid: string;
  unitId: number;
  violationType: string;
  status: ViolationStatus;
  createdAt: string;
  unit: {
    unitNumber: string;
  };
};

type PaginatedViolationsResponse = {
  violations: Violation[];
  total: number;
};

const ViolationTable = ({ data, isLoading, columns, emptyState }: { data: Violation[] | undefined, isLoading: boolean, columns: ColumnDef<Violation>[], emptyState: React.ReactNode }) => {
  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!data || data.length === 0) {
    return <div className="p-6">{emptyState}</div>;
  }
  return <DataTable columns={columns} data={data} />;
};

export function DashboardTabs() {
  const { data: recentViolations, isLoading: recentLoading } = useQuery<Violation[]>({
    queryKey: ['violations', 'recent'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/violations/recent");
      if (!res.ok) throw new Error('Failed to fetch recent violations');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: pendingViolations, isLoading: pendingLoading } = useQuery<Violation[]>({
    queryKey: ['violations', { status: 'pending_approval' }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/violations?status=pending_approval&limit=5");
      if (!res.ok) throw new Error('Failed to fetch pending violations');
      const data: PaginatedViolationsResponse = await res.json();
      return data.violations;
    },
    refetchInterval: 30000,
  });

  const { data: disputedViolations, isLoading: disputedLoading } = useQuery<Violation[]>({
    queryKey: ['violations', { status: 'disputed' }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/violations?status=disputed&limit=5");
      if (!res.ok) throw new Error('Failed to fetch disputed violations');
      const data: PaginatedViolationsResponse = await res.json();
      return data.violations;
    },
    refetchInterval: 30000,
  });
  
  const getViolationTypeName = (type: string) => {
    // This can be expanded or moved to a utility function
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const columns: ColumnDef<Violation>[] = [
    {
      accessorKey: "unit.unitNumber",
      header: "Unit",
      cell: ({ row }) => <div className="font-medium">#{row.original.unit.unitNumber}</div>,
    },
    {
      accessorKey: "violationType",
      header: "Violation",
      cell: ({ row }) => getViolationTypeName(row.original.violationType),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => format(new Date(row.original.createdAt), "MMM dd, yyyy"),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link href={`/violations/${row.original.uuid}`}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-blue-600 hover:text-blue-900 hover:bg-blue-50"
            title="View violation details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <Card className="shadow rounded-lg">
      <Tabs defaultValue="recent">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">Recent Violations</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="disputed">Disputed</TabsTrigger>
        </TabsList>
        <TabsContent value="recent">
          <CardContent className="p-0">
            <ViolationTable 
              data={recentViolations} 
              isLoading={recentLoading} 
              columns={columns}
              emptyState={
                <EmptyState
                  title="No recent violations"
                  description="No violations have been reported recently."
                  icon={<ClipboardList className="h-12 w-12 text-neutral-400" />}
                />
              }
            />
          </CardContent>
        </TabsContent>
        <TabsContent value="pending">
          <CardContent className="p-0">
            <ViolationTable 
              data={pendingViolations} 
              isLoading={pendingLoading} 
              columns={columns} 
              emptyState={
                <EmptyState
                  title="No pending violations"
                  description="There are no violations awaiting council approval."
                  icon={<ClipboardList className="h-12 w-12 text-neutral-400" />}
                />
              }
            />
          </CardContent>
        </TabsContent>
        <TabsContent value="disputed">
          <CardContent className="p-0">
            <ViolationTable 
              data={disputedViolations} 
              isLoading={disputedLoading} 
              columns={columns} 
              emptyState={
                <EmptyState
                  title="No disputed violations"
                  description="There are currently no disputed violations."
                  icon={<AlertCircle className="h-12 w-12 text-neutral-400" />}
                />
              }
            />
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
