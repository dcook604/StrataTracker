import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, Trash2Icon, UserIcon, UserPlusIcon, ShieldIcon, UserCheckIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Users } from "lucide-react";

const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email format"),
  isAdmin: z.boolean().default(false),
  isCouncilMember: z.boolean().default(false),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsersPage() {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  
  // Redirect if not an admin
  if (user && !user.isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <EmptyState
          icon={<ShieldIcon className="h-10 w-10" />}
          title="Access Denied"
          description="You don't have permission to manage users."
        />
      </div>
    );
  }
  
  const { data, isLoading } = useQuery<User[]>({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
  });
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      isAdmin: false,
      isCouncilMember: false,
    }
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("POST", "/api/register", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
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
    mutationFn: async (data: UserFormValues & { id: number }) => {
      const { id, ...userData } = data;
      const res = await apiRequest("PATCH", `/api/users/${id}`, userData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      setEditingUser(null);
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
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (values: UserFormValues) => {
    if (editingUser) {
      updateMutation.mutate({ ...values, id: editingUser.id });
    } else {
      createMutation.mutate(values);
    }
  };
  
  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      // Don't include password when editing
      password: "",
      fullName: user.fullName || "",
      email: user.email || "",
      isAdmin: user.isAdmin || false,
      isCouncilMember: user.isCouncilMember || false,
    });
  };
  
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate(id);
    }
  };
  
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "fullName",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      header: "Role",
      cell: ({ row }) => {
        const user = row.original;
        if (user.isAdmin) {
          return (
            <div className="flex items-center">
              <ShieldIcon className="h-4 w-4 mr-1 text-primary" />
              <span>Administrator</span>
            </div>
          );
        } else if (user.isCouncilMember) {
          return (
            <div className="flex items-center">
              <UserCheckIcon className="h-4 w-4 mr-1 text-primary" />
              <span>Council Member</span>
            </div>
          );
        } else {
          return (
            <div className="flex items-center">
              <UserIcon className="h-4 w-4 mr-1" />
              <span>User</span>
            </div>
          );
        }
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const rowUser = row.original;
        
        // Prevent administrators from deleting themselves
        const isSelf = user && rowUser.id === user.id;
        
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleEdit(rowUser)}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            {!isSelf && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleDelete(rowUser.id)}
              >
                <Trash2Icon className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        );
      }
    }
  ];
  
  return (
    <Layout title="User Management">
      <div className="space-y-4 px-4 md:px-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold md:hidden">User Management</h1>
          <Button 
            onClick={() => {
              form.reset();
              setIsAddDialogOpen(true);
            }}
            className="h-12 px-6 md:h-10"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Add User
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : data && data.length > 0 ? (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <DataTable 
              columns={columns} 
              data={data}
              searchColumn="email"
              searchPlaceholder="Search by email..."
            />
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-12 w-12 md:h-10 md:w-10" />}
            title="No users found"
            description="Add your first user to get started"
            actionLabel="Add User"
            onAction={() => {
              form.reset();
              setIsAddDialogOpen(true);
            }}
          />
        )}
      </div>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl">Add User</DialogTitle>
            <DialogDescription>
              Create a new user for the Spectrum 4 Violation System.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username*</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password*</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Administrator</FormLabel>
                        <FormDescription>
                          Can manage all aspects of the system
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isCouncilMember"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Council Member</FormLabel>
                        <FormDescription>
                          Can approve violations
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username*</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (leave blank to keep current)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Administrator</FormLabel>
                        <FormDescription>
                          Can manage all aspects of the system
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isCouncilMember"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Council Member</FormLabel>
                        <FormDescription>
                          Can approve violations
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}