import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ViolationStatus } from "@shared/schema";
import { format } from "date-fns";
import { ClipboardList, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type Violation = {
  id: number;
  unitId: number;
  violationType: string;
  status: ViolationStatus;
  createdAt: string;
  unit: {
    unitNumber: string;
  };
};

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<'recent' | 'pending' | 'disputed'>('recent');
  const [, navigate] = useLocation();
  
  const { data: recentViolations, isLoading: recentLoading } = useQuery<Violation[]>({
    queryKey: ['/api/violations/recent'],
  });
  
  const { data: pendingViolations, isLoading: pendingLoading } = useQuery<Violation[]>({
    queryKey: ['/api/violations', { status: 'pending_approval' }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/violations?status=pending_approval");
      return res.json();
    }
  });
  
  const { data: disputedViolations, isLoading: disputedLoading } = useQuery<Violation[]>({
    queryKey: ['/api/violations', { status: 'disputed' }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/violations?status=disputed");
      return res.json();
    },
    enabled: activeTab === 'disputed',
  });

  const getViolationTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      noise: "Noise Complaint",
      parking: "Parking Violation",
      garbage: "Improper Garbage Disposal",
      pet: "Unauthorized Pet",
      property: "Property Damage",
      balcony: "Balcony Misuse",
      other: "Other",
    };
    return typeMap[type] || type;
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
        <div className="flex gap-2">
          <Link href={`/violations/${row.original.id}`}>
            <Button variant="link" size="sm" className="text-primary-600 hover:text-primary-900">
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  // Determine which data to display based on the active tab
  const displayData = () => {
    if (activeTab === 'recent') {
      if (recentLoading) return <Skeleton className="h-72 w-full" />;
      if (!recentViolations || recentViolations.length === 0) {
        return (
          <EmptyState
            title="No recent violations"
            description="There are no recent violations to display."
            icon={<ClipboardList className="h-8 w-8 text-neutral-400" />}
            actionLabel="Create Violation"
            onAction={() => navigate("/violations/new")}
          />
        );
      }
      return <DataTable columns={columns} data={recentViolations} />;
    }
    
    if (activeTab === 'pending') {
      if (pendingLoading) return <Skeleton className="h-72 w-full" />;
      if (!pendingViolations || pendingViolations.length === 0) {
        return (
          <EmptyState
            title="No pending violations"
            description="There are no violations pending approval."
            icon={<ClipboardList className="h-8 w-8 text-neutral-400" />}
          />
        );
      }
      return <DataTable columns={columns} data={pendingViolations} />;
    }
    
    if (activeTab === 'disputed') {
      if (disputedLoading) return <Skeleton className="h-72 w-full" />;
      if (!disputedViolations || disputedViolations.length === 0) {
        return (
          <EmptyState
            title="No disputed violations"
            description="There are no disputed violations."
            icon={<AlertCircle className="h-8 w-8 text-neutral-400" />}
          />
        );
      }
      return <DataTable columns={columns} data={disputedViolations} />;
    }
    
    return null;
  };

  return (
    <Card className="shadow rounded-lg mb-6 overflow-hidden">
      <div className="border-b border-neutral-200">
        <nav className="flex -mb-px">
          <Button
            onClick={() => setActiveTab('recent')}
            variant="ghost"
            className={`px-6 py-3 rounded-none ${activeTab === 'recent' ? 'border-b-2 border-primary-500 text-primary-600' : 'border-b-2 border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}`}
          >
            Recent Violations
          </Button>
          <Button
            onClick={() => setActiveTab('pending')}
            variant="ghost"
            className={`px-6 py-3 rounded-none ${activeTab === 'pending' ? 'border-b-2 border-primary-500 text-primary-600' : 'border-b-2 border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}`}
          >
            Pending Approval
          </Button>
          <Button
            onClick={() => setActiveTab('disputed')}
            variant="ghost"
            className={`px-6 py-3 rounded-none ${activeTab === 'disputed' ? 'border-b-2 border-primary-500 text-primary-600' : 'border-b-2 border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}`}
          >
            Disputed
          </Button>
        </nav>
      </div>
      
      <CardContent className="p-0">
        {displayData()}
      </CardContent>
    </Card>
  );
}
