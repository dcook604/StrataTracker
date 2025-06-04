import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { PencilIcon, TrashIcon as DeleteIcon, BuildingIcon, Trash2, EyeIcon, PlusIcon, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FilterX } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  townhouse?: boolean;
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

const personSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  phone: z.string().optional(),
  receiveEmailNotifications: z.boolean().default(true),
  hasCat: z.boolean().default(false),
  hasDog: z.boolean().default(false),
});

const formSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required"),
  strataLot: z.string().optional(),
  floor: z.string().optional(),
  townhouse: z.boolean().default(false),
  mailingStreet1: z.string().optional(),
  mailingStreet2: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingStateProvince: z.string().optional(),
  mailingPostalCode: z.string().optional(),
  mailingCountry: z.string().optional(),
  parkingSpots: z.array(z.object({ identifier: z.string() })),
  storageLockers: z.array(z.object({ identifier: z.string() })),
  bikeLockers: z.array(z.object({ identifier: z.string() })),
  owners: z.array(personSchema),
  tenants: z.array(personSchema.partial().extend({ // Tenants can be partially filled or empty initially
    fullName: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
  })),
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

type PersonFormWithRole = PersonForm & {
  role: 'owner' | 'tenant';
};

type UnitWithPeopleAndFacilities = PatchedPropertyUnit & { 
  owners: PersonForm[];
  tenants: PersonForm[];
  facilities?: PatchedUnitFacility; 
  townhouse?: boolean;
};

