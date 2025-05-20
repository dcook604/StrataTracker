import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { FilterX, PlusCircle } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { ViolationStatus } from "@shared/schema";
import { format } from "date-fns";
import { EmptyState } from "@/components/empty-state";
import { useQueryParams } from "@/hooks/use-query-params";
import { apiRequest } from "@/lib/queryClient";

type Violation = {
  id: number;
  unitId: number;
  violationType: string;
  status: ViolationStatus;
  createdAt: string;
  description: string;
  fineAmount?: number;
  unit: {
    unitNumber: string;
  };
};

export function ViolationsList() {
  const [location, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { queryParams } = useQueryParams();
  const unitId = queryParams.get("unitId");
  
  // Fetch violations with filters
  const { data: violations, isLoading } = useQuery<Violation[]>({
    queryKey: ['/api/violations', { status: statusFilter !== 'all' ? statusFilter : undefined, unitId }],
    queryFn: async () => {
      const url = new URL("/api/violations", window.location.origin);
      if (statusFilter !== 'all') {
        url.searchParams.set('status', statusFilter);
      }
      if (unitId) {
        url.searchParams.set('unitId', unitId);
      }
      const res = await apiRequest("GET", url.pathname + url.search);
      return res.json();
    }
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
      accessorKey: "fineAmount",
      header: "Fine",
      cell: ({ row }) => row.original.fineAmount ? `$${row.original.fineAmount.toFixed(2)}` : "-",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            variant="link"
            size="sm"
            onClick={() => navigate(`/violations/${row.original.id}`)}
            className="text-primary-600 hover:text-primary-900"
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const clearFilters = () => {
    navigate("/violations");
    setStatusFilter("all");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          
          {(unitId || statusFilter !== "all") && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="flex items-center gap-1"
            >
              <FilterX className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
        
        <Button onClick={() => navigate("/violations/new")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Violation
        </Button>
      </div>
      
      <Card>
        {violations && violations.length > 0 ? (
          <DataTable 
            columns={columns} 
            data={violations} 
            searchColumn="unit.unitNumber"
          />
        ) : (
          <div className="p-6">
            <EmptyState
              title="No violations found"
              description={unitId 
                ? `There are no violations for this unit with the current filters.` 
                : "There are no violations that match the current filters."
              }
              icon={<FilterX className="h-8 w-8 text-neutral-400" />}
              actionLabel="Create Violation"
              onAction={() => navigate("/violations/new")}
            />
          </div>
        )}
      </Card>
    </div>
  );
} 