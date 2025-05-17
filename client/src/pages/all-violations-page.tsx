import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { Bell, PlusCircle, FilterX } from "lucide-react";
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

export default function AllViolationsPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Get unitId from URL if present
  const params = new URLSearchParams(location.split("?")[1]);
  const unitId = params.get("unitId");
  
  // Fetch violations with filters
  const { data: violations, isLoading } = useQuery<Violation[]>({
    queryKey: ['/api/violations', { status: statusFilter !== 'all' ? statusFilter : undefined, unitId }],
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

  // Check if we're filtering by unit
  const unitFilter = unitId ? `for Unit #${violations?.[0]?.unit.unitNumber}` : "";
  const clearFilters = () => {
    navigate("/violations");
    setStatusFilter("all");
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 md:py-4 md:px-6">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-neutral-800">All Violations {unitFilter}</h2>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-primary-600">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <UserAvatar user={user} className="h-8 w-8" />
              <span className="ml-2 text-sm font-medium text-neutral-700 hidden md:inline-block">
                {user?.fullName}
              </span>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-50">
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
                  isLoading={isLoading}
                  searchKey="unit.unitNumber"
                />
              ) : (
                <div className="p-6">
                  <EmptyState
                    title="No violations found"
                    description={unitFilter 
                      ? `There are no violations for this unit with the current filters.` 
                      : "There are no violations that match the current filters."
                    }
                    icon={<FilterX className="h-8 w-8 text-neutral-400" />}
                    action={{ label: "Create Violation", href: "/violations/new" }}
                  />
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
