import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PropertyUnit } from "@shared/schema";
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
  FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const formSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required"),
  floor: z.string().optional(),
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Invalid email").min(1, "Owner email is required"),
  ownerReceiveNotifications: z.boolean().default(true),
  tenantName: z.string().optional(),
  tenantEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  tenantReceiveNotifications: z.boolean().default(true),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PAGE_SIZE_KEY = "unitsPageSize";
const PAGE_KEY = "unitsPage";
const SORT_KEY = "unitsSort";
const SORT_ORDER_KEY = "unitsSortOrder";

type PersonForm = {
  fullName: string;
  email: string;
  phone: string;
  receiveEmailNotifications: boolean;
};

type UnitWithPeople = PropertyUnit & {
  owners: PersonForm[];
  tenants: PersonForm[];
};

export default function UnitsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitWithPeople | null>(null);
  const { toast } = useToast();
  const [page, setPage] = useState(() => Number(localStorage.getItem(PAGE_KEY)) || 1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem(PAGE_SIZE_KEY)) || 20);
  const [sortBy, setSortBy] = useState<string>(() => JSON.parse(localStorage.getItem(SORT_KEY) || '"unitNumber"'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => JSON.parse(localStorage.getItem(SORT_ORDER_KEY) || '"asc"'));
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [owners, setOwners] = useState([{ fullName: "", email: "", phone: "", receiveEmailNotifications: true }]);
  const [tenants, setTenants] = useState([{ fullName: "", email: "", phone: "", receiveEmailNotifications: true }]);

  useEffect(() => { localStorage.setItem(PAGE_KEY, String(page)); }, [page]);
  useEffect(() => { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); }, [pageSize]);
  useEffect(() => { localStorage.setItem(SORT_KEY, JSON.stringify(sortBy)); localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(sortOrder)); }, [sortBy, sortOrder]);
  useEffect(() => {
    if (editingUnit) {
      setOwners(
        editingUnit.owners && editingUnit.owners.length > 0
          ? editingUnit.owners.map((o: PersonForm) => ({
              ...o,
              phone: typeof o.phone === 'string' ? o.phone : ""
            }))
          : [{ fullName: "", email: "", phone: "", receiveEmailNotifications: true }]
      );
      setTenants(
        editingUnit.tenants && editingUnit.tenants.length > 0
          ? editingUnit.tenants.map((t: PersonForm) => ({
              ...t,
              phone: typeof t.phone === 'string' ? t.phone : ""
            }))
          : [{ fullName: "", email: "", phone: "", receiveEmailNotifications: true }]
      );
    } else {
      setOwners([{ fullName: "", email: "", phone: "", receiveEmailNotifications: true }]);
      setTenants([{ fullName: "", email: "", phone: "", receiveEmailNotifications: true }]);
    }
  }, [editingUnit, isAddDialogOpen]);

  const { data: unitData, isLoading: unitsLoading } = useQuery<{ units: UnitWithPeople[], total: number }>({
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
  const { data: propertyUnitsData, isLoading: isPropertyUnitsLoading } = useQuery<PropertyUnit[]>({
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
      ownerReceiveNotifications: true,
      tenantName: "",
      tenantEmail: "",
      tenantReceiveNotifications: true,
      phone: "",
      notes: "",
    }
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: { unit: any; persons: PersonForm[] }) => {
      const res = await apiRequest("POST", "/api/units-with-persons", data);
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
    mutationFn: async (data: { id: number; unit: any; persons: PersonForm[] }) => {
      const { id, ...rest } = data;
      const res = await apiRequest("PATCH", `/api/units-with-persons/${id}`, rest);
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
  
  const addOwner = useCallback(() => setOwners((prev) => [...prev, { fullName: "", email: "", phone: "", receiveEmailNotifications: true }]), []);
  const removeOwner = useCallback((idx: number) => setOwners((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev), []);
  const updateOwner = useCallback((idx: number, field: string, value: any) => setOwners((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o)), []);

  const addTenant = useCallback(() => setTenants((prev) => [...prev, { fullName: "", email: "", phone: "", receiveEmailNotifications: true }]), []);
  const removeTenant = useCallback((idx: number) => setTenants((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev), []);
  const updateTenant = useCallback((idx: number, field: string, value: any) => setTenants((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t)), []);

  const onSubmitMulti = async (values: any) => {
    // Validate at least one owner
    const validOwners = owners.filter(o => o.fullName.trim() && o.email.trim());
    if (validOwners.length === 0) {
      toast({ title: "Missing required fields", description: "At least one owner with name and email is required.", variant: "destructive" });
      return;
    }
    // Validate all owners/tenants have name and email if present
    for (const o of owners) {
      if ((o.fullName && !o.email) || (!o.fullName && o.email)) {
        toast({ title: "Incomplete owner", description: "Each owner must have both name and email.", variant: "destructive" });
        return;
      }
    }
    for (const t of tenants) {
      if ((t.fullName && !t.email) || (!t.fullName && t.email)) {
        toast({ title: "Incomplete tenant", description: "Each tenant must have both name and email.", variant: "destructive" });
        return;
      }
    }
    const payload = {
      unit: {
        unitNumber: values.unitNumber,
        floor: values.floor || null,
        phone: values.phone || null,
        notes: values.notes || null,
      },
      persons: [
        ...owners.filter(o => o.fullName && o.email).map(o => ({ ...o, role: 'owner' })),
        ...tenants.filter(t => t.fullName && t.email).map(t => ({ ...t, role: 'tenant' })),
      ]
    };
    if (editingUnit) {
      await updateMutation.mutateAsync({ ...payload, id: editingUnit.id });
      setEditingUnit(null);
    } else {
      await createMutation.mutateAsync(payload);
      setIsAddDialogOpen(false);
    }
    form.reset();
  };
  
  const handleEdit = (unit: UnitWithPeople) => {
    setEditingUnit(unit);
    form.reset({
      unitNumber: unit.unitNumber,
      floor: unit.floor || "",
      phone: (unit as any).phone || "",
      notes: (unit as any).notes || "",
    });
  };
  
  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
    setPage(1);
  };
  
  const columns: ColumnDef<UnitWithPeople>[] = [
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
      id: "owners",
      header: "Owner(s)",
      cell: ({ row }) => {
        const owners = row.original.owners || [];
        if (owners.length === 0) return <span className="text-muted-foreground">None</span>;
        const first = owners[0];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  {first.fullName} ({first.email})
                  {owners.length > 1 && (
                    <span className="ml-2 bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs align-middle">
                      +{owners.length - 1} more
                    </span>
                  )}
                </span>
              </TooltipTrigger>
              {owners.length > 1 && (
                <TooltipContent>
                  <div className="text-xs">
                    {owners.map((o: any, idx: number) => (
                      <div key={o.email}>
                        {idx + 1}. {o.fullName} ({o.email})
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "tenants",
      header: "Tenant(s)",
      cell: ({ row }) => {
        const tenants = row.original.tenants || [];
        if (tenants.length === 0) return <span className="text-muted-foreground">None</span>;
        const first = tenants[0];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  {first.fullName} ({first.email})
                  {tenants.length > 1 && (
                    <span className="ml-2 bg-green-100 text-green-800 rounded px-2 py-0.5 text-xs align-middle">
                      +{tenants.length - 1} more
                    </span>
                  )}
                </span>
              </TooltipTrigger>
              {tenants.length > 1 && (
                <TooltipContent>
                  <div className="text-xs">
                    {tenants.map((t: any, idx: number) => (
                      <div key={t.email}>
                        {idx + 1}. {t.fullName} ({t.email})
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (row.original as any).phone || "",
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
              onSubmit={form.handleSubmit(onSubmitMulti)}
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
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <FormLabel>Owners*</FormLabel>
                    <Button type="button" size="sm" onClick={addOwner}>Add Owner</Button>
                  </div>
                  {owners.map((owner, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                      <Input placeholder="Full name" value={owner.fullName} onChange={e => updateOwner(idx, 'fullName', e.target.value)} />
                      <Input placeholder="Email" value={owner.email} onChange={e => updateOwner(idx, 'email', e.target.value)} />
                      <Input placeholder="Phone" value={owner.phone} onChange={e => updateOwner(idx, 'phone', e.target.value)} />
                      <Checkbox checked={owner.receiveEmailNotifications} onCheckedChange={v => updateOwner(idx, 'receiveEmailNotifications', v as boolean)} />
                      {owners.length > 1 && <Button type="button" size="icon" variant="ghost" onClick={() => removeOwner(idx)}>-</Button>}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <FormLabel>Tenants*</FormLabel>
                    <Button type="button" size="sm" onClick={addTenant}>Add Tenant</Button>
                  </div>
                  {tenants.map((tenant, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                      <Input placeholder="Full name" value={tenant.fullName} onChange={e => updateTenant(idx, 'fullName', e.target.value)} />
                      <Input placeholder="Email" value={tenant.email} onChange={e => updateTenant(idx, 'email', e.target.value)} />
                      <Input placeholder="Phone" value={tenant.phone} onChange={e => updateTenant(idx, 'phone', e.target.value)} />
                      <Checkbox checked={tenant.receiveEmailNotifications} onCheckedChange={v => updateTenant(idx, 'receiveEmailNotifications', v as boolean)} />
                      {tenants.length > 1 && <Button type="button" size="icon" variant="ghost" onClick={() => removeTenant(idx)}>-</Button>}
                    </div>
                  ))}
                </div>
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
            <form onSubmit={form.handleSubmit(onSubmitMulti)} className="space-y-4">
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