import { useState, useRef } from "react";
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
import { PencilIcon, Trash2Icon, UserIcon, UserPlusIcon, ShieldIcon, UserCheckIcon, LockIcon, UnlockIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Users } from "lucide-react";
import zxcvbn from "zxcvbn";
import { Progress } from "@/components/ui/progress";

const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email format"),
  roles: z.object({
    isAdmin: z.boolean().default(false),
    isCouncilMember: z.boolean().default(false),
    isUser: z.boolean().default(true),
  }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

type InviteFormValues = {
  email: string;
  fullName: string;
  isAdmin: boolean;
  isCouncilMember: boolean;
  isUser: boolean;
};

export default function UsersPage() {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [lockUserId, setLockUserId] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState("");
  const lockReasonInputRef = useRef<HTMLInputElement>(null);
  // Password strength state for Add/Edit dialogs
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [passwordLabel, setPasswordLabel] = useState("");
  
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
      roles: {
        isAdmin: false,
        isCouncilMember: false,
        isUser: true,
      }
    }
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      // Flatten roles object for API
      const apiData = {
        ...data,
        isAdmin: data.roles.isAdmin,
        isCouncilMember: data.roles.isCouncilMember,
        isUser: data.roles.isUser,
      };
      delete (apiData as any).roles;
      
      const res = await apiRequest("POST", "/api/register", apiData);
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
      // Flatten roles object for API
      const apiData = {
        ...userData,
        isAdmin: userData.roles.isAdmin,
        isCouncilMember: userData.roles.isCouncilMember,
        isUser: userData.roles.isUser,
      };
      delete (apiData as any).roles;
      
      const res = await apiRequest("PATCH", `/api/users/${id}`, apiData);
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
  
  const unlockMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/users/${id}/unlock`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User unlocked successfully",
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
  
  const lockMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await apiRequest("POST", `/api/users/${id}/lock`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User locked successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      setIsLockDialogOpen(false);
      setLockUserId(null);
      setLockReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(z.object({
      email: z.string().email("Valid email is required"),
      fullName: z.string().min(2, "Full name is required"),
      isAdmin: z.boolean().default(false),
      isCouncilMember: z.boolean().default(false),
      isUser: z.boolean().default(true),
    })),
    defaultValues: {
      email: '',
      fullName: '',
      isAdmin: false,
      isCouncilMember: false,
      isUser: true,
    }
  });
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      const res = await apiRequest("POST", "/api/users/invite", data);
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to send invitation');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invitation Sent", description: "The user will receive an email to complete registration." });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      roles: {
        isAdmin: user.isAdmin || false,
        isCouncilMember: user.isCouncilMember || false,
        isUser: user.isUser || true,
      }
    });
  };
  
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate(id);
    }
  };
  
  // Password strength meter logic
  function handlePasswordChange(value: string) {
    if (!value) {
      setPasswordStrength(0);
      setPasswordFeedback("");
      setPasswordLabel("");
      return;
    }
    const result = zxcvbn(value);
    setPasswordStrength((result.score + 1) * 20);
    setPasswordFeedback(result.feedback.suggestions[0] || "");
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    setPasswordLabel(labels[result.score] || "");
  }
  
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
      accessorKey: "accountLocked",
      header: "Status",
      cell: ({ row }) => {
        const user = row.original;
        return user.accountLocked ? (
          <span className="flex flex-col items-start text-red-600 font-semibold">
            <span className="flex items-center"><LockIcon className="h-4 w-4 mr-1" /> Locked</span>
            {user.lockReason && (
              <span className="text-xs text-red-500 mt-1">Reason: {user.lockReason}</span>
            )}
          </span>
        ) : (
          <span className="flex items-center text-green-600 font-semibold"><UnlockIcon className="h-4 w-4 mr-1" /> Active</span>
        );
      }
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
            {rowUser.accountLocked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unlockMutation.mutate(rowUser.id)}
                className="ml-2 text-red-600 border-red-400"
              >
                <UnlockIcon className="h-4 w-4 mr-1" /> Unlock
              </Button>
            ) : (
              !isSelf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLockUserId(rowUser.id);
                    setIsLockDialogOpen(true);
                    setTimeout(() => lockReasonInputRef.current?.focus(), 100);
                  }}
                  className="ml-2 text-yellow-700 border-yellow-400"
                >
                  <LockIcon className="h-4 w-4 mr-1" /> Lock
                </Button>
              )
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
          <Button onClick={() => setIsInviteDialogOpen(true)} className="h-12 px-6 md:h-10" variant="secondary">
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Invite User
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
                    <FormLabel>{editingUser ? "New Password (leave blank to keep current)" : "Password*"}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        onChange={e => {
                          field.onChange(e);
                          handlePasswordChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    {field.value && (
                      <div className="mt-2">
                        <Progress value={passwordStrength} className={
                          passwordStrength < 40 ? "bg-red-200" :
                          passwordStrength < 60 ? "bg-yellow-200" :
                          passwordStrength < 80 ? "bg-blue-200" :
                          "bg-green-200"
                        } />
                        <div className="text-xs mt-1 font-medium" style={{ color: passwordStrength < 40 ? '#dc2626' : passwordStrength < 60 ? '#ca8a04' : passwordStrength < 80 ? '#2563eb' : '#16a34a' }}>{passwordLabel}</div>
                        {passwordFeedback && <div className="text-xs text-muted-foreground mt-1">{passwordFeedback}</div>}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">User Roles</h3>
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="roles.isAdmin"
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
                    name="roles.isCouncilMember"
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
                  <FormField
                    control={form.control}
                    name="roles.isUser"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Regular User</FormLabel>
                          <FormDescription>
                            Basic access to report violations
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        onChange={e => {
                          field.onChange(e);
                          handlePasswordChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    {field.value && (
                      <div className="mt-2">
                        <Progress value={passwordStrength} className={
                          passwordStrength < 40 ? "bg-red-200" :
                          passwordStrength < 60 ? "bg-yellow-200" :
                          passwordStrength < 80 ? "bg-blue-200" :
                          "bg-green-200"
                        } />
                        <div className="text-xs mt-1 font-medium" style={{ color: passwordStrength < 40 ? '#dc2626' : passwordStrength < 60 ? '#ca8a04' : passwordStrength < 80 ? '#2563eb' : '#16a34a' }}>{passwordLabel}</div>
                        {passwordFeedback && <div className="text-xs text-muted-foreground mt-1">{passwordFeedback}</div>}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">User Roles</h3>
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="roles.isAdmin"
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
                    name="roles.isCouncilMember"
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
                  <FormField
                    control={form.control}
                    name="roles.isUser"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Regular User</FormLabel>
                          <FormDescription>
                            Basic access to report violations
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
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
      
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl">Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation email so the user can set their own password.
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit((values) => inviteMutation.mutate(values as any))} className="space-y-4 p-6">
              <FormField control={inviteForm.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name*</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={inviteForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email*</FormLabel>
                  <FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="space-y-4">
                <h3 className="text-sm font-medium">User Roles</h3>
                <div className="grid gap-4">
                  <FormField control={inviteForm.control} name="isAdmin" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Administrator</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={inviteForm.control} name="isCouncilMember" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Council Member</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={inviteForm.control} name="isUser" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Regular User</FormLabel></div>
                    </FormItem>
                  )} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={inviteMutation.isPending}>{inviteMutation.isPending ? "Sending..." : "Send Invitation"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLockDialogOpen} onOpenChange={setIsLockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock User Account</DialogTitle>
            <DialogDescription>
              Please provide a reason for locking this account. The user will not be able to log in until unlocked by an administrator.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (lockUserId && lockReason.trim()) {
                lockMutation.mutate({ id: lockUserId, reason: lockReason });
              }
            }}
          >
            <FormItem>
              <FormLabel>Lock Reason</FormLabel>
              <FormControl>
                <Input
                  ref={lockReasonInputRef}
                  value={lockReason}
                  onChange={e => setLockReason(e.target.value)}
                  placeholder="Reason for locking account"
                  required
                  autoFocus
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsLockDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!lockReason.trim()}>
                Lock Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}