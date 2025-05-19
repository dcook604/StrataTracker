import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ViolationCategory } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, FileTextIcon, BadgeAlertIcon } from "lucide-react";
import { Layout } from "@/components/layout";

const formSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().min(1, "Description is required"),
  defaultFineAmount: z.coerce.number().min(0, "Fine amount must be a positive number"),
  bylawReference: z.string().optional(),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function CategoriesPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ViolationCategory | null>(null);
  const { toast } = useToast();
  
  const { data, isLoading } = useQuery<ViolationCategory[]>({
    queryKey: ["/api/violation-categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/violation-categories");
      return res.json();
    },
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultFineAmount: 0,
      bylawReference: "",
      active: true,
    }
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/violation-categories", data);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Violation category added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/violation-categories"] });
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
      const { id, ...categoryData } = data;
      const res = await apiRequest("PATCH", `/api/violation-categories/${id}`, categoryData);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Violation category updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/violation-categories"] });
      setEditingCategory(null);
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
    if (editingCategory) {
      updateMutation.mutate({ ...values, id: editingCategory.id });
    } else {
      createMutation.mutate(values);
    }
  };
  
  const handleEdit = (category: ViolationCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      defaultFineAmount: category.defaultFineAmount || 0,
      bylawReference: category.bylawReference || "",
      active: category.active,
    });
  };
  
  const columns: ColumnDef<ViolationCategory>[] = [
    {
      accessorKey: "name",
      header: "Category Name",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.original.description || "";
        return description.length > 50 ? `${description.substring(0, 50)}...` : description;
      },
    },
    {
      accessorKey: "defaultFineAmount",
      header: "Fine Amount",
      cell: ({ row }) => {
        return `$${row.original.defaultFineAmount?.toFixed(2) || '0.00'}`;
      },
    },
    {
      accessorKey: "bylawReference",
      header: "Bylaw Reference",
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => {
        return row.original.active ? (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">Active</span>
        ) : (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">Inactive</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const category = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleEdit(category)}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];
  
  return (
    <Layout title="Violation Categories">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Violation Categories</h1>
          <Button onClick={() => {
            form.reset({
              name: "",
              description: "",
              defaultFineAmount: 0,
              bylawReference: "",
              active: true,
            });
            setIsAddDialogOpen(true);
          }}>
            Add Category
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : data && data.length > 0 ? (
          <DataTable 
            columns={columns} 
            data={data}
            searchColumn="name"
            searchPlaceholder="Search by category name..."
          />
        ) : (
          <EmptyState
            icon={<BadgeAlertIcon className="h-10 w-10" />}
            title="No violation categories found"
            description="Add your first violation category to get started"
            onAction={() => {
              form.reset({
                name: "",
                description: "",
                defaultFineAmount: 0,
                bylawReference: "",
                active: true,
              });
              setIsAddDialogOpen(true);
            }}
            actionLabel="Add Category"
          />
        )}
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Violation Category</DialogTitle>
              <DialogDescription>
                Enter the details for the new violation category.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Pet Violation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description*</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Violation related to unauthorized pets or pet waste" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultFineAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fine Amount*</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="100.00" {...field} />
                      </FormControl>
                      <FormDescription>Enter the amount in dollars</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bylawReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bylaw Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="Section 3.4.2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Inactive categories won't appear in the violation form
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Violation Category</DialogTitle>
              <DialogDescription>
                Update the violation category details.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Pet Violation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description*</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Violation related to unauthorized pets or pet waste" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultFineAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fine Amount*</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="100.00" {...field} />
                      </FormControl>
                      <FormDescription>Enter the amount in dollars</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bylawReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bylaw Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="Section 3.4.2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Inactive categories won't appear in the violation form
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
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
      </div>
    </Layout>
  );
}