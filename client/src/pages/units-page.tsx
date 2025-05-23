import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PropertyUnit, UnitFacility } from "@shared/schema";
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
import { PencilIcon, TrashIcon as DeleteIcon, BuildingIcon, Trash2 } from "lucide-react";
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
  ownerName: z.string().min(1, "Owner name is required").optional(),
  ownerEmail: z.string().email("Invalid email").min(1, "Owner email is required").optional(),
  ownerReceiveNotifications: z.boolean().default(true).optional(),
  tenantName: z.string().optional(),
  tenantEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  tenantReceiveNotifications: z.boolean().default(true).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  parkingSpots: z.string().optional(),
  storageLockers: z.string().optional(),
  bikeLockers: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PAGE_SIZE_KEY = "unitsPageSize";
const PAGE_KEY = "unitsPage";
const SORT_KEY = "unitsSort";
const SORT_ORDER_KEY = "unitsSortOrder";

type PersonForm = {
  fullName: string;
  email: string;
  phone?: string;
  receiveEmailNotifications: boolean;
  hasCat?: boolean;
  hasDog?: boolean;
};

type UnitWithPeopleAndFacilities = PropertyUnit & {
  owners: PersonForm[];
  tenants: PersonForm[];
  facilities?: UnitFacility;
};

export default function UnitsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitWithPeopleAndFacilities | null>(null);
  const { toast } = useToast();
  const [page, setPage] = useState(() => Number(localStorage.getItem(PAGE_KEY)) || 1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem(PAGE_SIZE_KEY)) || 20);
  const [sortBy, setSortBy] = useState<string>(() => JSON.parse(localStorage.getItem(SORT_KEY) || '"unitNumber"'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => JSON.parse(localStorage.getItem(SORT_ORDER_KEY) || '"asc"'));
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const defaultPerson = { fullName: "", email: "", phone: "", receiveEmailNotifications: true, hasCat: false, hasDog: false };
  const [owners, setOwners] = useState([defaultPerson]);
  const [tenants, setTenants] = useState([defaultPerson]);

  // Initialize react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unitNumber: "",
      floor: "",
      phone: "",
      notes: "",
      parkingSpots: "",
      storageLockers: "",
      bikeLockers: "",
    }
  });

  useEffect(() => { localStorage.setItem(PAGE_KEY, String(page)); }, [page]);
  useEffect(() => { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); }, [pageSize]);
  useEffect(() => { localStorage.setItem(SORT_KEY, JSON.stringify(sortBy)); localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(sortOrder)); }, [sortBy, sortOrder]);
  
  // Effect to reset/populate owner/tenant states and form when dialog opens or editingUnit changes
  useEffect(() => {
    if (isAddDialogOpen && !editingUnit) { // Adding new unit
      form.reset({
        unitNumber: "",
        floor: "",
        phone: "",
        notes: "",
        parkingSpots: "",
        storageLockers: "",
        bikeLockers: "",
      });
      setOwners([{ ...defaultPerson }]);
      setTenants([{ ...defaultPerson }]);
    } else if (editingUnit) { // Editing existing unit
      form.reset({
        unitNumber: editingUnit.unitNumber,
        floor: editingUnit.floor || "",
        phone: (editingUnit as any).phone || "", 
        notes: (editingUnit as any).notes || "", 
        parkingSpots: Array.isArray(editingUnit.facilities?.parkingSpots) ? editingUnit.facilities.parkingSpots.join(', ') : String(editingUnit.facilities?.parkingSpots ?? ''),
        storageLockers: Array.isArray(editingUnit.facilities?.storageLockers) ? editingUnit.facilities.storageLockers.join(', ') : String(editingUnit.facilities?.storageLockers ?? ''),
        bikeLockers: Array.isArray(editingUnit.facilities?.bikeLockers) ? editingUnit.facilities.bikeLockers.join(', ') : String(editingUnit.facilities?.bikeLockers ?? ''),
      });
      setOwners(
        editingUnit.owners && editingUnit.owners.length > 0
          ? editingUnit.owners.map((o: PersonForm) => ({
              ...defaultPerson, 
              ...o,
              phone: typeof o.phone === 'string' ? o.phone : ""
            }))
          : [{ ...defaultPerson }]
      );
      setTenants(
        editingUnit.tenants && editingUnit.tenants.length > 0
          ? editingUnit.tenants.map((t: PersonForm) => ({
              ...defaultPerson, 
              ...t,
              phone: typeof t.phone === 'string' ? t.phone : ""
            }))
          : [{ ...defaultPerson }]
      );
    }
  }, [editingUnit, isAddDialogOpen, form]);

  const { data: unitData, isLoading: unitsLoading } = useQuery<{ units: UnitWithPeopleAndFacilities[], total: number }>({
    queryKey: ["/api/units", { page, limit: pageSize, sortBy, sortOrder }],
    queryFn: async () => {
      const url = new URL("/api/units", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("sortBy", sortBy);
      url.searchParams.set("sortOrder", sortOrder);
      const res = await apiRequest("GET", url.pathname + url.search);
      const jsonData = await res.json();
      console.log('Fetched /api/units data:', jsonData);
      return jsonData;
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
  
  const createMutation = useMutation({
    mutationFn: async (data: { unit: any; facilities: any; persons: PersonForm[] }) => {
      const res = await apiRequest("POST", "/api/units-with-persons", data);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/property-units"] });
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
    mutationFn: async (data: { id: number; unit: any; facilities: any; persons: PersonForm[] }) => {
      const { id, ...rest } = data;
      const res = await apiRequest("PATCH", `/api/units/${id}`, rest);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/property-units"] });
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
  
  const addOwner = useCallback(() => setOwners((prev) => [...prev, { ...defaultPerson }]), [defaultPerson]);
  const removeOwner = useCallback((idx: number) => setOwners((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev), []);
  const updateOwner = useCallback((idx: number, field: keyof PersonForm, value: any) => setOwners((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o)), []);

  const addTenant = useCallback(() => setTenants((prev) => [...prev, { ...defaultPerson }]), [defaultPerson]);
  const removeTenant = useCallback((idx: number) => setTenants((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev), []);
  const updateTenant = useCallback((idx: number, field: keyof PersonForm, value: any) => setTenants((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t)), []);

  const onSubmitMulti = async (values: FormValues) => {
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
      // Tenant name/email are optional, but if one is provided, the other should be too.
      if ((t.fullName && !t.email) || (!t.fullName && t.email)) {
        toast({ title: "Incomplete tenant", description: "Each tenant must have both name and email if one is provided.", variant: "destructive" });
        return;
      }
    }
    
    const unitPayload = {
      unitNumber: values.unitNumber,
      floor: values.floor || undefined, // Ensure undefined if empty, not null
    };

    const facilitiesPayload = {
      parkingSpots: values.parkingSpots || "",
      storageLockers: values.storageLockers || "",
      bikeLockers: values.bikeLockers || "",
    };

    const personsPayload = [
      // Map owners, including pet info
      ...owners.filter(o => o.fullName && o.email).map(o => ({
        fullName: o.fullName,
        email: o.email,
        phone: o.phone || undefined,
        role: 'owner' as 'owner' | 'tenant',
        receiveEmailNotifications: o.receiveEmailNotifications,
        hasCat: o.hasCat,
        hasDog: o.hasDog,
      })),
      // Map tenants, including pet info (only if fullName and email are present)
      ...tenants.filter(t => t.fullName && t.email).map(t => ({
        fullName: t.fullName,
        email: t.email,
        phone: t.phone || undefined,
        role: 'tenant' as 'owner' | 'tenant',
        receiveEmailNotifications: t.receiveEmailNotifications,
        hasCat: t.hasCat,
        hasDog: t.hasDog,
      })),
    ];

    // The main form also has optional phone and notes fields. 
    // These are not part of the structured `unit`, `facilities`, or `persons` payload for `createUnitWithPersons`.
    // If these (values.phone, values.notes) need to be persisted, the backend API and storage function
    // would need to be adjusted to accept them, perhaps on the main `property_units` table if appropriate.
    // For now, they are collected by react-hook-form but not explicitly sent in the structured payload.

    const finalPayload = {
      unit: unitPayload,
      facilities: facilitiesPayload,
      persons: personsPayload,
    };

    if (editingUnit) {
      await updateMutation.mutateAsync({ ...finalPayload, id: editingUnit.id });
      setEditingUnit(null);
    } else {
      await createMutation.mutateAsync(finalPayload);
      setIsAddDialogOpen(false);
    }
    form.reset(); // Reset fields after submission
    // Also reset dynamic owner/tenant fields to default
    setOwners([{...defaultPerson}]);
    setTenants([{...defaultPerson}]);
  };
  
  const handleEdit = (unit: UnitWithPeopleAndFacilities) => {
    setEditingUnit(unit);
    form.reset({
      unitNumber: unit.unitNumber,
      floor: unit.floor || "",
      phone: (unit as any).phone || "",
      notes: (unit as any).notes || "",
      parkingSpots: Array.isArray(unit.facilities?.parkingSpots) ? unit.facilities.parkingSpots.join(', ') : String(unit.facilities?.parkingSpots ?? ''),
      storageLockers: Array.isArray(unit.facilities?.storageLockers) ? unit.facilities.storageLockers.join(', ') : String(unit.facilities?.storageLockers ?? ''),
      bikeLockers: Array.isArray(unit.facilities?.bikeLockers) ? unit.facilities.bikeLockers.join(', ') : String(unit.facilities?.bikeLockers ?? ''),
    });
  };
  
  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
    setPage(1);
  };
  
  const columns: ColumnDef<UnitWithPeopleAndFacilities>[] = [
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
      id: "facilities",
      header: "Facilities (P/S/B)",
      cell: ({ row }) => {
        const unit = row.original;
        const p = unit.facilities?.parkingSpots ?? 0;
        const s = unit.facilities?.storageLockers ?? 0;
        const b = unit.facilities?.bikeLockers ?? 0;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">{`${p}/${s}/${b}`}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Parking Spots: {p}</p>
                <p>Storage Lockers: {s}</p>
                <p>Bike Lockers: {b}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    },
    {
      accessorKey: "owners",
      header: "Owners",
      cell: ({ row }) => {
        const owners = row.original.owners;
        if (!owners || owners.length === 0) return <span className="text-neutral-500">N/A</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  {owners.map(o => o.fullName).join(", ")}
                  {owners.some(o => o.hasCat || o.hasDog) && <span className="ml-1">🐾</span>}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {owners.map((o, idx) => (
                  <div key={idx} className="py-1">
                    <p className="font-semibold">{o.fullName}</p>
                    <p className="text-sm text-neutral-600">{o.email}</p>
                    {o.phone && <p className="text-sm text-neutral-600">{o.phone}</p>}
                    <div className="text-xs">
                      {o.hasCat && <span>🐱 Cat</span>}
                      {o.hasDog && <span className={o.hasCat ? "ml-2" : ""}>🐶 Dog</span>}
                      {!(o.hasCat || o.hasDog) && <span>No Pets</span>}
                    </div>
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "tenants",
      header: "Tenants",
      cell: ({ row }) => {
        const tenants = row.original.tenants;
        if (!tenants || tenants.length === 0) return <span className="text-neutral-500">N/A</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  {tenants.map(t => t.fullName).join(", ")}
                  {tenants.some(t => t.hasCat || t.hasDog) && <span className="ml-1">🐾</span>}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {tenants.map((t, idx) => (
                  <div key={idx} className="py-1">
                    <p className="font-semibold">{t.fullName}</p>
                    <p className="text-sm text-neutral-600">{t.email}</p>
                    {t.phone && <p className="text-sm text-neutral-600">{t.phone}</p>}
                    <div className="text-xs">
                      {t.hasCat && <span>🐱 Cat</span>}
                      {t.hasDog && <span className={t.hasCat ? "ml-2" : ""}>🐶 Dog</span>}
                      {!(t.hasCat || t.hasDog) && <span>No Pets</span>}
                    </div>
                  </div>
                ))}
              </TooltipContent>
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
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Add New Unit</DialogTitle>
            <DialogDescription>
              Enter the details for the new unit, including facilities, owners, and tenants.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitMulti)}
              className="flex-grow overflow-y-auto px-6 py-4 space-y-6"
            >
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-neutral-800">Unit Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <h4 className="text-lg font-semibold text-neutral-800 pt-4 pb-2">Facilities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="parkingSpots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parking Spots</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 101, 102" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="storageLockers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage Lockers</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., S1, S2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bikeLockers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bike Lockers</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., B1, B2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <h4 className="text-lg font-semibold text-neutral-800 pt-4 space-y-3">Owners</h4>
                <div className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-neutral-800">Owners</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addOwner}>Add Owner</Button>
                  </div>
                  {owners.map((owner, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3 bg-neutral-50/50 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input placeholder="Full Name *" aria-label={`Owner ${idx + 1} Full Name`} value={owner.fullName} onChange={(e) => updateOwner(idx, 'fullName', e.target.value)} />
                        <Input placeholder="Email *" aria-label={`Owner ${idx + 1} Email`} type="email" value={owner.email} onChange={(e) => updateOwner(idx, 'email', e.target.value)} />
                      </div>
                      <Input placeholder="Phone (Optional)" aria-label={`Owner ${idx + 1} Phone`} value={owner.phone} onChange={(e) => updateOwner(idx, 'phone', e.target.value)} />
                      <div className="flex items-center space-x-2 pt-1">
                        <Checkbox id={`ownerNotif${idx}`} checked={owner.receiveEmailNotifications} onCheckedChange={(checked) => updateOwner(idx, 'receiveEmailNotifications', Boolean(checked))} />
                        <label htmlFor={`ownerNotif${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Receive Email Notifications</label>
                      </div>
                      <div className="flex items-center space-x-4 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`ownerHasCat${idx}`} checked={!!owner.hasCat} onCheckedChange={(checked) => updateOwner(idx, 'hasCat', Boolean(checked))} />
                          <label htmlFor={`ownerHasCat${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Has Cat 🐱</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`ownerHasDog${idx}`} checked={!!owner.hasDog} onCheckedChange={(checked) => updateOwner(idx, 'hasDog', Boolean(checked))} />
                          <label htmlFor={`ownerHasDog${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Has Dog 🐶</label>
                        </div>
                      </div>
                      {owners.length > 1 && 
                        <div className="flex justify-end pt-2">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOwner(idx)}>
                            <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                          </Button>
                        </div>
                      }
                    </div>
                  ))}
                </div>

                <h4 className="text-lg font-semibold text-neutral-800 pt-4 space-y-3">Tenants</h4>
                <div className="pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-neutral-800">Tenants (Optional)</h4>
                        <Button type="button" variant="outline" size="sm" onClick={addTenant}>Add Tenant</Button>
                    </div>
                    {tenants.map((tenant, idx) => (
                        <div key={idx} className="p-4 border rounded-lg space-y-3 bg-neutral-50/50 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input placeholder="Full Name" aria-label={`Tenant ${idx + 1} Full Name`} value={tenant.fullName} onChange={(e) => updateTenant(idx, 'fullName', e.target.value)} />
                                <Input placeholder="Email" aria-label={`Tenant ${idx + 1} Email`} type="email" value={tenant.email} onChange={(e) => updateTenant(idx, 'email', e.target.value)} />
                            </div>
                            <Input placeholder="Phone (Optional)" aria-label={`Tenant ${idx + 1} Phone`} value={tenant.phone} onChange={(e) => updateTenant(idx, 'phone', e.target.value)} />
                            <div className="flex items-center space-x-2 pt-1">
                                <Checkbox id={`tenantNotif${idx}`} checked={tenant.receiveEmailNotifications} onCheckedChange={(checked) => updateTenant(idx, 'receiveEmailNotifications', Boolean(checked))} />
                                <label htmlFor={`tenantNotif${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Receive Email Notifications</label>
                            </div>
                            <div className="flex items-center space-x-4 pt-1">
                                <div className="flex items-center space-x-2">
                                <Checkbox id={`tenantHasCat${idx}`} checked={!!tenant.hasCat} onCheckedChange={(checked) => updateTenant(idx, 'hasCat', Boolean(checked))} />
                                <label htmlFor={`tenantHasCat${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Has Cat 🐱</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                <Checkbox id={`tenantHasDog${idx}`} checked={!!tenant.hasDog} onCheckedChange={(checked) => updateTenant(idx, 'hasDog', Boolean(checked))} />
                                <label htmlFor={`tenantHasDog${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Has Dog 🐶</label>
                                </div>
                            </div>
                            {tenants.length > 1 && (
                                <div className="flex justify-end pt-2">
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeTenant(idx)}>
                                        <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                    {tenants.length === 1 && !tenants[0].fullName && !tenants[0].email && (
                        <p className="text-xs text-neutral-500 italic">No tenants added. Click 'Add Tenant' to include tenant details.</p>
                    )}
                </div>
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Contact Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 555-1234" {...field} />
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Entry code #123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="px-6 py-4 border-t sticky bottom-0 bg-white z-10">
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
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>
              Update the unit details, facilities, owners, and tenants.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitMulti)} className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
              <div className="space-y-4 pb-4">
                <h4 className="text-lg font-semibold text-neutral-800">Unit Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <h4 className="text-lg font-semibold text-neutral-800 pt-4 pb-2">Facilities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="parkingSpots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parking Spots</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 101, 102" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="storageLockers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage Lockers</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., S1, S2" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bikeLockers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bike Lockers</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., B1, B2" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <h4 className="text-lg font-semibold text-neutral-800 pt-4 space-y-3">Owners</h4>
                <div className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-neutral-800">Owners</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addOwner}>Add Owner</Button>
                  </div>
                  {owners.map((owner, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3 bg-neutral-50/50 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input placeholder="Full Name *" aria-label={`Owner ${idx + 1} Full Name`} value={owner.fullName} onChange={(e) => updateOwner(idx, 'fullName', e.target.value)} />
                        <Input placeholder="Email *" aria-label={`Owner ${idx + 1} Email`} type="email" value={owner.email} onChange={(e) => updateOwner(idx, 'email', e.target.value)} />
                      </div>
                      <Input placeholder="Phone (Optional)" aria-label={`Owner ${idx + 1} Phone`} value={owner.phone} onChange={(e) => updateOwner(idx, 'phone', e.target.value)} />
                      <div className="flex items-center space-x-2 pt-1">
                        <Checkbox id={`editOwnerNotif${idx}`} checked={owner.receiveEmailNotifications} onCheckedChange={(checked) => updateOwner(idx, 'receiveEmailNotifications', Boolean(checked))} />
                        <label htmlFor={`editOwnerNotif${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Receive Email Notifications</label>
                      </div>
                      <div className="flex items-center space-x-4 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`editOwnerHasCat${idx}`} checked={!!owner.hasCat} onCheckedChange={(checked) => updateOwner(idx, 'hasCat', Boolean(checked))} />
                          <label htmlFor={`editOwnerHasCat${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Has Cat 🐱</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`editOwnerHasDog${idx}`} checked={!!owner.hasDog} onCheckedChange={(checked) => updateOwner(idx, 'hasDog', Boolean(checked))} />
                          <label htmlFor={`editOwnerHasDog${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Has Dog 🐶</label>
                        </div>
                      </div>
                      {owners.length > 1 && 
                        <div className="flex justify-end pt-2">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOwner(idx)}>
                            <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                          </Button>
                        </div>
                      }
                    </div>
                  ))}
                </div>

                <h4 className="text-lg font-semibold text-neutral-800 pt-4 space-y-3">Tenants</h4>
                <div className="pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-neutral-800">Tenants (Optional)</h4>
                        <Button type="button" variant="outline" size="sm" onClick={addTenant}>Add Tenant</Button>
                    </div>
                    {tenants.map((tenant, idx) => (
                        <div key={idx} className="p-4 border rounded-lg space-y-3 bg-neutral-50/50 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input placeholder="Full Name" aria-label={`Tenant ${idx + 1} Full Name`} value={tenant.fullName} onChange={(e) => updateTenant(idx, 'fullName', e.target.value)} />
                                <Input placeholder="Email" aria-label={`Tenant ${idx + 1} Email`} type="email" value={tenant.email} onChange={(e) => updateTenant(idx, 'email', e.target.value)} />
                            </div>
                            <Input placeholder="Phone (Optional)" aria-label={`Tenant ${idx + 1} Phone`} value={tenant.phone} onChange={(e) => updateTenant(idx, 'phone', e.target.value)} />
                            <div className="flex items-center space-x-2 pt-1">
                                <Checkbox id={`editTenantNotif${idx}`} checked={tenant.receiveEmailNotifications} onCheckedChange={(checked) => updateTenant(idx, 'receiveEmailNotifications', Boolean(checked))} />
                                <label htmlFor={`editTenantNotif${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Receive Email Notifications</label>
                            </div>
                            <div className="flex items-center space-x-4 pt-1">
                                <div className="flex items-center space-x-2">
                                <Checkbox id={`editTenantHasCat${idx}`} checked={!!tenant.hasCat} onCheckedChange={(checked) => updateTenant(idx, 'hasCat', Boolean(checked))} />
                                <label htmlFor={`editTenantHasCat${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Has Cat 🐱</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                <Checkbox id={`editTenantHasDog${idx}`} checked={!!tenant.hasDog} onCheckedChange={(checked) => updateTenant(idx, 'hasDog', Boolean(checked))} />
                                <label htmlFor={`editTenantHasDog${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">Has Dog 🐶</label>
                                </div>
                            </div>
                            {tenants.length > 1 && (
                                <div className="flex justify-end pt-2">
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeTenant(idx)}>
                                        <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                     {tenants.length === 1 && !tenants[0].fullName && !tenants[0].email && (
                        <p className="text-xs text-neutral-500 italic">No tenants added. Click 'Add Tenant' to include tenant details.</p>
                    )}
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Contact Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 555-1234" {...field} />
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Entry code #123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="px-6 py-4 border-t sticky bottom-0 bg-white z-10">
                <Button type="button" variant="outline" onClick={() => setEditingUnit(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || isCheckingDuplicate}>
                  {updateMutation.isPending || isCheckingDuplicate ? "Saving..." : "Save Unit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}