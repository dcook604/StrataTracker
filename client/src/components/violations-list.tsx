import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { FilterX, PlusCircle, Trash2, Loader2, Eye } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { ViolationStatus } from "@shared/schema";
import { format } from "date-fns";
import { EmptyState } from "@/components/empty-state";
import { useQueryParams } from "@/hooks/use-query-params";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type Violation = {
  id: number;
  uuid: string;
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

const PAGE_SIZE_KEY = "violationsPageSize";
const PAGE_KEY = "violationsPage";
const SORT_KEY = "violationsSort";

export function ViolationsList() {
  const [location, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { queryParams } = useQueryParams();
  const unitId = queryParams.get("unitId");
  const [page, setPage] = useState(() => Number(localStorage.getItem(PAGE_KEY)) || 1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem(PAGE_SIZE_KEY)) || 20);
  const [sortBy, setSortBy] = useState<string>(() => JSON.parse(localStorage.getItem(SORT_KEY) || '"createdAt"'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => JSON.parse(localStorage.getItem(SORT_KEY + "Order") || '"desc"'));
  const { user } = useAuth();
  const { toast } = useToast();

  // All authenticated users can delete violations
  const canDelete = !!user;

  useEffect(() => { localStorage.setItem(PAGE_KEY, String(page)); }, [page]);
  useEffect(() => { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); }, [pageSize]);
  useEffect(() => { localStorage.setItem(SORT_KEY, JSON.stringify(sortBy)); localStorage.setItem(SORT_KEY + "Order", JSON.stringify(sortOrder)); }, [sortBy, sortOrder]);

  // Fetch violations with filters and pagination
  const { data, isLoading } = useQuery<{ violations: Violation[]; total: number }>({
    queryKey: ['/api/violations', { status: statusFilter !== 'all' ? statusFilter : undefined, unitId, page, limit: pageSize, sortBy, sortOrder }],
    queryFn: async () => {
      const url = new URL("/api/violations", window.location.origin);
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      if (unitId) url.searchParams.set('unitId', unitId);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', String(pageSize));
      url.searchParams.set('sortBy', sortBy);
      url.searchParams.set('sortOrder', sortOrder);
      const res = await apiRequest("GET", url.pathname + url.search);
      return res.json();
    },
  });

  const total = data && 'total' in data ? data.total : 0;
  const totalPages = Math.ceil(total / pageSize);
  const violations = data && 'violations' in data ? data.violations : [];

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

  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
    setPage(1);
  };

  const columns: ColumnDef<Violation>[] = [
    {
      accessorKey: "id",
      header: () => (
        <span className="cursor-pointer" onClick={() => handleSort('id')}>
          Violation ID {sortBy === 'id' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      cell: ({ row }) => {
        const createdAt = row.original.createdAt;
        const id = row.original.id;
        return <div className="font-semibold">{`VIO-${format(new Date(createdAt), 'yyyyMMdd')}-${id.toString().padStart(3, '0')}`}</div>;
      },
    },
    {
      id: "unitNumber",
      accessorKey: "unit.unitNumber",
      header: () => (
        <span className="cursor-pointer" onClick={() => handleSort('unitNumber')}>
          Unit {sortBy === 'unitNumber' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      cell: ({ row }) => <div className="font-medium">#{row.original.unit.unitNumber}</div>,
    },
    {
      accessorKey: "violationType",
      header: () => (
        <span className="cursor-pointer" onClick={() => handleSort('violationType')}>
          Violation {sortBy === 'violationType' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      cell: ({ row }) => getViolationTypeName(row.original.violationType),
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <span className="cursor-pointer" onClick={() => handleSort('createdAt')}>
          Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      cell: ({ row }) => format(new Date(row.original.createdAt), "MMM dd, yyyy"),
    },
    {
      accessorKey: "status",
      header: () => (
        <span className="cursor-pointer" onClick={() => handleSort('status')}>
          Status {sortBy === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "fineAmount",
      header: () => (
        <span className="cursor-pointer" onClick={() => handleSort('fineAmount')}>
          Fine {sortBy === 'fineAmount' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      cell: ({ row }) => row.original.fineAmount ? `$${row.original.fineAmount.toFixed(2)}` : "-",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/violations/${row.original.uuid}`)}
            className="h-8 w-8 text-blue-600 hover:text-blue-900 hover:bg-blue-50"
            title="View violation details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-900 hover:bg-red-50"
                  disabled={deleteMutation.isPending}
                  title="Delete violation"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Violation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete violation VIO-{row.original.id}? 
                    This action cannot be undone and will permanently remove the violation 
                    and all its associated history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(row.original.uuid)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    },
  ];

  const clearFilters = () => {
    navigate("/violations");
    setStatusFilter("all");
  };

  // Delete violation mutation
  const deleteMutation = useMutation({
    mutationFn: async (violationId: string) => {
      const response = await apiRequest("DELETE", `/api/violations/${violationId}`);
      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to delete violation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Violation deleted successfully",
      });
      // Invalidate and refetch violations
      queryClient.invalidateQueries({ queryKey: ['/api/violations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
          <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
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
        <Button onClick={() => navigate("/violations/new")}> <PlusCircle className="h-4 w-4 mr-2" /> New Violation </Button>
      </div>
      <Card>
        {isLoading ? (
          <div className="p-6 flex justify-center items-center">
            <span className="animate-spin mr-2">⏳</span> Loading violations...
          </div>
        ) : violations && violations.length > 0 ? (
          <>
            <DataTable 
              columns={columns} 
              data={violations} 
              searchColumn="unitNumber"
            />
            <div className="py-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-disabled={page === 1}
                      tabIndex={page === 1 ? -1 : 0}
                    />
                  </PaginationItem>
                  
                  {/* Smart pagination with limited page numbers */}
                  {(() => {
                    const maxVisiblePages = 7; // Show max 7 page numbers
                    const pages = [];
                    
                    if (totalPages <= maxVisiblePages) {
                      // Show all pages if total is small
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(
                          <PaginationItem key={i}>
                            <PaginationLink
                              isActive={i === page}
                              onClick={() => setPage(i)}
                              href="#"
                            >
                              {i}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                    } else {
                      // Smart pagination for many pages
                      const delta = Math.floor(maxVisiblePages / 2);
                      let start = Math.max(1, page - delta);
                      let end = Math.min(totalPages, page + delta);
                      
                      // Adjust if we're near the beginning or end
                      if (page <= delta) {
                        end = Math.min(totalPages, maxVisiblePages);
                      } else if (page > totalPages - delta) {
                        start = Math.max(1, totalPages - maxVisiblePages + 1);
                      }
                      
                      // Add first page if we're not starting from 1
                      if (start > 1) {
                        pages.push(
                          <PaginationItem key={1}>
                            <PaginationLink
                              isActive={1 === page}
                              onClick={() => setPage(1)}
                              href="#"
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                        );
                        if (start > 2) {
                          pages.push(
                            <PaginationItem key="ellipsis-start">
                              <span className="flex h-9 w-9 items-center justify-center">...</span>
                            </PaginationItem>
                          );
                        }
                      }
                      
                      // Add visible page range
                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <PaginationItem key={i}>
                            <PaginationLink
                              isActive={i === page}
                              onClick={() => setPage(i)}
                              href="#"
                            >
                              {i}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      // Add last page if we're not ending at totalPages
                      if (end < totalPages) {
                        if (end < totalPages - 1) {
                          pages.push(
                            <PaginationItem key="ellipsis-end">
                              <span className="flex h-9 w-9 items-center justify-center">...</span>
                            </PaginationItem>
                          );
                        }
                        pages.push(
                          <PaginationItem key={totalPages}>
                            <PaginationLink
                              isActive={totalPages === page}
                              onClick={() => setPage(totalPages)}
                              href="#"
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                    }
                    
                    return pages;
                  })()}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      aria-disabled={page === totalPages}
                      tabIndex={page === totalPages ? -1 : 0}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No violations found"
              description={unitId 
                ? `There are no violations for this unit with the current filters.` 
                : "There are no violations that match the current filters."
              }
              icon={<FilterX className="h-8 w-8 text-neutral-400" />}
            />
          </div>
        )}
      </Card>
    </div>
  );
} 