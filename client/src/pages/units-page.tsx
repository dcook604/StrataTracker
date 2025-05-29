import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useForm, useFieldArray, FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, TrashIcon as DeleteIcon, BuildingIcon, Trash2, EyeIcon } from "lucide-react";
import { Layout } from "@/components/layout";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FilterX } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// START: Temporary Local Type Definitions (Mirror these in @shared/schema.ts)
interface FacilityItem {
  id?: number; // From DB
  identifier: string;
}

interface PatchedUnitFacility {
  parkingSpots?: FacilityItem[];
  storageLockers?: FacilityItem[];
  bikeLockers?: FacilityItem[];
}

interface PatchedPropertyUnit {
  id: number;
  unitNumber: string;
  floor?: string | null;
  strataLot?: string | null;
  mailingStreet1?: string | null;
  mailingStreet2?: string | null;
  mailingCity?: string | null;
  mailingStateProvince?: string | null;
  mailingPostalCode?: string | null;
  mailingCountry?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // facilities is part of UnitWithPeopleAndFacilities through PatchedUnitFacility
}
// END: Temporary Local Type Definitions

const formSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required"),
  strataLot: z.string().optional(),
  floor: z.string().optional(),
  mailingStreet1: z.string().optional(),
  mailingStreet2: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingStateProvince: z.string().optional(),
  mailingPostalCode: z.string().optional(),
  mailingCountry: z.string().optional(),
  parkingSpots: z.array(z.object({ identifier: z.string() })),
  storageLockers: z.array(z.object({ identifier: z.string() })),
  bikeLockers: z.array(z.object({ identifier: z.string() })),
  ownerName: z.string().min(1, "Owner name is required").optional(),
  ownerEmail: z.string().email("Invalid email").min(1, "Owner email is required").optional(),
  ownerReceiveNotifications: z.boolean().default(true).optional(),
  tenantName: z.string().optional(),
  tenantEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  tenantReceiveNotifications: z.boolean().default(true).optional(),
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
  phone?: string;
  receiveEmailNotifications: boolean;
  hasCat?: boolean;
  hasDog?: boolean;
};

type UnitWithPeopleAndFacilities = PatchedPropertyUnit & { 
  owners: PersonForm[];
  tenants: PersonForm[];
  facilities?: PatchedUnitFacility; 
};

