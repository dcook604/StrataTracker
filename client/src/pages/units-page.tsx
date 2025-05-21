import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Unit, PropertyUnit } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, TrashIcon, BuildingIcon } from "lucide-react";
import { Layout } from "@/components/layout";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FilterX } from "lucide-react";

const formSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required"),
  floor: z.string().optional(),
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Invalid email").min(1, "Owner email is required"),
  tenantName: z.string().optional(),
  tenantEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PAGE_SIZE_KEY = "unitsPageSize";
const PAGE_KEY = "unitsPage";
const SORT_KEY = "unitsSort";
const SORT_ORDER_KEY = "unitsSortOrder";

export default function UnitsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const { toast } = useToast();
  const [page, setPage] = useState(() => Number(localStorage.getItem(PAGE_KEY)) || 1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem(PAGE_SIZE_KEY)) || 20);
  const [sortBy, setSortBy] = useState<string>(() => JSON.parse(localStorage.getItem(SORT_KEY) || '"unitNumber"'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => JSON.parse(localStorage.getItem(SORT_ORDER_KEY) || '"asc"'));
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  useEffect(() => { localStorage.setItem(PAGE_KEY, String(page)); }, [page]);
  useEffect(() => { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); }, [pageSize]);
  useEffect(() => { localStorage.setItem(SORT_KEY, JSON.stringify(sortBy)); localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(sortOrder)); }, [sortBy, sortOrder]);

  const { data: unitData, isLoading: unitsLoading } = useQuery<{ units: Unit[], total: number }>({
    queryKey: ["/api/units", { page, limit: pageSize, sortBy, sortOrder }],
    queryFn: async () => {
      const url = new URL("/api/units", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("sortBy", sortBy);
      url.searchParams.set("sortOrder", sortOrder);
      const res = await apiRequest("GET", url.pathname + url.search);
      return res.json();
    },
  });

  // Fetch property units as fallback if no units
  const { data: propertyUnitsData, isLoading: unitsLoading } = useQuery<PropertyUnit[]>({
    queryKey: ["/api/property-units"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/property-units");
      return res.json();
    },
    enabled: !unitData || (unitData.units.length === 0),
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unitNumber: "",
      floor: "",
      ownerName: "",
      ownerEmail: "",
      tenantName: "",
      tenantEmail: "",
      phone: "",
      notes: "",
    }
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/units", data);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: FormValues & { id: number }) => {
      const { id, ...unitData } = data;
      const res = await apiRequest("PATCH", `/api/units/${id}`, unitData);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setEditingUnit(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (values: FormValues) => {
    if (editingUnit) {
      updateMutation.mutate({ ...values, id: editingUnit.id });
    } else {
      createMutation.mutate(values);
    }
  };
  
  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    form.reset({
      unitNumber: unit.unitNumber,
      floor: unit.floor || "",
      ownerName: unit.ownerName,
      ownerEmail: unit.ownerEmail,
      tenantName: unit.tenantName || "",
      tenantEmail: unit.tenantEmail || "",
      phone: unit.phone || "",
      notes: unit.notes || "",
    });
  };
  
  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
    setPage(1);
  };
  
  const columns: ColumnDef<Unit>[] = [
    {
      accessorKey: "unitNumber",
      header: () => (
        <span className="cursor-pointer" onClick={() => handleSort('unitNumber')}>
          Unit {sortBy === 'unitNumber' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      cell: ({ row }) => <div className="font-medium">#{row.original.unitNumber}</div>,
    },
    {
      accessorKey: "floor",
      header: "Floor",
    },
    {
      accessorKey: "ownerName",
      header: () => (
        <span className="cursor-pointer" onClick={() => handleSort('ownerName')}>
          Owner {sortBy === 'ownerName' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      cell: ({ row }) => row.original.ownerName,
    },
    {
      accessorKey: "ownerEmail",
      header: "Owner Email",
      cell: ({ row }) => row.original.ownerEmail,
    },
    {
      accessorKey: "tenantName",
      header: () => (
        <span className="cursor-pointer" onClick={() => handleSort('tenantName')}>
          Tenant {sortBy === 'tenantName' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      cell: ({ row }) => row.original.tenantName,
    },
    {
      accessorKey: "tenantEmail",
      header: "Tenant Email",
      cell: ({ row }) => row.original.tenantEmail,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const unit = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleEdit(unit)}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];
  
  const total = unitData && 'total' in unitData ? unitData.total : 0;
  const totalPages = Math.ceil(total / pageSize);
  const units = unitData && 'units' in unitData ? unitData.units : [];

  return (
    <Layout title="Unit Management">
      <div className="space-y-6">
        <div className="flex justify-end">
        <Button onClick={() => {
          form.reset();
          setIsAddDialogOpen(true);
        }}>
          Add Unit
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
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
        </div>
      </div>
      
      {(unitsLoading || unitsLoading) ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : units && units.length > 0 ? (
        <>
          <DataTable 
            columns={columns} 
            data={units}
            searchColumn="unitNumber"
            searchPlaceholder="Search by unit number..."
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => setPage(p)}
                      href="#"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
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
      ) :
        <EmptyState
          icon={<BuildingIcon className="h-10 w-10" />}
          title="No units found"
          description="Add your first unit to get started"
        />
      }
      </div>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Add Unit</DialogTitle>
            <DialogDescription>
              Enter the details for the new unit. If the unit already exists, you can update its information.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const values = form.getValues();
                // Required fields
                const requiredFields = ["unitNumber", "ownerName", "ownerEmail"];
                const missingFields = requiredFields.filter(field => !(values[field as keyof typeof values]));
                if (missingFields.length > 0) {
                  toast({
                    title: "Missing required fields",
                    description: `Please fill in: ${missingFields.join(", ")}`,
                    variant: "destructive",
                  });
                  return;
                }
                setIsCheckingDuplicate(true);
                // Check for duplicate unit
                const res = await apiRequest("GET", `/api/property-units`);
                const units = await res.json();
                const existing = Array.isArray(units) ? units.find((u: any) => u.unitNumber === values.unitNumber) : null;
                setIsCheckingDuplicate(false);
                if (existing) {
                  if (confirm("This unit already exists. Do you want to update its information?")) {
                    // Update existing unit (and unit)
                    const payload = {
                      unitNumber: values.unitNumber,
                      ownerName: values.ownerName,
                      ownerEmail: values.ownerEmail,
                      floor: values.floor || null,
                      tenantName: values.tenantName || null,
                      tenantEmail: values.tenantEmail || null,
                      phone: values.phone || null,
                      notes: values.notes || null,
                    };
                    await apiRequest("PUT", `/api/property-units/${existing.id}`, payload);
                    createMutation.mutate(values); // Also create/update unit record
                    toast({
                      title: "Unit updated",
                      description: `Unit ${values.unitNumber} has been updated. Unit record will be created/updated as well.`,
                    });
                    setIsAddDialogOpen(false);
                    form.reset();
                    return;
                  } else {
                    return;
                  }
                }
                // No duplicate, proceed to create
                createMutation.mutate(values);
              }}
              className="overflow-y-auto px-6 py-4"
            >
              <div className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unitNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 203" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ownerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tenantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant Name (if applicable)</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tenantEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant Email (if applicable)</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input placeholder="Additional information" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="px-6 py-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || isCheckingDuplicate}>
                  {createMutation.isPending || isCheckingDuplicate ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingUnit} onOpenChange={(open) => !open && setEditingUnit(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>
              Update the unit details.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="unitNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Number*</FormLabel>
                    <FormControl>
                      <Input placeholder="123A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor</FormLabel>
                    <FormControl>
                      <Input placeholder="3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Email*</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tenantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tenantEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant Email</FormLabel>
                    <FormControl>
                      <Input placeholder="jane.smith@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional information" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUnit(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}