export default function UnitsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUnit, setEditingUnit] = useState<UnitWithPeopleAndFacilities | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<UnitWithPeopleAndFacilities | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<{ unit: UnitWithPeopleAndFacilities; details: any } | null>(null);
  const [page, setPage] = useState(() => Number(localStorage.getItem(PAGE_KEY)) || 1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem(PAGE_SIZE_KEY)) || 20);
  const [sortBy, setSortBy] = useState<string>(() => JSON.parse(localStorage.getItem(SORT_KEY) || '"unitNumber"'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => JSON.parse(localStorage.getItem(SORT_ORDER_KEY) || '"asc"'));
  const defaultPerson = { fullName: "", email: "", phone: "", receiveEmailNotifications: true, hasCat: false, hasDog: false };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unitNumber: "", strataLot: "", floor: "", townhouse: false,
      mailingStreet1: "", mailingStreet2: "", mailingCity: "", mailingStateProvince: "", mailingPostalCode: "", mailingCountry: "",
      parkingSpots: [{ identifier: "" }], storageLockers: [{ identifier: "" }], bikeLockers: [{ identifier: "" }],
      owners: [{ ...defaultPerson }],
      tenants: [{ fullName: "", email: "", phone: "", receiveEmailNotifications: true, hasCat: false, hasDog: false }],
      phone: "", notes: "",
    },
    mode: "onChange" // Enable real-time validation and updates
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

  const { fields: ownerFields, append: appendOwner, remove: removeOwner } = useFieldArray({
    control: form.control,
    name: "owners"
  });

  const { fields: tenantFields, append: appendTenant, remove: removeTenant } = useFieldArray({
    control: form.control,
    name: "tenants"
  });

  useEffect(() => { localStorage.setItem(PAGE_KEY, String(page)); }, [page]);
  useEffect(() => { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); }, [pageSize]);
  useEffect(() => { localStorage.setItem(SORT_KEY, JSON.stringify(sortBy)); localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(sortOrder)); }, [sortBy, sortOrder]);
  
  useEffect(() => {
    if (!isAddDialogOpen) {
      setIsFormReady(false);
      return;
    }

    if (isAddDialogOpen && !editingUnit) {
      // Adding new unit
      const resetData = {
        unitNumber: "", strataLot: "", floor: "", townhouse: false,
        mailingStreet1: "", mailingStreet2: "", mailingCity: "", mailingStateProvince: "", mailingPostalCode: "", mailingCountry: "",
        parkingSpots: [{ identifier: "" }], storageLockers: [{ identifier: "" }], bikeLockers: [{ identifier: "" }],
        owners: [{ ...defaultPerson }],
        tenants: [{ fullName: "", email: "", phone: "", receiveEmailNotifications: true, hasCat: false, hasDog: false }],
        phone: "", notes: "",
      };
      form.reset(resetData);
      setIsFormReady(true);
    } else if (editingUnit) {
      // Editing existing unit
      const parkingSpots = editingUnit.facilities?.parkingSpots?.map(p => p.identifier || "") || [];
      const storageLockers = editingUnit.facilities?.storageLockers?.map(s => s.identifier || "") || [];
      const bikeLockers = editingUnit.facilities?.bikeLockers?.map(b => b.identifier || "") || [];
      
      const resetData = {
        unitNumber: editingUnit.unitNumber,
        strataLot: editingUnit.strataLot || "",
        floor: editingUnit.floor || "",
        townhouse: editingUnit.townhouse || false,
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
        owners: editingUnit.owners && editingUnit.owners.length > 0 
          ? editingUnit.owners.map(o => ({ 
              fullName: o.fullName || "", 
              email: o.email || "", 
              phone: o.phone || "", 
              receiveEmailNotifications: Boolean(o.receiveEmailNotifications), 
              hasCat: Boolean(o.hasCat), 
              hasDog: Boolean(o.hasDog) 
            })) 
          : [{ ...defaultPerson }],
        tenants: editingUnit.tenants && editingUnit.tenants.length > 0 
          ? editingUnit.tenants.map(t => ({ 
              fullName: t.fullName || "", 
              email: t.email || "", 
              phone: t.phone || "", 
              receiveEmailNotifications: Boolean(t.receiveEmailNotifications), 
              hasCat: Boolean(t.hasCat), 
              hasDog: Boolean(t.hasDog) 
            })) 
          : [{ fullName: "", email: "", phone: "", receiveEmailNotifications: true, hasCat: false, hasDog: false }],
      };
      
      form.reset(resetData);
      // Small delay to ensure form is fully reset before enabling editing
      setTimeout(() => {
        setIsFormReady(true);
      }, 100);
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
    mutationFn: async (data: { unit: any; facilities: any; persons: PersonFormWithRole[] }) => {
      return apiRequest("POST", "/api/units-with-persons", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Unit added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/property-units"] });
      setIsAddDialogOpen(false);
      setEditingUnit(null);
      setIsFormReady(false);
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; unit: any; facilities: any; persons: PersonFormWithRole[] }) => {
      const { id, ...rest } = data;
      return apiRequest("PATCH", `/api/units/${id}`, rest);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Unit updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/property-units"] });
      setEditingUnit(null);
      setIsAddDialogOpen(false);
      setIsFormReady(false);
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/units/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Unit deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/property-units"] });
      setUnitToDelete(null);
      setDeletingUnit(null);
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const fetchUnitDetails = async (unitId: number) => {
    const res = await apiRequest("GET", `/api/units/${unitId}/details`);
    return res.json();
  };

  const handleDelete = async (unit: UnitWithPeopleAndFacilities) => {
    try {
      setDeletingUnit(unit);
      const details = await fetchUnitDetails(unit.id);
      setUnitToDelete({ unit, details });
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch unit details", variant: "destructive" });
      setDeletingUnit(null);
    }
  };

  const confirmDelete = async () => {
    if (unitToDelete) {
      await deleteMutation.mutateAsync(unitToDelete.unit.id);
    }
  };

  const onSubmitMulti = async (values: FormValues) => {
    const validOwners = values.owners.filter(o => o.fullName.trim() && o.email.trim());
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
      unitNumber: values.unitNumber, strataLot: values.strataLot, floor: values.floor, townhouse: values.townhouse,
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

    // Fix the persons payload typing
    const personsPayload: PersonFormWithRole[] = [
      ...values.owners
        .filter(o => o.fullName && o.email)
        .map(o => ({ 
          fullName: o.fullName, 
          email: o.email, 
          phone: o.phone || undefined, 
          receiveEmailNotifications: o.receiveEmailNotifications,
          hasCat: o.hasCat || false,
          hasDog: o.hasDog || false,
          role: 'owner' as const
        })),
      ...values.tenants
        .filter(t => t.fullName && t.email && t.fullName.trim() && t.email.trim())
        .map(t => ({ 
          fullName: t.fullName!, // We know it's defined due to filter
          email: t.email!, // We know it's defined due to filter
          phone: t.phone || undefined, 
          receiveEmailNotifications: t.receiveEmailNotifications ?? true,
          hasCat: t.hasCat || false,
          hasDog: t.hasDog || false,
          role: 'tenant' as const
        })),
    ];

    const finalPayload = { unit: unitPayload, facilities: facilitiesPayload, persons: personsPayload };

    try {
      if (editingUnit) {
        await updateMutation.mutateAsync({ ...finalPayload, id: editingUnit.id });
      } else {
        await createMutation.mutateAsync(finalPayload);
      }
    } catch (error) { 
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
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleDelete(row.original)} 
          title="Delete Unit"
          disabled={deletingUnit?.id === row.original.id}
        >
          {deletingUnit?.id === row.original.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
          )}
        </Button>
      </div>
    ) }
  ];
  
  const total = unitData?.total ?? 0;
  const units = unitData?.units ?? [];

  // Facility input change handler - simplified without auto-add
  const handleFacilityInputChange = (
    fieldName: "parkingSpots" | "storageLockers" | "bikeLockers", 
    index: number, 
    value: string
  ) => {
    // Limit to 10 characters and allow alphanumeric
    const cleanValue = value.slice(0, 10);
    form.setValue(`${fieldName}.${index}.identifier` as any, cleanValue);
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
                  
                  {/* Smart pagination with limited page numbers */}
                  {(() => {
                    const totalPages = Math.ceil(total / pageSize);
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
            <DialogTitle className="flex items-center gap-2">
              {isViewMode ? (
                <>
                  <EyeIcon className="h-5 w-5 text-blue-600" />
                  View Unit {editingUnit?.unitNumber}
                </>
              ) : editingUnit ? (
                <>
                  <PencilIcon className="h-5 w-5 text-green-600" />
                  Edit Unit {editingUnit.unitNumber}
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5 text-blue-600" />
                  Add New Unit
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isViewMode 
                ? "View the details of this unit. Click the edit button in the table to make changes."
                : editingUnit 
                  ? "Edit the details for this unit, including facilities, owners, and tenants."
                  : "Enter the details for the new unit, including facilities, owners, and tenants."
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitMulti)} className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
              {!isFormReady && !isViewMode ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading form...</span>
                </div>
              ) : (
                <>
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
                              <Input 
                                placeholder="e.g. 203" 
                                {...field} 
                                readOnly={isViewMode} 
                                className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                              />
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
                              <Input 
                                placeholder="e.g. 15" 
                                {...field} 
                                readOnly={isViewMode} 
                                className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                              />
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
                              <Input 
                                placeholder="e.g. 2" 
                                {...field} 
                                readOnly={isViewMode} 
                                className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="townhouse"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-1">
                            <FormLabel>Townhouse</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === "true")} 
                              value={field.value ? "true" : "false"}
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger className={isViewMode ? "bg-gray-50 cursor-default" : ""}>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="false">No</SelectItem>
                                <SelectItem value="true">Yes</SelectItem>
                              </SelectContent>
                            </Select>
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
                          <FormControl>
                            <Input 
                              placeholder="e.g. 123 Main St" 
                              {...field} 
                              readOnly={isViewMode} 
                              className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                            />
                          </FormControl>
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
                          <FormControl>
                            <Input 
                              placeholder="e.g. Apt #100" 
                              {...field} 
                              readOnly={isViewMode} 
                              className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                            />
                          </FormControl>
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
                            <FormControl>
                              <Input 
                                placeholder="e.g. Vancouver" 
                                {...field} 
                                readOnly={isViewMode} 
                                className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                              />
                            </FormControl>
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
                            <FormControl>
                              <Input 
                                placeholder="e.g. BC" 
                                {...field} 
                                readOnly={isViewMode} 
                                className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                              />
                            </FormControl>
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
                            <FormControl>
                              <Input 
                                placeholder="e.g. V6A 1A1" 
                                {...field} 
                                readOnly={isViewMode} 
                                className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                              />
                            </FormControl>
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
                          <FormControl>
                            <Input 
                              placeholder="e.g. Canada" 
                              {...field} 
                              readOnly={isViewMode} 
                              className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                            />
                          </FormControl>
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
                                    readOnly={isViewMode}
                                    maxLength={10}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (!isViewMode) {
                                        handleFacilityInputChange("parkingSpots", index, e.target.value);
                                      }
                                    }}
                                    className={isViewMode ? "bg-gray-50 cursor-default" : ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {!isViewMode && (
                            <div className="flex gap-1">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => appendParking({ identifier: "" })} 
                                title="Add parking spot"
                              >
                                Add
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => removeParking(index)} 
                                disabled={parkingFields.length === 1}
                                title="Remove parking spot"
                              >
                                Remove
                              </Button>
                            </div>
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
                                    readOnly={isViewMode}
                                    maxLength={10}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (!isViewMode) {
                                        handleFacilityInputChange("storageLockers", index, e.target.value);
                                      }
                                    }}
                                    className={isViewMode ? "bg-gray-50 cursor-default" : ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {!isViewMode && (
                            <div className="flex gap-1">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => appendStorage({ identifier: "" })} 
                                title="Add storage locker"
                              >
                                Add
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => removeStorage(index)} 
                                disabled={storageFields.length === 1}
                                title="Remove storage locker"
                              >
                                Remove
                              </Button>
                            </div>
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
                                    readOnly={isViewMode}
                                    maxLength={10}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (!isViewMode) {
                                        handleFacilityInputChange("bikeLockers", index, e.target.value);
                                      }
                                    }}
                                    className={isViewMode ? "bg-gray-50 cursor-default" : ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {!isViewMode && (
                            <div className="flex gap-1">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => appendBike({ identifier: "" })} 
                                title="Add bike locker"
                              >
                                Add
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => removeBike(index)} 
                                disabled={bikeFields.length === 1}
                                title="Remove bike locker"
                              >
                                Remove
                              </Button>
                            </div>
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
                      {!isViewMode && <Button type="button" variant="outline" size="sm" onClick={() => appendOwner({ ...defaultPerson })}>Add Owner</Button>}
                    </div>
                    {ownerFields.map((ownerField, idx) => (
                      <div key={ownerField.id} className="p-4 border rounded-lg space-y-3 bg-neutral-50/50 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`owners.${idx}.fullName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sr-only">Owner {idx + 1} Full Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Full Name *" 
                                    {...field} 
                                    readOnly={isViewMode}
                                    className={isViewMode ? "bg-gray-50 cursor-default" : ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`owners.${idx}.email`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sr-only">Owner {idx + 1} Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Email *" 
                                    type="email" 
                                    {...field} 
                                    readOnly={isViewMode}
                                    className={isViewMode ? "bg-gray-50 cursor-default" : ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`owners.${idx}.phone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="sr-only">Owner {idx + 1} Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Phone (Optional)" 
                                  {...field} 
                                  readOnly={isViewMode}
                                  className={isViewMode ? "bg-gray-50 cursor-default" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-center space-x-2 pt-1">
                          <FormField
                            control={form.control}
                            name={`owners.${idx}.receiveEmailNotifications`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                  <Checkbox 
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isViewMode}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium text-neutral-700 cursor-pointer">
                                  Receive Email Notifications
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex items-center space-x-4 pt-2">
                          <FormField
                            control={form.control}
                            name={`owners.${idx}.hasCat`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isViewMode}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium text-neutral-700 cursor-pointer">
                                  Has Cat 🐱
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`owners.${idx}.hasDog`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isViewMode}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium text-neutral-700 cursor-pointer">
                                  Has Dog 🐶
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        {!isViewMode && ownerFields.length > 1 && (
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
                      {!isViewMode && <Button type="button" variant="outline" size="sm" onClick={() => appendTenant({ ...defaultPerson })}>Add Tenant</Button>}
                    </div>
                    {tenantFields.map((tenantField, idx) => (
                      <div key={tenantField.id} className="p-4 border rounded-lg space-y-3 bg-neutral-50/50 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`tenants.${idx}.fullName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sr-only">Tenant {idx + 1} Full Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Full Name" 
                                    {...field} 
                                    readOnly={isViewMode}
                                    className={isViewMode ? "bg-gray-50 cursor-default" : ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`tenants.${idx}.email`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sr-only">Tenant {idx + 1} Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Email" 
                                    type="email" 
                                    {...field} 
                                    readOnly={isViewMode}
                                    className={isViewMode ? "bg-gray-50 cursor-default" : ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`tenants.${idx}.phone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="sr-only">Tenant {idx + 1} Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Phone (Optional)" 
                                  {...field} 
                                  readOnly={isViewMode}
                                  className={isViewMode ? "bg-gray-50 cursor-default" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-center space-x-2 pt-1">
                          <FormField
                            control={form.control}
                            name={`tenants.${idx}.receiveEmailNotifications`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isViewMode}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium text-neutral-700 cursor-pointer">
                                  Receive Email Notifications
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex items-center space-x-4 pt-2">
                           <FormField
                            control={form.control}
                            name={`tenants.${idx}.hasCat`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isViewMode}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium text-neutral-700 cursor-pointer">
                                  Has Cat 🐱
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`tenants.${idx}.hasDog`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isViewMode}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium text-neutral-700 cursor-pointer">
                                  Has Dog 🐶
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        {!isViewMode && tenantFields.length > 1 && (
                          <div className="flex justify-end pt-2">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeTenant(idx)}>
                              <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {tenantFields.length === 1 && !tenantFields[0].fullName && !tenantFields[0].email && (
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
                          <Input 
                            placeholder="e.g. 555-1234" 
                            {...field} 
                            readOnly={isViewMode} 
                            className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                          />
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
                          <Input 
                            placeholder="e.g. Entry code #123" 
                            {...field} 
                            readOnly={isViewMode} 
                            className={isViewMode ? "bg-gray-50 cursor-default" : ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                </>
              )}

              <DialogFooter className="px-6 py-4 border-t sticky bottom-0 bg-white z-10">
                {isViewMode ? (
                  <Button type="button" onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingUnit(null);
                    setIsViewMode(false);
                    setIsFormReady(false);
                  }}>
                    Close
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingUnit(null);
                      setIsFormReady(false);
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!isFormReady || (editingUnit ? updateMutation : createMutation).isPending || isCheckingDuplicate}
                    >
                      {(editingUnit ? updateMutation : createMutation).isPending || isCheckingDuplicate ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!unitToDelete} onOpenChange={() => setUnitToDelete(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Unit Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the unit and all associated data including:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {unitToDelete && (
            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Unit Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Unit Number:</strong> #{unitToDelete.unit.unitNumber}</div>
                  <div><strong>Strata Lot:</strong> {unitToDelete.unit.strataLot || "N/A"}</div>
                  <div><strong>Floor:</strong> {unitToDelete.unit.floor || "N/A"}</div>
                  <div><strong>Townhouse:</strong> {unitToDelete.unit.townhouse ? "Yes" : "No"}</div>
                </div>
              </div>
              
              {unitToDelete.details.persons && unitToDelete.details.persons.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">Associated People ({unitToDelete.details.persons.length})</h4>
                  <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                    {unitToDelete.details.persons.map((person: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{person.fullName} ({person.role})</span>
                        <span className="text-gray-600">{person.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(unitToDelete.details.facilities.parkingSpots.length > 0 || 
                unitToDelete.details.facilities.storageLockers.length > 0 || 
                unitToDelete.details.facilities.bikeLockers.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Facilities</h4>
                  <div className="text-sm">
                    {unitToDelete.details.facilities.parkingSpots.length > 0 && (
                      <div>Parking Spots: {unitToDelete.details.facilities.parkingSpots.map((p: any) => p.identifier).join(", ")}</div>
                    )}
                    {unitToDelete.details.facilities.storageLockers.length > 0 && (
                      <div>Storage Lockers: {unitToDelete.details.facilities.storageLockers.map((s: any) => s.identifier).join(", ")}</div>
                    )}
                    {unitToDelete.details.facilities.bikeLockers.length > 0 && (
                      <div>Bike Lockers: {unitToDelete.details.facilities.bikeLockers.map((b: any) => b.identifier).join(", ")}</div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Warning</h4>
                <p className="text-sm text-yellow-700">
                  All violations, history records, and associated data for this unit will also be permanently deleted.
                </p>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnitToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Unit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}