export default function UnitsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitWithPeopleAndFacilities | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(() => Number(localStorage.getItem(PAGE_KEY)) || 1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem(PAGE_SIZE_KEY)) || 20);
  const [sortBy, setSortBy] = useState<string>(() => JSON.parse(localStorage.getItem(SORT_KEY) || '"unitNumber"'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => JSON.parse(localStorage.getItem(SORT_ORDER_KEY) || '"asc"'));
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const defaultPerson = { fullName: "", email: "", phone: "", receiveEmailNotifications: true, hasCat: false, hasDog: false };
  const [owners, setOwners] = useState([defaultPerson]);
  const [tenants, setTenants] = useState([defaultPerson]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unitNumber: "", strataLot: "", floor: "",
      mailingStreet1: "", mailingStreet2: "", mailingCity: "", mailingStateProvince: "", mailingPostalCode: "", mailingCountry: "",
      parkingSpots: [{ identifier: "" }], storageLockers: [{ identifier: "" }], bikeLockers: [{ identifier: "" }],
      ownerName: "", ownerEmail: "", ownerReceiveNotifications: true,
      tenantName: "", tenantEmail: "", tenantReceiveNotifications: true,
      phone: "", notes: "",
    }
  });

  const { fields: parkingFields, append: appendParking, remove: removeParking } = useFieldArray({
    control: form.control,
    name: "parkingSpots" as const,
  });
  const { fields: storageFields, append: appendStorage, remove: removeStorage } = useFieldArray({
    control: form.control,
    name: "storageLockers" as const,
  });
  const { fields: bikeFields, append: appendBike, remove: removeBike } = useFieldArray({
    control: form.control,
    name: "bikeLockers" as const,
  });

  useEffect(() => { localStorage.setItem(PAGE_KEY, String(page)); }, [page]);
  useEffect(() => { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); }, [pageSize]);
  useEffect(() => { localStorage.setItem(SORT_KEY, JSON.stringify(sortBy)); localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(sortOrder)); }, [sortBy, sortOrder]);
  
  useEffect(() => {
    if (isAddDialogOpen && !editingUnit) {
      form.reset({
        unitNumber: "", strataLot: "", floor: "",
        mailingStreet1: "", mailingStreet2: "", mailingCity: "", mailingStateProvince: "", mailingPostalCode: "", mailingCountry: "",
        parkingSpots: [{ identifier: "" }], storageLockers: [{ identifier: "" }], bikeLockers: [{ identifier: "" }],
        ownerName: "", ownerEmail: "", ownerReceiveNotifications: true,
        tenantName: "", tenantEmail: "", tenantReceiveNotifications: true,
        phone: "", notes: "",
      });

      setOwners([{ ...defaultPerson }]);
      setTenants([{ ...defaultPerson }]);
    } else if (editingUnit) {
      const parkingSpots = editingUnit.facilities?.parkingSpots?.map(p => p.identifier || "") || [];
      const storageLockers = editingUnit.facilities?.storageLockers?.map(s => s.identifier || "") || [];
      const bikeLockers = editingUnit.facilities?.bikeLockers?.map(b => b.identifier || "") || [];
      
      form.reset({
        unitNumber: editingUnit.unitNumber,
        strataLot: editingUnit.strataLot || "",
        floor: editingUnit.floor || "",
        mailingStreet1: editingUnit.mailingStreet1 || "",
        mailingStreet2: editingUnit.mailingStreet2 || "",
        mailingCity: editingUnit.mailingCity || "",
        mailingStateProvince: editingUnit.mailingStateProvince || "",
        mailingPostalCode: editingUnit.mailingPostalCode || "",
        mailingCountry: editingUnit.mailingCountry || "",
        parkingSpots: parkingSpots.length > 0 ? parkingSpots.map(p => ({ identifier: p })) : [{ identifier: "" }],
        storageLockers: storageLockers.length > 0 ? storageLockers.map(s => ({ identifier: s })) : [{ identifier: "" }],
        bikeLockers: bikeLockers.length > 0 ? bikeLockers.map(b => ({ identifier: b })) : [{ identifier: "" }],
        phone: editingUnit.phone || "",
        notes: editingUnit.notes || "",
        ownerName: editingUnit.owners?.[0]?.fullName || "",
        ownerEmail: editingUnit.owners?.[0]?.email || "",
        ownerReceiveNotifications: editingUnit.owners?.[0]?.receiveEmailNotifications ?? true,
        tenantName: editingUnit.tenants?.[0]?.fullName || "",
        tenantEmail: editingUnit.tenants?.[0]?.email || "",
        tenantReceiveNotifications: editingUnit.tenants?.[0]?.receiveEmailNotifications ?? true,
      });
      setOwners(editingUnit.owners && editingUnit.owners.length > 0 ? editingUnit.owners.map(o => ({ ...defaultPerson, ...o, phone: typeof o.phone === 'string' ? o.phone : "" })) : [{ ...defaultPerson }]);
      setTenants(editingUnit.tenants && editingUnit.tenants.length > 0 ? editingUnit.tenants.map(t => ({ ...defaultPerson, ...t, phone: typeof t.phone === 'string' ? t.phone : "" })) : [{ ...defaultPerson }]);
    }
  }, [editingUnit, isAddDialogOpen, form, defaultPerson]);

  const { data: unitData, isLoading: unitsLoading } = useQuery<{ units: UnitWithPeopleAndFacilities[], total: number }>({
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

  // Use PatchedPropertyUnit for the type here for consistency within this file's current state
  const { data: propertyUnitsData, isLoading: isPropertyUnitsLoading } = useQuery<PatchedPropertyUnit[]>({ 
    queryKey: ["/api/property-units"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/property-units");
      return res.json();
    },
    enabled: !unitData || (unitData.units.length === 0),
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: { unit: any; facilities: any; persons: PersonForm[] }) => {
      return apiRequest("POST", "/api/units-with-persons", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Unit added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/property-units"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; unit: any; facilities: any; persons: PersonForm[] }) => {
      const { id, ...rest } = data;
      return apiRequest("PATCH", `/api/units/${id}`, rest);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Unit updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/property-units"] });
      setEditingUnit(null);
      form.reset();
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });
  
  const addOwner = useCallback(() => setOwners((prev) => [...prev, { ...defaultPerson }]), [defaultPerson]);
  const removeOwner = useCallback((idx: number) => setOwners((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev), []);
  const updateOwner = useCallback((idx: number, field: keyof PersonForm, value: any) => setOwners((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o)), []);

  const addTenant = useCallback(() => setTenants((prev) => [...prev, { ...defaultPerson }]), [defaultPerson]);
  const removeTenant = useCallback((idx: number) => setTenants((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev), []);
  const updateTenant = useCallback((idx: number, field: keyof PersonForm, value: any) => setTenants((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t)), []);

  const onSubmitMulti = async (values: FormValues) => {
    const validOwners = owners.filter(o => o.fullName.trim() && o.email.trim());
    if (validOwners.length === 0 && !editingUnit) {
      toast({ title: "Missing required fields", description: "At least one owner with name and email is required when adding a new unit.", variant: "destructive" });
      return;
    }

    setIsCheckingDuplicate(true);
    if (!editingUnit || values.unitNumber !== editingUnit.unitNumber) {
      try {
        const checkRes = await apiRequest("GET", `/api/units/check-duplicate?unitNumber=${encodeURIComponent(values.unitNumber)}`);
        if (!checkRes.ok) throw new Error(await checkRes.text() || 'Failed to check duplicate');
        const checkData = await checkRes.json();
        if (checkData.isDuplicate) {
          toast({ title: "Duplicate Unit Number", description: "This unit number already exists. Please use a unique unit number.", variant: "destructive" });
          setIsCheckingDuplicate(false);
          return;
        }
      } catch (error) {
        toast({ title: "Error checking duplicate", description: (error as Error).message, variant: "destructive" });
        setIsCheckingDuplicate(false);
        return;
      }
    }
    setIsCheckingDuplicate(false);

    const unitPayload = {
      unitNumber: values.unitNumber, strataLot: values.strataLot, floor: values.floor,
      mailingStreet1: values.mailingStreet1, mailingStreet2: values.mailingStreet2,
      mailingCity: values.mailingCity, mailingStateProvince: values.mailingStateProvince,
      mailingPostalCode: values.mailingPostalCode, mailingCountry: values.mailingCountry,
      phone: values.phone, notes: values.notes,
    };

    const facilitiesPayload = {
      parkingSpots: values.parkingSpots.filter(ps => ps.identifier.trim() !== "").map(p => p.identifier),
      storageLockers: values.storageLockers.filter(sl => sl.identifier.trim() !== "").map(s => s.identifier),
      bikeLockers: values.bikeLockers.filter(bl => bl.identifier.trim() !== "").map(b => b.identifier),
    };

    const personsPayload = [
      ...owners.filter(o => o.fullName && o.email).map(o => ({ fullName: o.fullName, email: o.email, phone: o.phone || undefined, role: 'owner' as 'owner' | 'tenant', receiveEmailNotifications: o.receiveEmailNotifications, hasCat: o.hasCat, hasDog: o.hasDog })),
      ...tenants.filter(t => t.fullName && t.email).map(t => ({ fullName: t.fullName, email: t.email, phone: t.phone || undefined, role: 'tenant' as 'owner' | 'tenant', receiveEmailNotifications: t.receiveEmailNotifications, hasCat: t.hasCat, hasDog: t.hasDog })),
    ];

    const finalPayload = { unit: unitPayload, facilities: facilitiesPayload, persons: personsPayload };

    try {
      if (editingUnit) {
        await updateMutation.mutateAsync({ ...finalPayload, id: editingUnit.id });
      } else {
        await createMutation.mutateAsync(finalPayload);
      }
      // Common reset and close logic moved here from onSuccess handlers for atomicity
      setIsAddDialogOpen(false); 
      setEditingUnit(null);
      form.reset();
      setOwners([{...defaultPerson}]);
      setTenants([{...defaultPerson}]);

    } catch (error) { 
      // Errors are handled by individual mutation.onError, but a general catch here might be useful for unhandled cases
      console.error("Submission error:", error);
    }
  };
  
  const handleEdit = (unit: UnitWithPeopleAndFacilities) => {
    setEditingUnit(unit);
    setIsViewMode(false);
    setIsAddDialogOpen(true);
  };

  const handleView = (unit: UnitWithPeopleAndFacilities) => {
    setEditingUnit(unit);
    setIsViewMode(true);
    setIsAddDialogOpen(true);
  };
  
  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
    setPage(1);
  };
  
  const columns: ColumnDef<UnitWithPeopleAndFacilities>[] = [
    { accessorKey: "unitNumber", header: () => <span className="cursor-pointer" onClick={() => handleSort('unitNumber')}>Unit {sortBy === 'unitNumber' && (sortOrder === 'asc' ? '▲' : '▼')}</span>, cell: ({ row }) => <div className="font-medium">#{row.original.unitNumber}</div> },
    { accessorKey: "strataLot", header: "Strata Lot" },
    { accessorKey: "floor", header: "Floor" },
    {
      id: "mailingAddress",
      header: "Mailing Address",
      cell: ({ row }) => {
        const unit = row.original;
        const addressParts = [
          unit.mailingStreet1,
          unit.mailingStreet2,
          unit.mailingCity,
          unit.mailingStateProvince,
          unit.mailingPostalCode,
          unit.mailingCountry,
        ].filter(Boolean).join(", ");
        return addressParts || <span className="text-neutral-500">N/A</span>;
      }
    },
    {
      id: "facilities",
      header: "Facilities (P/S/B)",
      cell: ({ row }) => {
        const unit = row.original;
        const p = unit.facilities?.parkingSpots?.length ?? 0;
        const s = unit.facilities?.storageLockers?.length ?? 0;
        const b = unit.facilities?.bikeLockers?.length ?? 0;
        return <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="cursor-default">{`${p}/${s}/${b}`}</span></TooltipTrigger><TooltipContent><p>Parking Spots: {p}</p><p>Storage Lockers: {s}</p><p>Bike Lockers: {b}</p></TooltipContent></Tooltip></TooltipProvider>;
      }
    },
    { accessorKey: "owners", header: "Owners", cell: ({ row }) => {
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
    } },
    { accessorKey: "tenants", header: "Tenants", cell: ({ row }) => {
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
    } },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone || "" },
    { id: "actions", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => handleView(row.original)} title="View Unit">
          <EyeIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} title="Edit Unit">
          <PencilIcon className="h-4 w-4" />
        </Button>
      </div>
    ) }
  ];
  
  const total = unitData?.total ?? 0;
  const units = unitData?.units ?? [];

  // Auto-add facility input logic
  const handleFacilityInputChange = (
    fieldName: "parkingSpots" | "storageLockers" | "bikeLockers", 
    index: number, 
    value: string,
    fields: any[],
    appendFn: (value: { identifier: string }) => void
  ) => {
    form.setValue(`${fieldName}.${index}.identifier` as any, value);
    // Only auto-add if this is the last field and user typed something
    if (index === fields.length - 1 && value.trim() !== "") {
      appendFn({ identifier: "" });
    }
  };

  return (
    <Layout title="Unit Management">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => {
            setEditingUnit(null);
            setIsViewMode(false);
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
        
        {(unitsLoading || isPropertyUnitsLoading) ? (
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
                  {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map((p) => (
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
                      onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
                      aria-disabled={page === Math.ceil(total / pageSize)}
                      tabIndex={page === Math.ceil(total / pageSize) ? -1 : 0}
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
      
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          setEditingUnit(null);
          setIsViewMode(false);
        }
      }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>
              {isViewMode ? "View Unit" : editingUnit ? "Edit Unit" : "Add New Unit"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode 
                ? "View the details of this unit."
                : "Enter the details for the new unit, including facilities, owners, and tenants."
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitMulti)} className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-neutral-800">Unit Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="unitNumber"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>Unit Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 203" {...field} disabled={isViewMode} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="strataLot"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>Strata Lot</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 15" {...field} disabled={isViewMode} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>Floor</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 2" {...field} disabled={isViewMode} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <h4 className="text-lg font-semibold text-neutral-800 pt-4">Mailing Address</h4>
                <FormField
                  control={form.control}
                  name="mailingStreet1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address 1</FormLabel>
                      <FormControl><Input placeholder="e.g. 123 Main St" {...field} disabled={isViewMode} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mailingStreet2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address 2 (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g. Apt #100" {...field} disabled={isViewMode} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="mailingCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="e.g. Vancouver" {...field} disabled={isViewMode} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mailingStateProvince"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl><Input placeholder="e.g. BC" {...field} disabled={isViewMode} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mailingPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal/Zip Code</FormLabel>
                        <FormControl><Input placeholder="e.g. V6A 1A1" {...field} disabled={isViewMode} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="mailingCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl><Input placeholder="e.g. Canada" {...field} disabled={isViewMode} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <h4 className="text-lg font-semibold text-neutral-800 pt-4 pb-2">Facilities</h4>
                <div>
                  <FormLabel>Parking Spots</FormLabel>
                  {parkingFields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 mb-2">
                      <FormField
                        control={form.control}
                        name={`parkingSpots.${index}.identifier`}
                        render={({ field }) => (
                          <FormItem className="flex-grow">
                            <FormControl>
                              <Input 
                                placeholder={`Parking Spot ${index + 1}`} 
                                {...field} 
                                disabled={isViewMode}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (!isViewMode) {
                                    handleFacilityInputChange("parkingSpots", index, e.target.value, parkingFields, appendParking);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {!isViewMode && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeParking(index)} 
                          disabled={parkingFields.length === 1}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  {!isViewMode && parkingFields.length === 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => appendParking({ identifier: "" })} 
                      className="mt-1"
                    >
                      Add Parking Spot
                    </Button>
                  )}
                </div>

                <div className="mt-4">
                  <FormLabel>Storage Lockers</FormLabel>
                  {storageFields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 mb-2">
                      <FormField
                        control={form.control}
                        name={`storageLockers.${index}.identifier`}
                        render={({ field }) => (
                          <FormItem className="flex-grow">
                            <FormControl>
                              <Input 
                                placeholder={`Storage Locker ${index + 1}`} 
                                {...field} 
                                disabled={isViewMode}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (!isViewMode) {
                                    handleFacilityInputChange("storageLockers", index, e.target.value, storageFields, appendStorage);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {!isViewMode && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeStorage(index)} 
                          disabled={storageFields.length === 1}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  {!isViewMode && storageFields.length === 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => appendStorage({ identifier: "" })} 
                      className="mt-1"
                    >
                      Add Storage Locker
                    </Button>
                  )}
                </div>

                <div className="mt-4">
                  <FormLabel>Bike Lockers</FormLabel>
                  {bikeFields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 mb-2">
                      <FormField
                        control={form.control}
                        name={`bikeLockers.${index}.identifier`}
                        render={({ field }) => (
                          <FormItem className="flex-grow">
                            <FormControl>
                              <Input 
                                placeholder={`Bike Locker ${index + 1}`} 
                                {...field} 
                                disabled={isViewMode}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (!isViewMode) {
                                    handleFacilityInputChange("bikeLockers", index, e.target.value, bikeFields, appendBike);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {!isViewMode && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeBike(index)} 
                          disabled={bikeFields.length === 1}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  {!isViewMode && bikeFields.length === 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => appendBike({ identifier: "" })} 
                      className="mt-1"
                    >
                      Add Bike Locker
                    </Button>
                  )}
                </div>
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold text-neutral-800">Owners</h4>
                  {!isViewMode && <Button type="button" variant="outline" size="sm" onClick={addOwner}>Add Owner</Button>}
                </div>
                {owners.map((owner, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-3 bg-neutral-50/50 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input 
                        placeholder="Full Name *" 
                        aria-label={`Owner ${idx + 1} Full Name`} 
                        value={owner.fullName} 
                        onChange={isViewMode ? undefined : (e) => updateOwner(idx, 'fullName', e.target.value)}
                        disabled={isViewMode}
                      />
                      <Input 
                        placeholder="Email *" 
                        aria-label={`Owner ${idx + 1} Email`} 
                        type="email" 
                        value={owner.email} 
                        onChange={isViewMode ? undefined : (e) => updateOwner(idx, 'email', e.target.value)}
                        disabled={isViewMode}
                      />
                    </div>
                    <Input 
                      placeholder="Phone (Optional)" 
                      aria-label={`Owner ${idx + 1} Phone`} 
                      value={owner.phone} 
                      onChange={isViewMode ? undefined : (e) => updateOwner(idx, 'phone', e.target.value)}
                      disabled={isViewMode}
                    />
                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox 
                        id={`ownerNotif${idx}`} 
                        checked={owner.receiveEmailNotifications} 
                        onCheckedChange={isViewMode ? undefined : (checked) => updateOwner(idx, 'receiveEmailNotifications', Boolean(checked))}
                        disabled={isViewMode}
                      />
                      <label htmlFor={`ownerNotif${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">
                        Receive Email Notifications
                      </label>
                    </div>
                    <div className="flex items-center space-x-4 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`ownerHasCat${idx}`} 
                          checked={!!owner.hasCat} 
                          onCheckedChange={isViewMode ? undefined : (checked) => updateOwner(idx, 'hasCat', Boolean(checked))}
                          disabled={isViewMode}
                        />
                        <label htmlFor={`ownerHasCat${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">
                          Has Cat 🐱
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`ownerHasDog${idx}`} 
                          checked={!!owner.hasDog} 
                          onCheckedChange={isViewMode ? undefined : (checked) => updateOwner(idx, 'hasDog', Boolean(checked))}
                          disabled={isViewMode}
                        />
                        <label htmlFor={`ownerHasDog${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">
                          Has Dog 🐶
                        </label>
                      </div>
                    </div>
                    {!isViewMode && owners.length > 1 && (
                      <div className="flex justify-end pt-2">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOwner(idx)}>
                          <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold text-neutral-800">Tenants (Optional)</h4>
                  {!isViewMode && <Button type="button" variant="outline" size="sm" onClick={addTenant}>Add Tenant</Button>}
                </div>
                {tenants.map((tenant, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-3 bg-neutral-50/50 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input 
                        placeholder="Full Name" 
                        aria-label={`Tenant ${idx + 1} Full Name`} 
                        value={tenant.fullName} 
                        onChange={isViewMode ? undefined : (e) => updateTenant(idx, 'fullName', e.target.value)}
                        disabled={isViewMode}
                      />
                      <Input 
                        placeholder="Email" 
                        aria-label={`Tenant ${idx + 1} Email`} 
                        type="email" 
                        value={tenant.email} 
                        onChange={isViewMode ? undefined : (e) => updateTenant(idx, 'email', e.target.value)}
                        disabled={isViewMode}
                      />
                    </div>
                    <Input 
                      placeholder="Phone (Optional)" 
                      aria-label={`Tenant ${idx + 1} Phone`} 
                      value={tenant.phone} 
                      onChange={isViewMode ? undefined : (e) => updateTenant(idx, 'phone', e.target.value)}
                      disabled={isViewMode}
                    />
                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox 
                        id={`tenantNotif${idx}`} 
                        checked={tenant.receiveEmailNotifications} 
                        onCheckedChange={isViewMode ? undefined : (checked) => updateTenant(idx, 'receiveEmailNotifications', Boolean(checked))}
                        disabled={isViewMode}
                      />
                      <label htmlFor={`tenantNotif${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">
                        Receive Email Notifications
                      </label>
                    </div>
                    <div className="flex items-center space-x-4 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`tenantHasCat${idx}`} 
                          checked={!!tenant.hasCat} 
                          onCheckedChange={isViewMode ? undefined : (checked) => updateTenant(idx, 'hasCat', Boolean(checked))}
                          disabled={isViewMode}
                        />
                        <label htmlFor={`tenantHasCat${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">
                          Has Cat 🐱
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`tenantHasDog${idx}`} 
                          checked={!!tenant.hasDog} 
                          onCheckedChange={isViewMode ? undefined : (checked) => updateTenant(idx, 'hasDog', Boolean(checked))}
                          disabled={isViewMode}
                        />
                        <label htmlFor={`tenantHasDog${idx}`} className="text-sm font-medium text-neutral-700 cursor-pointer">
                          Has Dog 🐶
                        </label>
                      </div>
                    </div>
                    {!isViewMode && tenants.length > 1 && (
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
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Unit Contact Phone (Optional)</FormLabel><FormControl><Input placeholder="e.g. 555-1234" {...field} disabled={isViewMode} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Input placeholder="e.g. Entry code #123" {...field} disabled={isViewMode} /></FormControl><FormMessage /></FormItem>)} />

              <DialogFooter className="px-6 py-4 border-t sticky bottom-0 bg-white z-10">
                {isViewMode ? (
                  <Button type="button" onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingUnit(null);
                    setIsViewMode(false);
                  }}>
                    Close
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={() => editingUnit ? setEditingUnit(null) : setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={(editingUnit ? updateMutation : createMutation).isPending || isCheckingDuplicate}>
                      {(editingUnit ? updateMutation : createMutation).isPending || isCheckingDuplicate ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}