import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Customer, PropertyUnit } from "@shared/schema";
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

export default function CustomersPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  
  const { data: customerData, isLoading: customersLoading } = useQuery<{ customers: Customer[], total: number }>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers");
      return res.json();
    },
  });

  // Fetch property units as fallback if no customers
  const { data: propertyUnitsData, isLoading: unitsLoading } = useQuery<PropertyUnit[]>({
    queryKey: ["/api/property-units"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/property-units");
      return res.json();
    },
    enabled: !customerData || (customerData.customers.length === 0),
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
      const res = await apiRequest("POST", "/api/customers", data);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
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
      const { id, ...customerData } = data;
      const res = await apiRequest("PATCH", `/api/customers/${id}`, customerData);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
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
    if (editingCustomer) {
      updateMutation.mutate({ ...values, id: editingCustomer.id });
    } else {
      createMutation.mutate(values);
    }
  };
  
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      unitNumber: customer.unitNumber,
      floor: customer.floor || "",
      ownerName: customer.ownerName,
      ownerEmail: customer.ownerEmail,
      tenantName: customer.tenantName || "",
      tenantEmail: customer.tenantEmail || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
    });
  };
  
  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "unitNumber",
      header: "Unit",
    },
    {
      accessorKey: "floor",
      header: "Floor",
    },
    {
      accessorKey: "ownerName",
      header: "Owner",
    },
    {
      accessorKey: "ownerEmail",
      header: "Owner Email",
    },
    {
      accessorKey: "tenantName",
      header: "Tenant",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleEdit(customer)}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];
  
  // Merge customers and property units (if no customers)
  let displayData: Customer[] = [];
  if (customerData && customerData.customers.length > 0) {
    displayData = customerData.customers;
  } else if (propertyUnitsData && propertyUnitsData.length > 0) {
    // Map property units to Customer shape
    displayData = propertyUnitsData.map((unit) => ({
      id: unit.id, // Not a real customer id, but unique
      uuid: unit.unitNumber, // Use unit number as uuid fallback
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      ownerName: unit.ownerName,
      ownerEmail: unit.ownerEmail,
      tenantName: unit.tenantName,
      tenantEmail: unit.tenantEmail,
      phone: "",
      notes: "",
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    }));
  }

  return (
    <Layout title="Customer Management">
      <div className="space-y-6">
        <div className="flex justify-end">
        <Button onClick={() => {
          form.reset();
          setIsAddDialogOpen(true);
        }}>
          Add Customer
        </Button>
      </div>
      
      {(customersLoading || unitsLoading) ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : displayData && displayData.length > 0 ? (
        <DataTable 
          columns={columns} 
          data={displayData}
          searchColumn="unitNumber"
          searchPlaceholder="Search by unit number..."
        />
      ) : (
        <EmptyState
          icon={<BuildingIcon className="h-10 w-10" />}
          title="No customers found"
          description="Add your first customer to get started"
          actionLabel="Add Customer"
          onAction={() => {
            form.reset();
            setIsAddDialogOpen(true);
          }}
        />
      )}
      </div>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>
              Enter the details for the new customer.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-y-auto px-6 py-4">
              <div className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Owner Information</h3>
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
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Tenant Information</h3>
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
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Additional Information</h3>
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
            </form>
          </Form>
          <DialogFooter className="px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer details.
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
                <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>
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